/* ============================================================
   practice-parabola-from-table.js — the PracticeParabolaFromTable
   component: a question generator for "Finding the equation of a
   parabola (from a table)". Shows a table of x/y pairs sampled from
   a random parabola y = ax^2 + bx + c at x = 1..5 (never x = 0, so c
   can't just be read off) and walks the student through the
   second-differences method:

   Below 3 questions answered, or under 90% accuracy, a seven-step
   scaffold:
     1. fill in the first differences between neighbouring y-values
        (not constant — this is a parabola, not a line).
     2. fill in the second differences (the differences of the first
        differences) — constant, and equal to 2a.
     3. use that to find a.
     4. work backwards from x = 1 to find y at x = 0 — that's c
        (c = y at x=1, minus the first difference into x=1, plus the
        second difference — see the hint on that step for why).
     5. write the equation so far, with a and c substituted but b
        left as the literal letter b (nothing's solved it yet).
     6. substitute the table's first point to solve for b.
     7. write the full equation — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 7. The first- and second-difference
   rows stay visible (locked) once filled in, the same way the
   elimination method's working box in practice-simultaneous.js keeps
   earlier steps visible — this is a difference table, so the whole
   point is seeing every row at once.

   Public API: VM.PracticeParabolaFromTable.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeParabolaFromTable = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var A_VALUES = [-3, -2, -1, 1, 2, 3];
  var B_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4]; // never 0 — keeps the bx term in the final answer unambiguous
  var C_MIN = -6, C_MAX = 6;
  var XS = [1, 2, 3, 4, 5]; // never includes 0, so c can't be read straight off the table

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { a, b, c, ys, firstDiffs, secondDiffs }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function close(a, b){ return Math.abs(a - b) < 0.01; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'final-equation'; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var a = randChoice(A_VALUES);
    var b = randChoice(B_VALUES);
    var c = randInt(C_MIN, C_MAX);
    var ys = XS.map(function(x){ return a * x * x + b * x + c; });
    var firstDiffs = [];
    for(var i = 0; i < ys.length - 1; i++){ firstDiffs.push(ys[i + 1] - ys[i]); }
    var secondDiffs = [];
    for(var j = 0; j < firstDiffs.length - 1; j++){ secondDiffs.push(firstDiffs[j + 1] - firstDiffs[j]); }

    current = { a: a, b: b, c: c, ys: ys, firstDiffs: firstDiffs, secondDiffs: secondDiffs };

    var scaffold = needsScaffold();
    steps = scaffold
      ? ['first-diff', 'second-diff', 'find-a', 'find-c', 'current-equation', 'find-b', 'final-equation']
      : ['final-equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the full equation.";

    renderTable();
    renderStep();
  }

  function renderTable(){
    var headRow = '<tr><th>x</th>' + XS.map(function(x){ return '<td>' + x + '</td>'; }).join('') + '</tr>';
    var bodyRow = '<tr><th>y</th>' + current.ys.map(function(y){ return '<td>' + y + '</td>'; }).join('') + '</tr>';
    els.table.innerHTML = headRow + bodyRow;
  }

  // ---- Formatting ------------------------------------------------

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }
  function signedTerm(v, suffix){
    var mag = Math.abs(v) === 1 ? '' : String(Math.abs(v));
    return (v > 0 ? ' + ' : ' - ') + mag + suffix;
  }

  function formatPartialEquation(a, c){
    return 'y = ' + coeffLabel(a) + 'x^2 + bx' + signedConst(c);
  }
  function formatFinalEquation(a, b, c){
    return 'y = ' + coeffLabel(a) + 'x^2' + signedTerm(b, 'x') + signedConst(c);
  }

  // "y = 2x^2 + bx - 3" — a and c substituted, b left as the letter.
  function parsePartialEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^y=([+-]?\d*)x\^2\+bx([+-]\d+)?$/);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    var c = m[2] ? parseFloat(m[2]) : 0;
    return { a: a, c: c };
  }

  // "y = 2x^2 - 3x - 3" — the full equation, bx term always present
  // (b is never 0 by generation).
  function parseFinalEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([+-]?\d*)x\^2([+-])(\d*)x([+-]\d+)?$/);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    var b = (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseInt(m[3], 10));
    var c = m[4] ? parseFloat(m[4]) : 0;
    return { a: a, b: b, c: c };
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'first-diff': return n + 'Fill in the difference between each pair of neighbouring y-values.';
      case 'second-diff': return n + 'Fill in the difference between each pair of neighbouring first differences.';
      case 'find-a': return n + 'Use the second difference to find a.';
      case 'find-c': return n + 'Work backwards to find y when x = 0 — that’s c.';
      case 'current-equation': return n + 'Write the equation so far, using a and c.';
      case 'find-b': return n + 'Substitute the point (1, ' + current.ys[0] + ') to find b.';
      case 'final-equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Write the full equation.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'first-diff': return 'Subtract each y-value from the one after it.';
      case 'second-diff': return 'Subtract each first difference from the one after it — for a parabola these come out all the same.';
      case 'find-a': return 'The second difference is always 2a.';
      case 'find-c':
        return 'y at x = 0 is one step left of x = 1: take y at x = 1, subtract the first difference into it, then add the second difference back on.';
      case 'current-equation': return 'Leave b as the letter b — you haven’t found it yet, e.g. y = 2x^2 + bx - 3.';
      case 'find-b': return 'Substitute x = 1 and y = ' + current.ys[0] + ' into y = a(1)^2 + b(1) + c and solve for b.';
      case 'final-equation': return 'Use ^2 for squared, e.g. y = -2x^2 + 3x - 1.';
    }
  }

  function clearInputs(els_){ els_.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    var firstDiffIdx = steps.indexOf('first-diff');
    var secondDiffIdx = steps.indexOf('second-diff');

    // The difference rows are a table, not a single-focus step: once
    // reached they stay visible (and locked, once answered) so the
    // whole difference table is visible at once.
    els.firstDiffRow.hidden = (firstDiffIdx === -1) || (stepIndex < firstDiffIdx);
    els.secondDiffRow.hidden = (secondDiffIdx === -1) || (stepIndex < secondDiffIdx);
    els.firstDiffInputs.forEach(function(el){ el.disabled = stepIndex > firstDiffIdx; });
    els.secondDiffInputs.forEach(function(el){ el.disabled = stepIndex > secondDiffIdx; });

    ['find-a', 'find-c', 'current-equation', 'find-b', 'final-equation'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'first-diff') clearInputs(els.firstDiffInputs);
    if(name === 'second-diff') clearInputs(els.secondDiffInputs);
    if(name === 'find-a') clearInputs([els.findAInput]);
    if(name === 'find-c') clearInputs([els.findCInput]);
    if(name === 'current-equation') clearInputs([els.currentEqInput]);
    if(name === 'find-b') clearInputs([els.findBInput]);
    if(name === 'final-equation') clearInputs([els.finalEqInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = {
      'first-diff': els.firstDiffInputs[0], 'second-diff': els.secondDiffInputs[0],
      'find-a': els.findAInput, 'find-c': els.findCInput,
      'current-equation': els.currentEqInput, 'find-b': els.findBInput,
      'final-equation': els.finalEqInput
    };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: ungraded scaffold steps -----------------------------

  function checkFirstDiff(){
    var oks = els.firstDiffInputs.map(function(el, i){
      var v = parseFraction(el.value);
      return !isNaN(v) && close(v, current.firstDiffs[i]);
    });
    els.firstDiffInputs.forEach(function(el, i){ el.classList.toggle('right', oks[i]); el.classList.toggle('wrong', !oks[i]); });
    var ok = oks.every(function(o){ return o; });
    els.feedback.textContent = ok ? 'Correct.' : ('Not quite. The differences are ' + current.firstDiffs.join(', ') + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkSecondDiff(){
    var oks = els.secondDiffInputs.map(function(el, i){
      var v = parseFraction(el.value);
      return !isNaN(v) && close(v, current.secondDiffs[i]);
    });
    els.secondDiffInputs.forEach(function(el, i){ el.classList.toggle('right', oks[i]); el.classList.toggle('wrong', !oks[i]); });
    var ok = oks.every(function(o){ return o; });
    els.feedback.textContent = ok ? 'Correct — the second difference is constant.' : ('Not quite. Each one should be ' + current.secondDiffs[0] + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkFindA(){
    var v = parseFraction(els.findAInput.value);
    var ok = !isNaN(v) && close(v, current.a);
    els.findAInput.classList.toggle('right', ok); els.findAInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — a = ' + current.a + '.') : ('Not quite. a = ' + current.a + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkFindC(){
    var v = parseFraction(els.findCInput.value);
    var ok = !isNaN(v) && close(v, current.c);
    els.findCInput.classList.toggle('right', ok); els.findCInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — c = ' + current.c + '.') : ('Not quite. c = ' + current.c + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkCurrentEquation(){
    var parsed = parsePartialEquation(els.currentEqInput.value);
    var ok = !!parsed && close(parsed.a, current.a) && close(parsed.c, current.c);
    els.currentEqInput.classList.toggle('right', ok); els.currentEqInput.classList.toggle('wrong', !ok);
    var correctStr = formatPartialEquation(current.a, current.c);
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkFindB(){
    var v = parseGradient(els.findBInput.value);
    var ok = !isNaN(v) && close(v, current.b);
    els.findBInput.classList.toggle('right', ok); els.findBInput.classList.toggle('wrong', !ok);
    els.feedback.textContent = ok ? ('Correct — b = ' + current.b + '.') : ('Not quite. b = ' + current.b + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  function checkStep(name){
    if(name === 'first-diff') return checkFirstDiff();
    if(name === 'second-diff') return checkSecondDiff();
    if(name === 'find-a') return checkFindA();
    if(name === 'find-c') return checkFindC();
    if(name === 'current-equation') return checkCurrentEquation();
    if(name === 'find-b') return checkFindB();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkFinalEquation(){
    if(!current) return false;
    var parsed = parseFinalEquation(els.finalEqInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the full equation, starting with y =, e.g. y = -2x^2 + 3x - 1.';
      els.feedback.className = 'feedback incorrect';
      els.finalEqInput.classList.add('wrong');
      return false;
    }
    var ok = close(parsed.a, current.a) && close(parsed.b, current.b) && close(parsed.c, current.c);
    els.finalEqInput.classList.toggle('right', ok); els.finalEqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatFinalEquation(current.a, current.b, current.c);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
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
        var scored = checkFinalEquation();
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
    els.table = document.getElementById('parabola-table-values');
    els.stepPrompt = document.getElementById('parabola-table-step-prompt');
    els.modeNote = document.getElementById('parabola-table-mode-note');
    els.hint = document.getElementById('parabola-table-hint');
    els.feedback = document.getElementById('parabola-table-feedback');
    els.score = document.getElementById('parabola-table-score');
    els.checkBtn = document.getElementById('parabola-table-check-btn');
    els.nextBtn = document.getElementById('parabola-table-next-btn');
    els.backBtn = document.getElementById('parabola-table-back-btn');

    els.firstDiffRow = document.getElementById('parabola-table-first-diff');
    els.firstDiffInputs = [1, 2, 3, 4].map(function(i){ return document.getElementById('parabola-table-diff1-' + i); });
    els.secondDiffRow = document.getElementById('parabola-table-second-diff');
    els.secondDiffInputs = [1, 2, 3].map(function(i){ return document.getElementById('parabola-table-diff2-' + i); });

    els.findAInput = document.getElementById('parabola-table-find-a');
    els.findCInput = document.getElementById('parabola-table-find-c');
    els.currentEqInput = document.getElementById('parabola-table-current-eq');
    els.findBInput = document.getElementById('parabola-table-find-b');
    els.finalEqInput = document.getElementById('parabola-table-final-eq');

    els.rowsByName = {
      'find-a': document.getElementById('parabola-table-step-find-a'),
      'find-c': document.getElementById('parabola-table-step-find-c'),
      'current-equation': document.getElementById('parabola-table-step-current-equation'),
      'find-b': document.getElementById('parabola-table-step-find-b'),
      'final-equation': document.getElementById('parabola-table-step-final-equation')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    els.firstDiffInputs.concat(els.secondDiffInputs, [
      els.findAInput, els.findCInput, els.currentEqInput, els.findBInput, els.finalEqInput
    ]).forEach(function(input){
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
