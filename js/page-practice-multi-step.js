/* ============================================================
   page-practice-multi-step.js — composition root for
   practice-multi-step.html. Wires PracticeMultiStep's "back" button
   to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeMultiStep.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeMultiStep.start();
  });

})();
