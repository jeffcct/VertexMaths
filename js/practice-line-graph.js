/* ============================================================
   practice-line-graph.js — the PracticeLineGraph component: a
   working question generator for "Finding the equation of a line
   (from a graph)". Draws a random line on a coordinate grid with
   two marked lattice points, takes a y = mx + c answer, and checks
   it. This is the first real Practice implementation — see the
   note at the top of data.js for what Learn/Practice are meant to
   be once every skill has one.

   Adaptive difficulty, in three increasingly-unscaffolded tiers, all
   re-checked before every new question so any of them can drop back
   if accuracy dips:
     - more than 2 questions, above 80% correct: the two fill-in-the-
       blank boxes are replaced with a single box where the student
       types the whole equation themselves, "y =" included
       (e.g. "y = 3x - 6").
     - more than 4 questions, above 95% correct: the score readout
       is hidden too.
     - 10 or more questions, above 95% correct: the two marked points
       are removed from the graph as well, leaving just the line.

   Check / Enter locks the current question in (one attempt counts,
   however many times the key repeats while held); pressing it again
   moves on to the next question, same as clicking "New question".

   Public API: VM.PracticeLineGraph.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeLineGraph = (function(){
  var grid = VM.GraphUtils.makeGrid({ xMin: -7, xMax: 7, cell: 20, margin: 24 });
  var GRID_MIN = grid.xMin, GRID_MAX = grid.xMax;
  var parseGradient = VM.EquationParse.parseGradient;
  var parseFraction = VM.EquationParse.parseFraction;

  // [rise, run] pairs — run is always positive, already in lowest terms.
  var GRADIENTS = [
    [-3,1], [-2,1], [-3,2], [-1,1], [-2,3], [-1,2],
    [1,2], [2,3], [1,1], [3,2], [2,1], [3,1]
  ];

  var ADVANCED_MIN_ATTEMPTS = 2;   // "more than 2 questions"
  var ADVANCED_MIN_ACCURACY = 0.8; // "score > 80%"
  var ELITE_MIN_ATTEMPTS = 4;      // "more than 4 questions"
  var ELITE_MIN_ACCURACY = 0.95;   // ">95%"
  var MASTER_MIN_ATTEMPTS = 10;    // ">=10 questions"
  var MASTER_MIN_ACCURACY = 0.95;  // ">95%"

  var els = {};
  var current = null;    // { p, q, c, m }
  var score = { correct: 0, attempted: 0 };
  var advanced = false;  // typed-equation mode vs fill-in-the-blank boxes
  var elite = false;     // hide the score readout once mastery is clear
  var master = false;    // hide the graph's marker points too
  var answered = false;  // has the current question already been checked?

  function toPx(x, y){ return grid.toPx(x, y); }

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
    // Keep both the intercept point (0,c) and the rise/run point (q, c+p)
    // inside the grid, so the two marked points are in range even
    // while they're still being drawn (master mode drops them).
    var cLo = Math.max(GRID_MIN, GRID_MIN - p);
    var cHi = Math.min(GRID_MAX, GRID_MAX - p);
    var c = randInt(cLo, cHi);
    current = { p: p, q: q, c: c, m: p / q };

    advanced = isAdvanced();
    elite = isElite();
    master = isMaster();
    answered = false;
    updateModeUI();
    renderGraph();
    resetInputs();
  }

  function updateModeUI(){
    els.rowBoxes.hidden = advanced;
    els.rowTyped.hidden = !advanced;
    els.scoreRow.hidden = elite;
    if(master){
      els.modeNote.textContent = "You've mastered this — the marked points are gone, so read the gradient and intercept straight off the line.";
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

  function clipToBox(m, c){
    var pts = [];
    [GRID_MIN, GRID_MAX].forEach(function(x){
      var y = m * x + c;
      if(y >= GRID_MIN - 1e-9 && y <= GRID_MAX + 1e-9) pts.push({ x: x, y: y });
    });
    [GRID_MIN, GRID_MAX].forEach(function(y){
      var x = (y - c) / m;
      if(x >= GRID_MIN - 1e-9 && x <= GRID_MAX + 1e-9) pts.push({ x: x, y: y });
    });
    var uniq = [];
    pts.forEach(function(p){
      var dup = uniq.some(function(u){ return Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6; });
      if(!dup) uniq.push(p);
    });
    return [uniq[0], uniq[uniq.length - 1]];
  }

  function svgLineAndPoints(){
    var ends = clipToBox(current.m, current.c);
    var e1 = toPx(ends[0].x, ends[0].y), e2 = toPx(ends[1].x, ends[1].y);
    var s = '<line x1="' + e1.x + '" y1="' + e1.y + '" x2="' + e2.x + '" y2="' + e2.y + '" class="plot-line"></line>';
    // Master tier: no marked points — read the gradient/intercept off
    // the line itself, the way the two lattice points let you do below.
    if(!master){
      var a = toPx(0, current.c);
      var b = toPx(current.q, current.c + current.p);
      s += '<circle cx="' + a.x + '" cy="' + a.y + '" r="4.5" class="plot-point"></circle>';
      s += '<circle cx="' + b.x + '" cy="' + b.y + '" r="4.5" class="plot-point"></circle>';
    }
    return s;
  }

  function renderGraph(){
    els.svg.innerHTML = grid.gridSvg() + grid.axesSvg() + svgLineAndPoints();
    els.svg.setAttribute('aria-label', master ?
      'A straight line plotted on a coordinate grid, with no points marked.' :
      'A straight line plotted on a coordinate grid, with two points marked on it.');
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
  // "y = x - 6", "y = 3/2x + 1" or "y = 3x/2 + 1" — the "y =" itself
  // must be there; a fraction gradient can be written on either side
  // of the x (3/2x and 3x/2 mean the same thing). Returns { m, c },
  // or null if the string doesn't parse (missing "y=", no "x", etc).
  function parseEquationString(raw){
    var s = (raw || '').toLowerCase().replace(/\s+/g, '');
    if(s.slice(0, 2) !== 'y=') return null;
    s = s.slice(2);

    var xIdx = s.indexOf('x');
    if(xIdx === -1) return null;
    var mPart = s.slice(0, xIdx);
    var rest = s.slice(xIdx + 1);

    // A fraction gradient split across the x — "3x/2" instead of
    // "3/2x" — leaves a leading "/<number>" right after the x; pull
    // it off and fold it into the coefficient before parsing on.
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

  // Returns true if this call actually scored an attempt (so the
  // caller knows the question is now locked in), false if it bailed
  // out early — an unparsable typed equation isn't a scored attempt,
  // it's just an invitation to fix the format and try again.
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

  // Bound to the Check button and to Enter: the first press checks
  // the current question and locks it in (so holding or re-pressing
  // Enter can't rack up extra points for the same answer); once
  // locked, the same key/button moves on to a new question.
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
    els.svg = document.getElementById('practice-graph-svg');
    els.rowBoxes = document.getElementById('answer-row-boxes');
    els.rowTyped = document.getElementById('answer-row-typed');
    els.mInput = document.getElementById('practice-m-input');
    els.cInput = document.getElementById('practice-c-input');
    els.eqInput = document.getElementById('practice-eq-input');
    els.modeNote = document.getElementById('practice-mode-note');
    els.hint = document.getElementById('practice-hint');
    els.feedback = document.getElementById('practice-feedback');
    els.score = document.getElementById('practice-score');
    els.scoreRow = document.getElementById('practice-score-row');
    els.checkBtn = document.getElementById('practice-check-btn');
    els.nextBtn = document.getElementById('practice-next-btn');
    els.backBtn = document.getElementById('practice-back-btn');

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    [els.mInput, els.cInput, els.eqInput].forEach(function(input){
      input.addEventListener('keydown', function(e){
        // e.repeat is true for the auto-repeated keydowns a held key
        // fires — ignore those so holding Enter can't check (or
        // advance) more than once per actual press.
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
