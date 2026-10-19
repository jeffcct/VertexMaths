/* ============================================================
   reset-password-view.js — the page a "forgot password" email link
   lands on. Supabase's client auto-detects the recovery token in the
   URL and establishes a temporary signed-in "recovery session"
   before this code even runs — this view just lets the student pick
   a new password for that already-authenticated session.

   Supabase Auth rejects updateUser({password}) with a same_password
   error if the new password is identical to the current one (a
   server-side check with no setting to turn off — see
   supabase/README.md). That's not actually a problem here: the
   recovery link already signed the student in, so if they "reset" to
   the password they in fact remembered correctly, we just treat that
   as done and send them in rather than showing it as a failure.

   Public API: VM.ResetPasswordView.init()
   ============================================================ */
window.VM = window.VM || {};

VM.ResetPasswordView = (function(){
  var client = VM.supabaseClient;
  var els = {};
  var ready = false;

  function setMessage(text, kind){
    els.message.textContent = text || '';
    els.message.className = 'auth-message' + (kind ? (' ' + kind) : '');
  }

  function isSamePasswordError(error){
    if(!error) return false;
    if(error.code === 'same_password') return true;
    return /should be different|same.*password/i.test(error.message || '');
  }

  function onSubmit(e){
    e.preventDefault();

    if(!ready){
      setMessage('This reset link has expired or already been used — request a new one from the sign-in page.', 'error');
      return;
    }

    var password = els.password.value;
    var confirm = els.confirm.value;
    if(password.length < 8){
      setMessage('Password must be at least 8 characters.', 'error');
      return;
    }
    if(password !== confirm){
      setMessage('Those two passwords don’t match.', 'error');
      return;
    }

    els.submitBtn.disabled = true;
    client.auth.updateUser({ password: password }).then(function(result){
      if(!result.error){
        window.location.href = 'index.html';
        return;
      }
      if(isSamePasswordError(result.error)){
        // The recovery link already signed them in — no actual
        // change needed if they "reset" to the password they
        // remembered after all.
        window.location.href = 'index.html';
        return;
      }
      els.submitBtn.disabled = false;
      setMessage(result.error.message, 'error');
    }).catch(function(err){
      els.submitBtn.disabled = false;
      setMessage(err && err.message ? err.message : 'Something went wrong. Try again.', 'error');
    });
  }

  function init(){
    els.form = document.getElementById('reset-form');
    els.password = document.getElementById('reset-password');
    els.confirm = document.getElementById('reset-confirm');
    els.submitBtn = document.getElementById('reset-submit-btn');
    els.message = document.getElementById('reset-message');

    els.form.addEventListener('submit', onSubmit);

    // The recovery session can already exist by the time we attach
    // this listener, so check for it directly rather than relying
    // only on the PASSWORD_RECOVERY event firing after we're listening.
    client.auth.getSession().then(function(result){
      if(result.data && result.data.session) ready = true;
      if(!ready) setMessage('This reset link has expired or already been used — request a new one from the sign-in page.', 'error');
    });

    client.auth.onAuthStateChange(function(event){
      if(event === 'PASSWORD_RECOVERY'){
        ready = true;
        setMessage('');
      }
    });
  }

  return { init: init };
})();
