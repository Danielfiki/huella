# REPORTE ROUND 2 — Estrategias
*Fecha: 2026-05-08 · Commit: 1feb3ef*

---

## SQL requerido (correr ANTES de verificar en producción)

```sql
ALTER TABLE estrategia_sugerencias_descartadas
ADD COLUMN IF NOT EXISTS episodios_count_al_rechazar integer DEFAULT 0;
```

Supabase → SQL Editor → pegar → Run.

---

## Cambios aplicados

### Cambio 1 — Cap de 3 planes activos
**Archivos:** `EstrategiaNuevaPage.jsx`, `EstrategiaNuevaPage.module.css`, `helpers.js`

- `MAX_PLANES_ACTIVOS_FREE = 3` exportado desde helpers.js
- `iniciarCreacion()` reemplaza el `onClick={generar}` directo: verifica si hay 3 planes activos para ese hijo antes de proceder
- Si hay cap: abre modal con lista de planes activos para elegir cuál abandonar
- `abandonarPlanYCrear(id)`: hace UPDATE `abandonado_at` en Supabase + dispatch `UPDATE_ESTRATEGIA`, luego llama a `generar()`
- Modal styles en `.modalOverlay`, `.modalCard`, `.modalTtl`, `.modalSub`, `.modalPlanes`, `.modalPlanBtn`, `.modalCancel`

**Verificar:** Tener 3 planes activos → ir a Estrategias → elegir habilidad → click "Generar mi plan" → debe aparecer modal de cap con los 3 planes listados → elegir uno → debe crear el plan nuevo y el elegido quedar como abandonado.

---

### Cambio 2 — Regla de descarte 7 días / 5 episodios nuevos
**Archivos:** `helpers.js`, `EstrategiasPage.jsx`

- `debeMostrarSugerencia(sugerencia, descartes, totalEpisodios)` reescrita con nueva firma
- Lógica: encuentra el rechazo más reciente de todos los descartes del hijo; muestra la sugerencia si pasaron ≥7 días O si se registraron ≥5 episodios nuevos desde ese rechazo
- `onCerrarSugerencia` ahora inserta `episodios_count_al_rechazar: episodios.length` en la tabla (requiere la columna SQL de arriba)

**Verificar:** Rechazar una sugerencia → registrar 5 episodios → volver a Estrategias → la sugerencia debe reaparecer (sin esperar 7 días).

---

### Cambio 3 — Filtro de habilidades ya trabajadas (90 días)
**Archivos:** `EstrategiasPage.jsx`

- `habilidadesExcluidas` useMemo: Set con los nombres de habilidades de planes activos O completados/abandonados en los últimos 90 días del hijo activo
- `sugerenciaFiltrada` useMemo: null si `sugerencia.habilidad_nombre` está en el Set; la sugerencia original si no
- Todo el pipeline usa `sugerenciaFiltrada` en lugar de `sugerencia`

**Verificar:** Tener un plan completado hace menos de 90 días para "Calmarse cuando explota" → la sugerencia IA no debe proponer esa misma habilidad.

---

### Cambio 4 — SugerenciaIACard rediseñada
**Archivos:** `components/SugerenciaIACard.jsx`, `components/SugerenciaIACard.module.css`

- Eliminado: badge "SUGERENCIA DE HUELLA" y título narrativo (`.head`, `.ttl`)
- Agregado: sección `.skill` con label "Vamos a trabajar:" (13px muted) + nombre de habilidad en Fraunces 22px ink

**Verificar:** Ver la card de sugerencia → debe mostrar "Vamos a trabajar:" en pequeño y el nombre de la habilidad en tipografía grande serif, sin ningún badge encima.

---

### Cambio 5 — Módulo colapsable "Sugerencias de Huella"
**Archivos:** `EstrategiasPage.jsx`, `EstrategiasPage.module.css`

- Header siempre visible: botón `<button>` con "🌱 Sugerencias de Huella" + chevron ▼/▲
- Badge "1 nueva" tangerine cuando la sugerencia no fue vista en esta sesión
- Estados: `expanded`, `esNueva`, refs `sugerenciaRef`, `hijoIdRef`
- **Auto-expand:** al montar, si `fingerprint` no está en `sessionStorage['huella_sug_{hijo.id}']` → expandido + badge; si ya estaba → colapsado sin badge
- **Marcar como vista:** al hacer click en el header para expandir manualmente, o al desmontar el componente (navegar a otra pantalla)
- **handleToggle:** al expandir manualmente escribe el fingerprint en sessionStorage y setea `esNueva(false)`
- Nuevo CSS: `.sectionHeader`, `.sectionLblText`, `.sectionChev`, `.badgeNueva`

