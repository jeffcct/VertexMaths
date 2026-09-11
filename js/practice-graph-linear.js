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
   specific pair — there's no "the" answer to type. The student places
   the two points by clicking directly on the grid (see pxToGrid,
   handlePointClick and renderPointsGraph) rather than typing
   coordinates. Checking always reveals a result: on a correct attempt,
   the student's own line and points are drawn in the "correct" style;
   on a wrong one, they're drawn in the "wrong" style alongside the
   actual line, so there's always something to compare against.

   Public API: VM.PracticeGraphLinear.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeGraphLinear = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseFraction = VM.EquationParse.parseFraction;

  var M_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];
  // Fractional gradients used once usesFractionGradient() kicks in —
  // represented as { num, den } rather than a plain number so the
  // equation can still be displayed as an exact fraction (see
  // formatEquation). Denominators are kept small (2-4), numerator and
  // denominator are coprime, and the denominator is never ±1 (that
  // would just be an integer gradient written oddly).
  var FRACTION_M_VALUES = [
    { num: 2, den: 3 }, { num: -2, den: 3 },
    { num: 4, den: 3 }, { num: -4, den: 3 },
    { num: 3, den: 4 }, { num: -3, den: 4 },
    { num: 5, den: 4 }, { num: -5, den: 4 },
    { num: 3, den: 2 }, { num: -3, den: 2 }
  ];
  var C_MIN = -6, C_MAX = 6;
  var TABLE_XS = [-2, -1, 0, 1, 2];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var EXTRA_TIP_MIN_ATTEMPTS = 10;
  var EXTRA_TIP_MIN_ACCURACY = 0.60;

  // Issue #13 follow-up: lowered from 15 to 10 so the fractional-gradient
  // tier (and its gradient-method walkthrough, see 'gradient-method'
  // below) shows up sooner.
  var FRACTION_GRADIENT_MIN_ATTEMPTS = 10;
  var FRACTION_GRADIENT_MIN_ACCURACY = 0.60;

  // The gradient-method tutorial (see 'gradient-method' below) is shown
  // for a student's first few fractional-gradient questions regardless
  // of needsScaffold() — a student with high overall accuracy exits the
  // general scaffold by attempt 3, but that doesn't mean they've ever
  // been taught the rise/run method, and they're exactly the student
  // about to meet a fractional gradient for the first time once the
  // tier unlocks. Tying the tutorial only to needsScaffold() would mean
  // a strong student never sees it at all.
  var GRADIENT_TUTORIAL_MAX_SHOWS = 3;
  var fractionalGradientsSeen = 0;

  var els = {};
  var current = null;    // { m, c }
  var score = { correct: 0, attempted: 0 };
  // ['points'], ['table', 'points'], or — for a fractional-gradient
  // question while still in the scaffolded tier — ['table',
  // 'gradient-method', 'points']. See nextQuestion().
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false; // has the current (ungraded) scaffold step been answered correctly?
  var answered = false;     // has the final 'points' step been checked at all?
  var working = null;       // the "shown work" trail for the current question — see working-trail.js
  var clickedPoints = [];   // up to two { x, y } points placed by clicking the grid, for the current attempt

  function toPx(x, y){ return grid.toPx(x, y); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }
  function showsExtraTip(){
    return score.attempted >= EXTRA_TIP_MIN_ATTEMPTS && accuracy() >= EXTRA_TIP_MIN_ACCURACY;
  }
  function usesFractionGradient(){
    return score.attempted >= FRACTION_GRADIENT_MIN_ATTEMPTS && accuracy() >= FRACTION_GRADIENT_MIN_ACCURACY;
  }

  // m is either a plain integer (the original representation) or a
  // { num, den } fraction (see FRACTION_M_VALUES) — mNum gives the
  // numeric value for arithmetic/geometry, coeffLabel/formatEquation
  // give the display string.
  function mNum(m){ return (m && typeof m === 'object') ? (m.num / m.den) : m; }
  function coeffLabel(v){
    if(v && typeof v === 'object') return v.num + '/' + v.den;
    return v === 1 ? '' : (v === -1 ? '-' : String(v));
  }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }
  function formatEquation(m, c){ return 'y = ' + coeffLabel(m) + 'x' + signedConst(c); }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'points'; }

  // Roughly half the time, once the student has reached the fractional
  // tier, generate a genuinely fractional gradient instead of an
  // integer one — the integer pool stays in the mix too, for variety.
  function pickM(){
    if(usesFractionGradient() && Math.random() < 0.5) return randChoice(FRACTION_M_VALUES);
    return randChoice(M_VALUES);
  }

  function nextQuestion(){
    var m = pickM();
    var c = randInt(C_MIN, C_MAX);
    current = { m: m, c: c };

    // A fractional gradient gets its own 'gradient-method' step (teaching
    // y-intercept + rise/run) ahead of 'points', for the student's first
    // few fractional-gradient questions — regardless of needsScaffold(),
    // so a student who exited the general scaffold on accuracy still
    // gets taught the method the first time they actually need it. The
    // general 'table' scaffold, if still active, stays alongside it;
    // once past it, the tutorial appears on its own ahead of 'points'.
    // Integer-gradient questions are unaffected either way.
    var fractional = current.m && typeof current.m === 'object';
    var showGradientTutorial = fractional && fractionalGradientsSeen < GRADIENT_TUTORIAL_MAX_SHOWS;
    if(fractional) fractionalGradientsSeen++;

    if(showGradientTutorial){
      steps = needsScaffold() ? ['table', 'gradient-method', 'points'] : ['gradient-method', 'points'];
    } else {
      steps = needsScaffold() ? ['table', 'points'] : ['points'];
    }
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    clickedPoints = [];
    working.reset();

    els.equation.textContent = formatEquation(current.m, current.c);
    els.modeNote.textContent = steps.length === 1 ?
      "You're doing well — straight to giving two points this time." : '';
    els.extraTip.hidden = !showsExtraTip();
    if(!els.extraTip.hidden){
      els.extraTip.textContent = "Extra tip: once you've placed one point on the line, you can find another " +
        'by moving along the gradient — right by the denominator (or right 1, for a whole-number gradient), ' +
        'then up or down by the numerator — instead of substituting again.';
    }

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

  // Extends the line through two arbitrary grid points (e.g. the
  // student's own clicked points, which won't generally lie on
  // current's actual line) so it spans the full grid, same as
  // clipToBox does for a known m/c. Points with equal x give a
  // vertical line — undefined slope in y = mx + c form — so that
  // case is clipped directly to x = x1 rather than going through
  // clipToBox at all.
  function lineThroughPoints(x1, y1, x2, y2){
    if(Math.abs(x1 - x2) < 1e-9) return [{ x: x1, y: GRID_MIN }, { x: x1, y: GRID_MAX }];
    var m = (y2 - y1) / (x2 - x1);
    var c = y1 - m * x1;
    return clipToBox(m, c);
  }

  // Converts a mouse-click event on the SVG into a snapped, clamped grid
  // coordinate. The viewBox is 320x320 regardless of the SVG's on-screen
  // size, so client coordinates have to be rescaled into viewBox space
  // before subtracting the grid's margin and dividing by its cell size.
  function pxToGrid(e){
    var rect = els.svg.getBoundingClientRect();
    var scaleX = 320 / rect.width, scaleY = 320 / rect.height;
    var localX = (e.clientX - rect.left) * scaleX;
    var localY = (e.clientY - rect.top) * scaleY;
    var gx = Math.round(grid.xMin + (localX - grid.margin) / grid.cell);
    var gy = Math.round(grid.yMax - (localY - grid.margin) / grid.cell);
    gx = Math.max(grid.xMin, Math.min(grid.xMax, gx));
    gy = Math.max(grid.yMin, Math.min(grid.yMax, gy));
    return { x: gx, y: gy };
  }

  function updatePointReadout(){
    var p1 = clickedPoints[0], p2 = clickedPoints[1];
    els.pointReadout1.textContent = 'Point 1: ' + (p1 ? ('(' + p1.x + ', ' + p1.y + ')') : 'not yet placed');
    els.pointReadout2.textContent = 'Point 2: ' + (p2 ? ('(' + p2.x + ', ' + p2.y + ')') : 'not yet placed');
  }

  // Redraws the grid with whatever points have been clicked so far (and
  // the segment between them, once there are two) — called after every
  // click while the 'points' step is still in progress.
  function renderPointsGraph(){
    var s = grid.gridSvg() + grid.axesSvg();
    if(clickedPoints.length === 2){
      var ends = lineThroughPoints(clickedPoints[0].x, clickedPoints[0].y, clickedPoints[1].x, clickedPoints[1].y);
      var a = toPx(ends[0].x, ends[0].y), b = toPx(ends[1].x, ends[1].y);
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" class="plot-line"></line>';
    }
    clickedPoints.forEach(function(p){
      var px = toPx(p.x, p.y);
      s += '<circle cx="' + px.x + '" cy="' + px.y + '" r="4.5" class="plot-point"></circle>';
    });
    els.svg.innerHTML = s;
    els.svg.setAttribute('aria-label', 'A coordinate grid with the points placed so far, click to add or restart.');
    updatePointReadout();
  }

  // Draws the final result once the 'points' step has been checked: the
  // student's own two points and the segment between them, styled to
  // show right/wrong — plus, when wrong, the actual line (in the normal
  // style) so the student can compare their attempt against it.
  function revealPointsResult(x1, y1, x2, y2, ok){
    var pointClass = 'plot-point ' + (ok ? 'plot-point-correct' : 'plot-point-wrong');
    var lineClass = 'plot-line ' + (ok ? 'plot-line-correct' : 'plot-line-wrong');
    var a = toPx(x1, y1), b = toPx(x2, y2);
    var s = grid.gridSvg() + grid.axesSvg();
    // When correct, the two clicked points are guaranteed to lie
    // exactly on current's line, so draw the actual full-grid line
    // through them. When wrong, extend the student's own (incorrect)
    // line — whatever slope their two points define — across the full
    // grid too, then draw the actual line alongside it for comparison.
    var lineEnds = ok ? clipToBox(mNum(current.m), current.c) : lineThroughPoints(x1, y1, x2, y2);
    var e1 = toPx(lineEnds[0].x, lineEnds[0].y), e2 = toPx(lineEnds[1].x, lineEnds[1].y);
    s += '<line x1="' + e1.x + '" y1="' + e1.y + '" x2="' + e2.x + '" y2="' + e2.y + '" class="' + lineClass + '"></line>';
    s += '<circle cx="' + a.x + '" cy="' + a.y + '" r="4.5" class="' + pointClass + '"></circle>';
    s += '<circle cx="' + b.x + '" cy="' + b.y + '" r="4.5" class="' + pointClass + '"></circle>';
    if(!ok){
      var actualEnds = clipToBox(mNum(current.m), current.c);
      var r1 = toPx(actualEnds[0].x, actualEnds[0].y), r2 = toPx(actualEnds[1].x, actualEnds[1].y);
      s += '<line x1="' + r1.x + '" y1="' + r1.y + '" x2="' + r2.x + '" y2="' + r2.y + '" class="plot-line"></line>';
    }
    els.svg.innerHTML = s;
    els.svg.setAttribute('aria-label', ok ?
      'The line plotted on a coordinate grid, with two correct points marked on it.' :
      'The coordinate grid showing the attempted points and line alongside the actual line.');
  }

  // ---- The 'table' step (ungraded scaffold) ---------------------------
  // The table markup itself (x-values as header <td>s, y-inputs as
  // <td><input></td> in the row below) lives in the HTML, same pattern
  // as practice-graph-quadratic.html's table — no need to build it here.

  function gcd(a, b){
    a = Math.abs(a); b = Math.abs(b);
    while(b){ var t = b; b = a % b; a = t; }
    return a || 1;
  }

  // Each wanted table value as an exact { value, num, den } — value is
  // the plain number used for comparing the student's answer, num/den
  // is the reduced fraction used for display. With a fractional m,
  // m*x + c isn't always a whole number (e.g. y = 2/3x - 4 at x = -2),
  // so this keeps the y-values exact rather than a rounded decimal.
  function tableWants(){
    if(current.m && typeof current.m === 'object'){
      var num = current.m.num, den = current.m.den;
      return TABLE_XS.map(function(x){
        var n = num * x + current.c * den;
        var g = gcd(n, den);
        var rn = n / g, rd = den / g;
        if(rd < 0){ rn = -rn; rd = -rd; }
        return { value: rn / rd, num: rn, den: rd };
      });
    }
    return TABLE_XS.map(function(x){
      var n = current.m * x + current.c;
      return { value: n, num: n, den: 1 };
    });
  }

  function formatWanted(w){ return w.den === 1 ? String(w.num) : (w.num + '/' + w.den); }

  function checkTable(){
    var wants = tableWants();
    var oks = els.tableInputs.map(function(el, i){
      var v = parseFraction(el.value);
      return !isNaN(v) && Math.abs(v - wants[i].value) < 0.01;
    });
    els.tableInputs.forEach(function(el, i){
      el.classList.toggle('right', oks[i]);
      el.classList.toggle('wrong', !oks[i]);
    });
    var ok = oks.every(function(o){ return o; });
    var wantedStr = wants.map(formatWanted).join(', ');
    els.feedback.textContent = ok ?
      'Correct — every value comes from substituting x into ' + formatEquation(current.m, current.c) + '.' :
      ('Not quite. The y-values should be ' + wantedStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('y-values: ' + wantedStr);
    return ok;
  }

  // ---- The 'gradient-method' step (ungraded scaffold, fractional-
  // gradient questions only) -------------------------------------------
  // A distinct method from the substitution table: read the y-intercept
  // straight off the equation, then use the gradient itself (numerator =
  // rise, denominator = run) to find a second point. Checked as two
  // parts — the y-intercept, then the specific point reached by moving
  // one gradient-step from it — rather than accepting any point that
  // happens to lie on the line (that's what the later free-choice
  // 'points' step already tests).

  // The point reached by moving from the y-intercept by exactly one
  // gradient-step: right by the denominator (or right 1, for an integer
  // gradient), then up/down by the numerator.
  function gradientStepPoint(){
    var m = current.m;
    if(m && typeof m === 'object') return { x: m.den, y: current.c + m.num };
    return { x: 1, y: current.c + m };
  }

  function checkGradientMethod(){
    var wantYint = current.c;
    var yintVal = parseFraction(els.yint.value);
    var yintOk = !isNaN(yintVal) && Math.abs(yintVal - wantYint) < 0.01;
    els.yint.classList.toggle('right', yintOk);
    els.yint.classList.toggle('wrong', !yintOk);

    var gx = parseFraction(els.gmX.value);
    var gy = parseFraction(els.gmY.value);
    var expected = gradientStepPoint();
    var m = mNum(current.m);
    var hasCoords = !isNaN(gx) && !isNaN(gy);
    var onLine = hasCoords && Math.abs(gy - (m * gx + current.c)) < 0.01;
    var isStepPoint = hasCoords && Math.abs(gx - expected.x) < 0.01 && Math.abs(gy - expected.y) < 0.01;
    els.gmX.classList.toggle('right', isStepPoint);
    els.gmX.classList.toggle('wrong', !isStepPoint);
    els.gmY.classList.toggle('right', isStepPoint);
    els.gmY.classList.toggle('wrong', !isStepPoint);

    var ok = yintOk && isStepPoint;
    var runLabel = (current.m && typeof current.m === 'object') ? current.m.den : 1;
    var expectedStr = '(' + expected.x + ', ' + expected.y + ')';

    if(!yintOk){
      els.feedback.textContent = 'Not quite. The y-intercept is the constant term in y = mx + c — read it ' +
        'straight off the equation: y-intercept = ' + wantYint + '.';
    } else if(!isStepPoint){
      els.feedback.textContent = (onLine ?
        'That point lies on the line, but it\'s not one gradient-step from the y-intercept. ' :
        'Not quite. ') +
        'From (0, ' + wantYint + '), move right ' + runLabel +
        ' and then up or down by the gradient\'s numerator to reach ' + expectedStr + '.';
    } else {
      els.feedback.textContent = 'Correct — the y-intercept is (0, ' + wantYint + '), and moving along the ' +
        'gradient from there gives a second point at ' + expectedStr + '.';
    }
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('y-intercept = (0, ' + wantYint + '); second point = ' + expectedStr);
    return ok;
  }

  // ---- The 'points' step (final, scored) -------------------------------
  // The student places two points by clicking the grid instead of typing
  // coordinates — see handlePointClick and renderPointsGraph above.

  function checkPoints(){
    if(!current) return false;
    if(clickedPoints.length < 2){
      els.feedback.textContent = 'Place two points on the grid first.';
      els.feedback.className = 'feedback incorrect';
      return false;
    }

    var p1 = clickedPoints[0], p2 = clickedPoints[1];
    var m = mNum(current.m);
    var onLine1 = Math.abs(p1.y - (m * p1.x + current.c)) < 0.01;
    var onLine2 = Math.abs(p2.y - (m * p2.x + current.c)) < 0.01;
    var samePoint = Math.abs(p1.x - p2.x) < 0.01 && Math.abs(p1.y - p2.y) < 0.01;
    var ok = onLine1 && onLine2 && !samePoint;

    score.attempted++;
    var equation = formatEquation(current.m, current.c);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — both points lie on ' + equation + '. The line is now shown on the grid.';
      els.feedback.className = 'feedback correct';
      working.push('(' + p1.x + ', ' + p1.y + ') and (' + p2.x + ', ' + p2.y + ')');
    } else {
      var reason = samePoint ? 'Those are the same point — pick two different points.' :
        ('Each point must satisfy ' + equation + '.');
      els.feedback.textContent = 'Not quite. ' + reason + ' The actual line is now shown on the grid.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    revealPointsResult(p1.x, p1.y, p2.x, p2.y, ok);
    return true;
  }

  // ---- Step plumbing ----------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    if(name === 'table') return n + 'Substitute each x-value to complete the table.';
    if(name === 'gradient-method') return n + 'State the y-intercept, then use the gradient to find a second point.';
    return n + 'Give the coordinates of two points on the line.';
  }

  function stepHint(name){
    if(name === 'table') return 'Substitute each x-value into y = mx + c.';
    if(name === 'gradient-method') return 'The y-intercept is the constant term in y = mx + c. From that point, ' +
      'the gradient\'s denominator tells you how far to move right (or move right 1, for a whole-number ' +
      'gradient), and its numerator tells you how far to move up or down from there.';
    return 'Any two points that satisfy the equation work — try x = 0 for one of them.';
  }

  function clearStepInputs(name){
    if(name === 'table'){
      els.tableInputs.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    } else if(name === 'gradient-method'){
      [els.yint, els.gmX, els.gmY].forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    } else {
      // Entering the 'points' step — for a new question, or (re)entering
      // it after the scaffold step(s) — starts the click-to-plot attempt
      // over with no points placed yet.
      clickedPoints = [];
      renderPointsGraph();
    }
  }

  // Ignored outside the 'points' step, and once that step has already
  // been checked (the revealed result then stays put until "Next
  // question"). Otherwise: adds a point if fewer than two are placed,
  // or starts a fresh pair if two are already placed.
  function handlePointClick(e){
    if(!current || currentStepName() !== 'points' || answered) return;
    var p = pxToGrid(e);
    if(clickedPoints.length >= 2){
      clickedPoints = [p];
    } else {
      clickedPoints.push(p);
    }
    renderPointsGraph();
  }

  function renderStep(){
    var name = currentStepName();
    els.rowTable.hidden = (name !== 'table');
    els.rowGradient.hidden = (name !== 'gradient-method');
    els.rowPoints.hidden = (name !== 'points');
    clearStepInputs(name);
    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    if(name === 'table') els.tableInputs[0].focus();
    if(name === 'gradient-method') els.yint.focus();
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
      var name = currentStepName();
      var ok = name === 'table' ? checkTable() : checkGradientMethod();
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
    els.extraTip = document.getElementById('graphline-extra-tip');
    els.stepPrompt = document.getElementById('graphline-step-prompt');

    els.rowTable = document.getElementById('graphline-step-table');
    els.table = document.getElementById('graphline-table');
    els.tableInputs = [1, 2, 3, 4, 5].map(function(i){ return document.getElementById('graphline-y-' + i); });

    els.rowGradient = document.getElementById('graphline-step-gradient');
    els.yint = document.getElementById('graphline-yint');
    els.gmX = document.getElementById('graphline-gm-x');
    els.gmY = document.getElementById('graphline-gm-y');

    els.rowPoints = document.getElementById('graphline-step-points');
    els.pointReadout1 = document.getElementById('graphline-point-readout-1');
    els.pointReadout2 = document.getElementById('graphline-point-readout-2');

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
    els.svg.addEventListener('click', handlePointClick);
    els.tableInputs.concat([els.yint, els.gmX, els.gmY]).forEach(function(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
      });
    });
    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    fractionalGradientsSeen = 0;
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
