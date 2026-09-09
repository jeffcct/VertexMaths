/* ============================================================
   practice-line-from-table.js — the PracticeLineFromTable
   component: a question generator for "Finding the equation of a
   line (from a table)". Shows a table of x/y pairs, with x always
   consecutive integers a step of 1 apart, so the gradient is just
   the constant first difference between neighbouring y-values — no
   division needed, unlike reading a gradient off a graph.

   Below 3 questions answered, or below 90% accuracy, the first part
   of the question is a "fill in the differences" step: four boxes,
   one per gap between neighbouring y-values in the table, all of
   which must equal the (constant) gradient. This step is ungraded
   scaffolding — it must be answered correctly to move on, but
   doesn't affect accuracy — same convention as every other Practice
   component's scaffold steps (see the note at the top of
   practice-parabola-intercepts.js). At 3+ questions and 90%+
   accuracy it's skipped and the question goes straight to the
   answer.

   The answer step itself has the same adaptive tiers as
   PracticeLineGraph (see the note at the top of that file):
     - more than 2 questions, above 80% correct: the two fill-in-the-
       blank boxes are replaced with a single typed-equation box.
     - more than 4 questions, above 95% correct: the score readout
       is hidden too.
     - 10 or more questions, above 95% correct: the table's x = 0
       column (which hands the y-intercept straight to the student)
       is dropped, leaving four points that all have to be worked
       with. (This tier and the differences step never overlap: its
       accuracy bar alone already clears the differences step's.)

   Public API: VM.PracticeLineFromTable.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeLineFromTable = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  // The gradient is a plain integer — x increases by 1 between every
  // column, so the constant difference between y-values *is* the
  // gradient directly, with no fraction to divide out.
  var M_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];
  var C_MIN = -6, C_MAX = 6;

  var DIFF_MIN_ATTEMPTS = 3;    // "done < 3 questions" — below this, show the differences step
  var DIFF_MIN_ACCURACY = 0.90; // "has < 90% accuracy" — below this, show the differences step

  var ADVANCED_MIN_ATTEMPTS = 2;
  var ADVANCED_MIN_ACCURACY = 0.8;
  var ELITE_MIN_ATTEMPTS = 4;
  var ELITE_MIN_ACCURACY = 0.95;
  var MASTER_MIN_ATTEMPTS = 10;
  var MASTER_MIN_ACCURACY = 0.95;

  var els = {};
  var current = null;    // { m, c }
  var score = { correct: 0, attempted: 0 };
  var advanced = false;
  var elite = false;
  var master = false;    // drops the x = 0 column from the table
  var steps = [];         // ['differences', 'equation'] or just ['equation']
  var stepIndex = 0;
  var stepAnswered = false; // has the (ungraded) 'differences' step been answered correctly?
  var answered = false;     // has the final 'equation' step been checked at all?

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }

  function isAdvanced(){
    return score.attempted > ADVANCED_MIN_ATTEMPTS && accuracy() > ADVANCED_MIN_ACCURACY;
  }
  function isElite(){
    return score.attempted > ELITE_MIN_ATTEMPTS && accuracy() > ELITE_MIN_ACCURACY;
  }
  function isMaster(){
    return score.attempted >= MASTER_MIN_ATTEMPTS && accuracy() > MASTER_MIN_ACCURACY;
  }
  function needsDifferenceStep(){
    return score.attempted < DIFF_MIN_ATTEMPTS || accuracy() < DIFF_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'equation'; }

  function nextQuestion(){
    var m = randChoice(M_VALUES);
    var c = randInt(C_MIN, C_MAX);
    current = { m: m, c: c };

    advanced = isAdvanced();
    elite = isElite();
    master = isMaster();
    steps = needsDifferenceStep() ? ['differences', 'equation'] : ['equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;

    renderTable();
    renderStep();
  }

  // x-values are always consecutive integers (a step of 1 apart), so
  // every y-value in the table comes out as a whole number and the
  // difference between neighbours is exactly the gradient.
  function renderTable(){
    var xs = master ? [-2, -1, 1, 2] : [-2, -1, 0, 1, 2];
    var ys = xs.map(function(x){ return current.m * x + current.c; });

    var headRow = '<tr><th>x</th>' + xs.map(function(x){ return '<td>' + x + '</td>'; }).join('') + '</tr>';
    var bodyRow = '<tr><th>y</th>' + ys.map(function(y){ return '<td>' + y + '</td>'; }).join('') + '</tr>';
    els.table.innerHTML = headRow + bodyRow;
  }

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    if(name === 'differences'){
      return n + 'Fill in the difference between each pair of neighbouring y-values.';
    }
    return n + 'Find the equation of the line.';
  }

  function updateAnswerUI(){
    els.rowBoxes.hidden = advanced;
    els.rowTyped.hidden = !advanced;
    els.scoreRow.hidden = elite;
    if(master){
      els.modeNote.textContent = "You've mastered this — the x = 0 column is gone, so work out the gradient and intercept from the points you have.";
      els.hint.textContent = 'Write the full equation, e.g. y = 3x - 6. Leave out the coefficient for 1 (y = x - 6) and use a bare - for -1 (y = -x - 6).';
    } else if(advanced){
      els.modeNote.textContent = "You're doing well — try writing the whole equation yourself this time.";
      els.hint.textContent = 'Write the full equation, e.g. y = 3x - 6. Leave out the coefficient for 1 (y = x - 6) and use a bare - for -1 (y = -x - 6).';
    } else {
      els.modeNote.textContent = '';
      els.hint.textContent = 'Leave the gradient box blank for 1, or type just - for -1.';
    }
  }

  function clearStepInputs(name){
    if(name === 'differences'){
      els.diffInputs.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    } else {
      [els.mInput, els.cInput, els.eqInput].forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    }
  }

  function renderStep(){
    var name = currentStepName();
    els.diffRow.hidden = (name !== 'differences');
    var onEquation = (name === 'equation');
    if(onEquation){
      updateAnswerUI();
    } else {
      els.rowBoxes.hidden = true;
      els.rowTyped.hidden = true;
      els.modeNote.textContent = '';
      els.hint.textContent = 'Read each pair of neighbouring y-values straight off the table.';
    }
    clearStepInputs(name);
    els.stepPrompt.textContent = stepPrompt(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    var focusEl = name === 'differences' ? els.diffInputs[0] : (advanced ? els.eqInput : els.mInput);
    focusEl.focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  function checkDifferences(){
    var oks = els.diffInputs.map(function(el){
      var v = parseFraction(el.value);
      return !isNaN(v) && Math.abs(v - current.m) < 0.01;
    });
    els.diffInputs.forEach(function(el, i){
      el.classList.toggle('right', oks[i]);
      el.classList.toggle('wrong', !oks[i]);
    });
    var ok = oks.every(function(o){ return o; });
    els.feedback.textContent = ok ?
      ('Correct — the common difference is ' + current.m + '.') :
      ('Not quite. Each gap should be ' + current.m + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    return ok;
  }

  // Parses a fully typed equation like "y = 3x - 6" or "y=-x+4".
  function parseEquationString(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);

    var xIdx = s.indexOf('x');
    if(xIdx === -1) return null;
    var mPart = s.slice(0, xIdx);
    var rest = s.slice(xIdx + 1);

    var m = parseGradient(mPart);
    if(isNaN(m)) return null;

    var c;
    if(rest === ''){ c = 0; }
    else { c = parseFloat(rest.replace(/^\+/, '')); }
    if(isNaN(c)) return null;

    return { m: m, c: c };
  }

  function formatEquation(m, c){
    var mStr = m === 1 ? '' : (m === -1 ? '-' : String(m));
    var cStr = c === 0 ? '' : (c > 0 ? (' + ' + c) : (' - ' + Math.abs(c)));
    return 'y = ' + mStr + 'x' + cStr;
  }

  function markResult(mOk, cOk){
    if(advanced){
      els.eqInput.classList.toggle('right', mOk && cOk);
      els.eqInput.classList.toggle('wrong', !(mOk && cOk));
    } else {
      els.mInput.classList.toggle('right', mOk);
      els.mInput.classList.toggle('wrong', !mOk);
      els.cInput.classList.toggle('right', cOk);
      els.cInput.classList.toggle('wrong', !cOk);
    }
  }

  function checkEquationStep(){
    if(!current) return false;
    var mVal, cVal;

    if(advanced){
      var parsed = parseEquationString(els.eqInput.value);
      if(!parsed){
        els.feedback.textContent = "Write the full equation, starting with y =, e.g. y = 3x - 6.";
        els.feedback.className = 'feedback incorrect';
        els.eqInput.classList.add('wrong');
        return false;
      }
      mVal = parsed.m;
      cVal = parsed.c;
    } else {
      mVal = parseGradient(els.mInput.value);
      cVal = parseFraction(els.cInput.value);
    }

    var mOk = !isNaN(mVal) && Math.abs(mVal - current.m) < 0.01;
    var cOk = !isNaN(cVal) && Math.abs(cVal - current.c) < 0.01;
    markResult(mOk, cOk);

    score.attempted++;
    var equation = formatEquation(current.m, current.c);
    if(mOk && cOk){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + equation;
      els.feedback.className = 'feedback correct';
    } else {
      els.feedback.textContent = 'Not quite. ' + equation +
        ' (gradient ' + current.m + ', y-intercept ' + current.c + ').';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  function handleCheckOrAdvance(){
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
    if(!stepAnswered){
      var ok = checkDifferences();
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
    els.table = document.getElementById('table-values');
    els.stepPrompt = document.getElementById('table-step-prompt');
    els.diffRow = document.getElementById('table-step-differences');
    els.diffInputs = [
      document.getElementById('table-diff-1'),
      document.getElementById('table-diff-2'),
      document.getElementById('table-diff-3'),
      document.getElementById('table-diff-4')
    ];
    els.rowBoxes = document.getElementById('table-answer-row-boxes');
    els.rowTyped = document.getElementById('table-answer-row-typed');
    els.mInput = document.getElementById('table-m-input');
    els.cInput = document.getElementById('table-c-input');
    els.eqInput = document.getElementById('table-eq-input');
    els.modeNote = document.getElementById('table-mode-note');
    els.hint = document.getElementById('table-hint');
    els.feedback = document.getElementById('table-feedback');
    els.score = document.getElementById('table-score');
    els.scoreRow = document.getElementById('table-score-row');
    els.checkBtn = document.getElementById('table-check-btn');
    els.nextBtn = document.getElementById('table-next-btn');
    els.backBtn = document.getElementById('table-back-btn');

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.diffInputs.concat([els.mInput, els.cInput, els.eqInput]).forEach(function(input){
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
