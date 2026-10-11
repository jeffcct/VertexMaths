/* ============================================================
   page-practice-exam-mixed-tables.js — composition root for
   practice-exam-mixed-tables.html, the Exam Questions strand's copy
   of the Mixed Tables practice. Reuses VM.PracticeMixedTables
   unmodified (it already has no adaptive scaffold — every question
   is a single directly-scored step, so there are no "steps" to turn
   off here); only the back-button target differs from the Algebra &
   Graphing copy in practice-mixed-tables.html.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeMixedTables.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.PracticeMixedTables.start();
  });

})();
