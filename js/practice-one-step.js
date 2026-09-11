/* ============================================================
   practice-one-step.js — the PracticeOneStep component: a question
   generator for "Solving one-step equations" — a foundational,
   zero-prerequisite review skill. Unlike the more elaborate
   multi-step generators elsewhere in this codebase, there is no
   adaptive scaffold here: every question is a single directly-scored
   step, with a hint always available.

   Each question is one of three one-step equation kinds, picked at
   random, always with an integer solution:

     1. Addition/subtraction — x + b = c or x - b = c, solved by
        doing the opposite operation to both sides.
     2. Multiplication — ax = c, solved by dividing both sides by a.
     3. Division — x/a = c, solved by multiplying both sides by a.

   Public API: VM.PracticeOneStep.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeOneStep = (function(){
  var KINDS = ['linear', 'mul', 'div'];

  // Addition/subtraction: x +/- b = c
  var LIN_B_MIN = 1, LIN_B_MAX = 12;
  var LIN_C_MIN = -12, LIN_C_MAX = 12;

  // Multiplication: ax = c, x = c / a
  var MUL_A_MIN = 2, MUL_A_MAX = 9;
  var MUL_X_MIN = -10, MUL_X_MAX = 10;

  // Division: x/a = c, x = a * c
  var DIV_A_MIN = 2, DIV_A_MAX = 9;
  var DIV_C_MIN = -10, DIV_C_MAX = 10;

  var els = {};
  var current = null;    // { kind, ...operands, x }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }
  function pick(list){ return list[randInt(0, list.length - 1)]; }

  // ---- Question generation -----------------------------------------

  function generateLinear(){
    var op = Math.random() < 0.5 ? '+' : '-';
    var b = randInt(LIN_B_MIN, LIN_B_MAX);
    var c = randInt(LIN_C_MIN, LIN_C_MAX);
    var x = op === '+' ? (c - b) : (c + b);
    return { kind: 'linear', op: op, b: b, c: c, x: x };
  }

  function generateMul(){
    var a = randNonZero(MUL_A_MIN, MUL_A_MAX) * (Math.random() < 0.5 ? -1 : 1);
    var x = randNonZero(MUL_X_MIN, MUL_X_MAX);
    var c = a * x;
    return { kind: 'mul', a: a, c: c, x: x };
  }

  function generateDiv(){
    var a = randInt(DIV_A_MIN, DIV_A_MAX);
    var c = randInt(DIV_C_MIN, DIV_C_MAX);
    var x = a * c;
    return { kind: 'div', a: a, c: c, x: x };
  }

  function nextQuestion(){
    var kind = pick(KINDS);
    current = kind === 'linear' ? generateLinear() : (kind === 'mul' ? generateMul() : generateDiv());
    answered = false;
    working.reset();

    els.hint.textContent = questionHint(current.kind);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.answerInput.focus();

    renderGiven();
  }

  // ---- Formatting ------------------------------------------------

  // coefficient of x: 1/-1 shown as blank/"-", any other value shown
  // in full — the same shorthand a written expression uses.
  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  function formatEquation(q){
    switch(q.kind){
      case 'linear': return 'x ' + q.op + ' ' + q.b + ' = ' + q.c;
      case 'mul': return coeffLabel(q.a) + 'x = ' + q.c;
      case 'div': return 'x/' + q.a + ' = ' + q.c;
    }
  }

  function renderGiven(){
    els.equation.textContent = formatEquation(current);
  }

  // ---- Hints -------------------------------------------------------
  //
  // Each hint describes the general inverse-operation method and
  // illustrates it with a small fixed worked example distinct from
  // the current question — the example's numbers never depend on the
  // current question, so it can never be reconstructed into this
  // question's own expected answer.

  function questionHint(kind){
    switch(kind){
      case 'linear': return 'Do the opposite operation to both sides to get x on its own — e.g. x + 3 = 8 → x = 8 - 3 = 5, or x - 4 = 6 → x = 6 + 4 = 10.';
      case 'mul': return 'Divide both sides by the coefficient of x — e.g. 3x = 12 → x = 12 ÷ 3 = 4.';
      case 'div': return 'Multiply both sides by the number x is divided by — e.g. x/2 = 5 → x = 5 × 2 = 10.';
    }
  }

  // ---- Checking ------------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var got = parseFloat((els.answerInput.value || '').trim());
    var ok = !isNaN(got) && Math.abs(got - current.x) < 0.01;
    els.answerInput.classList.toggle('right', ok); els.answerInput.classList.toggle('wrong', !ok);

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

  // ---- Check/Next button --------------------------------------------

  function handleCheckOrAdvance(){
    if(!answered){
      var scored = checkAnswer();
      if(scored){ answered = true; els.checkBtn.textContent = 'Next question'; }
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.equation = document.getElementById('onestep-equation');
    els.hint = document.getElementById('onestep-hint');
    els.feedback = document.getElementById('onestep-feedback');
    els.score = document.getElementById('onestep-score');
    els.checkBtn = document.getElementById('onestep-check-btn');
    els.nextBtn = document.getElementById('onestep-next-btn');
    els.backBtn = document.getElementById('onestep-back-btn');
    els.workingCard = document.getElementById('onestep-working-card');
    els.workingLines = document.getElementById('onestep-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.answerInput = document.getElementById('onestep-answer-input');

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
