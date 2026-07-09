# Handoff · Rediseño de Estrategias

Bundle pegar-y-ejecutar para Claude Code. Implementa el rediseño de la pantalla
`/estrategias` (lista, detalle, creación) en el repo Huella.

> **Stack:** React + Vite + Supabase + Anthropic API (claude-sonnet-4-6).
> **Mobile-first.** Paleta Mocha Mix + Fraunces / Plus Jakarta Sans ya configurados.

---

## 0 · Cambios respecto a la primera versión del bundle

Tres correcciones aplicadas tras revisión externa:

1. **SQL** — eliminado el `ALTER TABLE estrategia_semanas` (esa tabla no existe en este repo). Las semanas, tareas y reflexiones viven dentro de los JSONB `plan` y `checkins` en la tabla `estrategias`. Agregadas las columnas faltantes en `estrategias` (`semana_actual`, `total_semanas`, `completado_at`, `abandonado_at`) con `IF NOT EXISTS`. Agregada query de migración de datos para copiar el legado `episodioOrigenId` (uuid singular) al nuevo array `episodios_detonantes_ids`.
2. **Catálogo de habilidades** — reescrito en `helpers.js` con las 11 habilidades del mockup aprobado, en sus 2 grupos: **Regulación emocional** (berrinches, tristeza, miedos, frustracion, ansiedad, enojo) y **Desarrollo y aprendizaje** (socializar, limites, sueno, alimentacion, autonomia).
3. **Adaptador IA** — ruta (a) elegida. Nueva función `detectarPatronesEstructurado()` en `src/services/anthropic.js` que pide JSON estructurado a Anthropic. `interpretarPatrones()` original queda intacta para el Panel. Código completo + prompt en `src/services/anthropic.snippet.js`.

---

## 1 · Estructura de archivos

```
src/pages/estrategias/
├── EstrategiasPage.jsx              ← REEMPLAZA al monolito
├── EstrategiasPage.module.css       ← REEMPLAZA
├── EstrategiaDetailPage.jsx         ← NUEVO
├── EstrategiaDetailPage.module.css  ← NUEVO
├── EstrategiaNuevaPage.jsx          ← NUEVO
├── EstrategiaNuevaPage.module.css   ← NUEVO
├── helpers.js                       ← NUEVO (catálogo · adaptador · descarte)
├── states.md                        ← NUEVO (referencia)
└── components/  (11 componentes con sus .module.css)

src/services/anthropic.snippet.js  ← AGREGAR a src/services/anthropic.js
src/index.css                      ← AGREGAR tokens (snippet)
src/App.jsx                        ← AGREGAR 3 rutas
sql/001_estrategias_rediseno.sql   ← Pegar en SQL Editor de Supabase
```

---

## 2 · Pasos de implementación (orden estricto)

### Paso 1 — SQL
Pegar `sql/001_estrategias_rediseno.sql` en SQL Editor de Supabase. Es idempotente (`IF NOT EXISTS`). Confirmar que la tabla `estrategia_sugerencias_descartadas` se creó y que las columnas nuevas en `estrategias` aparecen.

### Paso 2 — Tokens CSS
Pegar `src/index.css.snippet.css` dentro del bloque `:root` de `src/index.css`.

### Paso 3 — Borrar archivos viejos
Borrar `src/pages/estrategias/EstrategiasPage.jsx` y su `.module.css`.

### Paso 4 — Pegar archivos nuevos
Copiar el árbol `design_handoff_estrategias/src/pages/estrategias/` al repo.

### Paso 5 — Agregar función en anthropic.js
Pegar el contenido de `src/services/anthropic.snippet.js` al final de `src/services/anthropic.js`. NO modificar `interpretarPatrones()`.

### Paso 6 — Rutas en App.jsx
```jsx
<Route path="/estrategias" element={<EstrategiasPage />} />
<Route path="/estrategias/nuevo" element={<EstrategiaNuevaPage />} />
<Route path="/estrategias/:id" element={<EstrategiaDetailPage />} />
```

### Paso 7 — HuellaContext + persistencia JSONB
El reducer maneja dos acciones nuevas; la persistencia en Supabase escribe el JSONB completo (no columnas relacionales):

```js
case 'ESTRATEGIA_CREADA':
  return { ...state, estrategias: [...state.estrategias, action.plan] };

case 'ESTRATEGIA_AVANZADA':
  return {
    ...state,
    estrategias: state.estrategias.map((p) =>
      p.id !== action.plan_id ? p :
      {
        ...p,
        semana_actual: action.semana_actual ?? p.semana_actual,
        completado_at: action.completado_at ?? p.completado_at,
        // checkins JSONB: array de { semana_numero, reflexion, completada_at }
        checkins: [
          ...(p.checkins || []),
          { semana_numero: action.semana_completada, reflexion: action.reflexion, completada_at: new Date().toISOString() }
        ],
      }
    ),
  };
```

