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
    { id:"word-interpreting", name:"Word interpreting", description:"A shape's sides are described in words using two variables. Use a given constraint to eliminate one and find an expression for the perimeter in terms of the other.", ready:true }
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
