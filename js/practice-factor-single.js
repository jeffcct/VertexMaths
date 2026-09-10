/* ============================================================
   practice-factor-single.js — the PracticeFactorSingle component: a
   question generator for "Factoring single brackets" — the reverse of
   expanding a single bracket (a(bx + c) = abx + ac) and the
   foundational skill before monic-trinomial factoring. Generates an
   expression ABx + AC from three nonzero integers A (the greatest
   common factor), B and C (coprime, so A really is the *greatest*
   common factor of A*B and A*C), and walks the student through
   pulling A back out:

   Below 3 questions answered, or under 90% accuracy, a two-step
   scaffold:
     1. find the greatest common factor of the two terms' coefficients
        (ungraded — must be right to move on).
     2. write the fully factored expression — the only step that's
        scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 2 — same convention as every other
   Practice component's adaptive difficulty (see the note at the top
   of practice-parabola-intercepts.js).

   Unlike the monic/non-monic factoring generators, there's only one
   bracket and only one correct factorization here — no order
   ambiguity to account for.

   Public API: VM.PracticeFactorSingle.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeFactorSingle = (function(){
  var A_MIN = 2, A_MAX = 9;
  var BC_MIN = -9, BC_MAX = 9;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { A, B, C, AB, AC }
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
  function gcd(a, b){
    a = Math.abs(a); b = Math.abs(b);
    while(b){ var t = b; b = a % b; a = t; }
    return a;
  }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'factored'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var A = randInt(A_MIN, A_MAX);
    var B, C;
    do {
      B = randNonZero(BC_MIN, BC_MAX);
      C = randNonZero(BC_MIN, BC_MAX);
    } while(gcd(B, C) !== 1);

    var AB = A * B, AC = A * C;
    current = { A: A, B: B, C: C, AB: AB, AC: AC };

    var scaffold = needsScaffold();
    steps = scaffold ? ['find-gcf', 'factored'] : ['factored'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the factored form.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.expression.textContent = formatExpression(current.AB, current.AC);
  }

  // ---- Formatting ------------------------------------------------

  // coefficient of x: 1/-1 shown as blank/"-", any other value shown
  // in full — the same shorthand a written expression uses.
  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  function formatExpression(AB, AC){
    var s = coeffLabel(AB) + 'x';
    if(AC !== 0) s += (AC > 0 ? (' + ' + AC) : (' - ' + Math.abs(AC)));
    return s;
  }

  // "3(2x + 5)" or "6(-x + 2)" etc.
  function bracketString(A, B, C){
    return A + '(' + coeffLabel(B) + 'x' + (C >= 0 ? (' + ' + C) : (' - ' + Math.abs(C))) + ')';
  }

  // Parses "3(2x+5)" / "6(-x+2)" / "6(x-4)" — a blank inner
  // coefficient means 1, same blank-means-1 convention as
  // VM.EquationParse.parseGradient.
  function parseFactored(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^(\d+)\(([+-]?\d*)x([+-]\d+)\)$/);
    if(!m) return null;
    var gcf = parseInt(m[1], 10);
    var bStr = m[2];
    var b = (bStr === '' || bStr === '+') ? 1 : (bStr === '-' ? -1 : parseInt(bStr, 10));
    var c = parseInt(m[3], 10);
    return { gcf: gcf, b: b, c: c };
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'find-gcf': return n + 'Find the greatest common factor of ' + current.AB + ' and ' + current.AC + '.';
      case 'factored': return steps.length === 1 ? 'Write the fully factored expression.' : (n + 'Write the fully factored expression.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'find-gcf': return 'List the factors of each number and find the largest one they share.';
      case 'factored': return 'Write it as a(bx + c), e.g. 3(2x + 5) — pull the greatest common factor outside a single bracket.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['find-gcf', 'factored'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'find-gcf') clearInputs([els.gcfInput]);
    if(name === 'factored') clearInputs([els.factoredInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = { 'find-gcf': els.gcfInput, factored: els.factoredInput };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the ungraded scaffold step --------------------------

  function checkFindGcf(){
    var v = parseFloat((els.gcfInput.value || '').trim());
    var ok = !isNaN(v) && Math.abs(v - current.A) < 0.01;
    els.gcfInput.classList.toggle('right', ok); els.gcfInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ?
      ('Correct — the greatest common factor is ' + current.A + '.') :
      ('Not quite. The greatest common factor is ' + current.A + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('GCF = ' + current.A);
    return ok;
  }

  function checkStep(name){
    if(name === 'find-gcf') return checkFindGcf();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkFactored(){
    if(!current) return false;
    var parsed = parseFactored(els.factoredInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the expression as a(bx + c), e.g. 3(2x + 5).';
      els.feedback.className = 'feedback incorrect';
      els.factoredInput.classList.add('wrong');
      return false;
    }

    var ok = parsed.gcf === current.A && parsed.b === current.B && parsed.c === current.C;
    els.factoredInput.classList.toggle('right', ok); els.factoredInput.classList.toggle('wrong', !ok);

    var correctStr = bracketString(current.A, current.B, current.C);
    score.attempted++;
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
    els.expression = document.getElementById('singlefac-expression');
    els.modeNote = document.getElementById('singlefac-mode-note');
    els.stepPrompt = document.getElementById('singlefac-step-prompt');
    els.hint = document.getElementById('singlefac-hint');
    els.feedback = document.getElementById('singlefac-feedback');
    els.score = document.getElementById('singlefac-score');
    els.checkBtn = document.getElementById('singlefac-check-btn');
    els.nextBtn = document.getElementById('singlefac-next-btn');
    els.backBtn = document.getElementById('singlefac-back-btn');
    els.workingCard = document.getElementById('singlefac-working-card');
    els.workingLines = document.getElementById('singlefac-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.gcfInput = document.getElementById('singlefac-gcf-input');
    els.factoredInput = document.getElementById('singlefac-factored-input');

    els.rowsByName = {
      'find-gcf': document.getElementById('singlefac-step-find-gcf'),
      factored: document.getElementById('singlefac-step-factored')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.gcfInput, els.factoredInput].forEach(function(input){
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
