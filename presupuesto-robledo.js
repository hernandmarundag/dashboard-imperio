/**
 * presupuesto-robledo.js — v3.0 PROFESIONAL
 * Presupuesto de obra Robledo gestionado como ingeniería de costos.
 * Fuente 100% Supabase: presupuesto_caps, presupuesto_items, gastos, abonos, ajustes_obra
 */
(function () {
  'use strict';
  var OBRA = 'robledo';
  var SB_URL_FB = 'https://dghmgaaprlzpfnpsqzav.supabase.co';

  // Mapa rubro de gasto -> número de capítulo de acabados
  var RUBRO_CAP = {
    'Preliminares':'1','Mampostería':'5','Revoques y Estucos':'5','Pisos y Enchapes':'7',
    'Drywall':'8','Ventanería':'9','Mano de Obra':'10','Eléctrico':'11','Hidráulico':'12',
    'Carpintería':'13','Electrodomésticos':'13b','Pintura':'14','Equipos y CCTV':'15','Gas':'17'
  };
  // Rubros que son ESTRUCTURA / general (no acabados) -> van a obra negra
  var ESTRUCTURA_RUBROS = {'Sin clasificar':1,'Administración':1,'Imprevistos':1};
  // Correcciones manuales del ingeniero (pagado por capítulo)
  var CORRECCION_PAGADO = { '5': 5000000 };

  function fmt(v){ return '$' + Math.round(v||0).toLocaleString('es-CO'); }
  function fmtM(v){ v=v||0; return v>=1e6 ? '$'+(v/1e6).toFixed(1)+'M' : '$'+Math.round(v).toLocaleString('es-CO'); }

  function injectStyles(){
    if (document.getElementById('rob-pro-styles')) return;
    var s=document.createElement('style'); s.id='rob-pro-styles';
    s.textContent = `
    .rp-wrap{font-family:'Inter',system-ui,sans-serif;color:#e8eaf6}
    .rp-fin{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
    .rp-fc{background:#1a1e2e;border-radius:10px;padding:13px 15px;border-left:4px solid #6366f1}
    .rp-fc.g{border-color:#10b981}.rp-fc.r{border-color:#ef4444}.rp-fc.y{border-color:#f59e0b}.rp-fc.b{border-color:#3b82f6}
    .rp-fc label{font-size:9.5px;color:#8892b0;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px;font-weight:700}
    .rp-fc .v{font-size:19px;font-weight:800;letter-spacing:-.5px}
    .rp-fc .nt{font-size:9px;color:#8892b0;margin-top:2px}
    .rp-sec{font-size:12px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;padding-bottom:7px;border-bottom:1px solid rgba(99,102,241,.25)}
    .rp-fase{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
    @media(max-width:700px){.rp-fase{grid-template-columns:1fr}}
    .rp-fcard{background:#161a28;border:1px solid rgba(99,102,241,.15);border-radius:12px;padding:16px}
    .rp-fcard h4{font-size:13px;font-weight:800;margin-bottom:8px}
    .rp-fcard .big{font-size:24px;font-weight:800;letter-spacing:-.8px}
    .rp-tbl{width:100%;border-collapse:collapse;font-size:12.5px;background:#161a28;border-radius:10px;overflow:hidden}
    .rp-tbl thead th{background:#0d1117;color:#8892b0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;padding:10px;text-align:right;font-weight:700}
    .rp-tbl thead th:first-child{text-align:left}
    .rp-tbl td{padding:9px 10px;text-align:right;border-bottom:1px solid rgba(99,102,241,.07)}
    .rp-tbl td:first-child{text-align:left}
    .rp-cap{cursor:pointer;font-weight:700}
    .rp-cap:hover{background:rgba(99,102,241,.06)}
    .rp-item td{font-size:11px;color:#9aa3c0;background:rgba(13,17,23,.4)}
    .rp-item td:first-child{padding-left:26px}
    .rp-bar{height:5px;border-radius:3px;background:rgba(99,102,241,.12);overflow:hidden;margin-top:4px}
    .rp-bar>i{display:block;height:5px;border-radius:3px}
    .rp-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px}
    .ok{background:rgba(16,185,129,.15);color:#10b981}.warn{background:rgba(245,158,11,.15);color:#f59e0b}.bad{background:rgba(239,68,68,.15);color:#ef4444}.pend{background:rgba(136,146,176,.15);color:#8892b0}
    `;
    document.head.appendChild(s);
  }

  function sbGet(path){
    var key = window.SB_KEY || '';
    return fetch((window.SB_URL||SB_URL_FB)+'/rest/v1/'+path, {headers:{'apikey':key,'Authorization':'Bearer '+key}})
      .then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });
  }

  function build(caps, items, gastos, abonos, ajustes){
    // Pagado por capítulo (acabados)
    var pagCap = {};
    var estructura = 0, acabadosPag = 0;
    (gastos||[]).forEach(function(g){
      var rub = g.rubro || 'Sin clasificar';
      if (ESTRUCTURA_RUBROS[rub]) { estructura += (g.monto||0); return; }
      var cap = RUBRO_CAP[rub];
      if (cap){ pagCap[cap]=(pagCap[cap]||0)+(g.monto||0); acabadosPag+=(g.monto||0); }
      else { estructura += (g.monto||0); }
    });
    Object.keys(CORRECCION_PAGADO).forEach(function(c){
      var prev=pagCap[c]||0; acabadosPag += (CORRECCION_PAGADO[c]-prev); pagCap[c]=CORRECCION_PAGADO[c];
    });

    var abonosTot = (abonos||[]).reduce(function(a,b){return a+(b.monto||0);},0);
    var gastosTot = (gastos||[]).reduce(function(a,b){return a+(b.monto||0);},0);
    var utilidad = 0;
    (ajustes||[]).forEach(function(a){ if(a.tipo==='utilidad_anticipada') utilidad+=(a.monto||0); });
    var cajaReal = abonosTot - gastosTot - utilidad;
    var pptoTot = (caps||[]).reduce(function(a,c){return a+(+c.ppto||0);},0);
    var faltaTot = pptoTot - acabadosPag;

    var itemsByCap = {};
    (items||[]).forEach(function(it){ (itemsByCap[it.cap_num]=itemsByCap[it.cap_num]||[]).push(it); });

    // ── RESUMEN FINANCIERO ──
    var h = '<div class="rp-wrap">';
    h += '<div class="rp-sec">💼 Resumen financiero ejecutivo</div>';
    h += '<div class="rp-fin">'
      + '<div class="rp-fc b"><label>Abonos recibidos</label><div class="v">'+fmtM(abonosTot)+'</div><div class="nt">Cliente · '+(abonos||[]).length+' abonos</div></div>'
      + '<div class="rp-fc y"><label>Gastos ejecutados</label><div class="v">'+fmtM(gastosTot)+'</div><div class="nt">'+(gastos||[]).length+' movimientos · desde feb</div></div>'
      + '<div class="rp-fc r"><label>Utilidad anticipada</label><div class="v">'+fmtM(utilidad)+'</div><div class="nt">Retirada por adelantado</div></div>'
      + '<div class="rp-fc g"><label>Caja real disponible</label><div class="v">'+fmt(cajaReal)+'</div><div class="nt">Efectivo hoy</div></div>'
      + '</div>';

    // ── DOS FASES ──
    h += '<div class="rp-sec">🏗 Avance de obra — dos fases</div>';
    h += '<div class="rp-fase">'
      + '<div class="rp-fcard"><h4>1 · Obra Negra / Estructura <span class="rp-badge ok">EJECUTADA</span></h4>'
        + '<div class="big" style="color:#10b981">'+fmtM(estructura)+'</div>'
        + '<div style="font-size:11px;color:#8892b0;margin-top:6px">Zapatas, estructura, losas y mano de obra desde feb-2026. Pendiente: cubierta.</div></div>'
      + '<div class="rp-fcard"><h4>2 · Acabados <span class="rp-badge warn">EN EJECUCIÓN</span></h4>'
        + '<div class="big" style="color:#f59e0b">'+fmtM(pptoTot)+'</div>'
        + '<div style="font-size:11px;color:#8892b0;margin-top:6px">Presupuesto pendiente. Pagado a la fecha: '+fmt(acabadosPag)+' · Falta: '+fmt(faltaTot)+'</div></div>'
      + '</div>';

    // ── PRESUPUESTO ACABADOS DETALLE ──
    h += '<div class="rp-sec">📋 Presupuesto de acabados — detalle por capítulo</div>';
    h += '<table class="rp-tbl"><thead><tr>'
      + '<th>Capítulo / Ítem</th><th>Presupuesto</th><th>Pagado</th><th>Falta</th><th>%</th><th style="text-align:center">Estado</th>'
      + '</tr></thead><tbody>';
    (caps||[]).forEach(function(c){
      var pag = pagCap[c.num]||0; var ppto=+c.ppto||0; var falta=ppto-pag;
      var pct = ppto>0 ? Math.round(pag/ppto*100) : (pag>0?100:0);
      var cls = pct>=100?(falta<0?'bad':'ok'):pct>0?'warn':'pend';
      var lbl = pct>=100?(falta<0?'EXCEDIDO':'Listo'):pct>0?'En curso':'Pendiente';
      var barCol = falta<0?'#ef4444':pct>=100?'#10b981':pct>0?'#f59e0b':'#475569';
      var its = itemsByCap[c.num]||[];
      h += '<tr class="rp-cap" onclick="(function(e){var n=e.target.closest(\'tr\').nextElementSibling;while(n&&n.classList.contains(\'rp-item\')){n.style.display=n.style.display===\'none\'?\'table-row\':\'none\';n=n.nextElementSibling;}})(event)">'
        + '<td>'+(its.length?'▸ ':'')+c.num+'. '+c.nombre+'</td>'
        + '<td>'+fmt(ppto)+'</td>'
        + '<td style="color:'+(pag>0?'#f59e0b':'#475569')+'">'+(pag>0?fmt(pag):'—')+'</td>'
        + '<td style="color:'+(falta<0?'#ef4444':'#e8eaf6')+'">'+fmt(falta)+'</td>'
        + '<td>'+pct+'%<div class="rp-bar"><i style="width:'+Math.min(100,pct)+'%;background:'+barCol+'"></i></div></td>'
        + '<td style="text-align:center"><span class="rp-badge '+cls+'">'+lbl+'</span></td></tr>';
      its.forEach(function(it){
        h += '<tr class="rp-item" style="display:none"><td>'+it.item+' '+it.descripcion+'</td>'
          + '<td>'+(it.total?fmt(it.total):'—')+'</td><td>'+(it.und||'')+(it.cant?' ×'+it.cant:'')+'</td><td></td><td></td><td></td></tr>';
      });
    });
    h += '<tr style="font-weight:800;background:#0d1117"><td>TOTAL ACABADOS</td><td>'+fmt(pptoTot)+'</td><td style="color:#f59e0b">'+fmt(acabadosPag)+'</td><td>'+fmt(faltaTot)+'</td><td>'+(pptoTot>0?Math.round(acabadosPag/pptoTot*100):0)+'%</td><td></td></tr>';
    h += '</tbody></table>';
    h += '<div style="font-size:10px;color:#64748b;margin-top:8px">📡 Datos en vivo desde Supabase · Presupuesto real del Excel de obra · Clic en un capítulo para ver sus ítems.</div>';
    h += '</div>';
    return h;
  }

  function renderInto(container){
    container.innerHTML = '<div style="text-align:center;padding:28px;color:#8892b0;font-size:12px">⏳ Cargando presupuesto profesional desde Supabase...</div>';
    Promise.all([
      sbGet('presupuesto_caps?obra_id=eq.robledo&order=orden'),
      sbGet('presupuesto_items?obra_id=eq.robledo&order=orden'),
      sbGet('gastos?obra=eq.robledo&select=monto,rubro&limit=2000'),
      sbGet('abonos?obra_id=eq.robledo&select=monto'),
      sbGet('ajustes_obra?obra_id=eq.robledo&select=tipo,monto')
    ]).then(function(res){
      container.innerHTML = build(res[0],res[1],res[2],res[3],res[4]);
    });
  }

  // ── MOUNT (enganche compatible con la app) ──
  var _rendered=false;
  function injectTab(){
    if (document.getElementById('otab-pre-robledo')) return;
    var lastBtn=document.getElementById('otab-ldg-robledo'); if(!lastBtn) return;
    injectStyles();
    var btn=document.createElement('button'); btn.id='otab-pre-robledo'; btn.className='obra-tab';
    btn.setAttribute('onclick',"obraTab('robledo','pre')"); btn.innerHTML='💰 Presupuesto';
    lastBtn.parentElement.appendChild(btn);
    var v=document.getElementById('v-robledo'); if(!v) return;
    var d=document.createElement('div'); d.id='otc-pre-robledo'; d.style.cssText='display:none;padding:12px 0'; v.appendChild(d);
    var _orig=window.obraTab;
    window.obraTab=function(o,t){ if(_orig)_orig(o,t);
      var c=document.getElementById('otc-pre-robledo'), pb=document.getElementById('otab-pre-robledo');
      var pre=(o==='robledo'&&t==='pre');
      if(c)c.style.display=pre?'block':'none'; if(pb)pb.classList.toggle('on',pre);
      if(pre&&c&&!_rendered){_rendered=true;renderInto(c);}
    };
  }
  function waitInject(){
    if(document.getElementById('otab-ldg-robledo')){injectTab();return;}
    var ob=new MutationObserver(function(){if(document.getElementById('otab-ldg-robledo')){ob.disconnect();injectTab();}});
    ob.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',waitInject); else waitInject();
})();
