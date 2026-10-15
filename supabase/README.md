# Supabase setup

This folder holds the database schema as version-controlled SQL
migrations — structure only, never data. Claude edits these files;
only you ever apply them to a real project, and only you ever hold
the project's credentials.

## One-time setup (you do this, not Claude)

1. **Create a project.** Go to [supabase.com](https://supabase.com),
   sign up free, and create a new project (pick any name/region/
   password — the database password it asks for is separate from
   student logins and you won't need it day-to-day).

2. **Apply the schema.** Open the project's **SQL Editor** (left
   sidebar), paste in the full contents of
   `migrations/0001_init.sql`, and run it. This creates the tables —
   no data yet.

3. **Check email auth settings.** Under **Authentication → Providers**,
   email sign-up is on by default. Under **Authentication →
   Settings**, consider turning **"Confirm email"** off if students
   won't reliably check an inbox — without it, an account is usable
   immediately after signup.

4. **Get your API credentials.** Under **Settings → API**, you'll see:
   - **Project URL**
   - **anon / public key**

   Both of these are safe to put in client-side code and commit to
   this repo — that's what they're designed for. Row Level Security
   (set up by the migration) is what actually protects student data,
   not secrecy of this key. Give me these two values and I'll wire up
   the login page and the rest of the site.

   There's a third key on that same page, the **service_role key** —
   **never share that one, with me or anywhere in this repo.** It
   bypasses Row Level Security entirely; the anon key above is the
   only one the app ever needs.

5. **Promote yourself to teacher.** Sign up once through the app's own
   login page (once it exists), then in the SQL Editor run:

   ```sql
   update public.profiles set role = 'teacher'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   replacing the email with the one you signed up with. Every other
   signup defaults to `role = 'student'`.

## What's in the schema

- **`profiles`** — one row per user, auto-created on signup
  (`role`, `full_name`, `room`).
- **`topic_status`** — a student's current status per topic
  (`not-started` / `in-progress` / `done`), the thing the student-
  facing UI reads. Overwritten in place, not a history log.
- **`practice_sessions`** — an append-only log, one row per practice
  session (`correct`, `attempted`, timestamps) — the full history a
  teacher can see.
- **`teacher_student_activity()`** — a function a teacher's logged-in
  session can call to see every student's name, room, and last
  sign-in time, for an "who's active" view.

Every table has Row Level Security on: a student can only read or
write their own rows; a teacher (`profiles.role = 'teacher'`) can read
everyone's. See the comments in `migrations/0001_init.sql` for the
exact policies.

## Future schema changes

Add a new file, `migrations/0002_<description>.sql`, rather than
editing `0001_init.sql` in place — that keeps a running history of
what changed and in what order, and matches how Supabase's own CLI
expects migrations to work if you ever adopt it.
