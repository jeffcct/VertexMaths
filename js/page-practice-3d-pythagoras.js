/* ============================================================
   page-practice-3d-pythagoras.js — composition root for
   practice-3d-pythagoras.html. Wires Practice3DPythagoras's "back"
   button to the Exam Questions hub and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Practice3DPythagoras.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.Practice3DPythagoras.start();
  });

})();
