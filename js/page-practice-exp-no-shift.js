/* ============================================================
   page-practice-exp-no-shift.js — composition root for
   practice-exp-no-shift.html. Wires PracticeExpNoShift's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeExpNoShift.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeExpNoShift.start();
  });

})();
