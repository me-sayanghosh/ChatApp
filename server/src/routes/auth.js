import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

function parseExpiry(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return val * multipliers[unit];
}

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
}

function signRefreshToken() {
  return uuidv4();
}

function getRefreshExpiry() {
  return new Date(Date.now() + parseExpiry(REFRESH_EXPIRY));
}

async function storeRefreshToken(userId, token) {
  const expiresAt = getRefreshExpiry();
  await User.findByIdAndUpdate(userId, {
    $push: { refreshTokens: { token, createdAt: new Date(), expiresAt } },
  });
  return expiresAt;
}

async function removeRefreshToken(userId, token) {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token } },
  });
}

async function cleanExpiredTokens(userId) {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
  });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, password required' });
    if (password.length < 6) return res.status(400).json({ error: 'password too short' });
    
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const usernameRegex = new RegExp(`^${cleanUsername.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');

    const exists = await User.findOne({ $or: [{ email: cleanEmail }, { username: usernameRegex }] });
    if (exists) return res.status(409).json({ error: 'username or email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: cleanUsername, email: cleanEmail, passwordHash });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user._id, refreshToken);

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
    const idRegex = new RegExp(`^${cleanId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');

    const user = await User.findOne({ $or: [{ email: cleanId.toLowerCase() }, { username: idRegex }] });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    await cleanExpiredTokens(user._id);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user._id, refreshToken);

    return res.json({ accessToken, refreshToken, user: user.toClient() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    const user = await User.findOne({ 'refreshTokens.token': refreshToken });
    if (!user) return res.status(401).json({ error: 'invalid refresh token' });

    const stored = user.refreshTokens.find((rt) => rt.token === refreshToken);
    if (!stored || new Date() > stored.expiresAt) {
      await removeRefreshToken(user._id, refreshToken);
      return res.status(401).json({ error: 'refresh token expired' });
    }

    await removeRefreshToken(user._id, refreshToken);

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken();
    await storeRefreshToken(user._id, newRefreshToken);

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
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

export default router;
