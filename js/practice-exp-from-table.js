/* ============================================================
   practice-exp-from-table.js — the PracticeExpFromTable component:
   a question generator for "Finding the equation of an exponential
   (from a table of values)". Shows a table of x/y pairs sampled from
   a random y = k*a^x + c at x = 0..3 and walks the student through
   the differences-and-ratio method:

   Below 3 questions answered, or under 90% accuracy, a six-step
   scaffold:
     1. fill in the first differences between neighbouring y-values
        (not constant, but in a fixed ratio to each other).
     2. fill in the ratio between neighbouring first differences —
        constant, and equal to a (the base).
     3. write the basic equation using that base, with k and c left
        as literal letters (nothing's solved them yet).
     4. substitute the table's x = 0 and x = 1 points to get two
        equations in k and c (a^0 = 1 keeps the first one simple).
     5. solve that pair of equations for k and c.
     6. write the full equation — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 6. The first-differences and ratio
   rows stay visible (locked) once filled in, the same way
   practice-parabola-from-table.js keeps its difference table visible
   as it builds up.

   Public API: VM.PracticeExpFromTable.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExpFromTable = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var A_VALUES = [2, 3, 4];                      // the exponential's base
  var K_VALUES = [-3, -2, -1, 1, 2, 3];
  var C_MIN = -5, C_MAX = 5;
  var XS = [0, 1, 2, 3];

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { k, a, c, ys, firstDiffs, ratios }
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

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
    var k = randChoice(K_VALUES);
    var a = randChoice(A_VALUES);
    var c = randInt(C_MIN, C_MAX);
    var ys = XS.map(function(x){ return k * Math.pow(a, x) + c; });
    var firstDiffs = [];
    for(var i = 0; i < ys.length - 1; i++){ firstDiffs.push(ys[i + 1] - ys[i]); }
    var ratios = [];
    for(var j = 0; j < firstDiffs.length - 1; j++){ ratios.push(firstDiffs[j + 1] / firstDiffs[j]); }

    current = { k: k, a: a, c: c, ys: ys, firstDiffs: firstDiffs, ratios: ratios };

    var scaffold = needsScaffold();
    steps = scaffold
      ? ['first-diff', 'ratio', 'basic-equation', 'substitute-points', 'solve-kc', 'final-equation']
      : ['final-equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
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

  function formatExpEquation(k, a, c){
    return 'y = ' + coeffLabel(k) + '(' + a + ')^x' + signedConst(c);
  }

  // "y = k(3)^x + c" — the base substituted, k and c left literal.
  function parseBasicEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^y=k\((\d+)\)\^x\+c$/);
    if(!m) return null;
    return { a: parseInt(m[1], 10) };
  }

  // "k + c = 5" or "3k + c = 17" — one linear equation in k and c;
  // c's own coefficient is always 1 in both equations this generator
  // asks for, so only k's coefficient varies. Also accepts the
  // constant written first, e.g. "5 = k + c".
  function parseLinearKC(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var m = s.match(/^([+-]?\d*)k\+c=([+-]?\d+)$/);
      if(!m) return null;
      var kCoeff = parseGradient(m[1]);
      if(isNaN(kCoeff)) return null;
      var rhs = parseFloat(m[2]);
      if(isNaN(rhs)) return null;
      return { kCoeff: kCoeff, rhs: rhs };
    });
  }

  // "y = -2(3)^x + 1" — the full equation.
  function parseExpEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([+-]?\d*)\((\d+)\)\^x([+-]\d+)?$/);
    if(!m) return null;
    var k = parseGradient(m[1]);
    if(isNaN(k)) return null;
    var a = parseInt(m[2], 10);
    var c = m[3] ? parseFloat(m[3]) : 0;
    return { k: k, a: a, c: c };
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'first-diff': return n + 'Fill in the difference between each pair of neighbouring y-values.';
      case 'ratio': return n + 'Fill in the ratio between each pair of neighbouring first differences.';
      case 'basic-equation': return n + 'Write the basic equation, using that ratio as the base.';
      case 'substitute-points': return n + 'Substitute the points at x = 0 and x = 1 to get two equations.';
      case 'solve-kc': return n + 'Solve those two equations for k and c.';
      case 'final-equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Write the full equation.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'first-diff': return 'Subtract each y-value from the one after it.';
      case 'ratio': return 'Divide each first difference by the one before it — for an exponential these come out all the same.';
      case 'basic-equation': return 'Leave k and c as letters, e.g. y = k(3)^x + c.';
      case 'substitute-points':
        return 'At x = 0, a^0 = 1, so the k-term has no coefficient — e.g. if y were 5 there, you\'d write k + c = 5. ' +
          'At x = 1, a^1 is just the base itself, so multiply k by it — e.g. with base 3 and y = 11 there, you\'d write 3k + c = 11.';
      case 'solve-kc': return 'Subtract one equation from the other to eliminate c first.';
      case 'final-equation': return 'Write it as y = k(a)^x + c with all three substituted, e.g. y = -2(3)^x + 1.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();
    var firstDiffIdx = steps.indexOf('first-diff');
    var ratioIdx = steps.indexOf('ratio');

    els.firstDiffRow.hidden = (firstDiffIdx === -1) || (stepIndex < firstDiffIdx);
    els.ratioRow.hidden = (ratioIdx === -1) || (stepIndex < ratioIdx);
    els.firstDiffInputs.forEach(function(el){ el.disabled = stepIndex > firstDiffIdx; });
    els.ratioInputs.forEach(function(el){ el.disabled = stepIndex > ratioIdx; });

    ['basic-equation', 'substitute-points', 'solve-kc', 'final-equation'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'first-diff') clearInputs(els.firstDiffInputs);
    if(name === 'ratio') clearInputs(els.ratioInputs);
    if(name === 'basic-equation') clearInputs([els.basicEqInput]);
    if(name === 'substitute-points') clearInputs([els.subEq1Input, els.subEq2Input]);
    if(name === 'solve-kc') clearInputs([els.solveKInput, els.solveCInput]);
    if(name === 'final-equation') clearInputs([els.finalEqInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = {
      'first-diff': els.firstDiffInputs[0], ratio: els.ratioInputs[0],
      'basic-equation': els.basicEqInput, 'substitute-points': els.subEq1Input,
      'solve-kc': els.solveKInput, 'final-equation': els.finalEqInput
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
    if(ok) working.push('First differences: ' + current.firstDiffs.join(', '));
    return ok;
  }

  function checkRatio(){
    var oks = els.ratioInputs.map(function(el){
      var v = parseFraction(el.value);
      return !isNaN(v) && close(v, current.a);
    });
    els.ratioInputs.forEach(function(el, i){ el.classList.toggle('right', oks[i]); el.classList.toggle('wrong', !oks[i]); });
    var ok = oks.every(function(o){ return o; });
    els.feedback.textContent = ok ? ('Correct — the ratio is constant, ' + current.a + '.') : ('Not quite. Each one should be ' + current.a + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('Ratio = ' + current.a);
    return ok;
  }

  function checkBasicEquation(){
    var parsed = parseBasicEquation(els.basicEqInput.value);
    var ok = !!parsed && parsed.a === current.a;
    els.basicEqInput.classList.toggle('right', ok); els.basicEqInput.classList.toggle('wrong', !ok);
    var correctStr = 'y = k(' + current.a + ')^x + c';
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  function checkSubstitutePoints(){
    var eq1 = parseLinearKC(els.subEq1Input.value);
    var eq2 = parseLinearKC(els.subEq2Input.value);
    var eq1Ok = !!eq1 && close(eq1.kCoeff, 1) && close(eq1.rhs, current.ys[0]);
    var eq2Ok = !!eq2 && close(eq2.kCoeff, current.a) && close(eq2.rhs, current.ys[1]);
    els.subEq1Input.classList.toggle('right', eq1Ok); els.subEq1Input.classList.toggle('wrong', !eq1Ok);
    els.subEq2Input.classList.toggle('right', eq2Ok); els.subEq2Input.classList.toggle('wrong', !eq2Ok);
    var ok = eq1Ok && eq2Ok;
    var correct1 = 'k + c = ' + current.ys[0];
    var correct2 = current.a + 'k + c = ' + current.ys[1];
    els.feedback.textContent = ok ? ('Correct — ' + correct1 + ' and ' + correct2 + '.') : ('Not quite. It should be ' + correct1 + ' and ' + correct2 + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok){ working.push(correct1); working.push(correct2); }
    return ok;
  }

  function checkSolveKC(){
    var kVal = parseFraction(els.solveKInput.value);
    var cVal = parseFraction(els.solveCInput.value);
    var kOk = !isNaN(kVal) && close(kVal, current.k);
    var cOk = !isNaN(cVal) && close(cVal, current.c);
    els.solveKInput.classList.toggle('right', kOk); els.solveKInput.classList.toggle('wrong', !kOk);
    els.solveCInput.classList.toggle('right', cOk); els.solveCInput.classList.toggle('wrong', !cOk);
    var ok = kOk && cOk;
    els.feedback.textContent = ok ?
      ('Correct — k = ' + current.k + ', c = ' + current.c + '.') :
      ('Not quite. k = ' + current.k + ', c = ' + current.c + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('k = ' + current.k + ', c = ' + current.c);
    return ok;
  }

  function checkStep(name){
    if(name === 'first-diff') return checkFirstDiff();
    if(name === 'ratio') return checkRatio();
    if(name === 'basic-equation') return checkBasicEquation();
    if(name === 'substitute-points') return checkSubstitutePoints();
    if(name === 'solve-kc') return checkSolveKC();
    return false;
  }

  // ---- Checking: the final, scored step ------------------------------

  function checkFinalEquation(){
    if(!current) return false;
    var parsed = parseExpEquation(els.finalEqInput.value);
    if(!parsed){
      els.feedback.textContent = 'Write the full equation, starting with y =, e.g. y = -2(3)^x + 1.';
      els.feedback.className = 'feedback incorrect';
      els.finalEqInput.classList.add('wrong');
      return false;
    }
    var ok = close(parsed.k, current.k) && parsed.a === current.a && close(parsed.c, current.c);
    els.finalEqInput.classList.toggle('right', ok); els.finalEqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatExpEquation(current.k, current.a, current.c);
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + correctStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(correctStr);
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
    els.table = document.getElementById('exp-table-values');
    els.stepPrompt = document.getElementById('exp-table-step-prompt');
    els.modeNote = document.getElementById('exp-table-mode-note');
    els.hint = document.getElementById('exp-table-hint');
    els.feedback = document.getElementById('exp-table-feedback');
    els.score = document.getElementById('exp-table-score');
    els.checkBtn = document.getElementById('exp-table-check-btn');
    els.nextBtn = document.getElementById('exp-table-next-btn');
    els.backBtn = document.getElementById('exp-table-back-btn');
    els.workingCard = document.getElementById('exp-table-working-card');
    els.workingLines = document.getElementById('exp-table-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.firstDiffRow = document.getElementById('exp-table-first-diff');
    els.firstDiffInputs = [1, 2, 3].map(function(i){ return document.getElementById('exp-table-diff-' + i); });
    els.ratioRow = document.getElementById('exp-table-ratio');
    els.ratioInputs = [1, 2].map(function(i){ return document.getElementById('exp-table-ratio-' + i); });

    els.basicEqInput = document.getElementById('exp-table-basic-eq');
    els.subEq1Input = document.getElementById('exp-table-sub-eq1');
    els.subEq2Input = document.getElementById('exp-table-sub-eq2');
    els.solveKInput = document.getElementById('exp-table-solve-k');
    els.solveCInput = document.getElementById('exp-table-solve-c');
    els.finalEqInput = document.getElementById('exp-table-final-eq');

    els.rowsByName = {
      'basic-equation': document.getElementById('exp-table-step-basic-equation'),
      'substitute-points': document.getElementById('exp-table-step-substitute-points'),
      'solve-kc': document.getElementById('exp-table-step-solve-kc'),
      'final-equation': document.getElementById('exp-table-step-final-equation')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    els.firstDiffInputs.concat(els.ratioInputs, [
      els.basicEqInput, els.subEq1Input, els.subEq2Input,
      els.solveKInput, els.solveCInput, els.finalEqInput
    ]).forEach(function(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
      });
    });

    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    VM.PowerPreview.init();
    VM.KeybindHelp.attach(document.getElementById('exp-table-keybind-help'));
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
