/* ============================================================
   page-practice-exp-with-shift.js — composition root for
   practice-exp-with-shift.html. Wires PracticeExpWithShift's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeExpWithShift.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeExpWithShift.start();
  });

})();
