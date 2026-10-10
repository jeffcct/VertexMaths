/* ============================================================
   practice-algebraic-perimeter.js — the PracticeAlgebraicPerimeter
   component: a question generator for "Algebraic perimeter", the
   Exam Questions strand's first topic. Shows a shape (rectangle,
   triangle or pentagon) with its sides labelled as linear
   expressions in x, states the shape's numeric perimeter, and asks
   the student to form and solve the resulting equation — the only
   thing scored is the value of x they end up with.

   Generation works backwards from a chosen whole-number x: each
   side's actual length (in cm) is picked directly as a small
   positive integer, and that side's own expression (ax + b) is then
   solved for b so it evaluates to exactly that length at the chosen
   x — this guarantees every side is a sensible positive length and
   that x itself is always a whole number, with no fractional or
   negative solutions to stumble into.

   No adaptive scaffold: every question is a single directly-scored
   step, the same convention used by practice-multi-step.js and
   practice-x-both-sides.js for this kind of single "solve for x"
   skill.

   Public API: VM.PracticeAlgebraicPerimeter.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeAlgebraicPerimeter = (function(){
  var SHAPES = ['rectangle', 'triangle', 'pentagon'];
  var X_MIN = 2, X_MAX = 12;
  var A_MIN = 1, A_MAX = 4;
  var SIDE_MIN = 4, SIDE_MAX = 24;

  // Which of each shape's polygon edges (see polygonFor) carry a
  // label, in the same order as the generated `sides` array. A
  // rectangle only needs its two distinct side lengths labelled
  // (width, height) — the other two are equal to one of those by
  // definition, so labelling all four would just be redundant.
  var LABELED_EDGES = {
    rectangle: [0, 3],
    triangle: [0, 1, 2],
    pentagon: [0, 1, 2, 3, 4]
  };
  var SIDE_COUNT = { rectangle: 2, triangle: 3, pentagon: 5 };

  var els = {};
  var current = null;    // { shape, sides: [{a,b,trueLen}], perimeter, x }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  // ---- Question generation -----------------------------------------

  function makeSide(x){
    var a = randInt(A_MIN, A_MAX);
    var trueLen = randInt(SIDE_MIN, SIDE_MAX);
    return { a: a, b: trueLen - a * x, trueLen: trueLen };
  }

  function nextQuestion(){
    var x = randInt(X_MIN, X_MAX);
    var shape = randChoice(SHAPES);
    var n = SIDE_COUNT[shape];
    var sides = [];
    for(var i = 0; i < n; i++){ sides.push(makeSide(x)); }

    var perimeter = sides.reduce(function(sum, s){ return sum + s.trueLen; }, 0);
    if(shape === 'rectangle') perimeter *= 2; // 2 distinct lengths, each used twice

    current = { shape: shape, sides: sides, perimeter: perimeter, x: x };
    answered = false;
    working.reset();

    els.statement.textContent = 'The perimeter of the ' + shape + ' is ' + perimeter + 'cm. ' +
      'Form and solve an equation to find the value of x.';
    renderShape();
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.focus();
  }

  // ---- Shape geometry / SVG rendering --------------------------------
  // Fixed, schematic vertex layouts (not drawn to real scale, same as
  // a typical exam diagram) — one per shape, in a shared 300x220
  // viewBox. Labels are placed at each labelled edge's midpoint,
  // offset outward along that edge's normal, so the same placement
  // logic works for every shape without per-shape label coordinates.

  function polygonFor(shape){
    if(shape === 'rectangle') return [{x:60,y:40}, {x:240,y:40}, {x:240,y:160}, {x:60,y:160}];
    if(shape === 'triangle') return [{x:150,y:40}, {x:250,y:180}, {x:50,y:180}];
    return [{x:60,y:180}, {x:240,y:180}, {x:240,y:100}, {x:150,y:40}, {x:60,y:100}]; // pentagon
  }

  function centroidOf(poly){
    var cx = 0, cy = 0;
    poly.forEach(function(p){ cx += p.x; cy += p.y; });
    return { x: cx / poly.length, y: cy / poly.length };
  }

  function labelPos(p1, p2, centroid, dist){
    var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    if(nx * (centroid.x - mx) + ny * (centroid.y - my) > 0){ nx = -nx; ny = -ny; }
    return { x: mx + nx * dist, y: my + ny * dist };
  }

  function sideLabel(side){
    var s = (side.a === 1 ? '' : String(side.a)) + 'x';
    if(side.b > 0) s += ' + ' + side.b;
    else if(side.b < 0) s += ' - ' + Math.abs(side.b);
    return s;
  }

  function renderShape(){
    var poly = polygonFor(current.shape);
    var centroid = centroidOf(poly);
    var svg = '<polygon points="' + poly.map(function(p){ return p.x + ',' + p.y; }).join(' ') + '" class="shape-outline"></polygon>';

    LABELED_EDGES[current.shape].forEach(function(edgeIdx, i){
      var p1 = poly[edgeIdx], p2 = poly[(edgeIdx + 1) % poly.length];
      var pos = labelPos(p1, p2, centroid, 30);
      svg += '<text x="' + pos.x + '" y="' + pos.y + '" class="shape-label">' + sideLabel(current.sides[i]) + '</text>';
    });

    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A ' + current.shape + ' with its sides labelled in terms of x.');
  }

  // ---- Checking -------------------------------------------------

  function checkAnswer(){
    if(!current) return false;
    var raw = (els.answerInput.value || '').trim();
    var got = parseFloat(raw);
    var ok = !isNaN(got) && Math.abs(got - current.x) < 0.01;
    els.answerInput.classList.toggle('right', ok);
    els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what was typed — see the echo-the-student's-
      // answer convention in CLAUDE.md.
      els.feedback.textContent = 'Correct — x = ' + raw + '.';
      els.feedback.className = 'feedback correct';
      working.push('x = ' + raw);
    } else {
      els.feedback.textContent = 'Not quite. x = ' + current.x + '.';
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
    els.svg = document.getElementById('algperim-shape-svg');
    els.statement = document.getElementById('algperim-statement');
    els.answerInput = document.getElementById('algperim-answer-input');
    els.feedback = document.getElementById('algperim-feedback');
    els.score = document.getElementById('algperim-score');
    els.checkBtn = document.getElementById('algperim-check-btn');
    els.nextBtn = document.getElementById('algperim-next-btn');
    els.backBtn = document.getElementById('algperim-back-btn');
    els.workingCard = document.getElementById('algperim-working-card');
    els.workingLines = document.getElementById('algperim-working-lines');
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
