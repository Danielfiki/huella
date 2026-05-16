# REPORTE ROUND 3 — Fixes post-verificación
*Fecha: 2026-05-08 · Commit: dcf4d9f*

---

## Sin SQL requerido para este round

El SQL del round 2 sigue pendiente si aún no se corrió:
```sql
ALTER TABLE estrategia_sugerencias_descartadas
ADD COLUMN IF NOT EXISTS episodios_count_al_rechazar integer DEFAULT 0;
```

---

## CAMBIO A — "Ver tu hito" abre la medalla específica del plan completado

### Diagnóstico previo
El botón navegaba a `/hitos` sin parámetros. La página carga todos los badges (34 medallas en 3 niveles) y el usuario tenía que buscar visualmente el badge recién obtenido.

### Investigación de estructura
No existe una ruta `/hitos/:id` ni un registro de DB por badge — los badges son computados 100% client-side a partir del array `NIVELES` definido en `HitosPage.jsx`. Cada badge tiene un campo `id` (string), por ejemplo `'plan_completo'`, `'primera_estrategia'`, `'semana_activa'`, etc.

### Decisión de implementación
Query param `?highlight=<badge_id>` + `scrollIntoView` al DOM element con ese id. No se requiere nueva ruta ni cambio de DB.

La medalla que corresponde a completar un plan de 4 semanas es `plan_completo` (🏆 "4 semanas", nivel 1). Su check: `estrategias.some((e) => e.semanaActual >= 4)`.

### Archivos tocados

**`src/pages/estrategias/components/BannerCompletado.jsx`**
```
navigate('/hitos')  →  navigate('/hitos?highlight=plan_completo')
```

**`src/pages/hitos/HitosPage.jsx`**
- Import: añadido `useSearchParams` desde `react-router-dom`
- `BadgeCard`: añadido `id={badge.id}` en el div raíz de cada card
- `HitosPage`: lee `highlight` de `searchParams`; `useEffect` hace `document.getElementById(highlight)?.scrollIntoView({ behavior: 'smooth', block: 'center' })` con 350ms de delay para dejar renderizar el DOM

### Verificar en producción
1. Completar semana 4 de un plan → aparece BannerCompletado
2. Click "Ver tu hito" → navega a `/hitos?highlight=plan_completo`
3. La página debe scrollear automáticamente al badge 🏆 "4 semanas"
4. Si es la primera vez que se visita /hitos después de completar el plan, el badge además tendrá la animación pulsante y el pill "¡Nuevo!" (lógica `esNuevo` existente basada en localStorage)

---

## CAMBIO B — Mensaje correcto cuando no hay sugerencia disponible con datos suficientes

### Diagnóstico previo
`esPostRechazo` solo era `true` en un caso muy específico (rechazo reciente con tiempo < 7 días y < 5 nuevos episodios). Los otros dos casos donde `sugerenciaVisible = false` con episodios ≥ 5 caían al mensaje "Cuando registres más vida..." aunque el usuario SÍ tenía datos:
- **Caso 2**: `sugerenciaFiltrada = null` porque el filtro de 90 días bloqueó la sugerencia de la IA
- **Caso 3**: `sugerencia = null` porque la IA no detectó ningún patrón en los episodios actuales

### Fix aplicado

**`src/pages/estrategias/EstrategiasPage.jsx`**

Antes (useMemo complejo, solo cubría caso 1):
```js
const esPostRechazo = useMemo(() => {
  if (sugerenciaVisible) return false;
  if (!descartes.length) return false;
  if (episodios.length < 5) return false;
  const ultimoRechazo = descartes.reduce(...)
  if (!ultimoRechazo) return false;
  const dias = (...)
  const epCountAtReject = ...
  return dias < 7 && (episodios.length - epCountAtReject) < 5;
}, [sugerenciaVisible, descartes, episodios.length]);
```

Después (cubre los 3 subcasos):
```js
const esPostRechazo = !sugerenciaVisible && episodios.length >= 5 && !loadingPatrones;
```

**`src/pages/estrategias/components/EmptyPuerta1.jsx`**: sin cambios. Ya usaba el prop `postRechazo` correctamente:
- `postRechazo = true` → "Sin sugerencias activas por ahora. / Volveremos a proponerte algo…"
- `postRechazo = false` → "Cuando registres más vida, Huella encontrará patrones…" (solo cuando episodios < 5)

### Comportamiento resultante
| Situación | Episodios | Mensaje mostrado |
|-----------|-----------|-----------------|
| No hay análisis aún | < 5 | "Cuando registres más vida…" |
| IA sin patrón detectado | ≥ 5 | "Sin sugerencias activas por ahora." |
| Filtro 90 días bloqueó habilidad | ≥ 5 | "Sin sugerencias activas por ahora." |
| Post-rechazo reciente | ≥ 5 | "Sin sugerencias activas por ahora." |
| Sugerencia disponible | cualquiera | SugerenciaIACard (no llega a EmptyPuerta1) |

### Nota de producto respetada
El filtro de 90 días aplica solo a Puerta 1 (sugerencias automáticas). Puerta 2 (selector manual de habilidades, `SelectorHabilidades`) no fue tocado y sigue respetando la elección del usuario.

### Verificar en producción
1. Con ≥ 5 episodios y todas las habilidades recientes en planes (dentro de 90 días) → abrir módulo "Sugerencias de Huella" → debe mostrar "Sin sugerencias activas por ahora."
2. Con ≥ 5 episodios de tipos variados pero sin patrón fuerte → abrir módulo → mismo mensaje
3. Con < 5 episodios → abrir módulo → debe mostrar "Cuando registres más vida…"

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/pages/estrategias/components/BannerCompletado.jsx` | navigate → `/hitos?highlight=plan_completo` |
| `src/pages/hitos/HitosPage.jsx` | useSearchParams, id en BadgeCard, useEffect scroll |
| `src/pages/estrategias/EstrategiasPage.jsx` | esPostRechazo simplificado |
| `ESTADO.md` | Sección 18 + pendientes actualizados |
