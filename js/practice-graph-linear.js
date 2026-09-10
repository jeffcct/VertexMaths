/* ============================================================
   practice-graph-linear.js — the PracticeGraphLinear component: a
   question generator for "Graphing linear equations (by
   substitution and by gradient / intercept)". This is the reverse
   of PracticeLineGraph: instead of reading a line's equation off a
   graph, the student is GIVEN y = mx + c and has to work out what's
   needed to plot it — first by completing a substitution table,
   then by giving two points that lie on the line. The grid starts
   empty (axes only); the true line is only drawn once the final
   step has been checked, as a reveal.

   Adaptive difficulty, the same shape as PracticeLineFromTable's
   scaffold step (see the note at the top of that file):
     - fewer than 3 questions done, or below 90% accuracy: two
       steps — first complete a table of values by substitution,
       then give two points on the line. The table step is ungraded
       scaffolding — it must be answered correctly to move on, but
       doesn't affect accuracy.
     - 3+ questions done and 90%+ accuracy: the table step is
       skipped and the question goes straight to the points step.

   The "points" step is the only scored step, and it's a genuine
   free-choice step: any two points that satisfy y = mx + c (and
   aren't the same point as each other) are accepted, not just one
   specific pair — there's no "the" answer to type. Checking it
   always reveals the actual line on the graph, along with either
   the student's own two points (if they parsed as numbers) or a
   fallback pair, so there's always something to look at.

   Public API: VM.PracticeGraphLinear.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeGraphLinear = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseFraction = VM.EquationParse.parseFraction;

  var M_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];
  var C_MIN = -6, C_MAX = 6;
  var TABLE_XS = [-2, -1, 0, 1, 2];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { m, c }
  var score = { correct: 0, attempted: 0 };
  var steps = [];         // ['table', 'points'] or just ['points']
  var stepIndex = 0;
  var stepAnswered = false; // has the (ungraded) 'table' step been answered correctly?
  var answered = false;     // has the final 'points' step been checked at all?
  var working = null;       // the "shown work" trail for the current question — see working-trail.js

  function toPx(x, y){ return grid.toPx(x, y); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }
  function formatEquation(m, c){ return 'y = ' + coeffLabel(m) + 'x' + signedConst(c); }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'points'; }

  function nextQuestion(){
    var m = randChoice(M_VALUES);
    var c = randInt(C_MIN, C_MAX);
    current = { m: m, c: c };

    steps = needsScaffold() ? ['table', 'points'] : ['points'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();

    els.equation.textContent = formatEquation(current.m, current.c);
    els.modeNote.textContent = steps.length === 1 ?
      "You're doing well — straight to giving two points this time." : '';

    renderTable();
    renderBlankGraph();
    renderStep();
  }

  // ---- Graph rendering ------------------------------------------------

  function renderBlankGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg();
    els.svg.setAttribute('aria-label', 'An empty coordinate grid, ready for a line to be plotted on it.');
  }

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

  function svgLineAndPoints(x1, y1, x2, y2){
    var ends = clipToBox(current.m, current.c);
    var e1 = toPx(ends[0].x, ends[0].y), e2 = toPx(ends[1].x, ends[1].y);
    var s = '<line x1="' + e1.x + '" y1="' + e1.y + '" x2="' + e2.x + '" y2="' + e2.y + '" class="plot-line"></line>';
    var a = toPx(x1, y1), b = toPx(x2, y2);
    s += '<circle cx="' + a.x + '" cy="' + a.y + '" r="4.5" class="plot-point"></circle>';
    s += '<circle cx="' + b.x + '" cy="' + b.y + '" r="4.5" class="plot-point"></circle>';
    return s;
  }

  function revealGraph(x1, y1, x2, y2){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgLineAndPoints(x1, y1, x2, y2);
    els.svg.setAttribute('aria-label', 'The line plotted on a coordinate grid, with two points marked on it.');
  }

  // ---- The 'table' step (ungraded scaffold) ---------------------------

  function renderTable(){
    var headRow = '<tr><th>x</th>' + TABLE_XS.map(function(x){ return '<td>' + x + '</td>'; }).join('') + '</tr>';
    els.table.innerHTML = headRow;
  }

  function tableWants(){ return TABLE_XS.map(function(x){ return current.m * x + current.c; }); }

  function checkTable(){
    var wants = tableWants();
    var oks = els.tableInputs.map(function(el, i){
      var v = parseFraction(el.value);
      return !isNaN(v) && Math.abs(v - wants[i]) < 0.01;
    });
    els.tableInputs.forEach(function(el, i){
      el.classList.toggle('right', oks[i]);
      el.classList.toggle('wrong', !oks[i]);
    });
    var ok = oks.every(function(o){ return o; });
    els.feedback.textContent = ok ?
      'Correct — every value comes from substituting x into ' + formatEquation(current.m, current.c) + '.' :
      ('Not quite. The y-values should be ' + wants.join(', ') + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('y-values: ' + wants.join(', '));
    return ok;
  }

  // ---- The 'points' step (final, scored) -------------------------------

  function markPointInputs(xEl, yEl, ok){
    xEl.classList.toggle('right', ok); xEl.classList.toggle('wrong', !ok);
    yEl.classList.toggle('right', ok); yEl.classList.toggle('wrong', !ok);
  }

  function checkPoints(){
    if(!current) return false;
    var x1 = parseFloat((els.p1x.value || '').trim());
    var y1 = parseFloat((els.p1y.value || '').trim());
    var x2 = parseFloat((els.p2x.value || '').trim());
    var y2 = parseFloat((els.p2y.value || '').trim());
    var allValid = ![x1, y1, x2, y2].some(isNaN);

    var onLine1 = allValid && Math.abs(y1 - (current.m * x1 + current.c)) < 0.01;
    var onLine2 = allValid && Math.abs(y2 - (current.m * x2 + current.c)) < 0.01;
    var samePoint = allValid && Math.abs(x1 - x2) < 0.01 && Math.abs(y1 - y2) < 0.01;
    var ok = allValid && onLine1 && onLine2 && !samePoint;

    markPointInputs(els.p1x, els.p1y, onLine1);
    markPointInputs(els.p2x, els.p2y, onLine2 && !samePoint);

    // Always reveal the true line — the student's own two points if
    // they parsed as numbers, otherwise a sensible fallback pair.
    if(allValid){
      revealGraph(x1, y1, x2, y2);
    } else {
      revealGraph(0, current.c, 1, current.m + current.c);
    }

    score.attempted++;
    var equation = formatEquation(current.m, current.c);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — both points lie on ' + equation + '. The line is now shown on the grid.';
      els.feedback.className = 'feedback correct';
      working.push('(' + x1 + ', ' + y1 + ') and (' + x2 + ', ' + y2 + ')');
    } else {
      var reason = !allValid ? 'Enter a number in all four boxes.' :
        (samePoint ? 'Those are the same point — pick two different points.' :
        ('Each point must satisfy ' + equation + '.'));
      els.feedback.textContent = 'Not quite. ' + reason + ' The line is now shown on the grid.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Step plumbing ----------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    if(name === 'table') return n + 'Substitute each x-value to complete the table.';
    return n + 'Give the coordinates of two points on the line.';
  }

  function stepHint(name){
    if(name === 'table') return 'Substitute each x-value into y = mx + c.';
    return 'Any two points that satisfy the equation work — try x = 0 for one of them.';
  }

  function clearStepInputs(name){
    if(name === 'table'){
      els.tableInputs.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    } else {
      [els.p1x, els.p1y, els.p2x, els.p2y].forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    }
  }

  function renderStep(){
    var name = currentStepName();
    els.rowTable.hidden = (name !== 'table');
    els.rowPoints.hidden = (name !== 'points');
    clearStepInputs(name);
    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    (name === 'table' ? els.tableInputs[0] : els.p1x).focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  function handleCheckOrAdvance(){
    if(isFinalStep()){
      if(!answered){
        var scored = checkPoints();
        if(scored){
          answered = true;
          els.checkBtn.textContent = 'Next question';
        }
      } else {
        nextQuestion();
      }
      return;
    }
    if(!stepAnswered){
      var ok = checkTable();
      if(ok){
        stepAnswered = true;
        els.checkBtn.textContent = 'Continue';
      }
    } else {
      advanceStep();
    }
  }

  function init(opts){
    opts = opts || {};
    els.svg = document.getElementById('graphline-graph-svg');
    els.equation = document.getElementById('graphline-equation');
    els.modeNote = document.getElementById('graphline-mode-note');
    els.stepPrompt = document.getElementById('graphline-step-prompt');

    els.rowTable = document.getElementById('graphline-step-table');
    els.table = document.getElementById('graphline-table');
    els.tableInputs = [
      document.getElementById('graphline-table-y-0'),
      document.getElementById('graphline-table-y-1'),
      document.getElementById('graphline-table-y-2'),
      document.getElementById('graphline-table-y-3'),
      document.getElementById('graphline-table-y-4')
    ];

    els.rowPoints = document.getElementById('graphline-step-points');
    els.p1x = document.getElementById('graphline-p1-x');
    els.p1y = document.getElementById('graphline-p1-y');
    els.p2x = document.getElementById('graphline-p2-x');
    els.p2y = document.getElementById('graphline-p2-y');

    els.hint = document.getElementById('graphline-hint');
    els.feedback = document.getElementById('graphline-feedback');
    els.score = document.getElementById('graphline-score');
    els.scoreRow = document.getElementById('graphline-score-row');
    els.checkBtn = document.getElementById('graphline-check-btn');
    els.nextBtn = document.getElementById('graphline-next-btn');
    els.backBtn = document.getElementById('graphline-back-btn');
    els.workingCard = document.getElementById('graphline-working-card');
    els.workingLines = document.getElementById('graphline-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.tableInputs.concat([els.p1x, els.p1y, els.p2x, els.p2y]).forEach(function(input){
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
