/* ============================================================
   page-practice-3d-trig-pole.js — composition root for
   practice-3d-trig-pole.html. Wires Practice3DTrigPole's "back"
   button to the Exam Questions hub and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Practice3DTrigPole.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.Practice3DTrigPole.start();
  });

})();
