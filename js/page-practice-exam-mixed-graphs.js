/* ============================================================
   page-practice-exam-mixed-graphs.js — composition root for
   practice-exam-mixed-graphs.html, the Exam Questions strand's copy
   of the Mixed Graphs practice. Reuses VM.PracticeMixedGraphs
   unmodified (it already has no adaptive scaffold — every question
   is a single directly-scored step, so there are no "steps" to turn
   off here); only the back-button target differs from the Algebra &
   Graphing copy in practice-mixed-graphs.html.
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Auth.requireSession().then(function(session){ if(!session) return; VM.Auth.applyGreeting(); });

    VM.PracticeMixedGraphs.init({
      onBack: function(){
        window.location.href = 'exam-questions.html';
      }
    });
    VM.PracticeMixedGraphs.start();
  });

})();
