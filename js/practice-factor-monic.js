/* ============================================================
   practice-factor-monic.js — the PracticeFactorMonic component: a
   question generator for "Factoring monic polynomials". Generates a
   monic trinomial x² + Bx + C built from two integers p and q
   (B = p + q, C = p*q), which factors as (x + p)(x + q), and walks
   the student through it:

   Below 3 questions answered, or under 90% accuracy, a two-step
   scaffold:
     1. find the two numbers that multiply to C and add to B
        (ungraded — must be right to move on).
     2. write the fully factored expression — the only step that's
        scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 2 — same convention as every other
   Practice component's adaptive difficulty (see the note at the top
   of practice-parabola-intercepts.js).

   p and q can repeat (a valid perfect-square trinomial), and the two
   numbers/brackets can always be entered in either order.

   Public API: VM.PracticeFactorMonic.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeFactorMonic = (function(){
  var P_MIN = -9, P_MAX = 9;

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
  function isFinalStep(){ return currentStepName() === 'factored'; }

  // Order-independent pair comparison — same pattern as rootsMatch in
  // practice-parabola-intercepts.js.
  function pairMatch(got, p, q){
    var g = got.slice().sort(function(a, b){ return a - b; });
    var want = [p, q].sort(function(a, b){ return a - b; });
    return Math.abs(g[0] - want[0]) < 0.01 && Math.abs(g[1] - want[1]) < 0.01;
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var p = randNonZero(P_MIN, P_MAX);
    var q = randNonZero(P_MIN, P_MAX);
    var B = p + q, C = p * q;

    current = { p: p, q: q, B: B, C: C };

    var scaffold = needsScaffold();
    steps = scaffold ? ['find-pair', 'factored'] : ['factored'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the factored form.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.expression.textContent = formatExpression(current.B, current.C);
  }

  // ---- Formatting ------------------------------------------------

  function formatExpression(B, C){
    var s = 'x²';
    if(B !== 0) s += (B > 0 ? (' + ' + B) : (' - ' + Math.abs(B))) + 'x';
    if(C !== 0) s += (C > 0 ? (' + ' + C) : (' - ' + Math.abs(C)));
    return s;
  }

  // Renders a single factor like "x + 3" or "x - 3" for a value v —
  // this file's own (x + p) convention, not the root-style
  // (x - root) convention factorLabel in equation-parse.js assumes.
  function factorTerm(v){ return v >= 0 ? ('x + ' + v) : ('x - ' + Math.abs(v)); }
  function bracketsString(p, q){ return '(' + factorTerm(p) + ')(' + factorTerm(q) + ')'; }

  // "(x + 2)(x + 3)" or "(x - 2)(x - 3)" etc. The two captured signed
  // numbers ARE p and q directly — no sign flip needed, since this
  // file's convention is (x + p), not root-style (x - root).
  function parseFactored(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^\(x([+-]\d+(?:\.\d+)?)\)\(x([+-]\d+(?:\.\d+)?)\)$/);
    if(!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2])];
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'find-pair': return n + 'Find two numbers that multiply to ' + current.C + ' and add to ' + current.B + '.';
      case 'factored': return steps.length === 1 ? 'Write the fully factored expression.' : (n + 'Write the fully factored expression.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'find-pair': return 'Think of two numbers with that product and that sum.';
      case 'factored': return 'Write it as (x + p)(x + q), e.g. (x + 2)(x + 3). The order of the two factors doesn\'t matter.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['find-pair', 'factored'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'find-pair') clearInputs([els.pairA, els.pairB]);
    if(name === 'factored') clearInputs([els.factoredInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = { 'find-pair': els.pairA, factored: els.factoredInput };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the ungraded scaffold step --------------------------

  function checkFindPair(){
    var a = parseFloat((els.pairA.value || '').trim());
    var b = parseFloat((els.pairB.value || '').trim());
    var ok = !isNaN(a) && !isNaN(b) && pairMatch([a, b], current.p, current.q);
    els.pairA.classList.toggle('right', ok); els.pairA.classList.toggle('wrong', !ok);
    els.pairB.classList.toggle('right', ok); els.pairB.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ?
      ('Correct — ' + current.p + ' and ' + current.q + '.') :
      ('Not quite. The numbers are ' + current.p + ' and ' + current.q + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(current.p + ', ' + current.q);
    return ok;
  }

  function checkStep(name){
    if(name === 'find-pair') return checkFindPair();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkFactored(){
    if(!current) return false;
    var parsed = parseFactored(els.factoredInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the expression as two brackets, e.g. (x + 2)(x + 3).';
      els.feedback.className = 'feedback incorrect';
      els.factoredInput.classList.add('wrong');
      return false;
    }
    var ok = pairMatch(parsed, current.p, current.q);
    els.factoredInput.classList.toggle('right', ok); els.factoredInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = bracketsString(current.p, current.q);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(correctStr);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + correctStr + '.';
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
        var scored = checkFactored();
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
    els.expression = document.getElementById('monic-expression');
    els.modeNote = document.getElementById('monic-mode-note');
    els.stepPrompt = document.getElementById('monic-step-prompt');
    els.hint = document.getElementById('monic-hint');
    els.feedback = document.getElementById('monic-feedback');
    els.score = document.getElementById('monic-score');
    els.checkBtn = document.getElementById('monic-check-btn');
    els.nextBtn = document.getElementById('monic-next-btn');
    els.backBtn = document.getElementById('monic-back-btn');
    els.workingCard = document.getElementById('monic-working-card');
    els.workingLines = document.getElementById('monic-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.pairA = document.getElementById('monic-pair-a');
    els.pairB = document.getElementById('monic-pair-b');
    els.factoredInput = document.getElementById('monic-factored-input');

    els.rowsByName = {
      'find-pair': document.getElementById('monic-step-find-pair'),
      factored: document.getElementById('monic-step-factored')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.pairA, els.pairB, els.factoredInput].forEach(function(input){
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
