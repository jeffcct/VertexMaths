/* ============================================================
   page-practice-factor-single.js — composition root for
   practice-factor-single.html. Wires PracticeFactorSingle's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeFactorSingle.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeFactorSingle.start();
  });

})();
