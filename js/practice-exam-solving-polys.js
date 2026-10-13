/* ============================================================
   practice-exam-solving-polys.js — the PracticeExamSolvingPolys
   component: a question generator for "Solving polynomial equations
   (rearranging required)", the Exam Questions strand's harder sibling
   of practice-solving-polys.js. Two differences from that component:

     - The equation is non-monic (leading coefficient a != 1), built
       from two binomial factors (mx + p)(nx + q) — the same
       construction as practice-factor-nonmonic.js — so factoring it
       needs the full AC method (find two numbers that multiply to
       a*c and add to b, split the middle term, factor by grouping),
       not just "find a pair that multiplies to c and adds to b".
       The two solutions are the roots x = -p/m and x = -q/n, which
       are often fractions rather than whole numbers.

     - The equation is never shown already sitting at "= 0". One of
       its three terms (or a pair of them) is always moved to the
       other side first — e.g. "6x² + 5x = 4" instead of
       "6x² + 5x - 4 = 0" — so rearranging it back to standard form is
       itself part of the question, not a given starting point.

   Despite the extra setup, only the final two solutions are scored —
   same single-directly-scored-step convention as every other Exam
   Questions topic; the rearranging and factoring are the student's
   own unscored working, exactly as they'd be in an exam.

   m is drawn from [2, 3] and n from [1, 2, 3] (a = m*n), and p, q are
   drawn from a pool of small nonzero integers, rerolled until
   gcd(m, p) = 1 and gcd(n, q) = 1 — this keeps neither root
   reducible further and matches practice-factor-nonmonic.js's own
   generation exactly, just carried through to the solved roots
   instead of stopping at the factored form.

   Public API: VM.PracticeExamSolvingPolys.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExamSolvingPolys = (function(){
  var parseFraction = VM.EquationParse.parseFraction;

  var M_VALUES = [2, 3];
  var N_VALUES = [1, 2, 3];
  var PQ_POOL = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];

  // Which terms (of ax², bx, c) sit on the right-hand side, flipped
  // in sign — every proper, nonempty subset, so the equation is
  // always rearranged away from standard form by at least one term.
  var VARIANTS = [['c'], ['bx'], ['ax2'], ['bx', 'c'], ['ax2', 'c'], ['ax2', 'bx']];

  var els = {};
  var current = null;    // { m, n, p, q, a, b, c, x1, x2, variant }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while(b){ var t = b; b = a % b; a = t; } return a; }
  function close(x, y){ return Math.abs(x - y) < 1e-6; }

  // Order-independent pair comparison — same pattern as rootsMatch in
  // practice-solving-polys.js / practice-parabola-intercepts.js.
  function rootsMatch(got, want1, want2){
    var g = got.slice().sort(function(a, b){ return a - b; });
    var want = [want1, want2].sort(function(a, b){ return a - b; });
    return close(g[0], want[0]) && close(g[1], want[1]);
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var m = randChoice(M_VALUES);
    var n = randChoice(N_VALUES);
    var p, q;
    do {
      p = randChoice(PQ_POOL);
      q = randChoice(PQ_POOL);
    } while(gcd(m, p) !== 1 || gcd(n, q) !== 1);

    var a = m * n, b = m * q + n * p, c = p * q;
    var x1 = -p / m, x2 = -q / n;
    var variant = randChoice(VARIANTS);

    current = { m: m, n: n, p: p, q: q, a: a, b: b, c: c, x1: x1, x2: x2, variant: variant };
    answered = false;
    working.reset();

    renderGiven();
    els.solveX1.value = '';
    els.solveX2.value = '';
    els.solveX1.classList.remove('right', 'wrong');
    els.solveX2.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.solveX1.focus();
  }

  // ---- Formatting (the rearranged given equation) --------------------

  function termMagString(type, value){
    var mag = Math.abs(value);
    if(type === 'ax2') return (mag === 1 ? '' : String(mag)) + 'x²';
    if(type === 'bx') return (mag === 1 ? '' : String(mag)) + 'x';
    return String(mag);
  }

  // Renders one side of the equation from a list of {type, value}
  // terms (value already carrying the correct sign for this side) —
  // zero-valued terms are dropped, and an empty side reads as "0".
  function renderSide(terms){
    var filtered = terms.filter(function(t){ return t.value !== 0; });
    if(filtered.length === 0) return '0';
    var out = '';
    filtered.forEach(function(t, i){
      var mag = termMagString(t.type, t.value);
      out += (i === 0) ? ((t.value < 0 ? '-' : '') + mag) : ((t.value < 0 ? ' - ' : ' + ') + mag);
    });
    return out;
  }

  function renderGiven(){
    var all = [{ type: 'ax2', value: current.a }, { type: 'bx', value: current.b }, { type: 'c', value: current.c }];
    var rightTypes = current.variant;
    var leftTerms = all.filter(function(t){ return rightTypes.indexOf(t.type) === -1; });
    var rightTerms = all.filter(function(t){ return rightTypes.indexOf(t.type) !== -1; })
      .map(function(t){ return { type: t.type, value: -t.value }; });
    els.equation.textContent = renderSide(leftTerms) + ' = ' + renderSide(rightTerms);
  }

  // n/d was built with gcd(d, n) = 1 (see nextQuestion), so it's
  // already in lowest terms — no need to re-derive one from a float.
  function rootLabel(n, d){ return d === 1 ? String(n) : (n + '/' + d); }

  // ---- Checking -------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var raw1 = (els.solveX1.value || '').trim(), raw2 = (els.solveX2.value || '').trim();
    var x1 = parseFraction(raw1), x2 = parseFraction(raw2);
    var validNums = !isNaN(x1) && !isNaN(x2);
    var ok = validNums && rootsMatch([x1, x2], current.x1, current.x2);
    els.solveX1.classList.toggle('right', ok); els.solveX1.classList.toggle('wrong', !ok);
    els.solveX2.classList.toggle('right', ok); els.solveX2.classList.toggle('wrong', !ok);

    score.attempted++;
    var solutionStr = 'x = ' + rootLabel(-current.p, current.m) + ' or x = ' + rootLabel(-current.q, current.n);
    if(ok){
      score.correct++;
      // Echo the typed values (may be in either order, and may be
      // written as an unreduced-but-equal fraction) rather than the
      // generator's own x1/x2 order — see the echo-the-student's-
      // answer convention in CLAUDE.md.
      var typedStr = 'x = ' + raw1 + ' or x = ' + raw2;
      els.feedback.textContent = 'Correct — ' + typedStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(typedStr);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + solutionStr + '.';
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
    els.equation = document.getElementById('examsolvepoly-equation');
    els.feedback = document.getElementById('examsolvepoly-feedback');
    els.score = document.getElementById('examsolvepoly-score');
    els.checkBtn = document.getElementById('examsolvepoly-check-btn');
    els.nextBtn = document.getElementById('examsolvepoly-next-btn');
    els.backBtn = document.getElementById('examsolvepoly-back-btn');
    els.workingCard = document.getElementById('examsolvepoly-working-card');
    els.workingLines = document.getElementById('examsolvepoly-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.solveX1 = document.getElementById('examsolvepoly-solve-x1');
    els.solveX2 = document.getElementById('examsolvepoly-solve-x2');

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    [els.solveX1, els.solveX2].forEach(function(input){
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
