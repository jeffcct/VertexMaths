/* ============================================================
   page-practice-mixed-tables.js — composition root for
   practice-mixed-tables.html. Wires PracticeMixedTables's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeMixedTables.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeMixedTables.start();
  });

})();
