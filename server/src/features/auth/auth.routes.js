import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.model.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import { TOKEN_EXPIRY, USERNAME_REGEX, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from '../../shared/utils/constants.js';
import { parseExpiry, escapeRegex, generateAutoUsername } from '../../shared/utils/errors.js';

const router = Router();

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY.access,
  });
}

function signRefreshToken() {
  return uuidv4();
}

function getRefreshExpiry() {
  return new Date(Date.now() + parseExpiry(TOKEN_EXPIRY.refresh));
}

async function storeRefreshToken(userId, token, family = null) {
  const expiresAt = getRefreshExpiry();
  await User.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: { token, family, createdAt: new Date(), expiresAt },
      ...(family ? { revokedTokens: { token, revokedAt: new Date(), family } } : {}),
    },
  });
  return expiresAt;
}

async function removeRefreshToken(userId, token) {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token } },
  });
}

async function revokeAllRefreshTokens(userId) {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] },
  });
}

async function cleanExpiredTokens(userId) {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
  });
}

router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'password too short' });

    const cleanEmail = email.trim().toLowerCase();
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) return res.status(409).json({ error: 'email already in use' });

    const cleanUsername = username?.trim();
    let finalUsername;
    let needsUsername = false;

    if (cleanUsername) {
      const usernameRegex = new RegExp(`^${escapeRegex(cleanUsername)}$`, 'i');
      const usernameExists = await User.findOne({ username: usernameRegex });
      if (usernameExists) return res.status(409).json({ error: 'username already in use' });
      finalUsername = cleanUsername;
    } else {
      finalUsername = generateAutoUsername();
      needsUsername = true;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: finalUsername, name: name?.trim() || '', email: cleanEmail, passwordHash, needsUsername });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    const family = uuidv4();
    await storeRefreshToken(user._id, refreshToken, family);

    return res.status(201).json({ accessToken, refreshToken, user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });
    const cleanId = identifier.trim();
    const idRegex = new RegExp(`^${escapeRegex(cleanId)}$`, 'i');

    const user = await User.findOne({ $or: [{ email: cleanId.toLowerCase() }, { username: idRegex }] });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    await cleanExpiredTokens(user._id);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    const family = uuidv4();
    await storeRefreshToken(user._id, refreshToken, family);

    return res.json({ accessToken, refreshToken, user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    let user = await User.findOne({ 'refreshTokens.token': refreshToken });

    if (user) {
      const stored = user.refreshTokens.find((rt) => rt.token === refreshToken);
      if (!stored || new Date() > stored.expiresAt) {
        await removeRefreshToken(user._id, refreshToken);
        return res.status(401).json({ error: 'refresh token expired' });
      }

      const family = stored.family || refreshToken.slice(0, 8);
      await removeRefreshToken(user._id, refreshToken);

      const newAccessToken = signAccessToken(user);
      const newRefreshToken = signRefreshToken();
      await storeRefreshToken(user._id, newRefreshToken, family);

      return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    }

    const revokedUser = await User.findOne({ 'revokedTokens.token': refreshToken });
    if (revokedUser) {
      await revokeAllRefreshTokens(revokedUser._id);
      return res.status(401).json({ error: 'refresh token reuse detected — all sessions revoked' });
    }

    return res.status(401).json({ error: 'invalid refresh token' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await removeRefreshToken(req.user.id, refreshToken);
    }
    return res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    return res.json({ user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/check-username/:username', requireAuth, async (req, res) => {
  try {
    const clean = req.params.username?.trim();
    if (!clean) return res.status(400).json({ error: 'username required' });
    if (clean.length < USERNAME_MIN_LENGTH || clean.length > USERNAME_MAX_LENGTH) return res.json({ available: false });
    if (!USERNAME_REGEX.test(clean)) return res.json({ available: false });

    const usernameRegex = new RegExp(`^${escapeRegex(clean)}$`, 'i');
    const exists = await User.findOne({ username: usernameRegex, _id: { $ne: req.user.id } });
    return res.json({ available: !exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, username, profileImage } = req.body || {};
    const update = {};

    if (name !== undefined) {
      update.name = name.trim();
    }

    if (username !== undefined) {
      const clean = username.trim();
      if (clean.length < USERNAME_MIN_LENGTH || clean.length > USERNAME_MAX_LENGTH) return res.status(400).json({ error: `username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters` });
      if (!USERNAME_REGEX.test(clean)) return res.status(400).json({ error: 'username can only contain letters, numbers, underscores, and hyphens' });

      const usernameRegex = new RegExp(`^${escapeRegex(clean)}$`, 'i');
      const exists = await User.findOne({ username: usernameRegex, _id: { $ne: req.user.id } });
      if (exists) return res.status(409).json({ error: 'username already taken, try another one' });

      update.username = clean;
      update.needsUsername = false;
    }

    if (profileImage !== undefined) {
      update.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'not found' });

    return res.json({ user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/username', requireAuth, async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username || !username.trim()) return res.status(400).json({ error: 'username required' });

    const clean = username.trim();
    if (clean.length < USERNAME_MIN_LENGTH || clean.length > USERNAME_MAX_LENGTH) return res.status(400).json({ error: `username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters` });
    if (!USERNAME_REGEX.test(clean)) return res.status(400).json({ error: 'username can only contain letters, numbers, underscores, and hyphens' });

    const usernameRegex = new RegExp(`^${escapeRegex(clean)}$`, 'i');
    const exists = await User.findOne({ username: usernameRegex, _id: { $ne: req.user.id } });
    if (exists) return res.status(409).json({ error: 'username already in use' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username: clean, needsUsername: false },
      { new: true },
    );
    if (!user) return res.status(404).json({ error: 'not found' });

    return res.json({ user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
