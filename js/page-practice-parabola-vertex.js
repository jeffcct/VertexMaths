/* ============================================================
   page-practice-parabola-vertex.js — composition root for
   practice-parabola-vertex.html. Wires PracticeParabolaVertex's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeParabolaVertex.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeParabolaVertex.start();
  });

})();
