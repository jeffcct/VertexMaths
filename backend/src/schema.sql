-- ============================================================
-- schema.sql — self-hosted Vertex Maths database (SQLite).
--
-- Data model (same shape as the earlier hosted-Supabase design,
-- carried over to a plain SQLite file instead of a Postgres
-- project):
--
--   profiles          — one row per account (student or teacher).
--   topic_status      — a student's current status per topic
--                        ("not-started" / "in-progress" / "mastered"
--                        — matching js/data.js and dag-view.js
--                        exactly), overwritten in place; this is
--                        what the student-facing UI reads.
--   practice_sessions — an append-only log, one row per practice
--                        session, so a teacher can see full score
--                        history over time.
--   login_events      — an append-only log of sign-ins, so a
--                        teacher can see who's actually using the
--                        site and when.
--
-- There is no Row Level Security here (SQLite has no such concept)
-- — access control is enforced in application code instead: see
-- backend/src/auth.js's requireAuth/requireTeacher middleware and
-- the route handlers in backend/src/routes/, which always scope
-- student-facing queries to the signed-in user's own id.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  room TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS topic_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  strand TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'mastered')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, strand, topic_id)
);

CREATE INDEX IF NOT EXISTS topic_status_user_strand_idx ON topic_status (user_id, strand);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  strand TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  attempted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS practice_sessions_user_idx ON practice_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS login_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  logged_in_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS login_events_user_idx ON login_events (user_id, logged_in_at DESC);
