/* ============================================================
   page-practice-graph-exponential.js — composition root for
   practice-graph-exponential.html. Wires PracticeGraphExponential's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeGraphExponential.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeGraphExponential.start();
  });

})();
