/* ============================================================
   exam-data.js — the content model for the "Exam Questions" strand:
   a flat list of exam-style question topics. Unlike js/data.js's
   Algebra & Graphing skills, these topics don't build on each other
   (no prerequisites, no DAG) — each is a self-contained exam-style
   question type, so this is just a flat list rather than a graph.

   Add `ready:true` to a topic once its Practice content exists, the
   same convention js/data.js uses.
   ============================================================ */
window.VM = window.VM || {};

VM.examData = (function(){

  var topics = [
    { id:"algebraic-perimeter", name:"Algebraic perimeter", description:"A shape's sides are labelled in terms of x. Form and solve an equation from its perimeter to find x.", ready:true },
    { id:"word-interpreting", name:"Word interpreting", description:"A shape's sides are described in words using two variables. Use a given constraint to eliminate one and find an expression for the perimeter in terms of the other.", ready:true },
    { id:"3d-pythagoras", name:"3D Pythagoras", description:"A box, pyramid or triangular prism with given lengths. Combine two Pythagorean steps to find a 3D distance or height.", ready:true },
    { id:"exam-mixed-tables", name:"Mixed: finding equations from a table", description:"A table of values that could be linear, quadratic, or exponential. Work out which, then write its full equation — no steps shown.", ready:true },
    { id:"exam-mixed-graphs", name:"Mixed: finding equations from a graph", description:"A graph that could be a line, a parabola, or an exponential. Work out which, then write its full equation — no steps shown.", ready:true },
    { id:"excellence-graphing", name:"Excellence Graphing", description:"A parabolic arch is translated and its scale factor changed. Combine both transformations and expand the result into y = ax^2 + bx + c.", ready:true },
    { id:"exam-solving-polys", name:"Solving polynomial equations (rearranging required)", description:"A non-monic quadratic equation, never already set to 0. Rearrange it, factorise using integer methods (e.g. splitting the middle term), and solve for x.", ready:true },
    { id:"3d-trig-pole", name:"3D Trigonometry: pole and wires", description:"A vertical pole's height and two wire angles (given at the ground or at the top) are known. OA and OB are perpendicular. Combine trigonometry with Pythagoras to find AB in terms of h.", ready:true }
  ];

  function findTopic(id){
    for(var i=0;i<topics.length;i++){ if(topics[i].id === id) return topics[i]; }
    return null;
  }

  return {
    topics: topics,
    findTopic: findTopic
  };

})();
