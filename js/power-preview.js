/* ============================================================
   power-preview.js — a small shared enhancement for any text input
   that accepts "^" exponent notation (marked with the power-input
   class): renders a live read-only preview underneath it with the
   exponent as an actual superscript, since a plain text <input> can
   only ever show flat characters — "x^2" never looks like x².

   Purely cosmetic: the input's own value (what every parser in the
   codebase reads) is completely untouched, still the raw "x^2" a
   student typed. The preview is kept in sync with a cheap
   requestAnimationFrame poll rather than an 'input' listener alone,
   since several Practice components clear a step's input by setting
   .value directly (moving to a new step, a new question), which
   doesn't fire an 'input' event.

   Public API: VM.PowerPreview.init() — call once per page; finds
   every .power-input already in the document and wires it up.
   ============================================================ */
window.VM = window.VM || {};

VM.PowerPreview = (function(){
  function escapeHtml(s){
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // "^2" -> "<sup>2</sup>", "^-3" -> "<sup>-3</sup>", "^x" -> "<sup>x</sup>"
  function renderPowers(raw){
    return escapeHtml(raw || '').replace(/\^(-?[0-9a-zA-Z]+)/g, function(_, exp){
      return '<sup>' + exp + '</sup>';
    });
  }

  function enhance(input){
    var preview = document.createElement('div');
    preview.className = 'power-preview';
    preview.setAttribute('aria-hidden', 'true');
    input.insertAdjacentElement('afterend', preview);

    var lastValue = null;
    function sync(){
      if(input.value !== lastValue){
        lastValue = input.value;
        preview.innerHTML = renderPowers(lastValue);
      }
      requestAnimationFrame(sync);
    }
    sync();
  }

  function init(){
    Array.prototype.forEach.call(document.querySelectorAll('.power-input'), enhance);
  }

  return { init: init };
})();
