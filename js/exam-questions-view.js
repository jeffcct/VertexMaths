/* ============================================================
   exam-questions-view.js — the ExamQuestionsView component: a
   simple flat grid of exam-style question topics (see
   js/exam-data.js), each with a Practice button — the Exam Questions
   strand's hub page. No DAG here: unlike Algebra & Graphing's
   skill-prerequisite graph, these topics are independent of one
   another, so a plain grid of cards is all this needs.

   Public API: VM.ExamQuestionsView.init({ onBack, onOpenPractice })
   ============================================================ */
window.VM = window.VM || {};

VM.ExamQuestionsView = (function(){
  var initOpts = {};

  function renderCard(t){
    var html = '<div class="exam-topic-card">';
    html += '<div class="exam-topic-name">' + t.name + '</div>';
    html += '<div class="exam-topic-desc">' + t.description + '</div>';
    html += '<div class="exam-topic-actions">';
    if(t.ready){
      html += '<button class="pill practice" data-action="practice" data-topic="' + t.id + '">Practice</button>';
    } else {
      html += '<button class="pill practice" disabled aria-label="Practice: not built yet">Practice</button>';
    }
    html += '</div></div>';
    return html;
  }

  function render(gridEl){
    gridEl.innerHTML = VM.examData.topics.map(renderCard).join('');
    gridEl.querySelectorAll('[data-action="practice"]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var topic = VM.examData.findTopic(btn.getAttribute('data-topic'));
        if(topic && topic.ready && initOpts.onOpenPractice){
          initOpts.onOpenPractice(topic.id);
        }
      });
    });
  }

  function init(opts){
    initOpts = opts || {};
    var backBtn = document.getElementById('exam-back-btn');
    if(backBtn && initOpts.onBack){
      backBtn.addEventListener('click', initOpts.onBack);
    }
    render(document.getElementById('exam-topic-grid'));
  }

  return { init: init };
})();
