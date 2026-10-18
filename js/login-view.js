/* ============================================================
   login-view.js — the LoginView component: a single email+password
   form that toggles between "sign in" and "create account" modes,
   backed by the self-hosted backend's /api/auth routes (VM.api).

   Signup always creates a student account server-side — there is
   no way to request a teacher account through this form.

   Public API: VM.LoginView.init()
   ============================================================ */
window.VM = window.VM || {};

VM.LoginView = (function(){
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
      ? VM.api.request('/auth/signup', {
          method: 'POST',
          body: { email: email, password: password, full_name: els.fullName.value.trim() }
        })
      : VM.api.request('/auth/login', { method: 'POST', body: { email: email, password: password } });

    action.then(function(data){
      els.submitBtn.disabled = false;
      VM.api.setToken(data.token);
      window.location.href = 'index.html';
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
    VM.Auth.getSession().then(function(session){
      if(session) window.location.href = 'index.html';
    });

    setMode('signin');
  }

  return { init: init };
})();
