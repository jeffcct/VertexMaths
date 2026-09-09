/* ============================================================
   toast.js — small shared component: a single bottom-of-screen
   notice. Any other component can call VM.Toast.show(message).
   ============================================================ */
window.VM = window.VM || {};

VM.Toast = (function(){
  var el = null;
  var timer = null;

  function init(){
    el = document.getElementById('toast');
  }

  function show(message){
    if(!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function(){ el.classList.remove('show'); }, 2200);
  }

  return { init: init, show: show };
})();
