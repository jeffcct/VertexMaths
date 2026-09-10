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

  // Some Practice steps ask for a derived equation like "3k + c = 17"
  // where either side could reasonably hold the constant — a student
  // writing "17 = 3k + c" has the same equation, just flipped. Given
  // a parser that expects one fixed side order, this retries it with
  // the two sides swapped before giving up, so both are accepted.
  function parseEitherSide(raw, parseFn){
    var direct = parseFn(raw);
    if(direct) return direct;
    var s = raw || '';
    var eqIdx = s.indexOf('=');
    if(eqIdx === -1) return null;
    return parseFn(s.slice(eqIdx + 1) + '=' + s.slice(0, eqIdx));
  }

  return {
    parseGradient: parseGradient, parseFraction: parseFraction,
    factorLabel: factorLabel, parseEitherSide: parseEitherSide
  };

})();
