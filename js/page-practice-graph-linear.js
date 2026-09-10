/* ============================================================
   page-practice-graph-linear.js — composition root for
   practice-graph-linear.html. Wires PracticeGraphLinear's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeGraphLinear.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeGraphLinear.start();
  });

})();
