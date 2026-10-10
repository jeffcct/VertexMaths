/* ============================================================
   practice-word-interpreting.js — the PracticeWordInterpreting
   component: a question generator for "Word interpreting", the Exam
   Questions strand's second topic. Describes a triangle's three
   sides in words, each one built from the last ("YZ is m longer
   than XY", "XZ is 3 cm shorter than YZ"), then gives a constraint
   relating the perimeter to one side ("the perimeter is exactly n
   times the length of side XY") and asks for an expression for the
   perimeter in terms of the one variable that constraint doesn't
   eliminate. The student has to translate the words into algebra,
   use the constraint to solve for the base side in terms of the
   other variable, then substitute back in — the whole derivation
   happens off-screen; only the final expression is scored.

   The algebra, worked through once in general terms (sides are in
   terms of a base variable `p` and an offset variable `q`, with a
   numeric offset `k` and multiplier `n`):
     side1 = p
     side2 = p + s1*q                    (s1 = +-1, "longer"/"shorter")
     side3 = p + s1*q + s2*k             (s2 = +-1, "longer"/"shorter")
     perimeter = 3p + 2*s1*q + s2*k
     constraint: perimeter = n*p
       => (n-3)*p = 2*s1*q + s2*k
       => p = D*(2*s1*q + s2*k), where D = n-3 (restricted to +-1 below,
          so this is always exact — no fractional p to worry about)
     answer: perimeter = n*p = (n*D*2*s1)*q + (n*D*s2*k)

   n is restricted to {2, 4} specifically so D = n-3 is always +-1 —
   dividing by D is then just a sign flip, guaranteeing the answer's
   coefficients are always clean integers for any k/s1/s2, with no
   need to filter out messy-fraction cases the way a wider n range
   would require.

   No adaptive scaffold: every question is a single directly-scored
   step, the same convention used by practice-algebraic-perimeter.js
   for this strand's other topic — the "rearrange for a variable and
   solve" happens in the student's own working, not as an on-screen
   scaffold.

   Public API: VM.PracticeWordInterpreting.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeWordInterpreting = (function(){
  var parseGradient = VM.EquationParse.parseGradient;

  var VERTEX_SETS = [['X','Y','Z'], ['A','B','C'], ['P','Q','R'], ['L','M','N'], ['R','S','T']];
  var VAR_POOL = ['w', 'm', 'a', 'b', 'c', 'd', 'k', 'n', 'p', 'q', 'r', 's', 't'];
  var K_MIN = 2, K_MAX = 9;
  var N_WORDS = { 2: 'twice', 4: 'four times' };
  var N_VALUES = [2, 4];

  var els = {};
  var current = null;    // { vertices, baseVar, targetVar, s1, s2, k, n, mCoeff, constTerm }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randSign(){ return Math.random() < 0.5 ? 1 : -1; }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var vertices = randChoice(VERTEX_SETS);
    var baseVar = randChoice(VAR_POOL);
    var targetVar;
    do { targetVar = randChoice(VAR_POOL); } while(targetVar === baseVar);

    var s1 = randSign(), s2 = randSign();
    var k = randInt(K_MIN, K_MAX);
    var n = randChoice(N_VALUES);
    var d = n - 3; // always +-1, see file header

    var mCoeff = n * d * 2 * s1;
    var constTerm = n * d * s2 * k;

    current = {
      vertices: vertices, baseVar: baseVar, targetVar: targetVar,
      s1: s1, s2: s2, k: k, n: n,
      mCoeff: mCoeff, constTerm: constTerm
    };
    answered = false;
    working.reset();

    renderStatement();
    renderShape();
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.focus();
  }

  function sideNames(vertices){
    return {
      side1: vertices[0] + vertices[1],
      side2: vertices[1] + vertices[2],
      side3: vertices[0] + vertices[2]
    };
  }

  function relWord(sign){ return sign > 0 ? 'longer' : 'shorter'; }

  function renderStatement(){
    var v = current.vertices;
    var names = sideNames(v);
    var lines = [
      'A triangle ' + v.join('') + ' has sides with the following lengths in cm:',
      names.side1 + ' = ' + current.baseVar,
      names.side2 + ' is ' + current.targetVar + ' ' + relWord(current.s1) + ' than ' + names.side1 + '.',
      names.side3 + ' is ' + current.k + ' cm ' + relWord(current.s2) + ' than ' + names.side2 + '.',
      'The perimeter of the triangle is exactly ' + N_WORDS[current.n] + ' the length of side ' + names.side1 + '.',
      'Find an expression for the perimeter in terms of ' + current.targetVar + '.'
    ];
    els.statement.innerHTML = lines.map(function(l){ return '<div>' + l + '</div>'; }).join('');
  }

  // ---- Shape geometry / SVG rendering --------------------------------
  // A fixed, schematic triangle (not drawn to real scale, same as a
  // typical exam diagram) with just its vertices labelled — the side
  // relationships are already spelled out in the statement above, so
  // labelling sides on the diagram too would only repeat it.

  function renderShape(){
    var poly = [{x:150,y:30}, {x:250,y:180}, {x:50,y:180}];
    var svg = '<polygon points="' + poly.map(function(p){ return p.x + ',' + p.y; }).join(' ') + '" class="shape-outline"></polygon>';
    var labelOffsets = [{dx:0,dy:-14}, {dx:16,dy:10}, {dx:-16,dy:10}];
    current.vertices.forEach(function(letter, i){
      var p = poly[i], off = labelOffsets[i];
      svg += '<text x="' + (p.x + off.dx) + '" y="' + (p.y + off.dy) + '" class="shape-label">' + letter + '</text>';
    });
    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A triangle with vertices labelled ' + current.vertices.join(', ') + '.');
  }

  // ---- Formatting / parsing ------------------------------------------

  function coeffLabel(v){
    if(v === 1) return '';
    if(v === -1) return '-';
    return String(v);
  }

  function formatAnswer(mCoeff, constTerm, varLetter){
    var s = coeffLabel(mCoeff) + varLetter;
    if(constTerm > 0) s += ' + ' + constTerm;
    else if(constTerm < 0) s += ' - ' + Math.abs(constTerm);
    return s;
  }

  // Accepts "Aq + B", "Aq - B", "Aq" (B = 0) or a bare "B" (A = 0),
  // with the usual blank-means-1/"-"-means--1 coefficient shorthand —
  // same shape as practice-simp-expr.js's parseCombineAnswer, just
  // parametrised on which letter this question's target variable is.
  function parseAnswer(raw, varLetter){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s === '') return null;
    var v = varLetter.toLowerCase();
    var re = new RegExp('^([+-]?\\d*)' + v + '([+-]\\d+)?$');
    var m = s.match(re);
    if(m){
      var a = parseGradient(m[1]);
      if(isNaN(a)) return null;
      var b = m[2] ? parseInt(m[2], 10) : 0;
      return { a: a, b: b };
    }
    var m2 = s.match(/^([+-]?\d+)$/);
    if(m2) return { a: 0, b: parseInt(m2[1], 10) };
    return null;
  }

  // ---- Checking -------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var raw = (els.answerInput.value || '').trim();
    var parsed = parseAnswer(raw, current.targetVar);
    if(!parsed){
      els.feedback.textContent = 'Write it as a multiple of ' + current.targetVar + ' plus or minus a number, e.g. 8' + current.targetVar + ' - 12.';
      els.feedback.className = 'feedback incorrect';
      els.answerInput.classList.add('wrong');
      return false;
    }

    var ok = parsed.a === current.mCoeff && parsed.b === current.constTerm;
    els.answerInput.classList.toggle('right', ok);
    els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what was typed — see the echo-the-student's-
      // answer convention in CLAUDE.md.
      els.feedback.textContent = 'Correct — ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push('Perimeter = ' + raw);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + formatAnswer(current.mCoeff, current.constTerm, current.targetVar) + '.';
      els.feedback.className = 'feedback incorrect';
    }
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Next button --------------------------------

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
    els.svg = document.getElementById('wordint-shape-svg');
    els.statement = document.getElementById('wordint-statement');
    els.answerInput = document.getElementById('wordint-answer-input');
    els.feedback = document.getElementById('wordint-feedback');
    els.score = document.getElementById('wordint-score');
    els.checkBtn = document.getElementById('wordint-check-btn');
    els.nextBtn = document.getElementById('wordint-next-btn');
    els.backBtn = document.getElementById('wordint-back-btn');
    els.workingCard = document.getElementById('wordint-working-card');
    els.workingLines = document.getElementById('wordint-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.answerInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
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
