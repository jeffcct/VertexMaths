/* ============================================================
   auth.js — shared authentication helpers built on VM.supabaseClient:
   requiring a signed-in session, signing out, and filling in the
   topbar's greeting with the real signed-in user's own name (and
   room, if a teacher has set one) instead of the old hardcoded
   "Amelia" placeholder.

   Public API:
     VM.Auth.requireSession() — redirects to login.html if nobody's
       signed in; otherwise resolves with the session. Call this at
       the top of any page that should only be visible once signed in.
     VM.Auth.signOut() — signs out and redirects to login.html.
     VM.Auth.applyGreeting() — fills in .greeting with the signed-in
       user's name/room, and wires up any [data-auth="sign-out"]
       element as a sign-out button. Safe to call on a page that
       doesn't require a session (resolves to null if signed out).
   ============================================================ */
window.VM = window.VM || {};

VM.Auth = (function(){
  var client = VM.supabaseClient;

  function getSession(){
    return client.auth.getSession().then(function(result){
      return (result.data && result.data.session) || null;
    });
  }

  function requireSession(){
    return getSession().then(function(session){
      if(!session){
        window.location.href = 'login.html';
        return null;
      }
      return session;
    });
  }

  function signOut(){
    return client.auth.signOut().then(function(){
      window.location.href = 'login.html';
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function applyGreeting(){
    var greetingEl = document.querySelector('.greeting');
    var signOutEls = document.querySelectorAll('[data-auth="sign-out"]');
    signOutEls.forEach(function(el){
      el.addEventListener('click', function(e){ e.preventDefault(); signOut(); });
    });

    return getSession().then(function(session){
      if(!session || !greetingEl) return null;
      return client
        .from('profiles')
        .select('full_name, room')
        .eq('id', session.user.id)
        .single()
        .then(function(res){
          var profile = res.data;
          var name = (profile && profile.full_name) || session.user.email;
          var room = profile && profile.room;
          greetingEl.innerHTML = 'Kia ora, <b>' + escapeHtml(name) + '</b>' + (room ? (' &mdash; ' + escapeHtml(room)) : '');
          return profile;
        });
    });
  }

  return { getSession: getSession, requireSession: requireSession, signOut: signOut, applyGreeting: applyGreeting };
})();
