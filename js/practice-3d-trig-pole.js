/* ============================================================
   practice-3d-trig-pole.js — the Practice3DTrigPole component: a
   question generator for "3D Trigonometry: pole and wires", an Exam
   Questions topic. A vertical pole VO of height h stands on level
   ground, with wires running from its top V down to points A, B (and
   a third, unused point C, shown only for visual context) on the
   ground. OA and OB are at right angles to each other, and one angle
   is given for each of the wires to A and B — the student has to:

     1. Use each given angle and the pole's height h to find the
        ground distance (OA or OB) in terms of h — a right-triangle
        trig step (VO is vertical, so it's perpendicular to every
        ground segment, making triangle VOA and triangle VOB both
        right-angled at O).
     2. Combine OA and OB via Pythagoras (triangle OAB is right-angled
        at O) to find AB in terms of h.

   The angle given for each wire can be at EITHER end of its right
   triangle, picked independently and at random, which changes which
   trig relationship applies:
     - the angle at the ground point (e.g. angle VAO, at A): the pole
       is the opposite side and the ground segment is adjacent, so
       OA = h / tan(angle).
     - the angle at the pole's top (e.g. angle AVO, at V): the ground
       segment is now opposite and the pole is adjacent, so
       OA = h * tan(angle).

   Since the two given angles are arbitrary (not special angles), the
   final distance is irrational in general — the answer is scored as
   a decimal multiple of h, correct to 2 decimal places, the same
   rounding convention as practice-3d-pythagoras.js.

   No adaptive scaffold: a single directly-scored step, the same
   convention as every other Exam Questions topic — working out OA
   and OB first is the student's own unscored working.

   Public API: VM.Practice3DTrigPole.init({ onBack }), .start()
   ============================================================ */
window.VM = window.VM || {};