### Paso 8 — Servicios IA usados
Confirmar exports en `src/services/anthropic.js`:
- `generarEstrategia(...)` — devuelve el objeto `plan` completo (JSONB) que se guarda en `estrategias.plan`.
- `interpretarPatrones(...)` — **intacta**, sigue alimentando al Panel.
- `detectarPatronesEstructurado(...)` — **nueva**, alimenta a `SugerenciaIACard`. Ver `src/services/anthropic.snippet.js`.

---

## 3 · Lógica de la sugerencia IA

| Evento | Acción |
|---|---|
| Usuario toca ✕ | INSERT en `estrategia_sugerencias_descartadas` con `fingerprint` · ocultar optimistic |
| App re-monta o cambia `episodios` | `detectarPatronesEstructurado` → `buildSugerenciaFromInterpretacion` → `debeMostrarSugerencia` |
| `debeMostrarSugerencia` | `true` si no hay descarte con ese fingerprint **o** > 14 días desde el descarte |
| Plan activo existente | Sugerencia oculta automáticamente (no se llama al detector) |

`fingerprint = habilidad_id + sorted(episodios_ids).join('-')`. Persistencia en Supabase, no localStorage.

**Sin gamificación.** Empty state: *"Llevas N momentos. Con unos pocos más empezamos a ver tendencias."* Sin barras numéricas.

---

## 4 · Multi-hijo

Esta implementación trabaja con `state.hijo` del HuellaContext. Hooks ya preparados: todas las consultas filtran por `hijo_id`, los componentes reciben `hijo` por prop, descartes scopeados a `hijo_id` en SQL. Selector UI vendrá luego sin refactor mayor.

---

## 5 · Lo que NO se hace

- ❌ Pausar plan
- ❌ Edición manual de tareas (toggle sí; agregar/borrar no)
- ❌ Multi-hijo selector UI
- ❌ Tabla relacional para semanas (todo JSONB)
- ❌ Mejorar `interpretarPatrones` (queda intacta; `detectarPatronesEstructurado` es la fuente nueva)
- ❌ Notificaciones de check-in semanal
- ❌ Editar reflexión pasada

---

## 6 · Modelo JSONB · shape de `estrategias.plan` y `estrategias.checkins`

```jsonc
// estrategias (fila)
{
  "id": "uuid",
  "hijo_id": "uuid",
  "habilidad_id": "berrinches",          // id del catálogo
  "habilidad_nombre": "Berrinches",
  "habilidad_grupo": "emocional",
  "semana_actual": 2,                    // columna
  "total_semanas": 4,                    // columna
  "completado_at": null,                 // columna
  "abandonado_at": null,                 // columna
  "episodios_detonantes_ids": ["uuid1","uuid2","uuid3"],  // columna uuid[]
  "episodioOrigenId": "uuid1",           // legado (mantener por compat)

  "plan": {                              // JSONB — generado por IA
    "objetivo": "...",
    "fundamento": "...",
    "semanas": [
      {
        "numero": 1,
        "titulo": "Reconocer la emoción",
        "descripcion": "...",
        "tareas": [
          { "id": "t1", "texto": "...", "completada": true }
        ]
      }
    ]
  },

  "checkins": [                          // JSONB — append-only
    { "semana_numero": 1, "reflexion": "...", "completada_at": "ISO" }
  ]
}
```

Para actualizar el JSONB en Supabase: leer la fila, mutar el objeto en JS, `update().eq('id', ...)` con el objeto completo. No usar `jsonb_set` desde el cliente.

---

## 7 · Estados y transiciones

Ver `src/pages/estrategias/states.md`.

- **Lista:** loading · vacío · vacío-con-episodios · con-sugerencia · con-plan-activo + drawer pasados.
- **Detalle:** activo · completado · abandonado.
- **Creación:** paso-1-confirmar · generando · error.

---

## 8 · QA antes de mergear

- [ ] SQL idempotente: correr 2 veces no produce errores.
- [ ] Migración de datos: planes pre-existentes con `episodioOrigenId` ahora aparecen en el UI con su episodio-origen visible.
- [ ] Catálogo: las 11 habilidades del mockup aparecen en sus 2 grupos correctos.
- [ ] Sugerencia IA: `detectarPatronesEstructurado` devuelve JSON parseable; si Anthropic devuelve texto plano, el adaptador devuelve `null` y se muestra `EmptyPuerta1`.
- [ ] Cerrar sugerencia ✕ → reload → no reaparece (mismo fingerprint, < 14 días).
- [ ] Avanzar de semana 1 a 2: ≥2 tareas completadas + ≥5 caracteres de reflexión.
- [ ] Completar última semana → `BannerCompletado`.
- [ ] Empty state: copy *"Llevas N momentos. Con unos pocos más…"* sin barra numérica.
- [ ] Drawer pasados: solo completados/abandonados.
