/* ============================================================
   page-practice-x-both-sides.js — composition root for
   practice-x-both-sides.html. Wires PracticeXBothSides's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeXBothSides.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeXBothSides.start();
  });

})();
