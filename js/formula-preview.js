/* ============================================================
   formula-preview.js — a small shared enhancement for any text
   input that expects a typed equation using this codebase's usual
   shorthand ("sqrt(...)", "^2", "pi"/"rho"/"lambda", "a/b"), marked
   with the formula-input class: renders a live read-only preview
   underneath it using VM.FormulaRender.toPreviewHtml, so a student
   can see roughly what their typed answer "looks like" — a real
   radical, a superscript, actual π/ρ/λ glyphs, a stacked fraction —
   while the input itself keeps holding their plain typed text
   untouched (every parser in the codebase still reads that raw
   value; this is purely cosmetic, same contract as power-preview.js).

   Same rAF-poll approach as power-preview.js and for the same
   reason: several Practice components clear a step's input by
   setting .value directly, which never fires an 'input' event.

   Public API: VM.FormulaPreview.init() — call once per page; finds
   every .formula-input already in the document and wires it up.
   ============================================================ */
window.VM = window.VM || {};

VM.FormulaPreview = (function(){

  function enhance(input){
    var preview = document.createElement('div');
    preview.className = 'formula-preview';
    preview.setAttribute('aria-hidden', 'true');
    input.insertAdjacentElement('afterend', preview);

    var lastValue = null;
    function sync(){
      if(input.value !== lastValue){
        lastValue = input.value;
        preview.innerHTML = VM.FormulaRender.toPreviewHtml(lastValue);
      }
      requestAnimationFrame(sync);
    }
    sync();
  }

  function init(){
    Array.prototype.forEach.call(document.querySelectorAll('.formula-input'), enhance);
  }

  return { init: init };
})();
