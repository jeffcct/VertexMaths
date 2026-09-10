/* ============================================================
   page-practice-factor-nonmonic.js — composition root for
   practice-factor-nonmonic.html. Wires PracticeFactorNonmonic's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeFactorNonmonic.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeFactorNonmonic.start();
  });

})();
