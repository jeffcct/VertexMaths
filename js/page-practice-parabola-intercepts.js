/* ============================================================
   page-practice-parabola-intercepts.js — composition root for
   practice-parabola-intercepts.html. Wires
   PracticeParabolaIntercepts's "back" button to the algebra page
   and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeParabolaIntercepts.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeParabolaIntercepts.start();
  });

})();
