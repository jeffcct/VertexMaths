/* ============================================================
   page-practice-simp-expr.js — composition root for
   practice-simp-expr.html. Wires PracticeSimpExpr's "back" button to
   the algebra page and starts the first question.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.PracticeSimpExpr.init({
      onBack: function(){
        window.location.href = 'algebra.html';
      }
    });
    VM.PracticeSimpExpr.start();
  });

})();
