/* ============================================================
   practice-simp-expr.js — the PracticeSimpExpr component: a question
   generator for "Simplifying expressions with addition and
   multiplication" — a foundational, zero-prerequisite review skill.
   Unlike the adaptive multi-step generators elsewhere in this
   codebase, this one has no scaffold tiers: every question is a
   single directly-scored step with a helpful hint.

   Each question is one of two kinds, picked at random:

   1. "combine" — 3-4 terms in a single variable (x) mixed with plain
      constants, e.g. "4x + 7 - 2x + 3", simplified by collecting like
      terms into Ax + B form. If the x-terms cancel to 0, the answer
      is just the constant B; if the constants cancel to 0, the
      answer is just Ax. Generation retries until at least one of A/B
      is nonzero, so the fully-degenerate "everything cancels to 0"
      case never comes up.

   2. "product" — two terms with different single-letter variables,
      e.g. "3a x 4b", simplified by multiplying the coefficients and
      the letters together, e.g. "12ab". Deliberately avoids
      same-variable products (3x x 2x) since that introduces an
      exponent — a different topic (simp-exp), out of scope here.

   Public API: VM.PracticeSimpExpr.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeSimpExpr = (function(){
  var COMBINE_MIN_TERMS = 3, COMBINE_MAX_TERMS = 4;
  var TERM_MIN = -9, TERM_MAX = 9;
  var PRODUCT_MIN_MAG = 2, PRODUCT_MAX_MAG = 9;
  var VAR_POOL = ['a', 'b', 'p', 'q', 'm', 'n'];

  var els = {};
  var current = null;    // combine: { kind, terms, A, B } / product: { kind, v1, c1, v2, c2, answer }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }
  function randSignedMag(lo, hi){ return (Math.random() < 0.5 ? -1 : 1) * randInt(lo, hi); }
  function pick(list){ return list[randInt(0, list.length - 1)]; }
  function shuffle(list){
    for(var i = list.length - 1; i > 0; i--){
      var j = randInt(0, i);
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  // ---- Question generation -----------------------------------------

  function genCombine(){
    var A, B, terms, totalTerms, xCount, constCount, i;
    do {
      totalTerms = randInt(COMBINE_MIN_TERMS, COMBINE_MAX_TERMS);
      xCount = randInt(1, totalTerms - 1);      // at least one x-term, at least one constant
      constCount = totalTerms - xCount;
      terms = [];
      A = 0; B = 0;
      for(i = 0; i < xCount; i++){
        var c = randNonZero(TERM_MIN, TERM_MAX);
        A += c;
        terms.push({ type: 'x', coeff: c });
      }
      for(i = 0; i < constCount; i++){
        var v = randNonZero(TERM_MIN, TERM_MAX);
        B += v;
        terms.push({ type: 'const', value: v });
      }
    } while(A === 0 && B === 0);   // avoid the fully-degenerate "cancels to 0" case
    shuffle(terms);
    return { kind: 'combine', terms: terms, A: A, B: B };
  }

  function genProduct(){
    var v1 = pick(VAR_POOL);
    var v2;
    do { v2 = pick(VAR_POOL); } while(v2 === v1);
    var c1 = randSignedMag(PRODUCT_MIN_MAG, PRODUCT_MAX_MAG);
    var c2 = randSignedMag(PRODUCT_MIN_MAG, PRODUCT_MAX_MAG);
    return { kind: 'product', v1: v1, c1: c1, v2: v2, c2: c2, answer: c1 * c2 };
  }

  function nextQuestion(){
    current = (Math.random() < 0.5) ? genCombine() : genProduct();
    answered = false;
    working.reset();

    els.expression.textContent = renderGiven(current);
    els.prompt.textContent = questionPrompt(current.kind);
    els.sub.textContent = questionSub(current.kind);
    els.hint.textContent = questionHint(current.kind);
    els.answerInput.placeholder = current.kind === 'combine' ? 'e.g. 3x + 5' : 'e.g. 12ab';
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

  function renderGiven(q){
    if(q.kind === 'combine') return renderCombineTerms(q.terms);
    return q.c1 + q.v1 + ' × ' + q.c2 + q.v2;
  }

  function renderCombineTerms(terms){
    return terms.map(function(term, i){
      if(term.type === 'x'){
        var abs = Math.abs(term.coeff);
        var label = abs === 1 ? '' : String(abs);
        if(i === 0) return (term.coeff < 0 ? '-' : '') + label + 'x';
        return (term.coeff < 0 ? ' - ' : ' + ') + label + 'x';
      }
      var v = term.value;
      if(i === 0) return String(v);
      return (v < 0 ? ' - ' : ' + ') + Math.abs(v);
    }).join('');
  }

  function formatCombineAnswer(A, B){
    if(A === 0) return String(B);
    var s = coeffLabel(A) + 'x';
    if(B !== 0) s += (B > 0 ? (' + ' + B) : (' - ' + Math.abs(B)));
    return s;
  }

  function formatProductAnswer(coeff, v1, v2){
    return String(coeff) + [v1, v2].join('');
  }

  function questionPrompt(kind){
    return kind === 'combine' ? 'Simplify the expression.' : 'Simplify the product.';
  }

  function questionSub(kind){
    return kind === 'combine' ?
      'Collect the like terms — add the x-terms together and the constants together.' :
      'Multiply the coefficients together, then multiply the letters together.';
  }

  function questionHint(kind){
    return kind === 'combine' ?
      'Group the x-terms and the constant terms separately, then add each group. For example, 5x + 3 - 2x simplifies to 3x + 3.' :
      'Multiply the numbers together, then write the two letters side by side. For example, 2a × 3b = 6ab.';
  }

  // ---- Parsing ------------------------------------------------------

  // Accepts "Ax + B", "Ax - B", "Ax" (B = 0) or a bare "B" (A = 0),
  // with the usual blank-means-1/"-"-means--1 shorthand on the
  // x-coefficient (see VM.EquationParse.parseGradient).
  function parseCombineAnswer(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s === '') return null;
    var m = s.match(/^([+-]?\d*)x([+-]\d+)?$/);
    if(m){
      var a = VM.EquationParse.parseGradient(m[1]);
      if(isNaN(a)) return null;
      var b = m[2] ? parseInt(m[2], 10) : 0;
      return { a: a, b: b };
    }
    var m2 = s.match(/^([+-]?\d+)$/);
    if(m2) return { a: 0, b: parseInt(m2[1], 10) };
    return null;
  }

  // Accepts the coefficient followed by the two letters in either
  // order ("12ab" or "12ba") — multiplication doesn't care which
  // letter is written first, so either order counts as correct.
  function parseProductAnswer(raw, v1, v2){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^([+-]?\d+)([a-z]+)$/);
    if(!m) return null;
    var letters = m[2].split('').sort().join('');
    var expected = [v1, v2].sort().join('');
    if(letters !== expected) return null;
    return parseInt(m[1], 10);
  }

  // ---- Checking -------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var ok, correctStr;

    if(current.kind === 'combine'){
      var parsed = parseCombineAnswer(els.answerInput.value);
      if(!parsed){
        els.feedback.textContent = 'Write it in the form Ax + B, e.g. 3x + 5.';
        els.feedback.className = 'feedback incorrect';
        els.answerInput.classList.add('wrong');
        return false;
      }
      ok = parsed.a === current.A && parsed.b === current.B;
      correctStr = formatCombineAnswer(current.A, current.B);
    } else {
      var coeff = parseProductAnswer(els.answerInput.value, current.v1, current.v2);
      if(coeff === null){
        els.feedback.textContent = 'Write it as a number followed by the two letters, e.g. 12ab.';
        els.feedback.className = 'feedback incorrect';
        els.answerInput.classList.add('wrong');
        return false;
      }
      ok = coeff === current.answer;
      correctStr = formatProductAnswer(current.answer, current.v1, current.v2);
    }

    els.answerInput.classList.toggle('right', ok);
    els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(renderGiven(current) + ' = ' + correctStr);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + correctStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Next button --------------------------------

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
    els.expression = document.getElementById('simpexpr-expression');
    els.prompt = document.getElementById('simpexpr-prompt');
    els.sub = document.getElementById('simpexpr-sub');
    els.hint = document.getElementById('simpexpr-hint');
    els.answerInput = document.getElementById('simpexpr-answer-input');
    els.feedback = document.getElementById('simpexpr-feedback');
    els.score = document.getElementById('simpexpr-score');
    els.checkBtn = document.getElementById('simpexpr-check-btn');
    els.nextBtn = document.getElementById('simpexpr-next-btn');
    els.backBtn = document.getElementById('simpexpr-back-btn');
    els.workingCard = document.getElementById('simpexpr-working-card');
    els.workingLines = document.getElementById('simpexpr-working-lines');
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
