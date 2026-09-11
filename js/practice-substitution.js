/* ============================================================
   practice-substitution.js — the PracticeSubstitution component: a
   question generator for "Substitution", the foundational skill of
   plugging a given numeric value into an algebraic expression and
   evaluating it. Depends on nothing but simp-expr, and is itself a
   prerequisite for several later topics (see js/data.js), so it's
   deliberately the simplest generator in the codebase: one directly
   scored question at a time, no adaptive scaffold tiers.

   Each question is one of two equally likely kinds:
     - single: an expression in one variable, ax + b, with a given
       value of x.
     - double: an expression in two variables, ax + by, with given
       values of both x and y.

   Both the coefficient(s) of x (and y, for the double kind) are
   always nonzero — a zero coefficient wouldn't be a substitution
   question at all. The constant term in the single-variable kind can
   be zero (an expression like "3x" on its own is a perfectly normal
   substitution question).

   Public API: VM.PracticeSubstitution.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeSubstitution = (function(){
  var SINGLE_COEFF_MIN = -9, SINGLE_COEFF_MAX = 9;
  var SINGLE_CONST_MIN = -9, SINGLE_CONST_MAX = 9;
  var SINGLE_X_MIN = -6, SINGLE_X_MAX = 6;

  var DOUBLE_COEFF_MIN = -6, DOUBLE_COEFF_MAX = 6;
  var DOUBLE_VAL_MIN = -6, DOUBLE_VAL_MAX = 6;

  var els = {};
  var current = null;    // { kind, A, B, x, [y], result }
  var score = { correct: 0, attempted: 0 };
  var answered = false;  // has the current question been checked yet?
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var kind = Math.random() < 0.5 ? 'single' : 'double';

    if(kind === 'single'){
      var A = randNonZero(SINGLE_COEFF_MIN, SINGLE_COEFF_MAX);
      var B = randInt(SINGLE_CONST_MIN, SINGLE_CONST_MAX);
      var x = randInt(SINGLE_X_MIN, SINGLE_X_MAX);
      current = { kind: 'single', A: A, B: B, x: x, result: A * x + B };
    } else {
      var Ad = randNonZero(DOUBLE_COEFF_MIN, DOUBLE_COEFF_MAX);
      var Bd = randNonZero(DOUBLE_COEFF_MIN, DOUBLE_COEFF_MAX);
      var xd = randInt(DOUBLE_VAL_MIN, DOUBLE_VAL_MAX);
      var yd = randInt(DOUBLE_VAL_MIN, DOUBLE_VAL_MAX);
      current = { kind: 'double', A: Ad, B: Bd, x: xd, y: yd, result: Ad * xd + Bd * yd };
    }

    answered = false;
    working.reset();
    renderGiven();
    renderQuestion();
  }

  function renderGiven(){
    els.expression.textContent = exprString(current);
    els.given.textContent = givenString(current);
  }

  // ---- Formatting ------------------------------------------------

  // coefficient of a variable: 1/-1 shown as blank/"-", any other
  // value shown in full — the same shorthand a written expression
  // uses, same convention as the other generators in this codebase.
  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  function constTail(c){
    if(c === 0) return '';
    return c > 0 ? (' + ' + c) : (' - ' + Math.abs(c));
  }

  // " + by" / " - by" — a non-leading term, so the sign is always
  // shown explicitly and the coefficient's magnitude is bare (never
  // a leading "-" the way coeffLabel's does).
  function termTail(coeff, varName){
    var mag = Math.abs(coeff) === 1 ? '' : String(Math.abs(coeff));
    return (coeff >= 0 ? ' + ' : ' - ') + mag + varName;
  }

  function exprString(cur){
    if(cur.kind === 'single') return coeffLabel(cur.A) + 'x' + constTail(cur.B);
    return coeffLabel(cur.A) + 'x' + termTail(cur.B, 'y');
  }

  function givenString(cur){
    return cur.kind === 'single' ? ('x = ' + cur.x) : ('x = ' + cur.x + ', y = ' + cur.y);
  }

  // "3(4)" / "-(4)" — the leading term with its value substituted in.
  function subLead(coeff, val){ return coeffLabel(coeff) + '(' + val + ')'; }

  // " + 3(4)" / " - 3(4)" — a non-leading term with its value
  // substituted in.
  function subTail(coeff, val){
    var mag = Math.abs(coeff) === 1 ? '' : String(Math.abs(coeff));
    return (coeff >= 0 ? ' + ' : ' - ') + mag + '(' + val + ')';
  }

  // The fully-substituted expression, before it's evaluated —
  // e.g. "3(4) + 2" or "2(4) - 3(-1)". Used in the "shown work" line
  // once a question's been answered correctly.
  function substitutionString(cur){
    if(cur.kind === 'single') return subLead(cur.A, cur.x) + constTail(cur.B);
    return subLead(cur.A, cur.x) + subTail(cur.B, cur.y);
  }

  // ---- Question rendering ------------------------------------------

  function renderQuestion(){
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.hint.textContent = current.kind === 'single' ?
      'Replace x with its given value, then work out the result — e.g. for 2x - 1 when x = 3, that’s 2(3) - 1 = 5.' :
      'Replace each letter with its given value, then work out the result — e.g. for 2x + 3y when x = 3 and y = -1, that’s 2(3) + 3(-1) = 3.';
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.focus();
  }

  // ---- Checking -----------------------------------------------------

  function checkAnswer(){
    if(!current) return;
    var got = parseFloat((els.answerInput.value || '').trim());
    var ok = !isNaN(got) && Math.abs(got - current.result) < 0.01;
    els.answerInput.classList.toggle('right', ok);
    els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var workedLine = exprString(current) + ' = ' + substitutionString(current) + ' = ' + current.result;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + workedLine + '.';
      els.feedback.className = 'feedback correct';
    } else {
      els.feedback.textContent = 'Not quite. ' + workedLine + '.';
      els.feedback.className = 'feedback incorrect';
    }
    working.push(workedLine);
    els.score.textContent = score.correct + ' / ' + score.attempted;
  }

  // ---- Check/Next button ------------------------------------------

  function handleCheckOrAdvance(){
    if(!answered){
      checkAnswer();
      answered = true;
      els.checkBtn.textContent = 'Next question';
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.expression = document.getElementById('subst-expression');
    els.given = document.getElementById('subst-given');
    els.hint = document.getElementById('subst-hint');
    els.feedback = document.getElementById('subst-feedback');
    els.score = document.getElementById('subst-score');
    els.checkBtn = document.getElementById('subst-check-btn');
    els.nextBtn = document.getElementById('subst-next-btn');
    els.backBtn = document.getElementById('subst-back-btn');
    els.answerInput = document.getElementById('subst-answer-input');
    els.workingCard = document.getElementById('subst-working-card');
    els.workingLines = document.getElementById('subst-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.answerInput.addEventListener('keydown', function(e){
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
