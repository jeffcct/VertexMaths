/* ============================================================
   practice-multi-step.js — the PracticeMultiStep component: a
   question generator for "Solving multi-step equations" — equations
   that take more than one arithmetic step to solve, with the
   variable on one side only (equations with x on both sides are a
   separate, not-yet-built topic). Unlike most other Practice
   components in this codebase, there's no adaptive scaffold here:
   "multi-step" describes the equation's solving process (more than
   one arithmetic step), not this component's UI, so every question
   is a single directly-scored step with a helpful hint alongside it.

   Each question is one of two kinds, picked at random:
     - 'twostep':      ax + b = c        (undo +/- b, then divide by a)
     - 'distributive':  a(x + b) = c
                    or   a(x - b) = c    (divide by a first, or expand
                                          the bracket first — either
                                          method is valid)

   Both kinds are built backwards from a chosen integer solution x0,
   so the arithmetic always comes out clean and x is always a whole
   number.

   Public API: VM.PracticeMultiStep.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeMultiStep = (function(){
  // twostep: ax + b = c
  var TWOSTEP_A_MIN = 2, TWOSTEP_A_MAX = 9;   // magnitude of a; sign is random
  var TWOSTEP_B_MIN = -12, TWOSTEP_B_MAX = 12;

  // distributive: a(x + b) = c  or  a(x - b) = c
  var DIST_A_MIN = 2, DIST_A_MAX = 9;
  var DIST_B_MIN = 1, DIST_B_MAX = 9;

  var X0_MIN = -10, X0_MAX = 10; // the chosen integer solution, never 0

  var els = {};
  var current = null;    // { kind, a, b, c, x } — b/sign meaning depends on kind
  var score = { correct: 0, attempted: 0 };
  var answered = false;  // has the current question already been checked?
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }
  function randSign(){ return Math.random() < 0.5 ? 1 : -1; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var kind = Math.random() < 0.5 ? 'twostep' : 'distributive';
    var x0 = randNonZero(X0_MIN, X0_MAX);

    if(kind === 'twostep'){
      var a = randSign() * randInt(TWOSTEP_A_MIN, TWOSTEP_A_MAX);
      var b = randInt(TWOSTEP_B_MIN, TWOSTEP_B_MAX);
      var c = a * x0 + b;
      current = { kind: kind, a: a, b: b, c: c, x: x0 };
    } else {
      var da = randInt(DIST_A_MIN, DIST_A_MAX);
      var db = randInt(DIST_B_MIN, DIST_B_MAX);
      var sign = randSign();
      var dc = da * (x0 + sign * db);
      current = { kind: kind, a: da, b: db, sign: sign, c: dc, x: x0 };
    }

    answered = false;
    working.reset();
    renderGiven();
    resetInputs();
  }

  // ---- Formatting ------------------------------------------------

  // coefficient of x: 1/-1 shown as blank/"-", any other value shown
  // in full — same shorthand used elsewhere in this codebase (see
  // practice-factor-single.js). a's magnitude is always 2-9 here, so
  // this never actually collapses, but keeps the same convention.
  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  function signedTerm(v){ return v >= 0 ? (' + ' + v) : (' - ' + Math.abs(v)); }

  function formatEquation(q){
    if(q.kind === 'twostep'){
      return coeffLabel(q.a) + 'x' + signedTerm(q.b) + ' = ' + q.c;
    }
    var inner = 'x' + (q.sign >= 0 ? (' + ' + q.b) : (' - ' + q.b));
    return q.a + '(' + inner + ') = ' + q.c;
  }

  function hintFor(kind){
    if(kind === 'twostep'){
      return 'Undo addition/subtraction first, then undo multiplication/division — e.g. 2x + 3 = 11 → 2x = 8 → x = 4.';
    }
    return 'You can expand the bracket first, or divide both sides by the outside number first — e.g. 3(x + 2) = 15 → x + 2 = 5 → x = 3.';
  }

  function renderGiven(){
    els.equation.textContent = formatEquation(current);
    els.hint.textContent = hintFor(current.kind);
  }

  function resetInputs(){
    els.input.value = '';
    els.input.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.input.focus();
  }

  // ---- Checking: the single, directly-scored step --------------------

  function checkAnswer(){
    if(!current) return false;
    var val = parseFloat((els.input.value || '').trim());
    var ok = !isNaN(val) && Math.abs(val - current.x) < 0.01;
    els.input.classList.toggle('right', ok);
    els.input.classList.toggle('wrong', !ok);

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

  // ---- Check/Next button --------------------------------

  function handleCheckOrAdvance(){
    if(!answered){
      var scored = checkAnswer();
      if(scored){
        answered = true;
        els.checkBtn.textContent = 'Next question';
      }
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.equation = document.getElementById('multistep-equation');
    els.hint = document.getElementById('multistep-hint');
    els.feedback = document.getElementById('multistep-feedback');
    els.score = document.getElementById('multistep-score');
    els.checkBtn = document.getElementById('multistep-check-btn');
    els.nextBtn = document.getElementById('multistep-next-btn');
    els.backBtn = document.getElementById('multistep-back-btn');
    els.workingCard = document.getElementById('multistep-working-card');
    els.workingLines = document.getElementById('multistep-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.input = document.getElementById('multistep-input');

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
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
