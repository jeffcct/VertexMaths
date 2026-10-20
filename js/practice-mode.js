/* ============================================================
   practice-mode.js — the Learn/Practice split shared by every
   Algebra & Graphing practice component.

   A topic's Learn button and Practice button open the exact same
   practice-*.html page, distinguished only by a `?mode=learn` query
   param (Practice is the default when the param is absent). Learn
   shows guidance toward the answer (either an existing ungraded
   scaffold step, for components that already had one, or a short
   method hint for single-step components); Practice goes straight to
   the plain scored question.

   Getting 10 correct answers while in Learn switches that session
   over to Practice for its remaining questions — nothing is
   persisted (no accuracy condition either, just a plain running
   count): closing the tab, or opening the page again, starts over at
   zero. Clicking "Practice" directly skips Learn's hints entirely
   from the first question.

   Public API:
     VM.PracticeMode.fromQuery() -> 'learn' | 'practice'
     VM.PracticeMode.create(initialMode) -> {
       isLearn(): bool,
       recordCorrect(): bool   // true exactly once, the moment this
                                // session graduates from learn to
                                // practice
     }
   ============================================================ */
window.VM = window.VM || {};

VM.PracticeMode = (function(){
  var GRADUATE_AFTER = 10;

  function fromQuery(){
    var m = new URLSearchParams(window.location.search).get('mode');
    return m === 'learn' ? 'learn' : 'practice';
  }

  function create(initialMode){
    var mode = initialMode === 'learn' ? 'learn' : 'practice';
    var learnCorrect = 0;

    return {
      isLearn: function(){ return mode === 'learn'; },
      recordCorrect: function(){
        if(mode !== 'learn') return false;
        learnCorrect++;
        if(learnCorrect >= GRADUATE_AFTER){
          mode = 'practice';
          return true;
        }
        return false;
      }
    };
  }

  return { fromQuery: fromQuery, create: create };
})();
