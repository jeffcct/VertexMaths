/* ============================================================
   practice-line-from-two-points.js — the PracticeLineFromTwoPoints
   component: a question generator for "Finding the equation of a
   line (from two points)". Gives two points that lie on the line,
   and walks the student through finding the gradient first, then
   substituting to find c — the same substitute-and-solve tail as
   practice-line-from-point.js, with a gradient step in front of it:

   Below 3 questions answered, or under 90% accuracy, a five-step
   scaffold:
     1. find the gradient from the two points (rise over run).
     2. write the equation using that gradient, leaving c as a
        literal letter.
     3. substitute either point in to get a numeric equation for c —
        either point works, so both are accepted (see checkSubstitute).
     4. solve that equation for c.
     5. write the full equation — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 5 — same convention as every other
   Practice component's adaptive difficulty (see the note at the top
   of practice-parabola-intercepts.js).

   The two points are always generated so the gradient works out to a
   whole number (the run is chosen first, then the second x is offset
   by it), and c always comes out whole too, so no step here ever
   needs a fraction.

   Public API: VM.PracticeLineFromTwoPoints.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeLineFromTwoPoints = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var M_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];
  var C_MIN = -6, C_MAX = 6;
  var X1_MIN = -6, X1_MAX = 6;
  var RUN_VALUES = [-3, -2, -1, 1, 2, 3];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { m, c, x1, y1, x2, y2 }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function close(a, b){ return Math.abs(a - b) < 0.01; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'final-equation'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var m = randChoice(M_VALUES);
    var c = randInt(C_MIN, C_MAX);
    var x1 = randInt(X1_MIN, X1_MAX);
    var run = randChoice(RUN_VALUES);
    var x2 = x1 + run;
    var y1 = m * x1 + c;
    var y2 = m * x2 + c;

    current = { m: m, c: c, x1: x1, y1: y1, x2: x2, y2: y2 };

    var scaffold = needsScaffold();
    steps = scaffold ? ['gradient', 'form', 'substitute', 'solve', 'final-equation'] : ['final-equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the full equation.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.givenX1.textContent = current.x1;
    els.givenY1.textContent = current.y1;
    els.givenX2.textContent = current.x2;
    els.givenY2.textContent = current.y2;
  }

  // ---- Formatting ------------------------------------------------

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }

  function formatFormEquation(m){ return 'y = ' + coeffLabel(m) + 'x + c'; }
  function formatFinalEquation(m, c){ return 'y = ' + coeffLabel(m) + 'x' + signedConst(c); }
  function formatSubstituted(y, rhsVal){
    return rhsVal === 0 ? (y + ' = c') : (y + ' = ' + rhsVal + ' + c');
  }

  // "y = 3x + c" — the gradient substituted, c left as the letter.
  function parseFormEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^y=([+-]?\d*)x\+c$/);
    if(!m) return null;
    var mVal = parseGradient(m[1]);
    if(isNaN(mVal)) return null;
    return { m: mVal };
  }

  // "4 = -6 + c" or "4 = c" — a point substituted into the form
  // equation. Also accepts the constant written first via
  // parseEitherSide.
  function parseSubstituted(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var m = s.match(/^([+-]?\d+(?:\.\d+)?)=([+-]?\d+(?:\.\d+)?)?\+?c$/);
      if(!m) return null;
      var lhs = parseFloat(m[1]);
      if(isNaN(lhs)) return null;
      var rhsVal = (m[2] !== undefined && m[2] !== '') ? parseFloat(m[2]) : 0;
      return { lhs: lhs, rhsVal: rhsVal };
    });
  }

  // "y = 3x - 6" — the full equation.
  function parseFinalEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var xIdx = s.indexOf('x');
    if(xIdx === -1) return null;
    var m = parseGradient(s.slice(0, xIdx));
    if(isNaN(m)) return null;
    var rest = s.slice(xIdx + 1);
    var c = rest === '' ? 0 : parseFloat(rest.replace(/^\+/, ''));
    if(isNaN(c)) return null;
    return { m: m, c: c };
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'gradient': return n + 'Find the gradient from the two points.';
      case 'form': return n + 'Write the equation using that gradient, leaving c as a letter.';
      case 'substitute': return n + 'Substitute either point into that equation.';
      case 'solve': return n + 'Solve for c.';
      case 'final-equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Write the full equation.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'gradient':
        return 'Gradient = (y2 - y1) / (x2 - x1) = (' + current.y2 + ' - ' + current.y1 + ') / (' + current.x2 + ' - ' + current.x1 + ').';
      case 'form': return 'Leave c as the letter c — you haven’t found it yet, e.g. y = 3x + c.';
      case 'substitute':
        return 'Substitute either (' + current.x1 + ', ' + current.y1 + ') or (' + current.x2 + ', ' + current.y2 + ') into ' + formatFormEquation(current.m) + '.';
      case 'solve': return 'Rearrange to get c by itself.';
      case 'final-equation': return 'Write the full equation, starting with y =, e.g. y = 3x - 6. Leave out the coefficient for 1 and use a bare - for -1.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['gradient', 'form', 'substitute', 'solve', 'final-equation'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'gradient') clearInputs([els.gradientInput]);
    if(name === 'form') clearInputs([els.formInput]);
    if(name === 'substitute') clearInputs([els.substituteInput]);
    if(name === 'solve') clearInputs([els.solveInput]);
    if(name === 'final-equation') clearInputs([els.finalEqInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = {
      gradient: els.gradientInput, form: els.formInput,
      substitute: els.substituteInput, solve: els.solveInput,
      'final-equation': els.finalEqInput
    };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: ungraded scaffold steps -----------------------------

  function checkGradient(){
    var v = parseGradient(els.gradientInput.value);
    var ok = !isNaN(v) && close(v, current.m);
    els.gradientInput.classList.toggle('right', ok); els.gradientInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — gradient = ' + current.m + '.') : ('Not quite. The gradient is ' + current.m + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('gradient = ' + current.m);
    return ok;
  }

  function checkForm(){
    var parsed = parseFormEquation(els.formInput.value);
    var ok = !!parsed && close(parsed.m, current.m);
    els.formInput.classList.toggle('right', ok); els.formInput.classList.toggle('wrong', !ok);
    var correctStr = formatFormEquation(current.m);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  // Either point is always valid to substitute — this accepts a match
  // against either one, the same "accept either" treatment given to
  // simultaneous equations' choice of equation to rearrange.
  function checkSubstitute(){
    var raw = (els.substituteInput.value || '').trim();
    var parsed = parseSubstituted(raw);
    var rhs1 = current.m * current.x1, rhs2 = current.m * current.x2;
    var matches1 = !!parsed && close(parsed.lhs, current.y1) && close(parsed.rhsVal, rhs1);
    var matches2 = !!parsed && close(parsed.lhs, current.y2) && close(parsed.rhsVal, rhs2);
    var ok = matches1 || matches2;
    els.substituteInput.classList.toggle('right', ok); els.substituteInput.classList.toggle('wrong', !ok);
    var correct1 = formatSubstituted(current.y1, rhs1), correct2 = formatSubstituted(current.y2, rhs2);
    if(ok){
      // Echo what was actually typed (either point is valid to
      // substitute) rather than always re-deriving one of the two
      // canonical forms — see GitHub issue #17.
      els.feedback.textContent = 'Correct — ' + raw + '.';
    } else {
      els.feedback.textContent = 'Not quite. From (' + current.x1 + ', ' + current.y1 + ') that’s ' + correct1 +
        '; from (' + current.x2 + ', ' + current.y2 + '), ' + correct2 + '.';
    }
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(raw);
    return ok;
  }

  function checkSolve(){
    var v = parseFraction(els.solveInput.value);
    var ok = !isNaN(v) && close(v, current.c);
    els.solveInput.classList.toggle('right', ok); els.solveInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — c = ' + current.c + '.') : ('Not quite. c = ' + current.c + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('c = ' + current.c);
    return ok;
  }

  function checkStep(name){
    if(name === 'gradient') return checkGradient();
    if(name === 'form') return checkForm();
    if(name === 'substitute') return checkSubstitute();
    if(name === 'solve') return checkSolve();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkFinalEquation(){
    if(!current) return false;
    var parsed = parseFinalEquation(els.finalEqInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the full equation, starting with y =, e.g. y = 3x - 6.';
      els.feedback.className = 'feedback incorrect';
      els.finalEqInput.classList.add('wrong');
      return false;
    }
    var ok = close(parsed.m, current.m) && close(parsed.c, current.c);
    els.finalEqInput.classList.toggle('right', ok); els.finalEqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatFinalEquation(current.m, current.c);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(correctStr);
    } else {
      els.feedback.textContent = 'Not quite. ' + correctStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Continue/Next button --------------------------------

  function handleCheckOrAdvance(){
    var name = currentStepName();
    if(isFinalStep()){
      if(!answered){
        var scored = checkFinalEquation();
        if(scored){ answered = true; els.checkBtn.textContent = 'Next question'; }
      } else {
        nextQuestion();
      }
      return;
    }
    if(!stepAnswered){
      var ok = checkStep(name);
      if(ok){ stepAnswered = true; els.checkBtn.textContent = 'Continue'; }
    } else {
      advanceStep();
    }
  }

  function init(opts){
    opts = opts || {};
    els.givenX1 = document.getElementById('twopoint-given-x1');
    els.givenY1 = document.getElementById('twopoint-given-y1');
    els.givenX2 = document.getElementById('twopoint-given-x2');
    els.givenY2 = document.getElementById('twopoint-given-y2');
    els.modeNote = document.getElementById('twopoint-mode-note');
    els.stepPrompt = document.getElementById('twopoint-step-prompt');
    els.hint = document.getElementById('twopoint-hint');
    els.feedback = document.getElementById('twopoint-feedback');
    els.score = document.getElementById('twopoint-score');
    els.checkBtn = document.getElementById('twopoint-check-btn');
    els.nextBtn = document.getElementById('twopoint-next-btn');
    els.backBtn = document.getElementById('twopoint-back-btn');
    els.workingCard = document.getElementById('twopoint-working-card');
    els.workingLines = document.getElementById('twopoint-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.gradientInput = document.getElementById('twopoint-gradient-input');
    els.formInput = document.getElementById('twopoint-form-input');
    els.substituteInput = document.getElementById('twopoint-substitute-input');
    els.solveInput = document.getElementById('twopoint-solve-input');
    els.finalEqInput = document.getElementById('twopoint-final-eq');

    els.rowsByName = {
      gradient: document.getElementById('twopoint-step-gradient'),
      form: document.getElementById('twopoint-step-form'),
      substitute: document.getElementById('twopoint-step-substitute'),
      solve: document.getElementById('twopoint-step-solve'),
      'final-equation': document.getElementById('twopoint-step-final-equation')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.gradientInput, els.formInput, els.substituteInput, els.solveInput, els.finalEqInput].forEach(function(input){
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
