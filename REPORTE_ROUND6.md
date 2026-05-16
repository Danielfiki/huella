# REPORTE ROUND 6 — Robustez + Multi-planes

**Fecha:** 2026-05-09
**Auditoría base:** AUDITORIA_ESTRATEGIAS.md (43 hallazgos, 8 dimensiones)
**Objetivo:** Resolver 4 HIGH + 5 MEDIUM de la auditoría

---

## Cambios implementados

### Cambio 1 — H2.6: BannerCompletado + INSERT real a hitos
**Archivos:** `EstrategiaDetailPage.jsx`, `BannerCompletado.jsx`

- Texto del banner corregido: "Tu reflexión final ya quedó guardada en Hitos." → "Tu reflexión quedó guardada en el álbum de logros."
- `onAvanzar` ahora llama `addHito()` al completar la última semana (si hay reflexión). Usa `categoria: 'otro'` con descripción que incluye nombre de habilidad + semanas + reflexión final.
- El hito está envuelto en try/catch separado — si falla, el plan igual se completa (no crítico).

### Cambio 2 — H4.1: Mostrar TODOS los planes activos
**Archivos:** `EstrategiasPage.jsx`

- `planActivo = planes.find(...)` → `planesActivos = planes.filter(p => estadoPlan(p) === 'activo' && p.hijo_id === hijo?.id)`
- `planActivoEnriquecido` (singular) → `planesActivosEnriquecidos` (array, mismo enriquecimiento de episodios_detonantes para cada plan)
- Render: `planesActivosEnriquecidos.map(plan => <EstrategiaActivaCard key={plan.id} ... />)` con su propio `navigate` por id
- Sugerencias ahora se muestran cuando `planesActivos.length < MAX_PLANES_ACTIVOS_FREE` — antes solo si 0 activos
- `useEffect` de loadingPatrones: `if (planActivo)` → `if (planesActivos.length >= MAX_PLANES_ACTIVOS_FREE)`
- Importado `MAX_PLANES_ACTIVOS_FREE` desde helpers

### Cambio 3 — H1.3: Loading + error en onAvanzar
**Archivos:** `EstrategiaDetailPage.jsx`

- Estados nuevos: `avanzando` (boolean), `avanzarErr` (string)
- Guard anti-doble-tap: `if (avanzando) return` al inicio
- Supabase v2 correctamente: `const { error: dbErr } = await supabase...` + `if (dbErr) throw new Error(dbErr.message)`
- `catch` pone mensaje en `avanzarErr`; `finally` resetea `avanzando`
- Props pasados a SemanaActiva: `avanzando={avanzando}` y `errMsg={avanzarErr}`

### Cambio 4 — H1.4: Optimistic rollback en onToggleTarea
**Archivos:** `EstrategiaDetailPage.jsx`

- Dispatch optimista primero; luego verifica error de Supabase
- Si hay error: `dispatch` de rollback (restaura `plan.plan` original) + `setTareaKey(k => k + 1)` (fuerza remount de SemanaActiva para resetear su `useState tareas`) + mensaje `toggleErr` 4s
- `key={\`${actual}-${tareaKey}\`}` en SemanaActiva asegura remount al rollback
- `{toggleErr && <p className={styles.errToggle}>{toggleErr}</p>}` visible sobre la card

### Cambio 5 — H1.5: abandonarPlanYCrear verifica error Supabase
**Archivos:** `EstrategiaNuevaPage.jsx`

- Supabase v2: `const { error: dbErr } = await supabase...` + `if (dbErr) throw`
- Estado `capError` con mensaje inline en el modal de cap
- `.modalErr { font-size: 13px; color: var(--color-danger); ... }` en el CSS del módulo

### Cambio 6 — H1.2: Guard doble-tap en "Generar mi plan"
**Archivos:** `EstrategiaNuevaPage.jsx`

- `const generando = useRef(false)` — sincrónico (no batched como useState)
- `generar()`: `if (generando.current) return` al inicio; `generando.current = true` antes del primer await; reset a `false` en `finally`
- Cubre el caso de doble-tap rápido en el botón antes de que el estado de React se actualice

