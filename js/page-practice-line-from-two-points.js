/* ============================================================
   page-practice-line-from-two-points.js — composition root for
   practice-line-from-two-points.html. Wires PracticeLineFromTwoPoints'
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeLineFromTwoPoints.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeLineFromTwoPoints.start();
  });

})();
