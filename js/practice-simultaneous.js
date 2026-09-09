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
         chosen variable's coefficients match, say whether to add or
         subtract to eliminate it, then solve for the other
         variable, then solve for the eliminated one.
     - 5 or more questions answered AND accuracy at 50% or higher: no
       scaffolding — just solve the system and enter x and y.

   Only the final "solution" step is scored; every scaffold step
   before it is ungraded (must be answered correctly to move on, but
   doesn't affect accuracy) — same convention as every other
   Practice component's step walkthroughs (see the note at the top
   of practice-parabola-intercepts.js).

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

    current = {
      aX: aX, aY: aY, aC: aC, p: p, q: q, bC: bC, x0: x0, y0: y0,
      targetVar: targetVar, multA: multA, multB: multB, operation: operation,
      eliminatedOtherVar: eliminatedOtherVar, eliminatedOtherVal: eliminatedOtherVal, targetVal: targetVal,
      method: null    // set once the student picks it on the "choose-method" step
      // subVar/otherVar/otherCoeff/rearrangeConst/subVarVal/otherVarVal are
      // set once the student picks a variable on the "pick-variable" step
      // (see selectVariable) — which one avoids fractions depends on that
      // free choice, not on anything decided up front.
    };

    var scaffold = needsScaffold();
    steps = scaffold ? ['choose-method'] : ['equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    els.modeNote.textContent = scaffold ? '' : "You've got this — just solve it directly.";

    renderEquations();
    renderStep();
  }

  // The steps that follow once the student has picked a method —
  // appended to `steps` at that point, since which ones apply
  // depends on their choice.
  function methodSteps(method){
    return method === 'substitution'
      ? ['pick-variable', 'rearrange', 'solve-first', 'solve-second', 'equation']
      : ['multipliers', 'operation', 'solve-first', 'solve-second', 'equation'];
  }

  function formatEquation(a, b, c){
    var terms = (a < 0 ? '-' : '') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x';
    terms += (b < 0 ? ' - ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'y';
    return terms + ' = ' + c;
  }

  function renderEquations(){
    els.eq1.textContent = formatEquation(current.aX, current.aY, current.aC);
    els.eq2.textContent = formatEquation(current.p, current.q, current.bC);
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
    'multipliers', 'operation', 'solve-first', 'solve-second', 'equation'
  ];
  var CHOICE_STEPS = ['choose-method', 'pick-variable', 'operation'];

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
      case 'multipliers': return n + 'What should you multiply each equation by so the ' + current.targetVar + '-coefficients match?';
      case 'operation': return n + 'Should you add or subtract the two new equations to eliminate ' + current.targetVar + '?';
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
        return 'Multiply so both equations end up with the same-size ' + current.targetVar + '-coefficient.';
      case 'operation':
        return 'If the matching coefficients have the same sign, subtract; if opposite signs, add.';
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
      rearrange: els.rearrangeCoeff, multipliers: els.multA, operation: els.opAdd,
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

  function checkChoiceValue(name, value){
    if(name === 'operation') return value === current.operation;
    return false;
  }

  function choiceFeedback(name, value, ok){
    if(name === 'operation'){
      return ok ? ('Correct — ' + current.operation + ' the two equations to eliminate ' + current.targetVar + '.')
                : ('Not quite — the ' + current.targetVar + '-coefficients are ' +
                   (current.operation === 'subtract' ? 'the same sign' : 'opposite signs') +
                   ', so you should ' + current.operation + ' them.');
    }
    return '';
  }

  function handleChoiceClick(name, value, btnEl, siblingBtns){
    if(stepAnswered) return;
    var ok = checkChoiceValue(name, value);
    btnEl.classList.toggle('right', ok);
    btnEl.classList.toggle('wrong', !ok);
    els.feedback.textContent = choiceFeedback(name, value, ok);
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok){
      stepAnswered = true;
      siblingBtns.forEach(function(b){ b.disabled = true; });
      btnEl.disabled = true;
      els.checkBtn.disabled = false;
      els.checkBtn.textContent = 'Continue';
    }
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
    return ok;
  }

  function checkMultipliers(){
    var a = parseFraction(els.multA.value);
    var b = parseFraction(els.multB.value);
    var aOk = !isNaN(a) && Math.abs(a - current.multA) < 0.01;
    var bOk = !isNaN(b) && Math.abs(b - current.multB) < 0.01;
    els.multA.classList.toggle('right', aOk); els.multA.classList.toggle('wrong', !aOk);
    els.multB.classList.toggle('right', bOk); els.multB.classList.toggle('wrong', !bOk);
    var ok = aOk && bOk;
    els.feedback.textContent = ok ?
      ('Correct — equation 1 × ' + current.multA + ', equation 2 × ' + current.multB + '.') :
      ('Not quite. Multiply equation 1 by ' + current.multA + ' and equation 2 by ' + current.multB + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
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
    return ok;
  }

  function checkStep(name){
    if(name === 'rearrange') return checkRearrange();
    if(name === 'multipliers') return checkMultipliers();
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
    els.opAdd = document.getElementById('sim-op-add');
    els.opSubtract = document.getElementById('sim-op-subtract');
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
      operation: document.getElementById('sim-step-operation'),
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
    els.opAdd.addEventListener('click', function(){
      handleChoiceClick('operation', 'add', els.opAdd, [els.opSubtract]);
    });
    els.opSubtract.addEventListener('click', function(){
      handleChoiceClick('operation', 'subtract', els.opSubtract, [els.opAdd]);
    });

    [els.rearrangeCoeff, els.rearrangeConst, els.multA, els.multB,
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
