/* ============================================================
   page-practice-simultaneous.js — composition root for
   practice-simultaneous.html. Wires PracticeSimultaneous's "back"
   button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeSimultaneous.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeSimultaneous.start(VM.PracticeMode.fromQuery());
  });

})();
