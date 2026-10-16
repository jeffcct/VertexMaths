/* ============================================================
   page-practice-simp-exp.js — composition root for
   practice-simp-exp.html. Wires PracticeSimpExp's "back" button to
   the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeSimpExp.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeSimpExp.start();
  });

})();
