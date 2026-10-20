/* ============================================================
   page-practice-factor-single.js — composition root for
   practice-factor-single.html. Wires PracticeFactorSingle's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeFactorSingle.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeFactorSingle.start(VM.PracticeMode.fromQuery());
  });

})();
