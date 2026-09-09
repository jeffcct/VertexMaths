/* ============================================================
   practice-line-from-table.js — the PracticeLineFromTable
   component: a question generator for "Finding the equation of a
   line (from a table)". Shows a table of x/y pairs sampled from a
   random line and takes a y = mx + c answer, same adaptive tiers as
   PracticeLineGraph (see the note at the top of that file) but
   reading from a table instead of a graph:

     - more than 2 questions, above 80% correct: the two fill-in-the-
       blank boxes are replaced with a single typed-equation box.
     - more than 4 questions, above 95% correct: the score readout
       is hidden too.
     - 10 or more questions, above 95% correct: the table's x = 0
       row (which hands the y-intercept straight to the student) is
       dropped, leaving four points that all have to be worked with.

   The table's x-values are always whole-number multiples of the
   gradient's denominator, so every y-value in the table comes out
   as a whole number regardless of which gradient was picked.

   Public API: VM.PracticeLineFromTable.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeLineFromTable = (function(){
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  // [rise, run] pairs — run is always positive, already in lowest terms.
  var GRADIENTS = [
    [-3,1], [-2,1], [-3,2], [-1,1], [-2,3], [-1,2],
    [1,2], [2,3], [1,1], [3,2], [2,1], [3,1]
  ];
  var C_MIN = -6, C_MAX = 6;

  var ADVANCED_MIN_ATTEMPTS = 2;
  var ADVANCED_MIN_ACCURACY = 0.8;
  var ELITE_MIN_ATTEMPTS = 4;
  var ELITE_MIN_ACCURACY = 0.95;
  var MASTER_MIN_ATTEMPTS = 10;
  var MASTER_MIN_ACCURACY = 0.95;

  var els = {};
  var current = null;    // { p, q, c, m }
  var score = { correct: 0, attempted: 0 };
  var advanced = false;
  var elite = false;
  var master = false;    // drops the x = 0 row from the table
  var answered = false;

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  function isAdvanced(){
    return score.attempted > ADVANCED_MIN_ATTEMPTS &&
      (score.correct / score.attempted) > ADVANCED_MIN_ACCURACY;
  }
  function isElite(){
    return score.attempted > ELITE_MIN_ATTEMPTS &&
      (score.correct / score.attempted) > ELITE_MIN_ACCURACY;
  }
  function isMaster(){
    return score.attempted >= MASTER_MIN_ATTEMPTS &&
      (score.correct / score.attempted) > MASTER_MIN_ACCURACY;
  }

  function nextQuestion(){
    var pq = randChoice(GRADIENTS);
    var p = pq[0], q = pq[1];
    var c = randInt(C_MIN, C_MAX);
    current = { p: p, q: q, c: c, m: p / q };

    advanced = isAdvanced();
    elite = isElite();
    master = isMaster();
    answered = false;
    updateModeUI();
    renderTable();
    resetInputs();
  }

  function updateModeUI(){
    els.rowBoxes.hidden = advanced;
    els.rowTyped.hidden = !advanced;
    els.scoreRow.hidden = elite;
    if(master){
      els.modeNote.textContent = "You've mastered this — the x = 0 row is gone, so work out the gradient and intercept from the points you have.";
      els.hint.textContent = 'Write the full equation, e.g. y = 3x - 6 or y = 3x/2 - 6. Leave out the coefficient for 1 (y = x - 6) and use a bare - for -1 (y = -x - 6).';
    } else if(advanced){
      els.modeNote.textContent = "You're doing well — try writing the whole equation yourself this time.";
      els.hint.textContent = 'Write the full equation, e.g. y = 3x - 6 or y = 3x/2 - 6. Leave out the coefficient for 1 (y = x - 6) and use a bare - for -1 (y = -x - 6).';
    } else {
      els.modeNote.textContent = '';
      els.hint.textContent = 'Fractions like 3/2 are fine for the gradient. Leave the gradient box blank for 1, or type just - for -1.';
    }
    els.checkBtn.textContent = 'Check answer';
  }

  // x-values are whole-number multiples (k) of the gradient's
  // denominator (q), so x = k*q and y = m*x + c = p*k + c is always
  // a whole number, however the gradient's fraction reduces.
  function renderTable(){
    var ks = master ? [-2, -1, 1, 2] : [-2, -1, 0, 1, 2];
    var xs = ks.map(function(k){ return k * current.q; });
    var ys = ks.map(function(k){ return current.p * k + current.c; });

    var headRow = '<tr><th>x</th>' + xs.map(function(x){ return '<td>' + x + '</td>'; }).join('') + '</tr>';
    var bodyRow = '<tr><th>y</th>' + ys.map(function(y){ return '<td>' + y + '</td>'; }).join('') + '</tr>';
    els.table.innerHTML = headRow + bodyRow;
  }

  function resetInputs(){
    els.mInput.value = '';
    els.cInput.value = '';
    els.eqInput.value = '';
    [els.mInput, els.cInput, els.eqInput].forEach(function(el){
      el.classList.remove('right', 'wrong');
    });
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    (advanced ? els.eqInput : els.mInput).focus();
  }

  // Parses a fully typed equation like "y = 3x - 6", "y=-x+4",
  // "y = x - 6", "y = 3/2x + 1" or "y = 3x/2 + 1".
  function parseEquationString(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);

    var xIdx = s.indexOf('x');
    if(xIdx === -1) return null;
    var mPart = s.slice(0, xIdx);
    var rest = s.slice(xIdx + 1);

    var splitFraction = rest.match(/^\/(\d+(\.\d+)?)/);
    var divisor = null;
    if(splitFraction){
      divisor = parseFloat(splitFraction[1]);
      rest = rest.slice(splitFraction[0].length);
    }

    var m = parseGradient(mPart);
    if(isNaN(m)) return null;
    if(divisor){ m = m / divisor; }

    var c;
    if(rest === ''){ c = 0; }
    else { c = parseFloat(rest.replace(/^\+/, '')); }
    if(isNaN(c)) return null;

    return { m: m, c: c };
  }

  function fracLabel(p, q){ return q === 1 ? String(p) : (p + '/' + q); }

  function formatEquation(c, p, q){
    var mStr = fracLabel(p, q);
    if(mStr === '1') mStr = '';
    else if(mStr === '-1') mStr = '-';
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

  function checkAnswer(){
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
    var equation = formatEquation(current.c, current.p, current.q);
    if(mOk && cOk){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + equation;
      els.feedback.className = 'feedback correct';
    } else {
      els.feedback.textContent = 'Not quite. ' + equation +
        ' (gradient ' + fracLabel(current.p, current.q) + ', y-intercept ' + current.c + ').';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  function handleCheckOrAdvance(){
    if(!answered){
      var scored = checkAnswer();
      if(scored){
        answered = true;
        els.checkBtn.textContent = 'Next question';
      }
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.table = document.getElementById('table-values');
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
    [els.mInput, els.cInput, els.eqInput].forEach(function(input){
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
