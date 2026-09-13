/* ============================================================
   practice-mixed-graphs.js — the PracticeMixedGraphs component: a
   review/synthesis question generator for "Mixed: finding equations
   from a graph", sitting above line-from-graph, parabola-from-vertex,
   parabola-from-intercepts and exp-with-shift once a student has
   mastered all four individually. Each question plots ONE of those
   four relationship types, picked uniformly at random, using that
   type's own generation ranges — but unlike the four prerequisite
   components, there is no scaffold and no adaptive tiering at all:
   the student must both recognise which of the four shapes the graph
   matches *and* write its full equation, in a single scored step.
   Re-teaching the step-by-step method is the job of the four
   prerequisite components; this one only tests whether the synthesis
   has stuck. Architecturally this is the graph-topic twin of
   PracticeMixedTables — see the longer template note at the top of
   practice-mixed-tables.js, which this file follows exactly.

   Generation (ranges/plotting copied from each source component's
   own *default*, untiered starting state — none of the four source
   files' accuracy-gated unlocks (fraction coefficients for the two
   parabola generators; the boxes-vs-typed/score-hiding/point-hiding
   tiers for the line generator) apply here, since this component
   tracks one shared score across all four types rather than a
   separate per-type accuracy, so there is nothing to gate on):

     - line:          [rise, run] gradient pairs, c chosen so both
                       marked points stay on the grid
                       (practice-line-graph.js: GRADIENTS, nextQuestion)
     - parabola (vertex form):
                       a ∈ {±1,±2,±3} (never 0), vertex (h, k) with
                       h ≠ 0, chosen so the side point (h+1, k+a) and
                       the vertex both stay on the grid
                       (practice-parabola-vertex.js: A_INTEGERS, pickAHK)
     - parabola (intercepts form):
                       a ∈ {±1,±2,±3} (never 0), x-intercepts p ≠ q
                       (neither 0), chosen so the y-intercept a*p*q is
                       both non-trivial and stays on the grid
                       (practice-parabola-intercepts.js: A_INTEGERS, pickAPQ)
     - exponential (with vertical shift):
                       a ∈ {±1..±5} (never 0), base b ∈ {2, 3} (given
                       directly, same as the source — two marked
                       points alone can't pin down three unknowns),
                       c ∈ {±1..±4} (never 0), chosen so the marked
                       points at x = 0 and x = 1 both stay on the grid
                       (practice-exp-with-shift.js: A_VALUES, B_VALUES,
                       C_VALUES, pickABC)

   All four share the same grid config (xMin/xMax -7..7, cell 20,
   margin 24) as their source components, via VM.GraphUtils.makeGrid.

   The prompt and hint never name the type, nor does the graph itself
   carry any label beyond what a sighted student already gets for
   free by looking at the curve (a straight line vs. an upward/
   downward parabola vs. an exponential curve) — recognising the
   shape is the whole point of this review topic, the same way
   PracticeMixedTables never names which of its three types a table
   is. The one exception is the exponential's base, which (as in its
   source component) has to be given directly rather than read off
   the graph — shown as a small caption exactly like
   practice-exp-with-shift.html's, and only when that type comes up.

   Score is one running total shared across all four types — this is
   a single topic's practice, not four separate ones.

   The plotting and equation-parsing/formatting logic below are local
   re-implementations of each source file's own functions (kept
   behaviourally identical), since those functions aren't exposed as
   a public API on the components themselves — each block cites the
   source file it mirrors.

   Public API: VM.PracticeMixedGraphs.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeMixedGraphs = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseGradient = VM.EquationParse.parseGradient;
  var factorLabel = VM.EquationParse.factorLabel;

  function toPx(x, y){ return grid.toPx(x, y); }

  // ---- Generation ranges, one block per type, copied from each
  // source component's own constants (default/untiered state only —
  // see the file-header note above). ------------------------------

  // practice-line-graph.js's GRADIENTS: [rise, run] pairs, run always
  // positive and already in lowest terms.
  var LINE_GRADIENTS = [
    [-3,1], [-2,1], [-3,2], [-1,1], [-2,3], [-1,2],
    [1,2], [2,3], [1,1], [3,2], [2,1], [3,1]
  ];

  // practice-parabola-vertex.js's / practice-parabola-intercepts.js's
  // A_INTEGERS (their A_FRACTIONS unlock is accuracy-gated — not used
  // here, see file header).
  var PARABOLA_A_VALUES = [-3, -2, -1, 1, 2, 3];

  // practice-exp-with-shift.js's A_VALUES / B_VALUES / C_VALUES.
  var EXP_A_VALUES = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  var EXP_B_VALUES = [2, 3];
  var EXP_C_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];

  var TYPES = ['line', 'vertex', 'intercepts', 'exp'];

  var PROMPT_TEXT = "Write the full equation for what's plotted on this graph.";
  var HINT_TEXT = 'Look at the shape first — a straight line, an upward- or downward-opening ' +
    'parabola, or an exponential curve — then use the marked points (and the base, if one is ' +
    'given) to write it in the matching form: y = mx + c, y = a(x - h)^2 + k, ' +
    'y = a(x - p)(x - q), or y = a(b)^x + c.';

  var els = {};
  var current = null;    // { type, ...params }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function close(a, b){ return Math.abs(a - b) < 0.01; }

  // ---- Question generation, one function per type ---------------

  // Mirrors practice-line-graph.js's nextQuestion: keeps both the
  // intercept point (0, c) and the rise/run point (q, c + p) inside
  // the grid.
  function generateLine(){
    var pq = randChoice(LINE_GRADIENTS);
    var p = pq[0], q = pq[1];
    var cLo = Math.max(GRID_MIN, GRID_MIN - p);
    var cHi = Math.min(GRID_MAX, GRID_MAX - p);
    var c = randInt(cLo, cHi);
    return { type: 'line', p: p, q: q, c: c, m: p / q };
  }

  // Mirrors practice-parabola-vertex.js's pickAHK: h never 0, and the
  // side point (h + 1, k + a) stays on the grid alongside the vertex.
  function generateVertex(){
    var a = randChoice(PARABOLA_A_VALUES);
    var candidates = [];
    for(var h = -5; h <= 5; h++){
      if(h === 0) continue;
      for(var k = -5; k <= 5; k++){
        var sideY = k + a;
        if(Math.abs(sideY) <= GRID_MAX - 0.5 && Math.abs(k) <= GRID_MAX - 0.5){
          candidates.push([h, k]);
        }
      }
    }
    var hk = candidates.length ? randChoice(candidates) : [1, 1];
    return { type: 'vertex', a: a, h: hk[0], k: hk[1] };
  }

  // Mirrors practice-parabola-intercepts.js's pickAPQ: p and q never
  // 0 or equal, and the resulting y-intercept a*p*q is both
  // non-trivial and stays on the grid.
  function generateIntercepts(){
    var a = randChoice(PARABOLA_A_VALUES);
    var candidates = [];
    for(var p = -4; p <= 4; p++){
      if(p === 0) continue;
      for(var q = -4; q <= 4; q++){
        if(q === 0 || q === p) continue;
        var yInt = a * p * q;
        if(Math.abs(yInt) >= 0.4 && Math.abs(yInt) <= GRID_MAX - 0.5){
          candidates.push([p, q]);
        }
      }
    }
    var pq = candidates.length ? randChoice(candidates) : [1, -1];
    return { type: 'intercepts', a: a, p: pq[0], q: pq[1], yInt: a * pq[0] * pq[1] };
  }

  // Mirrors practice-exp-with-shift.js's pickABC: picks a, b and c
  // together so the marked points at x = 0 (y = a + c) and x = 1
  // (y = a*b + c) both land on the grid.
  function generateExp(){
    var candidates = [];
    EXP_A_VALUES.forEach(function(a){
      EXP_B_VALUES.forEach(function(b){
        EXP_C_VALUES.forEach(function(c){
          var y0 = a + c, y1 = a * b + c;
          if(Math.abs(y0) <= GRID_MAX - 0.5 && Math.abs(y1) <= GRID_MAX - 0.5){
            candidates.push({ a: a, b: b, c: c, y0: y0, y1: y1 });
          }
        });
      });
    });
    var t = candidates.length ? randChoice(candidates) : { a: 1, b: 2, c: 1, y0: 2, y1: 3 };
    return { type: 'exp', a: t.a, b: t.b, c: t.c, y0: t.y0, y1: t.y1 };
  }

  function generateQuestion(type){
    if(type === 'line') return generateLine();
    if(type === 'vertex') return generateVertex();
    if(type === 'intercepts') return generateIntercepts();
    return generateExp();
  }

  function nextQuestion(){
    current = generateQuestion(randChoice(TYPES));
    answered = false;
    working.reset();

    renderGraph();
    renderQuestion();
  }

  // ---- Plotting, one function per type, copied from each source
  // component's own svg builder. ------------------------------------

  // practice-line-graph.js's clipToBox + svgLineAndPoints (points
  // always shown — there's no "master" tier here to hide them).
  function clipToBox(m, c){
    var pts = [];
    [GRID_MIN, GRID_MAX].forEach(function(x){
      var y = m * x + c;
      if(y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9) pts.push({ x: x, y: y });
    });
    [GRID_MIN, GRID_MAX].forEach(function(y){
      var x = (y - c) / m;
      if(x >= GRID_MIN - 1e-9 && x <= GRID_MAX + 1e-9) pts.push({ x: x, y: y });
    });
    var uniq = [];
    pts.forEach(function(p){
      var dup = uniq.some(function(u){ return Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6; });
      if(!dup) uniq.push(p);
    });
    return [uniq[0], uniq[uniq.length - 1]];
  }

  function svgLine(){
    var ends = clipToBox(current.m, current.c);
    var e1 = toPx(ends[0].x, ends[0].y), e2 = toPx(ends[1].x, ends[1].y);
    var s = '<line x1="' + e1.x + '" y1="' + e1.y + '" x2="' + e2.x + '" y2="' + e2.y + '" class="plot-line"></line>';
    var a = toPx(0, current.c);
    var b = toPx(current.q, current.c + current.p);
    s += '<circle cx="' + a.x + '" cy="' + a.y + '" r="4.5" class="plot-point"></circle>';
    s += '<circle cx="' + b.x + '" cy="' + b.y + '" r="4.5" class="plot-point"></circle>';
    return s;
  }

  // practice-parabola-vertex.js's svgCurve.
  function svgVertexCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_MIN + (GRID_MAX - GRID_MIN) * i / samples;
      var y = current.a * (x - current.h) * (x - current.h) + current.k;
      var inRange = y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var vertexPt = toPx(current.h, current.k);
    var sidePt = toPx(current.h + 1, current.k + current.a);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + vertexPt.x + '" cy="' + vertexPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + sidePt.x + '" cy="' + sidePt.y + '" r="4.5" class="plot-point"></circle>';
  }

  // practice-parabola-intercepts.js's svgCurve.
  function svgInterceptsCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_MIN + (GRID_MAX - GRID_MIN) * i / samples;
      var y = current.a * (x - current.p) * (x - current.q);
      var inRange = y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var pPt = toPx(current.p, 0), qPt = toPx(current.q, 0), yPt = toPx(0, current.yInt);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + pPt.x + '" cy="' + pPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + qPt.x + '" cy="' + qPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + yPt.x + '" cy="' + yPt.y + '" r="4.5" class="plot-point"></circle>';
  }

  // practice-exp-with-shift.js's svgCurve.
  function svgExpCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_MIN + (GRID_MAX - GRID_MIN) * i / samples;
      var y = current.a * Math.pow(current.b, x) + current.c;
      var inRange = y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var p0 = toPx(0, current.y0), p1 = toPx(1, current.y1);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + p0.x + '" cy="' + p0.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + p1.x + '" cy="' + p1.y + '" r="4.5" class="plot-point"></circle>';
  }

  // aria-label text is purely descriptive of what's already visible in
  // the plotted shape (line vs. parabola vs. exponential curve) — the
  // same equivalent-access information a sighted student gets for
  // free by looking at the graph, not an extra hint. It never names
  // the *specific* generated numbers, and the prompt/hint text next to
  // the graph never repeats it, so screen-reader and sighted students
  // face the same recognition task.
  function ariaLabelFor(type){
    if(type === 'line') return 'A straight line plotted on a coordinate grid, with two points marked on it.';
    if(type === 'vertex') return 'A parabola plotted on a coordinate grid, with its vertex and one point one unit to the right of the vertex marked.';
    if(type === 'intercepts') return 'A parabola plotted on a coordinate grid, with its two x-intercepts and its y-intercept marked.';
    return 'An exponential curve plotted on a coordinate grid, with the points at x = 0 and x = 1 marked.';
  }

  function renderGraph(){
    var svgBody = grid.gridSvg() + grid.axesSvg();
    if(current.type === 'line') svgBody += svgLine();
    else if(current.type === 'vertex') svgBody += svgVertexCurve();
    else if(current.type === 'intercepts') svgBody += svgInterceptsCurve();
    else svgBody += svgExpCurve();
    els.svg.innerHTML = svgBody;
    els.svg.setAttribute('aria-label', ariaLabelFor(current.type));

    // The base of an exponential can't be recovered from the two
    // marked points alone (see practice-exp-with-shift.js's file
    // header) so, same as its source component, it's given directly
    // — but only shown when that type actually comes up, since
    // showing it otherwise would give the type away.
    var isExp = current.type === 'exp';
    els.givenRow.hidden = !isExp;
    if(isExp) els.givenB.textContent = current.b;
  }

  // ---- Formatting — one formatter per type, copied from each source
  // component's own formatter. shared coeffLabel/signedConst mirror
  // the same-named helpers in practice-parabola-from-table.js /
  // practice-exp-from-table.js (also reused by practice-mixed-tables.js). ----

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }

  function fracLabel(p, q){ return q === 1 ? String(p) : (p + '/' + q); }

  // practice-line-graph.js's formatEquation.
  function formatLineEquation(m, c, p, q){
    var mStr = fracLabel(p, q);
    if(mStr === '1') mStr = '';
    else if(mStr === '-1') mStr = '-';
    var cStr = c === 0 ? '' : (c > 0 ? (' + ' + c) : (' - ' + Math.abs(c)));
    return 'y = ' + mStr + 'x' + cStr;
  }

  function squaredString(h){ return '(' + factorLabel(h) + ')^2'; }

  // practice-parabola-vertex.js's formatEquation (aDen is always 1
  // here, so aCoeffLabel reduces to the shared coeffLabel above).
  function formatVertexEquation(a, h, k){
    return 'y = ' + coeffLabel(a) + squaredString(h) + signedConst(k);
  }

  function plainBracketsString(p, q){ return '(' + factorLabel(p) + ')(' + factorLabel(q) + ')'; }

  // practice-parabola-intercepts.js's formatEquation.
  function formatInterceptsEquation(a, p, q){
    return 'y = ' + coeffLabel(a) + plainBracketsString(p, q);
  }

  // practice-exp-with-shift.js's formatExpEquation.
  function formatExpEquation(a, b, c){
    return 'y = ' + coeffLabel(a) + '(' + b + ')^x' + signedConst(c);
  }

  function formatCurrentEquation(q){
    if(q.type === 'line') return formatLineEquation(q.m, q.c, q.p, q.q);
    if(q.type === 'vertex') return formatVertexEquation(q.a, q.h, q.k);
    if(q.type === 'intercepts') return formatInterceptsEquation(q.a, q.p, q.q);
    return formatExpEquation(q.a, q.b, q.c);
  }

  // ---- Parsing — one parser per type, copied from each source
  // component's own parser. -------------------------------------

  // practice-line-graph.js's parseEquationString: "y = 3x - 6",
  // "y = 3/2x + 1" or "y = 3x/2 + 1".
  function parseLineEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);

    var xIdx = s.indexOf('x');
    if(xIdx === -1) return null;
    var mPart = s.slice(0, xIdx);
    var rest = s.slice(xIdx + 1);

    var splitFraction = rest.match(/^\/(\d+(\.\d+)?)/);
    var divisor = null;
    if(splitFraction){
      divisor = parseFloat(splitFraction[1]);
      rest = rest.slice(splitFraction[0].length);
    }

    var m = parseGradient(mPart);
    if(isNaN(m)) return null;
    if(divisor){ m = m / divisor; }

    var c;
    if(rest === ''){ c = 0; }
    else { c = parseFloat(rest.replace(/^\+/, '')); }
    if(isNaN(c)) return null;

    return { m: m, c: c };
  }

  // practice-parabola-vertex.js's parseVertexEquation: "y = -2(x + 3)^2 + 4".
  function parseVertexEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([^()]*)\(x([+-]\d+(?:\.\d+)?)\)\^2([+-]\d+(?:\.\d+)?)?$/);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    var h = -parseFloat(m[2]);
    var k = m[3] ? parseFloat(m[3]) : 0;
    if(isNaN(h) || isNaN(k)) return null;
    return { a: a, h: h, k: k };
  }

  // practice-parabola-intercepts.js's rootsMatch + parseFactoredEquation:
  // "y = -2(x - 3)(x + 1)" — the two intercepts can be typed/matched
  // in either order.
  function rootsMatch(gotRoots, p, q){
    var got = gotRoots.slice().sort(function(x, y){ return x - y; });
    var want = [p, q].sort(function(x, y){ return x - y; });
    return Math.abs(got[0] - want[0]) < 0.01 && Math.abs(got[1] - want[1]) < 0.01;
  }

  function parseFactoredEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([^()]*)\(x([+-]\d+(?:\.\d+)?)\)\(x([+-]\d+(?:\.\d+)?)\)$/);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    return { a: a, roots: [-parseFloat(m[2]), -parseFloat(m[3])] };
  }

  // practice-exp-with-shift.js's parseExpEquation: "y = -2(3)^x + 1".
  function parseExpEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([+-]?\d*)\((\d+)\)\^x([+-]\d+)?$/);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    var b = parseInt(m[2], 10);
    var c = m[3] ? parseFloat(m[3]) : 0;
    return { a: a, b: b, c: c };
  }

  // Tries the parser matching the current question's actual type —
  // the student has to have both recognised the type *and* written
  // its equation shape correctly for parsing to succeed at all.
  function checkParsedAgainstCurrent(raw, q){
    if(q.type === 'line'){
      var lin = parseLineEquation(raw);
      return !!lin && close(lin.m, q.m) && close(lin.c, q.c);
    }
    if(q.type === 'vertex'){
      var vert = parseVertexEquation(raw);
      return !!vert && close(vert.a, q.a) && close(vert.h, q.h) && close(vert.k, q.k);
    }
    if(q.type === 'intercepts'){
      var fac = parseFactoredEquation(raw);
      return !!fac && close(fac.a, q.a) && rootsMatch(fac.roots, q.p, q.q);
    }
    var exp = parseExpEquation(raw);
    return !!exp && close(exp.a, q.a) && exp.b === q.b && close(exp.c, q.c);
  }

  // ---- Rendering ---------------------------------------------------

  function renderQuestion(){
    els.stepPrompt.textContent = PROMPT_TEXT;
    els.hint.textContent = HINT_TEXT;
    els.eqInput.value = '';
    els.eqInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.eqInput.focus();
  }

  // ---- Checking ------------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var raw = els.eqInput.value.trim();
    var ok = checkParsedAgainstCurrent(raw, current);
    els.eqInput.classList.toggle('right', ok);
    els.eqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what the student typed (trimmed) — never a
      // freshly re-derived canonical string — since more than one
      // typed form can be structurally valid here (either order of
      // intercepts, an equivalent fraction gradient, etc). See the
      // matching note in practice-mixed-tables.js and the four source
      // components' own "echo what was typed" comments.
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push(raw);
    } else {
      var correctStr = formatCurrentEquation(current);
      els.feedback.textContent = 'Not quite. ' + correctStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

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
    els.svg = document.getElementById('mixedgraphs-graph-svg');
    els.givenRow = document.getElementById('mixedgraphs-given-row');
    els.givenB = document.getElementById('mixedgraphs-given-b');
    els.stepPrompt = document.getElementById('mixedgraphs-step-prompt');
    els.eqInput = document.getElementById('mixedgraphs-eq-input');
    els.hint = document.getElementById('mixedgraphs-hint');
    els.feedback = document.getElementById('mixedgraphs-feedback');
    els.score = document.getElementById('mixedgraphs-score');
    els.checkBtn = document.getElementById('mixedgraphs-check-btn');
    els.nextBtn = document.getElementById('mixedgraphs-next-btn');
    els.backBtn = document.getElementById('mixedgraphs-back-btn');
    els.workingCard = document.getElementById('mixedgraphs-working-card');
    els.workingLines = document.getElementById('mixedgraphs-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.eqInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
    });

    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    if(VM.PowerPreview) VM.PowerPreview.init();
    if(VM.KeybindHelp) VM.KeybindHelp.attach(document.getElementById('mixedgraphs-keybind-help'));
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
