/* ============================================================
   app.js — composition root. This is the only file that knows
   which views exist and how they connect; it owns switching
   between them and nothing else. Each component only talks back
   to this file through the callbacks passed into its init().
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    var views = {
      home: document.getElementById('view-home'),
      algebra: document.getElementById('view-algebra'),
      practiceLineGraph: document.getElementById('view-practice-line-graph'),
      practiceParabolaIntercepts: document.getElementById('view-practice-parabola-intercepts'),
      practiceParabolaVertex: document.getElementById('view-practice-parabola-vertex')
    };

    function showView(name){
      Object.keys(views).forEach(function(key){ views[key].hidden = (key !== name); });
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function showAlgebra(){
      showView('algebra');
      VM.DagView.onShow();
    }

    function showHome(){
      showView('home');
    }

    function showPracticeLineGraph(){
      showView('practiceLineGraph');
      VM.PracticeLineGraph.start();
    }

    function showPracticeParabolaIntercepts(){
      showView('practiceParabolaIntercepts');
      VM.PracticeParabolaIntercepts.start();
    }

    function showPracticeParabolaVertex(){
      showView('practiceParabolaVertex');
      VM.PracticeParabolaVertex.start();
    }

    VM.Toast.init();

    VM.DagView.init({
      onBack: showHome,
      onOpenPractice: function(topicId){
        if(topicId === 'line-from-graph'){ showPracticeLineGraph(); }
        else if(topicId === 'parabola-from-intercepts'){ showPracticeParabolaIntercepts(); }
        else if(topicId === 'parabola-from-vertex'){ showPracticeParabolaVertex(); }
      }
    });

    VM.PracticeLineGraph.init({
      onBack: showAlgebra
    });

    VM.PracticeParabolaIntercepts.init({
      onBack: showAlgebra
    });

    VM.PracticeParabolaVertex.init({
      onBack: showAlgebra
    });

    VM.HomeView.init({
      onOpenAlgebra: showAlgebra,
      onResume: function(topicId){
        showAlgebra();
        VM.DagView.goToTopic(topicId);
      }
    });
  });

})();
