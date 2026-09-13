/* ============================================================
   practice-graph-exponential.js — the PracticeGraphExponential
   component: a question generator for "Graphing exponentials". This
   is the reverse of PracticeExpFromTable: instead of reading an
   exponential's equation off a table of values, the student is GIVEN
   y = a(b)^x and has to complete a substitution table for it — the
   same shape as PracticeGraphLinear's 'table' scaffold step, but
   here it's the only step, since table-completion by substitution IS
   the whole skill at this foundational stage (no vertical shift yet
   — that's a separate, harder topic later in the DAG).

   No adaptive scaffold: every question is a single step (complete
   the table), and it's the scored one. x is kept nonnegative (0..4)
   and b a small positive integer, so every y-value is always a whole
   number — no fractions or negative exponents to worry about here.

   Public API: VM.PracticeGraphExponential.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeGraphExponential = (function(){
  var A_VALUES = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]; // nonzero integer coefficient
  var B_VALUES = [2, 3];                              // positive integer base
  var TABLE_XS = [0, 1, 2, 3, 4];

  var els = {};
  var current = null;    // { a, b, ys }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function formatEquation(a, b){ return 'y = ' + coeffLabel(a) + '(' + b + ')^x'; }

  function nextQuestion(){
    var a = randChoice(A_VALUES);
    var b = randChoice(B_VALUES);
    var ys = TABLE_XS.map(function(x){ return a * Math.pow(b, x); });
    current = { a: a, b: b, ys: ys };
    answered = false;
    working.reset();

    els.equation.textContent = formatEquation(a, b);
    els.tableInputs.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); });
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.tableInputs[0].focus();
  }

  function checkTable(){
    if(!current) return false;
    var oks = els.tableInputs.map(function(el, i){
      var v = parseFloat(el.value);
      return !isNaN(v) && Math.abs(v - current.ys[i]) < 0.01;
    });
    els.tableInputs.forEach(function(el, i){
      el.classList.toggle('right', oks[i]);
      el.classList.toggle('wrong', !oks[i]);
    });
    var ok = oks.every(function(o){ return o; });
    var wantedStr = current.ys.join(', ');

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — every value comes from substituting x into ' +
        formatEquation(current.a, current.b) + '.';
      els.feedback.className = 'feedback correct';
      working.push('y-values: ' + wantedStr);
    } else {
      els.feedback.textContent = 'Not quite. The y-values should be ' + wantedStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  function handleCheckOrAdvance(){
    if(!answered){
      var scored = checkTable();
      if(scored){ answered = true; els.checkBtn.textContent = 'Next question'; }
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.equation = document.getElementById('graphexp-equation');
    els.table = document.getElementById('graphexp-table');
    els.tableInputs = [1, 2, 3, 4, 5].map(function(i){ return document.getElementById('graphexp-y-' + i); });

    els.stepPrompt = document.getElementById('graphexp-step-prompt');
    els.hint = document.getElementById('graphexp-hint');
    els.feedback = document.getElementById('graphexp-feedback');
    els.score = document.getElementById('graphexp-score');
    els.checkBtn = document.getElementById('graphexp-check-btn');
    els.nextBtn = document.getElementById('graphexp-next-btn');
    els.backBtn = document.getElementById('graphexp-back-btn');
    els.workingCard = document.getElementById('graphexp-working-card');
    els.workingLines = document.getElementById('graphexp-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.stepPrompt.textContent = 'Substitute each x-value to complete the table.';
    // Fixed example uses a base (5) outside B_VALUES ([2, 3]), so it
    // can never coincide with the current question's own numbers —
    // see the hint-safety rule in CLAUDE.md.
    els.hint.textContent = 'Substitute each x-value into y = a(b)^x — e.g. for y = 2(5)^x, at x = 2 you\'d ' +
      'work out y = 2 × 5² = 50.';

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.tableInputs.forEach(function(input){
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