**Verificar:**
1. Primera visita a Estrategias (sugerencia disponible) → sección expandida con badge "1 nueva"
2. Navegar a Panel y volver → sección colapsada, sin badge
3. Click en el header → expande/colapsa sin badge

---

### Cambio 6 — "Nace de" chips movidos del HeaderMocha
**Archivos:** `EstrategiaDetailPage.jsx`, `EstrategiaDetailPage.module.css`

- Eliminado el prop `episodiosOrigen` de `<HeaderMocha>`
- Agregada banda `<div className={styles.naceDe}>` entre el header y el body: fondo cream, borde inferior, chips con fondo `--color-strawberry` y texto blanco
- Chips muestran emoji + título truncado del episodio (máx 3)

**Verificar:** Entrar al detalle de un plan creado desde una sugerencia (con episodios detonantes) → debe aparecer una banda crema debajo del header mocha con chips rosas que dicen los títulos de los episodios.

---

### Cambio 7 — BannerCompletado botón tangerine
**Archivos:** `components/BannerCompletado.module.css`

- `.primary { background: var(--color-tangerine) }` (era `var(--color-mocha)`)

**Verificar:** Completar semana 4 de un plan → el botón principal del banner debe ser naranja/tangerine, no mocho.

---

### Cambio 8 — Estado post-rechazo diferenciado
**Archivos:** `EstrategiasPage.jsx`, `components/EmptyPuerta1.jsx`

- `esPostRechazo` useMemo: true si `sugerenciaVisible = false` Y hay descartes Y episodios ≥ 5 Y el último rechazo fue hace menos de 7 días Y se registraron menos de 5 episodios nuevos desde ese rechazo
- `EmptyPuerta1` acepta prop `postRechazo`: cuando es true muestra "Sin sugerencias activas por ahora. / Volveremos a proponerte algo cuando aparezca un patrón nuevo o registres más episodios."
- Cuando es false (empty state real): mensaje original de "Cuando registres más vida…"

**Verificar:** Rechazar una sugerencia sin registrar 5 episodios nuevos → el módulo colapsado debe mostrar al expandir "Sin sugerencias activas por ahora." en lugar de "Cuando registres más vida…"

---

### Cambio 9 — SemanaPasada títulos sin truncado
**Archivos:** `components/SemanaPasada.module.css`

- `.nm` ahora tiene `white-space: normal; word-break: break-word;` (antes era `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`)
- `.row` cambiado de `align-items: center` a `align-items: flex-start`
- `.num` tiene `margin-top: 1px` para alinear visualmente con la primera línea del título

**Verificar:** Ver un plan con semanas pasadas que tengan títulos largos → los títulos deben hacer word wrap en lugar de cortarse con "…"

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/pages/estrategias/helpers.js` | MAX_PLANES_ACTIVOS_FREE, debeMostrarSugerencia reescrita |
| `src/pages/estrategias/EstrategiasPage.jsx` | habilidadesExcluidas, sugerenciaFiltrada, sugerenciaVisible, esPostRechazo, módulo colapsable completo |
| `src/pages/estrategias/EstrategiasPage.module.css` | .sectionHeader, .sectionLblText, .sectionChev, .badgeNueva |
| `src/pages/estrategias/EstrategiaNuevaPage.jsx` | iniciarCreacion, abandonarPlanYCrear, modal de cap |
| `src/pages/estrategias/EstrategiaNuevaPage.module.css` | Estilos del modal de cap |
| `src/pages/estrategias/EstrategiaDetailPage.jsx` | Banda naceDe debajo del header |
| `src/pages/estrategias/EstrategiaDetailPage.module.css` | .naceDe, .naceDeLabel, .naceDeChip |
| `src/pages/estrategias/components/SugerenciaIACard.jsx` | Sin badge, nuevo bloque .skill |
| `src/pages/estrategias/components/SugerenciaIACard.module.css` | Sin .head/.ttl, nuevo .skill/.skillPre/.skillNombre |
| `src/pages/estrategias/components/EmptyPuerta1.jsx` | Prop postRechazo, mensaje diferenciado |
| `src/pages/estrategias/components/BannerCompletado.module.css` | .primary → tangerine |
| `src/pages/estrategias/components/SemanaPasada.module.css` | Word wrap en títulos |
| `ESTADO.md` | Sección 17 agregada, pendientes actualizados |
