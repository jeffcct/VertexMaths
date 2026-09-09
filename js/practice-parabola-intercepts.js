/* ============================================================
   practice-parabola-intercepts.js — the PracticeParabolaIntercepts
   component: a question generator for "Finding the equation of a
   parabola (from a graph using intercepts)". Draws a random parabola
   on a coordinate grid with its two x-intercepts and its y-intercept
   marked, and walks the student through building
   y = a(x - p)(x - q) as a sequence of steps that shortens as their
   accuracy improves:

     - Tier A (default — the first 3 questions, or accuracy below
       70%): five steps — read off the two x-intercepts; write the
       factors they give you, (x - p)(x - q); read off the other
       marked point; use it to solve for a; then put the whole
       equation together.
     - Tier B (more than 3 questions done, 70-90% accuracy): four
       steps — starts straight at the factors step, skipping the
       separate "read off the intercepts" step.
     - Tier C (more than 5 questions done, 90%+ accuracy): one
       step — just write the full equation.

   Every tier ends on the same "write the full equation" step, and
   that's the only step that's actually scored — the earlier steps
   in a tier are ungraded scaffolding: they must be answered
   correctly to move on, but getting one wrong along the way (and
   retrying) doesn't count against accuracy. The tier for a question
   is decided once, right before it's generated, from the running
   score — same as every other Practice component's adaptive
   difficulty (see the note at the top of practice-line-graph.js).

   The two x-intercepts can always be entered/typed in either order,
   since (x - p)(x - q) and (x - q)(x - p) are the same equation.

   Public API: VM.PracticeParabolaIntercepts.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeParabolaIntercepts = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseGradient = VM.EquationParse.parseGradient;
  var factorLabel = VM.EquationParse.factorLabel;

  // Curated { a, p, q } triples — a is the leading coefficient, p and
  // q the two x-intercepts. Curated so every question's y-intercept
  // (a*p*q) is guaranteed to land inside the grid, where it can
  // actually be marked and read. The first 3 questions (see
  // tripleChoices below) draw only from the |a| <= 2 entries; the
  // |a| = 3 entries are held back until after that, so the numbers
  // stay simple while the five-step walkthrough itself is still new.
  var TRIPLES = [
    { a:-2, p:-3, q:-1 }, { a:-2, p:-3, q:1 }, { a:-2, p:-1, q:2 }, { a:-2, p:1, q:2 },
    { a:-1, p:-3, q:-2 }, { a:-1, p:-2, q:1 }, { a:-1, p:1, q:3 }, { a:-1, p:2, q:3 },
    { a:1, p:-4, q:-1 }, { a:1, p:-3, q:2 }, { a:1, p:-1, q:3 }, { a:1, p:1, q:4 },
    { a:2, p:-2, q:-1 }, { a:2, p:-1, q:2 }, { a:2, p:1, q:3 },
    { a:-3, p:-2, q:-1 }, { a:-3, p:-1, q:2 }, { a:3, p:-2, q:1 }, { a:3, p:-1, q:1 }, { a:3, p:1, q:2 }
  ];
  var SIMPLE_A_QUESTION_CAP = 3; // "after the 3rd question" — before that, |a| stays <= 2

  function tripleChoices(){
    if(score.attempted < SIMPLE_A_QUESTION_CAP){
      return TRIPLES.filter(function(t){ return Math.abs(t.a) <= 2; });
    }
    return TRIPLES;
  }

  // Tier thresholds. Checked most-reduced-first: once a student
  // clears tier C's bar they stay there even though tier B's (looser)
  // bar also matches; short of tier C, clearing tier B's bar still
  // drops the intercepts step even at 90%+ accuracy if they haven't
  // yet done enough questions for tier C.
  var TIER_B_MIN_ATTEMPTS = 3;    // "more than 3 questions"
  var TIER_B_MIN_ACCURACY = 0.70; // "between 70 and 90% correct"
  var TIER_C_MIN_ATTEMPTS = 5;    // "more than 5 questions answered"
  var TIER_C_MIN_ACCURACY = 0.90; // "between 90 and 100%"

  var els = {};
  var current = null;    // { a, p, q, yInt }
  var score = { correct: 0, attempted: 0 };
  var steps = [];        // this question's step sequence, e.g. ['intercepts','brackets','point','solvea','equation']
  var stepIndex = 0;
  var stepAnswered = false; // has the CURRENT (non-final) step been answered correctly?
  var answered = false;     // has the FINAL "equation" step been checked at all?

  function toPx(x, y){ return grid.toPx(x, y); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }

  function tierSequence(){
    if(score.attempted > TIER_C_MIN_ATTEMPTS && accuracy() >= TIER_C_MIN_ACCURACY){
      return ['equation'];
    }
    if(score.attempted > TIER_B_MIN_ATTEMPTS && accuracy() >= TIER_B_MIN_ACCURACY){
      return ['brackets', 'point', 'solvea', 'equation'];
    }
    return ['intercepts', 'brackets', 'point', 'solvea', 'equation'];
  }

  function tierNote(){
    if(steps.length === 1) return "You've got this — just write the full equation.";
    if(steps.length === 4) return "You're doing well — skipping straight to the factors this time.";
    return '';
  }

  function nextQuestion(){
    var t = randChoice(tripleChoices());
    current = { a: t.a, p: t.p, q: t.q, yInt: t.a * t.p * t.q };

    steps = tierSequence();
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
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

  function renderGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgCurve();
    els.svg.setAttribute('aria-label', 'A parabola plotted on a coordinate grid, with its two x-intercepts and its y-intercept marked.');
  }

  // ---- Step rendering -------------------------------------------------

  var STEP_NAMES = ['intercepts', 'brackets', 'point', 'solvea', 'equation'];

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'equation'; }

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'intercepts': return n + 'What are the two x-intercepts?';
      case 'brackets': return n + 'Write the part of the equation the intercepts give you.';
      case 'point': return n + "Read off the marked point that isn't an x-intercept.";
      case 'solvea': return n + 'Use that point to solve for a.';
      case 'equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Put it all together.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'intercepts':
        return 'These are where the curve crosses the x-axis.';
      case 'brackets':
        return 'Write it as (x - p)(x - q), e.g. (x - 3)(x + 1). The order of the two factors doesn\'t matter.';
      case 'point':
        return 'It\'s the marked point that isn\'t sitting on the x-axis.';
      case 'solvea':
        return 'Substitute the point into y = a(' + factorLabel(current.p) + ')(' + factorLabel(current.q) + ') and solve for a. Leave the box blank for 1, or type just - for -1.';
      case 'equation':
        return 'Write the full equation, starting with y =, e.g. y = -2(x - 3)(x + 1). Leave out the coefficient for 1 and use a bare - for -1.';
    }
  }

  function clearStepInputs(name){
    var map = {
      intercepts: [els.intP1, els.intP2],
      brackets: [els.bracketsInput],
      point: [els.pointX, els.pointY],
      solvea: [els.solveAInput],
      equation: [els.eqInput]
    };
    (map[name] || []).forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
  }

  function firstInputOf(name){
    var map = {
      intercepts: els.intP1, brackets: els.bracketsInput, point: els.pointX,
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

  function rootsMatch(gotRoots, p, q){
    var got = gotRoots.slice().sort(function(x, y){ return x - y; });
    var want = [p, q].sort(function(x, y){ return x - y; });
    return Math.abs(got[0] - want[0]) < 0.01 && Math.abs(got[1] - want[1]) < 0.01;
  }

  // "(x - 3)(x + 1)" — just the two factors, no "a", no "y =".
  function parseBrackets(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^\(x([+-]\d+(?:\.\d+)?)\)\(x([+-]\d+(?:\.\d+)?)\)$/);
    if(!m) return null;
    return { roots: [-parseFloat(m[1]), -parseFloat(m[2])] };
  }

  // "y = -2(x - 3)(x + 1)" — the full equation.
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

  function bracketsString(p, q){ return '(' + factorLabel(p) + ')(' + factorLabel(q) + ')'; }
  function formatEquation(a, p, q){
    var aStr = a === 1 ? '' : (a === -1 ? '-' : String(a));
    return 'y = ' + aStr + bracketsString(p, q);
  }

  // ---- Checking: the four ungraded scaffold steps ------------------

  function checkIntercepts(){
    var r1 = parseFloat((els.intP1.value || '').trim());
    var r2 = parseFloat((els.intP2.value || '').trim());
    var ok = !isNaN(r1) && !isNaN(r2) && rootsMatch([r1, r2], current.p, current.q);
    els.intP1.classList.toggle('right', ok); els.intP1.classList.toggle('wrong', !ok);
    els.intP2.classList.toggle('right', ok); els.intP2.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ?
      ('Correct — the x-intercepts are ' + current.p + ' and ' + current.q + '.') :
      ('Not quite. The x-intercepts are ' + current.p + ' and ' + current.q + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkBrackets(){
    var parsed = parseBrackets(els.bracketsInput.value);
    var ok = !!parsed && rootsMatch(parsed.roots, current.p, current.q);
    els.bracketsInput.classList.toggle('right', ok); els.bracketsInput.classList.toggle('wrong', !ok);
    var correctStr = bracketsString(current.p, current.q);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr) : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkPoint(){
    var xVal = parseFloat((els.pointX.value || '').trim());
    var yVal = parseFloat((els.pointY.value || '').trim());
    var xOk = !isNaN(xVal) && Math.abs(xVal - 0) < 0.01;
    var yOk = !isNaN(yVal) && Math.abs(yVal - current.yInt) < 0.01;
    els.pointX.classList.toggle('right', xOk); els.pointX.classList.toggle('wrong', !xOk);
    els.pointY.classList.toggle('right', yOk); els.pointY.classList.toggle('wrong', !yOk);
    var ok = xOk && yOk;
    els.feedback.textContent = ok ?
      ('Correct — the point is (0, ' + current.yInt + ').') :
      ('Not quite. The marked point is (0, ' + current.yInt + ').');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkSolveA(){
    var aVal = parseGradient(els.solveAInput.value);
    var ok = !isNaN(aVal) && Math.abs(aVal - current.a) < 0.01;
    els.solveAInput.classList.toggle('right', ok); els.solveAInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — a = ' + current.a + '.') : ('Not quite. a = ' + current.a + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkStep(name){
    if(name === 'intercepts') return checkIntercepts();
    if(name === 'brackets') return checkBrackets();
    if(name === 'point') return checkPoint();
    if(name === 'solvea') return checkSolveA();
    return false;
  }

  // ---- Checking: the final, scored "equation" step -----------------

  // Returns true if this call actually scored an attempt — see the
  // matching note in PracticeLineGraph.checkAnswer.
  function checkEquationStep(){
    if(!current) return false;
    var parsed = parseFactoredEquation(els.eqInput.value);
    if(!parsed){
      els.feedback.textContent = "Write the full equation, starting with y =, e.g. y = -2(x - 3)(x + 1).";
      els.feedback.className = 'feedback incorrect';
      els.eqInput.classList.add('wrong');
      return false;
    }

    var aOk = Math.abs(parsed.a - current.a) < 0.01;
    var rootsOk = rootsMatch(parsed.roots, current.p, current.q);
    var ok = aOk && rootsOk;
    els.eqInput.classList.toggle('right', ok);
    els.eqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var equation = formatEquation(current.a, current.p, current.q);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + equation;
      els.feedback.className = 'feedback correct';
    } else {
      els.feedback.textContent = 'Not quite. ' + equation +
        ' (a = ' + current.a + ', x-intercepts ' + current.p + ' and ' + current.q + ').';
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
    els.svg = document.getElementById('parabola-graph-svg');
    els.modeNote = document.getElementById('parabola-mode-note');
    els.stepPrompt = document.getElementById('parabola-step-prompt');
    els.hint = document.getElementById('parabola-hint');
    els.feedback = document.getElementById('parabola-feedback');
    els.score = document.getElementById('parabola-score');
    els.scoreRow = document.getElementById('parabola-score-row');
    els.checkBtn = document.getElementById('parabola-check-btn');
    els.nextBtn = document.getElementById('parabola-next-btn');
    els.backBtn = document.getElementById('parabola-back-btn');

    els.intP1 = document.getElementById('parabola-int-p1');
    els.intP2 = document.getElementById('parabola-int-p2');
    els.bracketsInput = document.getElementById('parabola-brackets-input');
    els.pointX = document.getElementById('parabola-point-x');
    els.pointY = document.getElementById('parabola-point-y');
    els.solveAInput = document.getElementById('parabola-solvea-input');
    els.eqInput = document.getElementById('parabola-eq-input');

    els.rows = {
      intercepts: document.getElementById('parabola-step-intercepts'),
      brackets: document.getElementById('parabola-step-brackets'),
      point: document.getElementById('parabola-step-point'),
      solvea: document.getElementById('parabola-step-solvea'),
      equation: document.getElementById('parabola-answer-row-typed')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    [els.intP1, els.intP2, els.bracketsInput, els.pointX, els.pointY, els.solveAInput, els.eqInput].forEach(function(input){
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
