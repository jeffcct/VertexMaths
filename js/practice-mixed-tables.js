/* ============================================================
   practice-mixed-tables.js — the PracticeMixedTables component: a
   review/synthesis question generator for "Mixed: finding equations
   from a table", sitting above line-from-table, parabola-from-table
   and exp-from-table once a student has mastered all three
   individually. Each question shows a table of values built from
   ONE of those three relationship types, picked uniformly at random,
   using that type's own generation ranges — but unlike the three
   prerequisite components, there is no scaffold: the student must
   both recognise which of the three shapes the table matches *and*
   write its full equation, in a single scored step. Re-teaching the
   step-by-step method is the job of the three prerequisite
   components; this one only tests whether the synthesis has stuck.

   Generation (identical ranges/approach to each source component):
     - linear:      m ∈ {±1..±4}, c ∈ [-6, 6], x = -2..2
                    (practice-line-from-table.js)
     - quadratic:   a ∈ {±1..±3}, b ∈ {±1..±4} (never 0), c ∈ [-6, 6],
                    x = 1..5, never showing x = 0
                    (practice-parabola-from-table.js)
     - exponential: base ∈ {2, 3, 4}, k ∈ {±1..±3}, c ∈ [-5, 5],
                    x = 0..3
                    (practice-exp-from-table.js)

   The prompt and hint never name the type — that would hand the
   answer straight to the student — so both stay the same regardless
   of which type was actually generated. The hint instead restates the
   three tests (constant differences / constant second differences /
   constant ratio) so the student can work out which applies from the
   table itself, plus the three equation shapes to choose between.

   Score is one running total shared across all three types — this is
   a single topic's practice, not three separate ones.

   The equation parsers below are local re-implementations of each
   source file's own regex-based parser (kept behaviourally identical,
   including the blank/"-" coefficient shorthand via
   VM.EquationParse), since those parsers aren't exposed as a public
   API on the components themselves.

   Public API: VM.PracticeMixedTables.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeMixedTables = (function(){
  var parseGradient = VM.EquationParse.parseGradient;

  // ---- Generation ranges, one block per type, copied verbatim from
  // each source component's own constants. ---------------------------

  var LINEAR_M_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];
  var LINEAR_C_MIN = -6, LINEAR_C_MAX = 6;
  var LINEAR_XS = [-2, -1, 0, 1, 2];

  var QUAD_A_VALUES = [-3, -2, -1, 1, 2, 3];
  var QUAD_B_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4]; // never 0 — keeps the bx term unambiguous
  var QUAD_C_MIN = -6, QUAD_C_MAX = 6;
  var QUAD_XS = [1, 2, 3, 4, 5]; // never includes 0, so c can't be read straight off the table

  var EXP_BASE_VALUES = [2, 3, 4];
  var EXP_K_VALUES = [-3, -2, -1, 1, 2, 3];
  var EXP_C_MIN = -5, EXP_C_MAX = 5;
  var EXP_XS = [0, 1, 2, 3];

  var TYPES = ['linear', 'quadratic', 'exponential'];

  var PROMPT_TEXT = 'This looks like it could be linear, quadratic, or exponential — write its full equation.';
  var HINT_TEXT = 'For a linear table, differences are constant — for a quadratic, second differences are ' +
    'constant — for an exponential, ratios are constant. Write whichever fits: y = mx + c, ' +
    'y = ax^2 + bx + c, or y = a(b)^x + c.';

  var els = {};
  var current = null;    // { type, ...params, xs, ys }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function close(a, b){ return Math.abs(a - b) < 0.01; }

  // ---- Question generation, one function per type --------------------

  function generateLinear(){
    var m = randChoice(LINEAR_M_VALUES);
    var c = randInt(LINEAR_C_MIN, LINEAR_C_MAX);
    var ys = LINEAR_XS.map(function(x){ return m * x + c; });
    return { type: 'linear', m: m, c: c, xs: LINEAR_XS, ys: ys };
  }

  function generateQuadratic(){
    var a = randChoice(QUAD_A_VALUES);
    var b = randChoice(QUAD_B_VALUES);
    var c = randInt(QUAD_C_MIN, QUAD_C_MAX);
    var ys = QUAD_XS.map(function(x){ return a * x * x + b * x + c; });
    return { type: 'quadratic', a: a, b: b, c: c, xs: QUAD_XS, ys: ys };
  }

  function generateExponential(){
    var k = randChoice(EXP_K_VALUES);
    var base = randChoice(EXP_BASE_VALUES);
    var c = randInt(EXP_C_MIN, EXP_C_MAX);
    var ys = EXP_XS.map(function(x){ return k * Math.pow(base, x) + c; });
    return { type: 'exponential', k: k, base: base, c: c, xs: EXP_XS, ys: ys };
  }

  function generateQuestion(type){
    if(type === 'linear') return generateLinear();
    if(type === 'quadratic') return generateQuadratic();
    return generateExponential();
  }

  function nextQuestion(){
    current = generateQuestion(randChoice(TYPES));
    answered = false;
    working.reset();

    renderTable();
    renderQuestion();
  }

  function renderTable(){
    var headRow = '<tr><th>x</th>' + current.xs.map(function(x){ return '<td>' + x + '</td>'; }).join('') + '</tr>';
    var bodyRow = '<tr><th>y</th>' + current.ys.map(function(y){ return '<td>' + y + '</td>'; }).join('') + '</tr>';
    els.table.innerHTML = headRow + bodyRow;
  }

  // ---- Formatting — one pair (format) per type, copied verbatim from
  // each source component's own formatter. ----------------------------

  // shared by the quadratic and exponential formatters, same as the
  // coeffLabel/signedConst helpers in practice-parabola-from-table.js
  // and practice-exp-from-table.js.
  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }
  function signedTerm(v, suffix){
    var mag = Math.abs(v) === 1 ? '' : String(Math.abs(v));
    return (v > 0 ? ' + ' : ' - ') + mag + suffix;
  }

  // practice-line-from-table.js's formatEquation
  function formatLinearEquation(m, c){
    var mStr = m === 1 ? '' : (m === -1 ? '-' : String(m));
    var cStr = c === 0 ? '' : (c > 0 ? (' + ' + c) : (' - ' + Math.abs(c)));
    return 'y = ' + mStr + 'x' + cStr;
  }

  // practice-parabola-from-table.js's formatFinalEquation
  function formatQuadraticEquation(a, b, c){
    return 'y = ' + coeffLabel(a) + 'x^2' + signedTerm(b, 'x') + signedConst(c);
  }

  // practice-exp-from-table.js's formatExpEquation
  function formatExponentialEquation(k, base, c){
    return 'y = ' + coeffLabel(k) + '(' + base + ')^x' + signedConst(c);
  }

  function formatCurrentEquation(q){
    if(q.type === 'linear') return formatLinearEquation(q.m, q.c);
    if(q.type === 'quadratic') return formatQuadraticEquation(q.a, q.b, q.c);
    return formatExponentialEquation(q.k, q.base, q.c);
  }

  // ---- Parsing — one parser per type, copied verbatim from each
  // source component's own parser. -------------------------------

  // practice-line-from-table.js's parseEquationString: "y = 3x - 6"
  function parseLinearEquation(raw){
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

  // practice-parabola-from-table.js's parseFinalEquation: "y = 2x^2 - 3x - 3"
  function parseQuadraticEquation(raw){
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

  // practice-exp-from-table.js's parseExpEquation: "y = -2(3)^x + 1"
  function parseExponentialEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([+-]?\d*)\((\d+)\)\^x([+-]\d+)?$/);
    if(!m) return null;
    var k = parseGradient(m[1]);
    if(isNaN(k)) return null;
    var base = parseInt(m[2], 10);
    var c = m[3] ? parseFloat(m[3]) : 0;
    return { k: k, base: base, c: c };
  }

  // Tries the parser matching the current question's actual type —
  // the student has to have both recognised the type *and* written
  // its equation shape correctly for parsing to succeed at all.
  function checkParsedAgainstCurrent(raw, q){
    if(q.type === 'linear'){
      var lin = parseLinearEquation(raw);
      return !!lin && close(lin.m, q.m) && close(lin.c, q.c);
    }
    if(q.type === 'quadratic'){
      var quad = parseQuadraticEquation(raw);
      return !!quad && close(quad.a, q.a) && close(quad.b, q.b) && close(quad.c, q.c);
    }
    var exp = parseExponentialEquation(raw);
    return !!exp && close(exp.k, q.k) && exp.base === q.base && close(exp.c, q.c);
  }

  // ---- Rendering ---------------------------------------------------

  function renderQuestion(){
    els.stepPrompt.textContent = PROMPT_TEXT;
    els.hint.textContent = HINT_TEXT;
    els.eqInput.value = '';
    els.eqInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.eqInput.focus();
  }

  // ---- Checking ------------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var raw = els.eqInput.value.trim();
    var ok = checkParsedAgainstCurrent(raw, current);
    els.eqInput.classList.toggle('right', ok);
    els.eqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push(raw);
    } else {
      var correctStr = formatCurrentEquation(current);
      els.feedback.textContent = 'Not quite. ' + correctStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  function handleCheckOrAdvance(){
    if(!answered){
      var scored = checkAnswer();
      if(scored){ answered = true; els.checkBtn.textContent = 'Next question'; }
    } else {
      nextQuestion();
    }
  }

  function init(opts){
    opts = opts || {};
    els.table = document.getElementById('mixedtables-table');
    els.stepPrompt = document.getElementById('mixedtables-step-prompt');
    els.eqInput = document.getElementById('mixedtables-eq-input');
    els.hint = document.getElementById('mixedtables-hint');
    els.feedback = document.getElementById('mixedtables-feedback');
    els.score = document.getElementById('mixedtables-score');
    els.checkBtn = document.getElementById('mixedtables-check-btn');
    els.nextBtn = document.getElementById('mixedtables-next-btn');
    els.backBtn = document.getElementById('mixedtables-back-btn');
    els.workingCard = document.getElementById('mixedtables-working-card');
    els.workingLines = document.getElementById('mixedtables-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.eqInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
    });

    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    if(VM.PowerPreview) VM.PowerPreview.init();
    if(VM.KeybindHelp) VM.KeybindHelp.attach(document.getElementById('mixedtables-keybind-help'));
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
