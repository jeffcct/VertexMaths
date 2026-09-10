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
         works; picking the one whose coefficient isn't 1 just means
         rearranging with a fraction) and rearrange for it, then
         solve for the other variable, then solve for the picked one.
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

  // eqB's coefficients, and eqA's non-unit coefficient, are drawn
  // from this set (never 0, never ±1 — ±1 is reserved for whichever
  // side of eqA is the deliberately-isolable one).
  var OTHER_COEFFS = [-3, -2, 2, 3];

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

  // The two equations after multiplying every term by multA/multB, and
  // the one-variable equation left after adding/subtracting those —
  // shared by question generation and by checkMultipliers, since a
  // student can pick a different (but equally valid) multiplier pair
  // than the one generated, and everything downstream has to follow it.
  function computeElimination(aX, aY, aC, p, q, bC, targetVar, operation, multA, multB){
    var multEq1 = { a: aX * multA, b: aY * multA, c: aC * multA };
    var multEq2 = { a: p * multB, b: q * multB, c: bC * multB };
    var elimCoeff = operation === 'subtract'
      ? (targetVar === 'x' ? multEq1.b - multEq2.b : multEq1.a - multEq2.a)
      : (targetVar === 'x' ? multEq1.b + multEq2.b : multEq1.a + multEq2.a);
    var elimRhs = operation === 'subtract' ? multEq1.c - multEq2.c : multEq1.c + multEq2.c;
    return { multEq1: multEq1, multEq2: multEq2, elimCoeff: elimCoeff, elimRhs: elimRhs };
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var x0 = randInt(-6, 6); if(x0 === 0) x0 = 1;
    var y0 = randInt(-6, 6); if(y0 === 0) y0 = 1;

    // eqA always has a coefficient of exactly 1 on one variable
    // (chosen at random), so it can always be rearranged for that
    // variable without introducing a fraction.
    var xIsUnit = Math.random() < 0.5;
    var m = randChoice(OTHER_COEFFS);
    var aX = xIsUnit ? 1 : m;
    var aY = xIsUnit ? m : 1;
    var aC = aX * x0 + aY * y0;

    // eqB: general coefficients, regenerated until the system has a
    // unique solution (determinant aX*q - aY*p != 0) — with these
    // curated coefficient pools that's true of every combination, so
    // this never actually loops, but it's cheap insurance if the
    // pools above ever change.
    var p, q;
    do {
      p = randChoice(OTHER_COEFFS);
      q = randChoice(OTHER_COEFFS);
    } while (aX * q - aY * p === 0);
    var bC = p * x0 + q * y0;

    var targetVar = randChoice(['x', 'y']);   // variable to eliminate
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
      // subVar/otherVar/otherCoeff/rearrangeConst/subVarVal/otherVarVal are
      // set once the student picks a variable on the "pick-variable" step
      // (see selectVariable) — which one avoids fractions depends on that
      // free choice, not on anything decided up front.
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

  function formatEquation(a, b, c){
    var terms = (a < 0 ? '-' : '') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x';
    terms += (b < 0 ? ' - ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'y';
    return terms + ' = ' + c;
  }

  function formatSingleVarEquation(coeff, varName, rhs){
    var coeffStr = coeff === 1 ? '' : (coeff === -1 ? '-' : String(coeff));
    return coeffStr + varName + ' = ' + rhs;
  }

  function renderEquations(){
    els.eq1.textContent = formatEquation(current.aX, current.aY, current.aC);
    els.eq2.textContent = formatEquation(current.p, current.q, current.bC);
  }

  // "9x + 6y = 15" — both terms present, x before y, matching how
  // formatEquation always displays a two-variable equation. Also
  // accepts the constant written first, e.g. "15 = 9x + 6y".
  function parseLinearEquation(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var m = s.match(/^([+-]?\d*)x([+-])(\d*)y=([+-]?\d+)$/);
      if(!m) return null;
      var a = parseGradient(m[1]);
      if(isNaN(a)) return null;
      var b = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseInt(m[3], 10));
      var c = parseFloat(m[4]);
      if(isNaN(c)) return null;
      return { a: a, b: b, c: c };
    });
  }

  // "4y = -16" or "y = -16" or "-y = 16" — a single-variable equation
  // in whichever letter the elimination left behind. Also accepts
  // the constant written first, e.g. "-16 = 4y".
  function parseSingleVarEquation(raw, varName){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var re = new RegExp('^([+-]?\\d*)' + varName + '=([+-]?\\d+)$');
      var m = s.match(re);
      if(!m) return null;
      var coeff = parseGradient(m[1]);
      if(isNaN(coeff)) return null;
      var rhs = parseFloat(m[2]);
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
  function rearrangedString(){
    return current.subVar + ' = ' + formatRHS(
      current.otherCoeffNum, current.otherCoeffDen, current.otherVar,
      current.rearrangeConstNum, current.rearrangeConstDen
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
      case 'rearrange': return n + 'Rearrange equation 1 to make ' + current.subVar + ' the subject.';
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
        return 'Either variable works. One of them has a coefficient of 1 in equation 1 and rearranges cleanly; the other will need a fraction.';
      case 'rearrange':
        return 'Move the ' + current.otherVar + ' term to the other side. Leave the coefficient box blank for 1, or type just - for -1.' +
          (Math.abs(current.otherCoeffDen) > 1 || Math.abs(current.rearrangeConstDen) > 1 ? ' Fractions like 1/2 are fine here.' : '');
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
  // since either works on any system; picking the one whose
  // coefficient isn't 1 just means the rearrange step needs a
  // fraction, computed here from whichever equation-1 coefficient
  // actually applies to their choice.
  function selectVariable(value, btnEl, otherBtn){
    if(stepAnswered) return;
    var otherValue = value === 'x' ? 'y' : 'x';
    var coeffChosen = value === 'x' ? current.aX : current.aY;
    var coeffOther = value === 'x' ? current.aY : current.aX;

    // chosen = (aC - coeffOther*other) / coeffChosen
    //        = (-coeffOther/coeffChosen)*other + (aC/coeffChosen)
    // Normalize so the denominator is positive, then reduce.
    var coeffNum = -coeffOther, coeffDen = coeffChosen;
    if(coeffDen < 0){ coeffNum = -coeffNum; coeffDen = -coeffDen; }
    var cg = gcd(coeffNum, coeffDen); coeffNum /= cg; coeffDen /= cg;

    var constNum = current.aC, constDen = coeffChosen;
    if(constDen < 0){ constNum = -constNum; constDen = -constDen; }
    var kg = gcd(constNum, constDen); constNum /= kg; constDen /= kg;

    current.subVar = value;
    current.otherVar = otherValue;
    current.otherCoeffNum = coeffNum;
    current.otherCoeffDen = coeffDen;
    current.otherCoeff = coeffNum / coeffDen;
    current.rearrangeConstNum = constNum;
    current.rearrangeConstDen = constDen;
    current.rearrangeConst = constNum / constDen;
    current.subVarVal = value === 'x' ? current.x0 : current.y0;
    current.otherVarVal = value === 'x' ? current.y0 : current.x0;
    setDynamicLabels();

    btnEl.classList.add('right');
    els.feedback.textContent = 'Good — let’s isolate ' + value + '.' +
      (Math.abs(coeffChosen) !== 1 ? ' Its coefficient isn’t 1, so that’ll take a fraction.' : '');
    els.feedback.className = 'feedback correct';

    stepAnswered = true;
    btnEl.disabled = true; otherBtn.disabled = true;
    els.checkBtn.disabled = false;
    els.checkBtn.textContent = 'Continue';
  }

  // ---- Checking: text-input scaffold steps ---------------------------

  function checkRearrange(){
    var coeff = parseGradient(els.rearrangeCoeff.value);
    var cst = parseFraction(els.rearrangeConst.value);
    var coeffOk = !isNaN(coeff) && Math.abs(coeff - current.otherCoeff) < 0.01;
    var cstOk = !isNaN(cst) && Math.abs(cst - current.rearrangeConst) < 0.01;
    els.rearrangeCoeff.classList.toggle('right', coeffOk); els.rearrangeCoeff.classList.toggle('wrong', !coeffOk);
    els.rearrangeConst.classList.toggle('right', cstOk); els.rearrangeConst.classList.toggle('wrong', !cstOk);
    var ok = coeffOk && cstOk;
    var correctStr = rearrangedString();
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. Rearranged, that’s ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  // Either variable is always valid to eliminate — a pair that makes
  // the x-coefficients match is just as correct as one that matches
  // the y-coefficients, even if it's not the variable generated as
  // the "default" target. So this accepts any positive pair matching
  // either variable's coefficients, then re-derives everything
  // downstream (targetVar, operation, the eliminated variable, the
  // multiplied equations) from whichever one the student's pair hits.
  function checkMultipliers(){
    var a = parseFraction(els.multA.value);
    var b = parseFraction(els.multB.value);
    var matchesX = !isNaN(a) && !isNaN(b) && a > 0 && b > 0 && close(a * Math.abs(current.aX), b * Math.abs(current.p));
    var matchesY = !isNaN(a) && !isNaN(b) && a > 0 && b > 0 && close(a * Math.abs(current.aY), b * Math.abs(current.q));
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
      current.targetVar = targetVar;
      current.operation = ((cA_t > 0) === (cB_t > 0)) ? 'subtract' : 'add';
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
    var eq1Ok = !!eq1 && close(eq1.a, current.multEq1.a) && close(eq1.b, current.multEq1.b) && close(eq1.c, current.multEq1.c);
    var eq2Ok = !!eq2 && close(eq2.a, current.multEq2.a) && close(eq2.b, current.multEq2.b) && close(eq2.c, current.multEq2.c);
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
    var ok = !!parsed &&
      ((close(parsed.coeff, current.elimCoeff) && close(parsed.rhs, current.elimRhs)) ||
       (close(parsed.coeff, -current.elimCoeff) && close(parsed.rhs, -current.elimRhs)));
    els.eliminateInput.classList.toggle('right', ok); els.eliminateInput.classList.toggle('wrong', !ok);
    var correctStr = formatSingleVarEquation(current.elimCoeff, current.eliminatedOtherVar, current.elimRhs);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  function checkSolveFirst(){
    var val = parseFraction(els.solveFirstInput.value);
    var expected = current.method === 'substitution' ? current.otherVarVal : current.eliminatedOtherVal;
    var label = current.method === 'substitution' ? current.otherVar : current.eliminatedOtherVar;
    var ok = !isNaN(val) && Math.abs(val - expected) < 0.01;
    els.solveFirstInput.classList.toggle('right', ok); els.solveFirstInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — ' + label + ' = ' + expected + '.') : ('Not quite. ' + label + ' = ' + expected + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(label + ' = ' + expected);
    return ok;
  }

  function checkSolveSecond(){
    var val = parseFraction(els.solveSecondInput.value);
    var expected = current.method === 'substitution' ? current.subVarVal : current.targetVal;
    var label = current.method === 'substitution' ? current.subVar : current.targetVar;
    var ok = !isNaN(val) && Math.abs(val - expected) < 0.01;
    els.solveSecondInput.classList.toggle('right', ok); els.solveSecondInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — ' + label + ' = ' + expected + '.') : ('Not quite. ' + label + ' = ' + expected + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(label + ' = ' + expected);
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
    var xOk = !isNaN(xVal) && Math.abs(xVal - current.x0) < 0.01;
    var yOk = !isNaN(yVal) && Math.abs(yVal - current.y0) < 0.01;
    els.eqX.classList.toggle('right', xOk); els.eqX.classList.toggle('wrong', !xOk);
    els.eqY.classList.toggle('right', yOk); els.eqY.classList.toggle('wrong', !yOk);
    var ok = xOk && yOk;

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — x = ' + current.x0 + ', y = ' + current.y0 + '.';
      els.feedback.className = 'feedback correct';
    } else {
      els.feedback.textContent = 'Not quite. The solution is x = ' + current.x0 + ', y = ' + current.y0 + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    if(ok) working.push('(x, y) = (' + current.x0 + ', ' + current.y0 + ')');
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
