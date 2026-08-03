import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { User } from './user.model.js';
import { Otp } from './otp.model.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import { TOKEN_EXPIRY, USERNAME_REGEX, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from '../../shared/utils/constants.js';
import { parseExpiry, escapeRegex, generateAutoUsername } from '../../shared/utils/errors.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

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

// Send Email OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email and save new OTP
    await Otp.deleteMany({ email: cleanEmail });
    await Otp.create({ email: cleanEmail, otpHash, expiresAt });

    console.log(`\x1b[33m[OTP LOG]\x1b[0m Verification code for \x1b[36m${cleanEmail}\x1b[0m is: \x1b[1m\x1b[32m${otp}\x1b[0m`);

    return res.json({
      ok: true,
      message: `Verification code sent to ${cleanEmail}`,
      devOtp: otp,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Email OTP and Sign In / Register
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return res.status(400).json({ error: 'No OTP requested or code expired. Please request a new code.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteMany({ email: cleanEmail });
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(cleanOtp, otpRecord.otpHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect verification code. Please check and try again.' });
    }

    // Consume OTP once verified
    await Otp.deleteMany({ email: cleanEmail });

    // Find existing user or create a new one
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const autoUsername = generateAutoUsername();
      user = await User.create({
        email: cleanEmail,
        username: autoUsername,
        needsUsername: true,
      });
    }

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

router.post('/google', async (req, res) => {
  try {
    const { credential, idToken } = req.body || {};
    const token = credential || idToken;
    if (!token) return res.status(400).json({ error: 'Google token required' });

    let payload;
    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.email) throw new Error('Invalid Google Token');
      payload = decoded;
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: 'Email missing from Google token' });

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ $or: [{ googleId }, { email: cleanEmail }] });

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (!user.profileImage && picture) user.profileImage = picture;
      if (name && !user.name) user.name = name;
      await user.save();
    } else {
      const autoUsername = generateAutoUsername();
      user = await User.create({
        googleId,
        email: cleanEmail,
        name: name || '',
        profileImage: picture || '',
        username: autoUsername,
        needsUsername: true,
      });
    }

    await cleanExpiredTokens(user._id);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    const family = uuidv4();
    await storeRefreshToken(user._id, refreshToken, family);

    return res.json({ accessToken, refreshToken, user: user.toClient() });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Google authentication failed' });
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

// GET /api/auth/users/search?q=query - Discover & search users
router.get('/users/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) {
      return res.json({ users: [] });
    }

    const reg = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [{ username: reg }, { name: reg }, { email: reg }],
    })
      .select('username name profileImage customStatus createdAt')
      .limit(20);

    return res.json({
      users: users.map((u) => u.toClient()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/custom-status - Update custom status emoji and text
router.put('/custom-status', requireAuth, async (req, res) => {
  try {
    const { emoji = '', text = '' } = req.body || {};

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        customStatus: {
          emoji: String(emoji).trim().substring(0, 10),
          text: String(text).trim().substring(0, 80),
        },
      },
      { new: true }
    );

    return res.json({ ok: true, user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
