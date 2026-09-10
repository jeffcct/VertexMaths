/* ============================================================
   practice-factor-nonmonic.js — the PracticeFactorNonmonic
   component: a question generator for "Factoring non-monic
   polynomials" (a trinomial ax² + bx + c where a is not 1). Builds
   the trinomial by starting from its two binomial factors,
   (mx + p)(nx + q), so the factorisation is always exact, then
   walks the student through the "AC method" one idea at a time,
   rather than jumping straight from "find the pair" to "write the
   factorisation" (see GitHub issue #7 — that used to be so fast it
   skipped over the ideas the method is meant to teach).

   Below 3 questions answered, or under 90% accuracy, a five-step
   scaffold:
     1. find-ac — find a × c — ungraded.
     2. find-pair — find the pair of numbers that multiply to a*c
        and add to b (the split needed to factor by grouping) —
        ungraded.
     3. expanded — write the expanded four-term form,
        ax² + N1x + N2x + c, splitting bx using that pair — ungraded.
     4. grouped — factor each pair of terms, e.g.
        mx(nx + q) + p(nx + q) — ungraded.
     5. factored — write the fully factored expression — the only
        step that's scored.

   Worked example from the issue: factorising 3x² - 2x - 1 gives
   a×c = -3; the pair -3 and 1 (multiply to -3, add to -2); expanded
   3x² - 3x + x - 1; grouped 3x(x - 1) + 1(x - 1); factored
   (3x + 1)(x - 1).

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to the final step — same convention as
   every other Practice component's adaptive difficulty (see the note
   at the top of practice-line-from-point.js).

   m is drawn from [2, 3] and n from [1, 2, 3] (a = m*n), and p, q are
   drawn from a pool of small nonzero integers, rerolled until
   gcd(m, p) = 1 and gcd(n, q) = 1 — this keeps neither binomial
   factor reducible, so (mx + p)(nx + q) with both leading
   coefficients positive is the unique factorisation over the
   integers, and the "two numbers" step has exactly one right answer
   (up to order): m*q and n*p.

   Public API: VM.PracticeFactorNonmonic.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeFactorNonmonic = (function(){
  var M_VALUES = [2, 3];
  var N_VALUES = [1, 2, 3];
  var PQ_POOL = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { m, n, p, q, a, b, c }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while(b){ var t = b; b = a % b; a = t; } return a; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'factored'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var m = randChoice(M_VALUES);
    var n = randChoice(N_VALUES);
    var p, q;
    do {
      p = randChoice(PQ_POOL);
      q = randChoice(PQ_POOL);
    } while(gcd(m, p) !== 1 || gcd(n, q) !== 1);

    var a = m * n;
    var b = m * q + n * p;
    var c = p * q;

    current = { m: m, n: n, p: p, q: q, a: a, b: b, c: c };

    var scaffold = needsScaffold();
    steps = scaffold ? ['find-ac', 'find-pair', 'expanded', 'grouped', 'factored'] : ['factored'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the factored expression.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.givenExpr.textContent = formatExpression(current.a, current.b, current.c);
  }

  // ---- Formatting ------------------------------------------------

  function signedTerm(v, suffix){
    if(v === 0) return '';
    return (v > 0 ? ' + ' : ' - ') + Math.abs(v) + suffix;
  }

  function formatExpression(a, b, c){
    return a + 'x²' + signedTerm(b, 'x') + signedTerm(c, '');
  }

  // "3x + 2" or "-x - 4" style factor term, e.g. coeff===1 -> "x",
  // coeff===-1 -> "-x" (never generated here since m, n are always
  // positive, but kept general for the shared helper's own sake).
  function factorTermString(coeff, constant){
    var coeffStr = coeff === 1 ? '' : (coeff === -1 ? '-' : String(coeff));
    return coeffStr + 'x' + (constant >= 0 ? (' + ' + constant) : (' - ' + Math.abs(constant)));
  }

  function factoredString(m, p, n, q){
    return '(' + factorTermString(m, p) + ')(' + factorTermString(n, q) + ')';
  }

  // "x" term with the coefficient-1-omitted convention, e.g. 1 -> "x",
  // -1 -> "- x" (via the leading sign), 3 -> "+ 3x". Used for the two
  // split terms in the "expanded" step, where "1x" would look odd.
  function signedXTerm(v){
    if(v === 0) return '';
    var mag = Math.abs(v);
    return (v > 0 ? ' + ' : ' - ') + (mag === 1 ? '' : mag) + 'x';
  }

  // "3x² - 3x + x - 1" — the expanded four-term form after splitting
  // bx into two terms N1 and N2.
  function formatExpanded(a, n1, n2, c){
    return a + 'x²' + signedXTerm(n1) + signedXTerm(n2) + signedTerm(c, '');
  }

  // Bare monomial with the coefficient-1-omitted convention, e.g.
  // 1 -> "x", -1 -> "-x", 3 -> "3x" (kept general like factorTermString,
  // even though m and n are always positive here).
  function monomialString(coeff){
    return coeff === 1 ? 'x' : (coeff === -1 ? '-x' : (coeff + 'x'));
  }

  // "mx(nx + q) + p(nx + q)" style grouped form: leadCoeff*x times the
  // shared (innerCoeff*x + innerConst) bracket, plus outerCoeff times
  // that same bracket again.
  function groupedString(leadCoeff, innerCoeff, innerConst, outerCoeff){
    var binomial = factorTermString(innerCoeff, innerConst);
    var sign = outerCoeff >= 0 ? ' + ' : ' - ';
    return monomialString(leadCoeff) + '(' + binomial + ')' + sign + Math.abs(outerCoeff) + '(' + binomial + ')';
  }

  // ---- Parsing ----------------------------------------------------

  // "(2x + 3)(x - 1)" — the fully factored form.
  function parseFactored(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^\((\d*)x([+-]\d+(?:\.\d+)?)\)\((\d*)x([+-]\d+(?:\.\d+)?)\)$/);
    if(!m) return null;
    var coeff1 = m[1] === '' ? 1 : parseFloat(m[1]);
    var const1 = parseFloat(m[2]);
    var coeff2 = m[3] === '' ? 1 : parseFloat(m[3]);
    var const2 = parseFloat(m[4]);
    if(isNaN(coeff1) || isNaN(const1) || isNaN(coeff2) || isNaN(const2)) return null;
    return {
      t1: { coeff: coeff1, const: const1 },
      t2: { coeff: coeff2, const: const2 }
    };
  }

  // Order-independent comparison of the two typed factors against the
  // two real factors (mx + p) and (nx + q) — either assignment counts.
  function factorPairsMatch(t1, t2, m, p, n, q){
    function eq(t, coeff, cnst){ return t.coeff === coeff && t.const === cnst; }
    return (eq(t1, m, p) && eq(t2, n, q)) || (eq(t1, n, q) && eq(t2, m, p));
  }

  // Unordered-pair comparison for the "find two numbers" step.
  function pairMatch(x, y, want1, want2){
    return (x === want1 && y === want2) || (x === want2 && y === want1);
  }

  // "3x²-3x+x-1" — the expanded four-term form. A coefficient of 1 on
  // either middle term may be omitted (matching formatExpanded).
  function parseExpanded(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^(\d+)x²([+-])(\d*)x([+-])(\d*)x([+-]\d+(?:\.\d+)?)$/);
    if(!m) return null;
    var a = parseFloat(m[1]);
    var n1 = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseFloat(m[3]));
    var n2 = (m[4] === '-' ? -1 : 1) * (m[5] === '' ? 1 : parseFloat(m[5]));
    var c = parseFloat(m[6]);
    if(isNaN(a) || isNaN(n1) || isNaN(n2) || isNaN(c)) return null;
    return { a: a, n1: n1, n2: n2, c: c };
  }

  // "3x(x-1)+1(x-1)" — the grouped form. Both bracketed binomials must
  // be textually identical (the whole point of the step is that they
  // match), then that shared binomial is parsed on its own.
  function parseGrouped(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^(\d*)x\(([^)]*)\)([+-])(\d+(?:\.\d+)?)\(([^)]*)\)$/);
    if(!m || m[2] !== m[5]) return null;
    var bin = m[2].match(/^(\d*)x([+-]\d+(?:\.\d+)?)$/);
    if(!bin) return null;
    var leadCoeff = m[1] === '' ? 1 : parseFloat(m[1]);
    var innerCoeff = bin[1] === '' ? 1 : parseFloat(bin[1]);
    var innerConst = parseFloat(bin[2]);
    var outerCoeff = (m[3] === '-' ? -1 : 1) * parseFloat(m[4]);
    if(isNaN(leadCoeff) || isNaN(innerCoeff) || isNaN(innerConst) || isNaN(outerCoeff)) return null;
    return { leadCoeff: leadCoeff, innerCoeff: innerCoeff, innerConst: innerConst, outerCoeff: outerCoeff };
  }

  // The "expanded" step has two valid splits (N1/N2 either order) —
  // this returns which one (if either) a parsed answer matches, so the
  // caller can echo back a properly-formatted confirmation.
  function expandedSplit(parsed, mq, np){
    if(parsed.n1 === mq && parsed.n2 === np) return { n1: mq, n2: np };
    if(parsed.n1 === np && parsed.n2 === mq) return { n1: np, n2: mq };
    return null;
  }

  // The "grouped" step likewise has two valid forms, one per split —
  // mx(nx+q) + p(nx+q), or nx(mx+p) + q(mx+p).
  function groupedSplit(parsed, m, n, p, q){
    if(parsed.leadCoeff === m && parsed.innerCoeff === n && parsed.innerConst === q && parsed.outerCoeff === p){
      return { leadCoeff: m, innerCoeff: n, innerConst: q, outerCoeff: p };
    }
    if(parsed.leadCoeff === n && parsed.innerCoeff === m && parsed.innerConst === p && parsed.outerCoeff === q){
      return { leadCoeff: n, innerCoeff: m, innerConst: p, outerCoeff: q };
    }
    return null;
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'find-ac': return n + 'Find the value of a × c.';
      case 'find-pair': return n + 'Find two numbers that multiply to ' + (current.a * current.c) + ' and add to ' + current.b + '.';
      case 'expanded': return n + 'Write the expanded form, splitting the middle term using those two numbers.';
      case 'grouped': return n + 'Factor each pair of terms.';
      case 'factored': return steps.length === 1 ? 'Write the fully factored expression.' : (n + 'Write the fully factored expression.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'find-ac': return 'Multiplying a and c together gives you the number the two numbers in the next step need to multiply to.';
      case 'find-pair': return 'This is the "AC method" — multiply a and c together first: a × c = ' + (current.a * current.c) + '.';
      case 'expanded': return 'Replace the middle term with the two terms you just found, in either order, keeping a and c the same — e.g. for x² + 5x + 6, splitting 5 into 2 and 3 gives x² + 2x + 3x + 6.';
      case 'grouped': return 'Group the first two terms and the last two terms, then pull out the common factor from each group — you should end up with the same bracket twice, e.g. x² + 2x + 3x + 6 becomes x(x + 2) + 3(x + 2).';
      case 'factored': return 'Split the middle term using the pair you just found, then factor by grouping. It should look like (mx + p)(nx + q) with whole-number coefficients.';
    }
  }

  var STEP_NAMES = ['find-ac', 'find-pair', 'expanded', 'grouped', 'factored'];

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    STEP_NAMES.forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'find-ac') clearInputs([els.findAcInput]);
    if(name === 'find-pair') clearInputs([els.pairInput1, els.pairInput2]);
    if(name === 'expanded') clearInputs([els.expandedInput]);
    if(name === 'grouped') clearInputs([els.groupedInput]);
    if(name === 'factored') clearInputs([els.factoredInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = {
      'find-ac': els.findAcInput,
      'find-pair': els.pairInput1,
      'expanded': els.expandedInput,
      'grouped': els.groupedInput,
      'factored': els.factoredInput
    };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: ungraded scaffold steps -------------------------------

  function checkFindAC(){
    var x = parseFloat((els.findAcInput.value || '').trim());
    var want = current.a * current.c;
    var ok = !isNaN(x) && x === want;
    els.findAcInput.classList.toggle('right', ok); els.findAcInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — a × c = ' + want + '.') : ('Not quite. a × c = ' + want + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('a × c = ' + want);
    return ok;
  }

  function checkFindPair(){
    var x = parseFloat((els.pairInput1.value || '').trim());
    var y = parseFloat((els.pairInput2.value || '').trim());
    var want1 = current.m * current.q, want2 = current.n * current.p;
    var ok = !isNaN(x) && !isNaN(y) && pairMatch(x, y, want1, want2);
    els.pairInput1.classList.toggle('right', ok); els.pairInput1.classList.toggle('wrong', !ok);
    els.pairInput2.classList.toggle('right', ok); els.pairInput2.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ?
      ('Correct — ' + want1 + ' and ' + want2 + '.') :
      ('Not quite. The two numbers are ' + want1 + ' and ' + want2 + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(want1 + ', ' + want2);
    return ok;
  }

  function checkExpanded(){
    var mq = current.m * current.q, np = current.n * current.p;
    var parsed = parseExpanded(els.expandedInput.value);
    var split = parsed && parsed.a === current.a && parsed.c === current.c ? expandedSplit(parsed, mq, np) : null;
    var ok = !!split;
    els.expandedInput.classList.toggle('right', ok);
    els.expandedInput.classList.toggle('wrong', !ok);
    if(ok){
      var str = formatExpanded(current.a, split.n1, split.n2, current.c);
      els.feedback.textContent = 'Correct — ' + str;
      els.feedback.className = 'feedback correct';
      working.push(str);
    } else {
      els.feedback.textContent = 'Not quite. It should look like ' +
        formatExpanded(current.a, mq, np, current.c) + ' (or ' + formatExpanded(current.a, np, mq, current.c) + ').';
      els.feedback.className = 'feedback incorrect';
    }
    return ok;
  }

  function checkGrouped(){
    var m = current.m, n = current.n, p = current.p, q = current.q;
    var parsed = parseGrouped(els.groupedInput.value);
    var split = parsed ? groupedSplit(parsed, m, n, p, q) : null;
    var ok = !!split;
    els.groupedInput.classList.toggle('right', ok);
    els.groupedInput.classList.toggle('wrong', !ok);
    if(ok){
      var str = groupedString(split.leadCoeff, split.innerCoeff, split.innerConst, split.outerCoeff);
      els.feedback.textContent = 'Correct — ' + str;
      els.feedback.className = 'feedback correct';
      working.push(str);
    } else {
      els.feedback.textContent = 'Not quite. It should look like ' +
        groupedString(m, n, q, p) + ' (or ' + groupedString(n, m, p, q) + ').';
      els.feedback.className = 'feedback incorrect';
    }
    return ok;
  }

  function checkStep(name){
    if(name === 'find-ac') return checkFindAC();
    if(name === 'find-pair') return checkFindPair();
    if(name === 'expanded') return checkExpanded();
    if(name === 'grouped') return checkGrouped();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkFactored(){
    if(!current) return false;
    var parsed = parseFactored(els.factoredInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the factored expression like (2x + 3)(x - 1).';
      els.feedback.className = 'feedback incorrect';
      els.factoredInput.classList.add('wrong');
      return false;
    }

    var ok = factorPairsMatch(parsed.t1, parsed.t2, current.m, current.p, current.n, current.q);
    els.factoredInput.classList.toggle('right', ok);
    els.factoredInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = factoredString(current.m, current.p, current.n, current.q);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + correctStr;
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
    els.givenExpr = document.getElementById('nonmonic-given-expr');
    els.modeNote = document.getElementById('nonmonic-mode-note');
    els.stepPrompt = document.getElementById('nonmonic-step-prompt');
    els.hint = document.getElementById('nonmonic-hint');
    els.feedback = document.getElementById('nonmonic-feedback');
    els.score = document.getElementById('nonmonic-score');
    els.checkBtn = document.getElementById('nonmonic-check-btn');
    els.nextBtn = document.getElementById('nonmonic-next-btn');
    els.backBtn = document.getElementById('nonmonic-back-btn');
    els.workingCard = document.getElementById('nonmonic-working-card');
    els.workingLines = document.getElementById('nonmonic-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.findAcInput = document.getElementById('nonmonic-find-ac-input');
    els.pairInput1 = document.getElementById('nonmonic-pair-input-1');
    els.pairInput2 = document.getElementById('nonmonic-pair-input-2');
    els.expandedInput = document.getElementById('nonmonic-expanded-input');
    els.groupedInput = document.getElementById('nonmonic-grouped-input');
    els.factoredInput = document.getElementById('nonmonic-factored-input');

    els.rowsByName = {
      'find-ac': document.getElementById('nonmonic-step-find-ac'),
      'find-pair': document.getElementById('nonmonic-step-find-pair'),
      'expanded': document.getElementById('nonmonic-step-expanded'),
      'grouped': document.getElementById('nonmonic-step-grouped'),
      'factored': document.getElementById('nonmonic-step-factored')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.findAcInput, els.pairInput1, els.pairInput2, els.expandedInput, els.groupedInput, els.factoredInput].forEach(function(input){
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
