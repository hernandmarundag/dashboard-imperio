# ESTADO — Plataforma Imperio Constructora

> **PUNTO GUARDADO · 3 de agosto de 2026** (snapshot #2 en Supabase, commits `2a6f735` + `256d729`)
> Nada de lo listado aquí se rehace. El próximo avance se compara contra este punto.

## Publicado hoy (en producción, rama main)

1. **Last Planner Weliving en cascada hasta enero 2027** dentro del panel (16 actividades nuevas wl-28…wl-43: mampostería, redes, pañetes, drywall, fachada, ascensor, enchapes, pisos, carpintería, pintura, cocinas, entrega).
2. **Panel lee en vivo**: la tarjeta móvil "Mis Obras" ahora usa la misma fuente que el resto ($912.8M real, antes mostraba $198M); los pasivos de la Posición Neta se calculan de la tabla `pasivos`; sello "Datos al … 🟢 en vivo" en el hero; el override por dispositivo (localStorage) quedó deshabilitado para weliving; avance/etapa de weliving actualizados al 3-ago.
3. **Presupuesto reconciliado**: cap 34 ya no aparece en $0; el gasto por capítulo prioriza la reclasificación real (3-ago) sobre el snapshot manual; presupuesto-vivo concilia con contabilidad ($912.8M) y carga la dotación desde la base.
4. **Asistencia segura**: guarda con UPSERT sobre la llave única (cédula, fecha) — se eliminó el DELETE masivo. La asistencia ahora registra también los días "asistió" y es fuente de verdad.
5. **Nómina nunca asume 15 días**: los días salen de la asistencia real; sin asistencia = 0 días con advertencia ámbar y override manual consciente; banner cuando la quincena no tiene asistencia.
6. **Pago en 1 paso**: en requisiciones y en compras, confirmar el pago crea el gasto/recibo automáticamente (gasto primero; si falla, NO se marca pagada). "Pasar a gasto" queda solo como respaldo para las viejas.
7. **Bitácora con valor ganado**: campos cantidad + unidad + actividad APU (opcionales) en el formulario y en el chat guiado; columnas nuevas en la base.

## Verificación

Auditoría de 6 áreas con datos vivos de Supabase → implementación por agentes con anchors exactos → sintaxis validada (node --check) → render sin errores JS en las 8 páginas → RLS verificada → push verificado en GitHub main.

## Decisiones que faltan de Hernán

- **Doble conteo estructura**: ON1-ON8 (ítems ~$603M) + ON-MAT (ppto $435M) inflan el total del presupuesto — definir cuál es el oficial.
- **PILA planilla mayo** sigue `pagado=false` en la tabla `pagos`: si ya se pagó, marcarla (por eso aparece como "vencida").
- **Saldos de cuentas están en $0** (faltan extractos may/jun/jul): la "caja" mostrada es la suma de aportes, no el saldo bancario real.
- Requisiciones **2 y 7** (pagadas sin recibo): dar "Pasar a gasto" una sola vez.
- Borrar las **60 tablas** `zz_backup_`/`correccion_` (esperando OK).

## Siguiente fase

- Sistema de diseño compartido (tokens carbón + dorado, Inter, números tabulares, sello de fecha en todos los tableros, botones 44px móvil).
- Tablero de valorización (`v_valorizacion`): bitácora × APU = valor ganado vs gasto real.
