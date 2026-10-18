/* ============================================================
   routes/practiceSessions.js — the append-only score history
   behind the teacher's monitoring view. Practice components aren't
   wired to call this yet (see backend/README.md); the route exists
   so that wiring can land without a backend change.
   ============================================================ */
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const strand = String(req.body.strand || '');
  const topicId = String(req.body.topic_id || '');
  const correct = Number.isInteger(req.body.correct) ? req.body.correct : NaN;
  const attempted = Number.isInteger(req.body.attempted) ? req.body.attempted : NaN;

  if (!strand || !topicId) return res.status(400).json({ error: 'strand and topic_id are required.' });
  if (!Number.isInteger(correct) || !Number.isInteger(attempted) || correct < 0 || attempted < correct) {
    return res.status(400).json({ error: 'correct and attempted must be non-negative integers with correct <= attempted.' });
  }

  db.prepare(
    'INSERT INTO practice_sessions (user_id, strand, topic_id, correct, attempted) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, strand, topicId, correct, attempted);

  res.status(201).json({ ok: true });
});

module.exports = router;
