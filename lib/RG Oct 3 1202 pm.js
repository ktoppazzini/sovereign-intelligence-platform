// lib/reportGraphs.js
// Dependency-free helpers for blue "card" charts used inside the report.

// -------- Card CSS (string, no template literals) --------
export const GRAPH_CSS =
  ".chart-card{background:#0E2A44;border-radius:18px;padding:14px 16px;margin:10px 0 8px;"
  +"box-shadow:0 2px 10px rgba(0,0,0,.06);color:#E6F0FF}"
  +".chart-top{display:flex;justify-content:space-between;align-items:center;margin:2px 4px 8px}"
  +".chart-title{font-weight:700;opacity:.95}"
  +".chart-type{font-size:.9rem;background:#0c2238;border:1px solid rgba(255,255,255,.12);"
  +"color:#E6F0FF;border-radius:8px;padding:2px 8px}"
  +".chart-canvas{width:100%;height:320px;display:block;border-radius:12px;background:#0b2034}"
  +".chart-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:.85rem;opacity:.9}"
  +".chart-legend .sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px}"
  +".ssr-svg{border-radius:16px}";

// -------- small utils --------
function safeArr(a, len, fill){
  if (!Array.isArray(a) || !a.length) {
    var n = typeof len === "number" ? len : 0;
    var f = typeof fill === "number" ? fill : 0;
    var out = []; for (var i=0;i<n;i++) out.push(f); return out;
  }
  return a;
}
function enc(x){ return encodeURIComponent(JSON.stringify(x)); }

// -------- shared card shell --------
function cardHTML(opts){
  var id      = String(opts.id || "");
  var title   = String(opts.title || "");
  var labels  = safeArr(opts.labels);
  var series  = safeArr(opts.series, labels.length, 0);
  var xTitle  = String(opts.xTitle || "");
  var yTitle  = String(opts.yTitle || "");
  var type    = String(opts.type || "line").toLowerCase();

  var html = "";
  html += '<figure class="chart-card" data-id="'+id+'" data-type="'+type+'"';
  html += ' data-labels="'+enc(labels)+'" data-series="'+enc(series)+'"';
  html += ' data-xtitle="'+enc(xTitle)+'" data-ytitle="'+enc(yTitle)+'">';
  html += '<div class="chart-top">';
  html += '<figcaption class="chart-title">'+title+'</figcaption>';
  html += '<label>Chart: <select class="chart-type" aria-label="Chart type">';
  html += '<option value="line"'+(type==='line'?' selected':'')+'>Line</option>';
  html += '<option value="bar"'+(type==='bar'?' selected':'')+'>Bar</option>';
  html += '</select></label></div>';
  html += '<canvas class="chart-canvas" width="900" height="320"></canvas>';
  html += '</figure>';
  return html;
}

// -------- public HTML builders --------
export function lineChartHTML(opts){ var o = {}; for (var k in opts) o[k]=opts[k]; o.type='line'; return cardHTML(o); }
export function barChartHTML(opts){  var o = {}; for (var k in opts) o[k]=opts[k]; o.type='bar';  return cardHTML(o); }

export function heatmapHTML(opts){
  opts = opts || {};
  var title = String(opts.title || "Heat Map");
  var rows  = Array.isArray(opts.rows)&&opts.rows.length ? opts.rows : ['R1','R2','R3','R4','R5'];
  var cols  = Array.isArray(opts.cols)&&opts.cols.length ? opts.cols : ['C1','C2','C3','C4','C5'];
  var data;
  if (Array.isArray(opts.data) && opts.data.length){ data = opts.data; }
  else{
    data = [];
    for (var r=0;r<rows.length;r++){
      var row=[]; for (var c=0;c<cols.length;c++) row.push(1+Math.floor(Math.random()*5));
      data.push(row);
    }
  }
  var payload = enc({rows:rows, cols:cols, data:data});
  var html = '';
  html += '<figure class="chart-card" data-type="heatmap" data-heat="'+payload+'">';
  html += '<div class="chart-top"><figcaption class="chart-title">'+title+'</figcaption></div>';
  html += '<canvas class="chart-canvas" width="900" height="320"></canvas>';
  html += '<div class="chart-legend" aria-hidden="true">';
  html += '<span><span class="sw" style="background:#173b5e"></span>Low</span>';
  html += '<span><span class="sw" style="background:#1e5b87"></span></span>';
  html += '<span><span class="sw" style="background:#247eae"></span></span>';
  html += '<span><span class="sw" style="background:#2aa4c6"></span></span>';
  html += '<span><span class="sw" style="background:#30c7db"></span>High</span>';
  html += '</div></figure>';
  return html;
}

