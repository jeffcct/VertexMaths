/* ============================================================
   page-practice-expand-single.js — composition root for
   practice-expand-single.html. Wires PracticeExpandSingle's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeExpandSingle.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeExpandSingle.start();
  });

})();
