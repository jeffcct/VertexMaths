/* ============================================================
   page-practice-expand-double.js — composition root for
   practice-expand-double.html. Wires PracticeExpandDouble's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeExpandDouble.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeExpandDouble.start(VM.PracticeMode.fromQuery());
  });

})();
