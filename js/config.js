/* ============================================================
   config.js — the one thing that needs editing per deployment:
   where the self-hosted backend (see backend/) actually lives.
   Not a secret — same as the old Supabase URL, this is safe to
   commit; nothing except an auth token (never stored here) grants
   access to anything.

   Public API: VM.config.API_BASE_URL
   ============================================================ */
window.VM = window.VM || {};

VM.config = {
  API_BASE_URL: 'http://localhost:4000/api'
};
