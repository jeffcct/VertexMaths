/* ============================================================
   page-practice-line-from-point.js — composition root for
   practice-line-from-point.html. Wires PracticeLineFromPoint's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeLineFromPoint.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeLineFromPoint.start(VM.PracticeMode.fromQuery());
  });

})();
