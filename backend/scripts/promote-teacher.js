/* ============================================================
   promote-teacher.js — one-time manual step, run directly against
   the database file (not through the API — there is no HTTP route
   that can create a teacher, deliberately). Replaces the old
   Supabase "update profiles set role = 'teacher'..." SQL snippet.

   Usage (from backend/, with DB_PATH set the same way the server
   is run, e.g. via `docker exec` into the running container):
     node scripts/promote-teacher.js you@example.com
   ============================================================ */
const path = require('path');
const Database = require('better-sqlite3');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promote-teacher.js <email>');
  process.exit(1);
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'vertexmaths.db');
const db = new Database(DB_PATH);

const row = db.prepare('SELECT id, full_name, role FROM profiles WHERE email = ?').get(email.trim().toLowerCase());
if (!row) {
  console.error(`No account found for ${email}. They need to sign up first.`);
  process.exit(1);
}

if (row.role === 'teacher') {
  console.log(`${email} (${row.full_name}) is already a teacher.`);
  process.exit(0);
}

db.prepare("UPDATE profiles SET role = 'teacher' WHERE id = ?").run(row.id);
console.log(`Promoted ${email} (${row.full_name}) to teacher.`);
