/**
 * presupuesto-robledo.js — v4.0 INGENIERÍA DE COSTOS
 * Modelo real de obra: Obra Negra por etapas (acero+concreto totales) + Acabados (presupuesto pendiente).
 * Fuente 100% Supabase. Gastos etiquetados por etapa real.
 */
(function () {
  'use strict';
  var SB_URL_FB = 'https://dghmgaaprlzpfnpsqzav.supabase.co';

  // Rubro de gasto -> capítulo de acabados (solo para gastos de fase acabados)
  var RUBRO_CAP = {'Preliminares':'1','Mampostería':'5','Revoques y Estucos':'5','Pisos y Enchapes':'7',
    'Drywall':'8','Ventanería':'9','Mano de Obra':'10','Eléctrico':'11','Hidráulico':'12',
    'Carpintería':'13','Electrodomésticos':'13b','Pintura':'14','Equipos y CCTV':'15','Gas':'17'};

  // Orden y etiqueta de etapas de OBRA NEGRA (las etiquetas vienen "NN Nombre")
  var ETAPA_NOTA = {
    '03 Acero/Hierro':'Zapatas · pedestales · columnas · losas',
    '04 Concreto/Vaciados':'Zapatas · pedestales · columnas · losas · contrapiso'
  };

  function fmt(v){ return '$' + Math.round(v||0).toLocaleString('es-CO'); }
  function fmtM(v){ v=v||0; return v>=1e6 ? '$'+(v/1e6).toFixed(1)+'M' : '$'+Math.round(v).toLocaleString('es-CO'); }

  function injectStyles(){
    if (document.getElementById('rob-pro-styles')) return;
    var s=document.createElement('style'); s.id='rob-pro-styles';
    s.textContent=`
    .rp-wrap{font-family:'Inter',system-ui,sans-serif;color:#e8eaf6}
    .rp-fin{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
    .rp-fc{background:#1a1e2e;border-radius:10px;padding:13px 15px;border-left:4px solid #6366f1}
    .rp-fc.g{border-color:#10b981}.rp-fc.r{border-color:#ef4444}.rp-fc.y{border-color:#f59e0b}.rp-fc.b{border-color:#3b82f6}
    .rp-fc label{font-size:9.5px;color:#8892b0;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px;font-weight:700}
    .rp-fc .v{font-size:19px;font-weight:800;letter-spacing:-.5px}
    .rp-fc .nt{font-size:9px;color:#8892b0;margin-top:2px}
    .rp-sec{font-size:12px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;margin:22px 0 10px;padding-bottom:7px;border-bottom:1px solid rgba(99,102,241,.25)}
    .rp-tbl{width:100%;border-collapse:collapse;font-size:12.5px;background:#161a28;border-radius:10px;overflow:hidden;margin-bottom:6px}
    .rp-tbl thead th{background:#0d1117;color:#8892b0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;padding:10px;text-align:right;font-weight:700}
    .rp-tbl thead th:first-child{text-align:left}
    .rp-tbl td{padding:9px 10px;text-align:right;border-bottom:1px solid rgba(99,102,241,.07)}
    .rp-tbl td:first-child{text-align:left}
    .rp-tot td{font-weight:800;background:#0d1117}
    .rp-cap{cursor:pointer;font-weight:700}.rp-cap:hover{background:rgba(99,102,241,.06)}
    .rp-item td{font-size:11px;color:#9aa3c0;background:rgba(13,17,23,.4)}.rp-item td:first-child{padding-left:24px}
    .rp-sub{font-size:10px;color:#64748b}
    .rp-bar{height:5px;border-radius:3px;background:rgba(99,102,241,.12);overflow:hidden;margin-top:4px}.rp-bar>i{display:block;height:5px;border-radius:3px}
    .rp-badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px}
    .ok{background:rgba(16,185,129,.15);color:#10b981}.warn{background:rgba(245,158,11,.15);color:#f59e0b}.pend{background:rgba(136,146,176,.15);color:#8892b0}.bad{background:rgba(239,68,68,.15);color:#ef4444}
    `;
    document.head.appendChild(s);
  }
  function sbGet(path){
    var key=window.SB_KEY||'';
    return fetch((window.SB_URL||SB_URL_FB)+'/rest/v1/'+path,{headers:{'apikey':key,'Authorization':'Bearer '+key}})
      .then(function(r){return r.ok?r.json():[];}).catch(function(){return [];});
  }

  function build(caps, items, gastos, abonos, ajustes){
    // Agrupar gastos por etapa
    var porEtapa={}, acabPag={}, estructura=0, acabadosEjec=0;
    (gastos||[]).forEach(function(g){
      var et=g.etapa||'99 Otros'; var m=g.monto||0;
      porEtapa[et]=(porEtapa[et]||0)+m;
      if(et==='11 Acabados'){ acabadosEjec+=m; var c=RUBRO_CAP[g.rubro||'']; if(c) acabPag[c]=(acabPag[c]||0)+m; }
      else estructura+=m;
    });

    var abonosTot=(abonos||[]).reduce(function(a,b){return a+(b.monto||0);},0);
    var gastosTot=(gastos||[]).reduce(function(a,b){return a+(b.monto||0);},0);
    var utilidad=0; (ajustes||[]).forEach(function(a){ if(a.tipo==='utilidad_anticipada') utilidad+=(a.monto||0); });
    var cajaReal=abonosTot-gastosTot-utilidad;
    var pptoAcab=(caps||[]).reduce(function(a,c){return a+(+c.ppto||0);},0);
    var faltaAcab=pptoAcab-acabadosEjec;

    var h='<div class="rp-wrap">';
    // ── Financiero ──
    h+='<div class="rp-sec">💼 Resumen financiero ejecutivo</div><div class="rp-fin">'
      +'<div class="rp-fc b"><label>Abonos recibidos</label><div class="v">'+fmtM(abonosTot)+'</div><div class="nt">Cliente · '+(abonos||[]).length+' abonos</div></div>'
      +'<div class="rp-fc y"><label>Gastos ejecutados</label><div class="v">'+fmtM(gastosTot)+'</div><div class="nt">'+(gastos||[]).length+' movimientos · desde feb</div></div>'
      +'<div class="rp-fc r"><label>Utilidad anticipada</label><div class="v">'+fmtM(utilidad)+'</div><div class="nt">Retirada por adelantado</div></div>'
      +'<div class="rp-fc g"><label>Caja real disponible</label><div class="v">'+fmt(cajaReal)+'</div><div class="nt">Efectivo hoy</div></div></div>';

    // ── FASE 1: OBRA NEGRA por etapa (ejecutado) ──
    h+='<div class="rp-sec">🏗 Fase 1 · Obra Negra — ejecutado por etapa</div>';
    h+='<table class="rp-tbl"><thead><tr><th>Etapa de obra</th><th>Ejecutado</th><th style="text-align:center">Estado</th></tr></thead><tbody>';
    var ordenEst=['00 Preliminares/Diseños','01 Excavación','02 Cimentación/Zapatas','03 Acero/Hierro','04 Concreto/Vaciados','05 Formaleta/Encofrado','06 Columnas','07 Vigas','08 Losas/Entrepiso','09 Mampostería','10 Cubierta','12 Mano de obra','13 Administración/Indirectos','14 Transporte/Equipos','15 Materiales generales','99 Otros'];
    ordenEst.forEach(function(et){
      var v=porEtapa[et]; if(!v) return;
      var nombre=et.replace(/^\d+\s/,''); var nota=ETAPA_NOTA[et]?'<div class="rp-sub">'+ETAPA_NOTA[et]+'</div>':'';
      h+='<tr><td><b>'+nombre+'</b>'+nota+'</td><td style="color:#10b981;font-weight:700">'+fmt(v)+'</td>'
        +'<td style="text-align:center"><span class="rp-badge ok">Ejecutado</span></td></tr>';
    });
    h+='<tr class="rp-tot"><td>TOTAL OBRA NEGRA EJECUTADA</td><td style="color:#10b981">'+fmt(estructura)+'</td><td></td></tr>';
    h+='</tbody></table><div class="rp-sub" style="margin-bottom:4px">El costo de zapatas, pedestales, columnas y losas está dentro de Acero y Concreto (es de lo que están hechas).</div>';

    // ── FASE 2: ACABADOS (presupuesto pendiente) ──
    var itemsByCap={}; (items||[]).forEach(function(it){(itemsByCap[it.cap_num]=itemsByCap[it.cap_num]||[]).push(it);});
    h+='<div class="rp-sec">🎨 Fase 2 · Acabados — presupuesto pendiente</div>';
    h+='<table class="rp-tbl"><thead><tr><th>Capítulo / Ítem</th><th>Presupuesto</th><th>Pagado</th><th>Falta</th><th>%</th><th style="text-align:center">Estado</th></tr></thead><tbody>';
    (caps||[]).forEach(function(c){
      var pag=acabPag[c.num]||0; var ppto=+c.ppto||0; var falta=ppto-pag;
      var pct=ppto>0?Math.round(pag/ppto*100):(pag>0?100:0);
      var cls=pct>=100?'ok':pct>0?'warn':'pend'; var lbl=pct>=100?'Listo':pct>0?'En curso':'Pendiente';
      var col=pct>=100?'#10b981':pct>0?'#f59e0b':'#475569';
      var its=itemsByCap[c.num]||[];
      h+='<tr class="rp-cap" onclick="(function(e){var n=e.target.closest(\'tr\').nextElementSibling;while(n&&n.classList.contains(\'rp-item\')){n.style.display=n.style.display===\'none\'?\'table-row\':\'none\';n=n.nextElementSibling;}})(event)">'
        +'<td>'+(its.length?'▸ ':'')+c.num+'. '+c.nombre+'</td><td>'+fmt(ppto)+'</td>'
        +'<td style="color:'+(pag>0?'#f59e0b':'#475569')+'">'+(pag>0?fmt(pag):'—')+'</td>'
        +'<td>'+fmt(falta)+'</td><td>'+pct+'%<div class="rp-bar"><i style="width:'+Math.min(100,pct)+'%;background:'+col+'"></i></div></td>'
        +'<td style="text-align:center"><span class="rp-badge '+cls+'">'+lbl+'</span></td></tr>';
      its.forEach(function(it){
        h+='<tr class="rp-item" style="display:none"><td>'+it.item+' '+it.descripcion+'</td><td>'+(it.total?fmt(it.total):'—')+'</td><td>'+(it.und||'')+(it.cant?' ×'+it.cant:'')+'</td><td></td><td></td><td></td></tr>';
      });
    });
    h+='<tr class="rp-tot"><td>TOTAL ACABADOS</td><td>'+fmt(pptoAcab)+'</td><td style="color:#f59e0b">'+fmt(acabadosEjec)+'</td><td>'+fmt(faltaAcab)+'</td><td>'+(pptoAcab>0?Math.round(acabadosEjec/pptoAcab*100):0)+'%</td><td></td></tr>';
    h+='</tbody></table>';
    h+='<div class="rp-sub" style="margin-top:8px">📡 Datos en vivo desde Supabase · Gastos clasificados por etapa real de obra · Clic en un capítulo para ver ítems.</div></div>';
    return h;
  }

  function renderInto(c){
    c.innerHTML='<div style="text-align:center;padding:28px;color:#8892b0;font-size:12px">⏳ Cargando presupuesto profesional...</div>';
    Promise.all([
      sbGet('presupuesto_caps?obra_id=eq.robledo&order=orden'),
      sbGet('presupuesto_items?obra_id=eq.robledo&order=orden'),
      sbGet('gastos?obra=eq.robledo&select=monto,rubro,etapa&limit=2000'),
      sbGet('abonos?obra_id=eq.robledo&select=monto'),
      sbGet('ajustes_obra?obra_id=eq.robledo&select=tipo,monto')
    ]).then(function(r){ c.innerHTML=build(r[0],r[1],r[2],r[3],r[4]); });
  }

  var _rendered=false;
  function injectTab(){
    if(document.getElementById('otab-pre-robledo'))return;
    var lb=document.getElementById('otab-ldg-robledo'); if(!lb)return; injectStyles();
    var b=document.createElement('button'); b.id='otab-pre-robledo'; b.className='obra-tab';
    b.setAttribute('onclick',"obraTab('robledo','pre')"); b.innerHTML='💰 Presupuesto'; lb.parentElement.appendChild(b);
    var v=document.getElementById('v-robledo'); if(!v)return;
    var d=document.createElement('div'); d.id='otc-pre-robledo'; d.style.cssText='display:none;padding:12px 0'; v.appendChild(d);
    var _o=window.obraTab;
    window.obraTab=function(o,t){ if(_o)_o(o,t);
      var c=document.getElementById('otc-pre-robledo'),pb=document.getElementById('otab-pre-robledo'),pre=(o==='robledo'&&t==='pre');
      if(c)c.style.display=pre?'block':'none'; if(pb)pb.classList.toggle('on',pre); if(pre&&c&&!_rendered){_rendered=true;renderInto(c);}
    };
  }
  function waitInject(){ if(document.getElementById('otab-ldg-robledo')){injectTab();return;}
    var ob=new MutationObserver(function(){if(document.getElementById('otab-ldg-robledo')){ob.disconnect();injectTab();}});
    ob.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitInject); else waitInject();
})();
