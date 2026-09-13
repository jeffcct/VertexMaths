/* ============================================================
   practice-exp-with-shift.js — the PracticeExpWithShift component:
   a question generator for "Finding the equation of an exponential
   (from a graph, with a vertical shift)". Plots a random
   y = a*b^x + c on a coordinate grid with the points at x = 0 and
   x = 1 marked, states the base b directly (two marked points give
   only two equations, so a third unknown can't be recovered from the
   graph alone — b has to be given), and walks the student through
   the same substitute-and-solve method PracticeExpFromTable uses for
   its table version, just sourcing the two points from the graph
   instead of a table row:

   Below 3 questions answered, or under 90% accuracy, a four-step
   scaffold:
     1. write the basic equation with the given base substituted in,
        a and c left as literal letters (nothing's solved them yet).
     2. substitute the marked points at x = 0 and x = 1 to get two
        equations in a and c (b^0 = 1 keeps the first one simple).
     3. solve that pair of equations for a and c.
     4. write the full equation — the only step that's scored.

   At 3+ questions and 90%+ accuracy, the scaffold is skipped and the
   question goes straight to step 4.

   Public API: VM.PracticeExpWithShift.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeExpWithShift = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  var A_VALUES = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]; // nonzero integer coefficient
  var B_VALUES = [2, 3];                              // positive integer base — given directly
  var C_VALUES = [-4, -3, -2, -1, 1, 2, 3, 4];         // nonzero integer vertical shift

  var SCAFFOLD_MIN_ATTEMPTS = 3;
  var SCAFFOLD_MIN_ACCURACY = 0.90;

  var els = {};
  var current = null;    // { a, b, c, y0, y1 } — y0 = a + c (at x=0), y1 = a*b + c (at x=1)
  var score = { correct: 0, attempted: 0 };
  var steps = [];
  var stepIndex = 0;
  var stepAnswered = false;
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function toPx(x, y){ return grid.toPx(x, y); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function close(a, b){ return Math.abs(a - b) < 0.01; }
  function accuracy(){ return score.attempted ? score.correct / score.attempted : 0; }
  function needsScaffold(){
    return score.attempted < SCAFFOLD_MIN_ATTEMPTS || accuracy() < SCAFFOLD_MIN_ACCURACY;
  }

  function currentStepName(){ return steps[stepIndex]; }
  function isFinalStep(){ return currentStepName() === 'final-equation'; }

  // ---- Question generation -----------------------------------------

  // Picks a, b and c together so the two marked points — at x = 0
  // (y = a + c) and x = 1 (y = a*b + c) — both land comfortably
  // inside the grid, where they can actually be plotted and read.
  function pickABC(){
    var candidates = [];
    A_VALUES.forEach(function(a){
      B_VALUES.forEach(function(b){
        C_VALUES.forEach(function(c){
          var y0 = a + c, y1 = a * b + c;
          if(Math.abs(y0) <= GRID_MAX - 0.5 && Math.abs(y1) <= GRID_MAX - 0.5){
            candidates.push({ a: a, b: b, c: c, y0: y0, y1: y1 });
          }
        });
      });
    });
    return candidates.length ? randChoice(candidates) : { a: 1, b: 2, c: 1, y0: 2, y1: 3 };
  }

  function nextQuestion(){
    current = pickABC();

    var scaffold = needsScaffold();
    steps = scaffold
      ? ['basic-equation', 'substitute-points', 'solve-ac', 'final-equation']
      : ['final-equation'];
    stepIndex = 0;
    stepAnswered = false;
    answered = false;
    working.reset();
    els.modeNote.textContent = scaffold ? '' : "You've got this — just write the full equation.";
    els.givenB.textContent = current.b;

    renderGraph();
    renderStep();
  }

  function svgCurve(){
    var samples = 240;
    var d = '';
    var wasIn = false;
    for(var i = 0; i <= samples; i++){
      var x = GRID_MIN + (GRID_MAX - GRID_MIN) * i / samples;
      var y = current.a * Math.pow(current.b, x) + current.c;
      var inRange = y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9;
      if(inRange){
        var px = toPx(x, y);
        d += (wasIn ? ' L ' : ' M ') + px.x + ' ' + px.y;
      }
      wasIn = inRange;
    }
    var p0 = toPx(0, current.y0), p1 = toPx(1, current.y1);
    return '<path d="' + d + '" class="plot-curve"></path>' +
      '<circle cx="' + p0.x + '" cy="' + p0.y + '" r="4.5" class="plot-point"></circle>' +
      '<circle cx="' + p1.x + '" cy="' + p1.y + '" r="4.5" class="plot-point"></circle>';
  }

  function renderGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgCurve();
    els.svg.setAttribute('aria-label', 'An exponential curve plotted on a coordinate grid, with the points at x = 0 and x = 1 marked.');
  }

  // ---- Formatting ------------------------------------------------

  function coeffLabel(v){ return v === 1 ? '' : (v === -1 ? '-' : String(v)); }
  function signedConst(v){ return v === 0 ? '' : (v > 0 ? (' + ' + v) : (' - ' + Math.abs(v))); }

  function formatExpEquation(a, b, c){
    return 'y = ' + coeffLabel(a) + '(' + b + ')^x' + signedConst(c);
  }

  // "y = a(3)^x + c" — the given base substituted, a and c left literal.
  function parseBasicEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^y=a\((\d+)\)\^x\+c$/);
    if(!m) return null;
    return { b: parseInt(m[1], 10) };
  }

  // "a + c = 5" or "3a + c = 17" — one linear equation in a and c;
  // c's own coefficient is always 1 in both equations this generator
  // asks for, so only a's coefficient varies. Also accepts the
  // constant written first, e.g. "5 = a + c".
  function parseLinearAC(raw){
    return VM.EquationParse.parseEitherSide(raw, function(s){
      s = (s || '').toLowerCase().replace(/\s+/g, '');
      var m = s.match(/^([+-]?\d*)a\+c=([+-]?\d+)$/);
      if(!m) return null;
      var aCoeff = parseGradient(m[1]);
      if(isNaN(aCoeff)) return null;
      var rhs = parseFloat(m[2]);
      if(isNaN(rhs)) return null;
      return { aCoeff: aCoeff, rhs: rhs };
    });
  }

  // "y = -2(3)^x + 1" — the full equation.
  function parseExpEquation(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);
    var m = s.match(/^([+-]?\d*)\((\d+)\)\^x([+-]\d+)?$/);
    if(!m) return null;
    var a = parseGradient(m[1]);
    if(isNaN(a)) return null;
    var b = parseInt(m[2], 10);
    var c = m[3] ? parseFloat(m[3]) : 0;
    return { a: a, b: b, c: c };
  }

  // ---- Step rendering -------------------------------------------------

  function stepPrompt(name){
    var n = steps.length === 1 ? '' : ('Step ' + (stepIndex + 1) + ' of ' + steps.length + ': ');
    switch(name){
      case 'basic-equation': return n + 'Write the basic equation, using the given base.';
      case 'substitute-points': return n + 'Substitute the two marked points (at x = 0 and x = 1) to get two equations.';
      case 'solve-ac': return n + 'Solve those two equations for a and c.';
      case 'final-equation': return steps.length === 1 ? 'Write the full equation.' : (n + 'Write the full equation.');
    }
  }

  function stepHint(name){
    switch(name){
      case 'basic-equation': return 'Leave a and c as letters, e.g. y = a(5)^x + c.';
      case 'substitute-points':
        return 'At x = 0, b^0 = 1, so the a-term has no coefficient — e.g. if y were 20 there, you\'d write a + c = 20. ' +
          'At x = 1, b^1 is just the base itself, so multiply a by it — e.g. with base 5 and y = 30 there, you\'d write 5a + c = 30.';
      case 'solve-ac': return 'Subtract one equation from the other to eliminate c first.';
      case 'final-equation': return 'Write it as y = a(b)^x + c with all three substituted, e.g. y = -4(5)^x + 6.';
    }
  }

  function clearInputs(list){ list.forEach(function(el){ el.value = ''; el.classList.remove('right', 'wrong'); }); }

  function renderStep(){
    var name = currentStepName();

    ['basic-equation', 'substitute-points', 'solve-ac', 'final-equation'].forEach(function(n){
      els.rowsByName[n].hidden = (n !== name);
    });

    if(name === 'basic-equation') clearInputs([els.basicEqInput]);
    if(name === 'substitute-points') clearInputs([els.subEq1Input, els.subEq2Input]);
    if(name === 'solve-ac') clearInputs([els.solveAInput, els.solveCInput]);
    if(name === 'final-equation') clearInputs([els.finalEqInput]);

    els.stepPrompt.textContent = stepPrompt(name);
    els.hint.textContent = stepHint(name);
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';

    var focusMap = {
      'basic-equation': els.basicEqInput, 'substitute-points': els.subEq1Input,
      'solve-ac': els.solveAInput, 'final-equation': els.finalEqInput
    };
    if(focusMap[name]) focusMap[name].focus();
  }

  function advanceStep(){
    stepIndex++;
    stepAnswered = false;
    renderStep();
  }

  // ---- Checking: ungraded scaffold steps -----------------------------

  function checkBasicEquation(){
    var parsed = parseBasicEquation(els.basicEqInput.value);
    var ok = !!parsed && parsed.b === current.b;
    els.basicEqInput.classList.toggle('right', ok); els.basicEqInput.classList.toggle('wrong', !ok);
    var correctStr = 'y = a(' + current.b + ')^x + c';
    els.feedback.textContent = ok ? ('Correct — ' + correctStr + '.') : ('Not quite. It should be ' + correctStr + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push(correctStr);
    return ok;
  }

  function checkSubstitutePoints(){
    var raw1 = (els.subEq1Input.value || '').trim(), raw2 = (els.subEq2Input.value || '').trim();
    var eq1 = parseLinearAC(raw1);
    var eq2 = parseLinearAC(raw2);
    var eq1Ok = !!eq1 && close(eq1.aCoeff, 1) && close(eq1.rhs, current.y0);
    var eq2Ok = !!eq2 && close(eq2.aCoeff, current.b) && close(eq2.rhs, current.y1);
    els.subEq1Input.classList.toggle('right', eq1Ok); els.subEq1Input.classList.toggle('wrong', !eq1Ok);
    els.subEq2Input.classList.toggle('right', eq2Ok); els.subEq2Input.classList.toggle('wrong', !eq2Ok);
    var ok = eq1Ok && eq2Ok;
    var correct1 = 'a + c = ' + current.y0;
    var correct2 = current.b + 'a + c = ' + current.y1;
    // On success, echo what was actually typed (the equation's sides
    // may be swapped) rather than the canonical side order — see
    // GitHub issue #17.
    els.feedback.textContent = ok ? ('Correct — ' + raw1 + ' and ' + raw2 + '.') : ('Not quite. It should be ' + correct1 + ' and ' + correct2 + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok){ working.push(raw1); working.push(raw2); }
    return ok;
  }

  function checkSolveAC(){
    var aVal = parseFraction(els.solveAInput.value);
    var cVal = parseFraction(els.solveCInput.value);
    var aOk = !isNaN(aVal) && close(aVal, current.a);
    var cOk = !isNaN(cVal) && close(cVal, current.c);
    els.solveAInput.classList.toggle('right', aOk); els.solveAInput.classList.toggle('wrong', !aOk);
    els.solveCInput.classList.toggle('right', cOk); els.solveCInput.classList.toggle('wrong', !cOk);
    var ok = aOk && cOk;
    els.feedback.textContent = ok ?
      ('Correct — a = ' + current.a + ', c = ' + current.c + '.') :
      ('Not quite. a = ' + current.a + ', c = ' + current.c + '.');
    els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
    if(ok) working.push('a = ' + current.a + ', c = ' + current.c);
    return ok;
  }

  function checkStep(name){
    if(name === 'basic-equation') return checkBasicEquation();
    if(name === 'substitute-points') return checkSubstitutePoints();
    if(name === 'solve-ac') return checkSolveAC();
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
    var ok = close(parsed.a, current.a) && parsed.b === current.b && close(parsed.c, current.c);
    els.finalEqInput.classList.toggle('right', ok); els.finalEqInput.classList.toggle('wrong', !ok);

    score.attempted++;
    var correctStr = formatExpEquation(current.a, current.b, current.c);
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
    els.svg = document.getElementById('expwithshift-graph-svg');
    els.givenB = document.getElementById('expwithshift-given-b');
    els.stepPrompt = document.getElementById('expwithshift-step-prompt');
    els.modeNote = document.getElementById('expwithshift-mode-note');
    els.hint = document.getElementById('expwithshift-hint');
    els.feedback = document.getElementById('expwithshift-feedback');
    els.score = document.getElementById('expwithshift-score');
    els.checkBtn = document.getElementById('expwithshift-check-btn');
    els.nextBtn = document.getElementById('expwithshift-next-btn');
    els.backBtn = document.getElementById('expwithshift-back-btn');
    els.workingCard = document.getElementById('expwithshift-working-card');
    els.workingLines = document.getElementById('expwithshift-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.basicEqInput = document.getElementById('expwithshift-basic-eq');
    els.subEq1Input = document.getElementById('expwithshift-sub-eq1');
    els.subEq2Input = document.getElementById('expwithshift-sub-eq2');
    els.solveAInput = document.getElementById('expwithshift-solve-a');
    els.solveCInput = document.getElementById('expwithshift-solve-c');
    els.finalEqInput = document.getElementById('expwithshift-final-eq');

    els.rowsByName = {
      'basic-equation': document.getElementById('expwithshift-step-basic-equation'),
      'substitute-points': document.getElementById('expwithshift-step-substitute-points'),
      'solve-ac': document.getElementById('expwithshift-step-solve-ac'),
      'final-equation': document.getElementById('expwithshift-step-final-equation')
    };

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);

    [els.basicEqInput, els.subEq1Input, els.subEq2Input,
      els.solveAInput, els.solveCInput, els.finalEqInput
    ].forEach(function(input){
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
