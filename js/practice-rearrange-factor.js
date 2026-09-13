/* ============================================================
   practice-rearrange-factor.js — the PracticeRearrangeFactor
   component: a question generator for "Rearranging formulae with
   factoring", a harder extension of the base "Rearranging formulae"
   practice for formulae where the subject appears in TWO terms on
   the same side, so it must be factored out before it can be
   isolated (e.g. T = P + PR, factor to T = P(1 + R), then divide).

   This is a sibling of js/practice-rearrange-formulae.js and
   deliberately copies its architecture rather than importing from
   it, per this component's own fixed FORMULA_BANK of real formulae:
   an action-choice-then-write engine (the student picks the next
   operation from 4 options — 1 correct + 3 distractors — then
   writes the resulting equation; only the final write step is
   scored), with the same 3-attempts/90%-accuracy adaptive bar that
   collapses the walkthrough into a single "make X the subject" step
   once a student has shown they don't need it.

   The one thing this file adds beyond the base component's action
   vocabulary is `{ type: 'factor', operand: <subject letter> }` —
   the step where the subject is factored out of both terms on one
   side (ax + bx = c -> x(a + b) = c). Every formula in FORMULA_BANK
   here uses exactly this two-step shape: a 'factor' step, immediately
   followed by a 'divide' step that finishes the rearrangement — never
   more, since factoring-and-dividing is the whole point of this
   practice (contrast the base component, which also has root/square
   steps this one doesn't need).

   No formula here needs a square root or a rendered radical, so
   unlike the base component this one skips VM.FormulaRender /
   VM.FormulaPreview / VM.KeybindHelp entirely — equations are shown
   and typed as plain text (e.g. "P = T/(1 + R)"), and the "Working"
   trail (VM.WorkingTrail) already falls back to plain textContent
   when VM.FormulaRender isn't loaded, so no changes were needed there.

   Equations are checked with the same tolerant string comparison as
   the base component (normalizeEqStr/equationsMatch): whitespace is
   ignored, either side may come first (via
   VM.EquationParse.parseEitherSide), and "pi" is accepted for "π" —
   kept even though none of this bank's formulae currently use it,
   so a formula added later that does won't need this touched.

   On a correct final answer, feedback echoes exactly what the
   student typed (never a freshly re-derived canonical string) — see
   checkWriteStep/checkFinalAnswer.

   Public API: VM.PracticeRearrangeFactor.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeRearrangeFactor = (function(){
  var parseEitherSide = VM.EquationParse.parseEitherSide;

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  // The only bank formula needing typing help is the semicircle one
  // (uses π) — one entry, rather than the base component's full list,
  // since nothing here needs sqrt/rho/lambda.
  var FORMULA_TYPING_HELP = [
    { keys: 'pi', result: 'π', desc: 'The constant pi, e.g. P/(pi + 2)' }
  ];

  // ---- The formula bank ---------------------------------------------
  // Each formula's one subject entry lists an ordered pair of steps:
  // a 'factor' step (pull the subject out of both terms on one side)
  // followed by a 'divide' step (undo the remaining bracket
  // multiplying the subject) that finishes the rearrangement. Same
  // step shape as the base component's steps:
  //   action: { type, operand }
  //   symbols: the terms that actually appear in the equation THIS
  //     step starts from — the pool action-choice distractors for
  //     this step are built from.
  //   result: the equation after doing `action`, exactly as it
  //     should be written.
  //
  // Algebra check for each, worked by hand:
  //   T = P + PR            => T = P(1 + R)        => P = T/(1 + R)
  //   A = lw + lh           => A = l(w + h)         => l = A/(w + h)
  //   S = a + ad            => S = a(1 + d)         => a = S/(1 + d)
  //   F = ma + mg           => F = m(a + g)         => m = F/(a + g)
  //   A = P + PRT           => A = P(1 + RT)        => P = A/(1 + RT)
  //   P = πr + 2r           => P = r(π + 2)         => r = P/(π + 2)
  var FORMULA_BANK = [
    {
      name: 'Total cost including tax',
      given: 'T = P + PR',
      subject: 'P',
      steps: [
        { action: { type: 'factor', operand: 'P' }, symbols: ['T', 'P', 'PR'], result: 'T = P(1 + R)' },
        { action: { type: 'divide', operand: '1 + R' }, symbols: ['T', 'P', '1 + R'], result: 'P = T/(1 + R)' }
      ]
    },
    {
      name: 'Partial surface area of a prism',
      given: 'A = lw + lh',
      subject: 'l',
      steps: [
        { action: { type: 'factor', operand: 'l' }, symbols: ['A', 'lw', 'lh'], result: 'A = l(w + h)' },
        { action: { type: 'divide', operand: 'w + h' }, symbols: ['A', 'l', 'w + h'], result: 'l = A/(w + h)' }
      ]
    },
    {
      name: 'Sum of a two-term sequence expression',
      given: 'S = a + ad',
      subject: 'a',
      steps: [
        { action: { type: 'factor', operand: 'a' }, symbols: ['S', 'a', 'ad'], result: 'S = a(1 + d)' },
        { action: { type: 'divide', operand: '1 + d' }, symbols: ['S', 'a', '1 + d'], result: 'a = S/(1 + d)' }
      ]
    },
    {
      name: 'Net force with gravity',
      given: 'F = ma + mg',
      subject: 'm',
      steps: [
        { action: { type: 'factor', operand: 'm' }, symbols: ['F', 'ma', 'mg'], result: 'F = m(a + g)' },
        { action: { type: 'divide', operand: 'a + g' }, symbols: ['F', 'm', 'a + g'], result: 'm = F/(a + g)' }
      ]
    },
    {
      name: 'Total amount after simple interest',
      given: 'A = P + PRT',
      subject: 'P',
      steps: [
        { action: { type: 'factor', operand: 'P' }, symbols: ['A', 'P', 'PRT'], result: 'A = P(1 + RT)' },
        { action: { type: 'divide', operand: '1 + RT' }, symbols: ['A', 'P', '1 + RT'], result: 'P = A/(1 + RT)' }
      ]
    },
    {
      name: 'Perimeter of a semicircle',
      given: 'P = πr + 2r',
      subject: 'r',
      steps: [
        { action: { type: 'factor', operand: 'r' }, symbols: ['P', 'πr', '2r'], result: 'P = r(π + 2)' },
        { action: { type: 'divide', operand: 'π + 2' }, symbols: ['P', 'r', 'π + 2'], result: 'r = P/(π + 2)' }
      ]
    }
  ];

  // Every formula here has exactly one sensible subject (the letter
  // that appears twice), so ALL_PAIRS is just FORMULA_BANK itself —
  // kept as its own array (rather than reading FORMULA_BANK directly
  // everywhere) so a future formula with more than one such subject
  // slots in the same way the base component's ALL_PAIRS does.
  var ALL_PAIRS = FORMULA_BANK.map(function(formula){
    return { formula: formula, subject: formula.subject, steps: formula.steps };
  });

  // All formulae here are roughly the same difficulty (factor, then
  // divide) so — unlike the base component — there's no weighting:
  // every pair is equally likely to come up at any adaptive tier.
  function pickPair(){ return randChoice(ALL_PAIRS); }

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
  // student over formatting: whitespace, "pi" instead of π, stray
  // "*"/"×" for multiplication. (No formula here needs a square root
  // or a squared term, but the same normalisation the base component
  // uses is kept in case a future formula does.)
  function normalizeEqStr(raw){
    var s = (raw || '').toLowerCase();
    s = s.replace(/\s+/g, '');
    s = s.replace(/[*×]/g, '');
    s = s.replace(/pi/g, 'π');
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
      case 'factor': return 'Factor out ' + a.operand + ' on the side it appears twice';
      case 'multiply': return 'Multiply both sides by ' + a.operand;
      case 'divide': return 'Divide both sides by ' + a.operand;
      case 'add': return 'Add ' + a.operand + ' to both sides';
      case 'subtract': return 'Subtract ' + a.operand + ' from both sides';
    }
  }

  function actionsEqual(a, b){ return a.type === b.type && (a.operand || '') === (b.operand || ''); }

  // 3 wrong-but-plausible actions for this step, built only from
  // symbols that actually appear in the equation on screen — so a
  // distractor for a 'factor' step might be "Divide both sides by P"
  // (same symbol as the correct "Factor out P...", wrong operation)
  // rather than something that couldn't be confused for it.
  function buildDistractors(step){
    var correct = step.action;
    var pool = [];
    step.symbols.forEach(function(sym){
      ['multiply', 'divide', 'add', 'subtract'].forEach(function(type){
        pool.push({ type: type, operand: sym });
      });
    });
    pool = pool.filter(function(o){ return !actionsEqual(o, correct); });

    var distractors = [];
    // Prefer leading with a same-symbol, different-operation
    // alternative first — that's the most tempting kind of wrong
    // option (e.g. correct is "Factor out P...", distractor is
    // "Divide both sides by P").
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
    var pair = pickPair();
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

  // Sets the actual question ("Rearrange the formula for P.") right
  // next to the practice title, alongside the given formula itself —
  // both stay visible for the whole question regardless of which
  // step the student is currently on, rather than only being said
  // once inside a single step's prompt text.
  function renderGiven(){
    els.formulaLabel.textContent = current.formula.name;
    els.given.textContent = current.formula.given;
    els.questionLine.textContent = 'Rearrange the formula for ' + current.subject + '.';
  }

  // ---- Step prompt / hint ---------------------------------------------

  function stepPrompt(name){
    if(name === 'final') return 'Make ' + current.subject + ' the subject.';
    var n = 'Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ';
    if(isChoiceStep(name)){
      var idx = parseInt(name.slice('choice-'.length), 10);
      return n + (idx === 0
        ? (current.subject + ' appears twice on one side — what should you do first?')
        : 'What should you do next?');
    }
    var writeIdx = parseInt(name.slice('write-'.length), 10);
    var isLast = writeIdx === lastStepIdx();
    return n + 'Write the new equation after doing that.' +
      (isLast ? ' This is the fully rearranged formula, with ' + current.subject + ' alone on one side.' : '');
  }

  function stepHint(name){
    if(name === 'final'){
      return 'Factor ' + current.subject + ' out of both terms it appears in, then divide both sides by ' +
        "what's left in the bracket. For example, ax + bx = c becomes x(a + b) = c, then x = c/(a + b).";
    }
    if(isChoiceStep(name)){
      var idx = parseInt(name.slice('choice-'.length), 10);
      return idx === 0
        ? ('Both terms on one side share a factor of ' + current.subject + ' — pull it out ' +
           'front as a common factor, the same way 3x + 5x factors to x(3 + 5).')
        : ('The bracket is now just multiplying ' + current.subject + ' — undo that by doing the ' +
           'same thing to both sides.');
    }
    return 'Carry out the action you just chose on both sides of the current equation, then simplify.';
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function setFeedback(text, ok){
    els.feedback.textContent = text;
    els.feedback.className = 'feedback' + (ok === true ? ' correct' : ok === false ? ' incorrect' : '');
  }

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
    setFeedback('', null);
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
      setFeedback('Correct — ' + actionLabel(action) + '. Now write the new equation.', true);
      stepAnswered = true;
      els.checkBtn.disabled = false;
      els.checkBtn.textContent = 'Continue';
    } else {
      btnEl.classList.add('wrong');
      btnEl.disabled = true;
      setFeedback('Not quite — that won’t correctly isolate ' + current.subject + ' here. Try another option.', false);
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
    var raw = (els.writeInput.value || '').trim();
    var ok = equationsMatch(raw, step.result);
    els.writeInput.classList.toggle('right', ok); els.writeInput.classList.toggle('wrong', !ok);
    if(ok){
      // Echo exactly what was typed (equationsMatch tolerates side
      // order/spacing/case, so the canonical step.result may differ
      // from it) — never a freshly re-derived canonical string.
      // current.currentEq still advances to the canonical step.result,
      // since later steps' distractors/parsing depend on it being
      // that exact authored string.
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      current.currentEq = step.result;
      working.push(actionLabel(step.action) + ' → ' + raw);
    } else {
      setFeedback('Not quite. It should be ' + step.result + '.', false);
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
    var raw = (els.finalInput.value || '').trim();
    var ok = equationsMatch(raw, expected);
    els.finalInput.classList.toggle('right', ok); els.finalInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what was typed, plain (no reformatting).
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push(raw);
    } else {
      setFeedback('Not quite. It should be ' + expected + '.', false);
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
    els.formulaLabel = document.getElementById('rearrangefactor-equation-label');
    els.given = document.getElementById('rearrangefactor-given');
    els.questionLine = document.getElementById('rearrangefactor-question-line');
    els.modeNote = document.getElementById('rearrangefactor-mode-note');
    els.stepPrompt = document.getElementById('rearrangefactor-step-prompt');
    els.currentEqWrap = document.getElementById('rearrangefactor-current-eq-wrap');
    els.currentEq = document.getElementById('rearrangefactor-current-eq');
    els.hint = document.getElementById('rearrangefactor-hint');
    els.feedback = document.getElementById('rearrangefactor-feedback');
    els.score = document.getElementById('rearrangefactor-score');
    els.checkBtn = document.getElementById('rearrangefactor-check-btn');
    els.nextBtn = document.getElementById('rearrangefactor-next-btn');
    els.backBtn = document.getElementById('rearrangefactor-back-btn');
    els.workingCard = document.getElementById('rearrangefactor-working-card');
    els.workingLines = document.getElementById('rearrangefactor-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.stepChoice = document.getElementById('rearrangefactor-step-choice');
    els.choiceRow = document.getElementById('rearrangefactor-choice-row');
    els.stepWrite = document.getElementById('rearrangefactor-step-write');
    els.writeInput = document.getElementById('rearrangefactor-write-input');
    els.stepFinal = document.getElementById('rearrangefactor-step-final');
    els.finalInput = document.getElementById('rearrangefactor-final-input');

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.writeInput, els.finalInput].forEach(function(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
      });
    });

    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    if(VM.KeybindHelp) VM.KeybindHelp.attach(document.getElementById('rearrangefactor-keybind-help'), FORMULA_TYPING_HELP);
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
