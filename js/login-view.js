/* ============================================================
   login-view.js — the LoginView component: a single email+password
   form that toggles between "sign in" and "create account" modes,
   backed directly by Supabase Auth (VM.supabaseClient.auth). No
   student data is read or written here beyond the signed-in user's
   own account — profile creation on signup is handled entirely by
   the database trigger in supabase/migrations/0001_init.sql, not by
   this page.

   Sign-up also asks for a full name (stored as auth user metadata,
   which the database trigger copies into profiles.full_name) so the
   topbar greeting has something nicer to show than a raw email
   address.

   If the Supabase project still has "Confirm email" turned on (see
   supabase/README.md), a fresh signup won't come back with a session
   straight away — this shows a "check your email" message and stays
   in signup mode rather than assuming success.

   Public API: VM.LoginView.init()
   ============================================================ */
window.VM = window.VM || {};

VM.LoginView = (function(){
  var client = VM.supabaseClient;
  var els = {};
  var mode = 'signin';    // 'signin' | 'signup'

  function setMode(next){
    mode = next;
    els.nameField.hidden = (mode !== 'signup');
    els.submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    els.switchPrompt.textContent = mode === 'signup' ? 'Already have an account?' : 'New here?';
    els.switchBtn.textContent = mode === 'signup' ? 'Sign in' : 'Create one';
    setMessage('');
  }

  function setMessage(text, kind){
    els.message.textContent = text || '';
    els.message.className = 'auth-message' + (kind ? (' ' + kind) : '');
  }

  function onSubmit(e){
    e.preventDefault();
    var email = els.email.value.trim();
    var password = els.password.value;
    if(!email || !password){
      setMessage('Enter an email and password.', 'error');
      return;
    }

    els.submitBtn.disabled = true;
    setMessage('');

    var action = mode === 'signup'
      ? client.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: els.fullName.value.trim() || null } }
        })
      : client.auth.signInWithPassword({ email: email, password: password });

    action.then(function(result){
      els.submitBtn.disabled = false;
      if(result.error){
        setMessage(result.error.message, 'error');
        return;
      }
      if(result.data && result.data.session){
        window.location.href = 'index.html';
        return;
      }
      // Signed up but no session yet — email confirmation is on.
      setMessage('Account created — check your email to confirm it, then sign in.', 'success');
    }).catch(function(err){
      els.submitBtn.disabled = false;
      setMessage(err && err.message ? err.message : 'Something went wrong. Try again.', 'error');
    });
  }

  function init(){
    els.form = document.getElementById('login-form');
    els.email = document.getElementById('login-email');
    els.password = document.getElementById('login-password');
    els.fullName = document.getElementById('login-full-name');
    els.nameField = document.getElementById('login-name-field');
    els.submitBtn = document.getElementById('login-submit-btn');
    els.switchPrompt = document.getElementById('login-switch-prompt');
    els.switchBtn = document.getElementById('login-switch-btn');
    els.message = document.getElementById('login-message');

    els.form.addEventListener('submit', onSubmit);
    els.switchBtn.addEventListener('click', function(){
      setMode(mode === 'signup' ? 'signin' : 'signup');
    });

    // Already signed in? Skip the form entirely.
    client.auth.getSession().then(function(result){
      if(result.data && result.data.session) window.location.href = 'index.html';
    });

    setMode('signin');
  }

  return { init: init };
})();
