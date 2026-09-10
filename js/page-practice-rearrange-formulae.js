/* ============================================================
   page-practice-rearrange-formulae.js — composition root for
   practice-rearrange-formulae.html. Wires PracticeRearrangeFormulae's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeRearrangeFormulae.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeRearrangeFormulae.start();
  });

})();
