/* ============================================================
   page-practice-one-step.js — composition root for
   practice-one-step.html. Wires PracticeOneStep's "back" button to
   the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeOneStep.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeOneStep.start();
  });

})();
