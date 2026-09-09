/* ============================================================
   equation-parse.js — small shared number-parsing helpers used by
   every Practice component that takes a coefficient as an answer.
   Not a "view": no DOM here, just parsing rules, so every practice
   generator applies the site's shorthand consistently.

   Public API: VM.EquationParse.parseGradient(str), .parseFraction(str)
   ============================================================ */
window.VM = window.VM || {};

VM.EquationParse = (function(){

  // A bare "-" reads as -1 and a blank box reads as 1 — the same
  // shorthand a written equation uses for an x-coefficient.
  function parseGradient(str){
    str = (str || '').trim();
    if(str === '') return 1;
    if(str === '-' || str === '+') return str === '-' ? -1 : 1;
    return parseFraction(str);
  }

  function parseFraction(str){
    str = (str || '').trim();
    if(!str) return NaN;
    if(str.indexOf('/') !== -1){
      var parts = str.split('/');
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(str);
  }

  // Renders a factor like "x - 3" or "x + 3" for a root/offset value v
  // (i.e. the factor that is zero when x = v) — shared by any typed
  // or revealed equation built from factors: (x - p)(x - q) for the
  // intercepts form, (x - h)^2 for the vertex form.
  function factorLabel(v){
    return v >= 0 ? ('x - ' + v) : ('x + ' + Math.abs(v));
  }

  return { parseGradient: parseGradient, parseFraction: parseFraction, factorLabel: factorLabel };

})();
