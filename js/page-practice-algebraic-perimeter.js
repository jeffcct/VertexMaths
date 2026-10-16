/* ============================================================
   page-practice-algebraic-perimeter.js — composition root for
   practice-algebraic-perimeter.html. Wires
   PracticeAlgebraicPerimeter's "back" button to the Exam Questions
   hub and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeAlgebraicPerimeter.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.PracticeAlgebraicPerimeter.start();
  });

})();
