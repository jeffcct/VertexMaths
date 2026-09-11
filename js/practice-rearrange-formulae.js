/* ============================================================
   practice-rearrange-formulae.js — the PracticeRearrangeFormulae
   component: a question generator for "Rearranging formulae".

   Unlike the old version of this component (generic P = coeff*Q +
   constant with random letters and coefficients), this one uses a
   fixed BANK of real, recognisable formulae — speed, force, density,
   SUVAT, circle area, Pythagoras, perimeter, Ohm's law, cylinder
   volume, pendulum period — each with a hardcoded, hand-checked
   sequence of rearrangement steps for each variable it can be made
   the subject of. There's no symbolic algebra engine here: every
   (formula, subject) pair's steps and their resulting equations are
   authored directly, matching this codebase's usual philosophy of
   precomputed correct answers rather than a live CAS.

   The core complaint this redesign answers is that the old scaffold
   forced a fixed "move the constant, then divide" shape onto every
   question, which doesn't fit formulae that need a different set of
   operations (clearing a fraction, squaring, square-rooting) or that
   have no constant term at all. Instead, each hardcoded step is
   walked through in two halves:
     1. an action-choice step — the current equation is shown, and
        the student picks which of 4 actions (1 correct + 3
        distractors built from "multiply/divide/add/subtract by a
        symbol in the current equation", "square both sides" or
        "take the square root of both sides") is the right thing to
        do next. Picking wrong just gives feedback and disables that
        option so they can try again — it never reveals the right
        answer outright.
     2. a write step — once the right action is picked, the student
        writes the resulting equation themselves. This (like every
        ungraded scaffold step elsewhere in this codebase) reveals
        the correct string if they get it wrong, but only advances
        once they've entered it correctly.
   Every pair before the last one is ungraded scaffolding; only the
   final write step (the fully rearranged formula) is scored.

   Below 3 questions answered, or under 90% accuracy, that full
   action/write walkthrough runs for every hardcoded step. At 3+
   questions and 90%+ accuracy, the scaffold is skipped entirely and
   the question goes straight to a single "make X the subject" step —
   same adaptive-difficulty convention as every other Practice
   component.

   Equations are checked with simple, tolerant string comparison
   (see normalizeEqStr/equationsMatch) rather than per-formula regex:
   whitespace is ignored, either side may come first (via
   VM.EquationParse.parseEitherSide), "sqrt(...)" is accepted for
   "√(...)", "pi"/"rho" for "π"/"ρ", and "^2" for "²". This is enough
   because every expected string is fixed, authored content — there's
   no need to parse out arbitrary numeric coefficients the way the
   line/parabola generators do.

   Public API: VM.PracticeRearrangeFormulae.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeRearrangeFormulae = (function(){
  var parseEitherSide = VM.EquationParse.parseEitherSide;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  // ---- The formula bank ---------------------------------------------
  // Each formula lists the variables it relates and, per subject it
  // can be rearranged for, an ordered list of steps. Each step is:
  //   action: { type, operand } — operand is a symbol/term string for
  //     multiply/divide/add/subtract, and omitted for square/sqrt.
  //   symbols: the terms that actually appear in the equation THIS
  //     step starts from — the pool that action-choice distractors
  //     for this step are built from, so they always look tempting
  //     (real symbols from the equation on screen) but are wrong.
  //   result: the equation after doing `action`, exactly as it should
  //     be written (subject conventionally on the left once solved).
  var FORMULA_BANK = [
    {
      name: 'Speed',
      given: 'v = d/t',
      subjects: {
        d: { steps: [
          { action: { type: 'multiply', operand: 't' }, symbols: ['v', 'd', 't'], result: 'd = vt' }
        ] },
        t: { steps: [
          { action: { type: 'multiply', operand: 't' }, symbols: ['v', 'd', 't'], result: 'vt = d' },
          { action: { type: 'divide', operand: 'v' }, symbols: ['v', 'd', 't'], result: 't = d/v' }
        ] }
      }
    },
    {
      name: "Newton's second law (force)",
      given: 'F = ma',
      subjects: {
        m: { steps: [
          { action: { type: 'divide', operand: 'a' }, symbols: ['F', 'm', 'a'], result: 'm = F/a' }
        ] },
        a: { steps: [
          { action: { type: 'divide', operand: 'm' }, symbols: ['F', 'm', 'a'], result: 'a = F/m' }
        ] }
      }
    },
    {
      name: 'Density',
      given: 'ρ = m/V',
      subjects: {
        m: { steps: [
          { action: { type: 'multiply', operand: 'V' }, symbols: ['ρ', 'm', 'V'], result: 'm = ρV' }
        ] },
        V: { steps: [
          { action: { type: 'multiply', operand: 'V' }, symbols: ['ρ', 'm', 'V'], result: 'ρV = m' },
          { action: { type: 'divide', operand: 'ρ' }, symbols: ['ρ', 'm', 'V'], result: 'V = m/ρ' }
        ] }
      }
    },
    {
      name: 'Kinematics (SUVAT)',
      given: 'v = u + at',
      subjects: {
        u: { steps: [
          { action: { type: 'subtract', operand: 'at' }, symbols: ['v', 'u', 'a', 't', 'at'], result: 'u = v - at' }
        ] },
        a: { steps: [
          { action: { type: 'subtract', operand: 'u' }, symbols: ['v', 'u', 'a', 't'], result: 'v - u = at' },
          { action: { type: 'divide', operand: 't' }, symbols: ['v', 'u', 'a', 't'], result: 'a = (v - u)/t' }
        ] },
        t: { steps: [
          { action: { type: 'subtract', operand: 'u' }, symbols: ['v', 'u', 'a', 't'], result: 'v - u = at' },
          { action: { type: 'divide', operand: 'a' }, symbols: ['v', 'u', 'a', 't'], result: 't = (v - u)/a' }
        ] }
      }
    },
    {
      name: 'Circle area',
      given: 'A = πr²',
      subjects: {
        r: { steps: [
          { action: { type: 'divide', operand: 'π' }, symbols: ['A', 'π', 'r', 'r²'], result: 'A/π = r²' },
          { action: { type: 'sqrt' }, symbols: ['A', 'π', 'r'], result: 'r = √(A/π)' }
        ] }
      }
    },
    {
      name: "Pythagoras' theorem",
      given: 'c² = a² + b²',
      subjects: {
        a: { steps: [
          { action: { type: 'subtract', operand: 'b²' }, symbols: ['c²', 'a²', 'b²'], result: 'c² - b² = a²' },
          { action: { type: 'sqrt' }, symbols: ['c', 'a', 'b'], result: 'a = √(c² - b²)' }
        ] },
        b: { steps: [
          { action: { type: 'subtract', operand: 'a²' }, symbols: ['c²', 'a²', 'b²'], result: 'c² - a² = b²' },
          { action: { type: 'sqrt' }, symbols: ['c', 'a', 'b'], result: 'b = √(c² - a²)' }
        ] }
      }
    },
    {
      name: 'Perimeter of a rectangle',
      given: 'P = 2l + 2w',
      subjects: {
        l: { steps: [
          { action: { type: 'subtract', operand: '2w' }, symbols: ['P', '2l', '2w'], result: 'P - 2w = 2l' },
          { action: { type: 'divide', operand: '2' }, symbols: ['P', '2', '2w'], result: 'l = (P - 2w)/2' }
        ] },
        w: { steps: [
          { action: { type: 'subtract', operand: '2l' }, symbols: ['P', '2l', '2w'], result: 'P - 2l = 2w' },
          { action: { type: 'divide', operand: '2' }, symbols: ['P', '2', '2l'], result: 'w = (P - 2l)/2' }
        ] }
      }
    },
    {
      name: "Ohm's law",
      given: 'V = IR',
      subjects: {
        I: { steps: [
          { action: { type: 'divide', operand: 'R' }, symbols: ['V', 'I', 'R'], result: 'I = V/R' }
        ] },
        R: { steps: [
          { action: { type: 'divide', operand: 'I' }, symbols: ['V', 'I', 'R'], result: 'R = V/I' }
        ] }
      }
    },
    {
      name: 'Volume of a cylinder',
      given: 'V = πr²h',
      subjects: {
        h: { steps: [
          { action: { type: 'divide', operand: 'πr²' }, symbols: ['V', 'π', 'r²', 'h', 'πr²'], result: 'h = V/(πr²)' }
        ] }
      }
    },
    {
      name: 'Pendulum period',
      given: 'T = 2π√(L/g)',
      subjects: {
        L: { steps: [
          { action: { type: 'divide', operand: '2π' }, symbols: ['T', '2π', 'L', 'g'], result: 'T/(2π) = √(L/g)' },
          { action: { type: 'square' }, symbols: ['T', 'L', 'g'], result: '(T/(2π))² = L/g' },
          { action: { type: 'multiply', operand: 'g' }, symbols: ['T', 'L', 'g'], result: 'L = g(T/(2π))²' }
        ] }
      }
    }
  ];

  // Every (formula, subject) pair, flattened once — nextQuestion picks
  // uniformly from this rather than a formula then a subject, so
  // formulae with more subjects aren't picked disproportionately less
  // often per-subject than formulae with only one.
  var ALL_PAIRS = [];
  FORMULA_BANK.forEach(function(formula){
    Object.keys(formula.subjects).forEach(function(subject){
      ALL_PAIRS.push({ formula: formula, subject: subject, steps: formula.subjects[subject].steps });
    });
  });

  var els = {};
  var current = null;    // { formula, subject, stepData, currentEq }
  var score = { correct: 0, attempted: 0 };
  var steps = [];         // flat list of step names for this question, e.g. ['choice-0','write-0','choice-1','write-1']
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isChoiceStep(name){ return name.indexOf('choice-') === 0; }
  function lastStepIdx(){ return current.stepData.length - 1; }
  function isFinalStep(name){ return name === 'final' || name === ('write-' + lastStepIdx()); }

  // ---- Tolerant equation comparison -----------------------------------
  // Every expected string is fixed, authored content, so this doesn't
  // need to be a real parser — just forgiving enough to not fail a
  // student over formatting: whitespace, "sqrt"/"pi"/"rho" instead of
  // √/π/ρ, "^2" instead of ², and stray "*"/"×" for multiplication.
  function normalizeEqStr(raw){
    var s = (raw || '').toLowerCase();
    s = s.replace(/\s+/g, '');
    s = s.replace(/[*×]/g, '');
    s = s.replace(/sqrt/g, '√');
    s = s.replace(/rho/g, 'ρ');
    s = s.replace(/pi/g, 'π');
    s = s.replace(/\^2/g, '²');
    return s;
  }

  // Accepts the sides swapped too, via the shared parseEitherSide
  // helper (it re-splits the raw string on '=' and retries).
  function equationsMatch(raw, expected){
    var expectedNorm = normalizeEqStr(expected);
    var result = parseEitherSide(raw, function(s){
      return normalizeEqStr(s) === expectedNorm ? true : null;
    });
    return !!result;
  }

  // ---- Action formatting / distractors --------------------------------

  function actionLabel(a){
    switch(a.type){
      case 'multiply': return 'Multiply both sides by ' + a.operand;
      case 'divide': return 'Divide both sides by ' + a.operand;
      case 'add': return 'Add ' + a.operand + ' to both sides';
      case 'subtract': return 'Subtract ' + a.operand + ' from both sides';
      case 'square': return 'Square both sides';
      case 'sqrt': return 'Take the square root of both sides';
    }
  }

  function actionsEqual(a, b){ return a.type === b.type && (a.operand || '') === (b.operand || ''); }

  // 3 wrong-but-plausible actions for this step, built only from
  // symbols that actually appear in the equation on screen — so e.g.
  // if the correct move is "divide both sides by a", a distractor
  // might be "multiply both sides by a" (same symbol, wrong
  // operation) or "subtract t from both sides" (different symbol
  // that's genuinely in the equation, wrong operation for isolating
  // the subject here).
  function buildDistractors(step){
    var correct = step.action;
    var pool = [];
    step.symbols.forEach(function(sym){
      ['multiply', 'divide', 'add', 'subtract'].forEach(function(type){
        pool.push({ type: type, operand: sym });
      });
    });
    pool.push({ type: 'square' });
    pool.push({ type: 'sqrt' });
    pool = pool.filter(function(o){ return !actionsEqual(o, correct); });

    var distractors = [];
    // Prefer leading with a same-symbol, different-operation
    // alternative first, when the correct action has an operand —
    // that's the most tempting kind of wrong option.
    if(correct.operand){
      var sameOperand = pool.filter(function(o){ return o.operand === correct.operand; });
      if(sameOperand.length){
        var pick = randChoice(sameOperand);
        distractors.push(pick);
        pool = pool.filter(function(o){ return o !== pick; });
      }
    }
    while(distractors.length < 3 && pool.length){
      var idx = randInt(0, pool.length - 1);
      distractors.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return distractors;
  }

  function shuffledOptions(step){
    var options = buildDistractors(step).concat([step.action]);
    for(var i = options.length - 1; i > 0; i--){
      var j = randInt(0, i);
      var t = options[i]; options[i] = options[j]; options[j] = t;
    }
    return options;
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var pair = randChoice(ALL_PAIRS);
    current = {
      formula: pair.formula, subject: pair.subject,
      stepData: pair.steps, currentEq: pair.formula.given
    };

    var scaffold = needsScaffold();
    if(scaffold){
      steps = [];
      current.stepData.forEach(function(_, i){ steps.push('choice-' + i, 'write-' + i); });
    } else {
      steps = ['final'];
    }
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' :
      "You've got this — go straight to making " + current.subject + " the subject.";

    renderGiven();
    renderStep();
  }

  function renderGiven(){
    els.formulaLabel.textContent = current.formula.name;
    els.given.textContent = current.formula.given;
  }

  // ---- Step prompt / hint ---------------------------------------------

  function stepPrompt(name){
    if(name === 'final') return 'Make ' + current.subject + ' the subject.';
    var n = 'Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ';
    if(isChoiceStep(name)){
      var idx = parseInt(name.slice('choice-'.length), 10);
      return n + (idx === 0
        ? ('You need to find ' + current.subject + ' — what should you do first?')
        : 'What should you do next?');
    }
    var writeIdx = parseInt(name.slice('write-'.length), 10);
    var isLast = writeIdx === lastStepIdx();
    return n + 'Write the new equation after doing that.' +
      (isLast ? ' This is the fully rearranged formula, with ' + current.subject + ' alone on one side.' : '');
  }

  function stepHint(name){
    if(name === 'final'){
      return 'Keep undoing one operation at a time, on both sides, until the subject is alone on one side. ' +
        'For example, rearranging y = mx + c for x eventually gives x = (y - c)/m.';
    }
    if(isChoiceStep(name)){
      return 'Look at what operation currently connects ' + current.subject + ' to the rest of the equation — ' +
        'multiplied, divided, added, subtracted, squared, or under a square root — and undo it by doing the ' +
        'same thing to both sides.';
    }
    return 'Carry out the action you just chose on both sides of the current equation, then simplify.';
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderChoiceButtons(step){
    els.choiceRow.innerHTML = '';
    var options = shuffledOptions(step);
    var buttons = options.map(function(){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      return btn;
    });
    options.forEach(function(action, i){
      var btn = buttons[i];
      btn.textContent = actionLabel(action);
      btn.addEventListener('click', function(){ handleChoiceClick(step, action, btn, buttons); });
      els.choiceRow.appendChild(btn);
    });
  }

  function renderStep(){
    var name = currentStepName();
    var showCurrentEq = name !== 'final';
    els.currentEqWrap.hidden = !showCurrentEq;
    if(showCurrentEq) els.currentEq.textContent = current.currentEq;

    els.stepChoice.hidden = !isChoiceStep(name);
    els.stepWrite.hidden = !(name.indexOf('write-') === 0);
    els.stepFinal.hidden = (name !== 'final');

    if(isChoiceStep(name)){
      var idx = parseInt(name.slice('choice-'.length), 10);
      renderChoiceButtons(current.stepData[idx]);
    }
    if(name.indexOf('write-') === 0) clearInputs([els.writeInput]);
    if(name === 'final') clearInputs([els.finalInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.checkBtn.disabled = isChoiceStep(name);

    if(name.indexOf('write-') === 0) els.writeInput.focus();
    if(name === 'final') els.finalInput.focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: the action-choice step (clicked directly) -----------

  function handleChoiceClick(step, action, btnEl, allBtns){
    if(stepAnswered) return;
    var ok = actionsEqual(action, step.action);
    if(ok){
      btnEl.classList.add('right');
      allBtns.forEach(function(b){ b.disabled = true; });
      els.feedback.textContent = 'Correct — ' + actionLabel(action) + '. Now write the new equation.';
      els.feedback.className = 'feedback correct';
      stepAnswered = true;
      els.checkBtn.disabled = false;
      els.checkBtn.textContent = 'Continue';
    } else {
      btnEl.classList.add('wrong');
      btnEl.disabled = true;
      els.feedback.textContent = 'Not quite — that won’t correctly isolate ' + current.subject + ' here. Try another option.';
      els.feedback.className = 'feedback incorrect';
    }
  }

  // ---- Checking: the write step ---------------------------------------
  // Used for every write-<n> step. Ungraded ones (isFinal=false) must
  // be answered correctly to advance — same convention as every other
  // ungraded scaffold step in this codebase, right down to revealing
  // the correct string on a wrong attempt. The last write-<n> step is
  // also the scored step (isFinal=true): the attempt always counts,
  // right or wrong, and the correct string is always shown before
  // moving on — same convention as every other generator's final step.
  function checkWriteStep(idx, isFinal){
    var step = current.stepData[idx];
    var ok = equationsMatch(els.writeInput.value, step.result);
    els.writeInput.classList.toggle('right', ok); els.writeInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — ' + step.result + '.') : ('Not quite. It should be ' + step.result + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok){
      current.currentEq = step.result;
      working.push(actionLabel(step.action) + ' → ' + step.result);
    }
    if(isFinal){
      score.attempted++;
      if(ok) score.correct++;
      els.score.textContent = score.correct + ' / ' + score.attempted;
    }
    return ok;
  }

  // ---- Checking: the direct final step (adaptive tier, no scaffold) --

  function checkFinalAnswer(){
    var expected = current.stepData[lastStepIdx()].result;
    var ok = equationsMatch(els.finalInput.value, expected);
    els.finalInput.classList.toggle('right', ok); els.finalInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + expected + '.';
      els.feedback.className = 'feedback correct';
      working.push(expected);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + expected + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
  }

  // ---- Check/Continue/Next button --------------------------------

  function handleCheckOrAdvance(){
    var name = currentStepName();
    if(isFinalStep(name)){
      if(!answered){
        if(name === 'final') checkFinalAnswer();
        else checkWriteStep(parseInt(name.slice('write-'.length), 10), true);
        answered = true;
        els.checkBtn.textContent = 'Next question';
      } else {
        nextQuestion();
      }
      return;
    }
    if(isChoiceStep(name)){
      // Choice steps are answered by clicking a choice button
      // directly; this button only ever advances once one has been
      // picked correctly (see renderStep, which disables it until then).
      if(stepAnswered) advanceStep();
      return;
    }
    if(!stepAnswered){
      var ok = checkWriteStep(parseInt(name.slice('write-'.length), 10), false);
      if(ok){ stepAnswered = true; els.checkBtn.textContent = 'Continue'; }
    } else {
      advanceStep();
    }
  }

  function init(opts){
    opts = opts || {};
    els.formulaLabel = document.getElementById('formula-equation-label');
    els.given = document.getElementById('formula-given');
    els.modeNote = document.getElementById('formula-mode-note');
    els.stepPrompt = document.getElementById('formula-step-prompt');
    els.currentEqWrap = document.getElementById('formula-current-eq-wrap');
    els.currentEq = document.getElementById('formula-current-eq');
    els.hint = document.getElementById('formula-hint');
    els.feedback = document.getElementById('formula-feedback');
    els.score = document.getElementById('formula-score');
    els.checkBtn = document.getElementById('formula-check-btn');
    els.nextBtn = document.getElementById('formula-next-btn');
    els.backBtn = document.getElementById('formula-back-btn');
    els.workingCard = document.getElementById('formula-working-card');
    els.workingLines = document.getElementById('formula-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.stepChoice = document.getElementById('formula-step-choice');
    els.choiceRow = document.getElementById('formula-choice-row');
    els.stepWrite = document.getElementById('formula-step-write');
    els.writeInput = document.getElementById('formula-write-input');
    els.stepFinal = document.getElementById('formula-step-final');
    els.finalInput = document.getElementById('formula-final-input');

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.writeInput, els.finalInput].forEach(function(input){
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
