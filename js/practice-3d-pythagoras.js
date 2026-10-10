/* ============================================================
   practice-3d-pythagoras.js — the Practice3DPythagoras component: a
   question generator for "3D Pythagoras", the Exam Questions
   strand's third topic. Picks one of three solid shapes at random
   and asks for a 3D distance that requires combining two Pythagorean
   steps — the solid's own given edges don't include the answer, so
   the student has to find an intermediate length first (a base
   diagonal, or a triangular cross-section) before the final one.

   All three kinds reduce to the same underlying fact — three
   mutually perpendicular lengths a, b, c give a space diagonal of
   sqrt(a^2+b^2+c^2) — just reached by a different route:

     'box'     — length, width and height are all given directly, so
                 it's exactly sqrt(l^2+w^2+h^2).
     'pyramid' — a rectangular base (length, width) and one sloping
                 edge (apex to a base corner) are given; the height is
                 the unknown. Rearranges to
                 h = sqrt(e^2 - (half the base diagonal)^2).
     'prism'   — a right-angled triangular cross-section (two legs)
                 and the prism's length are given; the distance
                 between the two vertices that don't share any of the
                 three directions is sqrt(p^2+q^2+L^2) — the same
                 formula as the box, just arrived at by recognising
                 which corner pair that is.

   Given lengths are always whole-number cm; the answer is whatever
   it computes to, rounded to 2 decimal places — this is deliberately
   NOT restricted to Pythagorean triples (the given lengths already
   read as plausible exam numbers without needing special curation),
   so every question also exercises rounding a square root sensibly.

   No adaptive scaffold: every question is a single directly-scored
   step, the same convention used by this strand's other topics — the
   "find the right intermediate length, then combine it" happens in
   the student's own working, not as an on-screen walkthrough.

   Public API: VM.Practice3DPythagoras.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.Practice3DPythagoras = (function(){
  var KINDS = ['box', 'pyramid', 'prism'];
  var DIM_MIN = 4, DIM_MAX = 18;
  var PYRAMID_BASE_MIN = 6, PYRAMID_BASE_MAX = 20;
  var PYRAMID_SLANT_SLACK_MIN = 2, PYRAMID_SLANT_SLACK_MAX = 15;
  var VERTEX_SETS_6 = [
    ['A', 'B', 'C', 'D', 'E', 'F'],
    ['P', 'Q', 'R', 'S', 'T', 'U'],
    ['W', 'X', 'Y', 'Z', 'J', 'K']
  ];

  var els = {};
  var current = null;
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function round2(v){ return Math.round(v * 100) / 100; }

  // ---- Question generation -----------------------------------------

  function generateBox(){
    var l = randInt(DIM_MIN, DIM_MAX), w = randInt(DIM_MIN, DIM_MAX), h = randInt(DIM_MIN, DIM_MAX);
    return { kind: 'box', l: l, w: w, h: h, answer: Math.sqrt(l * l + w * w + h * h) };
  }

  function generatePrism(){
    var p = randInt(DIM_MIN, DIM_MAX), q = randInt(DIM_MIN, DIM_MAX), len = randInt(DIM_MIN, DIM_MAX);
    var vertices = randChoice(VERTEX_SETS_6);
    var crossPair = Math.random() < 0.5; // the two symmetric vertex pairs that both give the full 3-term diagonal
    var targetA = crossPair ? vertices[1] : vertices[2];
    var targetB = crossPair ? vertices[5] : vertices[4];
    return {
      kind: 'prism', p: p, q: q, len: len, vertices: vertices,
      targetA: targetA, targetB: targetB,
      answer: Math.sqrt(p * p + q * q + len * len)
    };
  }

  // The sloping edge e has to be longer than half the base diagonal
  // for a real (positive) height to exist — e is picked as a whole
  // number safely past that minimum rather than filtered after the
  // fact, so generation never has to retry.
  function generatePyramid(){
    var l = randInt(PYRAMID_BASE_MIN, PYRAMID_BASE_MAX), w = randInt(PYRAMID_BASE_MIN, PYRAMID_BASE_MAX);
    var halfDiag = Math.sqrt(l * l + w * w) / 2;
    var minE = Math.ceil(halfDiag) + 1;
    var e = randInt(minE + PYRAMID_SLANT_SLACK_MIN, minE + PYRAMID_SLANT_SLACK_MAX);
    return { kind: 'pyramid', l: l, w: w, e: e, answer: Math.sqrt(e * e - halfDiag * halfDiag) };
  }

  function nextQuestion(){
    var kind = randChoice(KINDS);
    current = kind === 'box' ? generateBox() : (kind === 'pyramid' ? generatePyramid() : generatePrism());
    answered = false;
    working.reset();

    renderStatement();
    renderShape();
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.prefix.textContent = current.kind === 'pyramid' ? 'Height =' : 'Distance =';
    els.answerInput.focus();
  }

  function renderStatement(){
    var lines;
    if(current.kind === 'box'){
      lines = [
        'A rectangular box has length ' + current.l + ' cm, width ' + current.w + ' cm and height ' + current.h + ' cm.',
        'Find the distance from one corner of the box to the opposite corner, correct to two decimal places.'
      ];
    } else if(current.kind === 'pyramid'){
      lines = [
        'A right pyramid has a rectangular base with length ' + current.l + ' cm and width ' + current.w + ' cm.',
        'The apex is directly above the centre of the base.',
        'One sloping edge, from the apex to a base corner, is ' + current.e + ' cm long.',
        'Find the height of the pyramid, correct to two decimal places.'
      ];
    } else {
      var v = current.vertices;
      lines = [
        'A triangular prism ' + v[0] + v[1] + v[2] + v[3] + v[4] + v[5] + ' has a right-angled triangular cross-section, ' +
          'with ' + v[0] + v[1] + ' = ' + current.p + ' cm and ' + v[0] + v[2] + ' = ' + current.q + ' cm.',
        'The prism is ' + current.len + ' cm long.',
        'Find the distance from ' + current.targetA + ' to ' + current.targetB + ', correct to two decimal places.'
      ];
    }
    els.statement.innerHTML = lines.map(function(l){ return '<div>' + l + '</div>'; }).join('');
  }

  // ---- Shape geometry / SVG rendering --------------------------------
  // Fixed, schematic oblique-projection drawings (not drawn to real
  // scale) — a front face/cross-section plus a "depth" skew offset
  // for the back, the same technique for all three shapes. The dashed
  // line is the one distance/height the diagram shows without a
  // given numeric label, since that's what the question asks for.

  var SKEW = { dx: 55, dy: -35 };
  function skewed(p){ return { x: p.x + SKEW.dx, y: p.y + SKEW.dy }; }

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

  function edge(p1, p2){ return '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" class="shape-outline"></line>'; }
  function dashedEdge(p1, p2){ return '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" class="shape-query-line"></line>'; }
  function label(pos, text){ return '<text x="' + pos.x + '" y="' + pos.y + '" class="shape-label">' + text + '</text>'; }
  function vertexLabel(p, text, dx, dy){ return '<text x="' + (p.x + dx) + '" y="' + (p.y + dy) + '" class="shape-vertex-label">' + text + '</text>'; }

  function renderBox(){
    var FBL = {x:80,y:180}, FBR = {x:200,y:180}, FTL = {x:80,y:80}, FTR = {x:200,y:80};
    var BBL = skewed(FBL), BBR = skewed(FBR), BTL = skewed(FTL), BTR = skewed(FTR);
    var centroid = centroidOf([FBL, FBR, FTL, FTR, BBL, BBR, BTL, BTR]);

    var svg = '';
    [[FBL,FBR],[FTL,FTR],[FBL,FTL],[FBR,FTR],
     [BBL,BBR],[BTL,BTR],[BBL,BTL],[BBR,BTR],
     [FBL,BBL],[FBR,BBR],[FTL,BTL],[FTR,BTR]].forEach(function(pair){ svg += edge(pair[0], pair[1]); });

    // The length and height labels sit outside the box, next to an
    // uncrowded edge, via the generic outward-normal placement. The
    // width (depth) dimension is trickier: every depth edge runs
    // through the middle of the drawing, so it's placed by hand on
    // the bottom-right depth edge (FBR-BBR) — clear of the diagonal,
    // the other two labels, and the corner where three lines meet.
    svg += label(labelPos(FBL, FBR, centroid, 16), current.l);
    svg += label(labelPos(FBL, FTL, centroid, 16), current.h);
    svg += label({ x: (FBR.x + BBR.x) / 2 + 16, y: (FBR.y + BBR.y) / 2 }, current.w);
    svg += dashedEdge(FBL, BTR);

    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A rectangular box with its length, width and height labelled, and a dashed line from one corner to the opposite corner.');
  }

  function renderPyramid(){
    var baseFL = {x:70,y:170}, baseFR = {x:190,y:170};
    var baseBL = skewed(baseFL), baseBR = skewed(baseFR);
    var base = [baseFL, baseFR, baseBR, baseBL];
    var center = centroidOf(base);
    var apex = { x: center.x, y: 40 };

    var svg = '';
    [[baseFL,baseFR],[baseFR,baseBR],[baseBR,baseBL],[baseBL,baseFL]].forEach(function(pair){ svg += edge(pair[0], pair[1]); });
    [baseFL, baseFR, baseBR, baseBL].forEach(function(p){ svg += edge(apex, p); });

    // l sits below the clear front edge. w and e are kept on
    // opposite sides (w on the right depth edge, e on the left
    // slant edge) rather than both crowding the base's left corner,
    // where the depth edge and the left slant edge would otherwise
    // run right past each other.
    svg += label(labelPos(baseFL, baseFR, center, 16), current.l);
    svg += label({ x: (baseFR.x + baseBR.x) / 2 + 14, y: (baseFR.y + baseBR.y) / 2 }, current.w);
    svg += label({ x: (apex.x + baseFL.x) / 2 - 14, y: (apex.y + baseFL.y) / 2 }, current.e);
    svg += dashedEdge(apex, center);
    svg += '<text x="' + (center.x + 12) + '" y="' + ((apex.y + center.y) / 2) + '" class="shape-vertex-label">h</text>';

    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A rectangular-based pyramid with the base length, width and one sloping edge labelled, and a dashed line showing the height.');
  }

  function renderPrism(){
    var P0 = {x:40,y:110}, P1 = {x:120,y:110}, P2 = {x:40,y:50};
    var prismSkew = { x: 120, y: -25 };
    var skewedPrism = function(p){ return { x: p.x + prismSkew.x, y: p.y + prismSkew.y }; };
    var P3 = skewedPrism(P0), P4 = skewedPrism(P1), P5 = skewedPrism(P2);
    var poly = [P0, P1, P2, P3, P4, P5];
    var centroid = centroidOf(poly);
    var v = current.vertices;

    var svg = '';
    [[P0,P1],[P0,P2],[P1,P2],[P3,P4],[P3,P5],[P4,P5],[P0,P3],[P1,P4],[P2,P5]].forEach(function(pair){ svg += edge(pair[0], pair[1]); });

    // p and q sit outside the clear front-triangle legs. The length
    // (depth) dimension is labelled on the P2-P5 connecting edge
    // instead of P0-P3 — P0 is where both leg labels and the target
    // diagonal already converge, so a third label there would be
    // unreadable; P2-P5 runs through open space at the top instead.
    svg += label(labelPos(P0, P1, centroid, 16), current.p);
    svg += label(labelPos(P0, P2, centroid, 16), current.q);
    svg += label({ x: (P2.x + P5.x) / 2, y: (P2.y + P5.y) / 2 - 14 }, current.len);

    var targetPoints = { 1: P1, 2: P2, 4: P4, 5: P5 };
    var idxA = v.indexOf(current.targetA), idxB = v.indexOf(current.targetB);
    svg += dashedEdge(targetPoints[idxA], targetPoints[idxB]);

    var offsets = [{dx:-10,dy:14}, {dx:0,dy:16}, {dx:-10,dy:-8}, {dx:0,dy:-12}, {dx:12,dy:14}, {dx:10,dy:-10}];
    poly.forEach(function(p, i){ svg += vertexLabel(p, v[i], offsets[i].dx, offsets[i].dy); });

    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A triangular prism with its vertices labelled, the cross-section legs and the prism length given, and a dashed line between the two target vertices.');
  }

  function renderShape(){
    if(current.kind === 'box') renderBox();
    else if(current.kind === 'pyramid') renderPyramid();
    else renderPrism();
  }

  // ---- Checking -------------------------------------------------
  // The given lengths are whole numbers but the answer generally
  // isn't, so correctness is "rounds to the same 2dp value as the
  // true answer" rather than exact equality.

  function checkAnswer(){
    if(!current) return false;
    var raw = (els.answerInput.value || '').trim();
    var got = parseFloat(raw);
    var trueRounded = round2(current.answer);
    var ok = !isNaN(got) && Math.abs(got - current.answer) < 0.005;
    els.answerInput.classList.toggle('right', ok);
    els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what was typed — see the echo-the-student's-
      // answer convention in CLAUDE.md.
      els.feedback.textContent = 'Correct — ' + raw + ' cm.';
      els.feedback.className = 'feedback correct';
      working.push(raw + ' cm');
    } else {
      els.feedback.textContent = 'Not quite. It should be ' + trueRounded.toFixed(2) + ' cm.';
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
    els.svg = document.getElementById('pyth3d-shape-svg');
    els.statement = document.getElementById('pyth3d-statement');
    els.prefix = document.getElementById('pyth3d-prefix');
    els.answerInput = document.getElementById('pyth3d-answer-input');
    els.feedback = document.getElementById('pyth3d-feedback');
    els.score = document.getElementById('pyth3d-score');
    els.checkBtn = document.getElementById('pyth3d-check-btn');
    els.nextBtn = document.getElementById('pyth3d-next-btn');
    els.backBtn = document.getElementById('pyth3d-back-btn');
    els.workingCard = document.getElementById('pyth3d-working-card');
    els.workingLines = document.getElementById('pyth3d-working-lines');
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
