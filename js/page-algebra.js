/* ============================================================
   page-algebra.js — composition root for algebra.html. Wires
   DagView up to real page navigation: "back" returns home, and a
   ready skill's Practice button opens that skill's practice page.
   A `?topic=<id>` query param (set by the home page's Resume
   button) re-focuses that skill's prerequisite chain on load.
   ============================================================ */
(function(){

  var PRACTICE_PAGES = {
    'line-from-graph': 'practice-line-graph.html',
    'parabola-from-intercepts': 'practice-parabola-intercepts.html',
    'parabola-from-vertex': 'practice-parabola-vertex.html',
    'simultaneous': 'practice-simultaneous.html',
    'line-from-table': 'practice-line-from-table.html',
    'parabola-from-table': 'practice-parabola-from-table.html',
    'exp-from-table': 'practice-exp-from-table.html',
    'line-from-grad-point': 'practice-line-from-point.html',
    'line-from-two-points': 'practice-line-from-two-points.html',
    'factor-monic': 'practice-factor-monic.html',
    'factor-nonmonic': 'practice-factor-nonmonic.html',
    'graph-linear': 'practice-graph-linear.html',
    'graph-quadratic': 'practice-graph-quadratic.html'
  };

  document.addEventListener('DOMContentLoaded', function(){
    VM.Toast.init();

    VM.DagView.init({
      onBack: function(){
        window.location.href = 'index.html';
      },
      onOpenPractice: function(topicId){
        var page = PRACTICE_PAGES[topicId];
        if(page) window.location.href = page;
      }
    });

    var topicId = new URLSearchParams(window.location.search).get('topic');
    if(topicId){ VM.DagView.goToTopic(topicId); }
  });

})();
