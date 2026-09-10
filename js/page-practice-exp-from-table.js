/* ============================================================
   page-practice-exp-from-table.js — composition root for
   practice-exp-from-table.html. Wires PracticeExpFromTable's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeExpFromTable.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeExpFromTable.start();
  });

})();
