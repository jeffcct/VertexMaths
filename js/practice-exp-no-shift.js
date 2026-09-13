/* ============================================================
   practice-exp-no-shift.js — the PracticeExpNoShift component: a
   question generator for "Finding the equation of an exponential
   (from a graph, with no vertical shift)". This is the reverse of
   graph-exponential: instead of being given y = a*b^x and having to
   plot it, the student is shown the curve already plotted, with its
   y-intercept and the point at x = 1 marked, and has to read those
   off to rebuild the equation — the same shape as
   PracticeParabolaVertex (see the note at the top of that file) and
   PracticeExpFromTable, just with a two-step scaffold instead of a
   longer one, since there are only two unknowns here (a and b, no k
   or c — the curve is never shifted).

   Below 3 questions answered, or under 90% accuracy, a three-step
   scaffold:
     1. find-a — read the y-intercept straight off the graph; that's
        a directly (y = a*b^0 = a).
     2. find-b — use the other marked point, at x = 1, together with
        a, to solve for b (y = a*b, so b = y / a).
     3. equation — write the full equation. This is the only scored
        step; the earlier two are ungraded scaffolding that must be
        answered correctly to move on, but don't count against
        accuracy.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to the equation step.

   a is a nonzero integer from -5 to 5 (a negative a reflects the
   curve below the x-axis); b is a positive integer, 2 or 3. The
   y-intercept is always (0, a) and the other marked point is always
   (1, a*b) — both are always inside the grid (|a| <= 5, |a*b| <= 15,
   well within the grid's y-range), so no candidate-filtering is
   needed the way PracticeParabolaVertex needs it for its vertex/h/k.

   Public API: VM.PracticeExpNoShift.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExpNoShift = (function(){
  // The curve's own range dwarfs a normal -7..7 square grid (a*b at
  // x = 1 can be as large as 15), so this grid is deliberately taller
  // than it is wide: -4..4 across, but -16..16 up, which is enough to
  // keep both marked points inside it for every a/b combination.
  var grid = VM.GraphUtils.makeGrid({ xMin: -4, xMax: 4, yMin: -16, yMax: 16, cell: 8, margin: 16, labelStep: 4 });
  var GRID_XMIN = grid.xMin, GRID_XMAX = grid.xMax;
  var GRID_YMIN = grid.yMin, GRID_YMAX = grid.yMax;
  var parseFraction = VM.EquationParse.parseFraction;
  var parseGradient = VM.EquationParse.parseGradient;

  var A_VALUES = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  var B_VALUES = [2, 3];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { a, b }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function toPx(x, y){ return grid.toPx(x, y); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function close(x, y){ return Math.abs(x - y) < 0.01; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'equation'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var a = randChoice(A_VALUES);
    var b = randChoice(B_VALUES);
    current = { a: a, b: b };

    var scaffold = needsScaffold();
    steps = scaffold ? ['find-a', 'find-b', 'equation'] : ['equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the full equation.";

    renderGraph();
    renderStep();
  }

  // ---- Graph rendering ------------------------------------------
  // Same sampling-into-an-SVG-path pattern as
  // PracticeGraphQuadratic's svgCurve, adapted for y = a*b^x instead
  // of a parabola — only the in-range part of the curve is drawn, so
  // a steep branch that shoots straight off the grid (a big a and/or
  // b = 3) is simply clipped rather than distorting the scale.

  function svgCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_XMIN + (GRID_XMAX - GRID_XMIN) * i / samples;
      var y = current.a * Math.pow(current.b, x);
      var inRange = y >= GRID_YMIN - 1e-9 && y <= GRID_YMAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var interceptPt = toPx(0, current.a);
    var otherPt = toPx(1, current.a * current.b);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + interceptPt.x + '" cy="' + interceptPt.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + otherPt.x + '" cy="' + otherPt.y + '" r="4.5" class="plot-point"></circle>';
  }

  function renderGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgCurve();
    els.svg.setAttribute('aria-label', 'An exponential curve plotted on a coordinate grid, with its y-intercept and the point at x = 1 marked.');
  }

  // ---- Formatting ------------------------------------------------
  // Mirrors PracticeExpFromTable's formatExpEquation/coeffLabel
  // convention exactly, just without the +c term (this generator's
  // curve is never vertically shifted).

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }

  function formatExpEquation(a, b){
    return 'y = ' + coeffLabel(a) + '(' + b + ')^x';
  }

  // "y = -2(3)^x" — the full equation.
  function parseExpEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([+-]?\d*)\((\d+)\)\^x$/);
    if(!m) return null;
    var aVal = parseGradient(m[1]);
    if(isNaN(aVal)) return null;
    var bVal = parseInt(m[2], 10);
    if(isNaN(bVal)) return null;
    return { a: aVal, b: bVal };
  }

  // ---- Step rendering -------------------------------------------------

  var STEP_NAMES = ['find-a', 'find-b', 'equation'];

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'find-a': return n + "What's the value of a?";
      case 'find-b': return n + 'Use the other marked point to solve for b.';
      case 'equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Put it all together.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'find-a':
        return 'a is the y-intercept — read it straight off where the curve crosses the y-axis.';
      case 'find-b':
        return 'The other marked point is at x = 1, where y = a × b — so b = y ÷ a. For example, if a = 2 and the point at x = 1 had y = 6, b would be 6 ÷ 2 = 3.';
      case 'equation':
        return 'Write the full equation, starting with y =, e.g. y = -2(3)^x. Use ^x for the exponent, leave out the coefficient for 1, and use a bare - for -1.';
    }
  }

  function clearStepInputs(name){
    var map = {
      'find-a': [els.aInput],
      'find-b': [els.bInput],
      equation: [els.eqInput]
    };
    (map[name] || []).forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
  }

  function firstInputOf(name){
    var map = { 'find-a': els.aInput, 'find-b': els.bInput, equation: els.eqInput };
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

  // ---- Checking: the two ungraded scaffold steps -------------------

  function checkFindA(){
    var aVal = parseFraction(els.aInput.value);
    var ok = !isNaN(aVal) && close(aVal, current.a);
    els.aInput.classList.toggle('right', ok); els.aInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — a = ' + current.a + '.') : ('Not quite. a = ' + current.a + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('a = ' + current.a);
    return ok;
  }

  function checkFindB(){
    var bVal = parseFraction(els.bInput.value);
    var ok = !isNaN(bVal) && close(bVal, current.b);
    els.bInput.classList.toggle('right', ok); els.bInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — b = ' + current.b + '.') : ('Not quite. b = ' + current.b + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('b = ' + current.b);
    return ok;
  }

  function checkStep(name){
    if(name === 'find-a') return checkFindA();
    if(name === 'find-b') return checkFindB();
    return false;
  }

  // ---- Checking: the final, scored "equation" step -----------------

  function checkEquationStep(){
    if(!current) return false;
    var raw = els.eqInput.value;
    var parsed = parseExpEquation(raw);
    if(!parsed){
      els.feedback.textContent = 'Write the full equation, starting with y =, e.g. y = -2(3)^x.';
      els.feedback.className = 'feedback incorrect';
      els.eqInput.classList.add('wrong');
      return false;
    }

    var ok = close(parsed.a, current.a) && parsed.b === current.b;
    els.eqInput.classList.toggle('right', ok); els.eqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatExpEquation(current.a, current.b);
    if(ok){
      score.correct++;
      // Echo what was actually typed rather than the canonical
      // spacing/casing — see the same convention in
      // PracticeExpFromTable's checkSubstitutePoints (GitHub issue #17).
      els.feedback.textContent = 'Correct — ' + raw.trim() + '.';
      els.feedback.className = 'feedback correct';
      working.push(raw.trim());
    } else {
      els.feedback.textContent = 'Not quite. ' + correctStr + ' (a = ' + current.a + ', b = ' + current.b + ').';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Continue/Next button --------------------------------

  function handleCheckOrAdvance(){
    if(isFinalStep()){
      if(!answered){
        var scored = checkEquationStep();
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
    els.svg = document.getElementById('expnoshift-graph-svg');
    els.modeNote = document.getElementById('expnoshift-mode-note');
    els.stepPrompt = document.getElementById('expnoshift-step-prompt');
    els.hint = document.getElementById('expnoshift-hint');
    els.feedback = document.getElementById('expnoshift-feedback');
    els.score = document.getElementById('expnoshift-score');
    els.checkBtn = document.getElementById('expnoshift-check-btn');
    els.nextBtn = document.getElementById('expnoshift-next-btn');
    els.backBtn = document.getElementById('expnoshift-back-btn');
    els.workingCard = document.getElementById('expnoshift-working-card');
    els.workingLines = document.getElementById('expnoshift-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.aInput = document.getElementById('expnoshift-a-input');
    els.bInput = document.getElementById('expnoshift-b-input');
    els.eqInput = document.getElementById('expnoshift-eq-input');

    els.rows = {
      'find-a': document.getElementById('expnoshift-step-find-a'),
      'find-b': document.getElementById('expnoshift-step-find-b'),
      equation: document.getElementById('expnoshift-answer-row-typed')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    [els.aInput, els.bInput, els.eqInput].forEach(function(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
      });
    });
    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    VM.PowerPreview.init();
    VM.KeybindHelp.attach(document.getElementById('expnoshift-keybind-help'));
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
