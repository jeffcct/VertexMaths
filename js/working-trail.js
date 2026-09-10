/* ============================================================
   working-trail.js — a small shared helper for the "Working" side
   panel every stepped Practice component uses: a running trail of
   lines, one appended each time a step (scaffold or final) is
   confirmed correct, so a student working through the scaffold can
   look back at everything they've already established for this
   question. The panel stays hidden while empty — no scaffold shown,
   or nothing confirmed yet.

   Public API: VM.WorkingTrail(cardEl, linesEl) -> { push(line), reset() }
   ============================================================ */
window.VM = window.VM || {};

VM.WorkingTrail = function(cardEl, linesEl){
  var lines = [];

  function render(){
    cardEl.hidden = lines.length === 0;
    linesEl.innerHTML = '';
    lines.forEach(function(line){
      var div = document.createElement('div');
      div.textContent = line;
      linesEl.appendChild(div);
    });
  }

  function push(line){ lines.push(line); render(); }
  function reset(){ lines = []; render(); }

  return { push: push, reset: reset };
};
