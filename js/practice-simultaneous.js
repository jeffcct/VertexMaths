/* ============================================================
   practice-simultaneous.js — the PracticeSimultaneous component: a
   question generator for "Solving simultaneous equations". Shows a
   random pair of two-variable linear equations — one of which
   always has a coefficient of exactly 1 on one variable, so at least
   one of the two variables can always be isolated without a
   fraction — and asks for the solution (x, y).

   Adaptive difficulty is a single on/off switch, re-checked before
   every new question:
     - fewer than 5 questions answered, OR accuracy below 50%: a
       scaffolded walkthrough. Every choice in it — which method,
       which variable to isolate, whether to add or subtract — is
       either a free pick with no wrong answer, or (add/subtract)
       has one mathematically correct answer that's checked; nothing
       is ever graded against a "preferred" choice the student had
       no way to know. Whichever method they click, the rest of the
       walkthrough follows it:
         substitution — pick a variable to isolate (either one always
         works) and rearrange either equation to isolate it (whichever
         equation doesn't have a coefficient of 1 on it needs a
         fraction), then solve for the other variable, then solve for
         the picked one.
         elimination — say what to multiply each equation by so a
         chosen variable's coefficients match, write out both
         equations after multiplying, add or subtract them and write
         the resulting one-variable equation, then solve for that
         variable, then solve for the eliminated one.
     - 5 or more questions answered AND accuracy at 50% or higher: no
       scaffolding — just solve the system and enter x and y.

   Only the final "solution" step is scored; every scaffold step
   before it is ungraded (must be answered correctly to move on, but
   doesn't affect accuracy) — same convention as every other
   Practice component's step walkthroughs (see the note at the top
   of practice-parabola-intercepts.js).

   A "Working" side panel accumulates a line each time a step is
   confirmed correct — the multiplied/eliminated equations and each
   solved value for elimination, the rearranged equation and each
   solved value for substitution — so the student can see their
   derivation build up the way they would on paper, and refer back to
   it at any later step (see working-trail.js).

   Public API: VM.PracticeSimultaneous.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeSimultaneous = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var SCAFFOLD_MIN_ATTEMPTS = 5;    // "5 or more questions answered" — below this, scaffold
  var SCAFFOLD_MIN_ACCURACY = 0.50; // "50% accuracy" — below this, scaffold

  // Independent of the scaffold switch above: once unlocked, x0
  // and/or y0 (the system's actual solution) can be a genuine
  // fraction like 7/3 instead of always a whole number — same
  // attempts/accuracy shape as the fractional-answer tiers in
  // practice-graph-linear.js (EXTRA_TIP_MIN_*/FRACTION_GRADIENT_MIN_*).
  var FRACTION_SOLUTION_MIN_ATTEMPTS = 10;
  var FRACTION_SOLUTION_MIN_ACCURACY = 0.60;

  // eqB's coefficients, and eqA's non-unit coefficient, are drawn
  // from this set (never 0, never ±1 — ±1 is reserved for whichever
  // side of eqA is the deliberately-isolable one).
  var OTHER_COEFFS = [-3, -2, 2, 3];

  // Pool of fraction values x0/y0 can land on once the fractional
  // tier unlocks (see usesFractionSolution()/pickSolutionValue()) —
  // small coprime numerator/denominator pairs, denominator never ±1
  // (that would just be an integer written oddly), same shape as
  // FRACTION_M_VALUES in practice-graph-linear.js.
  var FRACTION_SOLUTION_VALUES = [
    { num: 7, den: 3 }, { num: -7, den: 3 },
    { num: 5, den: 3 }, { num: -5, den: 3 },
    { num: 8, den: 3 }, { num: -8, den: 3 },
    { num: 7, den: 2 }, { num: -7, den: 2 },
    { num: 5, den: 2 }, { num: -5, den: 2 }
  ];

  var els = {};
  var current = null;
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }
  function gcd(a, b){
    a = Math.abs(a); b = Math.abs(b);
    while(b){ var t = b; b = a % b; a = t; }
    return a || 1;
  }
  function usesFractionSolution(){
    return score.attempted >= FRACTION_SOLUTION_MIN_ATTEMPTS && accuracy() >= FRACTION_SOLUTION_MIN_ACCURACY;
  }
  // Roughly half the time, once the fractional-solution tier has
  // unlocked, x0/y0 lands on a genuine fraction instead of a whole
  // number — the integer pool stays in the mix too (same "keep both
  // pools live" convention as pickM() in practice-graph-linear.js).
  function pickSolutionValue(){
    if(usesFractionSolution() && Math.random() < 0.5){
      var f = randChoice(FRACTION_SOLUTION_VALUES);
      return frac(f.num, f.den);
    }
    var v = randInt(-6, 6); if(v === 0) v = 1;
    return frac(v, 1);
  }

  // ---- Exact rational arithmetic ------------------------------------
  //
  // x0/y0 (the system's actual solution) can now be a fraction, which
  // makes the equations' constant terms (aC/bC) fractional too, and
  // everything computed from them downstream (the rearranged
  // constant, the multiplied equations, the eliminated equation's
  // RHS). Those constants are carried as exact { num, den } pairs
  // (den always > 0, already reduced) rather than plain floats, so
  // every displayed "correct answer" can be rendered as a clean
  // fraction via formatRational(num, den) instead of a long decimal —
  // only fracNum() ever converts one to a float, and only for the
  // epsilon-tolerant numeric comparisons in the check* functions.
  function frac(num, den){
    if(den < 0){ num = -num; den = -den; }
    var g = gcd(num, den);
    return { num: num / g, den: den / g };
  }
  function fracNeg(f){ return { num: -f.num, den: f.den }; }
  function fracAdd(a, b){ return frac(a.num * b.den + b.num * a.den, a.den * b.den); }
  function fracSub(a, b){ return fracAdd(a, fracNeg(b)); }
  // coeff*f — coeff is normally a plain integer (every generated
  // multiplier, and every realistic student-entered one); a
  // non-integer coeff (a fraction a student is nonetheless entitled
  // to submit as a multiplier — see checkMultipliers) is reconstructed
  // to the nearest /1000 first so the result still reduces to a clean
  // fraction instead of drifting into a float.
  function fracScale(coeff, f){
    var m = (Math.round(coeff) === coeff) ? frac(coeff, 1) : frac(Math.round(coeff * 1000), 1000);
    return frac(m.num * f.num, m.den * f.den);
  }
  function fracNum(f){ return f.num / f.den; }

  // chosen = (constant - coeffOther*other) / coeffChosen
  //        = (-coeffOther/coeffChosen)*other + (constant/coeffChosen)
  // Normalized so the denominator is positive, then reduced — shared
  // by both equations, since rearranging either one for the chosen
  // variable is equally valid (see selectVariable/checkRearrange).
  // `constant` is a { num, den } fraction (aC/bC — see the "Exact
  // rational arithmetic" note above); this still handles a plain
  // whole-number constant exactly as before, since that's just the
  // den === 1 case.
  function computeRearrangement(coeffChosen, coeffOther, constant){
    var coeffNum = -coeffOther, coeffDen = coeffChosen;
    if(coeffDen < 0){ coeffNum = -coeffNum; coeffDen = -coeffDen; }
    var cg = gcd(coeffNum, coeffDen); coeffNum /= cg; coeffDen /= cg;

    var constNum = constant.num, constDen = constant.den * coeffChosen;
    if(constDen < 0){ constNum = -constNum; constDen = -constDen; }
    var kg = gcd(constNum, constDen); constNum /= kg; constDen /= kg;

    return { coeffNum: coeffNum, coeffDen: coeffDen, constNum: constNum, constDen: constDen };
  }

  // The two equations after multiplying every term by multA/multB, and
  // the one-variable equation left after adding/subtracting those —
  // shared by question generation and by checkMultipliers, since a
  // student can pick a different (but equally valid) multiplier pair
  // than the one generated, and everything downstream has to follow it.
  // aC/bC are { num, den } fractions; multA/multB are plain numbers
  // (see fracScale for how a non-integer one is handled exactly).
  function computeElimination(aX, aY, aC, p, q, bC, targetVar, operation, multA, multB){
    var multEq1 = { a: aX * multA, b: aY * multA, c: fracScale(multA, aC) };
    var multEq2 = { a: p * multB, b: q * multB, c: fracScale(multB, bC) };
    var elimCoeff = operation === 'subtract'
      ? (targetVar === 'x' ? multEq1.b - multEq2.b : multEq1.a - multEq2.a)
      : (targetVar === 'x' ? multEq1.b + multEq2.b : multEq1.a + multEq2.a);
    var elimRhs = operation === 'subtract' ? fracSub(multEq1.c, multEq2.c) : fracAdd(multEq1.c, multEq2.c);
    return { multEq1: multEq1, multEq2: multEq2, elimCoeff: elimCoeff, elimRhs: elimRhs };
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    // x0/y0 (the system's actual solution) are { num, den } fractions
    // — plain whole numbers most of the time (den 1), but sometimes a
    // genuine fraction like 7/3 once the fractional-solution tier
    // unlocks (see pickSolutionValue()).
    var x0 = pickSolutionValue();
    var y0 = pickSolutionValue();

    // eqA always has a coefficient of exactly 1 on one variable
    // (chosen at random), so it can always be rearranged for that
    // variable without introducing a fraction.
    var xIsUnit = Math.random() < 0.5;
    var m = randChoice(OTHER_COEFFS);
    var aX = xIsUnit ? 1 : m;
    var aY = xIsUnit ? m : 1;
    var aC = fracAdd(fracScale(aX, x0), fracScale(aY, y0));

    // Elimination always targets eqA's NON-unit variable (never the
    // one with coefficient 1) — otherwise that side needs no scaling
    // at all, which is exactly the "half-trivial" case reported in
    // issue #15 part 2.
    var targetVar = xIsUnit ? 'y' : 'x';

    // eqB: general coefficients, regenerated until the system has a
    // unique solution (determinant aX*q - aY*p != 0) — with these
    // curated coefficient pools that's true of every combination, so
    // this never actually loops, but it's cheap insurance if the
    // pools above ever change — AND until the eqB coefficient on
    // targetVar has a different magnitude than eqA's (m), so
    // gcd(|m|, |that coefficient|) can never be their common
    // magnitude — otherwise both multipliers reduce to 1 and the
    // question needs no multiplication at all (the fully-trivial case
    // from the same issue). OTHER_COEFFS has only two magnitudes (2
    // and 3), so this converges in a couple of retries at most.
    var p, q;
    do {
      p = randChoice(OTHER_COEFFS);
      q = randChoice(OTHER_COEFFS);
    } while (aX * q - aY * p === 0 || Math.abs(targetVar === 'x' ? p : q) === Math.abs(m));
    var bC = fracAdd(fracScale(p, x0), fracScale(q, y0));

    var cA_t = targetVar === 'x' ? aX : aY;
    var cB_t = targetVar === 'x' ? p : q;
    var g = gcd(cA_t, cB_t);
    var multA = Math.abs(cB_t) / g;
    var multB = Math.abs(cA_t) / g;
    var operation = ((cA_t > 0) === (cB_t > 0)) ? 'subtract' : 'add';
    var eliminatedOtherVar = targetVar === 'x' ? 'y' : 'x';
    var eliminatedOtherVal = targetVar === 'x' ? y0 : x0;
    var targetVal = targetVar === 'x' ? x0 : y0;

    // Equation 1 and 2 after multiplying every term by multA/multB, and
    // the one-variable equation left after adding/subtracting those.
    var elim = computeElimination(aX, aY, aC, p, q, bC, targetVar, operation, multA, multB);

    current = {
      aX: aX, aY: aY, aC: aC, p: p, q: q, bC: bC, x0: x0, y0: y0,
      targetVar: targetVar, multA: multA, multB: multB, operation: operation,
      eliminatedOtherVar: eliminatedOtherVar, eliminatedOtherVal: eliminatedOtherVal, targetVal: targetVal,
      multEq1: elim.multEq1, multEq2: elim.multEq2, elimCoeff: elim.elimCoeff, elimRhs: elim.elimRhs,
      method: null    // set once the student picks it on the "choose-method" step
      // subVar/otherVar/rearrangeEq1/rearrangeEq2/subVarVal/otherVarVal
      // are set once the student picks a variable on the
      // "pick-variable" step (see selectVariable) — which equation
      // avoids a fraction, if either does, depends on that free
      // choice, not on anything decided up front.
      // targetVar itself can also change, on the "multipliers" step (see
      // checkMultipliers) — eliminating either variable is always valid,
      // so a multiplier pair that matches the other variable's
      // coefficients instead is accepted just as readily.
    };

    var scaffold = needsScaffold();
    steps = scaffold ? ['choose-method'] : ['equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    els.modeNote.textContent = scaffold ? '' : "You've got this — just solve it directly.";
    els.multiplyEq1Label.textContent = 'Equation 1 × ' + multA + ':';
    els.multiplyEq2Label.textContent = 'Equation 2 × ' + multB + ':';

    working.reset();
    renderEquations();
    renderStep();
  }

  // The steps that follow once the student has picked a method —
  // appended to `steps` at that point, since which ones apply
  // depends on their choice.
  function methodSteps(method){
    return method === 'substitution'
      ? ['pick-variable', 'rearrange', 'solve-first', 'solve-second', 'equation']
      : ['multipliers', 'multiply-equations', 'eliminate', 'solve-first', 'solve-second', 'equation'];
  }

  function close(a, b){ return Math.abs(a - b) < 0.01; }

  // c is a { num, den } fraction (aC/bC, or a multiplied equation's c
  // — see the "Exact rational arithmetic" note) — rendered via
  // formatRational so a fractional constant shows as a clean fraction
  // rather than a decimal; formatRational is defined further down but
  // is a function declaration, so it's available here regardless of
  // source order.
  function formatEquation(a, b, c){
    var terms = (a < 0 ? '-' : '') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x';
    terms += (b < 0 ? ' - ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'y';
    return terms + ' = ' + formatRational(c.num, c.den);
  }

  // rhs is a { num, den } fraction (current.elimRhs).
  function formatSingleVarEquation(coeff, varName, rhs){
    var coeffStr = coeff === 1 ? '' : (coeff === -1 ? '-' : String(coeff));
    return coeffStr + varName + ' = ' + formatRational(rhs.num, rhs.den);
  }

  function renderEquations(){
    els.eq1.textContent = formatEquation(current.aX, current.aY, current.aC);
    els.eq2.textContent = formatEquation(current.p, current.q, current.bC);
  }

  // "9x + 6y = 15" — both terms present, x before y, matching how
  // formatEquation always displays a two-variable equation. Also
  // accepts the constant written first, e.g. "15 = 9x + 6y". The
  // constant can itself be a fraction like "7/3" now that x0/y0 can
  // be (see the fractional-solution tier), so it's parsed with
  // parseFraction rather than parseFloat.
  function parseLinearEquation(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var m = s.match(/^([+-]?\d*)x([+-])(\d*)y=([+-]?\d+(?:\/\d+)?)$/);
      if(!m) return null;
      var a = parseGradient(m[1]);
      if(isNaN(a)) return null;
      var b = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseInt(m[3], 10));
      var c = parseFraction(m[4]);
      if(isNaN(c)) return null;
      return { a: a, b: b, c: c };
    });
  }

  // "4y = -16" or "y = -16" or "-y = 16" — a single-variable equation
  // in whichever letter the elimination left behind. Also accepts
  // the constant written first, e.g. "-16 = 4y". The RHS can itself
  // be a fraction (elimRhs can be, once x0/y0 can be), so it's parsed
  // with parseFraction rather than parseFloat.
  function parseSingleVarEquation(raw, varName){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var re = new RegExp('^([+-]?\\d*)' + varName + '=([+-]?\\d+(?:\\/\\d+)?)$');
      var m = s.match(re);
      if(!m) return null;
      var coeff = parseGradient(m[1]);
      if(isNaN(coeff)) return null;
      var rhs = parseFraction(m[2]);
      if(isNaN(rhs)) return null;
      return { coeff: coeff, rhs: rhs };
    });
  }

  // Rational-number formatting for whichever variable the student
  // picks to isolate — when its coefficient isn't 1, rearranging
  // introduces a fraction, so these can't assume whole numbers the
  // way the rest of the site's coefficient formatting does.
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
  // "-2y + 7" or "-y/2 + 7/3" style right-hand side for the
  // rearranged equation.
  function formatRHS(coeffNum, coeffDen, varName, constNum, constDen){
    var s = formatCoeffLabel(coeffNum, coeffDen) + varName;
    if(constNum !== 0){
      s += (constNum > 0 ? ' + ' : ' - ') + formatRational(Math.abs(constNum), constDen);
    }
    return s;
  }
  // r is a { coeffNum, coeffDen, constNum, constDen } rearrangement —
  // either current.rearrangeEq1 or current.rearrangeEq2, since
  // rearranging either original equation for the chosen variable is
  // equally valid (see selectVariable/checkRearrange).
  function rearrangedString(r){
    return current.subVar + ' = ' + formatRHS(
      r.coeffNum, r.coeffDen, current.otherVar, r.constNum, r.constDen
    );
  }

  // Dynamic row labels that stay fixed for the whole question (unlike
  // the prompt/hint text, which changes with the step).
  function setDynamicLabels(){
    els.rearrangeLabel.textContent = current.subVar + ' =';
    els.rearrangeVarLabel.textContent = current.otherVar + ' +';
    if(current.method === 'substitution'){
      els.solveFirstLabel.textContent = current.otherVar + ' =';
      els.solveSecondLabel.textContent = current.subVar + ' =';
    } else {
      els.solveFirstLabel.textContent = current.eliminatedOtherVar + ' =';
      els.solveSecondLabel.textContent = current.targetVar + ' =';
    }
  }

  // ---- Step rendering -------------------------------------------------

  var ALL_STEP_NAMES = [
    'choose-method', 'pick-variable', 'rearrange',
    'multipliers', 'multiply-equations', 'eliminate',
    'solve-first', 'solve-second', 'equation'
  ];
  var CHOICE_STEPS = ['choose-method', 'pick-variable'];

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'equation'; }
  function isChoiceStep(name){ return CHOICE_STEPS.indexOf(name) !== -1; }

  function stepPrompt(name){
    // 'choose-method' never gets a "Step X of Y" prefix — the total
    // step count isn't known until the student picks one.
    if(name === 'choose-method') return 'Which method would you like to use?';
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'pick-variable': return n + 'Which variable would you like to isolate first?';
      case 'rearrange': return n + 'Rearrange either equation to make ' + current.subVar + ' the subject.';
      case 'multipliers': return n + 'What should you multiply each equation by so that one variable’s coefficients match?';
      case 'multiply-equations': return n + 'Write out each equation after multiplying.';
      case 'eliminate': return n + 'Add or subtract the two new equations to eliminate ' + current.targetVar + ', and write the result.';
      case 'solve-first':
        return n + (current.method === 'substitution'
          ? 'Substitute into the other equation and solve for ' + current.otherVar + '.'
          : 'Solve for ' + current.eliminatedOtherVar + '.');
      case 'solve-second':
        return n + (current.method === 'substitution'
          ? 'Substitute back in and solve for ' + current.subVar + '.'
          : 'Substitute back into either original equation and solve for ' + current.targetVar + '.');
      case 'equation': return steps.length === 1 ? 'Solve the system of equations.' : (n + 'Write the full solution.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'choose-method':
        return 'Both methods work on any system — pick whichever you’d like to practice.';
      case 'pick-variable':
        return 'Either variable works. One of them has a coefficient of 1 in equation 1 and rearranges cleanly there; the other will need a fraction from either equation.';
      case 'rearrange':
        return 'Move the ' + current.otherVar + ' term to the other side of whichever equation you pick. Leave the coefficient box blank for 1, or type just - for -1.' +
          (Math.abs(current.rearrangeEq1.coeffDen) > 1 || Math.abs(current.rearrangeEq2.coeffDen) > 1 ||
           Math.abs(current.rearrangeEq1.constDen) > 1 || Math.abs(current.rearrangeEq2.constDen) > 1
            ? ' Fractions like 1/2 are fine here.' : '');
      case 'multipliers':
        return 'Multiply so both equations end up with the same-size coefficient for whichever variable you’d like to eliminate — either one works.';
      case 'multiply-equations':
        return 'Multiply every term, including the constant, by that equation’s multiplier — e.g. 3x + 2y = 4 by 3.';
      case 'eliminate':
        return 'If the matching coefficients have the same sign, subtract; if opposite signs, add. Write it as ' +
          current.eliminatedOtherVar + ' = ..., or e.g. 4' + current.eliminatedOtherVar + ' = ... if the coefficient isn’t 1.';
      case 'solve-first':
      case 'solve-second':
        return 'Fractions like 3/2 are fine if you need one.';
      case 'equation':
        return 'Enter both x and y.';
    }
  }

  function clearStepInputs(name){
    var map = {
      rearrange: [els.rearrangeCoeff, els.rearrangeConst],
      multipliers: [els.multA, els.multB],
      'multiply-equations': [els.multipliedEq1, els.multipliedEq2],
      eliminate: [els.eliminateInput],
      'solve-first': [els.solveFirstInput],
      'solve-second': [els.solveSecondInput],
      equation: [els.eqX, els.eqY]
    };
    (map[name] || []).forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    els.rows.forEach(function(row){
      row.querySelectorAll('.choice-btn').forEach(function(btn){
        btn.disabled = false;
        btn.classList.remove('right', 'wrong');
      });
    });
  }

  function firstFocusTarget(name){
    var map = {
      'choose-method': els.choiceSubstitution, 'pick-variable': els.pickX,
      rearrange: els.rearrangeCoeff, multipliers: els.multA,
      'multiply-equations': els.multipliedEq1, eliminate: els.eliminateInput,
      'solve-first': els.solveFirstInput, 'solve-second': els.solveSecondInput,
      equation: els.eqX
    };
    return map[name];
  }

  function renderStep(){
    var name = currentStepName();
    ALL_STEP_NAMES.forEach(function(n){ els.rowsByName[n].hidden = (n !== name); });
    clearStepInputs(name);
    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.checkBtn.disabled = isChoiceStep(name);
    var focusEl = firstFocusTarget(name);
    if(focusEl) focusEl.focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: choice-type steps (clicked directly) ---------------

  function methodLabel(m){ return m === 'elimination' ? 'elimination' : 'substitution'; }

  // The student picked a method — always accepted, since both work
  // on any system. This is what turns the single 'choose-method'
  // step into the rest of that method's walkthrough.
  function selectMethod(value, btnEl, otherBtn){
    if(stepAnswered) return;
    current.method = value;
    steps = steps.concat(methodSteps(value));
    setDynamicLabels();

    btnEl.classList.add('right');
    els.feedback.textContent = 'Good — let’s work through it with ' + methodLabel(value) + '.';
    els.feedback.className = 'feedback correct';

    stepAnswered = true;
    btnEl.disabled = true; otherBtn.disabled = true;
    els.checkBtn.disabled = false;
    els.checkBtn.textContent = 'Continue';
  }

  // The student picked which variable to isolate — always accepted,
  // since either works on any system. Rearranging either original
  // equation for that variable is equally valid too (see
  // checkRearrange), so both are computed here: equation 1's
  // coefficient on the chosen variable is 1 exactly when that's the
  // variable eqA was built to isolate cleanly; equation 2's never is,
  // since eqB's coefficients are always drawn from OTHER_COEFFS.
  function selectVariable(value, btnEl, otherBtn){
    if(stepAnswered) return;
    var otherValue = value === 'x' ? 'y' : 'x';
    var coeffChosen1 = value === 'x' ? current.aX : current.aY;
    var coeffOther1 = value === 'x' ? current.aY : current.aX;
    var coeffChosen2 = value === 'x' ? current.p : current.q;
    var coeffOther2 = value === 'x' ? current.q : current.p;

    current.subVar = value;
    current.otherVar = otherValue;
    current.rearrangeEq1 = computeRearrangement(coeffChosen1, coeffOther1, current.aC);
    current.rearrangeEq2 = computeRearrangement(coeffChosen2, coeffOther2, current.bC);
    current.subVarVal = value === 'x' ? current.x0 : current.y0;
    current.otherVarVal = value === 'x' ? current.y0 : current.x0;
    setDynamicLabels();

    btnEl.classList.add('right');
    els.feedback.textContent = 'Good — let’s isolate ' + value + '. Rearrange whichever equation you’d like.';
    els.feedback.className = 'feedback correct';

    stepAnswered = true;
    btnEl.disabled = true; otherBtn.disabled = true;
    els.checkBtn.disabled = false;
    els.checkBtn.textContent = 'Continue';
  }

  // ---- Checking: text-input scaffold steps ---------------------------

  // Rearranging either original equation for the chosen variable is
  // equally valid, so this accepts a match against either one (see
  // computeRearrangement/selectVariable) rather than only equation 1.
  function checkRearrange(){
    var coeff = parseGradient(els.rearrangeCoeff.value);
    var cst = parseFraction(els.rearrangeConst.value);
    var r1 = current.rearrangeEq1, r2 = current.rearrangeEq2;
    function matches(r){
      return !isNaN(coeff) && !isNaN(cst) &&
        close(coeff, r.coeffNum / r.coeffDen) && close(cst, r.constNum / r.constDen);
    }
    var matches1 = matches(r1), matches2 = matches(r2);
    var ok = matches1 || matches2;
    els.rearrangeCoeff.classList.toggle('right', ok); els.rearrangeCoeff.classList.toggle('wrong', !ok);
    els.rearrangeConst.classList.toggle('right', ok); els.rearrangeConst.classList.toggle('wrong', !ok);
    var correctStr1 = rearrangedString(r1), correctStr2 = rearrangedString(r2);
    if(ok){
      els.feedback.textContent = 'Correct — ' + (matches1 ? correctStr1 : correctStr2) + '.';
    } else {
      els.feedback.textContent = 'Not quite. From equation 1 that’s ' + correctStr1 + '; from equation 2, ' + correctStr2 + '.';
    }
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(matches1 ? correctStr1 : correctStr2);
    return ok;
  }

  // Either variable is always valid to eliminate — a pair that makes
  // the x-coefficients match is just as correct as one that matches
  // the y-coefficients, even if it's not the variable generated as
  // the "default" target. So this accepts any nonzero pair matching
  // either variable's coefficients (either sign — a negative
  // multiplier is just as valid as a positive one, e.g. multiplying
  // by -1 to flip which operation eliminates the variable; see issue
  // #15 part 1), then re-derives everything downstream (targetVar,
  // operation, the eliminated variable, the multiplied equations)
  // from whichever one the student's pair hits.
  function checkMultipliers(){
    var a = parseFraction(els.multA.value);
    var b = parseFraction(els.multB.value);
    var matchesX = !isNaN(a) && !isNaN(b) && a !== 0 && b !== 0 && close(Math.abs(a * current.aX), Math.abs(b * current.p));
    var matchesY = !isNaN(a) && !isNaN(b) && a !== 0 && b !== 0 && close(Math.abs(a * current.aY), Math.abs(b * current.q));
    // If a pair happens to satisfy both (only possible if it also
    // happens to solve the system some other way), keep the
    // already-chosen target rather than switching unnecessarily.
    var targetVar = matchesX && matchesY ? current.targetVar : (matchesX ? 'x' : (matchesY ? 'y' : null));
    var ok = !!targetVar;
    els.multA.classList.toggle('right', ok); els.multA.classList.toggle('wrong', !ok);
    els.multB.classList.toggle('right', ok); els.multB.classList.toggle('wrong', !ok);
    if(ok){
      var cA_t = targetVar === 'x' ? current.aX : current.aY;
      var cB_t = targetVar === 'x' ? current.p : current.q;
      // Derived from the ACTUAL post-multiplication signs (a*cA_t,
      // b*cB_t), not the original coefficients' signs — a negative
      // multiplier flips the sign of every term in that equation, so
      // it can flip add into subtract (or vice versa) from what the
      // unmultiplied coefficients alone would suggest.
      var multipliedA = a * cA_t, multipliedB = b * cB_t;
      current.targetVar = targetVar;
      current.operation = ((multipliedA > 0) === (multipliedB > 0)) ? 'subtract' : 'add';
      current.eliminatedOtherVar = targetVar === 'x' ? 'y' : 'x';
      current.eliminatedOtherVal = targetVar === 'x' ? current.y0 : current.x0;
      current.targetVal = targetVar === 'x' ? current.x0 : current.y0;
      current.multA = a; current.multB = b;
      var elim = computeElimination(current.aX, current.aY, current.aC, current.p, current.q, current.bC,
        targetVar, current.operation, a, b);
      current.multEq1 = elim.multEq1; current.multEq2 = elim.multEq2;
      current.elimCoeff = elim.elimCoeff; current.elimRhs = elim.elimRhs;
      els.multiplyEq1Label.textContent = 'Equation 1 × ' + a + ':';
      els.multiplyEq2Label.textContent = 'Equation 2 × ' + b + ':';
      setDynamicLabels();
    }
    els.feedback.textContent = ok ?
      ('Correct — equation 1 × ' + current.multA + ', equation 2 × ' + current.multB + ' matches the ' + current.targetVar + '-coefficients.') :
      ('Not quite. Try multiplying so either the x- or the y-coefficients end up matching — e.g. equation 1 × ' + current.multA + ' and equation 2 × ' + current.multB + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('Equation 1 × ' + current.multA + ', equation 2 × ' + current.multB);
    return ok;
  }

  // The two equations after multiplying — accepts only the exact
  // multiplied form (matching the multipliers just confirmed), not
  // any other equivalent equation.
  function checkMultiplyEquations(){
    var eq1 = parseLinearEquation(els.multipliedEq1.value);
    var eq2 = parseLinearEquation(els.multipliedEq2.value);
    var eq1Ok = !!eq1 && close(eq1.a, current.multEq1.a) && close(eq1.b, current.multEq1.b) && close(eq1.c, fracNum(current.multEq1.c));
    var eq2Ok = !!eq2 && close(eq2.a, current.multEq2.a) && close(eq2.b, current.multEq2.b) && close(eq2.c, fracNum(current.multEq2.c));
    els.multipliedEq1.classList.toggle('right', eq1Ok); els.multipliedEq1.classList.toggle('wrong', !eq1Ok);
    els.multipliedEq2.classList.toggle('right', eq2Ok); els.multipliedEq2.classList.toggle('wrong', !eq2Ok);
    var ok = eq1Ok && eq2Ok;
    var correct1 = formatEquation(current.multEq1.a, current.multEq1.b, current.multEq1.c);
    var correct2 = formatEquation(current.multEq2.a, current.multEq2.b, current.multEq2.c);
    els.feedback.textContent = ok ?
      ('Correct — ' + correct1 + ' and ' + correct2 + '.') :
      ('Not quite. It should be ' + correct1 + ' and ' + correct2 + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok){ working.push(correct1); working.push(correct2); }
    return ok;
  }

  // The resulting one-variable equation — accepts either sign
  // convention (eq1 - eq2 or eq2 - eq1 read the same relationship),
  // but the working box always shows the canonical form so later
  // steps stay consistent with it.
  function checkEliminate(){
    var parsed = parseSingleVarEquation(els.eliminateInput.value, current.eliminatedOtherVar);
    var elimRhsNum = fracNum(current.elimRhs);
    var ok = !!parsed &&
      ((close(parsed.coeff, current.elimCoeff) && close(parsed.rhs, elimRhsNum)) ||
       (close(parsed.coeff, -current.elimCoeff) && close(parsed.rhs, -elimRhsNum)));
    els.eliminateInput.classList.toggle('right', ok); els.eliminateInput.classList.toggle('wrong', !ok);
    var correctStr = formatSingleVarEquation(current.elimCoeff, current.eliminatedOtherVar, current.elimRhs);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  // expected is a { num, den } fraction (otherVarVal/eliminatedOtherVal
  // — themselves just x0 or y0, which are fractions now — see the
  // "Exact rational arithmetic" note).
  function checkSolveFirst(){
    var val = parseFraction(els.solveFirstInput.value);
    var expected = current.method === 'substitution' ? current.otherVarVal : current.eliminatedOtherVal;
    var label = current.method === 'substitution' ? current.otherVar : current.eliminatedOtherVar;
    var expectedStr = formatRational(expected.num, expected.den);
    var ok = !isNaN(val) && Math.abs(val - fracNum(expected)) < 0.01;
    els.solveFirstInput.classList.toggle('right', ok); els.solveFirstInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — ' + label + ' = ' + expectedStr + '.') : ('Not quite. ' + label + ' = ' + expectedStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(label + ' = ' + expectedStr);
    return ok;
  }

  function checkSolveSecond(){
    var val = parseFraction(els.solveSecondInput.value);
    var expected = current.method === 'substitution' ? current.subVarVal : current.targetVal;
    var label = current.method === 'substitution' ? current.subVar : current.targetVar;
    var expectedStr = formatRational(expected.num, expected.den);
    var ok = !isNaN(val) && Math.abs(val - fracNum(expected)) < 0.01;
    els.solveSecondInput.classList.toggle('right', ok); els.solveSecondInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — ' + label + ' = ' + expectedStr + '.') : ('Not quite. ' + label + ' = ' + expectedStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(label + ' = ' + expectedStr);
    return ok;
  }

  function checkStep(name){
    if(name === 'rearrange') return checkRearrange();
    if(name === 'multipliers') return checkMultipliers();
    if(name === 'multiply-equations') return checkMultiplyEquations();
    if(name === 'eliminate') return checkEliminate();
    if(name === 'solve-first') return checkSolveFirst();
    if(name === 'solve-second') return checkSolveSecond();
    return false;
  }

  // ---- Checking: the final, scored "equation" step -------------------

  function checkEquationStep(){
    if(!current) return false;
    var xVal = parseFraction(els.eqX.value);
    var yVal = parseFraction(els.eqY.value);
    var xOk = !isNaN(xVal) && Math.abs(xVal - fracNum(current.x0)) < 0.01;
    var yOk = !isNaN(yVal) && Math.abs(yVal - fracNum(current.y0)) < 0.01;
    els.eqX.classList.toggle('right', xOk); els.eqX.classList.toggle('wrong', !xOk);
    els.eqY.classList.toggle('right', yOk); els.eqY.classList.toggle('wrong', !yOk);
    var ok = xOk && yOk;
    var xStr = formatRational(current.x0.num, current.x0.den);
    var yStr = formatRational(current.y0.num, current.y0.den);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — x = ' + xStr + ', y = ' + yStr + '.';
      els.feedback.className = 'feedback correct';
    } else {
      els.feedback.textContent = 'Not quite. The solution is x = ' + xStr + ', y = ' + yStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    if(ok) working.push('(x, y) = (' + xStr + ', ' + yStr + ')');
    return true;
  }

  // ---- Check/Continue/Next button --------------------------------

  function handleCheckOrAdvance(){
    var name = currentStepName();
    if(isFinalStep()){
      if(!answered){
        var scored = checkEquationStep();
        if(scored){
          answered = true;
          els.checkBtn.textContent = 'Next question';
        }
      } else {
        nextQuestion();
      }
      return;
    }
    if(isChoiceStep(name)){
      // Choice steps are answered by clicking one of the choice
      // buttons directly; this button only ever advances once one
      // has been picked correctly.
      if(stepAnswered) advanceStep();
      return;
    }
    if(!stepAnswered){
      var ok = checkStep(name);
      if(ok){
        stepAnswered = true;
        els.checkBtn.textContent = 'Continue';
      }
    } else {
      advanceStep();
    }
  }

  function init(opts){
    opts = opts || {};
    els.eq1 = document.getElementById('sim-eq1');
    els.eq2 = document.getElementById('sim-eq2');
    els.workingCard = document.getElementById('sim-working-card');
    els.workingLines = document.getElementById('sim-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);
    els.modeNote = document.getElementById('sim-mode-note');
    els.stepPrompt = document.getElementById('sim-step-prompt');
    els.hint = document.getElementById('sim-hint');
    els.feedback = document.getElementById('sim-feedback');
    els.score = document.getElementById('sim-score');
    els.scoreRow = document.getElementById('sim-score-row');
    els.checkBtn = document.getElementById('sim-check-btn');
    els.nextBtn = document.getElementById('sim-next-btn');
    els.backBtn = document.getElementById('sim-back-btn');

    els.choiceElimination = document.getElementById('sim-choice-elimination');
    els.choiceSubstitution = document.getElementById('sim-choice-substitution');
    els.pickX = document.getElementById('sim-pick-x');
    els.pickY = document.getElementById('sim-pick-y');
    els.rearrangeLabel = document.getElementById('sim-rearrange-label');
    els.rearrangeCoeff = document.getElementById('sim-rearrange-coeff');
    els.rearrangeVarLabel = document.getElementById('sim-rearrange-varlabel');
    els.rearrangeConst = document.getElementById('sim-rearrange-const');
    els.multA = document.getElementById('sim-mult-a');
    els.multB = document.getElementById('sim-mult-b');
    els.multiplyEq1Label = document.getElementById('sim-multiply-eq1-label');
    els.multipliedEq1 = document.getElementById('sim-multiplied-eq1');
    els.multiplyEq2Label = document.getElementById('sim-multiply-eq2-label');
    els.multipliedEq2 = document.getElementById('sim-multiplied-eq2');
    els.eliminateInput = document.getElementById('sim-eliminate-input');
    els.solveFirstLabel = document.getElementById('sim-solve-first-label');
    els.solveFirstInput = document.getElementById('sim-solve-first-input');
    els.solveSecondLabel = document.getElementById('sim-solve-second-label');
    els.solveSecondInput = document.getElementById('sim-solve-second-input');
    els.eqX = document.getElementById('sim-eq-x');
    els.eqY = document.getElementById('sim-eq-y');

    els.rowsByName = {
      'choose-method': document.getElementById('sim-step-choose-method'),
      'pick-variable': document.getElementById('sim-step-pick-variable'),
      rearrange: document.getElementById('sim-step-rearrange'),
      multipliers: document.getElementById('sim-step-multipliers'),
      'multiply-equations': document.getElementById('sim-step-multiply-equations'),
      eliminate: document.getElementById('sim-step-eliminate'),
      'solve-first': document.getElementById('sim-step-solve-first'),
      'solve-second': document.getElementById('sim-step-solve-second'),
      equation: document.getElementById('sim-step-equation')
    };
    els.rows = Object.keys(els.rowsByName).map(function(k){ return els.rowsByName[k]; });

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    els.choiceSubstitution.addEventListener('click', function(){
      selectMethod('substitution', els.choiceSubstitution, els.choiceElimination);
    });
    els.choiceElimination.addEventListener('click', function(){
      selectMethod('elimination', els.choiceElimination, els.choiceSubstitution);
    });
    els.pickX.addEventListener('click', function(){
      selectVariable('x', els.pickX, els.pickY);
    });
    els.pickY.addEventListener('click', function(){
      selectVariable('y', els.pickY, els.pickX);
    });

    [els.rearrangeCoeff, els.rearrangeConst, els.multA, els.multB,
     els.multipliedEq1, els.multipliedEq2, els.eliminateInput,
     els.solveFirstInput, els.solveSecondInput, els.eqX, els.eqY].forEach(function(input){
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
