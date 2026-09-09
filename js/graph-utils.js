/* ============================================================
   graph-utils.js — shared coordinate-grid SVG rendering, used by
   every Practice component that plots something on a grid (the
   line generator, the parabola-from-intercepts generator, and any
   future one). Not a "view": no DOM lookups here, just pure
   functions that build SVG markup strings from a grid config.

   Public API: VM.GraphUtils.makeGrid({ xMin, xMax, yMin, yMax, cell,
   margin, labelStep }) -> { toPx, gridSvg, axesSvg, xMin, xMax,
   yMin, yMax, cell, margin }
   ============================================================ */
window.VM = window.VM || {};

VM.GraphUtils = (function(){

  function makeGrid(opts){
    opts = opts || {};
    var xMin = opts.xMin, xMax = opts.xMax;
    var yMin = (opts.yMin !== undefined) ? opts.yMin : xMin;
    var yMax = (opts.yMax !== undefined) ? opts.yMax : xMax;
    var cell = opts.cell;
    var margin = opts.margin;
    var labelStep = opts.labelStep || 2;

    function toPx(x, y){
      return { x: margin + (x - xMin) * cell, y: margin + (yMax - y) * cell };
    }

    function gridSvg(){
      var s = '';
      for(var x = xMin; x <= xMax; x++){
        var top = toPx(x, yMax), bot = toPx(x, yMin);
        s += '<line x1="' + top.x + '" y1="' + top.y + '" x2="' + bot.x + '" y2="' + bot.y + '" class="grid-line"></line>';
      }
      for(var y = yMin; y <= yMax; y++){
        var l = toPx(xMin, y), r = toPx(xMax, y);
        s += '<line x1="' + l.x + '" y1="' + l.y + '" x2="' + r.x + '" y2="' + r.y + '" class="grid-line"></line>';
      }
      return s;
    }

    function axesSvg(){
      var xL = toPx(xMin, 0), xR = toPx(xMax, 0), yT = toPx(0, yMax), yB = toPx(0, yMin);
      var s = '';
      s += '<line x1="' + xL.x + '" y1="' + xL.y + '" x2="' + xR.x + '" y2="' + xR.y + '" class="axis-line"></line>';
      s += '<line x1="' + yT.x + '" y1="' + yT.y + '" x2="' + yB.x + '" y2="' + yB.y + '" class="axis-line"></line>';
      for(var x = xMin; x <= xMax; x += labelStep){
        if(x === 0) continue;
        var p = toPx(x, 0);
        s += '<text x="' + p.x + '" y="' + (p.y + 13) + '" class="axis-label" text-anchor="middle">' + x + '</text>';
      }
      for(var y = yMin; y <= yMax; y += labelStep){
        if(y === 0) continue;
        var p2 = toPx(0, y);
        s += '<text x="' + (p2.x - 6) + '" y="' + (p2.y + 3) + '" class="axis-label" text-anchor="end">' + y + '</text>';
      }
      var o = toPx(0, 0);
      s += '<text x="' + (o.x - 6) + '" y="' + (o.y + 13) + '" class="axis-label" text-anchor="end">0</text>';
      return s;
    }

    return {
      toPx: toPx, gridSvg: gridSvg, axesSvg: axesSvg,
      xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, cell: cell, margin: margin
    };
  }

  return { makeGrid: makeGrid };

})();
