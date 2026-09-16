/* ============================================================
   formula-render.js — turns a plain-ASCII-ish equation/formula
   string into a small HTML fragment with a properly drawn radical
   (a "√" glyph plus an overline over the radicand, the standard
   plain-CSS technique — see .radical/.radical-sign/.radical-body in
   practice.css) instead of a flat "√(...)" that never actually looks
   like a square root. No external LaTeX/math-rendering library is
   used or needed for this — the site stays dependency-free.

   toDisplayHtml(raw) is for content this codebase already generates
   itself (a FORMULA_BANK given/result string, a feedback line): only
   turns "√(...)" or a bare "√x" into the radical markup. Everything
   else passes through escaped but otherwise untouched — deliberately
   narrow, so an authored equation displays exactly as written apart
   from the radical.

   (What a STUDENT types is handled separately, and differently — see
   formula-live-input.js, which converts shortcuts like "sqrt("/"pi"/
   "^2" live, in place, inside the input itself, rather than through
   a rendered HTML preview.)

   Since every string handed to toDisplayHtml comes from this
   codebase's own fixed, hand-authored FORMULA_BANK content (never raw
   user input) it's safe to build these fragments with innerHTML.

   Public API: VM.FormulaRender.toDisplayHtml(raw)
   ============================================================ */
window.VM = window.VM || {};

VM.FormulaRender = (function(){

  function escapeHtml(s){
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Index of the ')' that matches the '(' at openIdx, by depth — none
  // of this file's inputs ever have an unmatched '(', but if one
  // slips through, treating "the rest of the string" as the inner
  // content is a harmless fallback rather than an infinite loop.
  function matchingParen(s, openIdx){
    var depth = 0;
    for(var i = openIdx; i < s.length; i++){
      if(s[i] === '(') depth++;
      else if(s[i] === ')'){ depth--; if(depth === 0) return i; }
    }
    return s.length;
  }

  function radicalHtml(inner){
    return '<span class="radical"><span class="radical-sign">√</span>' +
      '<span class="radical-body">' + renderSegment(inner) + '</span></span>';
  }

  function renderSegment(s){
    var out = '', i = 0;
    while(i < s.length){
      if(s.slice(i, i + 5).toLowerCase() === 'sqrt('){
        var openA = i + 4, closeA = matchingParen(s, openA);
        out += radicalHtml(s.slice(openA + 1, closeA));
        i = closeA + 1; continue;
      }
      if(s[i] === '√' && s[i + 1] === '('){
        var openB = i + 1, closeB = matchingParen(s, openB);
        out += radicalHtml(s.slice(openB + 1, closeB));
        i = closeB + 1; continue;
      }
      if(s[i] === '√'){
        // A bare radical with no parens, e.g. "√g" — consume the run
        // of ordinary symbol characters right after it as the radicand.
        var j = i + 1;
        while(j < s.length && /[0-9a-zA-Zπ²]/.test(s[j])) j++;
        out += radicalHtml(s.slice(i + 1, j));
        i = j; continue;
      }
      out += s[i]; i++;
    }
    return out;
  }

  function toDisplayHtml(raw){
    return renderSegment(escapeHtml(raw));
  }

  return { toDisplayHtml: toDisplayHtml };

})();
