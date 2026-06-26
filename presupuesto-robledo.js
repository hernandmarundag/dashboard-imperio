/**
 * presupuesto-robledo.js
 * Tab "💰 Presupuesto" para Robledo en dashboard-imperio
 *
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Sube este archivo al repo GitHub: hernandmarundag/dashboard-imperio
 * 2. Agrega al final de index.html, justo antes de </body>:
 *    <script src="presupuesto-robledo.js"></script>
 */

(function() {
  'use strict';

  // ── PRESUPUESTO DE ACABADOS ROBLEDO ──────────────────────────────────────
  const PRE_CAPS = [
    { nombre: 'Preliminares',       ppto: 2608500,  done: true  },
    { nombre: 'Mampostería',        ppto: 5000000,  done: true  },
    { nombre: 'Escaleras',          ppto: 1382400,  done: false },
    { nombre: 'Revoques y Estucos', ppto: 9918800,  done: false },
    { nombre: 'Pisos y Enchapes',   ppto: 25049500, done: false },
    { nombre: 'Drywall',            ppto: 15080300, done: false },
    { nombre: 'Ventanería',         ppto: 13530000, done: false },
    { nombre: 'Mano de Obra',       ppto: 57500000, done: false },
    { nombre: 'Eléctrico',          ppto: 15920000, done: false },
    { nombre: 'Hidráulico',         ppto: 10310000, done: false },
    { nombre: 'Carpintería',        ppto: 13435000, done: false },
    { nombre: 'Electrodomésticos',  ppto: 2230000,  done: false },
    { nombre: 'Pintura',            ppto: 8000000,  done: false },
    { nombre: 'Equipos y CCTV',     ppto: 6500000,  done: false },
    { nombre: 'Gas',                ppto: 3000000,  done: false },
    { nombre: 'Administración',     ppto: 5000000,  done: false },
    { nombre: 'Imprevistos',        ppto: 2880053,  done: false },
  ];
  const PPTO_TOTAL = PRE_CAPS.reduce((a, c) => a + c.ppto, 0); // $197,344,553
  const DISPONIBLE = 206000000; // $60M caja + $146M por cobrar Yulied

  // ── NORMALIZACIÓN DE TEXTO ───────────────────────────────────────────────
  function n(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  // ── MAPEO INTELIGENTE por descripción ────────────────────────────────────
  // Analiza etapa_gral + area + nombre + descripcion combinados
  // Retorna: { cap: 'Nombre del capítulo', inf: true/false } o null (excluir)
  function mapCapSmart(et, ar, nom, dsc) {
    const txt = n([et, ar, nom, dsc].join(' '));

    // 1. EXCLUSIÓN: gastos claramente estructurales
    if (/(acero figurado|hierro figurado|compra acero|compra hierro|concreto vaciado|concreto mixer|concreto vigas|malla el |pileros|excavac|volqueta|triturado|demolicion|bombeo.*losa|vaciado.*losa|largueros|formaleta|varilla)/.test(txt)) {
      return null;
    }

    // 2. EXACT MATCH con nombre del capítulo
    // (excluye "Gas" y "Mano de Obra" del exact-match para evitar substrings falsos)
    const CAPS_EXACT = [
      'Preliminares','Mampostería','Escaleras','Revoques y Estucos',
      'Pisos y Enchapes','Drywall','Ventanería','Eléctrico','Hidráulico',
      'Carpintería','Electrodomésticos','Pintura','Equipos y CCTV',
      'Administración','Imprevistos'
    ];
    for (const cn of CAPS_EXACT) {
      if (txt.includes(n(cn))) return { cap: cn, inf: false };
    }

    // 3. KEYWORDS específicos por capítulo
    if (/(tuberia.*gas|instalac.*gas|red.*gas|acometida.*gas)/.test(txt))   return { cap: 'Gas',                inf: true };
    if (/(diseño electr|planos.*electr)/.test(txt))                          return { cap: 'Eléctrico',          inf: true };
    if (/(hidro|planos.*hidro|sanitario|fontaner)/.test(txt))                return { cap: 'Hidráulico',         inf: true };
    if (/(revoque|panete|estuco)/.test(txt))                                 return { cap: 'Revoques y Estucos', inf: true };
    if (/(ceramica|enchape|mortero nivel)/.test(txt))                        return { cap: 'Pisos y Enchapes',   inf: true };
    if (/(drywall|cielo.*raso)/.test(txt))                                   return { cap: 'Drywall',            inf: true };
    if (/(ventana|vidrio|aluminio)/.test(txt))                               return { cap: 'Ventanería',         inf: true };
    if (/(carpinter|mueble.*cocina|closet)/.test(txt))                       return { cap: 'Carpintería',        inf: true };
    if (/\bpintura\b/.test(txt))                                             return { cap: 'Pintura',            inf: true };
    if (/(cctv|camara)/.test(txt))                                           return { cap: 'Equipos y CCTV',     inf: true };
    if (/(maposteria|mamposteria|escalas.*maposter)/.test(txt))              return { cap: 'Mampostería',        inf: true };
    if (/\bescalera/.test(txt))                                              return { cap: 'Escaleras',          inf: true };
    if (/(nevera|estufa|microondas)/.test(txt))                              return { cap: 'Electrodomésticos',  inf: true };
    if (/(diseño arquit|topograf|geotecn|estudio suelo|replanteo)/.test(txt)) return { cap: 'Preliminares',     inf: true };

    // 4. ADMINISTRACIÓN — solo si no es fase estructural
    const esEstructural = /(cimentac|pilotaje|losa|losas|preliminar.*mat)/.test(n(et));
    if (/(examen medico|diagnostico laboral|siso|botiquin|dotacion|botas)/.test(txt) && !esEstructural) {
      return { cap: 'Administración', inf: true };
    }
    if (/(seguridad social)/.test(txt) && !esEstructural) {
      return { cap: 'Administración', inf: true };
    }

    // 5. NÓMINA — distinguir admin, MO, o excluir si es estructural
    if (/(nomina|jornal)/.test(txt)) {
      if (/(acero|concreto|hierro|ciment|pilot|pilero|losa)/.test(txt)) return null;
      if (/(adm|hernan maruland|jhon alexander|vanessa|siso|gerente|maria fernanda|luis albeiro)/.test(txt)) {
        return esEstructural ? null : { cap: 'Administración', inf: true };
      }
      return esEstructural ? null : { cap: 'Mano de Obra', inf: true };
    }

    // 6. Catch-all estructural
    if (/(cimentac|losa|losas)/.test(n(et)) && /(material general|herramienta|cemento|arena|seguros|transporte|varios)/.test(txt)) {
      return null;
    }

    return { cap: 'Sin clasificar', inf: false };
  }

  // ── UTILIDADES DE FORMATO ─────────────────────────────────────────────────
  function fmtP(v) { return '$' + Math.round(v || 0).toLocaleString('es-CO'); }
  function pctBar(p, c) {
    return `<div style="background:#0d1117;border-radius:3px;height:5px;margin-top:3px">` +
           `<div style="width:${Math.min(p, 100)}%;height:5px;background:${c};border-radius:3px"></div></div>`;
  }

  // ── RENDER PRINCIPAL ──────────────────────────────────────────────────────
  async function renderPresupuesto() {
    const tbody    = document.getElementById('pre-tbody');
    const kpisEl   = document.getElementById('pre-kpis');
    const alertsEl = document.getElementById('pre-alerts');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#8892b0">⏳ Analizando gastos...</td></tr>';

    // Fetch gastos Robledo desde Supabase (usa SB_URL y SB_KEY ya definidos en la app)
    let gastos = [];
    try {
      const resp = await fetch(
        SB_URL + '/rest/v1/gastos?obra=eq.robledo&select=etapa_gral,area,monto,descripcion,nombre&limit=2000',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
      );
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      gastos = await resp.json();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:#e74c3c">Error: ${err.message}</td></tr>`;
      return;
    }

    // Clasificar gastos
    const pagado = {}, inferidos = {}, sinClasif = [];
    gastos.forEach(r => {
      const res = mapCapSmart(r.etapa_gral || '', r.area || '', r.nombre || '', r.descripcion || '');
      if (res === null) return;
      if (res.cap === 'Sin clasificar') { sinClasif.push(r); return; }
      pagado[res.cap]    = (pagado[res.cap]    || 0) + (parseFloat(r.monto) || 0);
      if (res.inf) inferidos[res.cap] = (inferidos[res.cap] || 0) + (parseFloat(r.monto) || 0);
    });

    const totalPag   = Object.values(pagado).reduce((a, v) => a + v, 0);
    const totalInf   = Object.values(inferidos).reduce((a, v) => a + v, 0);
    const totalSaldo = PPTO_TOTAL - totalPag;
    const margen     = DISPONIBLE - totalPag;
    const totalSinC  = sinClasif.reduce((a, r) => a + (r.monto || 0), 0);
    const margenColor = margen < 10000000 ? '#e74c3c' : margen < 30000000 ? '#f39c12' : '#2ecc71';

    // KPIs
    kpisEl.innerHTML = `
      <div style="background:#1a1e2e;border-radius:8px;padding:12px;border-left:3px solid #4f8ef7">
        <div style="font-size:9px;color:#8892b0;text-transform:uppercase;margin-bottom:4px">Presupuesto acabados</div>
        <div style="font-size:17px;font-weight:700">${fmtP(PPTO_TOTAL)}</div>
      </div>
      <div style="background:#1a1e2e;border-radius:8px;padding:12px;border-left:3px solid #f39c12">
        <div style="font-size:9px;color:#8892b0;text-transform:uppercase;margin-bottom:4px">Pagado en acabados</div>
        <div style="font-size:17px;font-weight:700;color:${totalPag > 0 ? '#f39c12' : '#8892b0'}">${fmtP(totalPag)}</div>
        <div style="font-size:9px;color:#4f8ef7">🔍 ${fmtP(totalInf)} inferidos por desc.</div>
      </div>
      <div style="background:#1a1e2e;border-radius:8px;padding:12px;border-left:3px solid #2ecc71">
        <div style="font-size:9px;color:#8892b0;text-transform:uppercase;margin-bottom:4px">Saldo por ejecutar</div>
        <div style="font-size:17px;font-weight:700;color:#2ecc71">${fmtP(totalSaldo)}</div>
      </div>
      <div style="background:#1a1e2e;border-radius:8px;padding:12px;border-left:3px solid ${margenColor}">
        <div style="font-size:9px;color:#8892b0;text-transform:uppercase;margin-bottom:4px">Caja para acabados</div>
        <div style="font-size:17px;font-weight:700;color:${margenColor}">${fmtP(margen)}</div>
        <div style="font-size:9px;color:#8892b0">$206M − pagado</div>
      </div>`;

    // Alertas
    const alerts = [];
    PRE_CAPS.forEach(c => {
      const pag = pagado[c.nombre] || 0, sal = c.ppto - pag, pct = pag / c.ppto;
      if (sal < 0)         alerts.push({ txt: `🔴 SOBRECOSTO: <b>${c.nombre}</b> — excedido en ${fmtP(-sal)}`, cl: '#e74c3c' });
      else if (pct > 0.85 && pag > 0) alerts.push({ txt: `⚠️ <b>${c.nombre}</b> — ${Math.round(pct * 100)}% ejecutado, solo ${fmtP(sal)} restante`, cl: '#f39c12' });
    });
    if (totalInf > 0)  alerts.push({ txt: `🔍 <b>${fmtP(totalInf)}</b> reclasificados por descripción (etapa original incorrecta)`, cl: '#4f8ef7' });
    if (totalSinC > 0) alerts.push({ txt: `⚠️ <b>${fmtP(totalSinC)}</b> sin clasificar (${sinClasif.length} gastos) — revisar en Libro`, cl: '#f39c12' });
    if (margen < 10000000) alerts.push({ txt: `🔴 MARGEN CRÍTICO — Solo ${fmtP(margen)} disponible. Cobrar $160M Yulied urgente.`, cl: '#e74c3c' });
    alertsEl.innerHTML = alerts.length
      ? alerts.map(a => `<div style="background:#1a1e2e;border-left:3px solid ${a.cl};padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:11px;color:${a.cl}">${a.txt}</div>`).join('')
      : '<div style="background:#1a1e2e;border-left:3px solid #2ecc71;padding:8px 12px;border-radius:6px;font-size:11px;color:#2ecc71">✅ Presupuesto de acabados en orden</div>';

    // Tabla
    tbody.innerHTML = '';
    PRE_CAPS.forEach(c => {
      const pag = pagado[c.nombre] || 0, inf = inferidos[c.nombre] || 0;
      const sal = c.ppto - pag, pct = c.ppto > 0 ? Math.min(100, Math.round(pag / c.ppto * 100)) : 0;
      const salC  = sal < 0 ? '#e74c3c' : pag > 0 ? '#f39c12' : '#555';
      const barC  = sal < 0 ? '#e74c3c' : pct > 85 ? '#f39c12' : '#2ecc71';
      const alerta = sal < 0 ? '🔴 EXCEDIDO' : pct > 85 ? '⚠️ ALERTA' : c.done ? '✓ Listo' : pag > 0 ? '🟡 INICIADO' : '🔘 Pendiente';
      const infTag = inf > 0 ? `<br><span style="color:#4f8ef7;font-size:9px">🔍 ${fmtP(inf)} inferido</span>` : '';
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,.04)';
      if (c.done) tr.style.opacity = '0.45';
      tr.innerHTML = `
        <td style="padding:8px 10px;font-size:11px">${c.nombre}${infTag}</td>
        <td style="padding:8px 10px;text-align:right;font-family:monospace;font-size:11px">${fmtP(c.ppto)}</td>
        <td style="padding:8px 10px;text-align:right;font-family:monospace;font-size:11px;color:${pag > 0 ? '#f39c12' : '#444'}">${pag > 0 ? fmtP(pag) : '—'}</td>
        <td style="padding:8px 10px;text-align:right;font-family:monospace;font-size:11px;color:${salC}">${fmtP(sal)}</td>
        <td style="padding:8px 10px;min-width:70px">${pct > 0 ? `<span style="font-size:10px;color:${barC}">${pct}%</span>${pctBar(pct, barC)}` : '—'}</td>
        <td style="padding:8px 10px;font-size:10px;white-space:nowrap">${alerta}</td>`;
      tbody.appendChild(tr);
    });
    // Fila total
    const trT = document.createElement('tr');
    trT.style.cssText = 'background:#1a2540;font-weight:700;border-top:2px solid rgba(79,142,247,.4)';
    const pctTot = Math.round(totalPag / PPTO_TOTAL * 100);
    trT.innerHTML = `
      <td style="padding:9px 10px;font-size:11px">TOTAL ACABADOS</td>
      <td style="padding:9px 10px;text-align:right;font-family:monospace">${fmtP(PPTO_TOTAL)}</td>
      <td style="padding:9px 10px;text-align:right;font-family:monospace;color:#f39c12">${fmtP(totalPag)}</td>
      <td style="padding:9px 10px;text-align:right;font-family:monospace;color:#2ecc71">${fmtP(totalSaldo)}</td>
      <td style="padding:9px 10px;font-size:10px;color:#4f8ef7">${pctTot}%${pctBar(pctTot, '#4f8ef7')}</td>
      <td></td>`;
    tbody.appendChild(trT);
  }

  // ── INYECCIÓN DE DOM ──────────────────────────────────────────────────────
  function injectPresupuestoTab() {
    // Evitar doble inyección
    if (document.getElementById('otab-pre-robledo')) return;

    // Buscar contenedor de tabs de Robledo
    const lastBtn = document.getElementById('otab-ldg-robledo');
    if (!lastBtn) return; // Robledo no ha cargado aún

    // Botón de pestaña
    const btn = document.createElement('button');
    btn.id        = 'otab-pre-robledo';
    btn.className = 'obra-tab';
    btn.setAttribute('onclick', "obraTab('robledo','pre')");
    btn.innerHTML = '💰 Presupuesto';
    lastBtn.parentElement.appendChild(btn);

    // Contenido de la pestaña
    const vRobledo = document.getElementById('v-robledo');
    if (!vRobledo) return;
    const div = document.createElement('div');
    div.id             = 'otc-pre-robledo';
    div.style.cssText  = 'display:none;padding:12px 0';
    div.innerHTML = `
      <div id="pre-alerts" style="margin-bottom:12px"></div>
      <div id="pre-kpis" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px"></div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#0d1117">
          <th style="padding:8px 10px;text-align:left;font-size:10px;color:#8892b0;font-weight:600;text-transform:uppercase">Capítulo</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#8892b0;font-weight:600;text-transform:uppercase">Presupuesto</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#8892b0;font-weight:600;text-transform:uppercase">Pagado</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#8892b0;font-weight:600;text-transform:uppercase">Saldo</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#8892b0;font-weight:600;text-transform:uppercase">Ejec%</th>
          <th style="padding:8px 10px;text-align:center;font-size:10px;color:#8892b0;font-weight:600;text-transform:uppercase">Alerta</th>
        </tr></thead>
        <tbody id="pre-tbody"></tbody>
      </table>
      <div style="margin-top:8px;font-size:9px;color:#555;text-align:right">🔍 = clasificado por descripción · Se actualiza al abrir pestaña</div>`;
    vRobledo.appendChild(div);

    // Hook en obraTab para mostrar/renderizar al hacer clic
    const _orig = window.obraTab;
    window.obraTab = function(obra, tab) {
      if (_orig) _orig(obra, tab);
      if (obra === 'robledo' && tab === 'pre') {
        document.getElementById('otc-pre-robledo').style.display = 'block';
        renderPresupuesto();
      }
    };
  }

  // ── INICIALIZACIÓN ────────────────────────────────────────────────────────
  // Esperar a que el DOM de Robledo esté listo (puede cargarse dinámicamente)
  function waitAndInject() {
    if (document.getElementById('otab-ldg-robledo')) {
      injectPresupuestoTab();
    } else {
      // Observar cambios en el DOM
      const observer = new MutationObserver(() => {
        if (document.getElementById('otab-ldg-robledo')) {
          observer.disconnect();
          injectPresupuestoTab();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInject);
  } else {
    waitAndInject();
  }

})();
