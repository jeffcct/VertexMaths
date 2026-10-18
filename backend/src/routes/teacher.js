/* ============================================================
   routes/teacher.js — the teacher-facing views: every route here
   requires role = 'teacher' (see requireTeacher) and reads across
   all students, unlike every other route in this backend which is
   always scoped to the signed-in user's own rows.

   Nothing in the current frontend calls these yet (no teacher
   dashboard page exists) — they exist so one can be built without
   a backend change, same as the original Supabase
   teacher_student_activity() function they replace.
   ============================================================ */
const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../auth');

const router = express.Router();

router.use(requireAuth, requireTeacher);

// One row per student, with their most recent sign-in.
router.get('/students', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.email, p.full_name, p.room,
              (SELECT MAX(logged_in_at) FROM login_events WHERE user_id = p.id) AS last_login_at
       FROM profiles p
       WHERE p.role = 'student'
       ORDER BY p.full_name COLLATE NOCASE`
    )
    .all();
  res.json({ students: rows });
});

// Full practice-session history for one student.
router.get('/students/:id/history', (req, res) => {
  const student = db.prepare("SELECT id, full_name FROM profiles WHERE id = ? AND role = 'student'").get(req.params.id);
  if (!student) return res.status(404).json({ error: 'No such student.' });

  const sessions = db
    .prepare('SELECT strand, topic_id, correct, attempted, created_at FROM practice_sessions WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json({ student: { id: student.id, full_name: student.full_name }, sessions });
});

// Recent login activity across every student, newest first.
router.get('/activity', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const rows = db
    .prepare(
      `SELECT p.id AS user_id, p.full_name, p.room, e.logged_in_at
       FROM login_events e
       JOIN profiles p ON p.id = e.user_id
       ORDER BY e.logged_in_at DESC
       LIMIT ?`
    )
    .all(limit);
  res.json({ activity: rows });
});

module.exports = router;
