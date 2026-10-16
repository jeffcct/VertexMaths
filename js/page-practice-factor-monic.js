/* ============================================================
   page-practice-factor-monic.js — composition root for
   practice-factor-monic.html. Wires PracticeFactorMonic's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeFactorMonic.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeFactorMonic.start();
  });

})();