### Cambio 7 — H2.2: Modal de confirmación para "Cerrar el plan"
**Archivos:** `SemanaActiva.jsx`, `SemanaActiva.module.css`

- `cerrarModal` state en SemanaActiva
- `handleAvanzarClick`: si `esUltima` → abre modal; si no → llama `onAvanzar` directamente
- Modal: overlay fixed oscuro, card centrada, "¿Listo para cerrar el plan?" / "Esta acción no se puede deshacer." / botones Cancelar + "Cerrar plan →"
- Botón modal deshabilitado mientras `avanzando` (pasado como prop)
- Estilos: `modalOverlay`, `modalCard`, `modalTtl`, `modalSub`, `modalBtns`, `modalCancel`, `modalConfirm` en el CSS module

### Cambio 8 — H6.7: SelectorHabilidades bloquea habilidades con plan activo
**Archivos:** `EstrategiasPage.jsx`, `SelectorHabilidades.jsx`, `SelectorHabilidades.module.css`

- EstrategiasPage: `habilidadesEnPlanActivo = useMemo(() => new Set(planesActivos.map(p => p.habilidad_nombre || p.habilidad)), [planesActivos])`
- Pasado como prop a `<SelectorHabilidades habilidadesEnPlanActivo={habilidadesEnPlanActivo} />`
- SelectorHabilidades: nuevo handler `handleClickHabilidad` — si `habilidadesEnPlanActivo?.has(it.label)`, setea `msgBloqueada` 3s y retorna sin navegar
- Chip bloqueado recibe clase `.bloqueada` (opacity 0.4, cursor not-allowed)
- `.bloqueadaMsg` visible en la parte superior del selector cuando hay intento de click

### SQL H7.2 — CONFIRMADO COMO YA APLICADO
La columna `episodios_count_al_rechazar` en `estrategia_sugerencias_descartadas` fue aplicada en producción en la sesión anterior. ESTADO.md actualizado para reflejar esto. No requiere acción.

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `src/pages/estrategias/EstrategiaDetailPage.jsx` | Cambios 1, 3, 4 — addHito, avanzando state, rollback toggle, nuevos props a SemanaActiva |
| `src/pages/estrategias/EstrategiaDetailPage.module.css` | `.errToggle` nuevo |
| `src/pages/estrategias/EstrategiaNuevaPage.jsx` | Cambios 5, 6 — guard Supabase v2 + useRef doble-tap |
| `src/pages/estrategias/EstrategiaNuevaPage.module.css` | `.modalErr` nuevo |
| `src/pages/estrategias/EstrategiasPage.jsx` | Cambio 2, 8 — planesActivos array, habilidadesEnPlanActivo |
| `src/pages/estrategias/components/BannerCompletado.jsx` | Cambio 1 — texto corregido |
| `src/pages/estrategias/components/SemanaActiva.jsx` | Cambio 7 — modal de confirmación, props avanzando/errMsg |
| `src/pages/estrategias/components/SemanaActiva.module.css` | Cambio 7 — estilos modal + errMsg |
| `src/pages/estrategias/components/SelectorHabilidades.jsx` | Cambio 8 — prop habilidadesEnPlanActivo, bloqueo con mensaje |
| `src/pages/estrategias/components/SelectorHabilidades.module.css` | Cambio 8 — `.bloqueada` + `.bloqueadaMsg` |
| `ESTADO.md` | Sección Round 6 + H7.2 marcado resuelto + pendientes actualizados |

---

## Pendiente verificar en producción

- 2+ planes activos → ambos deben aparecer en EstrategiasPage
- Habilidad con plan activo → chip bloqueado + mensaje inline 3s
- Última semana → "Cerrar el plan" → modal antes de confirmar
- Toggle tarea con error de red → rollback visual 4s
- Doble-tap rápido en "Generar mi plan" → solo 1 generación
