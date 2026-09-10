/* ============================================================
   page-practice-graph-quadratic.js — composition root for
   practice-graph-quadratic.html. Wires PracticeGraphQuadratic's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeGraphQuadratic.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeGraphQuadratic.start();
  });

})();
