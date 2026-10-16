/* ============================================================
   page-practice-exam-solving-polys.js — composition root for
   practice-exam-solving-polys.html. Wires PracticeExamSolvingPolys's
   "back" button to the Exam Questions hub and starts the first
   question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeExamSolvingPolys.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.PracticeExamSolvingPolys.start();
  });

})();
