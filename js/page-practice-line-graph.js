/* ============================================================
   page-practice-line-graph.js — composition root for
   practice-line-graph.html. Wires PracticeLineGraph's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeLineGraph.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeLineGraph.start();
  });

})();
