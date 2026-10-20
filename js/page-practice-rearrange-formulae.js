/* ============================================================
   page-practice-rearrange-formulae.js — composition root for
   practice-rearrange-formulae.html. Wires PracticeRearrangeFormulae's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeRearrangeFormulae.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeRearrangeFormulae.start(VM.PracticeMode.fromQuery());
  });

})();
