/* ============================================================
   auth.js — password hashing and JWT helpers, plus the Express
   middleware that reads a bearer token and attaches the signed-in
   profile to req.user.

   JWT_SECRET must be set via the environment — there is no built-in
   default, so a misconfigured deployment fails to start instead of
   silently signing tokens with a secret anyone could guess.
   ============================================================ */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required (see .env.example).');
}

const TOKEN_TTL = '30d';

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function publicProfile(row) {
  return { id: row.id, email: row.email, full_name: row.full_name, room: row.room, role: row.role };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in.' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Session expired or invalid — sign in again.' });
  }

  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(payload.sub);
  if (!row) return res.status(401).json({ error: 'Account no longer exists.' });

  req.user = row;
  next();
}

function requireTeacher(req, res, next) {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Teachers only.' });
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, publicProfile, requireAuth, requireTeacher };
