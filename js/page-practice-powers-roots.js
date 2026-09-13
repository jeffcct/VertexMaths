/* ============================================================
   page-practice-powers-roots.js — composition root for
   practice-powers-roots.html. Wires PracticePowersRoots's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticePowersRoots.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticePowersRoots.start();
  });

})();
