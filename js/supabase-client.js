/* ============================================================
   supabase-client.js — the shared Supabase client singleton, used by
   every page that needs auth or the database.

   The project URL and publishable key below are safe to commit: by
   Supabase's own design, they're meant to be public — Row Level
   Security (see supabase/migrations/0001_init.sql), not secrecy of
   this key, is what actually protects student data. The
   service_role key is the dangerous one; it must never appear here
   or anywhere else in this repo.

   Requires the Supabase JS library to already be loaded as a
   previous <script> tag (the global `supabase` object it defines).

   Public API: VM.supabaseClient
   ============================================================ */
window.VM = window.VM || {};

(function(){
  var SUPABASE_URL = 'https://vhmbqjjxplvvvngodyoi.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_B0xGLwOeypMk-AEnmEb6wg_Fcx2-Vp2';

  VM.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();
