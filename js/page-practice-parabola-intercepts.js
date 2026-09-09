/* ============================================================
   page-practice-parabola-intercepts.js — composition root for
   practice-parabola-intercepts.html. Wires
   PracticeParabolaIntercepts's "back" button to the algebra page
   and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeParabolaIntercepts.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeParabolaIntercepts.start();
  });

})();
