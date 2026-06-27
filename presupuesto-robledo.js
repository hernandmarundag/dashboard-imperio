/**
 * presupuesto-robledo.js  —  v2.0
 * Integración COMPLETA de Robledo Dashboard en dashboard-imperio
 * Tabs: Resumen · Estado Obra · Presupuesto · Carpintería · MO+Eléctrico · Cronograma · Pagos
 * Datos reales desde Supabase (gastos?obra=eq.robledo)
 */
(function () {
  'use strict';

  const OBRA = 'robledo';
  const TAB  = 'presupuesto';
  const SB_URL_FB = 'https://dghmgaaprlzpfnpsqzav.supabase.co';
  const DISPONIBLE = 226000000;

  // ── CAPÍTULOS CON PRESUPUESTO CORRECTO ──────────────────────────────────
  const CAPS = {
    'Preliminares':       { ppto:  2608500, done: true  },
    'Mampostería':        { ppto:  5000000, done: true  },
    'Escaleras':          { ppto:  1382400, done: false },
    'Revoques y Estucos': { ppto:  9918800, done: false },
    'Pisos y Enchapes':   { ppto: 25737000, done: false },
    'Drywall':            { ppto: 15080300, done: false },
    'Ventanería':         { ppto: 13530000, done: false },
    'Mano de Obra':       { ppto: 57500000, done: false },
    'Eléctrico':          { ppto: 15920000, done: false },
    'Hidráulico':         { ppto: 10310000, done: false },
    'Carpintería':        { ppto: 17935000, done: false },
    'Electrodomésticos':  { ppto:  2230000, done: false },
    'Pintura':            { ppto:  5980000, done: false },
    'Equipos y CCTV':     { ppto:  3745000, done: false },
    'Gas':                { ppto:  2335000, done: false },
    'Administración':     { ppto:  8900000, done: false },
    'Imprevistos':        { ppto:  2848053, done: false },
  };

  const fmt = v => '$' + Math.round(v || 0).toLocaleString('es-CO');
  const nc  = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // ── CLASIFICACIÓN INTELIGENTE ────────────────────────────────────────────
  function mapCapSmart(et, ar, nom, dsc) {
    const txt = nc([et, ar, nom, dsc].join(' '));
    if (/(acero figurado|hierro figurado|compra acero|compra hierro|concreto vaciado|concreto mixer|concreto vigas|malla el |pileros|excavac|volqueta|triturado|demolicion|bombeo.*losa|vaciado.*losa|largueros|formaleta|varilla)/.test(txt)) return null;
    const EXACT = ['Preliminares','Mampostería','Escaleras','Revoques y Estucos','Pisos y Enchapes','Drywall','Ventanería','Eléctrico','Hidráulico','Carpintería','Electrodomésticos','Pintura','Equipos y CCTV','Administración','Imprevistos'];
    for (const cn of EXACT) { if (txt.includes(nc(cn))) return { cap: cn }; }
    if (/(tuberia.*gas|instalac.*gas|red.*gas|acometida.*gas)/.test(txt)) return { cap: 'Gas' };
    if (/(piso|ceramica|ceramico|enchape|mortero|contrapiso|guardaescoba|nivelacion piso)/.test(txt)) return { cap: 'Pisos y Enchapes' };
    if (/(drywall|dry wall|cielo raso|cielorraso|placa|perfil cal)/.test(txt)) return { cap: 'Drywall' };
    if (/(ventana|ventaneria|fachada|vidrio templado|aluminio vidrio)/.test(txt)) return { cap: 'Ventanería' };
    if (/(electrico|electricidad|tablero|conduit|cable nlt|tomacorriente|luminaria|punto electric|cat6|red datos|keystone|patch panel)/.test(txt)) return { cap: 'Eléctrico' };
    if (/(hidraulico|sanitario|tuberia|fontaneria|agua|lavamanos|inodoro|ducha|sifon)/.test(txt)) return { cap: 'Hidráulico' };
    if (/(carpinteria|puerta hdf|mueble cocina|locker|closet|meson granito|lavaplatos)/.test(txt)) return { cap: 'Carpintería' };
    if (/(electrodomestico|nevera|estufa|microondas|extractor|cafetera|hervidor)/.test(txt)) return { cap: 'Electrodomésticos' };
    if (/(pintura|sellador)/.test(txt)) return { cap: 'Pintura' };
    if (/(equipo|cctv|camara|seguridad|extintor|alarma)/.test(txt)) return { cap: 'Equipos y CCTV' };
    if (/(revoque|panete|panete|estuco|mortero revoque)/.test(txt)) return { cap: 'Revoques y Estucos' };
    if (/(imprevisto|varios)/.test(txt)) return { cap: 'Imprevistos' };
    const esEst = /(cimentac|pilotaje|losa|losas|preliminar.*mat)/.test(nc(et));
    if (/(nomina|jornal)/.test(txt)) {
      if (/(acero|concreto|hierro|ciment|pilot|pilero|losa)/.test(txt)) return null;
      if (/(adm|hernan maruland|jhon alexander|vanessa|siso|gerente|maria fernanda|luis albeiro)/.test(txt)) return esEst ? null : { cap: 'Administración' };
      return esEst ? null : { cap: 'Mano de Obra' };
    }
    return { cap: 'Sin clasificar' };
  }

  // ── ESTILOS ──────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('rob-styles-v2')) return;
    const st = document.createElement('style');
    st.id = 'rob-styles-v2';
    st.textContent = `
.robw{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#e8eaf6}
.robw *{box-sizing:border-box}
.rob-tabs2{display:flex;background:#131825;border-bottom:2px solid #2a3050;padding:0 4px;overflow-x:auto;margin-bottom:14px;border-radius:8px 8px 0 0;gap:2px}
.rob-tab2{padding:9px 14px;cursor:pointer;color:#8892b0;border-bottom:3px solid transparent;font-size:10px;font-weight:600;white-space:nowrap;transition:.2s;user-select:none;background:transparent;border-top:none;border-left:none;border-right:none}
.rob-tab2.on,.rob-tab2:hover{color:#4f8ef7;border-bottom-color:#4f8ef7}
.rob-pane2{display:none;animation:robf .2s}
.rob-pane2.on{display:block}
@keyframes robf{from{opacity:0;transform:translateY(4px)}to{opacity:1}}
.rob-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px;margin-bottom:14px}
.rob-kpi{background:#1a1e2e;border-radius:9px;padding:12px 14px;border-left:4px solid #4f8ef7}
.rob-kpi.g{border-color:#2ecc71}.rob-kpi.y{border-color:#f39c12}.rob-kpi.r{border-color:#e74c3c}
.rob-kpi label{font-size:9px;color:#8892b0;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px}
.rob-kpi .v{font-size:18px;font-weight:700}
.rob-kpi .nt{font-size:9px;color:#8892b0}
.rob-c2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:700px){.rob-c2{grid-template-columns:1fr}}
.rob-card{background:#1a1e2e;border-radius:9px;overflow-x:auto;margin-bottom:12px}
.rob-card table{width:100%;border-collapse:collapse}
.rob-card thead th{background:#0d1829;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#8892b0;white-space:nowrap}
.rob-card tbody tr:nth-child(even){background:rgba(255,255,255,.025)}
.rob-card tbody tr:hover{background:rgba(79,142,247,.07)}
.rob-card td{padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px;color:#e8eaf6}
.rob-card td.r{text-align:right;font-family:monospace}
.rob-card td.c{text-align:center}
.rob-sr td{background:#111827!important;font-weight:700;color:#4f8ef7!important;font-size:9px;text-transform:uppercase;letter-spacing:.3px}
.rob-sub td{background:#1a2540!important;font-weight:700;color:#7eb3f7!important}
.rob-done td{color:#4a8c5c!important;font-style:italic}
.rob-al{padding:7px 11px;border-radius:7px;margin-bottom:7px;font-size:11px;border-left:4px solid}
.rob-ao{background:#0d2a1a;border-color:#2ecc71;color:#7dffb3}
.rob-aw{background:#2a1a00;border-color:#f39c12;color:#ffc06a}
.rob-ar{background:#2a0d0d;border-color:#e74c3c;color:#ff9595}
.rob-h{font-size:10px;font-weight:700;margin:12px 0 7px;color:#4f8ef7;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #2a3050;padding-bottom:4px}
.rob-h:first-child{margin-top:0}
.rob-pi{display:flex;justify-content:space-between;margin-bottom:2px;font-size:10px}
.rob-pb{height:6px;background:#1e2a3a;border-radius:4px;overflow:hidden;margin-bottom:8px}
.rob-pf{height:100%;border-radius:4px}
.rob-fg{background:#2ecc71}.rob-fb{background:#4f8ef7}.rob-fy{background:#f39c12}.rob-fr{background:#e74c3c}
.rob-tag{padding:2px 7px;border-radius:10px;font-size:9px;font-weight:600;display:inline-block}
.rob-tg{background:#1a3a2a;color:#2ecc71}.rob-ty{background:#3a2a0a;color:#f39c12}.rob-tb{background:#1a3040;color:#4f8ef7}
    `;
    document.head.appendChild(st);
  }

  // ── CONSTRUIR HTML COMPLETO ──────────────────────────────────────────────
  function buildHTML(gastos) {
    const pagado = {};
    let totalGastado = 0;
    (gastos || []).forEach(g => {
      const r = mapCapSmart(g.etapa_gral || '', g.area || '', g.nombre || '', g.descripcion || '');
      if (!r) return;
      pagado[r.cap] = (pagado[r.cap] || 0) + (g.monto || 0);
      totalGastado += (g.monto || 0);
    });

    const totalPpto = Object.values(CAPS).reduce((a, c) => a + c.ppto, 0);
    const saldo = totalPpto - totalGastado;
    const margen = DISPONIBLE - saldo;

    // Helpers
    const gasRow = cap => pagado[cap] || 0;
    const salRow = (ppto, cap) => ppto - gasRow(cap);
    const fmtGas = cap => gasRow(cap) > 0 ? `<span style="color:#2ecc71">${fmt(gasRow(cap))}</span>` : '<span style="color:#555">—</span>';
    const fmtSal = (ppto, cap) => {
      const s = salRow(ppto, cap);
      return `<span style="color:${s < 0 ? '#e74c3c' : s < ppto * 0.1 ? '#f39c12' : '#e8eaf6'}">${fmt(s)}</span>`;
    };

    // Resumen capítulos table rows
    const resFilas = Object.entries(CAPS).map(([nm, c]) => {
      const gas = gasRow(nm), sal = c.ppto - gas;
      const pct = c.ppto > 0 ? Math.min(100, Math.round(gas / c.ppto * 100)) : 0;
      return `<tr${c.done ? ' class="rob-done"' : ''}>
        <td>${nm}${c.done ? ' ✓' : ''}</td>
        <td class="r">${fmt(c.ppto)}</td>
        <td class="r" style="color:${gas > 0 ? '#2ecc71' : '#555'}">${gas > 0 ? fmt(gas) : '—'}</td>
        <td class="r" style="color:${sal < 0 ? '#e74c3c' : gas > 0 ? '#f39c12' : ''}">${fmt(sal)}</td>
        <td class="r">${pct > 0 ? `<span style="color:${pct >= 100 ? '#2ecc71' : pct > 50 ? '#f39c12' : '#8892b0'}">${pct}%</span>` : '—'}</td>
      </tr>`;
    }).join('');

    // Pagos Supabase rows
    const sbFilas = (gastos && gastos.length) ? gastos.map(g => {
      const r = mapCapSmart(g.etapa_gral || '', g.area || '', g.nombre || '', g.descripcion || '');
      const cap = r ? r.cap : 'Sin clasificar';
      return `<tr>
        <td style="font-size:10px;color:#8892b0">${g.fecha || ''}</td>
        <td style="color:#4f8ef7;font-size:10px">${cap}</td>
        <td>${g.nombre || ''} ${g.descripcion ? `<span style="color:#8892b0;font-size:9px">· ${g.descripcion}</span>` : ''}</td>
        <td style="color:#8892b0;font-size:10px">${g.area || ''}</td>
        <td class="r" style="color:#f39c12">${fmt(g.monto)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" style="text-align:center;color:#8892b0;padding:18px">Sin movimientos en Supabase para Robledo</td></tr>';

    // Pagos por capítulo rows
    const pagCapFilas = Object.entries(CAPS).map(([nm, c]) => {
      const gas = gasRow(nm), sal = c.ppto - gas;
      const pct = c.ppto > 0 ? Math.min(100, Math.round(gas / c.ppto * 100)) : 0;
      return `<tr${c.done ? ' class="rob-done"' : ''}>
        <td>${nm}${c.done ? ' <span style="color:#2ecc71">✓</span>' : ''}</td>
        <td class="r">${fmt(c.ppto)}</td>
        <td class="r" style="color:${gas > 0 ? '#2ecc71' : '#555'}">${gas > 0 ? fmt(gas) : '—'}</td>
        <td class="r" style="color:${sal < 0 ? '#e74c3c' : gas > 0 ? '#f39c12' : ''}">${fmt(sal)}</td>
        <td class="r">${pct > 0 ? `<span style="color:${pct >= 100 ? '#2ecc71' : pct > 50 ? '#f39c12' : '#8892b0'}">${pct}%</span>` : '—'}</td>
      </tr>`;
    }).join('');

    const margenColor = margen < 5e6 ? '#e74c3c' : margen < 20e6 ? '#f39c12' : '#2ecc71';

    return `<div class="robw">
<!-- ═══ SUB-TABS ═══════════════════════════════════════════════════════ -->
<div class="rob-tabs2">
  <div class="rob-tab2 on" data-rt="rres">📊 RESUMEN</div>
  <div class="rob-tab2" data-rt="rest">🔧 ESTADO OBRA</div>
  <div class="rob-tab2" data-rt="rpre">💰 PRESUPUESTO</div>
  <div class="rob-tab2" data-rt="rcar">🪵 CARPINTERÍA</div>
  <div class="rob-tab2" data-rt="rmo">👷 MO + ELÉCTRICO</div>
  <div class="rob-tab2" data-rt="rcro">📅 CRONOGRAMA</div>
  <div class="rob-tab2" data-rt="rpag">💳 PAGOS</div>
</div>

<!-- ═══ RESUMEN ════════════════════════════════════════════════════════ -->
<div id="rt-rres" class="rob-pane2 on">
  <div class="rob-kpis">
    <div class="rob-kpi g"><label>Disponible total</label><div class="v">${fmt(DISPONIBLE)}</div><div class="nt">Cash + cobro cliente</div></div>
    <div class="rob-kpi"><label>Presupuesto obra</label><div class="v">${fmt(totalPpto)}</div><div class="nt">Todos los capítulos</div></div>
    <div class="rob-kpi y"><label>Ejecutado Supabase</label><div class="v" style="color:#f39c12">${fmt(totalGastado)}</div><div class="nt">${(gastos||[]).length} movimientos</div></div>
    <div class="rob-kpi"><label>Saldo por pagar</label><div class="v">${fmt(saldo)}</div><div class="nt">Ppto − gastado</div></div>
    <div class="rob-kpi ${margen < 5e6 ? 'r' : margen < 20e6 ? 'y' : 'g'}"><label>Margen de caja</label><div class="v" style="color:${margenColor}">${fmt(margen)}</div><div class="nt">${margen < 5e6 ? '⚠ MUY AJUSTADO' : margen < 20e6 ? 'AJUSTADO' : '✓ OK'}</div></div>
    <div class="rob-kpi y"><label>Avance físico</label><div class="v" style="color:#f39c12">55%</div><div class="nt">Mampost.85% · Pisos✓</div></div>
    <div class="rob-kpi"><label>Tiempo restante</label><div class="v">10 sem</div><div class="nt">Hasta fin Ago 2026</div></div>
    <div class="rob-kpi"><label>Puntos eléctricos</label><div class="v">104</div><div class="nt">+ 9 puntos CAT6</div></div>
  </div>
  <div class="rob-c2">
    <div>
      <div class="rob-h">Estado financiero</div>
      <div class="rob-card"><table>
        <thead><tr><th>Concepto</th><th>Valor</th><th>Estado</th></tr></thead>
        <tbody>
          <tr><td>Cash disponible</td><td class="r">$60,000,000</td><td><span class="rob-tag rob-tb">Disponible</span></td></tr>
          <tr><td>Por cobrar al cliente</td><td class="r">$166,000,000</td><td><span class="rob-tag rob-ty">Cobrar urgente</span></td></tr>
          <tr class="rob-sub"><td><b>TOTAL DISPONIBLE</b></td><td class="r"><b>${fmt(DISPONIBLE)}</b></td><td></td></tr>
          <tr><td>Presupuesto total obra</td><td class="r">${fmt(totalPpto)}</td><td><span class="rob-tag rob-tb">Total</span></td></tr>
          <tr style="color:#2ecc71"><td>✓ Gastado (Supabase)</td><td class="r">-${fmt(totalGastado)}</td><td><span class="rob-tag rob-tg">Confirmado</span></td></tr>
          <tr class="rob-sub" style="color:#f39c12!important"><td><b>▶ SALDO POR PAGAR</b></td><td class="r" style="color:#f39c12"><b>${fmt(saldo)}</b></td><td><span class="rob-tag rob-ty">Pendiente</span></td></tr>
          <tr class="rob-sub"><td><b>✓ MARGEN DISPONIBLE</b></td><td class="r" style="color:${margenColor}"><b>${fmt(margen)}</b></td><td></td></tr>
        </tbody>
      </table></div>
      <div class="rob-h">Alertas de obra</div>
      <div class="rob-ao rob-al">✓ Pisos 250m² TERMINADOS · $22.2M pagado ✓</div>
      <div class="rob-ao rob-al">✓ Ladrillo adobe 147m² — COMPRADO Y PAGADO $5M ✓</div>
      <div class="rob-ar rob-al">🔴 URGENTE: Escaleras — armado+vaciado NO gestionado</div>
      <div class="rob-ar rob-al">🔴 Red hidráulica en muros — sin iniciar</div>
      <div class="rob-ar rob-al">🔴 Conduit eléctrico — 70% mat. comprado, sin instalar</div>
      <div class="rob-aw rob-al">⚠ Terminar mampostería 15% restante</div>
      <div class="rob-aw rob-al">⚠ Contratar electricista y carpintero externos</div>
    </div>
    <div>
      <div class="rob-h">Capítulos vs Ejecución</div>
      <div class="rob-card"><table>
        <thead><tr><th>Capítulo</th><th class="r">Presupuesto</th><th class="r">Gastado</th><th class="r">Saldo</th><th class="r">%</th></tr></thead>
        <tbody>
          ${resFilas}
          <tr class="rob-sub"><td><b>TOTAL</b></td><td class="r"><b>${fmt(totalPpto)}</b></td><td class="r" style="color:#2ecc71"><b>${fmt(totalGastado)}</b></td><td class="r" style="color:#f39c12"><b>${fmt(saldo)}</b></td><td class="r"><b>${Math.round(totalGastado / totalPpto * 100)}%</b></td></tr>
        </tbody>
      </table></div>
    </div>
  </div>
</div>

<!-- ═══ ESTADO OBRA ═════════════════════════════════════════════════════ -->
<div id="rt-rest" class="rob-pane2">
  <div class="rob-h">Avance por actividad</div>
  <div class="rob-card" style="padding:14px">
    ${[
      ['Preliminares (campamento+cerramiento+señalización)', 100, 'g'],
      ['Cimentación', 100, 'g'],
      ['Losa entrepiso + cubierta', 100, 'g'],
      ['Impermeabilización losa (plástico)', 100, 'g'],
      ['Ladrillo adobe 147m² — COMPRADO Y PAGADO ✓', 100, 'g'],
      ['Pegue mampostería 147m²', 85, 'y'],
      ['Contrapiso (terminado)', 100, 'g'],
      ['Pisos cerámicos 250m² — TERMINADOS ✓', 100, 'g'],
      ['Tubería hidro-sanitaria embebida', 85, 'y'],
      ['Drywall: Estructura cielos (90%)', 90, 'y'],
      ['Drywall: Placas cielos (210m²)', 0, 'b'],
      ['Drywall: Paredes (85m²)', 0, 'b'],
      ['🔴 Escaleras — armado+vaciado — NO INICIADO', 0, 'r'],
      ['🔴 Red hidráulica distribución muros', 0, 'r'],
      ['🔴 Conduit eléctrico — sin instalar (70% mat. comprado)', 0, 'r'],
      ['Revoques y estucos', 0, 'b'],
      ['Enchapes baños 75m²', 0, 'b'],
      ['Ventanería fachada frente', 0, 'b'],
      ['Carpintería, muebles, electrodomésticos', 0, 'b'],
      ['Pintura', 0, 'b'],
    ].map(([lbl, pct, cls]) => `<div>
      <div class="rob-pi"><span style="color:${cls === 'r' ? '#e74c3c' : '#e8eaf6'}">${lbl}</span><span style="color:${cls === 'g' ? '#2ecc71' : cls === 'y' ? '#f39c12' : cls === 'r' ? '#e74c3c' : '#8892b0'}">${pct}%${pct === 100 ? ' ✓' : ''}</span></div>
      <div class="rob-pb"><div class="rob-pf rob-f${cls}" style="width:${pct}%"></div></div>
    </div>`).join('')}
  </div>
  <div class="rob-c2">
    <div>
      <div class="rob-h">Alertas urgentes</div>
      <div class="rob-ar rob-al">🔴 URGENTE: Escaleras — armado+vaciado NO gestionado</div>
      <div class="rob-ar rob-al">🔴 Regar red hidráulica en muros — sin iniciar</div>
      <div class="rob-ar rob-al">🔴 Conduit — 70% mat. comprado, sin instalar</div>
      <div class="rob-aw rob-al">⚠ Terminar mampostería 15% → desbloquea revoques</div>
      <div class="rob-aw rob-al">⚠ Estructura cielorrasos 90% → completar</div>
      <div class="rob-aw rob-al">⚠ Contratar electricista — comprar cable 30% restante</div>
      <div class="rob-aw rob-al">⚠ Contratar carpintero — cotizar puertas+muebles</div>
      <div class="rob-ao rob-al">✓ Pisos 250m² TERMINADOS — $22.2M pagado ✓</div>
    </div>
    <div>
      <div class="rob-h">Flujo mensual estimado</div>
      <div class="rob-card"><table>
        <thead><tr><th>Mes</th><th class="r">Inversión</th><th class="r">Acum.</th></tr></thead>
        <tbody>
          <tr><td>Junio (2ª mitad)</td><td class="r">$28,950,000</td><td class="r">$28,950,000</td></tr>
          <tr><td>Julio</td><td class="r">$118,000,000</td><td class="r">$146,950,000</td></tr>
          <tr><td>Agosto</td><td class="r">$65,018,934</td><td class="r">$211,968,934</td></tr>
          <tr class="rob-sub"><td><b>TOTAL</b></td><td class="r"><b>$193,968,934</b></td><td></td></tr>
        </tbody>
      </table></div>
    </div>
  </div>
</div>

<!-- ═══ PRESUPUESTO DETALLADO ══════════════════════════════════════════ -->
<div id="rt-rpre" class="rob-pane2">
  <div class="rob-kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="rob-kpi y"><label>Total presupuestado</label><div class="v">${fmt(totalPpto)}</div></div>
    <div class="rob-kpi"><label>Disponible</label><div class="v">${fmt(DISPONIBLE)}</div></div>
    <div class="rob-kpi g"><label>Margen</label><div class="v" style="color:${margenColor}">${fmt(margen)}</div></div>
  </div>
  <div class="rob-card"><table>
    <thead><tr><th>Ítem</th><th>Descripción</th><th>Und</th><th class="r">Cant.</th><th class="r">P.Unit.</th><th class="r">Desp.</th><th class="r">Presupuesto</th><th class="r">Gastado</th><th class="r">Saldo</th><th>Nota</th></tr></thead>
    <tbody>
      <tr class="rob-sr"><td colspan="10">1. PRELIMINARES</td></tr>
      <tr><td>1.1</td><td>Campamento y bodega</td><td class="c">glb</td><td class="r">1</td><td class="r">$800,000</td><td class="r">1.00</td><td class="r">$800,000</td><td class="r">—</td><td class="r">—</td><td>✓ Ejecutado</td></tr>
      <tr><td>1.2</td><td>Cerramiento provisional</td><td class="c">glb</td><td class="r">1</td><td class="r">$300,000</td><td class="r">1.00</td><td class="r">$300,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>1.3–4</td><td>Señalización + aseo final 247m²</td><td class="c">glb</td><td class="r">1</td><td class="r">$1,508,500</td><td class="r">1.00</td><td class="r">$1,508,500</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.1</b></td><td class="r"><b>$2,608,500</b></td><td class="r">${fmtGas('Preliminares')}</td><td class="r">${fmtSal(2608500,'Preliminares')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">3. MAMPOSTERÍA — 147m²</td></tr>
      <tr class="rob-done"><td>3.1</td><td>Ladrillo adobe 147m² + mortero pega</td><td class="c">glb</td><td class="r">1</td><td class="r">$5,000,000</td><td class="r">1.00</td><td class="r">$5,000,000</td><td class="r" style="color:#2ecc71">$5,000,000</td><td class="r" style="color:#2ecc71">$0</td><td>✓ PAGADO</td></tr>
      <tr><td>3.2</td><td>MO pegue mampostería 147m²</td><td class="c">m²</td><td class="r">147</td><td class="r">—</td><td class="r">—</td><td class="r">$0</td><td class="r">—</td><td class="r">—</td><td>MO en Cap.10</td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.3 — 85% ejecutado</b></td><td class="r"><b>$5,000,000</b></td><td class="r">${fmtGas('Mampostería')}</td><td class="r">${fmtSal(5000000,'Mampostería')}</td><td>MO en Cap.10</td></tr>

      <tr class="rob-sr"><td colspan="10">4b. ESCALERAS — vaciado (hierro ya instalado)</td></tr>
      <tr class="rob-done"><td>4b.0</td><td>Acero figurado escalera</td><td class="c">glb</td><td class="r">1</td><td class="r">—</td><td class="r">—</td><td class="r">$0</td><td class="r">—</td><td class="r">—</td><td>✓ YA INSTALADO</td></tr>
      <tr><td>4b.1</td><td>Formaleta madera escalera</td><td class="c">m²</td><td class="r">12</td><td class="r">$32,000</td><td class="r">1.10</td><td class="r">$422,400</td><td class="r">—</td><td class="r">—</td><td>MO en Cap.10</td></tr>
      <tr><td>4b.2</td><td>Concreto 21MPa vaciado escalera</td><td class="c">m³</td><td class="r">2</td><td class="r">$480,000</td><td class="r">1.00</td><td class="r">$960,000</td><td class="r">—</td><td class="r">—</td><td>MO en Cap.10</td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.4b</b></td><td class="r"><b>$1,382,400</b></td><td class="r">${fmtGas('Escaleras')}</td><td class="r">${fmtSal(1382400,'Escaleras')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">5. REVOQUES Y ESTUCOS</td></tr>
      <tr><td>5.1</td><td>Mortero revoque interior (mat)</td><td class="c">m²</td><td class="r">320</td><td class="r">$15,000</td><td class="r">1.10</td><td class="r">$5,280,000</td><td class="r">—</td><td class="r">—</td><td>MO en Cap10</td></tr>
      <tr><td>5.2</td><td>Mortero revoque exterior posterior (mat)</td><td class="c">m²</td><td class="r">35</td><td class="r">$18,000</td><td class="r">1.10</td><td class="r">$693,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>5.3</td><td>Estuco acrílico interior (mat)</td><td class="c">m²</td><td class="r">320</td><td class="r">$8,500</td><td class="r">1.05</td><td class="r">$2,856,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>5.4</td><td>Impermeabilizante muros baños (mat)</td><td class="c">m²</td><td class="r">23</td><td class="r">$12,000</td><td class="r">1.05</td><td class="r">$289,800</td><td class="r">—</td><td class="r">—</td><td>5 baños</td></tr>
      <tr><td>5.5</td><td>Filos y dilataciones (mat)</td><td class="c">ml</td><td class="r">320</td><td class="r">$2,500</td><td class="r">1.00</td><td class="r">$800,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.5</b></td><td class="r"><b>$9,918,800</b></td><td class="r">${fmtGas('Revoques y Estucos')}</td><td class="r">${fmtSal(9918800,'Revoques y Estucos')}</td><td></td></tr>

      <tr class="rob-done"><td colspan="10">6. IMPERMEABILIZACIÓN LOSA — ✓ YA EJECUTADA CON PLÁSTICO — $0 pendiente</td></tr>

      <tr class="rob-sr"><td colspan="10">7. CONTRAPISO Y PISOS — 250m² TODOS CERÁMICOS</td></tr>
      <tr><td>7.1</td><td>Contrapiso restante 10% (mat)</td><td class="c">m²</td><td class="r">25</td><td class="r">$27,500</td><td class="r">1.00</td><td class="r">$687,500</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>7.2</td><td>Mortero nivelación piso 3cm (mat)</td><td class="c">m²</td><td class="r">250</td><td class="r">$8,500</td><td class="r">1.05</td><td class="r">$2,231,250</td><td class="r">—</td><td class="r">—</td><td>MO en Cap10</td></tr>
      <tr><td>7.3</td><td>Piso cerámico 30×30 + pega epóxica + lechada</td><td class="c">m²</td><td class="r">250</td><td class="r">$70,000</td><td class="r">1.03</td><td class="r">$18,025,000</td><td class="r">—</td><td class="r">—</td><td>250m² incl. locales</td></tr>
      <tr><td>7.3b</td><td>Enchape pared baños 20×30 + pega</td><td class="c">m²</td><td class="r">75</td><td class="r">$45,000</td><td class="r">1.05</td><td class="r">$3,543,750</td><td class="r">—</td><td class="r">—</td><td>~15m² × 5 baños</td></tr>
      <tr><td>7.4</td><td>Guardaescoba cerámica (CI + locales)</td><td class="c">ml</td><td class="r">140</td><td class="r">$8,500</td><td class="r">1.05</td><td class="r">$1,249,500</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.7</b></td><td class="r"><b>$25,737,000</b></td><td class="r">${fmtGas('Pisos y Enchapes')}</td><td class="r">${fmtSal(25737000,'Pisos y Enchapes')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">8. DRYWALL — PAREDES (85m²) + CIELOS (210m²)</td></tr>
      <tr><td>8.1</td><td>Perfil Cal.20 pared (mat)</td><td class="c">m²</td><td class="r">85</td><td class="r">$22,000</td><td class="r">1.10</td><td class="r">$2,057,000</td><td class="r">—</td><td class="r">—</td><td>Paredes drywall</td></tr>
      <tr><td>8.2</td><td>Placa drywall 1/2" pared doble cara</td><td class="c">m²</td><td class="r">85</td><td class="r">$28,000</td><td class="r">1.05</td><td class="r">$2,499,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>8.3–4</td><td>Masilla+cinta+tornillería pared</td><td class="c">m²</td><td class="r">85</td><td class="r">$7,500</td><td class="r">1.00</td><td class="r">$637,500</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>8.5</td><td>Estructura metálica cielorrasos (mat)</td><td class="c">m²</td><td class="r">210</td><td class="r">$19,000</td><td class="r">1.05</td><td class="r">$4,189,500</td><td class="r">—</td><td class="r">—</td><td>CI + locales</td></tr>
      <tr><td>8.6</td><td>Placa drywall 1/2" cielo 1 cara</td><td class="c">m²</td><td class="r">210</td><td class="r">$21,000</td><td class="r">1.03</td><td class="r">$4,542,300</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>8.7</td><td>Masilla+cinta cielo (mat)</td><td class="c">m²</td><td class="r">210</td><td class="r">$5,500</td><td class="r">1.00</td><td class="r">$1,155,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.8</b></td><td class="r"><b>$15,080,300</b></td><td class="r">${fmtGas('Drywall')}</td><td class="r">${fmtSal(15080300,'Drywall')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">9. VENTANERÍA Y FACHADA</td></tr>
      <tr><td>9.1</td><td>Vidrio 6mm + perfil alum. fachada Loc.01+02</td><td class="c">m²</td><td class="r">14</td><td class="r">$550,000</td><td class="r">1.00</td><td class="r">$7,700,000</td><td class="r">—</td><td class="r">—</td><td>Solo frente calle</td></tr>
      <tr><td>9.2</td><td>Puertas vidrio templado acceso locales (2)</td><td class="c">und</td><td class="r">2</td><td class="r">$1,850,000</td><td class="r">1.00</td><td class="r">$3,700,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>9.3</td><td>Ventanas alum.+vidrio 4mm salones CI</td><td class="c">m²</td><td class="r">8</td><td class="r">$185,000</td><td class="r">1.00</td><td class="r">$1,480,000</td><td class="r">—</td><td class="r">—</td><td>Norma CI</td></tr>
      <tr><td>9.4</td><td>Silicona estructural y sellado</td><td class="c">glb</td><td class="r">1</td><td class="r">$650,000</td><td class="r">1.00</td><td class="r">$650,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.9</b></td><td class="r"><b>$13,530,000</b></td><td class="r">${fmtGas('Ventanería')}</td><td class="r">${fmtSal(13530000,'Ventanería')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">10. MANO DE OBRA GENERAL EMPRESA</td></tr>
      <tr><td>10.1</td><td>Cuadrilla empresa $23M/mes × 2.5 meses</td><td class="c">mes</td><td class="r">2.5</td><td class="r">$23,000,000</td><td class="r">1.00</td><td class="r">$57,500,000</td><td class="r">${fmtGas('Mano de Obra')}</td><td class="r">${fmtSal(57500000,'Mano de Obra')}</td><td>Maestro+2 of.+2 ay.</td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.10</b></td><td class="r"><b>$57,500,000</b></td><td class="r">${fmtGas('Mano de Obra')}</td><td class="r">${fmtSal(57500000,'Mano de Obra')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">11. ELÉCTRICO (104 pts) + RED DATOS CAT6 (9 pts)</td></tr>
      <tr><td>11.1–13</td><td>Cables NLT + conduit + cajas + dispositivos + tablero</td><td class="c">glb</td><td class="r">1</td><td class="r">$8,898,000</td><td class="r">1.00</td><td class="r">$8,898,000</td><td class="r">—</td><td class="r">—</td><td>Materiales eléctrico</td></tr>
      <tr><td>11.14–19</td><td>Red CAT6: cable UTP+keystone+cajas+patch panel+switch</td><td class="c">glb</td><td class="r">1</td><td class="r">$2,532,000</td><td class="r">1.00</td><td class="r">$2,532,000</td><td class="r">—</td><td class="r">—</td><td>9 puntos datos</td></tr>
      <tr><td>11.20</td><td>MO electricista: 104 pts × $35,000</td><td class="c">glb</td><td class="r">1</td><td class="r">$3,640,000</td><td class="r">1.00</td><td class="r">$3,640,000</td><td class="r">—</td><td class="r">—</td><td>Externo</td></tr>
      <tr><td>11.21</td><td>MO tablero + acometida + red datos</td><td class="c">glb</td><td class="r">1</td><td class="r">$850,000</td><td class="r">1.00</td><td class="r">$850,000</td><td class="r">—</td><td class="r">—</td><td>Externo</td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.11</b></td><td class="r"><b>$15,920,000</b></td><td class="r">${fmtGas('Eléctrico')}</td><td class="r">${fmtSal(15920000,'Eléctrico')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">12. HIDRO-SANITARIO</td></tr>
      <tr><td>12.1–9</td><td>Tubería+sanitarios+lavamanos+duchas+griferías+tanque+MO</td><td class="c">glb</td><td class="r">1</td><td class="r">$10,310,000</td><td class="r">1.00</td><td class="r">$10,310,000</td><td class="r">${fmtGas('Hidráulico')}</td><td class="r">${fmtSal(10310000,'Hidráulico')}</td><td>Ver Excel hoja 2</td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.12</b></td><td class="r"><b>$10,310,000</b></td><td class="r">${fmtGas('Hidráulico')}</td><td class="r">${fmtSal(10310000,'Hidráulico')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">13. CARPINTERÍA COMPLETA</td></tr>
      <tr><td>Coc.</td><td>Muebles cocina + mesón granito + lavaplatos + grifería</td><td class="c">glb</td><td class="r">1</td><td class="r">$3,460,000</td><td class="r">1.00</td><td class="r">$3,460,000</td><td class="r">—</td><td class="r">—</td><td>Cocineta empl.</td></tr>
      <tr><td>Ptas</td><td>11 puertas HDF (CI+baños) con marcos y chapas</td><td class="c">glb</td><td class="r">1</td><td class="r">$5,475,000</td><td class="r">1.00</td><td class="r">$5,475,000</td><td class="r">—</td><td class="r">—</td><td>Desglose en tab</td></tr>
      <tr><td>Bños</td><td>Mesones lavamanos + espejos + accesorios (5 baños)</td><td class="c">glb</td><td class="r">1</td><td class="r">$3,100,000</td><td class="r">1.00</td><td class="r">$3,100,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>Alm.</td><td>Lockers 6 puestos + estante didáctico</td><td class="c">glb</td><td class="r">1</td><td class="r">$1,400,000</td><td class="r">1.00</td><td class="r">$1,400,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>MO</td><td>MO carpintero externo (contrato global)</td><td class="c">glb</td><td class="r">1</td><td class="r">$4,500,000</td><td class="r">1.00</td><td class="r">$4,500,000</td><td class="r">—</td><td class="r">—</td><td>Externo</td></tr>
      <tr class="rob-sub"><td colspan="6"><b>SUBTOTAL CAP.13</b></td><td class="r"><b>$17,935,000</b></td><td class="r">${fmtGas('Carpintería')}</td><td class="r">${fmtSal(17935000,'Carpintería')}</td><td></td></tr>

      <tr class="rob-sr"><td colspan="10">14–19. PINTURA / EQUIPOS / METÁLICA / GAS / ASEO / ADMIN</td></tr>
      <tr><td>14</td><td>Pintura int.+ext. (2 manos) + sellador</td><td class="c">glb</td><td class="r">1</td><td class="r">$5,980,000</td><td class="r">1.00</td><td class="r">$5,980,000</td><td class="r">${fmtGas('Pintura')}</td><td class="r">${fmtSal(5980000,'Pintura')}</td><td></td></tr>
      <tr><td>15</td><td>Extintor×3 + gabinete inc. + CCTV + cerradura + señalización</td><td class="c">glb</td><td class="r">1</td><td class="r">$3,745,000</td><td class="r">1.00</td><td class="r">$3,745,000</td><td class="r">${fmtGas('Equipos y CCTV')}</td><td class="r">${fmtSal(3745000,'Equipos y CCTV')}</td><td></td></tr>
      <tr><td>16</td><td>Carp. metálica (puerta, remates, pasamanos)</td><td class="c">glb</td><td class="r">1</td><td class="r">$2,070,000</td><td class="r">1.00</td><td class="r">$2,070,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>17</td><td>Gas EPM + conector estufa</td><td class="c">glb</td><td class="r">1</td><td class="r">$2,335,000</td><td class="r">1.00</td><td class="r">$2,335,000</td><td class="r">${fmtGas('Gas')}</td><td class="r">${fmtSal(2335000,'Gas')}</td><td></td></tr>
      <tr><td>18</td><td>Retiro escombros + aseo final</td><td class="c">glb</td><td class="r">1</td><td class="r">$2,350,000</td><td class="r">1.00</td><td class="r">$2,350,000</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr><td>19</td><td>Residente 2.5m + EPP + servicios temp.</td><td class="c">glb</td><td class="r">1</td><td class="r">$8,900,000</td><td class="r">1.00</td><td class="r">$8,900,000</td><td class="r">${fmtGas('Administración')}</td><td class="r">${fmtSal(8900000,'Administración')}</td><td></td></tr>
      <tr><td>13b</td><td>Electrodomésticos cocineta (nevera+estufa+micro+cafe)</td><td class="c">glb</td><td class="r">1</td><td class="r">$2,230,000</td><td class="r">1.00</td><td class="r">$2,230,000</td><td class="r">${fmtGas('Electrodomésticos')}</td><td class="r">${fmtSal(2230000,'Electrodomésticos')}</td><td></td></tr>
      <tr><td>20</td><td>Imprevistos 1.5%</td><td class="c">glb</td><td class="r">1</td><td class="r">$2,848,053</td><td class="r">1.00</td><td class="r">$2,848,053</td><td class="r">—</td><td class="r">—</td><td></td></tr>
      <tr style="background:#0d1a30"><td colspan="6" style="font-weight:700;font-size:12px;color:#4f8ef7">▶ TOTAL PRESUPUESTADO</td><td class="r" style="font-size:12px;font-weight:700;color:#4f8ef7">${fmt(totalPpto)}</td><td class="r" style="color:#2ecc71;font-weight:700">${fmt(totalGastado)}</td><td class="r" style="color:#f39c12;font-weight:700">${fmt(saldo)}</td><td></td></tr>
      <tr style="background:#0d2a1a"><td colspan="6" style="font-weight:700;color:#2ecc71">DISPONIBLE</td><td class="r" style="color:#2ecc71;font-weight:700" colspan="3">${fmt(DISPONIBLE)}</td><td></td></tr>
      <tr style="background:#0d3a1a"><td colspan="6" style="font-weight:700;color:${margenColor}">✓ MARGEN</td><td class="r" style="color:${margenColor};font-weight:700;font-size:12px" colspan="3">${fmt(margen)}</td><td></td></tr>
    </tbody>
  </table></div>
</div>

<!-- ═══ CARPINTERÍA ══════════════════════════════════════════════════════ -->
<div id="rt-rcar" class="rob-pane2">
  <div class="rob-c2">
    <div>
      <div class="rob-h">Cocineta empleados</div>
      <div class="rob-card"><table>
        <thead><tr><th>Ítem</th><th class="r">Valor</th><th>Referencia</th></tr></thead>
        <tbody>
          <tr><td>Mueble bajo MDF enchapado 2.0ml</td><td class="r">$1,200,000</td><td style="font-size:9px">$600k/ml Medellín</td></tr>
          <tr><td>Mueble alto MDF enchapado 1.5ml</td><td class="r">$780,000</td><td style="font-size:9px">$520k/ml</td></tr>
          <tr><td>Mesón granito negro 2.0ml (mat+inst)</td><td class="r">$980,000</td><td style="font-size:9px">$490k/ml</td></tr>
          <tr><td>Lavaplatos acero inox 1 poceta Grival</td><td class="r">$320,000</td><td></td></tr>
          <tr><td>Grifería cocina monomando</td><td class="r">$180,000</td><td></td></tr>
          <tr class="rob-sub"><td><b>SUBTOTAL COCINETA</b></td><td class="r"><b>$3,460,000</b></td><td></td></tr>
        </tbody>
      </table></div>
      <div class="rob-h">Electrodomésticos cocineta</div>
      <div class="rob-card"><table>
        <thead><tr><th>Ítem</th><th class="r">Valor</th><th>Referencia</th></tr></thead>
        <tbody>
          <tr><td>Nevera 230L Haceb/Mabe básica</td><td class="r">$1,250,000</td><td style="font-size:9px">Alkosto</td></tr>
          <tr><td>Estufa 2 puestos gas + mesón</td><td class="r">$480,000</td><td></td></tr>
          <tr><td>Microondas 20L básico</td><td class="r">$320,000</td><td></td></tr>
          <tr><td>Cafetera + hervidor eléctrico</td><td class="r">$180,000</td><td></td></tr>
          <tr class="rob-sub"><td><b>SUBTOTAL ELECTRO</b></td><td class="r"><b>$2,230,000</b></td><td></td></tr>
        </tbody>
      </table></div>
      <div class="rob-h">Almacenamiento CI</div>
      <div class="rob-card"><table><tbody>
        <tr><td>Lockers metálicos 6 puestos empleados</td><td class="r">$850,000</td></tr>
        <tr><td>Estante almacén material didáctico</td><td class="r">$550,000</td></tr>
        <tr class="rob-sub"><td><b>SUBTOTAL</b></td><td class="r"><b>$1,400,000</b></td></tr>
      </tbody></table></div>
    </div>
    <div>
      <div class="rob-h">Puertas — desglose completo (11 puertas)</div>
      <div class="rob-card"><table>
        <thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">C/u</th><th class="r">Total</th></tr></thead>
        <tbody>
          <tr><td>Puerta acceso CI HDF reforzada 0.90 + chapa Yale</td><td class="c">1</td><td class="r">$785,000</td><td class="r">$785,000</td></tr>
          <tr><td>Puertas salones CI HDF 0.90×2.10 + marco + chapa</td><td class="c">3</td><td class="r">$520,000</td><td class="r">$1,560,000</td></tr>
          <tr><td>Puertas circulación/cocineta HDF 0.90 + marco</td><td class="c">2</td><td class="r">$490,000</td><td class="r">$980,000</td></tr>
          <tr><td>Puertas baños CI HDF 0.80×2.10 + marco (sin chapa)</td><td class="c">3</td><td class="r">$430,000</td><td class="r">$1,290,000</td></tr>
          <tr><td>Puertas baños locales HDF 0.80 + marco</td><td class="c">2</td><td class="r">$430,000</td><td class="r">$860,000</td></tr>
          <tr class="rob-sub"><td><b>SUBTOTAL PUERTAS</b></td><td class="c"><b>11</b></td><td></td><td class="r"><b>$5,475,000</b></td></tr>
        </tbody>
      </table></div>
      <div class="rob-h">Muebles de lavamanos y baños (5 baños)</div>
      <div class="rob-card"><table>
        <thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">Total</th></tr></thead>
        <tbody>
          <tr><td>Mesón lavamanos MDF con cubierta CI (3 baños)</td><td class="c">3</td><td class="r">$1,440,000</td></tr>
          <tr><td>Mesón lavamanos básico locales (2 baños)</td><td class="c">2</td><td class="r">$560,000</td></tr>
          <tr><td>Espejo + marco aluminio (5 baños)</td><td class="c">5</td><td class="r">$625,000</td></tr>
          <tr><td>Accesorios: papel, jabonera, toallero (5)</td><td class="c">5</td><td class="r">$475,000</td></tr>
          <tr class="rob-sub"><td><b>SUBTOTAL MUEBLES BAÑOS</b></td><td></td><td class="r"><b>$3,100,000</b></td></tr>
        </tbody>
      </table></div>
      <div class="rob-h">MO carpintero externo</div>
      <div class="rob-card"><table><tbody>
        <tr><td>Contrato global instalación carpintería</td><td class="r"><b>$4,500,000</b></td></tr>
      </tbody></table></div>
      <div class="rob-ao rob-al">✓ Citofonía ELIMINADA — reemplazada por red datos CAT6 (9 puntos RJ45)</div>
    </div>
  </div>
</div>

<!-- ═══ MO + ELÉCTRICO ══════════════════════════════════════════════════ -->
<div id="rt-rmo" class="rob-pane2">
  <div class="rob-c2">
    <div>
      <div class="rob-h">Cuadrilla empresa — $23M/mes</div>
      <div class="rob-card"><table>
        <thead><tr><th>Personal</th><th class="r">$/mes</th><th class="r">Jun½</th><th class="r">Julio</th><th class="r">Agosto</th></tr></thead>
        <tbody>
          <tr><td>Maestro de obra</td><td class="r">$8,500,000</td><td class="r">$4,250k</td><td class="r">$8,500k</td><td class="r">$8,500k</td></tr>
          <tr><td>Oficial 1 (mampost./revoque)</td><td class="r">$4,200,000</td><td class="r">$2,100k</td><td class="r">$4,200k</td><td class="r">$4,200k</td></tr>
          <tr><td>Oficial 2 (enchapes/acabados)</td><td class="r">$4,000,000</td><td class="r">$2,000k</td><td class="r">$4,000k</td><td class="r">$4,000k</td></tr>
          <tr><td>Ayudante 1</td><td class="r">$2,400,000</td><td class="r">$1,200k</td><td class="r">$2,400k</td><td class="r">$2,400k</td></tr>
          <tr><td>Ayudante 2</td><td class="r">$2,400,000</td><td class="r">$1,200k</td><td class="r">$2,400k</td><td class="r">$2,400k</td></tr>
          <tr><td>Aux. herramientas</td><td class="r">$1,500,000</td><td class="r">$750k</td><td class="r">$1,500k</td><td class="r">$1,500k</td></tr>
          <tr class="rob-sub"><td><b>SUBTOTAL</b></td><td class="r"><b>$23,000,000</b></td><td class="r"><b>$11.5M</b></td><td class="r"><b>$23M</b></td><td class="r"><b>$23M</b></td></tr>
        </tbody>
      </table></div>
      <div class="rob-h">Red datos CAT6 (reemplaza citofonía)</div>
      <div class="rob-card"><table><tbody>
        <tr><td>Cable UTP CAT6 (300ml)</td><td class="r">$1,050,000</td></tr>
        <tr><td>9 puntos RJ45 keystone + face plates</td><td class="r">$288,000</td></tr>
        <tr><td>Canaleta PVC datos (120ml)</td><td class="r">$264,000</td></tr>
        <tr><td>Patch panel 12p + rack 6U</td><td class="r">$650,000</td></tr>
        <tr><td>Switch 8 puertos</td><td class="r">$280,000</td></tr>
        <tr class="rob-sub"><td><b>SUBTOTAL RED CAT6</b></td><td class="r"><b>$2,532,000</b></td></tr>
      </tbody></table></div>
    </div>
    <div>
      <div class="rob-h">Eléctrico — 104 puntos × $35k MO</div>
      <div class="rob-card"><table>
        <thead><tr><th>Espacio</th><th class="c">Luz</th><th class="c">Toma</th><th class="c">Sw.</th><th class="c">Esp.</th><th class="c">Total</th></tr></thead>
        <tbody>
          <tr><td>Salón 01</td><td class="c">3</td><td class="c">3</td><td class="c">2</td><td class="c">0</td><td class="c">8</td></tr>
          <tr><td>Salón 02</td><td class="c">3</td><td class="c">3</td><td class="c">2</td><td class="c">0</td><td class="c">8</td></tr>
          <tr><td>Salón 03</td><td class="c">3</td><td class="c">3</td><td class="c">2</td><td class="c">0</td><td class="c">8</td></tr>
          <tr><td>Zona juego/actividades</td><td class="c">4</td><td class="c">2</td><td class="c">2</td><td class="c">0</td><td class="c">8</td></tr>
          <tr><td>Zona de estar CI</td><td class="c">2</td><td class="c">2</td><td class="c">1</td><td class="c">0</td><td class="c">5</td></tr>
          <tr><td>3 baños CI</td><td class="c">3</td><td class="c">3</td><td class="c">3</td><td class="c">1</td><td class="c">10</td></tr>
          <tr><td>Cocineta empleados</td><td class="c">2</td><td class="c">3</td><td class="c">1</td><td class="c">2</td><td class="c">8</td></tr>
          <tr><td>Cuarto útil</td><td class="c">1</td><td class="c">0</td><td class="c">1</td><td class="c">0</td><td class="c">2</td></tr>
          <tr><td>Circulación CI</td><td class="c">3</td><td class="c">1</td><td class="c">2</td><td class="c">0</td><td class="c">6</td></tr>
          <tr><td>Local Comercial 01</td><td class="c">4</td><td class="c">6</td><td class="c">2</td><td class="c">2</td><td class="c">14</td></tr>
          <tr><td>Local Comercial 02</td><td class="c">4</td><td class="c">6</td><td class="c">2</td><td class="c">2</td><td class="c">14</td></tr>
          <tr><td>Baños locales (×2)</td><td class="c">2</td><td class="c">2</td><td class="c">2</td><td class="c">0</td><td class="c">6</td></tr>
          <tr><td>Circulaciones+escaleras</td><td class="c">4</td><td class="c">0</td><td class="c">3</td><td class="c">0</td><td class="c">7</td></tr>
          <tr class="rob-sub"><td><b>TOTAL PUNTOS</b></td><td class="c"><b>38</b></td><td class="c"><b>34</b></td><td class="c"><b>25</b></td><td class="c"><b>7</b></td><td class="c"><b>104</b></td></tr>
        </tbody>
      </table></div>
    </div>
  </div>
</div>

<!-- ═══ CRONOGRAMA ═══════════════════════════════════════════════════════ -->
<div id="rt-rcro" class="rob-pane2">
  <div class="rob-h">Cronograma Jun–Ago 2026 (10 semanas)</div>
  <div class="rob-card"><table>
    <thead>
      <tr>
        <th style="min-width:230px">Actividad</th>
        <th class="c" colspan="2" style="color:#f39c12">JUNIO</th>
        <th class="c" colspan="4" style="color:#4f8ef7">JULIO</th>
        <th class="c" colspan="4" style="color:#2ecc71">AGOSTO</th>
      </tr>
      <tr>
        <th></th>
        <th class="c" style="font-size:9px">S3</th><th class="c" style="font-size:9px">S4</th>
        <th class="c" style="font-size:9px">S1</th><th class="c" style="font-size:9px">S2</th><th class="c" style="font-size:9px">S3</th><th class="c" style="font-size:9px">S4</th>
        <th class="c" style="font-size:9px">S1</th><th class="c" style="font-size:9px">S2</th><th class="c" style="font-size:9px">S3</th><th class="c" style="font-size:9px">S4</th>
      </tr>
    </thead>
    <tbody id="rob-gantt-tb"></tbody>
  </table></div>
</div>

<!-- ═══ PAGOS ════════════════════════════════════════════════════════════ -->
<div id="rt-rpag" class="rob-pane2">
  <div class="rob-ao rob-al" style="margin-bottom:12px">
    📡 <b>Datos en tiempo real desde Supabase.</b> Todos los gastos registrados en la base de datos para <code style="background:#1a2a3a;padding:1px 5px;border-radius:3px">obra=robledo</code> aparecen aquí automáticamente.
  </div>
  <div class="rob-kpis">
    <div class="rob-kpi y"><label>Ejecutado (Supabase)</label><div class="v" style="color:#f39c12">${fmt(totalGastado)}</div><div class="nt">${(gastos||[]).length} movimientos</div></div>
    <div class="rob-kpi"><label>Presupuesto total</label><div class="v">${fmt(totalPpto)}</div></div>
    <div class="rob-kpi g"><label>Saldo por pagar</label><div class="v" style="color:#2ecc71">${fmt(saldo)}</div></div>
    <div class="rob-kpi ${margen < 5e6 ? 'r' : margen < 20e6 ? 'y' : 'g'}"><label>Margen disponible</label><div class="v" style="color:${margenColor}">${fmt(margen)}</div></div>
  </div>
  <div class="rob-h">Ejecución por capítulo</div>
  <div class="rob-card"><table>
    <thead><tr><th>Capítulo</th><th class="r">Presupuesto</th><th class="r" style="color:#2ecc71">Ejecutado</th><th class="r" style="color:#f39c12">Saldo</th><th class="r">% Ejec.</th></tr></thead>
    <tbody>
      ${pagCapFilas}
      <tr class="rob-sub"><td><b>TOTAL</b></td><td class="r"><b>${fmt(totalPpto)}</b></td><td class="r" style="color:#2ecc71"><b>${fmt(totalGastado)}</b></td><td class="r" style="color:#f39c12"><b>${fmt(saldo)}</b></td><td class="r"><b>${Math.round(totalGastado / totalPpto * 100)}%</b></td></tr>
    </tbody>
  </table></div>
  <div class="rob-h">Movimientos en Supabase — Robledo</div>
  <div class="rob-card"><table>
    <thead><tr><th>Fecha</th><th>Capítulo</th><th>Nombre / Descripción</th><th>Área</th><th class="r">Monto</th></tr></thead>
    <tbody>${sbFilas}</tbody>
  </table></div>
</div>

</div>`; // end robw
  } // end buildHTML

  // ── GANTT ────────────────────────────────────────────────────────────────
  function renderGantt(container) {
    const gantt = [
      ["✅ Contrapiso+mortero+pisos DONE",    1,1,"#27ae60"],
      ["🔴 Escaleras: armado+vaciado",        1,2,"#e74c3c"],
      ["🔴 Terminar pegue adobe (15%)",       1,1,"#e74c3c"],
      ["🔴 Regar red hidráulica muros",       1,2,"#1abc9c"],
      ["🔴 Regar conduit eléctrico",          1,2,"#3498db"],
      ["   Revoques+pañete paredes (320m²)", 3,4,"#e67e22"],
      ["   Estuco interior (320m²)",          6,3,"#d35400"],
      ["   Hidro: terminaciones+aparatos",    5,3,"#16a085"],
      ["   Sanitarios 5 baños",               7,2,"#16a085"],
      ["   Drywall paredes (85m²)",           3,3,"#9b59b6"],
      ["   Cielorrasos drywall (210m²)",      3,4,"#8e44ad"],
      ["   Eléctrico 104 pts + CAT6",         3,5,"#2980b9"],
      ["   Luminarias+tomas+tablero",         6,3,"#2980b9"],
      ["   Enchapes baños (75m²)",            6,3,"#27ae60"],
      ["   Ventanería fachada frente",        4,2,"#f1c40f"],
      ["   Puertas+ventanas CI",              6,2,"#f39c12"],
      ["   Carpintería muebles+cocineta",     7,3,"#e74c3c"],
      ["   Pintura primera mano",             7,3,"#bdc3c7"],
      ["   Pintura acabado final",            9,2,"#95a5a6"],
      ["   Equipos+CCTV+seguridad",           8,2,"#3498db"],
      ["   Electrodomésticos cocineta",       9,1,"#e67e22"],
      ["   Aseo final + entrega",             10,1,"#2ecc71"],
    ];
    const tb = container.querySelector('#rob-gantt-tb');
    if (!tb) return;
    tb.innerHTML = '';
    gantt.forEach(([nm, s, d, col]) => {
      const tr = document.createElement('tr');
      let h = `<td style="font-size:10px;padding:5px 10px;color:#e8eaf6;white-space:nowrap">${nm}</td>`;
      for (let w = 1; w <= 10; w++) {
        h += `<td style="padding:2px 2px;text-align:center">`;
        if (w >= s && w < s + d) h += `<div style="background:${col};height:12px;border-radius:2px;opacity:.85"></div>`;
        h += `</td>`;
      }
      tr.innerHTML = h;
      tb.appendChild(tr);
    });
  }

  // ── TAB SWITCHING ────────────────────────────────────────────────────────
  function setupTabs(container) {
    container.querySelectorAll('.rob-tab2').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.rt;
        container.querySelectorAll('.rob-tab2').forEach(t => t.classList.remove('on'));
        container.querySelectorAll('.rob-pane2').forEach(p => p.classList.remove('on'));
        btn.classList.add('on');
        const pane = container.querySelector(`#rt-${target}`);
        if (pane) pane.classList.add('on');
        if (target === 'rcro') renderGantt(container);
      });
    });
  }

  // ── FETCH SUPABASE ───────────────────────────────────────────────────────
  async function fetchGastos() {
    try {
      const base = (window.SB_URL || SB_URL_FB);
      const key  = window.SB_KEY || '';
      const url  = base + '/rest/v1/gastos?obra=eq.robledo&select=*&order=fecha.desc&limit=500';
      const r = await fetch(url, {
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key,
          'Accept': 'application/json',
        }
      });
      if (!r.ok) { console.warn('[RobPpto] Supabase', r.status); return []; }
      return await r.json();
    } catch (e) {
      console.warn('[RobPpto] fetch error', e);
      return [];
    }
  }

  // ── BLOQUE DE DATOS REALES (caja + correcciones) — se AGREGA arriba, no reemplaza ──
  function sbReal(p){ var K=window.SB_KEY||''; return fetch((window.SB_URL||'https://dghmgaaprlzpfnpsqzav.supabase.co')+'/rest/v1/'+p,{headers:{apikey:K,'Authorization':'Bearer '+K}}).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}); }
  function finBlock(ajustes, abonos, gastos, caps){
    var ab=(abonos||[]).reduce(function(a,b){return a+(b.monto||0);},0);
    var ga=(gastos||[]).reduce(function(a,b){return a+(b.monto||0);},0);
    var ut=0;(ajustes||[]).forEach(function(a){if(a.tipo==='utilidad_anticipada')ut+=(a.monto||0);});
    var caja=ab-ga-ut;
    var fmt2=function(v){return '$'+Math.round(v||0).toLocaleString('es-CO');};
    var EL={pendiente:['#8892b0','Pendiente'],en_curso:['#f39c12','En curso'],ejecutado:['#2ecc71','Ejecutado']};
    var rows=(caps||[]).map(function(c){
      var p=+c.pagado_manual||0, pp=+c.ppto||0, est=c.estado||'pendiente';
      if(est==='ejecutado'){p=pp;}
      var fa=pp-p; var e=EL[est]||EL.pendiente;
      return '<tr><td style="padding:7px 10px">'+c.num+'. '+c.nombre+'</td>'
        +'<td style="padding:7px 10px;text-align:right">'+fmt2(pp)+'</td>'
        +'<td style="padding:7px 10px;text-align:right;color:#f39c12">'+(p>0?fmt2(p):'—')+'</td>'
        +'<td style="padding:7px 10px;text-align:right">'+fmt2(fa)+'</td>'
        +'<td style="padding:7px 10px;text-align:center"><span style="font-size:10px;font-weight:700;color:'+e[0]+'">'+e[1]+'</span></td></tr>';
    }).join('');
    var totP=(caps||[]).reduce(function(a,c){return a+(+c.ppto||0);},0);
    var totPag=(caps||[]).reduce(function(a,c){var est=c.estado||'pendiente';return a+(est==='ejecutado'?(+c.ppto||0):(+c.pagado_manual||0));},0);
    return '<div style="font-family:sans-serif;margin-bottom:18px">'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px">'
      +'<div style="background:#1a1e2e;border-radius:9px;padding:12px 14px;border-left:4px solid #3b82f6"><div style="font-size:9px;color:#8892b0;text-transform:uppercase;font-weight:700">Abonos recibidos</div><div style="font-size:18px;font-weight:800;color:#e8eaf6">'+fmt2(ab)+'</div></div>'
      +'<div style="background:#1a1e2e;border-radius:9px;padding:12px 14px;border-left:4px solid #f39c12"><div style="font-size:9px;color:#8892b0;text-transform:uppercase;font-weight:700">Gastos ejecutados</div><div style="font-size:18px;font-weight:800;color:#e8eaf6">'+fmt2(ga)+'</div></div>'
      +'<div style="background:#1a1e2e;border-radius:9px;padding:12px 14px;border-left:4px solid #e74c3c"><div style="font-size:9px;color:#8892b0;text-transform:uppercase;font-weight:700">Utilidad anticipada</div><div style="font-size:18px;font-weight:800;color:#e8eaf6">'+fmt2(ut)+'</div></div>'
      +'<div style="background:#1a1e2e;border-radius:9px;padding:12px 14px;border-left:4px solid #2ecc71"><div style="font-size:9px;color:#8892b0;text-transform:uppercase;font-weight:700">Caja real disponible</div><div style="font-size:18px;font-weight:800;color:#2ecc71">'+fmt2(caja)+'</div></div>'
      +'</div>'
      +'<div style="font-size:12px;font-weight:800;color:#4f8ef7;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 8px">📋 Presupuesto con tus correcciones reales (Pagado · Falta)</div>'
      +'<table style="width:100%;border-collapse:collapse;font-size:12px;background:#161a28;border-radius:8px;overflow:hidden">'
      +'<thead><tr style="background:#0d1117;color:#8892b0;font-size:10px;text-transform:uppercase"><th style="padding:8px 10px;text-align:left">Capítulo</th><th style="padding:8px 10px;text-align:right">Presupuesto</th><th style="padding:8px 10px;text-align:right">Pagado</th><th style="padding:8px 10px;text-align:right">Falta</th><th style="padding:8px 10px;text-align:center">Estado</th></tr></thead>'
      +'<tbody>'+rows+'<tr style="background:#0d1117;font-weight:800"><td style="padding:8px 10px">TOTAL</td><td style="padding:8px 10px;text-align:right">'+fmt2(totP)+'</td><td style="padding:8px 10px;text-align:right;color:#f39c12">'+fmt2(totPag)+'</td><td style="padding:8px 10px;text-align:right">'+fmt2(totP-totPag)+'</td><td></td></tr></tbody></table>'
      +'<div style="font-size:10px;color:#64748b;margin-top:6px">↑ Datos reales de la base · Abajo, tu tablero completo de 7 pestañas (intacto).</div>'
      +'<hr style="border:none;border-top:1px solid #2a3050;margin:18px 0"></div>';
  }

  // ── MOUNT (enganche compatible + datos reales arriba) ──
  let _rendered = false;
  function renderInto(container){
    container.innerHTML = '<div style="text-align:center;padding:28px;color:#8892b0;font-family:sans-serif;font-size:12px">⏳ Cargando presupuesto Robledo...</div>';
    Promise.all([ fetchGastos(),
      sbReal('ajustes_obra?obra_id=eq.robledo&select=tipo,monto'),
      sbReal('abonos?obra_id=eq.robledo&select=monto'),
      sbReal('presupuesto_caps?obra_id=eq.robledo&order=orden&select=num,nombre,ppto,estado,pagado_manual')
    ]).then(function(res){
      var gastos=res[0]||[];
      container.innerHTML = finBlock(res[1],res[2],gastos,res[3]) + buildHTML(gastos);
      setupTabs(container);
      _rendered = true;
    });
  }
  function injectPresupuestoTab(){
    if (document.getElementById('otab-pre-robledo')) return;
    var lastBtn = document.getElementById('otab-ldg-robledo'); if (!lastBtn) return;
    injectStyles();
    var btn = document.createElement('button'); btn.id='otab-pre-robledo'; btn.className='obra-tab';
    btn.setAttribute('onclick',"obraTab('robledo','pre')"); btn.innerHTML='💰 Presupuesto';
    lastBtn.parentElement.appendChild(btn);
    var v=document.getElementById('v-robledo'); if(!v)return;
    var d=document.createElement('div'); d.id='otc-pre-robledo'; d.style.cssText='display:none;padding:12px 0'; v.appendChild(d);
    var _orig=window.obraTab;
    window.obraTab=function(o,t){ if(_orig)_orig(o,t);
      var c=document.getElementById('otc-pre-robledo'),pb=document.getElementById('otab-pre-robledo'),pre=(o==='robledo'&&t==='pre');
      if(c)c.style.display=pre?'block':'none'; if(pb)pb.classList.toggle('on',pre); if(pre&&c&&!_rendered)renderInto(c);
    };
  }
  function waitAndInject(){ if(document.getElementById('otab-ldg-robledo')){injectPresupuestoTab();return;}
    var ob=new MutationObserver(function(){if(document.getElementById('otab-ldg-robledo')){ob.disconnect();injectPresupuestoTab();}}); ob.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitAndInject); else waitAndInject();
})();
