/* ============================================================
   page-home.js — composition root for index.html. Wires HomeView
   up to real page navigation (algebra.html, optionally deep-linked
   to a topic via ?topic=<id>).
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){
      if(!session) return; // already redirecting to login.html
      VM.Auth.applyGreeting();
    });

    VM.Toast.init();

    VM.HomeView.init({
      onOpenAlgebra: function(){
        window.location.href = 'algebra.html';
      },
      onOpenExamQuestions: function(){
        window.location.href = 'exam-questions.html';
      },
      onResume: function(topicId){
        window.location.href = 'algebra.html?topic=' + encodeURIComponent(topicId);
      }
    });
  });

})();
