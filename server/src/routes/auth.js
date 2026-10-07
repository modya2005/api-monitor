const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, setSessionCookie, clearSessionCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

router.post('/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be 2–80 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters.' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    setSessionCookie(res, signToken(user));
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    setSessionCookie(res, signToken(user));
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select('_id name email createdAt');
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    res.json({ user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt } });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
