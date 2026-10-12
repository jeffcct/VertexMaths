/* ============================================================
   practice-excellence-graphing.js — the PracticeExcellenceGraphing
   component: a question generator for "Excellence Graphing", the
   Exam Questions strand's hardest topic. A parabolic arch is given
   directly as a vertex-form equation (shown as a label on an
   illustrative, not-to-scale sketch of the arch — the numbers live
   in the statement/caption, same convention as this strand's other
   topics, not something to read off a precise grid), then the
   student has to apply BOTH a translation and a change of scale
   factor together and expand the result into standard form.

   The algebra: the arch is y = a0(x - h0)^2 + k0. A horizontal shift
   (left/right by tx) and a vertical shift (up/down by ty) move the
   vertex to (h1, k1); multiplying the scale factor by a given
   fraction mult gives the new leading coefficient a1 = a0 * mult.
   Expanding a1(x - h1)^2 + k1 gives the final standard form:
     b1 = -2 * a1 * h1
     c1 = a1 * h1^2 + k1

   Unlike every other quadratic topic on the site, a1/b1/c1 are
   deliberately NOT forced to be whole numbers — a0 and the scale
   multiplier are both chosen as small fractions (e.g. 2/25), so the
   final equation routinely has fractional coefficients, same as the
   real transformation-geometry exam questions this topic is modelled
   on. All fraction arithmetic below is done as exact integer
   numerator/denominator pairs (reduced via gcd), never floats, so
   the displayed "correct" answer is always the fully-reduced fraction
   rather than a rounded decimal. The answer parser accepts a
   coefficient written either as a reduced fraction ("2/25") or a
   decimal, via VM.EquationParse's existing parseGradient/parseFraction
   (checked against the exact fraction value with a small tolerance).

   h1 is never allowed to land on 0 — if it would, tx is re-rolled —
   since a zero b1 would make the x-term vanish and this topic's
   parser, like every other quadratic parser on the site, always
   requires an x-term to be present (the constant term is the only
   optional one).

   No adaptive scaffold: a single directly-scored step, the same
   convention as this strand's other topics.

   Public API: VM.PracticeExcellenceGraphing.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExcellenceGraphing = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;
  var factorLabel = VM.EquationParse.factorLabel;

  // Scale-factor pools: a0 is always negative (the arch opens
  // downward) with a small denominator; the width-change multiplier
  // is picked from a base pool of proper fractions and then either
  // used as-is (widens the arch) or inverted (narrows it).
  var A0_POOL = [[-1,1],[-2,1],[-3,1],[-1,2],[-3,2],[-1,3],[-2,3],[-1,4],[-3,4],[-1,5],[-2,5],[-3,5],[-4,5]];
  var MULT_BASE_POOL = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,9],[2,9],[4,9],[1,16],[3,16],[1,25],[2,25],[3,25],[4,25]];

  var H0_MIN = -8, H0_MAX = 8;
  var K0_MIN = 6, K0_MAX = 18;
  var SHIFT_MIN = 1, SHIFT_MAX = 8;

  var els = {};
  var current = null;
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function close(x, y){ return Math.abs(x - y) < 0.0005; }

  // ---- Exact fraction arithmetic (never floats) ----------------------

  function gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while(b){ var t = b; b = a % b; a = t; } return a || 1; }
  function frac(n, d){
    if(d < 0){ n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function mulFrac(f1, f2){ return frac(f1.n * f2.n, f1.d * f2.d); }
  function toFloat(f){ return f.n / f.d; }

  // ---- Question generation -------------------------------------------

  function nextQuestion(){
    var a0Pair = randChoice(A0_POOL);
    var a0 = frac(a0Pair[0], a0Pair[1]);

    var multPair = randChoice(MULT_BASE_POOL);
    var widen = Math.random() < 0.5;
    var mult = widen ? frac(multPair[0], multPair[1]) : frac(multPair[1], multPair[0]);

    var h0 = randInt(H0_MIN, H0_MAX);
    var k0 = randInt(K0_MIN, K0_MAX);
    var dirX = randChoice(['left', 'right']);
    var dirY = randChoice(['down', 'up']);

    var tx, h1;
    do {
      tx = randInt(SHIFT_MIN, SHIFT_MAX);
      h1 = dirX === 'left' ? h0 - tx : h0 + tx;
    } while(h1 === 0);
    var ty = randInt(SHIFT_MIN, SHIFT_MAX);
    var k1 = dirY === 'down' ? k0 - ty : k0 + ty;

    var a1 = mulFrac(a0, mult);
    var b1 = frac(-2 * a1.n * h1, a1.d);
    var c1 = frac(a1.n * h1 * h1 + k1 * a1.d, a1.d);

    current = {
      a0: a0, h0: h0, k0: k0, dirX: dirX, dirY: dirY, tx: tx, ty: ty,
      mult: mult, widen: widen, h1: h1, k1: k1, a1: a1, b1: b1, c1: c1
    };
    answered = false;
    working.reset();

    renderStatement();
    renderShape();
    els.eqInput.value = '';
    els.eqInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.eqInput.focus();
  }

  function fracToString(f){ return f.d === 1 ? String(f.n) : (f.n + '/' + f.d); }

  function renderStatement(){
    var c = current;
    var tUnit = function(n){ return n === 1 ? 'unit' : 'units'; };
    var lines = [
      'A parabolic arch is shown on the axes. The arch needs to be ' + (c.widen ? 'widened' : 'narrowed') + ' and moved to a new location.',
      'Translation: Shift the arch ' + c.tx + ' ' + tUnit(c.tx) + ' to the ' + c.dirX + ' and ' + c.ty + ' ' + tUnit(c.ty) + ' ' + c.dirY + '.',
      'Change in width: Multiply the scale factor by ' + fracToString(c.mult) + '.',
      'Find the equation of the new arch in the form y = ax^2 + bx + c.'
    ];
    els.statement.innerHTML = lines.map(function(l){ return '<div>' + l + '</div>'; }).join('');
  }

  // ---- Shape rendering -------------------------------------------------
  // A fixed, schematic arch sketch (not drawn to real scale — the
  // actual numbers are given as the equation label, same convention
  // as this strand's other shape-card topics) with a pair of axes for
  // context, matching the "shown on the axes" framing.

  function renderShape(){
    var eqText = formatVertexEq(current.a0, current.h0, current.k0);
    var svg =
      '<line x1="20" y1="180" x2="280" y2="180" class="axis-line"></line>' +
      '<line x1="40" y1="20" x2="40" y2="200" class="axis-line"></line>' +
      '<path d="M 70 180 Q 150 50 230 180" class="shape-outline"></path>' +
      '<text x="150" y="36" class="arch-equation-label">' + eqText + '</text>';
    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A downward-opening parabolic arch sketched on a set of axes, labelled with its equation: ' + eqText + '.');
  }

  // ---- Formatting ------------------------------------------------------

  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }

  function magStr(f){ return f.d === 1 ? String(Math.abs(f.n)) : (Math.abs(f.n) + '/' + f.d); }

  // Leading coefficient: blank for 1, bare "-" for -1, otherwise its
  // magnitude (as a fraction if it isn't a whole number).
  function coeffLabelFrac(f){
    if(f.d === 1 && Math.abs(f.n) === 1) return f.n < 0 ? '-' : '';
    return (f.n < 0 ? '-' : '') + magStr(f);
  }

  // A non-leading x-term: dropped entirely if 0, magnitude 1 is left
  // implicit (" + x" not " + 1x"), same convention as every other
  // quadratic formatter on the site.
  function signedTermFrac(f, suffix){
    if(f.n === 0) return '';
    var mag = (f.d === 1 && Math.abs(f.n) === 1) ? '' : magStr(f);
    return (f.n < 0 ? ' - ' : ' + ') + mag + suffix;
  }

  function signedConstFrac(f){
    if(f.n === 0) return '';
    return (f.n < 0 ? ' - ' : ' + ') + magStr(f);
  }

  function formatVertexEq(aFrac, h, k){
    return 'y = ' + coeffLabelFrac(aFrac) + '(' + factorLabel(h) + ')^2' + signedConst(k);
  }

  function formatStandardEq(aFrac, bFrac, cFrac){
    return 'y = ' + coeffLabelFrac(aFrac) + 'x^2' + signedTermFrac(bFrac, 'x') + signedConstFrac(cFrac);
  }

  // ---- Parsing -----------------------------------------------------
  // "y = -4/25x^2 + 24/25x - 3" — same shape as every other quadratic
  // parser on the site (VM.EquationParse.parseGradient's blank-means-1/
  // "-"-means--1 shorthand for the leading coefficient; a required
  // x-term; an optional constant), except each magnitude may also be
  // written as a fraction "p/q" or a decimal ("-0.16") instead of a
  // plain integer.

  function parseStandardEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var NUM = '\\d*(?:\\.\\d+)?(?:\\/\\d+)?';
    var re = new RegExp('^([+-]?' + NUM + ')x\\^2([+-])(' + NUM + ')x([+-]\\d+(?:\\.\\d+)?(?:\\/\\d+)?)?$');
    var m = s.match(re);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    var bSign = m[2] === '-' ? -1 : 1;
    var bMag = m[3] === '' ? 1 : parseFraction(m[3]);
    if(isNaN(bMag)) return null;
    var b = bSign * bMag;
    var c = m[4] ? parseFraction(m[4]) : 0;
    if(isNaN(c)) return null;
    return { a: a, b: b, c: c };
  }

  // ---- Checking -------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var raw = els.eqInput.value.trim();
    var parsed = parseStandardEquation(raw);
    if(!parsed){
      els.feedback.textContent = 'Write it as y = ax^2 + bx + c, using ^2 for squared. A coefficient that isn’t a whole number can be typed as a fraction or a decimal, e.g. -3/8 or -0.375.';
      els.feedback.className = 'feedback incorrect';
      els.eqInput.classList.add('wrong');
      return false;
    }

    var ok = close(parsed.a, toFloat(current.a1)) && close(parsed.b, toFloat(current.b1)) && close(parsed.c, toFloat(current.c1));
    els.eqInput.classList.toggle('right', ok);
    els.eqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what was typed — see the echo-the-student's-
      // answer convention in CLAUDE.md.
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push(raw);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + formatStandardEq(current.a1, current.b1, current.c1) + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Next button --------------------------------

  function handleCheckOrAdvance(){
    if(!answered){
      var scored = checkAnswer();
      if(scored){ answered = true; els.checkBtn.textContent = 'Next question'; }
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.svg = document.getElementById('excgraph-shape-svg');
    els.statement = document.getElementById('excgraph-statement');
    els.eqInput = document.getElementById('excgraph-eq-input');
    els.feedback = document.getElementById('excgraph-feedback');
    els.score = document.getElementById('excgraph-score');
    els.checkBtn = document.getElementById('excgraph-check-btn');
    els.nextBtn = document.getElementById('excgraph-next-btn');
    els.backBtn = document.getElementById('excgraph-back-btn');
    els.workingCard = document.getElementById('excgraph-working-card');
    els.workingLines = document.getElementById('excgraph-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.eqInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
    });

    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
