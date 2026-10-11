/* ============================================================
   practice-word-interpreting.js — the PracticeWordInterpreting
   component: a question generator for "Word interpreting", the Exam
   Questions strand's second topic. Describes a shape's sides in
   words, with one side tied to another by a variable offset (and
   sometimes a numeric offset too), then gives a constraint relating
   a multiple of one side to the whole perimeter — the student has to
   translate the words into algebra, use the constraint to eliminate
   one variable, then express the thing the question actually asks
   for (the perimeter, or one particular side) in terms of the other
   variable. The whole derivation happens off-screen; only the final
   expression is scored.

   Five different question templates share this generate-eliminate-
   and-express shape but vary the figure, which side is tied to which,
   what the constraint multiplies, and what's actually asked for, so
   the same topic doesn't always read as the same question:

     'tri-chain-perimeter'    — scalene triangle, sides chained
                                 side1=p, side2=p+-q, side3=side2+-k;
                                 perimeter = n*side1; asks for the
                                 perimeter.
     'tri-chain-side'         — the same chained triangle and
                                 constraint, but asks for side2
                                 instead of the perimeter.
     'tri-isosceles-perimeter'— isosceles triangle, two equal sides
                                 = p, third side = p+-q; perimeter is
                                 k cm more/less than n times the third
                                 side; asks for the perimeter.
     'rect-length-perimeter'  — rectangle, length = p, width = p+-q;
                                 perimeter is k cm more/less than n
                                 times the length; asks for the
                                 perimeter.
     'rect-width-length'      — rectangle, length = p, width = p+-q;
                                 perimeter is k cm more/less than n
                                 times the WIDTH this time; asks for
                                 the length (i.e. for what p itself
                                 works out to be).

   Every template reduces to the same closed form: express the asked-
   for quantity as mCoeff*targetVar + constTerm, with mCoeff/constTerm
   derived per-template (each derivation is in that generator
   function's comment) and n always chosen so the elimination divides
   through cleanly (D = +-1), guaranteeing integer coefficients with
   no fractional cases to filter out.

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

  var VERTEX_SETS_TRI = [['X','Y','Z'], ['A','B','C'], ['P','Q','R'], ['L','M','N'], ['R','S','T']];
  var VERTEX_SETS_RECT = [['P','Q','R','S'], ['A','B','C','D'], ['W','X','Y','Z'], ['E','F','G','H'], ['J','K','L','M']];
  var VAR_POOL = ['w', 'm', 'a', 'b', 'c', 'd', 'k', 'n', 'p', 'q', 'r', 's', 't'];
  var K_MIN = 2, K_MAX = 9;
  var N_WORDS = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' };
  var TRI_N_VALUES = [2, 4];
  var RECT_N_VALUES = [3, 5];

  var els = {};
  var current = null;    // { template, shapeKind, vertices, baseVar, targetVar, mCoeff, constTerm, statementLines, askLabel }
  var score = { correct: 0, attempted: 0 };
  var answered = false;
  var working = null;    // the "shown work" trail for the current question — see working-trail.js

  function randInt(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randChoice(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randSign(){ return Math.random() < 0.5 ? 1 : -1; }
  function relWord(sign){ return sign > 0 ? 'longer' : 'shorter'; }

  function pickVars(){
    var baseVar = randChoice(VAR_POOL);
    var targetVar;
    do { targetVar = randChoice(VAR_POOL); } while(targetVar === baseVar);
    return { baseVar: baseVar, targetVar: targetVar };
  }

  function triSideNames(vertices){
    return {
      side1: vertices[0] + vertices[1],
      side2: vertices[1] + vertices[2],
      side3: vertices[0] + vertices[2]
    };
  }

  // ---- Question generation -----------------------------------------
  // Each generator below works the algebra through in its own comment
  // (verified by substituting a concrete test number for the target
  // variable and checking the defining equations hold), then returns
  // a fully-formed `current` object — no shared state between them.

  // side1=p, side2=p+s1*q, side3=side2+s2*k, perimeter=3p+2*s1*q+s2*k.
  // Constraint perimeter=n*p => (n-3)*p = 2*s1*q+s2*k => p = D*(2*s1*q+s2*k),
  // D=n-3 (+-1, see TRI_N_VALUES). Perimeter = n*p = (n*D*2*s1)*q + (n*D*s2*k).
  function genTriChainPerimeter(){
    var vars = pickVars(), baseVar = vars.baseVar, targetVar = vars.targetVar;
    var vertices = randChoice(VERTEX_SETS_TRI);
    var s1 = randSign(), s2 = randSign();
    var k = randInt(K_MIN, K_MAX);
    var n = randChoice(TRI_N_VALUES);
    var d = n - 3;
    var mCoeff = n * d * 2 * s1;
    var constTerm = n * d * s2 * k;
    var names = triSideNames(vertices);
    var lines = [
      'A triangle ' + vertices.join('') + ' has sides with the following lengths in cm:',
      names.side1 + ' = ' + baseVar,
      names.side2 + ' is ' + targetVar + ' ' + relWord(s1) + ' than ' + names.side1 + '.',
      names.side3 + ' is ' + k + ' cm ' + relWord(s2) + ' than ' + names.side2 + '.',
      'The perimeter of the triangle is exactly ' + N_WORDS[n] + ' the length of side ' + names.side1 + '.',
      'Find an expression for the perimeter in terms of ' + targetVar + '.'
    ];
    return {
      template: 'tri-chain-perimeter', shapeKind: 'triangle', vertices: vertices,
      baseVar: baseVar, targetVar: targetVar, mCoeff: mCoeff, constTerm: constTerm,
      statementLines: lines, askLabel: 'Perimeter'
    };
  }

  // Same chained triangle and constraint as above (p = D*(2*s1*q+s2*k)),
  // but asks for side2 = p+s1*q instead of the perimeter:
  //   side2 = s1*(2D+1)*q + D*s2*k
  function genTriChainSide(){
    var vars = pickVars(), baseVar = vars.baseVar, targetVar = vars.targetVar;
    var vertices = randChoice(VERTEX_SETS_TRI);
    var s1 = randSign(), s2 = randSign();
    var k = randInt(K_MIN, K_MAX);
    var n = randChoice(TRI_N_VALUES);
    var d = n - 3;
    var mCoeff = s1 * (2 * d + 1);
    var constTerm = d * s2 * k;
    var names = triSideNames(vertices);
    var lines = [
      'A triangle ' + vertices.join('') + ' has sides with the following lengths in cm:',
      names.side1 + ' = ' + baseVar,
      names.side2 + ' is ' + targetVar + ' ' + relWord(s1) + ' than ' + names.side1 + '.',
      names.side3 + ' is ' + k + ' cm ' + relWord(s2) + ' than ' + names.side2 + '.',
      'The perimeter of the triangle is exactly ' + N_WORDS[n] + ' the length of side ' + names.side1 + '.',
      'Find an expression for the length of ' + names.side2 + ' in terms of ' + targetVar + '.'
    ];
    return {
      template: 'tri-chain-side', shapeKind: 'triangle', vertices: vertices,
      baseVar: baseVar, targetVar: targetVar, mCoeff: mCoeff, constTerm: constTerm,
      statementLines: lines, askLabel: names.side2
    };
  }

  // equalSide=p (x2), base=p+s*q, perimeter=3p+s*q.
  // Constraint perimeter=n*base+s2*k => (3-n)*p=(n-1)*s*q+s2*k => p=D*(n-1)*s*q+D*s2*k,
  // D=3-n (+-1, see TRI_N_VALUES).
  // Perimeter = 3p+s*q = s*(3*D*(n-1)+1)*q + 3*D*s2*k.
  function genTriIsoscelesPerimeter(){
    var vars = pickVars(), baseVar = vars.baseVar, targetVar = vars.targetVar;
    var vertices = randChoice(VERTEX_SETS_TRI);
    var s = randSign(), s2 = randSign();
    var k = randInt(K_MIN, K_MAX);
    var n = randChoice(TRI_N_VALUES);
    var d = 3 - n;
    var mCoeff = s * (3 * d * (n - 1) + 1);
    var constTerm = 3 * d * s2 * k;
    var equalSide1 = vertices[0] + vertices[1], equalSide2 = vertices[1] + vertices[2], base = vertices[0] + vertices[2];
    var lines = [
      'A triangle ' + vertices.join('') + ' is isosceles, with ' + equalSide1 + ' = ' + equalSide2 + ' = ' + baseVar + ' cm.',
      base + ' is ' + targetVar + ' ' + relWord(s) + ' than ' + equalSide1 + '.',
      'The perimeter of the triangle is ' + k + ' cm ' + (s2 > 0 ? 'more' : 'less') + ' than ' + N_WORDS[n] + ' the length of ' + base + '.',
      'Find an expression for the perimeter in terms of ' + targetVar + '.'
    ];
    return {
      template: 'tri-isosceles-perimeter', shapeKind: 'triangle', vertices: vertices,
      baseVar: baseVar, targetVar: targetVar, mCoeff: mCoeff, constTerm: constTerm,
      statementLines: lines, askLabel: 'Perimeter'
    };
  }

  // length=p, width=p+s*q, perimeter=4p+2*s*q.
  // Constraint perimeter=n*p+s2*k => (4-n)*p=s2*k-2*s*q => p=D*(2*s*q-s2*k), D=n-4 (+-1, see RECT_N_VALUES).
  // Perimeter = n*p+s2*k = (2*n*D*s)*q + s2*k*(1-n*D).
  function genRectLengthPerimeter(){
    var vars = pickVars(), baseVar = vars.baseVar, targetVar = vars.targetVar;
    var vertices = randChoice(VERTEX_SETS_RECT);
    var s = randSign(), s2 = randSign();
    var k = randInt(K_MIN, K_MAX);
    var n = randChoice(RECT_N_VALUES);
    var d = n - 4;
    var mCoeff = 2 * n * d * s;
    var constTerm = s2 * k * (1 - n * d);
    var edgeLength = vertices[0] + vertices[1], edgeWidth = vertices[1] + vertices[2];
    var lines = [
      'A rectangle ' + vertices.join('') + ' has length ' + edgeLength + ' = ' + baseVar + ' cm.',
      'The width ' + edgeWidth + ' is ' + targetVar + ' ' + relWord(s) + ' than the length ' + edgeLength + '.',
      'The perimeter of the rectangle is ' + k + ' cm ' + (s2 > 0 ? 'more' : 'less') + ' than ' + N_WORDS[n] + ' the length ' + edgeLength + '.',
      'Find an expression for the perimeter in terms of ' + targetVar + '.'
    ];
    return {
      template: 'rect-length-perimeter', shapeKind: 'rectangle', vertices: vertices,
      baseVar: baseVar, targetVar: targetVar, mCoeff: mCoeff, constTerm: constTerm,
      statementLines: lines, askLabel: 'Perimeter'
    };
  }

  // length=p, width=p+s*q, perimeter=4p+2*s*q (same figure as above, but
  // the constraint ties to the WIDTH instead, and the question asks for
  // the length rather than the perimeter).
  // Constraint perimeter=n*width+s3*k => (4-n)*p=(n-2)*s*q+s3*k => p=D*(n-2)*s*q+D*s3*k,
  // D=4-n (+-1, see RECT_N_VALUES). The length IS p, so that's the final answer.
  function genRectWidthLength(){
    var vars = pickVars(), baseVar = vars.baseVar, targetVar = vars.targetVar;
    var vertices = randChoice(VERTEX_SETS_RECT);
    var s = randSign(), s3 = randSign();
    var k = randInt(K_MIN, K_MAX);
    var n = randChoice(RECT_N_VALUES);
    var d = 4 - n;
    var mCoeff = d * (n - 2) * s;
    var constTerm = d * s3 * k;
    var edgeLength = vertices[0] + vertices[1], edgeWidth = vertices[1] + vertices[2];
    var lines = [
      'A rectangle ' + vertices.join('') + ' has length ' + edgeLength + ' = ' + baseVar + ' cm.',
      'The width ' + edgeWidth + ' is ' + targetVar + ' ' + relWord(s) + ' than the length ' + edgeLength + '.',
      'The perimeter of the rectangle is ' + k + ' cm ' + (s3 > 0 ? 'more' : 'less') + ' than ' + N_WORDS[n] + ' the width ' + edgeWidth + '.',
      'Find an expression for the length ' + edgeLength + ' in terms of ' + targetVar + '.'
    ];
    return {
      template: 'rect-width-length', shapeKind: 'rectangle', vertices: vertices,
      baseVar: baseVar, targetVar: targetVar, mCoeff: mCoeff, constTerm: constTerm,
      statementLines: lines, askLabel: edgeLength
    };
  }

  var GENERATORS = [genTriChainPerimeter, genTriChainSide, genTriIsoscelesPerimeter, genRectLengthPerimeter, genRectWidthLength];

  function nextQuestion(){
    current = randChoice(GENERATORS)();
    answered = false;
    working.reset();

    renderStatement();
    renderShape();
    els.answerInput.value = '';
    els.answerInput.classList.remove('right', 'wrong');
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.checkBtn.textContent = 'Check answer';
    els.prefix.textContent = current.askLabel + ' =';
    els.answerInput.setAttribute('aria-label', 'Expression for ' + (current.askLabel === 'Perimeter' ? 'the perimeter' : 'the length of ' + current.askLabel));
    els.answerInput.focus();
  }

  function renderStatement(){
    els.statement.innerHTML = current.statementLines.map(function(l){ return '<div>' + l + '</div>'; }).join('');
  }

  // ---- Shape geometry / SVG rendering --------------------------------
  // A fixed, schematic diagram (not drawn to real scale, same as a
  // typical exam diagram) with just its vertices labelled — the side
  // relationships are already spelled out in the statement above, so
  // labelling sides on the diagram too would only repeat it.

  function renderTriangle(){
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

  function renderRectangle(){
    var poly = [{x:60,y:50}, {x:240,y:50}, {x:240,y:170}, {x:60,y:170}];
    var svg = '<polygon points="' + poly.map(function(p){ return p.x + ',' + p.y; }).join(' ') + '" class="shape-outline"></polygon>';
    var labelOffsets = [{dx:-12,dy:-10}, {dx:12,dy:-10}, {dx:12,dy:18}, {dx:-12,dy:18}];
    current.vertices.forEach(function(letter, i){
      var p = poly[i], off = labelOffsets[i];
      svg += '<text x="' + (p.x + off.dx) + '" y="' + (p.y + off.dy) + '" class="shape-label">' + letter + '</text>';
    });
    els.svg.innerHTML = svg;
    els.svg.setAttribute('aria-label', 'A rectangle with vertices labelled ' + current.vertices.join(', ') + '.');
  }

  function renderShape(){
    if(current.shapeKind === 'triangle') renderTriangle();
    else renderRectangle();
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
      working.push(current.askLabel + ' = ' + raw);
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
    els.prefix = document.getElementById('wordint-prefix');
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
