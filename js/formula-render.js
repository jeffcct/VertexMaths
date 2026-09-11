/* ============================================================
   formula-render.js — turns a plain-ASCII-ish equation/formula
   string into a small HTML fragment with a properly drawn radical
   (a "√" glyph plus an overline over the radicand, the standard
   plain-CSS technique — see .radical/.radical-sign/.radical-body in
   practice.css) instead of a flat "√(...)" that never actually looks
   like a square root. No external LaTeX/math-rendering library is
   used or needed for this — the site stays dependency-free.

   Two entry points, both pure string->HTML (no DOM here):

     toDisplayHtml(raw) — for content this codebase already generates
       itself (a FORMULA_BANK given/result string, a feedback line):
       only turns "√(...)" or a bare "√x" into the radical markup.
       Everything else passes through escaped but otherwise
       untouched — deliberately narrow, so an authored equation
       displays exactly as written apart from the radical.

     toPreviewHtml(raw) — for a live preview of what a STUDENT is
       currently typing (see formula-preview.js): in addition to the
       radical, also turns "sqrt(...)" into the same radical markup,
       "^exp" into a real superscript, the words "pi"/"rho"/"lambda"
       into π/ρ/λ, and a numeric-looking "a/b" into a stacked
       fraction — all purely cosmetic, mirroring the tolerant typed
       shorthand this codebase already accepts when CHECKING an
       answer (see normalizeEqStr in practice-rearrange-formulae.js)
       without changing how typed answers are parsed.

   Since every string handed to toDisplayHtml comes from this
   codebase's own fixed, hand-authored FORMULA_BANK content (never
   raw user input) it's safe to build these fragments with innerHTML.
   toPreviewHtml DOES render raw student-typed text, but only ever
   into a read-only preview element, never back into an <input> and
   never used to decide correctness — so it's equally safe. Nothing
   in this file should ever be poured into an element a script later
   trusts as plain text or resubmits as a value.

   Public API: VM.FormulaRender.toDisplayHtml(raw), .toPreviewHtml(raw)
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

  function radicalHtml(inner, opts){
    return '<span class="radical"><span class="radical-sign">√</span>' +
      '<span class="radical-body">' + renderSegment(inner, opts) + '</span></span>';
  }

  // Runs the substitutions that don't need any bracket-matching —
  // pi/rho/lambda words and, when enabled, "a/b"-shaped fractions —
  // over a run of text known to contain no "sqrt(", "√" or "^".
  function renderPlainRun(text, opts){
    if(opts.words){
      text = text.replace(/\bpi\b/gi, 'π').replace(/\brho\b/gi, 'ρ').replace(/\blambda\b/gi, 'λ');
    }
    if(opts.fraction){
      text = text.replace(/([+-]?[0-9a-zA-Zπρλ².]+)\/([0-9a-zA-Zπρλ².]+)/g,
        function(m, num, den){
          return '<span class="frac"><span class="frac-num">' + num + '</span>' +
            '<span class="frac-den">' + den + '</span></span>';
        });
    }
    return text;
  }

  // opts: { fraction, exponent, words } — toDisplayHtml leaves all
  // three off (radical only); toPreviewHtml turns all three on.
  function renderSegment(s, opts){
    var out = '', buf = '', i = 0;
    function flush(){ out += renderPlainRun(buf, opts); buf = ''; }

    while(i < s.length){
      if(s.slice(i, i + 5).toLowerCase() === 'sqrt('){
        flush();
        var openA = i + 4, closeA = matchingParen(s, openA);
        out += radicalHtml(s.slice(openA + 1, closeA), opts);
        i = closeA + 1; continue;
      }
      if(s[i] === '√' && s[i + 1] === '('){
        flush();
        var openB = i + 1, closeB = matchingParen(s, openB);
        out += radicalHtml(s.slice(openB + 1, closeB), opts);
        i = closeB + 1; continue;
      }
      if(s[i] === '√'){
        // A bare radical with no parens, e.g. "√g" — consume the run
        // of ordinary symbol characters right after it as the radicand.
        flush();
        var j = i + 1;
        while(j < s.length && /[0-9a-zA-Zπρλ²]/.test(s[j])) j++;
        out += radicalHtml(s.slice(i + 1, j), opts);
        i = j; continue;
      }
      if(opts.exponent && s[i] === '^'){
        flush();
        var k = i + 1;
        if(s[k] === '('){
          var closeExp = matchingParen(s, k);
          out += '<sup>' + renderSegment(s.slice(k + 1, closeExp), opts) + '</sup>';
          i = closeExp + 1;
        } else {
          var m = s.slice(k).match(/^-?[0-9a-zA-Z]+/);
          if(m){ out += '<sup>' + m[0] + '</sup>'; i = k + m[0].length; }
          else { out += '^'; i++; }
        }
        continue;
      }
      buf += s[i]; i++;
    }
    flush();
    return out;
  }

  function toDisplayHtml(raw){
    return renderSegment(escapeHtml(raw), { fraction: false, exponent: false, words: false });
  }

  function toPreviewHtml(raw){
    return renderSegment(escapeHtml(raw), { fraction: true, exponent: true, words: true });
  }

  return { toDisplayHtml: toDisplayHtml, toPreviewHtml: toPreviewHtml };

})();
