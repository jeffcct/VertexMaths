/* ============================================================
   practice-parabola-vertex.js — the PracticeParabolaVertex
   component: a question generator for "Finding the equation of a
   parabola (from a graph using vertex)". Draws a random parabola
   with its vertex marked, plus one lattice point exactly one unit
   to the right of it, and walks the student through building
   y = a(x - h)^2 + k as a sequence of steps in Learn mode — the same
   structure as PracticeParabolaIntercepts (see the note at the top
   of that file): read off the vertex (h, k); write the part of the
   equation it gives you, (x - h)^2; read off the other marked point;
   use it to solve for a; then put the whole equation together.
   Practice mode skips straight to that last "write the full
   equation" step — see js/practice-mode.js for the shared
   Learn/Practice mechanism (10 correct in Learn switches a session
   to Practice for its remaining questions).

   The "write the full equation" step is the only one that's scored —
   see the longer explanation in practice-parabola-intercepts.js; it
   applies here unchanged.

   The leading coefficient a is drawn uniformly from -3..3 (never 0)
   on every question — no bias toward ±1. Once a student has done at
   least 5 questions at 90%+ accuracy, a can also land on a simple
   fraction (halves, thirds or quarters); that's a separate unlock
   from the step-scaffolding tiers above and can be active at the
   same time as any of them.

   Public API: VM.PracticeParabolaVertex.init({ onBack }), .start(mode)
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeParabolaVertex = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseGradient = VM.EquationParse.parseGradient;
  var factorLabel = VM.EquationParse.factorLabel;

  // See the matching note in practice-parabola-intercepts.js: a is an
  // integer -3..3 (never 0) on every question, drawn uniformly, with
  // fractions unlocked once a student is doing well.
  var A_INTEGERS = [-3, -2, -1, 1, 2, 3];
  var A_FRACTIONS = [
    [1,2], [-1,2], [3,2], [-3,2],
    [1,3], [-1,3], [2,3], [-2,3],
    [1,4], [-1,4], [3,4], [-3,4]
  ];
  var FRACTION_MIN_ATTEMPTS = 5;
  var FRACTION_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { a, aNum, aDen, h, k }
  var score = { correct: 0, attempted: 0 };
  var practiceMode = null;
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function toPx(x, y){ return grid.toPx(x, y); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function fractionsUnlocked(){
    return score.attempted >= FRACTION_MIN_ATTEMPTS && accuracy() >= FRACTION_MIN_ACCURACY;
  }

  // Picks a, then a matching (h, k) pair — h is never 0 (a vertex on
  // the y-axis would make "(x - h)" degenerate to "(x)", which isn't
  // how anyone writes the equation) and the second marked point,
  // (h + 1, k + a), always lands inside the grid.
  function pickAHK(){
    var pool = A_INTEGERS.slice();
    if(fractionsUnlocked()) pool = pool.concat(A_FRACTIONS);
    var choice = randChoice(pool);
    var aNum = Array.isArray(choice) ? choice[0] : choice;
    var aDen = Array.isArray(choice) ? choice[1] : 1;
    var aVal = aNum / aDen;

    var candidates = [];
    for(var h = -5; h <= 5; h++){
      if(h === 0) continue;
      for(var k = -5; k <= 5; k++){
        var sideY = k + aVal;
        if(Math.abs(sideY) <= GRID_MAX - 0.5 && Math.abs(k) <= GRID_MAX - 0.5){
          candidates.push([h, k]);
        }
      }
    }
    var hk = candidates.length ? randChoice(candidates) : [1, 1];
    return { aNum: aNum, aDen: aDen, aVal: aVal, h: hk[0], k: hk[1] };
  }

  function tierNote(){
    return steps.length === 1 ? "You've got this — just write the full equation." : '';
  }

  function nextQuestion(){
    var t = pickAHK();
    current = { a: t.aVal, aNum: t.aNum, aDen: t.aDen, h: t.h, k: t.k };

    steps = practiceMode.isLearn() ? ['vertex', 'squared', 'point', 'solvea', 'equation'] : ['equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = tierNote();
    renderGraph();
    renderStep();
  }

  function svgCurve(){
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

  function renderGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgCurve();
    els.svg.setAttribute('aria-label', "A parabola plotted on a coordinate grid, with its vertex and one point one unit to the right of the vertex marked.");
  }

  // ---- Step rendering -------------------------------------------------

  var STEP_NAMES = ['vertex', 'squared', 'point', 'solvea', 'equation'];

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'equation'; }

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'vertex': return n + "What's the vertex, (h, k)?";
      case 'squared': return n + 'Write the part of the equation the vertex gives you.';
      case 'point': return n + 'Read off the other marked point.';
      case 'solvea': return n + 'Use that point to solve for a.';
      case 'equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Put it all together.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'squared':
        return 'Leave a as a letter — e.g. y = a(x + 3)^2 + 4.';
      case 'solvea':
        return 'Leave the box blank for 1, or type just - for -1.' +
          (current.aDen > 1 ? ' Fractions like 3/2 are fine.' : '');
      case 'equation':
        return 'Write the full equation, starting with y =, e.g. y = -2(x + 3)^2 + 4. Use ^2 for squared, leave out the coefficient for 1, and use a bare - for -1.' +
          (current.aDen > 1 ? ' Fractions like 3/2 are fine for a.' : '');
      default:
        return '';
    }
  }

  function clearStepInputs(name){
    var map = {
      vertex: [els.vH, els.vK],
      squared: [els.squaredInput],
      point: [els.pointX, els.pointY],
      solvea: [els.solveAInput],
      equation: [els.eqInput]
    };
    (map[name] || []).forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
  }

  function firstInputOf(name){
    var map = {
      vertex: els.vH, squared: els.squaredInput, point: els.pointX,
      solvea: els.solveAInput, equation: els.eqInput
    };
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

  // ---- Parsing ----------------------------------------------------

  // "y = a(x + 3)^2 + 4" — the equation with h and k already
  // substituted from the vertex, but a left as a literal letter since
  // it isn't solved for until the "solvea" step.
  function parseSquared(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    if(s.slice(0, 1) !== 'a') return null;
    s = s.slice(1);
    var m = s.match(/^\(x([+-]\d+(?:\.\d+)?)\)\^2([+-]\d+(?:\.\d+)?)?$/);
    if(!m) return null;
    var h = -parseFloat(m[1]);
    var k = m[2] ? parseFloat(m[2]) : 0;
    if(isNaN(h) || isNaN(k)) return null;
    return { h: h, k: k };
  }

  // "y = -2(x + 3)^2 + 4" — the full equation.
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

  function squaredString(h){ return '(' + factorLabel(h) + ')^2'; }

  // "y = a(x - h)^2 + k" with h and k substituted, a left as a
  // literal letter — the equation as far as it can be built before a
  // is solved for. This is the "squared" step's own expected answer.
  function squaredTemplateString(h, k){
    var kStr = k === 0 ? '' : (k > 0 ? (' + ' + k) : (' - ' + Math.abs(k)));
    return 'y = a' + squaredString(h) + kStr;
  }

  // See the matching note in practice-parabola-intercepts.js: "a = 1"
  // should say "1", but a coefficient of 1 right before a bracket is
  // omitted (or a bare "-") — two different contexts, two formatters.
  function aPlainLabel(aNum, aDen){
    return aDen === 1 ? String(aNum) : ((aNum < 0 ? '-' : '') + Math.abs(aNum) + '/' + aDen);
  }
  function aCoeffLabel(aNum, aDen){
    if(aDen === 1){
      if(aNum === 1) return '';
      if(aNum === -1) return '-';
    }
    return aPlainLabel(aNum, aDen);
  }
  function formatEquation(aNum, aDen, h, k){
    var kStr = k === 0 ? '' : (k > 0 ? (' + ' + k) : (' - ' + Math.abs(k)));
    return 'y = ' + aCoeffLabel(aNum, aDen) + squaredString(h) + kStr;
  }

  // ---- Checking: the four ungraded scaffold steps ------------------

  function checkVertex(){
    var hVal = parseFloat((els.vH.value || '').trim());
    var kVal = parseFloat((els.vK.value || '').trim());
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

  function checkSquared(){
    var parsed = parseSquared(els.squaredInput.value);
    var ok = !!parsed && Math.abs(parsed.h - current.h) < 0.01 && Math.abs(parsed.k - current.k) < 0.01;
    els.squaredInput.classList.toggle('right', ok); els.squaredInput.classList.toggle('wrong', !ok);
    var correctStr = squaredTemplateString(current.h, current.k);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr) : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  function checkPoint(){
    var xVal = parseFloat((els.pointX.value || '').trim());
    var yVal = parseFloat((els.pointY.value || '').trim());
    var wantX = current.h + 1, wantY = current.k + current.a;
    var xOk = !isNaN(xVal) && Math.abs(xVal - wantX) < 0.01;
    var yOk = !isNaN(yVal) && Math.abs(yVal - wantY) < 0.01;
    els.pointX.classList.toggle('right', xOk); els.pointX.classList.toggle('wrong', !xOk);
    els.pointY.classList.toggle('right', yOk); els.pointY.classList.toggle('wrong', !yOk);
    var ok = xOk && yOk;
    els.feedback.textContent = ok ?
      ('Correct — the point is (' + wantX + ', ' + wantY + ').') :
      ('Not quite. The marked point is (' + wantX + ', ' + wantY + ').');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('(' + wantX + ', ' + wantY + ')');
    return ok;
  }

  function checkSolveA(){
    var aVal = parseGradient(els.solveAInput.value);
    var ok = !isNaN(aVal) && Math.abs(aVal - current.a) < 0.01;
    els.solveAInput.classList.toggle('right', ok); els.solveAInput.classList.toggle('wrong', !ok);
    var aStr = aPlainLabel(current.aNum, current.aDen);
    els.feedback.textContent = ok ? ('Correct — a = ' + aStr + '.') : ('Not quite. a = ' + aStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('a = ' + aStr);
    return ok;
  }

  function checkStep(name){
    if(name === 'vertex') return checkVertex();
    if(name === 'squared') return checkSquared();
    if(name === 'point') return checkPoint();
    if(name === 'solvea') return checkSolveA();
    return false;
  }

  // ---- Checking: the final, scored "equation" step -----------------

  function checkEquationStep(){
    if(!current) return false;
    var parsed = parseVertexEquation(els.eqInput.value);
    if(!parsed){
      els.feedback.textContent = "Write the full equation, starting with y =, e.g. y = -2(x + 3)^2 + 4.";
      els.feedback.className = 'feedback incorrect';
      els.eqInput.classList.add('wrong');
      return false;
    }

    var aOk = Math.abs(parsed.a - current.a) < 0.01;
    var hOk = Math.abs(parsed.h - current.h) < 0.01;
    var kOk = Math.abs(parsed.k - current.k) < 0.01;
    var ok = aOk && hOk && kOk;
    els.eqInput.classList.toggle('right', ok);
    els.eqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var equation = formatEquation(current.aNum, current.aDen, current.h, current.k);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + equation;
      if(practiceMode.recordCorrect()){
        els.feedback.textContent += ' That’s 10 correct — switching to practice.';
      }
      els.feedback.className = 'feedback correct';
      working.push(equation);
    } else {
      els.feedback.textContent = 'Not quite. ' + equation +
        ' (a = ' + aPlainLabel(current.aNum, current.aDen) + ', vertex (' + current.h + ', ' + current.k + ')).';
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
    els.svg = document.getElementById('vertex-graph-svg');
    els.modeNote = document.getElementById('vertex-mode-note');
    els.stepPrompt = document.getElementById('vertex-step-prompt');
    els.hint = document.getElementById('vertex-hint');
    els.feedback = document.getElementById('vertex-feedback');
    els.score = document.getElementById('vertex-score');
    els.scoreRow = document.getElementById('vertex-score-row');
    els.checkBtn = document.getElementById('vertex-check-btn');
    els.nextBtn = document.getElementById('vertex-next-btn');
    els.backBtn = document.getElementById('vertex-back-btn');
    els.workingCard = document.getElementById('vertex-working-card');
    els.workingLines = document.getElementById('vertex-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.vH = document.getElementById('vertex-vertex-h');
    els.vK = document.getElementById('vertex-vertex-k');
    els.squaredInput = document.getElementById('vertex-squared-input');
    els.pointX = document.getElementById('vertex-point-x');
    els.pointY = document.getElementById('vertex-point-y');
    els.solveAInput = document.getElementById('vertex-solvea-input');
    els.eqInput = document.getElementById('vertex-eq-input');

    els.rows = {
      vertex: document.getElementById('vertex-step-vertex'),
      squared: document.getElementById('vertex-step-squared'),
      point: document.getElementById('vertex-step-point'),
      solvea: document.getElementById('vertex-step-solvea'),
      equation: document.getElementById('vertex-answer-row-typed')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    [els.vH, els.vK, els.squaredInput, els.pointX, els.pointY, els.solveAInput, els.eqInput].forEach(function(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
      });
    });
    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    VM.PowerPreview.init();
    VM.KeybindHelp.attach(document.getElementById('vertex-keybind-help'));
  }

  function start(mode){
    score = { correct: 0, attempted: 0 };
    practiceMode = VM.PracticeMode.create(mode);
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
