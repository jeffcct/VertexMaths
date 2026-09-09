/* ============================================================
   dag-view.js — the DagView component: renders VM.data.topics as
   a prerequisite diagram. Rows run least-dependent (top) to
   most-dependent (bottom) by prerequisite depth. Within a row,
   nodes are ordered by a barycenter pass — each node is pulled
   toward the average position of the prerequisites and dependents
   it's actually connected to — so a skill sits close to the
   skills it's linked to instead of being grouped by category.

   Public API: VM.DagView.init({ onBack }), .onShow(), .goToTopic(id)
   ============================================================ */
window.VM = window.VM || {};

VM.DagView = (function(){
  var data = null; // set in init(), points at VM.data

  var dagEl, levelsEl, edgesEl, backBtn;
  var focusId = null;
  var levelCache = {};
  var initOpts = {};

  function levelOf(id){
    if(levelCache.hasOwnProperty(id)) return levelCache[id];
    var t = data.findTopic(id);
    if(!t || !t.prereqs.length){ levelCache[id] = 0; return 0; }
    var maxP = 0;
    t.prereqs.forEach(function(p){ maxP = Math.max(maxP, levelOf(p)); });
    levelCache[id] = maxP + 1;
    return levelCache[id];
  }

  function ancestorsOf(id){
    var seen = {};
    function walk(nid){
      var t = data.findTopic(nid);
      if(!t) return;
      t.prereqs.forEach(function(p){
        if(!seen[p]){ seen[p] = true; walk(p); }
      });
    }
    walk(id);
    return seen;
  }

  // ---- Layered order with a barycenter pass -------------------------
  // Standard technique for drawing layered DAGs: rows are fixed by
  // prerequisite depth, but which node sits where *within* a row is
  // refined over a few passes so connected nodes drift toward a shared
  // horizontal position, keeping "who depends on whom" visually close
  // even though it isn't the row/column axis.
  function buildChildren(){
    var children = {};
    data.topics.forEach(function(t){
      t.prereqs.forEach(function(p){
        (children[p] = children[p] || []).push(t.id);
      });
    });
    return children;
  }

  function orderedRows(){
    var byLevel = {};
    var maxLevel = 0;
    data.topics.forEach(function(t){
      var lvl = levelOf(t.id);
      maxLevel = Math.max(maxLevel, lvl);
      (byLevel[lvl] = byLevel[lvl] || []).push(t.id);
    });
    var levels = [];
    for(var l = 0; l <= maxLevel; l++){ levels.push(byLevel[l] || []); }

    var children = buildChildren();
    var pos = {};
    function recomputePos(){
      levels.forEach(function(row){
        row.forEach(function(id, idx){
          pos[id] = row.length > 1 ? idx / (row.length - 1) : 0.5;
        });
      });
    }
    recomputePos();

    function sortRowByBarycenter(row, neighborsOf){
      var bary = {};
      row.forEach(function(id, idx){
        var refs = neighborsOf(id).filter(function(r){ return pos.hasOwnProperty(r); });
        bary[id] = refs.length
          ? refs.reduce(function(sum, r){ return sum + pos[r]; }, 0) / refs.length
          : pos[id];
      });
      return row.slice().sort(function(a, b){
        return (bary[a] - bary[b]) || (row.indexOf(a) - row.indexOf(b));
      });
    }

    function prereqsOf(id){ var t = data.findTopic(id); return t ? t.prereqs : []; }
    function childrenOf(id){ return children[id] || []; }

    var ITERATIONS = 4;
    for(var iter = 0; iter < ITERATIONS; iter++){
      for(var down = 1; down <= maxLevel; down++){
        levels[down] = sortRowByBarycenter(levels[down], prereqsOf);
        recomputePos();
      }
      for(var up = maxLevel - 1; up >= 0; up--){
        levels[up] = sortRowByBarycenter(levels[up], childrenOf);
        recomputePos();
      }
    }

    return levels.map(function(row){
      return row.map(function(id){ return data.findTopic(id); });
    });
  }

  function renderNode(t){
    var html = '<div class="dag-node" id="topic-' + t.id + '" data-topic="' + t.id + '" tabindex="0" role="button" ';
    html += 'aria-label="' + t.name + ', ' + data.statusLabel(t.status) + '">';
    html += '<span class="cat-tag">' + data.LANES[t.lane] + '</span>';
    html += '<span class="topic-name">' + t.name + '</span>';
    html += '<span class="topic-status"><span class="dot ' + t.status + '"></span><span class="topic-status-label">' + data.statusLabel(t.status) + '</span></span>';
    html += '<span class="topic-actions">';
    if(t.ready){
      html += '<button class="pill learn" data-action="learn" data-topic="' + t.id + '">Learn</button>';
      html += '<button class="pill practice" data-action="practice" data-topic="' + t.id + '">Practice</button>';
    } else {
      html += '<button class="pill learn" disabled aria-label="Learn: not built yet">Learn</button>';
      html += '<button class="pill practice" disabled aria-label="Practice: not built yet">Practice</button>';
    }
    html += '</span></div>';
    return html;
  }

  function render(){
    var rows = orderedRows();
    var html = '';
    rows.forEach(function(row, lvl){
      html += '<div class="dag-level" data-level="' + lvl + '">' + row.map(renderNode).join('') + '</div>';
    });
    levelsEl.innerHTML = html;

    levelsEl.querySelectorAll('.dag-node').forEach(function(node){
      node.addEventListener('click', function(){ toggleFocus(node.getAttribute('data-topic')); });
      node.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleFocus(node.getAttribute('data-topic')); }
      });
    });
    levelsEl.querySelectorAll('[data-action]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var action = btn.getAttribute('data-action');
        var topic = data.findTopic(btn.getAttribute('data-topic'));
        if(!topic) return;
        if(action === 'practice' && topic.ready && initOpts.onOpenPractice){
          initOpts.onOpenPractice(topic.id);
          return;
        }
        VM.Toast.show((action === 'learn' ? 'Opening lesson: ' : 'Opening practice: ') + topic.name);
      });
    });
  }

  function toggleFocus(id){
    focusId = (focusId === id) ? null : id;
    applyFocus();
  }
  function setFocus(id){
    focusId = id;
    applyFocus();
  }
  function clearFocus(){
    focusId = null;
    applyFocus();
  }

  function applyFocus(){
    var chain = null;
    if(focusId){
      chain = ancestorsOf(focusId);
      chain[focusId] = true;
    }
    levelsEl.querySelectorAll('.dag-node').forEach(function(node){
      var id = node.getAttribute('data-topic');
      node.classList.remove('chain','dim','current');
      if(chain){
        if(chain[id]){
          node.classList.add('chain');
          if(id === focusId) node.classList.add('current');
        } else {
          node.classList.add('dim');
        }
      }
    });
    drawEdges();
  }

  function pointFor(el, base, edge){
    var r = el.getBoundingClientRect();
    var x = r.left + r.width / 2 - base.left;
    var y = (edge === 'bottom' ? r.bottom : r.top) - base.top;
    return { x:x, y:y };
  }

  var CURVE = 42;
  function edgeMarkup(p1, p2, cls){
    var d = 'M ' + p1.x + ' ' + p1.y +
      ' C ' + p1.x + ' ' + (p1.y + CURVE) + ', ' +
              p2.x + ' ' + (p2.y - CURVE) + ', ' +
              p2.x + ' ' + p2.y;
    var extra = cls ? (' class="' + cls + '"') : '';
    var out = '<path d="' + d + '"' + extra + '></path>';
    out += '<polygon points="' + (p2.x - 4.5) + ',' + (p2.y - 7) + ' ' + (p2.x + 4.5) + ',' + (p2.y - 7) + ' ' + p2.x + ',' + p2.y + '"' + extra + '></polygon>';
    return out;
  }

  function drawEdges(){
    var base = dagEl.getBoundingClientRect();
    edgesEl.setAttribute('width', dagEl.scrollWidth);
    edgesEl.setAttribute('height', dagEl.scrollHeight);
    var chain = null;
    if(focusId){ chain = ancestorsOf(focusId); chain[focusId] = true; }
    var svg = '';
    data.topics.forEach(function(t){
      var toEl = document.getElementById('topic-' + t.id);
      if(!toEl) return;
      var toPt = pointFor(toEl, base, 'top');
      t.prereqs.forEach(function(p){
        var fromEl = document.getElementById('topic-' + p);
        if(!fromEl) return;
        var fromPt = pointFor(fromEl, base, 'bottom');
        var cls = '';
        if(chain){ cls = (chain[p] && chain[t.id]) ? 'chain' : 'dim'; }
        svg += edgeMarkup(fromPt, toPt, cls);
      });
    });
    edgesEl.innerHTML = svg;
  }

  var redrawPending = false;
  function scheduleRedraw(){
    if(redrawPending) return;
    redrawPending = true;
    requestAnimationFrame(function(){ redrawPending = false; drawEdges(); });
  }

  function goToTopic(topicId){
    setFocus(topicId);
    requestAnimationFrame(function(){
      drawEdges();
      var node = document.getElementById('topic-' + topicId);
      if(node){
        node.scrollIntoView({ block:'center', inline:'center', behavior:'smooth' });
        node.classList.add('target');
        setTimeout(function(){ node.classList.remove('target'); }, 3300);
      }
    });
  }

  function onShow(){
    requestAnimationFrame(drawEdges);
  }

  function init(opts){
    initOpts = opts || {};
    data = VM.data;

    dagEl = document.getElementById('dag');
    levelsEl = document.getElementById('dag-levels');
    edgesEl = document.getElementById('dag-edges');
    backBtn = document.getElementById('back-btn');

    if(backBtn && initOpts.onBack){
      backBtn.addEventListener('click', initOpts.onBack);
    }

    levelsEl.addEventListener('click', function(e){ if(e.target === levelsEl) clearFocus(); });
    dagEl.addEventListener('click', function(e){ if(e.target === dagEl) clearFocus(); });

    render();

    if(window.ResizeObserver){
      new ResizeObserver(scheduleRedraw).observe(dagEl);
    }
    window.addEventListener('resize', scheduleRedraw);
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(scheduleRedraw);
    }
    drawEdges();
  }

  return { init: init, onShow: onShow, goToTopic: goToTopic };
})();
