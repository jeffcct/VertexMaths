-- ============================================================
-- 0001_init.sql — initial schema for Vertex Maths student accounts.
--
-- This file is pure structure: table definitions, a trigger, two
-- helper functions, and Row Level Security policies. It contains no
-- student data and no credentials — running it against a fresh
-- Supabase project creates empty tables, nothing more.
--
-- How to apply this (one-time, done by the project owner, never by
-- Claude): paste this whole file into the Supabase dashboard's
-- SQL Editor for your project and run it, or if you use the Supabase
-- CLI locally, `supabase db push`.
--
-- Data model:
--   profiles          — one row per user (student or teacher),
--                        auto-created when they sign up.
--   topic_status       — a student's current status per topic
--                        ("not-started" / "in-progress" / "done"),
--                        mirroring js/data.js's own status field —
--                        this is what the student-facing UI reads.
--   practice_sessions  — an append-only log, one row per practice
--                        session, recording correct/attempted counts
--                        — this is the full history a teacher can see.
--
-- Row Level Security (RLS) is the actual access control here, not
-- application code: a student can only ever read or write their own
-- rows; a teacher (profiles.role = 'teacher') can read everyone's.
-- Nobody — not even the app's own client code — can bypass this
-- without the Supabase project's secret service-role key, which
-- should never be put in client-side code, this repo, or shared with
-- Claude.
-- ============================================================

-- ---- profiles ------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  full_name text,
  room text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A security-definer function, not a policy subquery, so checking a
-- user's role never re-triggers profiles' own RLS (which would
-- otherwise recurse into itself).
create or replace function public.is_teacher(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'teacher'
  );
$$;

create policy "profiles: a user can read their own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: a teacher can read every row"
  on public.profiles for select
  using (public.is_teacher(auth.uid()));

create policy "profiles: a user can update their own row"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up, so the app
-- never has to do it client-side. New accounts always start as
-- 'student' — promoting the teacher's own account to 'teacher' is a
-- one-time manual step, see the bottom of this file.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- topic_status ------------------------------------------------
-- The student-facing "where am I up to" state — one row per
-- (student, topic). The app overwrites this in place; it's not a
-- history log (that's practice_sessions, below).

create table if not exists public.topic_status (
  user_id uuid not null references public.profiles (id) on delete cascade,
  strand text not null,
  topic_id text not null,
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'done')),
  updated_at timestamptz not null default now(),
  primary key (user_id, strand, topic_id)
);

alter table public.topic_status enable row level security;

create policy "topic_status: a user can read their own rows"
  on public.topic_status for select
  using (auth.uid() = user_id);

create policy "topic_status: a teacher can read every row"
  on public.topic_status for select
  using (public.is_teacher(auth.uid()));

create policy "topic_status: a user can write their own rows"
  on public.topic_status for insert
  with check (auth.uid() = user_id);

create policy "topic_status: a user can update their own rows"
  on public.topic_status for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- practice_sessions ------------------------------------------------
-- The teacher-facing full history — one row per practice session,
-- appended to, never overwritten, so progress over time is visible.

create table if not exists public.practice_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  strand text not null,
  topic_id text not null,
  correct int not null default 0,
  attempted int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.practice_sessions enable row level security;

create index if not exists practice_sessions_user_idx on public.practice_sessions (user_id, started_at desc);

create policy "practice_sessions: a user can read their own rows"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

create policy "practice_sessions: a teacher can read every row"
  on public.practice_sessions for select
  using (public.is_teacher(auth.uid()));

create policy "practice_sessions: a user can insert their own rows"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);

create policy "practice_sessions: a user can update their own rows"
  on public.practice_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- teacher activity view ------------------------------------------------
-- "Who's logged in" for the teacher dashboard — auth.users itself is
-- never exposed directly to client code; this security-definer
-- function hands back just the columns needed (name, room, last sign-
-- in time), and only to a caller whose own profile is a teacher.

create or replace function public.teacher_student_activity()
returns table (
  user_id uuid,
  full_name text,
  room text,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.room, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_teacher(auth.uid())
  order by u.last_sign_in_at desc nulls last;
$$;

revoke all on function public.teacher_student_activity() from public;
grant execute on function public.teacher_student_activity() to authenticated;

-- ---- one-time manual step ------------------------------------------------
-- Nobody is a teacher by default (see handle_new_user above). After
-- you've signed up through the app's own login page once, run this
-- once (with your own email) in the SQL Editor to promote yourself:
--
--   update public.profiles set role = 'teacher'
--   where id = (select id from auth.users where email = 'you@example.com');
