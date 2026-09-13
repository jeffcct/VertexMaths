/* ============================================================
   page-practice-mixed-graphs.js — composition root for
   practice-mixed-graphs.html. Wires PracticeMixedGraphs's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeMixedGraphs.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeMixedGraphs.start();
  });

})();
