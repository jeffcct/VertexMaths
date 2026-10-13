/* ============================================================
   page-exam-questions.js — composition root for exam-questions.html.
   Wires ExamQuestionsView up to real page navigation: "back" returns
   home, and a ready topic's Practice button opens its practice page.
   ============================================================ */
(function(){

  var PRACTICE_PAGES = {
    'algebraic-perimeter': 'practice-algebraic-perimeter.html',
    'word-interpreting': 'practice-word-interpreting.html',
    '3d-pythagoras': 'practice-3d-pythagoras.html',
    'exam-mixed-tables': 'practice-exam-mixed-tables.html',
    'exam-mixed-graphs': 'practice-exam-mixed-graphs.html',
    'excellence-graphing': 'practice-excellence-graphing.html',
    'exam-solving-polys': 'practice-exam-solving-polys.html'
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
