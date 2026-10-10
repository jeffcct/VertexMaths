/* ============================================================
   page-exam-questions.js — composition root for exam-questions.html.
   Wires ExamQuestionsView up to real page navigation: "back" returns
   home, and a ready topic's Practice button opens its practice page.
   ============================================================ */
(function(){

  var PRACTICE_PAGES = {
    'algebraic-perimeter': 'practice-algebraic-perimeter.html',
    'word-interpreting': 'practice-word-interpreting.html'
  };

  document.addEventListener('DOMContentLoaded', function(){
    VM.Toast.init();

    VM.ExamQuestionsView.init({
      onBack: function(){
        window.location.href = 'index.html';
      },
      onOpenPractice: function(topicId){
        var page = PRACTICE_PAGES[topicId];
        if(page) window.location.href = page;
      }
    });
  });

})();
