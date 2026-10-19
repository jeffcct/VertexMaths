/* ============================================================
   login-view.js — the LoginView component: a single email+password
   form that toggles between "sign in", "create account", and
   "forgot password" modes, backed directly by Supabase Auth
   (VM.supabaseClient.auth). No student data is read or written here
   beyond the signed-in user's own account — profile creation on
   signup is handled entirely by the database trigger in
   supabase/migrations/0001_init.sql, not by this page.

   Sign-up also asks for a full name (stored as auth user metadata,
   which the database trigger copies into profiles.full_name) so the
   topbar greeting has something nicer to show than a raw email
   address.

   If the Supabase project still has "Confirm email" turned on (see
   supabase/README.md), a fresh signup won't come back with a session
   straight away — this shows a "check your email" message and stays
   in signup mode rather than assuming success.

   "Forgot password" sends a reset-link email via Supabase Auth
   (resetPasswordForEmail) pointing at reset-password.html, where
   VM.ResetPasswordView picks up the recovery session the link
   creates and lets the student choose a new password. Supabase
   itself never checks a new password against any other account's —
   nothing here needs to either.

   Public API: VM.LoginView.init()
   ============================================================ */
window.VM = window.VM || {};

VM.LoginView = (function(){
  var client = VM.supabaseClient;
  var els = {};
  var mode = 'signin';    // 'signin' | 'signup' | 'forgot'

  function setMode(next){
    mode = next;
    els.nameField.hidden = (mode !== 'signup');
    els.passwordField.hidden = (mode === 'forgot');
    els.forgotRow.hidden = (mode !== 'signin');
    els.submitBtn.textContent = mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in';
    els.switchPrompt.textContent = mode === 'signup' ? 'Already have an account?' : mode === 'forgot' ? 'Remembered it?' : 'New here?';
    els.switchBtn.textContent = mode === 'forgot' ? 'Back to sign in' : mode === 'signup' ? 'Sign in' : 'Create one';
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

    if(mode === 'forgot'){
      if(!email){
        setMessage('Enter your email.', 'error');
        return;
      }
    } else if(!email || !password){
      setMessage('Enter an email and password.', 'error');
      return;
    }

    els.submitBtn.disabled = true;
    setMessage('');

    if(mode === 'forgot'){
      var redirectTo = new URL('reset-password.html', window.location.href).toString();
      client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo }).then(function(result){
        els.submitBtn.disabled = false;
        // Supabase deliberately returns success here whether or not
        // the email has an account, so as not to leak which emails
        // are registered — show the same message either way.
        if(result.error){
          setMessage(result.error.message, 'error');
          return;
        }
        setMessage('If an account exists for that email, a reset link is on its way.', 'success');
      }).catch(function(err){
        els.submitBtn.disabled = false;
        setMessage(err && err.message ? err.message : 'Something went wrong. Try again.', 'error');
      });
      return;
    }

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
    els.passwordField = document.getElementById('login-password-field');
    els.forgotRow = document.getElementById('login-forgot-row');
    els.forgotBtn = document.getElementById('login-forgot-btn');
    els.submitBtn = document.getElementById('login-submit-btn');
    els.switchPrompt = document.getElementById('login-switch-prompt');
    els.switchBtn = document.getElementById('login-switch-btn');
    els.message = document.getElementById('login-message');

    els.form.addEventListener('submit', onSubmit);
    els.switchBtn.addEventListener('click', function(){
      setMode(mode === 'forgot' ? 'signin' : mode === 'signup' ? 'signin' : 'signup');
    });
    els.forgotBtn.addEventListener('click', function(){ setMode('forgot'); });

    // Already signed in? Skip the form entirely.
    client.auth.getSession().then(function(result){
      if(result.data && result.data.session) window.location.href = 'index.html';
    });

    setMode('signin');
  }

  return { init: init };
})();
