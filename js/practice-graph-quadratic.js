/* ============================================================
   practice-graph-quadratic.js — the PracticeGraphQuadratic
   component: a question generator for "Graphing quadratics (by
   substitution, using the vertex and using the intercepts)". This
   is the reverse of PracticeParabolaVertex / PracticeParabolaIntercepts:
   instead of reading a parabola's equation off a graph, the student
   is GIVEN the expanded monic equation y = x^2 + bx + c and has to
   work out what to plot — a table of values, the vertex, and the
   x-intercepts.

   The quadratic is always built from two integer roots p and q
   (never 0, and always summing to an even number so the vertex's
   x-coordinate h = -b/2 comes out a whole number too):
     b = -(p + q), c = p*q, h = -b/2, k = h^2 + bh + c.

   Below 3 questions answered, or under 90% accuracy, a three-step
   scaffold:
     1. table — substitute x = -2..2 into the equation.
     2. vertex — find (h, k) via h = -b/2, then substitute back for k.
     3. intercepts — factor to find where y = 0. This is the only
        scored step; the earlier two are ungraded scaffolding that
        must be answered correctly to move on, but don't count
        against accuracy.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to the intercepts step.

   Checking the intercepts step — right or wrong — always reveals the
   actual parabola on the graph (grid-only until then), with its
   vertex and both x-intercepts marked, so the student sees what they
   were working towards either way.

   Public API: VM.PracticeGraphQuadratic.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeGraphQuadratic = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseFraction = VM.EquationParse.parseFraction;

  var ROOT_MIN = -6, ROOT_MAX = 6; // p and q are drawn from here, never 0
  var TABLE_XS = [-2, -1, 0, 1, 2];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { b, c, p, q, h, k }
  var score = { correct: 0, attempted: 0 };
  var steps = [];        // this question's step sequence: ['table','vertex','intercepts'] or ['intercepts']
  var stepIndex = 0;
  var stepAnswered = false; // has the CURRENT (non-final) step been answered correctly?
  var answered = false;     // has the FINAL "intercepts" step been checked at all?
  var working = null;       // the "shown work" trail for the current question — see working-trail.js

  function toPx(x, y){ return grid.toPx(x, y); }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  // A nonzero integer in [ROOT_MIN, ROOT_MAX].
  function randRoot(){
    var v;
    do { v = randInt(ROOT_MIN, ROOT_MAX); } while(v === 0);
    return v;
  }

  // Picks the two roots p, q — repeats (a double root) are fine, but
  // their sum must be even so h = -b/2 always comes out a whole number.
  function pickPQ(){
    var p, q;
    do {
      p = randRoot();
      q = randRoot();
    } while((p + q) % 2 !== 0);
    return { p: p, q: q };
  }

  // ---- Formatting ------------------------------------------------
  // Same signed-term/signed-constant conventions as
  // practice-parabola-from-table.js, but with the zero case handled
  // (b and c can each legitimately be 0 here, unlike that generator).

  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }
  function signedTerm(v, suffix){
    if(v === 0) return '';
    var mag = Math.abs(v) === 1 ? '' : String(Math.abs(v));
    return (v > 0 ? ' + ' : ' - ') + mag + suffix;
  }
  function equationString(b, c){ return 'y = x²' + signedTerm(b, 'x') + signedConst(c); }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'intercepts'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var pq = pickPQ();
    var b = -(pq.p + pq.q);
    var c = pq.p * pq.q;
    var h = -b / 2;
    var k = h * h + b * h + c;
    current = { b: b, c: c, p: pq.p, q: pq.q, h: h, k: k };

    var scaffold = needsScaffold();
    steps = scaffold ? ['table', 'vertex', 'intercepts'] : ['intercepts'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — straight to the x-intercepts.";
    els.equation.textContent = equationString(b, c);

    renderGridOnly();
    renderStep();
  }

  // ---- Graph rendering ------------------------------------------

  function svgCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_MIN + (GRID_MAX - GRID_MIN) * i / samples;
      var y = x * x + current.b * x + current.c;
      var inRange = y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var vPt = toPx(current.h, current.k);
    var pPt = toPx(current.p, 0);
    var qPt = toPx(current.q, 0);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + vPt.x + '" cy="' + vPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + pPt.x + '" cy="' + pPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + qPt.x + '" cy="' + qPt.y + '" r="4.5" class="plot-point"></circle>';
  }

  function renderGridOnly(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg();
    els.svg.setAttribute('aria-label', 'A blank coordinate grid, ready for the parabola to be plotted.');
  }

  function revealGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgCurve();
    els.svg.setAttribute('aria-label', 'The parabola plotted on a coordinate grid, with its vertex and two x-intercepts marked.');
  }

  // ---- Step rendering -------------------------------------------------

  var STEP_NAMES = ['table', 'vertex', 'intercepts'];

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'table': return n + 'Substitute each x-value to complete the table.';
      case 'vertex': return n + "What's the vertex, (h, k)?";
      case 'intercepts': return n + 'What are the two x-intercepts?';
    }
  }

  function stepHint(name){
    switch(name){
      case 'table': return 'Substitute each x-value into y = x² + bx + c.';
      case 'vertex': return 'h = -b / 2, then substitute back in to find k.';
      case 'intercepts': return 'Factor x² + bx + c to find where y = 0.';
    }
  }

  function clearStepInputs(name){
    var map = {
      table: els.yInputs,
      vertex: [els.vH, els.vK],
      intercepts: [els.intX1, els.intX2]
    };
    (map[name] || []).forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
  }

  function firstInputOf(name){
    var map = { table: els.yInputs[0], vertex: els.vH, intercepts: els.intX1 };
    return map[name];
  }

  function renderStep(){
    var name = currentStepName();
    STEP_NAMES.forEach(function(n){ els.rows[n].hidden = (n !== name); });
    clearStepInputs(name);
    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    firstInputOf(name).focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Order-independent pair check, shared shape with
  // practice-parabola-intercepts.js's rootsMatch --------------------

  function rootsMatch(gotRoots, p, q){
    var got = gotRoots.slice().sort(function(x, y){ return x - y; });
    var want = [p, q].sort(function(x, y){ return x - y; });
    return Math.abs(got[0] - want[0]) < 0.01 && Math.abs(got[1] - want[1]) < 0.01;
  }

  // ---- Checking: the two ungraded scaffold steps -------------------

  function checkTable(){
    var wants = TABLE_XS.map(function(x){ return x * x + current.b * x + current.c; });
    var oks = els.yInputs.map(function(el, i){
      var v = parseFraction(el.value);
      return !isNaN(v) && Math.abs(v - wants[i]) < 0.01;
    });
    els.yInputs.forEach(function(el, i){ el.classList.toggle('right', oks[i]); el.classList.toggle('wrong', !oks[i]); });
    var ok = oks.every(function(o){ return o; });
    els.feedback.textContent = ok ? 'Correct.' : ('Not quite. The y-values are ' + wants.join(', ') + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('y-values: ' + wants.join(', '));
    return ok;
  }

  function checkVertex(){
    var hVal = parseFraction(els.vH.value);
    var kVal = parseFraction(els.vK.value);
    var hOk = !isNaN(hVal) && Math.abs(hVal - current.h) < 0.01;
    var kOk = !isNaN(kVal) && Math.abs(kVal - current.k) < 0.01;
    els.vH.classList.toggle('right', hOk); els.vH.classList.toggle('wrong', !hOk);
    els.vK.classList.toggle('right', kOk); els.vK.classList.toggle('wrong', !kOk);
    var ok = hOk && kOk;
    els.feedback.textContent = ok ?
      ('Correct — the vertex is (' + current.h + ', ' + current.k + ').') :
      ('Not quite. The vertex is (' + current.h + ', ' + current.k + ').');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('vertex = (' + current.h + ', ' + current.k + ')');
    return ok;
  }

  function checkStep(name){
    if(name === 'table') return checkTable();
    if(name === 'vertex') return checkVertex();
    return false;
  }

  // ---- Checking: the final, scored "intercepts" step -----------------
  // Always reveals the real graph, whether the answer is right or
  // wrong — see the note at the top of the file.

  function checkInterceptsStep(){
    if(!current) return false;
    var r1 = parseFloat((els.intX1.value || '').trim());
    var r2 = parseFloat((els.intX2.value || '').trim());
    var ok = !isNaN(r1) && !isNaN(r2) && rootsMatch([r1, r2], current.p, current.q);
    els.intX1.classList.toggle('right', ok); els.intX1.classList.toggle('wrong', !ok);
    els.intX2.classList.toggle('right', ok); els.intX2.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — the x-intercepts are ' + current.p + ' and ' + current.q + '.';
      els.feedback.className = 'feedback correct';
      working.push('x-intercepts: ' + current.p + ', ' + current.q);
    } else {
      els.feedback.textContent = 'Not quite. The x-intercepts are ' + current.p + ' and ' + current.q + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    revealGraph();
    return true;
  }

  // ---- Check/Continue/Next button --------------------------------

  function handleCheckOrAdvance(){
    if(isFinalStep()){
      if(!answered){
        var scored = checkInterceptsStep();
        if(scored){
          answered = true;
          els.checkBtn.textContent = 'Next question';
        }
      } else {
        nextQuestion();
      }
    } else {
      if(!stepAnswered){
        var ok = checkStep(currentStepName());
        if(ok){
          stepAnswered = true;
          els.checkBtn.textContent = 'Continue';
        }
      } else {
        advanceStep();
      }
    }
  }

  function init(opts){
    opts = opts || {};
    els.svg = document.getElementById('graphquad-graph-svg');
    els.equation = document.getElementById('graphquad-equation');
    els.modeNote = document.getElementById('graphquad-mode-note');
    els.stepPrompt = document.getElementById('graphquad-step-prompt');
    els.hint = document.getElementById('graphquad-hint');
    els.feedback = document.getElementById('graphquad-feedback');
    els.score = document.getElementById('graphquad-score');
    els.checkBtn = document.getElementById('graphquad-check-btn');
    els.nextBtn = document.getElementById('graphquad-next-btn');
    els.backBtn = document.getElementById('graphquad-back-btn');
    els.workingCard = document.getElementById('graphquad-working-card');
    els.workingLines = document.getElementById('graphquad-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.yInputs = [1, 2, 3, 4, 5].map(function(i){ return document.getElementById('graphquad-y-' + i); });
    els.vH = document.getElementById('graphquad-vertex-h');
    els.vK = document.getElementById('graphquad-vertex-k');
    els.intX1 = document.getElementById('graphquad-int-x1');
    els.intX2 = document.getElementById('graphquad-int-x2');

    els.rows = {
      table: document.getElementById('graphquad-step-table'),
      vertex: document.getElementById('graphquad-step-vertex'),
      intercepts: document.getElementById('graphquad-step-intercepts')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.yInputs.concat([els.vH, els.vK, els.intX1, els.intX2]).forEach(function(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
      });
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
