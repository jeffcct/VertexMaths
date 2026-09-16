/* ============================================================
   formula-live-input.js — live "type a shortcut, see the real
   symbol" behaviour for any text input marked with the
   formula-input class: as the student types a recognised keyword
   ("sqrt(", "pi", "^<digit>"), it's swapped in place, in the actual
   input value, for the real character it stands for — "√(", "π", a
   superscript digit — the instant the shortcut is complete. There's
   no separate read-only preview element for this: the box itself now
   shows the real symbol.

   Every parser that checks one of these inputs already accepts both
   the spelled-out shortcut AND the real symbol (see normalizeEqStr in
   practice-rearrange-formulae.js / practice-rearrange-factor.js,
   which runs this same word-to-symbol substitution before comparing
   two equations), so converting the shortcut here changes nothing
   about what counts as a correct answer — it only changes what the
   student sees while typing.

   Only the text immediately before the caret is ever inspected or
   rewritten (never the whole value), so editing earlier in the
   string can't accidentally trigger a substitution — the same
   "complete the shortcut, watch it convert" behaviour as a text
   editor's snippet expansion. A selection being replaced (rather than
   a single caret) is left alone, since there's no single "just typed
   this" point to expand from in that case.

   Public API: VM.FormulaLiveInput.init() — call once per page; finds
   every .formula-input already in the document and wires it up.
   ============================================================ */
window.VM = window.VM || {};

VM.FormulaLiveInput = (function(){
  var SUPERSCRIPT_DIGITS = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };

  // Each `match` is anchored to the END of the text before the caret
  // ($), so it only ever fires the instant its pattern is completed.
  var RULES = [
    { match: /\bsqrt\($/i, replace: function(){ return '√('; } },
    { match: /\bpi$/i, replace: function(){ return 'π'; } },
    { match: /\^([0-9])$/, replace: function(m){ return SUPERSCRIPT_DIGITS[m[1]]; } }
  ];

  function findMatch(before){
    for(var i = 0; i < RULES.length; i++){
      var m = before.match(RULES[i].match);
      if(m) return { start: before.length - m[0].length, text: RULES[i].replace(m) };
    }
    return null;
  }

  function enhance(input){
    input.addEventListener('input', function(){
      if(input.selectionStart !== input.selectionEnd) return;
      var pos = input.selectionStart;
      var value = input.value;
      var hit = findMatch(value.slice(0, pos));
      if(!hit) return;
      var newValue = value.slice(0, hit.start) + hit.text + value.slice(pos);
      var newPos = hit.start + hit.text.length;
      input.value = newValue;
      input.setSelectionRange(newPos, newPos);
    });
  }

  function init(){
    Array.prototype.forEach.call(document.querySelectorAll('.formula-input'), enhance);
  }

  return { init: init };
})();
