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
      // Every line pushed here is program-generated, fixed content
      // (never raw user input) — where a page also loads
      // formula-render.js (e.g. rearranging formulae, whose working
      // lines can contain "√"), render it properly instead of as a
      // flat string. Pages that don't load it keep the old plain-text
      // behaviour exactly, since toDisplayHtml is a strict superset
      // of textContent for a string with nothing to convert.
      if(window.VM && VM.FormulaRender) div.innerHTML = VM.FormulaRender.toDisplayHtml(line);
      else div.textContent = line;
      linesEl.appendChild(div);
    });
  }

  function push(line){ lines.push(line); render(); }
  function reset(){ lines = []; render(); }

  return { push: push, reset: reset };
};
