/* ============================================================
   home-view.js — the HomeView component: the resume card and the
   4-strand picker. Knows nothing about how the DAG is drawn; it
   just reports "open algebra" or "resume" via the callbacks it's
   given in init().
   ============================================================ */
window.VM = window.VM || {};

VM.HomeView = (function(){

  function init(opts){
    opts = opts || {};

    var algebraCard = document.getElementById('card-algebra');
    var resumeBtn = document.getElementById('resume-btn');

    if(algebraCard){
      algebraCard.addEventListener('click', function(){
        if(opts.onOpenAlgebra) opts.onOpenAlgebra();
      });
    }
    if(resumeBtn){
      resumeBtn.addEventListener('click', function(){
        if(opts.onResume) opts.onResume(VM.data.RESUME_TOPIC_ID);
      });
    }

    document.querySelectorAll('.strand-card.dummy').forEach(function(card){
      card.addEventListener('click', function(){
        var note = card.querySelector('.soon-note');
        var already = note.classList.contains('show');
        document.querySelectorAll('.soon-note.show').forEach(function(n){ n.classList.remove('show'); });
        if(!already){
          note.classList.add('show');
          VM.Toast.show(card.getAttribute('data-strand') + ' is still being built — showing dummy data for now.');
        }
      });
    });
  }

  return { init: init };
})();
