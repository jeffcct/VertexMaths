/* ============================================================
   practice-eqs-exponents.js — the PracticeEqsExponents component: a
   question generator for "Solving equations with exponents".
   Generates an equation a^(x + s) = a^n (shown as a^(x + s) = rhs,
   with rhs = a^n computed out as an integer), and walks the student
   through recognising the right-hand side as a power of the same
   base, then equating exponents to solve for x = n - s.

   Below 3 questions answered, or under 90% accuracy, a two-step
   scaffold:
     1. rewrite the right-hand side as a power of the base
        (ungraded — must be right to move on).
     2. solve for x — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 2 — same convention as every other
   Practice component's adaptive difficulty (see the note at the top
   of practice-parabola-intercepts.js).

   Public API: VM.PracticeEqsExponents.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeEqsExponents = (function(){
  var BASES = [2, 3, 5];
  var SHIFTS = [-4, -3, -2, -1, 1, 2, 3, 4];
  var N_MIN = 1, N_MAX = 6;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { a, s, n, rhs, x }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(list){ return list[randInt(0, list.length - 1)]; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'solve-x'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var a = pick(BASES);
    var s = pick(SHIFTS);
    var n = randInt(N_MIN, N_MAX);
    var rhs = Math.pow(a, n);
    var x = n - s;

    current = { a: a, s: s, n: n, rhs: rhs, x: x };

    var scaffold = needsScaffold();
    steps = scaffold ? ['rewrite', 'solve-x'] : ['solve-x'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just solve for x.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.equation.textContent = formatEquation(current.a, current.s, current.rhs);
  }

  // ---- Formatting ------------------------------------------------

  function formatShift(s){ return s >= 0 ? (' + ' + s) : (' - ' + Math.abs(s)); }

  function formatEquation(a, s, rhs){
    return a + '^(x' + formatShift(s) + ') = ' + rhs;
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'rewrite': return n + 'Write ' + current.rhs + ' as ' + current.a + ' to what power?';
      case 'solve-x': return steps.length === 1 ? 'Solve for x.' : (n + 'Solve for x.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'rewrite': return 'Try small powers of the base one at a time: a¹, a², a³, and so on, until you match the number.';
      case 'solve-x': return 'Since the bases now match, the exponents must be equal — set up and solve that equation.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['rewrite', 'solve-x'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'rewrite') clearInputs([els.rewriteInput]);
    if(name === 'solve-x') clearInputs([els.solveInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = { rewrite: els.rewriteInput, 'solve-x': els.solveInput };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the ungraded scaffold step --------------------------

  function checkRewrite(){
    var got = parseFloat((els.rewriteInput.value || '').trim());
    var ok = !isNaN(got) && Math.abs(got - current.n) < 0.01;
    els.rewriteInput.classList.toggle('right', ok); els.rewriteInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ?
      ('Correct — ' + current.rhs + ' = ' + current.a + '^' + current.n + '.') :
      ('Not quite. ' + current.rhs + ' = ' + current.a + '^' + current.n + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(current.rhs + ' = ' + current.a + '^' + current.n);
    return ok;
  }

  function checkStep(name){
    if(name === 'rewrite') return checkRewrite();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkSolveX(){
    if(!current) return false;
    var got = parseFloat((els.solveInput.value || '').trim());
    var ok = !isNaN(got) && Math.abs(got - current.x) < 0.01;
    els.solveInput.classList.toggle('right', ok); els.solveInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — x = ' + current.x + '.';
      els.feedback.className = 'feedback correct';
      working.push('x = ' + current.x);
    } else {
      els.feedback.textContent = 'Not quite. x = ' + current.x + '.';
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
        var scored = checkSolveX();
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
    els.equation = document.getElementById('eqexp-equation');
    els.modeNote = document.getElementById('eqexp-mode-note');
    els.stepPrompt = document.getElementById('eqexp-step-prompt');
    els.hint = document.getElementById('eqexp-hint');
    els.feedback = document.getElementById('eqexp-feedback');
    els.score = document.getElementById('eqexp-score');
    els.checkBtn = document.getElementById('eqexp-check-btn');
    els.nextBtn = document.getElementById('eqexp-next-btn');
    els.backBtn = document.getElementById('eqexp-back-btn');
    els.workingCard = document.getElementById('eqexp-working-card');
    els.workingLines = document.getElementById('eqexp-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.rewriteInput = document.getElementById('eqexp-rewrite-input');
    els.solveInput = document.getElementById('eqexp-solve-input');

    els.rowsByName = {
      rewrite: document.getElementById('eqexp-step-rewrite'),
      'solve-x': document.getElementById('eqexp-step-solve-x')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.rewriteInput, els.solveInput].forEach(function(input){
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
