/* ============================================================
   practice-expand-double.js — the PracticeExpandDouble component: a
   question generator for "Expanding double brackets" — the reverse
   of practice-factor-nonmonic.js (which starts from the trinomial
   and works backwards to the two binomial factors). Here the
   direction is forwards: start from (mx + p)(nx + q) and multiply it
   out to ax² + bx + c.

   This topic sits one tier BEFORE factor-monic/factor-nonmonic in
   the prerequisite DAG (expand-double's only prereq is
   expand-single), so it's kept approachable: m and n are drawn from
   {1, 2, 3} (m = n = 1 is allowed, giving simple double brackets
   like (x + 2)(x + 3), same as the very first double-bracket
   examples a student sees), and p, q are nonzero integers from -9 to
   9. a = m*n, b = m*q + n*p, c = p*q — computed directly from the
   generated factors, so the expansion is always exact and there's
   nothing to solve for.

   Unlike factor-nonmonic's five-step scaffold, there are only two
   ideas to walk through here — "multiply it out" and "collect like
   terms" — so below 3 questions answered, or under 90% accuracy, a
   two-step adaptive scaffold:
     1. expanded — write the expanded FOUR-term form before
        collecting like terms, e.g. "6x² + 3x + 4x + 2" — ungraded.
        This mirrors factor-nonmonic's own "expanded" step format
        exactly (ax² + N1x + N2x + c), just arrived at by multiplying
        out (FOIL) rather than by splitting the middle term. The two
        middle terms are m*q and n*p (the "outer" and "inner"
        products), and either order is accepted — there's nothing
        that fixes which one gets written first.
     2. collected — write the fully collected ax² + bx + c form — the
        only step that's scored.

   Worked example: expanding (x + 2)(x + 3) gives the expanded form
   x² + 3x + 2x + 6 (outer 1*3, inner 2*1), which collects to
   x² + 5x + 6.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to the collected step — same convention as
   every other Practice component's adaptive difficulty (see the note
   at the top of practice-line-from-point.js).

   Because m and n can each be 1 here (unlike factor-nonmonic, where
   m is always >= 2), a can itself be 1 — so, unlike factor-nonmonic's
   formatExpression (which always writes the leading coefficient in
   full), this file's formatting omits a coefficient of 1 on x², the
   same coefficient-of-1 convention used throughout the codebase
   (coeffLabel / factorTermString / signedXTerm). Because p and q are
   individually nonzero, the two middle terms m*q and n*p are each
   individually nonzero too — but their sum b can land on exactly 0
   (a difference-of-squares case, e.g. (x + 3)(x - 3) = x² - 9), so
   the collected form's formatting and parsing both treat a missing
   bx term as b = 0 rather than requiring one.

   Public API: VM.PracticeExpandDouble.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExpandDouble = (function(){
  var M_VALUES = [1, 2, 3];
  var N_VALUES = [1, 2, 3];
  var PQ_MIN = -9, PQ_MAX = 9;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  // The hints below always use this exact worked example — keep the
  // generated question from ever landing on the same (m, n, p, q), so
  // the hint's example can never be read as this question's own
  // answer (see the hint-safety rule in CLAUDE.md).
  var HINT_EXAMPLE = { m: 1, n: 1, p: 2, q: 3 }; // (x + 2)(x + 3) = x² + 3x + 2x + 6 = x² + 5x + 6

  var els = {};
  var current = null;    // { m, n, p, q, a, b, c, mq, np }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
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
  function isFinalStep(){ return currentStepName() === 'collected'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var m, n, p, q;
    do {
      m = randChoice(M_VALUES);
      n = randChoice(N_VALUES);
      p = randNonZero(PQ_MIN, PQ_MAX);
      q = randNonZero(PQ_MIN, PQ_MAX);
    } while(m === HINT_EXAMPLE.m && n === HINT_EXAMPLE.n && p === HINT_EXAMPLE.p && q === HINT_EXAMPLE.q);

    var a = m * n;
    var mq = m * q, np = n * p;
    var b = mq + np;
    var c = p * q;

    current = { m: m, n: n, p: p, q: q, a: a, b: b, c: c, mq: mq, np: np };

    var scaffold = needsScaffold();
    steps = scaffold ? ['expanded', 'collected'] : ['collected'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the fully expanded and collected form.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.givenExpr.textContent = bracketsString(current.m, current.p, current.n, current.q);
  }

  // ---- Formatting ------------------------------------------------

  // "3x + 2" or "-x - 4" style factor term, e.g. coeff===1 -> "x",
  // coeff===-1 -> "-x" (never generated here since m, n are always
  // positive, but kept general to match the shared convention).
  function factorTermString(coeff, constant){
    var coeffStr = coeff === 1 ? '' : (coeff === -1 ? '-' : String(coeff));
    return coeffStr + 'x' + (constant >= 0 ? (' + ' + constant) : (' - ' + Math.abs(constant)));
  }

  function bracketsString(m, p, n, q){
    return '(' + factorTermString(m, p) + ')(' + factorTermString(n, q) + ')';
  }

  // x²-coefficient with the coefficient-1-omitted convention, e.g.
  // 1 -> "x²", 6 -> "6x²" (m, n — and so a = m*n — are always
  // positive here, so there's no negative-coefficient case to handle).
  function xxTermString(a){ return (a === 1 ? '' : String(a)) + 'x²'; }

  function signedTerm(v, suffix){
    if(v === 0) return '';
    return (v > 0 ? ' + ' : ' - ') + Math.abs(v) + suffix;
  }

  // "x" term with the coefficient-1-omitted convention, e.g. 1 -> "x",
  // -1 -> "- x" (via the leading sign), 3 -> "+ 3x". Used for the two
  // split terms in the "expanded" step and the single collected
  // bx term — a value of 0 renders as '', which is exactly what's
  // wanted for a collected form whose bx term has cancelled out.
  function signedXTerm(v){
    if(v === 0) return '';
    var mag = Math.abs(v);
    return (v > 0 ? ' + ' : ' - ') + (mag === 1 ? '' : mag) + 'x';
  }

  // "x² + 3x + 2x + 6" — the expanded four-term form, before
  // collecting the two middle terms n1 and n2 together.
  function formatExpanded(a, n1, n2, c){
    return xxTermString(a) + signedXTerm(n1) + signedXTerm(n2) + signedTerm(c, '');
  }

  // "x² + 5x + 6" (or "x² - 9" when b is 0) — the fully collected form.
  function formatCollected(a, b, c){
    return xxTermString(a) + signedXTerm(b) + signedTerm(c, '');
  }

  // ---- Parsing ----------------------------------------------------

  // "x²+3x+2x+6" / "6x²-3x+x-1" — the expanded four-term form. A
  // coefficient of 1 on x² or on either middle term may be omitted
  // (matching formatExpanded above). "x^2" is normalised to "x²"
  // before matching — there's no ordinary way to type the
  // superscript-two character on a standard keyboard, so a student
  // typing their own answer naturally reaches for caret notation
  // instead, and the two must be treated as the same answer (see
  // GitHub issue #12, same rule as practice-factor-nonmonic.js).
  function parseExpanded(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '').replace(/x\^2/g, 'x²');
    var m = s.match(/^(\d*)x²([+-])(\d*)x([+-])(\d*)x([+-]\d+(?:\.\d+)?)$/);
    if(!m) return null;
    var a = m[1] === '' ? 1 : parseFloat(m[1]);
    var n1 = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseFloat(m[3]));
    var n2 = (m[4] === '-' ? -1 : 1) * (m[5] === '' ? 1 : parseFloat(m[5]));
    var c = parseFloat(m[6]);
    if(isNaN(a) || isNaN(n1) || isNaN(n2) || isNaN(c)) return null;
    return { a: a, n1: n1, n2: n2, c: c };
  }

  // "x²+5x+6" / "x²-9" (no bx term at all, for the b = 0 case) /
  // "6x²-3x-1" — the fully collected form. Tries the three-term shape
  // first, falling back to the two-term (b = 0) shape.
  function parseCollected(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '').replace(/x\^2/g, 'x²');
    var m = s.match(/^(\d*)x²([+-])(\d*)x([+-]\d+(?:\.\d+)?)$/);
    if(m){
      var a = m[1] === '' ? 1 : parseFloat(m[1]);
      var b = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseFloat(m[3]));
      var c = parseFloat(m[4]);
      if(isNaN(a) || isNaN(b) || isNaN(c)) return null;
      return { a: a, b: b, c: c };
    }
    m = s.match(/^(\d*)x²([+-]\d+(?:\.\d+)?)$/);
    if(m){
      var a2 = m[1] === '' ? 1 : parseFloat(m[1]);
      var c2 = parseFloat(m[2]);
      if(isNaN(a2) || isNaN(c2)) return null;
      return { a: a2, b: 0, c: c2 };
    }
    return null;
  }

  // The "expanded" step has two valid splits (n1/n2 either order,
  // since there's nothing that fixes whether the "outer" or "inner"
  // product is written first) — this returns which one (if either) a
  // parsed answer matches, so the caller can echo back a
  // properly-formatted confirmation.
  function expandedSplit(parsed, mq, np){
    if(parsed.n1 === mq && parsed.n2 === np) return { n1: mq, n2: np };
    if(parsed.n1 === np && parsed.n2 === mq) return { n1: np, n2: mq };
    return null;
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'expanded': return n + 'Write the expanded four-term form, before collecting like terms.';
      case 'collected': return steps.length === 1 ?
        'Write the fully expanded and collected form, ax² + bx + c.' :
        (n + 'Collect the like terms to write the final ax² + bx + c form.');
    }
  }

  function stepHint(name){
    var ex = HINT_EXAMPLE;
    switch(name){
      case 'expanded': return 'Multiply each term in the first bracket by each term in the second (FOIL) — e.g. ' +
        bracketsString(ex.m, ex.p, ex.n, ex.q) + ' = ' +
        formatExpanded(ex.m * ex.n, ex.m * ex.q, ex.n * ex.p, ex.p * ex.q) + '.';
      case 'collected': return 'Add the two x-terms together to collect them into one — e.g. ' +
        formatExpanded(ex.m * ex.n, ex.m * ex.q, ex.n * ex.p, ex.p * ex.q) + ' = ' +
        formatCollected(ex.m * ex.n, ex.m * ex.q + ex.n * ex.p, ex.p * ex.q) + '.';
    }
  }

  var STEP_NAMES = ['expanded', 'collected'];

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    STEP_NAMES.forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'expanded') clearInputs([els.expandedInput]);
    if(name === 'collected') clearInputs([els.collectedInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = {
      'expanded': els.expandedInput,
      'collected': els.collectedInput
    };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the ungraded scaffold step -------------------------

  function checkExpandedStep(){
    var mq = current.mq, np = current.np;
    var raw = (els.expandedInput.value || '').trim();
    var parsed = parseExpanded(raw);
    var split = parsed && parsed.a === current.a && parsed.c === current.c ? expandedSplit(parsed, mq, np) : null;
    var ok = !!split;
    els.expandedInput.classList.toggle('right', ok);
    els.expandedInput.classList.toggle('wrong', !ok);
    if(ok){
      // Echo exactly what was typed (e.g. "x^2+3x+2x+6") instead of a
      // reformatted "x² + 3x + 2x + 6" — see GitHub issue #12.
      els.feedback.textContent = 'Correct — ' + raw;
      els.feedback.className = 'feedback correct';
      working.push(raw);
    } else {
      els.feedback.textContent = 'Not quite. It should look like ' +
        formatExpanded(current.a, mq, np, current.c) + ' (or ' + formatExpanded(current.a, np, mq, current.c) + ').';
      els.feedback.className = 'feedback incorrect';
    }
    return ok;
  }

  function checkStep(name){
    if(name === 'expanded') return checkExpandedStep();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkCollected(){
    if(!current) return false;
    var raw = (els.collectedInput.value || '').trim();
    var parsed = parseCollected(raw);
    if(!parsed){
      els.feedback.textContent = 'Write the expression as ax² + bx + c, e.g. x² + 5x + 6.';
      els.feedback.className = 'feedback incorrect';
      els.collectedInput.classList.add('wrong');
      return false;
    }

    var ok = parsed.a === current.a && parsed.b === current.b && parsed.c === current.c;
    els.collectedInput.classList.toggle('right', ok);
    els.collectedInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatCollected(current.a, current.b, current.c);
    if(ok){
      score.correct++;
      // Echo exactly what was typed rather than a re-derived
      // canonical string — see the "echo the student's own answer"
      // rule in CLAUDE.md.
      els.feedback.textContent = 'Correct — ' + raw;
      els.feedback.className = 'feedback correct';
      working.push(raw);
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
        var scored = checkCollected();
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
    els.givenExpr = document.getElementById('expanddouble-given-expr');
    els.modeNote = document.getElementById('expanddouble-mode-note');
    els.stepPrompt = document.getElementById('expanddouble-step-prompt');
    els.hint = document.getElementById('expanddouble-hint');
    els.feedback = document.getElementById('expanddouble-feedback');
    els.score = document.getElementById('expanddouble-score');
    els.checkBtn = document.getElementById('expanddouble-check-btn');
    els.nextBtn = document.getElementById('expanddouble-next-btn');
    els.backBtn = document.getElementById('expanddouble-back-btn');
    els.workingCard = document.getElementById('expanddouble-working-card');
    els.workingLines = document.getElementById('expanddouble-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.expandedInput = document.getElementById('expanddouble-expanded-input');
    els.collectedInput = document.getElementById('expanddouble-collected-input');

    els.rowsByName = {
      'expanded': document.getElementById('expanddouble-step-expanded'),
      'collected': document.getElementById('expanddouble-step-collected')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.expandedInput, els.collectedInput].forEach(function(input){
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
