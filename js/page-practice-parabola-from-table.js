/* ============================================================
   page-practice-parabola-from-table.js — composition root for
   practice-parabola-from-table.html. Wires PracticeParabolaFromTable's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeParabolaFromTable.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeParabolaFromTable.start();
  });

})();
