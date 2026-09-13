/* ============================================================
   page-practice-rearrange-factor.js — composition root for
   practice-rearrange-factor.html. Wires PracticeRearrangeFactor's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeRearrangeFactor.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeRearrangeFactor.start();
  });

})();
