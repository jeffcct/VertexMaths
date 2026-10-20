/* ============================================================
   page-practice-substitution.js — composition root for
   practice-substitution.html. Wires PracticeSubstitution's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeSubstitution.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeSubstitution.start(VM.PracticeMode.fromQuery());
  });

})();