// -------- client-side hydrator (single-quoted, escaped, no backticks) --------
export const HYDRATE_INLINE_SCRIPT =
'(function(){var Q=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};'
+'function P(el,attr,fb){try{return JSON.parse(decodeURIComponent(el.getAttribute(attr)||fb));}catch(e){return JSON.parse(fb);} }'
+'function AX(ctx,W,H,pad,min,max,xLabels,titles){ctx.clearRect(0,0,W,H);var left=pad,right=W-pad,top=pad,bottom=H-pad;'
+'ctx.strokeStyle="rgba(255,255,255,.25)";ctx.lineWidth=1;var yT=5;for(var i=0;i<=yT;i++){var y=top+(i*(bottom-top))/yT;'
+'ctx.globalAlpha=0.5;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.globalAlpha=1;'
+'var val=Math.round(max-(i*(max-min))/yT);ctx.fillStyle="#E6F0FF";ctx.font="12px system-ui";ctx.fillText(val.toLocaleString(),6,y+4);}'
+'ctx.strokeStyle="rgba(255,255,255,.6)";ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.stroke();'
+'ctx.beginPath();ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();'
+'ctx.fillStyle="#E6F0FF";ctx.font="13px system-ui";if(titles.y){ctx.save();ctx.translate(16,H/2);ctx.rotate(-Math.PI/2);'
+'ctx.textAlign="center";ctx.fillText(titles.y,0,0);ctx.restore();}if(titles.x){ctx.textAlign="center";ctx.fillText(titles.x,(left+right)/2,H-6);}'
+'var show=Math.max(2,Math.min(12,xLabels.length));var step=Math.max(1,Math.floor(xLabels.length/show));ctx.font="12px system-ui";'
+'for(var j=0;j<xLabels.length;j+=step){var x=left+(j*(right-left))/Math.max(xLabels.length-1,1);ctx.fillText(String(xLabels[j]),x,H-22);}'
+'return{left:left,right:right,top:top,bottom:bottom};}'
+'function DR(ctx,kind,rect,labels,series,min,max){var left=rect.left,right=rect.right,top=rect.top,bottom=rect.bottom;'
+'var sx=function(i){return left+(i*(right-left))/Math.max(labels.length-1,1);};'
+'var sy=function(v){return bottom-((v-min)/(max-min||1))*(bottom-top);};'
+'if(kind==="line"){ctx.strokeStyle="#a8d7ff";ctx.lineWidth=3;ctx.beginPath();'
+'series.forEach(function(v,i){var x=sx(i),y=sy(v);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}'
+'else{var w=(right-left)/Math.max(series.length,1)*0.65;ctx.fillStyle="#9cd1ff";'
+'series.forEach(function(v,i){var x=sx(i)-w/2,y=sy(v);ctx.fillRect(x,y,w,bottom-y);});}}'
+'function CARD(el){var sel=el.querySelector(".chart-type");var canvas=el.querySelector("canvas");'
+'var ctx=canvas.getContext("2d",{alpha:false});var t=(el.getAttribute("data-type")||"line").toLowerCase();'
+'if(t==="heatmap"){var payload=P(el,"data-heat","{}");var rows=payload.rows||[],cols=payload.cols||[],data=payload.data||[];'
+'var W=canvas.width,H=canvas.height,pad=40,top=pad,left=pad+20,bottom=H-pad,right=W-pad;'
+'var cellW=(right-left)/cols.length,cellH=(bottom-top)/rows.length;var palette=["#173b5e","#1e5b87","#247eae","#2aa4c6","#30c7db"];'
+'ctx.fillStyle="#0b2034";ctx.fillRect(0,0,W,H);ctx.fillStyle="#E6F0FF";ctx.font="12px system-ui";'
+'rows.forEach(function(r,i){ctx.fillText(r,8,top+cellH*(i+.65));});cols.forEach(function(c,i){ctx.fillText(c,left+cellW*(i+.2),H-10);});'
+'ctx.strokeStyle="rgba(255,255,255,.6)";ctx.strokeRect(left,top,right-left,bottom-top);'
+'for(var rr=0;rr<rows.length;rr++){for(var cc=0;cc<cols.length;cc++){var v=Math.max(1,Math.min(5,Number((data[rr]||[])[cc])||1));'
+'ctx.fillStyle=palette[v-1];ctx.fillRect(left+cc*cellW+1,top+rr*cellH+1,cellW-2,cellH-2);}}return;}'
+'var labels=P(el,"data-labels","[]");var series=P(el,"data-series","[]");'
+'var xTitle=P(el,"data-xtitle","\\"\\\\"");var yTitle=P(el,"data-ytitle","\\"\\\\"");'
+'function render(kind){var W=canvas.width,H=canvas.height,pad=48;ctx.fillStyle="#0b2034";ctx.fillRect(0,0,W,H);'
+'var min=Math.min(0,Math.min.apply(Math,series));var max=Math.max(1,Math.max.apply(Math,series));'
+'var rect=AX(ctx,W,H,pad,min,max,labels,{x:xTitle,y:yTitle});DR(ctx,kind,rect,labels,series,min,max);}'
+'var initial=(sel&&sel.value)||t||"line";render(initial);if(sel){sel.addEventListener("change",function(e){render(e.target.value);});}}'
+'Q(".chart-card").forEach(CARD);})();';




