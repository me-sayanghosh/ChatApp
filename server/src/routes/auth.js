import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: 'username, email, password required' });
  if (password.length < 6) return res.status(400).json({ error: 'password too short' });
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(409).json({ error: 'username or email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash });
  return res.status(201).json({ token: signToken(user), user: user.toClient() });
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body || {}; // identifier = email or username
  if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });
  const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier }] });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  return res.json({ token: signToken(user), user: user.toClient() });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  return res.json({ user: user.toClient() });
});

export default router;
