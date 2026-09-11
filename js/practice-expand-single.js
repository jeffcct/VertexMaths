/* ============================================================
   practice-expand-single.js — the PracticeExpandSingle component: a
   question generator for "Expanding single brackets" — the reverse
   of factoring a single bracket (see practice-factor-single.js) and
   a foundational review skill that only depends on simplifying
   expressions. Generates A(Bx + C) from three nonzero integers A
   (the outer coefficient), B (the bracket's x-coefficient) and C
   (the bracket's constant), and asks the student to distribute A
   across the bracket to get ABx + AC.

   Unlike the multi-step adaptive generators elsewhere in this
   codebase (including practice-factor-single.js, its mirror image),
   this one has NO scaffold tiers: every question is a single
   directly-scored step — show A(Bx + C), take the expanded answer,
   check it.

   A is generated with magnitude 2-9 (never 1 or -1) so distributing
   it is never a visual no-op, and with a random sign. B and C are
   each nonzero integers from -9 to 9, so the bracket's x-coefficient
   can itself be 1 or -1 (shown blank/"-", the same coefficient-of-1
   convention used throughout this file and practice-factor-single.js's
   coeffLabel). Because A's magnitude is always >= 2 and B, C are
   always nonzero, the product AB is never 0, +-1, so there's no
   sign or degenerate-coefficient ambiguity to resolve when checking
   the expanded answer (unlike practice-factor-single.js's GCF-sign
   convention, which had to decide which factor carries a negative
   sign to keep the bracket's fully-factored form unambiguous — see
   that file's header comment). Here there is exactly one correct
   expanded expression, computed directly as A*B and A*C.

   Public API: VM.PracticeExpandSingle.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExpandSingle = (function(){
  var A_MIN = 2, A_MAX = 9;
  var BC_MIN = -9, BC_MAX = 9;

  // The hint below always uses this exact worked example — keep the
  // generated question from ever landing on the same (A, B, C), so
  // the hint's example can never be read as this question's own
  // answer (see the hint-safety rule in CLAUDE.md).
  var HINT_EXAMPLE = { A: 3, B: 2, C: 5 };

  var els = {};
  var current = null;    // { A, B, C, AB, AC }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }
  function randSignedMagnitude(lo, hi){
    var mag = randInt(lo, hi);
    return Math.random() < 0.5 ? mag : -mag;
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var A, B, C;
    do {
      A = randSignedMagnitude(A_MIN, A_MAX);
      B = randNonZero(BC_MIN, BC_MAX);
      C = randNonZero(BC_MIN, BC_MAX);
    } while(A === HINT_EXAMPLE.A && B === HINT_EXAMPLE.B && C === HINT_EXAMPLE.C);

    current = { A: A, B: B, C: C, AB: A * B, AC: A * C };

    answered = false;
    working.reset();

    els.expression.textContent = bracketString(A, B, C);
    els.hint.textContent = 'Multiply the term outside the bracket by each term inside — e.g. ' +
      bracketString(HINT_EXAMPLE.A, HINT_EXAMPLE.B, HINT_EXAMPLE.C) + ' = ' +
      formatExpanded(HINT_EXAMPLE.A * HINT_EXAMPLE.B, HINT_EXAMPLE.A * HINT_EXAMPLE.C) + '.';
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.focus();
  }

  // ---- Formatting ------------------------------------------------

  // coefficient of x: 1/-1 shown as blank/"-", any other value shown
  // in full — the same shorthand a written expression uses (see
  // coeffLabel in practice-factor-single.js).
  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  // "3(2x + 5)" or "-6(x - 4)" etc. — A is always shown in full here
  // (it's generated with magnitude >= 2, so it never hits the
  // coefficient-of-1 shorthand), but coeffLabel is applied to it too
  // for consistency with the rest of the codebase's formatting.
  function bracketString(A, B, C){
    return coeffLabel(A) + '(' + coeffLabel(B) + 'x' + (C >= 0 ? (' + ' + C) : (' - ' + Math.abs(C))) + ')';
  }

  function formatExpanded(AB, AC){
    var s = coeffLabel(AB) + 'x';
    s += (AC >= 0 ? (' + ' + AC) : (' - ' + Math.abs(AC)));
    return s;
  }

  // Parses "6x + 15" / "-6x - 8" / "x - 4" / "-x + 4" — a blank
  // coefficient means 1, same blank-means-1 convention as
  // bracketString above and practice-factor-single.js's
  // parseFactored (whose inner "bx + c" shape this mirrors exactly,
  // just without the outer a(...) wrapper).
  function parseExpanded(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^([+-]?\d*)x([+-]\d+)$/);
    if(!m) return null;
    var coeffStr = m[1];
    var coeff = (coeffStr === '' || coeffStr === '+') ? 1 : (coeffStr === '-' ? -1 : parseInt(coeffStr, 10));
    var constVal = parseInt(m[2], 10);
    return { coeff: coeff, constVal: constVal };
  }

  // ---- Checking the (only, scored) step ------------------------------

  function checkAnswer(){
    if(!current) return false;
    var parsed = parseExpanded(els.answerInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the expression as ax + b, e.g. 6x + 15.';
      els.feedback.className = 'feedback incorrect';
      els.answerInput.classList.add('wrong');
      return false;
    }

    var ok = parsed.coeff === current.AB && parsed.constVal === current.AC;
    var correctStr = formatExpanded(current.AB, current.AC);
    els.answerInput.classList.toggle('right', ok); els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + bracketString(current.A, current.B, current.C) + ' = ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(bracketString(current.A, current.B, current.C) + ' = ' + correctStr);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + correctStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Next button -------------------------------------------

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
    els.expression = document.getElementById('expandsingle-expression');
    els.hint = document.getElementById('expandsingle-hint');
    els.answerInput = document.getElementById('expandsingle-answer-input');
    els.feedback = document.getElementById('expandsingle-feedback');
    els.score = document.getElementById('expandsingle-score');
    els.checkBtn = document.getElementById('expandsingle-check-btn');
    els.nextBtn = document.getElementById('expandsingle-next-btn');
    els.backBtn = document.getElementById('expandsingle-back-btn');
    els.workingCard = document.getElementById('expandsingle-working-card');
    els.workingLines = document.getElementById('expandsingle-working-lines');
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
