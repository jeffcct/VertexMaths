/* ============================================================
   page-practice-line-from-point.js — composition root for
   practice-line-from-point.html. Wires PracticeLineFromPoint's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeLineFromPoint.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeLineFromPoint.start();
  });

})();
