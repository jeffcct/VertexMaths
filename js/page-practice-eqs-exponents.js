/* ============================================================
   page-practice-eqs-exponents.js — composition root for
   practice-eqs-exponents.html. Wires PracticeEqsExponents's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeEqsExponents.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeEqsExponents.start(VM.PracticeMode.fromQuery());
  });

})();
