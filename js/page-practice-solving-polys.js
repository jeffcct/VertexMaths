/* ============================================================
   page-practice-solving-polys.js — composition root for
   practice-solving-polys.html. Wires PracticeSolvingPolys's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeSolvingPolys.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeSolvingPolys.start();
  });

})();
