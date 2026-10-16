/* ============================================================
   page-practice-line-from-table.js — composition root for
   practice-line-from-table.html. Wires PracticeLineFromTable's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeLineFromTable.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeLineFromTable.start();
  });

})();
