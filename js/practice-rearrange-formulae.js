/* ============================================================
   practice-rearrange-formulae.js — the PracticeRearrangeFormulae
   component: a question generator for "Rearranging formulae". Unlike
   this site's line-equation generators, which always use x and y,
   this one is generic algebra: it picks two DIFFERENT single-letter
   variables P and Q at random each question, shows a formula
   P = coeff*Q + constant relating them, and asks the student to make
   Q the subject.

   coeff is always drawn from a pool that excludes 0 and ±1, so
   rearranging always divides by something other than ±1 — the
   answer's Q-coefficient side (1/coeff) is therefore always a
   genuine fraction, never a whole number. That's the point of this
   skill, so there's no "easy" version of the final step the way
   c always came out whole in practice-line-from-point.js.

   Below 3 questions answered, or under 90% accuracy, a two-step
   scaffold:
     1. isolate — move the constant term to the other side, leaving
        coeff*Q alone on one side (ungraded).
     2. rearranged — divide through by coeff to make Q the subject
        (the only step that's scored).
   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 2 — same adaptive-difficulty
   convention as every other Practice component.

   The rearranged answer is checked by numeric value, not exact
   string, so an unreduced fraction (e.g. 2/6 for an expected 1/3) is
   accepted — and it accepts either of two natural ways to write the
   Q-coefficient term, since its numerator is always ±1:
     "1/3P" / "-1/3P"   (coefficient-first, matching this site's
                         fraction style elsewhere — see formatRHS)
     "P/3"  / "-P/3"    (variable-first, the more common textbook way
                         to write a unit fraction times a letter)

   Public API: VM.PracticeRearrangeFormulae.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeRearrangeFormulae = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var LETTER_POOL = ['a', 'b', 'p', 'q', 'v', 'u', 'r', 's', 't', 'w'];
  var COEFF_VALUES = [-4, -3, -2, 2, 3, 4];   // never 0 or ±1 — the answer always needs a fraction
  var CONST_MIN = -9, CONST_MAX = 9;          // can be 0

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var NUM_PATTERN = '\\d+(?:\\.\\d+)?';
  var FRAC_PATTERN = NUM_PATTERN + '(?:/' + NUM_PATTERN + ')?';

  var els = {};
  var current = null;    // { P, Q, coeff, constant, coeffNum, coeffDen, constNum, constDen }
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
  function gcd(a, b){
    a = Math.abs(a); b = Math.abs(b);
    while(b){ var t = b; b = a % b; a = t; }
    return a || 1;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'rearranged'; }

  // Two distinct letters from the pool, so the same pair (or order)
  // doesn't always come up — this is what keeps the exercise reading
  // as generic formula work rather than another line-equation drill.
  function pickLetters(){
    var pool = LETTER_POOL.slice();
    var i = randInt(0, pool.length - 1);
    var P = pool[i];
    pool.splice(i, 1);
    var Q = pool[randInt(0, pool.length - 1)];
    return { P: P, Q: Q };
  }

  // Q = (P - constant) / coeff = (1/coeff)P + (-constant/coeff).
  // The P-coefficient's numerator is always exactly ±1 (coeff is
  // never ±1 itself), so it never reduces further than its sign —
  // only the constant term ever needs a real gcd reduction.
  function computeRearranged(coeff, constant){
    var coeffNum = 1, coeffDen = coeff;
    if(coeffDen < 0){ coeffNum = -coeffNum; coeffDen = -coeffDen; }

    var constNum = -constant, constDen = coeff;
    if(constDen < 0){ constNum = -constNum; constDen = -constDen; }
    var g = gcd(constNum, constDen);
    constNum /= g; constDen /= g;

    return { coeffNum: coeffNum, coeffDen: coeffDen, constNum: constNum, constDen: constDen };
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var letters = pickLetters();
    var coeff = randChoice(COEFF_VALUES);
    var constant = randInt(CONST_MIN, CONST_MAX);
    var r = computeRearranged(coeff, constant);

    current = {
      P: letters.P, Q: letters.Q, coeff: coeff, constant: constant,
      coeffNum: r.coeffNum, coeffDen: r.coeffDen, constNum: r.constNum, constDen: r.constDen
    };

    var scaffold = needsScaffold();
    steps = scaffold ? ['isolate', 'rearranged'] : ['rearranged'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — go straight to making " + current.Q + " the subject.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.given.textContent = formatGiven();
  }

  // ---- Formatting ------------------------------------------------

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }

  // "v = 3u + 4" or "v = -2u - 5" — the given formula.
  function formatGiven(){
    return current.P + ' = ' + coeffLabel(current.coeff) + current.Q + signedConst(current.constant);
  }

  // "v - 4 = 3u" or "v + 5 = -2u" — the constant moved to the other
  // side (coeff is never ±1, so the right-hand coefficient always
  // shows as a plain number).
  function formatIsolate(){
    var left = current.P + (current.constant === 0 ? '' :
      (current.constant > 0 ? (' - ' + current.constant) : (' + ' + Math.abs(current.constant))));
    return left + ' = ' + coeffLabel(current.coeff) + current.Q;
  }

  // Rational-number formatting for the rearranged answer — same
  // approach as practice-simultaneous.js's rearrange step: coefficient
  // of 1 omitted, -1 shown as a bare "-", a zero constant term left
  // out entirely, fractions written num/den.
  function formatRational(num, den){
    return den === 1 ? String(num) : (num + '/' + den);
  }
  function formatCoeffLabel(num, den){
    if(den === 1){
      if(num === 1) return '';
      if(num === -1) return '-';
    }
    return formatRational(num, den);
  }
  function formatRHS(coeffNum, coeffDen, varName, constNum, constDen){
    var s = formatCoeffLabel(coeffNum, coeffDen) + varName;
    if(constNum !== 0){
      s += (constNum > 0 ? ' + ' : ' - ') + formatRational(Math.abs(constNum), constDen);
    }
    return s;
  }
  // "u = 1/3v - 4/3" — the canonical rearranged form shown in
  // feedback and pushed to the working trail.
  function formatRearranged(){
    return current.Q + ' = ' + formatRHS(current.coeffNum, current.coeffDen, current.P, current.constNum, current.constDen);
  }

  // "v-4=3u" — the constant moved across, using the actual letters
  // for this question. Built dynamically per question since the
  // letters change. Also accepts the sides swapped, e.g. "3u=v-4".
  function parseIsolate(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var re = new RegExp('^' + current.P + '([+-]\\d+)?=([+-]?\\d*)' + current.Q + '$');
      var m = s.match(re);
      if(!m) return null;
      var leftConst = m[1] ? parseInt(m[1], 10) : 0;
      var coeffVal = parseGradient(m[2]);
      if(isNaN(coeffVal)) return null;
      return { leftConst: leftConst, coeffVal: coeffVal };
    });
  }

  // The Q-term of the rearranged RHS, in either of two equivalent
  // written forms (its numerator is always ±1, so both are valid):
  //   "1/3v" / "-1/3v"  — coefficient-first (tryStyleA)
  //   "v/3"  / "-v/3"   — variable-first (tryStyleB)
  // plus an optional signed constant fraction tacked on the end.
  function tryStyleA(rhs){
    var re = new RegExp('^([+-]?' + FRAC_PATTERN + ')' + current.P + '([+-]' + FRAC_PATTERN + ')?$');
    var m = rhs.match(re);
    if(!m) return null;
    var coeffVal = parseFraction(m[1]);
    var constVal = m[2] ? parseFraction(m[2]) : 0;
    if(isNaN(coeffVal) || isNaN(constVal)) return null;
    return { coeffVal: coeffVal, constVal: constVal };
  }
  function tryStyleB(rhs){
    var re = new RegExp('^([+-]?)' + current.P + '(?:/(' + NUM_PATTERN + '))?([+-]' + FRAC_PATTERN + ')?$');
    var m = rhs.match(re);
    if(!m) return null;
    var den = m[2] ? parseFloat(m[2]) : 1;
    if(!den) return null;
    var coeffVal = (m[1] === '-' ? -1 : 1) / den;
    var constVal = m[3] ? parseFraction(m[3]) : 0;
    if(isNaN(constVal)) return null;
    return { coeffVal: coeffVal, constVal: constVal };
  }

  // "u=1/3v-4/3" or "u=v/3-4/3" — the full rearranged equation. Also
  // accepts the sides swapped.
  function parseRearranged(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var prefix = current.Q + '=';
      if(s.slice(0, prefix.length) !== prefix) return null;
      var rhs = s.slice(prefix.length);
      return tryStyleA(rhs) || tryStyleB(rhs);
    });
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'isolate': return n + 'Move the constant term to the other side.';
      case 'rearranged': return steps.length === 1 ?
        ('Make ' + current.Q + ' the subject.') : (n + 'Make ' + current.Q + ' the subject.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'isolate':
        return 'Add or subtract the constant term on both sides so that only the term with ' + current.Q + ' is left on one side.';
      case 'rearranged':
        return 'Divide every term on the right-hand side by the coefficient of ' + current.Q +
          '. Since that coefficient isn’t 1, the ' + current.P + '-term and the constant will both become fractions — ' +
          'e.g. if m = 2n + 6, then n = m/2 - 3.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    ['isolate', 'rearranged'].forEach(function(n){ els.rowsByName[n].hidden = (n !== name); });

    if(name === 'isolate'){
      clearInputs([els.isolateInput]);
      els.isolateInput.placeholder = 'e.g. ' + current.P + ' - 4 = 3' + current.Q;
    }
    if(name === 'rearranged'){
      clearInputs([els.answerInput]);
      els.answerInput.placeholder = 'e.g. ' + current.Q + ' = ' + current.P + '/5 - 2/5';
    }

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = { isolate: els.isolateInput, rearranged: els.answerInput };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the ungraded scaffold step --------------------------

  function checkIsolate(){
    var parsed = parseIsolate(els.isolateInput.value);
    var ok = !!parsed && close(parsed.leftConst, -current.constant) && close(parsed.coeffVal, current.coeff);
    els.isolateInput.classList.toggle('right', ok); els.isolateInput.classList.toggle('wrong', !ok);
    var correctStr = formatIsolate();
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  function checkStep(name){
    if(name === 'isolate') return checkIsolate();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkRearranged(){
    if(!current) return false;
    var parsed = parseRearranged(els.answerInput.value);
    var expectedCoeff = current.coeffNum / current.coeffDen;
    var expectedConst = current.constNum / current.constDen;
    var ok = !!parsed && close(parsed.coeffVal, expectedCoeff) && close(parsed.constVal, expectedConst);
    els.answerInput.classList.toggle('right', ok); els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatRearranged();
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
        var scored = checkRearranged();
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
    els.given = document.getElementById('formula-given');
    els.modeNote = document.getElementById('formula-mode-note');
    els.stepPrompt = document.getElementById('formula-step-prompt');
    els.hint = document.getElementById('formula-hint');
    els.feedback = document.getElementById('formula-feedback');
    els.score = document.getElementById('formula-score');
    els.checkBtn = document.getElementById('formula-check-btn');
    els.nextBtn = document.getElementById('formula-next-btn');
    els.backBtn = document.getElementById('formula-back-btn');
    els.workingCard = document.getElementById('formula-working-card');
    els.workingLines = document.getElementById('formula-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.isolateInput = document.getElementById('formula-isolate-input');
    els.answerInput = document.getElementById('formula-answer-input');

    els.rowsByName = {
      isolate: document.getElementById('formula-step-isolate'),
      rearranged: document.getElementById('formula-step-rearranged')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.isolateInput, els.answerInput].forEach(function(input){
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