VM.Practice3DTrigPole = (function(){
  var ANGLE_MIN = 25, ANGLE_MAX = 65;

  var els = {};
  var current = null;    // { angleA, baseA, angleB, baseB, k }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function round2(v){ return Math.round(v * 100) / 100; }
  function toRad(deg){ return deg * Math.PI / 180; }

  // Ground-distance-per-unit-h for one wire: tan(angle) when the
  // angle is at the pole's top (opposite/adjacent = ground/pole),
  // or 1/tan(angle) when it's at the ground point (opposite/adjacent
  // = pole/ground) — see the file header.
  function groundFactor(angleDeg, base){
    var t = Math.tan(toRad(angleDeg));
    return base ? 1 / t : t;
  }

  // "VAO" (angle at the ground point A) or "AVO" (angle at the top V,
  // the middle letter in angle notation always being its vertex).
  function angleLabel(letter, base){ return base ? ('V' + letter + 'O') : (letter + 'VO'); }

  // ---- Question generation -----------------------------------------

  function nextQuestion(){
    var baseA = Math.random() < 0.5;
    var baseB = Math.random() < 0.5;
    var angleA = randInt(ANGLE_MIN, ANGLE_MAX);
    var angleB = randInt(ANGLE_MIN, ANGLE_MAX);
    var fA = groundFactor(angleA, baseA);
    var fB = groundFactor(angleB, baseB);
    var k = Math.sqrt(fA * fA + fB * fB);

    current = { angleA: angleA, baseA: baseA, angleB: angleB, baseB: baseB, k: k };
    answered = false;
    working.reset();

    renderStatement();
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.answerInput.focus();
  }

  function renderStatement(){
    var c = current;
    var lines = [
      'A vertical pole of height h has three wires attached from the top V to points A, B, and C on the ground.',
      'Angle ' + angleLabel('A', c.baseA) + ' = ' + c.angleA + '°.',
      'Angle ' + angleLabel('B', c.baseB) + ' = ' + c.angleB + '°.',
      'OA and OB are at right angles to each other.',
      'Find the distance AB on the ground, in terms of h.'
    ];
    els.statement.innerHTML = lines.map(function(l){ return '<div>' + l + '</div>'; }).join('');
  }

  // ---- Diagram rendering -------------------------------------------
  // A fixed, schematic sketch (not drawn to real scale — the actual
  // angles are given in the statement above, not read off the
  // diagram) matching the usual pole-and-three-wires picture: a thick
  // vertical pole V-O, thin wires from V down to A, B and C, and the
  // two ground segments OA/OB that the question is actually about.

  function renderShape(){
    var V = { x: 160, y: 28 }, O = { x: 160, y: 190 };
    var A = { x: 55, y: 222 }, B = { x: 265, y: 222 }, C = { x: 128, y: 292 };

    function line(p1, p2, cls){ return '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" class="' + cls + '"></line>'; }
    function label(p, text, dx, dy){ return '<text x="' + (p.x + dx) + '" y="' + (p.y + dy) + '" class="shape-vertex-label">' + text + '</text>'; }

    var svg = '';
    svg += line(A, O, 'ground-line');
    svg += line(B, O, 'ground-line');
    svg += line(V, A, 'wire-line');
    svg += line(V, B, 'wire-line');
    svg += line(V, C, 'wire-line');
    svg += line(V, O, 'pole-line');

    svg += label(V, 'V', 0, -12);
    svg += label(A, 'A', -14, 4);
    svg += label(B, 'B', 14, 4);
    svg += label(C, 'C', 0, 18);
    svg += label(O, 'O', 14, 12);

    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A vertical pole from V to O, with wires from V down to points A, B and C on the ground, and the ground segments OA and OB shown.');
  }

  // ---- Checking -------------------------------------------------
  // The given angles are whole-number degrees but the answer
  // generally isn't — correctness is "rounds to the same 2dp value
  // as the true answer", same convention as practice-3d-pythagoras.js.

  function checkAnswer(){
    if(!current) return false;
    var raw = (els.answerInput.value || '').trim();
    var got = parseFloat(raw);
    var trueRounded = round2(current.k);
    var ok = !isNaN(got) && Math.abs(got - current.k) < 0.005;
    els.answerInput.classList.toggle('right', ok);
    els.answerInput.classList.toggle('wrong', !ok);

    score.attempted++;
    if(ok){
      score.correct++;
      // Echo exactly what was typed — see the echo-the-student's-
      // answer convention in CLAUDE.md.
      els.feedback.textContent = 'Correct — AB = ' + raw + 'h.';
      els.feedback.className = 'feedback correct';
      working.push('AB = ' + raw + 'h');
    } else {
      els.feedback.textContent = 'Not quite. It should be AB = ' + trueRounded.toFixed(2) + 'h.';
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
    els.svg = document.getElementById('trigpole-shape-svg');
    els.statement = document.getElementById('trigpole-statement');
    els.answerInput = document.getElementById('trigpole-answer-input');
    els.feedback = document.getElementById('trigpole-feedback');
    els.score = document.getElementById('trigpole-score');
    els.checkBtn = document.getElementById('trigpole-check-btn');
    els.nextBtn = document.getElementById('trigpole-next-btn');
    els.backBtn = document.getElementById('trigpole-back-btn');
    els.workingCard = document.getElementById('trigpole-working-card');
    els.workingLines = document.getElementById('trigpole-working-lines');
    working = VM.WorkingTrail(els.workingCard, els.workingLines);

    els.checkBtn.addEventListener('click', handleCheckOrAdvance);
    els.nextBtn.addEventListener('click', nextQuestion);
    els.answerInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.repeat){ e.preventDefault(); handleCheckOrAdvance(); }
    });

    if(opts.onBack){ els.backBtn.addEventListener('click', opts.onBack); }

    renderShape();
  }

  function start(){
    score = { correct: 0, attempted: 0 };
    els.score.textContent = '0 / 0';
    nextQuestion();
  }

  return { init: init, start: start };
})();
