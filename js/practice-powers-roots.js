/* ============================================================
   practice-powers-roots.js — the PracticePowersRoots component: a
   question generator for "Solving equations with powers and roots".
   Unlike most other Practice components in this codebase, there's no
   adaptive scaffold here — every question is a single directly-scored
   step with a helpful hint alongside it, the same convention used by
   practice-multi-step.js for this topic's foundational-review sibling.

   Each question is one of three kinds, picked at random:
     - 'square': x² = k        where k = n² for integer n = 2..12.
                 Answer is TWO values, n and -n — entered in two
                 separate boxes, either order accepted (same pattern
                 as checkSolve/rootsMatch in practice-solving-polys.js).
     - 'cube':   x³ = k        where k = n³ for integer n = -5..5,
                 n != 0. Answer is the single value n — this CAN be
                 negative, unlike the square case, since cube roots of
                 negative numbers are real.
     - 'root':   √x = n        where n = 1..12 (displayed with a
                 literal "√" character). Answer is the single value
                 x = n², always non-negative since n > 0.

   Public API: VM.PracticePowersRoots.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticePowersRoots = (function(){
  var SQUARE_N_MIN = 2, SQUARE_N_MAX = 12;
  var CUBE_N_MIN = -5, CUBE_N_MAX = 5;
  var ROOT_N_MIN = 1, ROOT_N_MAX = 12;

  var els = {};
  var current = null;    // { kind, n, k } — meaning of n/k depends on kind
  var score = { correct: 0, attempted: 0 };
  var answered = false;  // has the current question already been checked?
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randNonZero(lo, hi){
    var v;
    do { v = randInt(lo, hi); } while(v === 0);
    return v;
  }
  function pick(list){ return list[Math.floor(Math.random() * list.length)]; }

  // Order-independent pair comparison — same pattern as rootsMatch in
  // practice-solving-polys.js / practice-parabola-intercepts.js.
  function pairMatch(got, a, b){
    var g = got.slice().sort(function(x, y){ return x - y; });
    var want = [a, b].sort(function(x, y){ return x - y; });
    return Math.abs(g[0] - want[0]) < 0.01 && Math.abs(g[1] - want[1]) < 0.01;
  }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var kind = pick(['square', 'cube', 'root']);

    if(kind === 'square'){
      var n = randInt(SQUARE_N_MIN, SQUARE_N_MAX);
      current = { kind: kind, n: n, k: n * n };
    } else if(kind === 'cube'){
      var n2 = randNonZero(CUBE_N_MIN, CUBE_N_MAX);
      current = { kind: kind, n: n2, k: n2 * n2 * n2 };
    } else {
      var n3 = randInt(ROOT_N_MIN, ROOT_N_MAX);
      current = { kind: kind, n: n3, k: n3 * n3 };
    }

    answered = false;
    working.reset();
    renderGiven();
    resetInputs();
  }

  // ---- Formatting ------------------------------------------------

  function formatEquation(q){
    if(q.kind === 'square') return 'x² = ' + q.k;
    if(q.kind === 'cube') return 'x³ = ' + q.k;
    return '√x = ' + q.n;
  }

  function hintFor(kind){
    if(kind === 'square'){
      return 'Taking the square root of both sides gives two answers, positive and negative — e.g. x² = 16 gives x = 4 or x = -4.';
    }
    if(kind === 'cube'){
      return 'Taking the cube root of both sides gives one answer — e.g. x³ = 8 gives x = 2, and x³ = -8 gives x = -2.';
    }
    return 'Square both sides to undo the square root — e.g. √x = 3 gives x = 9.';
  }

  function renderGiven(){
    els.equation.textContent = formatEquation(current);
    els.hint.textContent = hintFor(current.kind);
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function resetInputs(){
    var kind = current.kind;
    ['square', 'single'].forEach(function(name){
      els.rowsByKind[name].hidden = !((name === 'square' && kind === 'square') || (name === 'single' && kind !== 'square'));
    });

    if(kind === 'square') clearInputs([els.solveX1, els.solveX2]);
    else clearInputs([els.solveSingle]);

    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    (kind === 'square' ? els.solveX1 : els.solveSingle).focus();
  }

  // ---- Checking: the single, directly-scored step --------------------

  function checkSquare(){
    var raw1 = (els.solveX1.value || '').trim(), raw2 = (els.solveX2.value || '').trim();
    var x1 = parseFloat(raw1), x2 = parseFloat(raw2);
    var validNums = !isNaN(x1) && !isNaN(x2);
    var ok = validNums && pairMatch([x1, x2], current.n, -current.n);
    els.solveX1.classList.toggle('right', ok); els.solveX1.classList.toggle('wrong', !ok);
    els.solveX2.classList.toggle('right', ok); els.solveX2.classList.toggle('wrong', !ok);

    var solutionStr = 'x = ' + current.n + ' or x = ' + (-current.n);
    if(ok){
      // Echo the typed values (may be in either order) rather than the
      // generator's own n/-n order — see the "echo the student's own
      // answer" rule in CLAUDE.md, and GitHub issue #17.
      var typedStr = 'x = ' + raw1 + ' or x = ' + raw2;
      els.feedback.textContent = 'Correct — ' + typedStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(typedStr);
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + solutionStr + '.';
      els.feedback.className = 'feedback incorrect';
    }
    return ok;
  }

  function checkSingle(){
    var raw = (els.solveSingle.value || '').trim();
    var val = parseFloat(raw);
    var target = current.kind === 'cube' ? current.n : current.k;
    var ok = !isNaN(val) && Math.abs(val - target) < 0.01;
    els.solveSingle.classList.toggle('right', ok); els.solveSingle.classList.toggle('wrong', !ok);

    if(ok){
      var typedStr = 'x = ' + raw;
      els.feedback.textContent = 'Correct — ' + typedStr + '.';
      els.feedback.className = 'feedback correct';
      working.push(typedStr);
    } else {
      els.feedback.textContent = 'Not quite. x = ' + target + '.';
      els.feedback.className = 'feedback incorrect';
    }
    return ok;
  }

  function checkAnswer(){
    if(!current) return false;
    var ok = current.kind === 'square' ? checkSquare() : checkSingle();

    score.attempted++;
    if(ok) score.correct++;
    els.score.textContent = score.correct + ' / ' + score.attempted;
    return true;
  }

  // ---- Check/Next button --------------------------------

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
    els.equation = document.getElementById('powersroots-equation');
    els.hint = document.getElementById('powersroots-hint');
    els.feedback = document.getElementById('powersroots-feedback');
    els.score = document.getElementById('powersroots-score');
    els.checkBtn = document.getElementById('powersroots-check-btn');
    els.nextBtn = document.getElementById('powersroots-next-btn');
    els.backBtn = document.getElementById('powersroots-back-btn');
    els.workingCard = document.getElementById('powersroots-working-card');
    els.workingLines = document.getElementById('powersroots-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.solveSingle = document.getElementById('powersroots-solve-single');
    els.solveX1 = document.getElementById('powersroots-solve-x1');
    els.solveX2 = document.getElementById('powersroots-solve-x2');

    els.rowsByKind = {
      single: document.getElementById('powersroots-row-single'),
      square: document.getElementById('powersroots-row-square')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.solveSingle, els.solveX1, els.solveX2].forEach(function(input){
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
