/* ============================================================
   page-practice-graph-exponential.js — composition root for
   practice-graph-exponential.html. Wires PracticeGraphExponential's
   "back" button to the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeGraphExponential.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeGraphExponential.start(VM.PracticeMode.fromQuery());
  });

})();
