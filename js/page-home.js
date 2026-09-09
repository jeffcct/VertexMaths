/* ============================================================
   page-home.js — composition root for index.html. Wires HomeView
   up to real page navigation (algebra.html, optionally deep-linked
   to a topic via ?topic=<id>).
   ============================================================ */
(function(){

  document.addEventListener('DOMContentLoaded', function(){
    VM.Toast.init();

    VM.HomeView.init({
      onOpenAlgebra: function(){
        window.location.href = 'algebra.html';
      },
      onResume: function(topicId){
        window.location.href = 'algebra.html?topic=' + encodeURIComponent(topicId);
      }
    });
  });

})();
