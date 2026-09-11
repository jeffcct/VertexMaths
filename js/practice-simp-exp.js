/* ============================================================
   practice-simp-exp.js — the PracticeSimpExp component: a question
   generator for "Simplifying exponents" — the foundational exponent
   rules (product, quotient, power-of-a-power) on a single variable
   base with coefficient 1, kept deliberately scoped to pure exponent
   arithmetic rather than coefficient arithmetic.

   Unlike the multi-step adaptive generators elsewhere in this
   codebase, this one has NO scaffold tiers: every question is a
   single directly-scored step — pick a random exponent-rule kind,
   show the expression, and check the simplified result.

   Each question picks one of three kinds at random:
     1. product:  x^a × x^b   -> x^(a+b)
     2. quotient: x^a ÷ x^b   -> x^(a-b)   (a > b, so the result stays
                                            a positive power)
     3. power:    (x^a)^b     -> x^(a*b)

   Exponents beyond 2 are displayed with Unicode superscript digits
   (superscript/powerString below); an exponent of 1 is shown as a
   bare "x", matching this codebase's exponent-of-1-omitted
   convention (see coeffLabel in practice-factor-single.js for the
   analogous coefficient-of-1 convention).

   Typed answers accept both the superscript-character form (e.g.
   "x⁷") and caret notation for any exponent (e.g. "x^7") — there's no
   ordinary way to type a superscript digit on a standard keyboard, so
   a student typing their own answer naturally reaches for caret
   notation instead. This generalises the exact "x^2" fix in
   practice-factor-nonmonic.js's parseExpanded to any exponent (see
   GitHub issue #12).

   Public API: VM.PracticeSimpExp.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeSimpExp = (function(){
  var SUP_DIGITS = ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];

  // Fixed example pools for hints — several distinct outcomes per
  // kind so a hint's own worked example can always avoid landing on
  // the current question's actual numbers (see the hint-safety rule
  // in CLAUDE.md: a hint must never be constructible into the
  // current question's own expected-answer string).
  var PRODUCT_EXAMPLES = [[2,3],[2,4],[3,4],[3,5],[4,5]];      // sums 5,6,7,8,9
  var QUOTIENT_EXAMPLES = [[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2]]; // diffs 1..7
  var POWER_EXAMPLES = [[2,2],[2,3],[3,2],[2,4],[3,3]];        // products 4,6,6,8,9

  var els = {};
  var current = null;    // { kind, a, b, resultExp, prompt, hint }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(list){ return list[randInt(0, list.length - 1)]; }

  // ---- Superscript / power-string formatting -------------------------

  function superscript(n){
    return String(n).split('').map(function(ch){ return SUP_DIGITS[parseInt(ch, 10)]; }).join('');
  }

  // "x" + a superscript exponent — or just "x" when n===1, matching
  // this codebase's exponent-of-1-omitted convention.
  function powerString(base, n){
    return n === 1 ? base : (base + superscript(n));
  }

  // ---- Question generation -----------------------------------------

  function genProduct(){
    var a, b;
    do { a = randInt(1, 5); b = randInt(1, 5); } while(a + b > 9);
    return { a: a, b: b, resultExp: a + b };
  }

  function genQuotient(){
    var b = randInt(1, 3);
    var resultExp = randInt(1, 6);
    return { a: b + resultExp, b: b, resultExp: resultExp };
  }

  function genPower(){
    var a, b;
    do { a = randInt(1, 4); b = randInt(2, 3); } while(a * b > 9);
    return { a: a, b: b, resultExp: a * b };
  }

  function questionPrompt(kind, a, b){
    switch(kind){
      case 'product':  return powerString('x', a) + ' × ' + powerString('x', b);
      case 'quotient': return powerString('x', a) + ' ÷ ' + powerString('x', b);
      case 'power':    return '(' + powerString('x', a) + ')' + superscript(b);
    }
  }

  // Picks a hint example from `pool` whose outcome (as computed by
  // `outcomeOf`) differs from the current question's actual result —
  // so the hint's worked example can never be read as this
  // question's own answer.
  function pickHintExample(pool, outcomeOf, avoidOutcome){
    var candidates = pool.filter(function(ex){ return outcomeOf(ex) !== avoidOutcome; });
    return pick(candidates.length ? candidates : pool);
  }

  function questionHint(kind, resultExp){
    switch(kind){
      case 'product': {
        var pe = pickHintExample(PRODUCT_EXAMPLES, function(ex){ return ex[0] + ex[1]; }, resultExp);
        return 'When multiplying powers of the same base, add the exponents — e.g. ' +
          powerString('x', pe[0]) + ' × ' + powerString('x', pe[1]) + ' = ' + powerString('x', pe[0] + pe[1]) + '.';
      }
      case 'quotient': {
        var qe = pickHintExample(QUOTIENT_EXAMPLES, function(ex){ return ex[0] - ex[1]; }, resultExp);
        return 'When dividing powers of the same base, subtract the exponents — e.g. ' +
          powerString('x', qe[0]) + ' ÷ ' + powerString('x', qe[1]) + ' = ' + powerString('x', qe[0] - qe[1]) + '.';
      }
      case 'power': {
        var we = pickHintExample(POWER_EXAMPLES, function(ex){ return ex[0] * ex[1]; }, resultExp);
        return 'When raising a power to a power, multiply the exponents — e.g. (' +
          powerString('x', we[0]) + ')' + superscript(we[1]) + ' = ' + powerString('x', we[0] * we[1]) + '.';
      }
    }
  }

  function nextQuestion(){
    var kind = pick(['product', 'quotient', 'power']);
    var gen = kind === 'product' ? genProduct() : (kind === 'quotient' ? genQuotient() : genPower());

    current = {
      kind: kind,
      a: gen.a,
      b: gen.b,
      resultExp: gen.resultExp,
      prompt: questionPrompt(kind, gen.a, gen.b)
    };

    answered = false;
    working.reset();

    els.expression.textContent = current.prompt;
    els.hint.textContent = questionHint(kind, current.resultExp);
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.focus();
  }

  // ---- Parsing a typed answer -----------------------------------

  // Normalises "x^7" (or any "x^<digits>") to the superscript form
  // "x⁷" before matching, generalising the "x^2" fix in
  // practice-factor-nonmonic.js's parseExpanded to any exponent —
  // there's no ordinary way to type a superscript digit, so a student
  // typing their own answer naturally reaches for caret notation.
  function normalizeAnswer(raw){
    return (raw || '').trim().toLowerCase().replace(/\s+/g, '')
      .replace(/x\^(\d+)/g, function(_, d){ return 'x' + superscript(parseInt(d, 10)); });
  }

  function isCorrectAnswer(raw, resultExp){
    var s = normalizeAnswer(raw);
    if(s === powerString('x', resultExp)) return true;
    // An exponent of 1 displays as a bare "x", but a student typing
    // "x^1" or "x¹" out in full is still stating the same answer.
    if(resultExp === 1 && s === 'x¹') return true;
    return false;
  }

  // ---- Checking the (only, scored) step ------------------------------

  function checkAnswer(){
    if(!current) return false;
    var ok = isCorrectAnswer(els.answerInput.value, current.resultExp);
    els.answerInput.classList.toggle('right', ok); els.answerInput.classList.toggle('wrong', !ok);

    var correctStr = powerString('x', current.resultExp);
    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + current.prompt + ' = ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(current.prompt + ' = ' + correctStr);
    } else {
      els.feedback.textContent = 'Not quite. ' + current.prompt + ' = ' + correctStr + '.';
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
    els.expression = document.getElementById('simpexp-expression');
    els.hint = document.getElementById('simpexp-hint');
    els.answerInput = document.getElementById('simpexp-answer-input');
    els.feedback = document.getElementById('simpexp-feedback');
    els.score = document.getElementById('simpexp-score');
    els.checkBtn = document.getElementById('simpexp-check-btn');
    els.nextBtn = document.getElementById('simpexp-next-btn');
    els.backBtn = document.getElementById('simpexp-back-btn');
    els.workingCard = document.getElementById('simpexp-working-card');
    els.workingLines = document.getElementById('simpexp-working-lines');
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
