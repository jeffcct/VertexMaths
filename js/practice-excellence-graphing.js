/* ============================================================
   practice-excellence-graphing.js — the PracticeExcellenceGraphing
   component: a question generator for "Excellence Graphing", the
   Exam Questions strand's hardest topic. A parabolic arch is PLOTTED
   on a real coordinate grid with its vertex and one other point
   marked (exactly the same read-the-graph task as "Finding the
   equation of a parabola (from a graph using vertex)" —
   practice-parabola-vertex.js, whose grid/plotting this mirrors) —
   the student has to find the arch's own equation from those two
   points first, as unscored working, before the question even starts
   asking about the transformation. Only then do they apply BOTH a
   translation and a change of scale factor together and expand the
   result into standard form — that combined final equation is the
   one and only thing that's scored.

   The algebra: the arch is y = a0(x - h0)^2 + k0, read off the
   graph. A horizontal shift (left/right by tx) and a vertical shift
   (up/down by ty) move the vertex to (h1, k1); multiplying the scale
   factor by a given fraction mult gives the new leading coefficient
   a1 = a0 * mult. Expanding a1(x - h1)^2 + k1 gives the final
   standard form:
     b1 = -2 * a1 * h1
     c1 = a1 * h1^2 + k1

   a0/h0/k0 are plain integers (so the graph reads exactly like
   practice-parabola-vertex.js's own questions), but a1/b1/c1 are
   deliberately NOT forced to be whole numbers — the scale multiplier
   is a small fraction (e.g. 2/25), so the final equation routinely
   has fractional coefficients, same as the real transformation-
   geometry exam questions this topic is modelled on. All fraction
   arithmetic is done as exact integer numerator/denominator pairs
   (reduced via gcd), never floats, and every fraction shown to the
   student — in the statement's "multiply by..." line and in the
   final answer's a/b/c — is rendered as an actual stacked fraction
   (see renderFracHtml/the .stacked-frac CSS), not inline "p/q" text.
   The answer parser still accepts a typed coefficient as either a
   fraction ("2/25") or a decimal ("-0.16") — how the student types it
   and how the site displays it are independent.

   h1 is never allowed to land on 0 — if it would, tx is re-rolled —
   since a zero b1 would make the x-term vanish and this topic's
   parser, like every other quadratic parser on the site, always
   requires an x-term to be present (the constant term is the only
   optional one).

   No adaptive scaffold on the scored step: a single directly-scored
   step for the final equation, the same convention as this strand's
   other topics — reading the original equation off the graph is the
   student's own unscored working, same as how every other topic here
   expects working to happen off-screen.

   Public API: VM.PracticeExcellenceGraphing.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExcellenceGraphing = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  function toPx(x, y){ return grid.toPx(x, y); }

  // The arch always opens downward (same convention as any other
  // "arch" topic on the site) — a plain integer so the graph reads
  // exactly like practice-parabola-vertex.js's own questions.
  var A0_VALUES = [-1, -2, -3];

  // Width-change multiplier: a base pool of proper fractions, each
  // either used as-is (widens the arch) or inverted (narrows it).
  var MULT_BASE_POOL = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,9],[2,9],[4,9],[1,16],[3,16],[1,25],[2,25],[3,25],[4,25]];

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
  // Picks a0 then a matching (h0, k0) pair — h0 is never 0 (a vertex
  // on the y-axis would make "(x - h)" degenerate), k0 is always
  // positive (so the vertex sits above the x-axis — a believable
  // arch standing on the ground, not a dip below it), and the side
  // point, (h0 + 1, k0 + a0), always lands inside the grid — same
  // approach as practice-parabola-vertex.js's pickAHK.
  function pickOriginalArch(){
    var a0 = randChoice(A0_VALUES);
    var candidates = [];
    for(var h = -5; h <= 5; h++){
      if(h === 0) continue;
      for(var k = 2; k <= 6; k++){
        var sideY = k + a0;
        if(Math.abs(sideY) <= GRID_MAX - 0.5 && Math.abs(k) <= GRID_MAX - 0.5){
          candidates.push([h, k]);
        }
      }
    }
    var hk = candidates.length ? randChoice(candidates) : [1, 1];
    return { a0: a0, h0: hk[0], k0: hk[1] };
  }

  function nextQuestion(){
    var arch = pickOriginalArch();
    var a0 = arch.a0, h0 = arch.h0, k0 = arch.k0;

    var multPair = randChoice(MULT_BASE_POOL);
    var widen = Math.random() < 0.5;
    var mult = widen ? frac(multPair[0], multPair[1]) : frac(multPair[1], multPair[0]);

    var dirX = randChoice(['left', 'right']);
    var dirY = randChoice(['down', 'up']);

    var tx, h1;
    do {
      tx = randInt(SHIFT_MIN, SHIFT_MAX);
      h1 = dirX === 'left' ? h0 - tx : h0 + tx;
    } while(h1 === 0);
    var ty = randInt(SHIFT_MIN, SHIFT_MAX);
    var k1 = dirY === 'down' ? k0 - ty : k0 + ty;

    var a1 = mulFrac(frac(a0, 1), mult);
    var b1 = frac(-2 * a1.n * h1, a1.d);
    var c1 = frac(a1.n * h1 * h1 + k1 * a1.d, a1.d);

    current = {
      a0: a0, h0: h0, k0: k0, dirX: dirX, dirY: dirY, tx: tx, ty: ty,
      mult: mult, widen: widen, h1: h1, k1: k1, a1: a1, b1: b1, c1: c1
    };
    answered = false;
    working.reset();

    renderStatement();
    renderGraph();
    els.eqInput.value = '';
    els.eqInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.eqInput.focus();
  }

  // ---- Stacked-fraction HTML rendering --------------------------------
  // A non-integer magnitude is rendered as an actual numerator-over-
  // denominator fraction (see .stacked-frac in exam.css); a whole
  // number is just its plain digits — never inline "p/q" text.

  function magHtml(f){
    if(f.d === 1) return String(Math.abs(f.n));
    return '<span class="stacked-frac"><span class="frac-num">' + Math.abs(f.n) + '</span><span class="frac-den">' + f.d + '</span></span>';
  }

  function renderStatement(){
    var c = current;
    var tUnit = function(n){ return n === 1 ? 'unit' : 'units'; };
    var multHtml = (c.mult.n < 0 ? '-' : '') + magHtml(c.mult);
    var lines = [
      'A parabolic arch is shown on the graph. The arch needs to be ' + (c.widen ? 'widened' : 'narrowed') + ' and moved to a new location.',
      'Translation: Shift the arch ' + c.tx + ' ' + tUnit(c.tx) + ' to the ' + c.dirX + ' and ' + c.ty + ' ' + tUnit(c.ty) + ' ' + c.dirY + '.',
      'Change in width: Multiply the scale factor by ' + multHtml + '.',
      'Find the equation of the new arch in the form y = ax^2 + bx + c.'
    ];
    els.statement.innerHTML = lines.map(function(l){ return '<div>' + l + '</div>'; }).join('');
  }

  // ---- Graph rendering -------------------------------------------------
  // The arch's own curve, vertex and side point, drawn exactly to
  // grid scale — same technique as practice-parabola-vertex.js's
  // svgCurve, since the student reads real coordinates off this.

  function svgCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_MIN + (GRID_MAX - GRID_MIN) * i / samples;
      var y = current.a0 * (x - current.h0) * (x - current.h0) + current.k0;
      var inRange = y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var vertexPt = toPx(current.h0, current.k0);
    var sidePt = toPx(current.h0 + 1, current.k0 + current.a0);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + vertexPt.x + '" cy="' + vertexPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + sidePt.x + '" cy="' + sidePt.y + '" r="4.5" class="plot-point"></circle>';
  }

  function renderGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgCurve();
    els.svg.setAttribute('aria-label', 'A parabolic arch plotted on a coordinate grid, with its vertex and one point one unit to the right of the vertex marked.');
  }

  // ---- Formatting (HTML, for the final-equation feedback) -----------

  // A non-leading x-term: dropped entirely if 0, magnitude 1 is left
  // implicit (" + x" not " + 1x"), same convention as every other
  // quadratic formatter on the site.
  function coeffLabelFracHtml(f){
    if(f.d === 1 && Math.abs(f.n) === 1) return f.n < 0 ? '-' : '';
    return (f.n < 0 ? '-' : '') + magHtml(f);
  }
  function signedTermFracHtml(f, suffix){
    if(f.n === 0) return '';
    var mag = (f.d === 1 && Math.abs(f.n) === 1) ? '' : magHtml(f);
    return (f.n < 0 ? ' - ' : ' + ') + mag + suffix;
  }
  function signedConstFracHtml(f){
    if(f.n === 0) return '';
    return (f.n < 0 ? ' - ' : ' + ') + magHtml(f);
  }
  function formatStandardEqHtml(a, b, c){
    return 'y = ' + coeffLabelFracHtml(a) + 'x^2' + signedTermFracHtml(b, 'x') + signedConstFracHtml(c);
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
      // answer convention in CLAUDE.md. Plain text, never innerHTML,
      // since this is the student's own raw input.
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push(raw);
    } else {
      // The derived canonical form is the one place HTML (for the
      // stacked fractions) belongs — it's built entirely from our own
      // numbers, never from student input.
      els.feedback.innerHTML = 'Not quite. It should be ' + formatStandardEqHtml(current.a1, current.b1, current.c1) + '.';
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
    els.svg = document.getElementById('excgraph-graph-svg');
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
