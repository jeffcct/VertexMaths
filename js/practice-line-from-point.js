/* ============================================================
   practice-line-from-point.js — the PracticeLineFromPoint
   component: a question generator for "Finding the equation of a
   line (from a gradient and a point)". Gives a gradient m and a
   point (x1, y1) that lies on the line, and walks the student
   through substituting to find c:

   Below 3 questions answered, or under 90% accuracy, a four-step
   scaffold:
     1. write the equation using the gradient, leaving c as a
        literal letter (nothing's solved it yet).
     2. substitute the point in to get a numeric equation for c.
     3. solve that equation for c.
     4. write the full equation — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 4 — same convention as every other
   Practice component's adaptive difficulty (see the note at the top
   of practice-parabola-intercepts.js).

   c always comes out a whole number by construction (every value
   generated is an integer), so unlike most of this site's other
   generators, no step here ever needs a fraction.

   Public API: VM.PracticeLineFromPoint.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeLineFromPoint = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var M_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];
  var C_MIN = -6, C_MAX = 6;
  var X_MIN = -6, X_MAX = 6;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { m, c, x1, y1 }
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
    var x1 = randInt(X_MIN, X_MAX); if(x1 === 0) x1 = 1;
    var y1 = m * x1 + c;

    current = { m: m, c: c, x1: x1, y1: y1 };

    var scaffold = needsScaffold();
    steps = scaffold ? ['form', 'substitute', 'solve', 'final-equation'] : ['final-equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the full equation.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.givenM.textContent = current.m;
    els.givenX.textContent = current.x1;
    els.givenY.textContent = current.y1;
  }

  // ---- Formatting ------------------------------------------------

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }

  function formatFormEquation(m){ return 'y = ' + coeffLabel(m) + 'x + c'; }
  function formatFinalEquation(m, c){ return 'y = ' + coeffLabel(m) + 'x' + signedConst(c); }
  // "y1 = 6 + c" or "y1 = c" when the substituted term is 0 (x1 = 0
  // never happens by generation, but m could still make the product 0
  // only if m were 0, which it never is either — kept simple anyway).
  function formatSubstituted(y1, rhsVal){
    return rhsVal === 0 ? (y1 + ' = c') : (y1 + ' = ' + rhsVal + ' + c');
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

  // "4 = -6 + c" or "4 = c" — the point substituted into the form
  // equation. Also accepts the constant written first, e.g. "c = 4"
  // isn't supported (c is always on the right, as generated), but
  // "-6 + c = 4" is, via parseEitherSide.
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
      case 'form': return n + 'Write the equation using the gradient, leaving c as a letter.';
      case 'substitute': return n + 'Substitute the point into that equation.';
      case 'solve': return n + 'Solve for c.';
      case 'final-equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Write the full equation.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'form': return 'Leave c as the letter c — you haven’t found it yet, e.g. y = 3x + c.';
      case 'substitute': return 'Substitute x = ' + current.x1 + ' and y = ' + current.y1 + ' into ' + formatFormEquation(current.m) + '.';
      case 'solve': return 'Rearrange to get c by itself.';
      case 'final-equation': return 'Write the full equation, starting with y =, e.g. y = 3x - 6. Leave out the coefficient for 1 and use a bare - for -1.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['form', 'substitute', 'solve', 'final-equation'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

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
      form: els.formInput, substitute: els.substituteInput,
      solve: els.solveInput, 'final-equation': els.finalEqInput
    };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: ungraded scaffold steps -----------------------------

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

  function checkSubstitute(){
    var raw = (els.substituteInput.value || '').trim();
    var parsed = parseSubstituted(raw);
    var rhsVal = current.m * current.x1;
    var ok = !!parsed && close(parsed.lhs, current.y1) && close(parsed.rhsVal, rhsVal);
    els.substituteInput.classList.toggle('right', ok); els.substituteInput.classList.toggle('wrong', !ok);
    var correctStr = formatSubstituted(current.y1, rhsVal);
    // On success, echo what was actually typed (the sides may be
    // swapped) rather than the canonical side order — see GitHub
    // issue #17.
    els.feedback.textContent = ok ? ('Correct — ' + raw + '.') : ('Not quite. It should be ' + correctStr + '.');
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
    els.givenM = document.getElementById('point-given-m');
    els.givenX = document.getElementById('point-given-x');
    els.givenY = document.getElementById('point-given-y');
    els.modeNote = document.getElementById('point-mode-note');
    els.stepPrompt = document.getElementById('point-step-prompt');
    els.hint = document.getElementById('point-hint');
    els.feedback = document.getElementById('point-feedback');
    els.score = document.getElementById('point-score');
    els.checkBtn = document.getElementById('point-check-btn');
    els.nextBtn = document.getElementById('point-next-btn');
    els.backBtn = document.getElementById('point-back-btn');
    els.workingCard = document.getElementById('point-working-card');
    els.workingLines = document.getElementById('point-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.formInput = document.getElementById('point-form-input');
    els.substituteInput = document.getElementById('point-substitute-input');
    els.solveInput = document.getElementById('point-solve-input');
    els.finalEqInput = document.getElementById('point-final-eq');

    els.rowsByName = {
      form: document.getElementById('point-step-form'),
      substitute: document.getElementById('point-step-substitute'),
      solve: document.getElementById('point-step-solve'),
      'final-equation': document.getElementById('point-step-final-equation')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.formInput, els.substituteInput, els.solveInput, els.finalEqInput].forEach(function(input){
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
