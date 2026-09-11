/* ============================================================
   page-practice-substitution.js — composition root for
   practice-substitution.html. Wires PracticeSubstitution's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeSubstitution.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeSubstitution.start();
  });

})();
