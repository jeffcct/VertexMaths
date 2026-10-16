/* ============================================================
   page-practice-word-interpreting.js — composition root for
   practice-word-interpreting.html. Wires PracticeWordInterpreting's
   "back" button to the Exam Questions hub and starts the first
   question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeWordInterpreting.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.PracticeWordInterpreting.start();
  });

})();
