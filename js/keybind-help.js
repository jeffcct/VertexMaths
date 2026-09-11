/* ============================================================
   keybind-help.js — a small "?" button for any page with a text
   input that expects typed notation a student might not otherwise
   guess (currently: "^" for a power/exponent). Click toggles a
   popover listing the keybind; click elsewhere, or Escape, closes it.

   Public API: VM.KeybindHelp.attach(mountEl, entries) — appends the
   button and its popover into mountEl. entries is optional: a list
   of { keys, result, desc } rows to show instead of the default
   single "^" entry, for a component whose input accepts more
   shorthand than just powers (e.g. rearranging formulae's "sqrt(...)",
   "pi", "rho", "/" — see practice-rearrange-formulae.js).
   ============================================================ */
window.VM = window.VM || {};

VM.KeybindHelp = (function(){
  // Listed as { keys, result, desc }. Only one entry today, but kept
  // as a list since the popover already renders any number of rows.
  var KEYBINDS = [
    { keys: 'Shift + 6', result: '^', desc: 'Power / exponent, e.g. x^2' }
  ];

  function buildRow(k){
    var row = document.createElement('div');
    row.className = 'keybind-help-row';
    row.innerHTML =
      '<span class="mono keybind-help-keys"></span>' +
      '<span class="mono keybind-help-result"></span>' +
      '<span class="keybind-help-desc"></span>';
    row.querySelector('.keybind-help-keys').textContent = k.keys;
    row.querySelector('.keybind-help-result').textContent = k.result;
    row.querySelector('.keybind-help-desc').textContent = k.desc;
    return row;
  }

  function attach(mountEl, entries){
    if(!mountEl) return;
    mountEl.classList.add('keybind-help');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keybind-help-btn';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'Keyboard shortcuts for typing equations');
    btn.setAttribute('aria-expanded', 'false');

    var panel = document.createElement('div');
    panel.className = 'keybind-help-panel';
    panel.hidden = true;
    var title = document.createElement('div');
    title.className = 'keybind-help-title';
    title.textContent = 'Typing equations';
    panel.appendChild(title);
    (entries || KEYBINDS).forEach(function(k){ panel.appendChild(buildRow(k)); });

    mountEl.appendChild(btn);
    mountEl.appendChild(panel);

    function close(){ panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    function toggle(){
      var opening = panel.hidden;
      panel.hidden = !opening;
      btn.setAttribute('aria-expanded', String(opening));
    }
    btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
    document.addEventListener('click', function(e){ if(!mountEl.contains(e.target)) close(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
  }

  return { attach: attach };
})();
