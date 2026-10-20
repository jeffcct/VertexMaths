/* ============================================================
   page-practice-one-step.js — composition root for
   practice-one-step.html. Wires PracticeOneStep's "back" button to
   the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeOneStep.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeOneStep.start(VM.PracticeMode.fromQuery());
  });

})();
