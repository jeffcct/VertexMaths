/* ============================================================
   page-practice-excellence-graphing.js — composition root for
   practice-excellence-graphing.html. Wires PracticeExcellenceGraphing's
   "back" button to the Exam Questions hub and starts the first
   question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeExcellenceGraphing.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.PracticeExcellenceGraphing.start();
  });

})();
