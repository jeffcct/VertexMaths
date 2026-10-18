# Vertex Maths backend

A small self-hosted API that replaces the earlier hosted-Supabase
setup: email+password accounts, per-topic status for the
student-facing DAG, a score-history log and a login-activity log for
a teacher to monitor. One process, one SQLite file — no separate
database server to run or patch.

## Data model

- `profiles` — one row per account. New signups are always
  `role = 'student'`; nothing in the API can create a teacher
  account (see "Promoting a teacher" below).
- `topic_status` — a student's current status per topic
  (`not-started` / `in-progress` / `mastered`), overwritten in
  place. This is what `js/progress.js` reads.
- `practice_sessions` — append-only score history, one row per
  practice session. Nothing in the frontend writes to this yet —
  the route exists so wiring it up later doesn't need a backend
  change.
- `login_events` — append-only sign-in log, so a teacher can see
  who's actually using the site.

Full schema: `src/schema.sql`.

## Running it

```
cp .env.example .env
# edit .env: set JWT_SECRET (see the comment in the file for how to
# generate one) and ALLOWED_ORIGINS to wherever the static site is
# actually served from.

docker compose up -d --build
```

The API listens on `:4000` (`PORT` in `.env`) and stores its SQLite
file in the `vertexmaths-data` Docker volume, so it survives
`docker compose down` / rebuilds. Back it up by copying that volume
(or bind-mount `/data` to a host path you already back up instead of
using the named volume).

Put a reverse proxy (Caddy, nginx, Traefik) in front of it for TLS —
this container only speaks plain HTTP.

### Running without Docker

```
npm install
cp .env.example .env   # fill in JWT_SECRET and ALLOWED_ORIGINS
npm start
```

## Promoting a teacher

Sign up through the app once with the account that should be the
teacher, then run, with that container running:

```
docker compose exec api node scripts/promote-teacher.js you@example.com
```

(Or `node scripts/promote-teacher.js you@example.com` from `backend/`
if running without Docker, with the same `DB_PATH` the server uses.)

## Pointing the frontend at this backend

Edit `js/config.js` in the repo root and set `API_BASE_URL` to
wherever you deploy this container (e.g.
`https://api.yourschool.example/api`), then redeploy the static
site. It defaults to `http://localhost:4000/api` for local
development.

## Migrating from the old hosted-Supabase setup

This is a brand-new, empty database — accounts that were created
under the earlier Supabase-hosted version (`supabase/`, now removed)
do **not** carry over automatically. Claude never reads real student
data, so that migration (exporting rows from the old Supabase
project and importing them here, if you want to keep that history)
is something you'd need to do yourself; everyone will otherwise need
to sign up again under this backend.

## API summary

All routes are under `/api`. Authenticated routes expect
`Authorization: Bearer <token>`.

- `POST /auth/signup` `{ email, password, full_name, room? }` → `{ token, user }`
- `POST /auth/login` `{ email, password }` → `{ token, user }`
- `GET /auth/me` → `{ user }`
- `GET /topic-status?strand=algebra` → `{ rows: [{ topic_id, status }] }` (own rows only)
- `PUT /topic-status` `{ strand, topic_id, status }` → upserts own row
- `POST /practice-sessions` `{ strand, topic_id, correct, attempted }` → appends a history row
- `GET /teacher/students` (teacher only) → every student + their last login
- `GET /teacher/students/:id/history` (teacher only) → one student's full `practice_sessions` log
- `GET /teacher/activity?limit=100` (teacher only) → recent logins across all students
