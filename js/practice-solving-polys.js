/* ============================================================
   practice-solving-polys.js — the PracticeSolvingPolys component: a
   question generator for "Solving with polynomials". Generates a
   monic quadratic equation x² + Bx + C = 0 built from two integer
   roots p and q (B = -(p + q), C = p*q), which factors as
   (x - p)(x - q) = 0, and walks the student through it:

   Below 3 questions answered, or under 90% accuracy, a two-step
   scaffold:
     1. factorise the left-hand side (ungraded — must be right to
        move on).
     2. use the zero-product property to solve for the two values of
        x — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 2 — same convention as every other
   Practice component's adaptive difficulty (see the note at the top
   of practice-parabola-intercepts.js).

   p and q can repeat (a valid repeated-root equation), and the two
   factors/solutions can always be entered in either order.

   This file uses the ROOT-style (x - root) factor convention (see
   factorLabel in equation-parse.js) — not the (x + p) convention used
   by practice-factor-monic.js — because here the numbers being solved
   for ARE the roots of the equation, not "a pair that multiplies and
   adds" divorced from x.

   Public API: VM.PracticeSolvingPolys.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeSolvingPolys = (function(){
  var P_MIN = -9, P_MAX = 9;
  var factorLabel = VM.EquationParse.factorLabel;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { p, q, B, C }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'solve'; }

  // Order-independent pair comparison — same pattern as rootsMatch in
  // practice-parabola-intercepts.js.
  function rootsMatch(got, p, q){
    var g = got.slice().sort(function(a, b){ return a - b; });
    var want = [p, q].sort(function(a, b){ return a - b; });
    return Math.abs(g[0] - want[0]) < 0.01 && Math.abs(g[1] - want[1]) < 0.01;
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var p = randNonZero(P_MIN, P_MAX);
    var q = randNonZero(P_MIN, P_MAX);
    var B = -(p + q), C = p * q;

    current = { p: p, q: q, B: B, C: C };

    var scaffold = needsScaffold();
    steps = scaffold ? ['factor', 'solve'] : ['solve'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just solve for x.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.equation.textContent = formatEquation(current.B, current.C);
  }

  // ---- Formatting ------------------------------------------------

  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }
  function signedTerm(v, suffix){
    if(v === 0) return '';
    var mag = Math.abs(v) === 1 ? '' : String(Math.abs(v));
    return (v > 0 ? ' + ' : ' - ') + mag + suffix;
  }
  function formatEquation(B, C){ return 'x²' + signedTerm(B, 'x') + signedConst(C) + ' = 0'; }

  function bracketsString(p, q){ return '(' + factorLabel(p) + ')(' + factorLabel(q) + ')'; }

  // "(x - 3)(x + 1)" — just the two factors. The two captured signed
  // numbers are the NEGATION of the roots, since factorLabel(v) is
  // "x - v" for v >= 0 and "x + |v|" for v < 0 — e.g. root p = 3 gives
  // the factor "(x - 3)", which captures "-3", and root = -(-3) = 3.
  function parseBrackets(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^\(x([+-]\d+(?:\.\d+)?)\)\(x([+-]\d+(?:\.\d+)?)\)$/);
    if(!m) return null;
    return [-parseFloat(m[1]), -parseFloat(m[2])];
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'factor': return n + 'Factorise the left-hand side.';
      case 'solve': return steps.length === 1 ? 'Solve for x — there are two solutions.' : (n + 'Solve for x — there are two solutions.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'factor': return 'Find two numbers that multiply to the constant term and add to the middle coefficient, the same way you would for any trinomial.';
      case 'solve': return 'If two things multiply to give zero, at least one of them must be zero — set each bracket equal to zero and solve.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['factor', 'solve'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'factor') clearInputs([els.factorInput]);
    if(name === 'solve') clearInputs([els.solveX1, els.solveX2]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = { factor: els.factorInput, solve: els.solveX1 };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the ungraded scaffold step --------------------------

  function checkFactor(){
    var parsed = parseBrackets(els.factorInput.value);
    var ok = !!parsed && rootsMatch(parsed, current.p, current.q);
    els.factorInput.classList.toggle('right', ok); els.factorInput.classList.toggle('wrong', !ok);
    var correctStr = bracketsString(current.p, current.q);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + ' = 0.') : ('Not quite. It should be ' + correctStr + ' = 0.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr + ' = 0');
    return ok;
  }

  function checkStep(name){
    if(name === 'factor') return checkFactor();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkSolve(){
    if(!current) return false;
    var x1 = parseFloat((els.solveX1.value || '').trim());
    var x2 = parseFloat((els.solveX2.value || '').trim());
    var validNums = !isNaN(x1) && !isNaN(x2);
    var ok = validNums && rootsMatch([x1, x2], current.p, current.q);
    els.solveX1.classList.toggle('right', ok); els.solveX1.classList.toggle('wrong', !ok);
    els.solveX2.classList.toggle('right', ok); els.solveX2.classList.toggle('wrong', !ok);

    score.attempted++;
    var solutionStr = 'x = ' + current.p + ' or x = ' + current.q;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + solutionStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(solutionStr);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + solutionStr + '.';
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
        var scored = checkSolve();
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
    els.equation = document.getElementById('solvepoly-equation');
    els.modeNote = document.getElementById('solvepoly-mode-note');
    els.stepPrompt = document.getElementById('solvepoly-step-prompt');
    els.hint = document.getElementById('solvepoly-hint');
    els.feedback = document.getElementById('solvepoly-feedback');
    els.score = document.getElementById('solvepoly-score');
    els.checkBtn = document.getElementById('solvepoly-check-btn');
    els.nextBtn = document.getElementById('solvepoly-next-btn');
    els.backBtn = document.getElementById('solvepoly-back-btn');
    els.workingCard = document.getElementById('solvepoly-working-card');
    els.workingLines = document.getElementById('solvepoly-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.factorInput = document.getElementById('solvepoly-factor-input');
    els.solveX1 = document.getElementById('solvepoly-solve-x1');
    els.solveX2 = document.getElementById('solvepoly-solve-x2');

    els.rowsByName = {
      factor: document.getElementById('solvepoly-step-factor'),
      solve: document.getElementById('solvepoly-step-solve')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.factorInput, els.solveX1, els.solveX2].forEach(function(input){
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
