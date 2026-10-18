/* ============================================================
   routes/auth.js — signup, login, and "who am I" for the
   self-hosted backend. Mirrors the contract the frontend already
   expects from the earlier Supabase-based auth: signup/login hand
   back a token + the user's own profile; nothing here can create a
   teacher account — that's a deliberate gap, closed only by the
   promote-teacher script run directly against the database file.
   ============================================================ */
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { hashPassword, verifyPassword, signToken, publicProfile, requireAuth } = require('../auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — try again in a few minutes.' }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/signup', authLimiter, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const fullName = String(req.body.full_name || '').trim();
  const room = req.body.room ? String(req.body.room).trim() : null;

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!fullName) return res.status(400).json({ error: 'Enter your full name.' });

  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  Promise.resolve(passwordHash).then((hash) => {
    db.prepare(
      'INSERT INTO profiles (id, email, password_hash, full_name, room) VALUES (?, ?, ?, ?, ?)'
    ).run(id, email, hash, fullName, room);
    db.prepare('INSERT INTO login_events (user_id) VALUES (?)').run(id);

    const user = publicProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(id));
    res.status(201).json({ token: signToken(id), user });
  });
});

router.post('/login', authLimiter, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const row = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!row) return res.status(401).json({ error: 'Invalid email or password.' });

  Promise.resolve(verifyPassword(password, row.password_hash)).then((ok) => {
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    db.prepare('INSERT INTO login_events (user_id) VALUES (?)').run(row.id);
    res.json({ token: signToken(row.id), user: publicProfile(row) });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicProfile(req.user) });
});

module.exports = router;
