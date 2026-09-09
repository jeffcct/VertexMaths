/* ============================================================
   data.js — the content model.
   This is the file to edit if you want to change a skill's name,
   status, or which skills it requires (its `prereqs`). Nothing
   in here knows how to render itself — that's DagView's job.

   Requirements (agreed so far):
   - Learn = an explanation plus a few guided exercises.
   - Practice = a series of questions the student completes.
   Neither is built out for most skills yet, so their Learn/Practice
   buttons render disabled (greyed out) by default in DagView. Add
   `ready:true` to a topic once its Learn and/or Practice content
   actually exists, to turn its buttons on. Five topics are ready
   so far: "line-from-graph" (js/practice-line-graph.js),
   "parabola-from-intercepts" (js/practice-parabola-intercepts.js),
   "parabola-from-vertex" (js/practice-parabola-vertex.js),
   "simultaneous" (js/practice-simultaneous.js) and
   "line-from-table" (js/practice-line-from-table.js).
   Learn isn't built for any of them yet, so its button still just
   toasts.
   ============================================================ */
window.VM = window.VM || {};

VM.data = (function(){

  var LANES = [
    "Solving equations",
    "Expressions & exponents",
    "Substitution",
    "Expanding & factoring",
    "Rearranging formulae",
    "Graphing lines",
    "Graphing parabolas",
    "Graphing exponentials",
    "Mixed practice"
  ];

  // Each topic's `prereqs` lists the ids of skills required BEFORE
  // this one. That's the only thing that drives the diagram's shape.
  var topics = [
    { id:"simp-expr", name:"Simplifying expressions with addition and multiplication", status:"mastered", lane:1, prereqs:[] },
    { id:"one-step", name:"Solving one-step equations", status:"mastered", lane:0, prereqs:[] },

    { id:"substitution", name:"Substitution", status:"mastered", lane:2, prereqs:["simp-expr"] },
    { id:"simp-exp", name:"Simplifying exponents", status:"mastered", lane:1, prereqs:["simp-expr"] },
    { id:"expand-single", name:"Expanding single brackets", status:"mastered", lane:3, prereqs:["simp-expr"] },
    { id:"multi-step", name:"Solving multi-step equations", status:"mastered", lane:0, prereqs:["one-step","simp-expr"] },

    { id:"factor-single", name:"Factoring single brackets", status:"mastered", lane:3, prereqs:["expand-single"] },
    { id:"expand-double", name:"Expanding double brackets", status:"mastered", lane:3, prereqs:["expand-single"] },
    { id:"x-both-sides", name:"Solving equations with x on both sides", status:"in-progress", lane:0, prereqs:["multi-step"] },
    { id:"rearrange", name:"Rearranging formulae", status:"in-progress", lane:4, prereqs:["multi-step"] },
    { id:"powers-roots", name:"Solving equations with powers and roots", status:"not-started", lane:0, prereqs:["multi-step"] },
    { id:"eqs-exponents", name:"Solving equations with exponents", status:"not-started", lane:0, prereqs:["multi-step","simp-exp"] },
    { id:"graph-exponential", name:"Graphing exponentials", status:"in-progress", lane:7, prereqs:["substitution"] },

    { id:"factor-monic", name:"Factoring monic polynomials", status:"in-progress", lane:3, prereqs:["factor-single","expand-double"] },
    { id:"rearrange-factor", name:"Rearranging formulae with factoring", status:"not-started", lane:4, prereqs:["rearrange","factor-single"] },
    { id:"simultaneous", name:"Solving simultaneous equations", status:"not-started", lane:0, prereqs:["x-both-sides"], ready:true },
    { id:"graph-linear", name:"Graphing linear equations (by substitution and by gradient / intercept)", status:"not-started", lane:5, prereqs:["substitution","rearrange"] },
    { id:"exp-no-shift", name:"Finding the equation of an exponential (from a graph, with no vertical shift)", status:"not-started", lane:7, prereqs:["graph-exponential"] },

    { id:"factor-nonmonic", name:"Factoring non-monic polynomials", status:"not-started", lane:3, prereqs:["factor-monic"] },
    { id:"graph-quadratic", name:"Graphing quadratics (by substitution, using the vertex and using the intercepts)", status:"not-started", lane:6, prereqs:["substitution","factor-monic"] },
    { id:"line-from-graph", name:"Finding the equation of a line (from a graph)", status:"not-started", lane:5, prereqs:["graph-linear"], ready:true },
    { id:"line-from-grad-point", name:"Finding the equation of a line (from a gradient and a point)", status:"not-started", lane:5, prereqs:["graph-linear"] },
    { id:"exp-with-shift", name:"Finding the equation of an exponential (from a graph, with a vertical shift)", status:"not-started", lane:7, prereqs:["exp-no-shift","simultaneous"] },

    { id:"solving-polys", name:"Solving with polynomials", status:"not-started", lane:0, prereqs:["factor-nonmonic","multi-step"] },
    { id:"parabola-from-vertex", name:"Finding the equation of a parabola (from a graph using vertex)", status:"not-started", lane:6, prereqs:["graph-quadratic"], ready:true },
    { id:"parabola-from-intercepts", name:"Finding the equation of a parabola (from a graph using intercepts)", status:"not-started", lane:6, prereqs:["graph-quadratic","factor-monic"], ready:true },
    { id:"line-from-two-points", name:"Finding the equation of a line (from two points)", status:"not-started", lane:5, prereqs:["line-from-grad-point"] },
    { id:"line-from-table", name:"Finding the equation of a line (from a table)", status:"not-started", lane:5, prereqs:["line-from-grad-point"], ready:true },
    { id:"exp-from-table", name:"Finding the equation of an exponential (from a table of values)", status:"not-started", lane:7, prereqs:["exp-with-shift"] },

    { id:"parabola-from-table", name:"Finding the equation of a parabola (from a table)", status:"not-started", lane:6, prereqs:["simultaneous"] },

    { id:"mixed-tables", name:"Mixed: finding equations from a table", status:"not-started", lane:8, prereqs:["line-from-table","parabola-from-table","exp-from-table"] },
    { id:"mixed-graphs", name:"Mixed: finding equations from a graph", status:"not-started", lane:8, prereqs:["line-from-graph","parabola-from-vertex","parabola-from-intercepts","exp-with-shift"] }
  ];

  var RESUME_TOPIC_ID = "factor-monic";

  function findTopic(id){
    for(var i=0;i<topics.length;i++){ if(topics[i].id === id) return topics[i]; }
    return null;
  }

  function statusLabel(s){
    if(s === 'mastered') return 'Mastered';
    if(s === 'in-progress') return 'In progress';
    return 'Not started';
  }

  return {
    LANES: LANES,
    topics: topics,
    RESUME_TOPIC_ID: RESUME_TOPIC_ID,
    findTopic: findTopic,
    statusLabel: statusLabel
  };

})();
