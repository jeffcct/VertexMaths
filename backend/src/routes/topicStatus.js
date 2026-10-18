/* ============================================================
   routes/topicStatus.js — a student's own per-topic status: the
   "where am I up to" state that js/progress.js overlays onto
   js/data.js's topics. Always scoped to the signed-in user —
   nobody can read or write another student's rows through this
   route (a teacher reads others' progress via routes/teacher.js
   instead).
   ============================================================ */
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const VALID_STATUSES = ['not-started', 'in-progress', 'mastered'];

router.get('/', requireAuth, (req, res) => {
  const strand = String(req.query.strand || '');
  if (!strand) return res.status(400).json({ error: 'strand query param is required.' });

  const rows = db
    .prepare('SELECT topic_id, status FROM topic_status WHERE user_id = ? AND strand = ?')
    .all(req.user.id, strand);
  res.json({ rows });
});

router.put('/', requireAuth, (req, res) => {
  const strand = String(req.body.strand || '');
  const topicId = String(req.body.topic_id || '');
  const status = String(req.body.status || '');

  if (!strand || !topicId) return res.status(400).json({ error: 'strand and topic_id are required.' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'status must be one of: ' + VALID_STATUSES.join(', ') });

  db.prepare(
    `INSERT INTO topic_status (user_id, strand, topic_id, status, updated_at)
     VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT (user_id, strand, topic_id)
     DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`
  ).run(req.user.id, strand, topicId, status);

  res.json({ ok: true });
});

module.exports = router;
