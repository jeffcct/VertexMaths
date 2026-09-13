/* ============================================================
   practice-x-both-sides.js — the PracticeXBothSides component: a
   question generator for "Solving equations with x on both sides" —
   the direct sequel to practice-multi-step.js, now with the variable
   appearing on both sides. As with multi-step, there's no adaptive
   scaffold here: this is a foundational review skill, so every
   question is a single directly-scored step with a helpful hint
   alongside it.

   Each question is:
     ax + b = cx + d   (a ≠ c, so a unique solution always exists)

   Built backwards from a chosen integer solution x0: a, c and b are
   picked freely (a and c small nonzero integers, resampled until
   different; b a small integer), then d is computed so the equation
   is consistent: d = a*x0 + b - c*x0. This guarantees x always comes
   out a whole number.

   Public API: VM.PracticeXBothSides.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeXBothSides = (function(){
  var COEFF_MIN = 1, COEFF_MAX = 9;   // magnitude of a/c; sign is random
  var CONST_MIN = -12, CONST_MAX = 12; // range for b (d is derived)

  var X0_MIN = -10, X0_MAX = 10; // the chosen integer solution, never 0

  var els = {};
  var current = null;    // { a, b, c, d, x }
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
  function randCoeff(){ return randSign() * randInt(COEFF_MIN, COEFF_MAX); }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var x0 = randNonZero(X0_MIN, X0_MAX);

    var a = randCoeff();
    var c;
    do { c = randCoeff(); } while(c === a);

    var b = randInt(CONST_MIN, CONST_MAX);
    var d = a * x0 + b - c * x0;

    current = { a: a, b: b, c: c, d: d, x: x0 };

    answered = false;
    working.reset();
    renderGiven();
    resetInputs();
  }

  // ---- Formatting ------------------------------------------------

  // coefficient of x: 1/-1 shown as blank/"-", any other value shown
  // in full — same shorthand used elsewhere in this codebase (see
  // practice-multi-step.js). Coefficient magnitude here is 1-9, so
  // this can actually collapse to blank/"-".
  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  function signedTerm(v){ return v >= 0 ? (' + ' + v) : (' - ' + Math.abs(v)); }

  function formatEquation(q){
    return coeffLabel(q.a) + 'x' + signedTerm(q.b) + ' = ' + coeffLabel(q.c) + 'x' + signedTerm(q.d);
  }

  function hintFor(){
    return 'Move all the x-terms to one side and the numbers to the other — e.g. 3x + 2 = x + 8 → 2x = 6 → x = 3.';
  }

  function renderGiven(){
    els.equation.textContent = formatEquation(current);
    els.hint.textContent = hintFor();
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
    els.equation = document.getElementById('xbothsides-equation');
    els.hint = document.getElementById('xbothsides-hint');
    els.feedback = document.getElementById('xbothsides-feedback');
    els.score = document.getElementById('xbothsides-score');
    els.checkBtn = document.getElementById('xbothsides-check-btn');
    els.nextBtn = document.getElementById('xbothsides-next-btn');
    els.backBtn = document.getElementById('xbothsides-back-btn');
    els.workingCard = document.getElementById('xbothsides-working-card');
    els.workingLines = document.getElementById('xbothsides-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.input = document.getElementById('xbothsides-input');

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
