# Puerta 1 · Concepto C "Mosaico de evidencia" — handoff bundle

Bundle de implementación para Claude Code. Reemplaza el bloque Puerta 1 dentro de `EstrategiasPage` con el Concepto C, en sus tres estados.

> **Idioma:** español chileno con tuteo. Todo el copy del bundle ya está en ese registro.

---

## ⛔ Alcance — protocolo "stop and ask" reforzado

**Únicos archivos que este bundle modifica/crea/elimina (ver tabla abajo).**
Si durante la implementación detectas que necesitas tocar algo fuera de esa
lista — **PARA**. Anótalo y pregunta al humano. El default es no tocar.

**NO tocar bajo ninguna circunstancia:**
- `EstrategiaActivaCard.{jsx,module.css}`
- `EstrategiaPasadaCard.{jsx,module.css}`
- `HeaderMocha.{jsx,module.css}`
- `Card.{jsx,module.css}`
- `LoadingDignificado.{jsx,module.css}` ← este bundle **no lo importa**, define su propio loader recortado dentro de `PuertaUnoLoading`.
- `frases.js`
- Bottom nav
- Tokens en `index.css` — no agregar, no renombrar, no aliasear.
- `HuellaContext.jsx` — lectura sí, modificación NO sin avisar primero.

---

## Plan de archivos

### CREAR (6 archivos nuevos)

```
src/components/estrategias/puerta1/
├── PuertaUnoHallazgo.jsx          ← estado "con sugerencia" (reemplaza SugerenciaIACard)
├── PuertaUnoHallazgo.module.css
├── PuertaUnoEmpty.jsx              ← estado "sin sugerencia" (reemplaza EmptyPuerta1)
├── PuertaUnoEmpty.module.css
├── PuertaUnoLoading.jsx            ← estado "generando" (nuevo)
└── PuertaUnoLoading.module.css
```

Contenido completo de los 6 archivos en `implementation/components/`.

### MODIFICAR (2 archivos existentes, con patches puntuales)

| Archivo | Cambios | Patch |
|---|---|---|
| `src/pages/estrategias/EstrategiasPage.jsx` | 5 ediciones acotadas (imports, eliminar early return, agregar handler de scroll a P2, reemplazar render del body, helper local `<PuertaUnoSection>`) | `EstrategiasPage.patch.md` |
| `src/pages/estrategias/EstrategiasPage.module.css` | 1 clase nueva: `.sectionLblText`. Nada más. | `EstrategiasPage.module.css.patch.md` |
| `src/pages/estrategias/helpers.js` | 2 cambios mínimos en `buildSugerenciaFromInterpretacion`: subir `slice(0, 3)` a `slice(0, 5)`, y agregar `created_at` al objeto detonante. | `helpers.patch.js` |

### ELIMINAR (2 archivos obsoletos)

```
src/pages/estrategias/components/SugerenciaIACard.jsx          ← obsoleto, reemplazado por PuertaUnoHallazgo
src/pages/estrategias/components/SugerenciaIACard.module.css   ← obsoleto
src/pages/estrategias/components/EmptyPuerta1.jsx              ← obsoleto, reemplazado por PuertaUnoEmpty
src/pages/estrategias/components/EmptyPuerta1.module.css       ← obsoleto
```

> Antes de borrar `EmptyPuerta1`, `grep -r EmptyPuerta1 src/` debe devolver 0 hits.
> Igual para `SugerenciaIACard`. Si hay otros consumidores, parar y avisar.

---

## Contrato de datos

### `PuertaUnoHallazgo` — sin cambios respecto a `SugerenciaIACard`

Recibe el mismo objeto `sugerencia` que ya construye `buildSugerenciaFromInterpretacion`
en `helpers.js`. Únicos requerimientos nuevos:

| Campo | Origen | Estado actual | Cambio |
|---|---|---|---|
| `episodios_detonantes` | helpers.js | array de hasta **3** | Subir a hasta **5** (`slice(0,5)`) |
| `episodios_detonantes[].created_at` | helpers.js | **no incluido** hoy en la hidratación | Agregar al map (el episodio fuente ya lo tiene) |

Resto del payload (`narrativa.titulo`, `narrativa.bajada`, `habilidad_id`, `habilidad_nombre`, `fingerprint`, etc.) **idéntico** al que ya genera `helpers.js`.

### `PuertaUnoEmpty` — contrato simplificado

```jsx
<PuertaUnoEmpty
  totalEpisodios={episodios.length}    // number, ya existía en EmptyPuerta1
  onIrPuerta2={onIrPuerta2}            // () => void · nuevo
/>
```

### `PuertaUnoLoading` — sin datos

```jsx
<PuertaUnoLoading onIrPuerta2={onIrPuerta2} />
```

No recibe estados intermedios ni progreso real — es un loader indeterminado.

---

## Lógica de estado · cuándo se renderiza cuál

El switch vive en `EstrategiasPage.jsx`, no dentro de los componentes.

```jsx
// Sección Puerta 1 — ARRIBA del plan activo
(loadingPatrones || sugerenciaVisible) && (
  loadingPatrones
    ? <PuertaUnoLoading … />
    : <PuertaUnoHallazgo … />
)

// (acá va el plan activo · IDÉNTICO al actual)

// Sección Puerta 1 — ABAJO del plan activo (mutuamente excluyente)
(!loadingPatrones && !sugerenciaVisible) && (
  <PuertaUnoEmpty totalEpisodios={…} … />
)
```

Las dos secciones son **mutuamente excluyentes** — Puerta 1 aparece exactamente en uno de los dos slots.

| `loadingPatrones` | `sugerenciaVisible` | Render | Posición |
|---|---|---|---|
| `true`  | `false` | `<PuertaUnoLoading />` | arriba del plan activo |
| `false` | `true`  | `<PuertaUnoHallazgo />` | arriba del plan activo |
| `false` | `false` | `<PuertaUnoEmpty />` | debajo del plan activo |
| `true`  | `true`  | **imposible en la práctica** | (el effect setea `setSugerencia` solo en `finally` de loading) |

Variables ya existentes en `EstrategiasPage.jsx`:
- `loadingPatrones` — `useState(false)`, ya existe (línea 30).
- `sugerenciaVisible` — `debeMostrarSugerencia(sugerencia, descartes)`, ya existe (línea 76).

**No se agregan estados nuevos.**

---

## ⚠️ Pre-check obligatorio antes de aplicar (multi-plan)

La decisión de producto es: **con plan activo + sugerencia simultáneos, "Trabajemos esto" puede crear un segundo plan activo** (modelo Plan Explorador permite hasta 3).

Antes de aplicar `EstrategiasPage.patch.md`, validar en código que:

1. **`HuellaContext.jsx`** — `state.estrategias` acepta múltiples planes con `estadoPlan === 'activo'`. **Solo lectura.**
2. **`EstrategiaNuevaPage` + servicio Supabase** — crear un nuevo plan **no fuerza el cierre del anterior**. Verificar constraints de DB y lógica del insert.
3. **El render post-patch** — `planActivo = planes.find(...)` sigue tomando solo uno. Si el producto quiere que se vean los N planes activos simultáneamente, eso es otro ticket ("multi-plan render") y **no entra en este bundle**.

→ Si las 3 condiciones pasan: aplicar patches.
→ Si alguna falla: **PARAR**, no arreglar `HuellaContext` ni backend, avisar al humano.

---

## Estilos · tokens utilizados

Todos los tokens son de `src/index.css` existente. **Cero aliases nuevos.**

```
--color-surface          surfaces blancas (cards de los 3 estados)
--color-surface-alt      track de barras, dot apagado en empty
--color-bg               fondo de tiles del mosaico
--color-border           bordes
--color-celebration-start head con gradiente del estado con sugerencia
--color-accent-mocha     dot de Huella (gradient origin)
--color-primary          dot/CTA/barra de intensidad (gradient end)
--color-primary-light    gradient stop · indeterminate progress
--color-primary-dark     stamp eyebrow
--color-text             título, body, CTA bg
--color-text-muted       bajada, copy secundario
--color-text-light       empty state, badge "En segundo plano"
--color-accent-green     NO usado en concepto C (este concepto se diferencia
                         del borde-izquierdo verde que usaban A/B; aquí la
                         jerarquía viene del head con gradiente).
--font-family / --font-heading
--radius-sm / --radius-md / --radius-lg
--shadow-sm / --shadow-md
```

### Variantes visuales nuevas exclusivas del bloque Puerta 1 (no se exportan)

| Patrón | Vive en | Reutilizable fuera de P1? |
|---|---|---|
| **Mosaico de tiles** (emoji + barra intensidad + día) | `PuertaUnoHallazgo.module.css` (`.mosaic`, `.ep`, `.emo`, `.ibar`, `.dy`) | No. Si en el futuro quieres reusarlo en el detalle de habilidad, abrir otro ticket de generalización. |
| **Pulse mocha→primary** en cuadrado 38×38 | `PuertaUnoLoading.module.css` (`.pulse`) | No. Aunque es visualmente similar a `LoadingDignificado.pulse`, no se importa el componente original — ambos viven en paralelo. |
| **Indeterminate progress bar** | `PuertaUnoLoading.module.css` (`.indet`) | No. Si quieres una barra indeterminada global, abrir otro ticket. |

---

## Checklist final

- [ ] 6 archivos creados en `src/components/estrategias/puerta1/`
- [ ] `EstrategiasPage.jsx` parcheado (5 ediciones del `EstrategiasPage.patch.md`)
- [ ] `EstrategiasPage.module.css` parcheado (`.sectionLblText` agregada)
- [ ] `helpers.js` parcheado (slice 3→5, agregar `created_at` al map)
- [ ] `SugerenciaIACard.{jsx,module.css}` eliminados — `grep -r SugerenciaIACard src/` devuelve 0 hits
- [ ] `EmptyPuerta1.{jsx,module.css}` eliminados — `grep -r EmptyPuerta1 src/` devuelve 0 hits
- [ ] Pre-check multi-plan validado (3 puntos arriba) — o, si falla, **ESPERAR aviso del humano**
- [ ] QA visual: los 3 estados se ven como `mockup/PuertaUno_C.html`
- [ ] QA funcional:
  - [ ] Sin episodios o `< 3` → empty, abajo del plan activo.
  - [ ] Episodios suficientes, IA devuelve patrón → hallazgo, arriba del plan activo.
  - [ ] IA cargando → loading, arriba del plan activo.
  - [ ] "Trabajemos esto" → navega a `/estrategias/nuevo?habilidad=X&episodios=a,b,c,d,e`.
  - [ ] "No por ahora" → registra descarte en `estrategia_sugerencias_descartadas`, hide optimistic, no aparece de nuevo hasta cambio de fingerprint o > 14 días.
  - [ ] "¿Prefieres elegir tú? →" → scroll suave al `<section id="puerta-2">`.

---

## OBSERVACIONES — fuera de alcance (no implementadas)

> Default = no tocar. Estas notas son para discusión humana posterior; ningún archivo del bundle las aplica.

1. **Multi-plan render.** Hoy `planActivo = planes.find(...)` toma solo uno de los planes activos. Si el producto Plan Explorador permite hasta 3 simultáneos, el render actual no muestra los 2 adicionales. No lo arreglo en este bundle — es lógica de la lista, no de Puerta 1.

2. **Tokens viejos en `EstrategiasPage.module.css`.** El archivo actual referencia `--color-tangerine` y `--color-muted` (aliases viejos del brief original). El brief de Puerta 1 prohíbe tocar `index.css` y otras clases de `EstrategiasPage.module.css`. Si esos aliases no existen en `index.css`, el dot del label de sección queda sin color. No lo arreglo.

3. **`debeMostrarSugerencia(null, …)` durante loading.** Hoy retorna `false`, lo cual hace que `sugerenciaVisible` sea `false` mientras `loadingPatrones` es `true`. La lógica del bundle aprovecha exactamente eso (ver tabla de estados). Confirmar que sigue siendo cierto si algún día se cambia el orden de los `useEffect` o se mueve la lógica al context.

4. **Caché de sugerencia entre re-renders de episodios.** Hoy cada vez que `episodios` cambia (incluso por un episodio nuevo registrado) se vuelve a llamar a `interpretarPatrones`, y mientras dura el `await` el componente muestra `<PuertaUnoLoading />` que reemplaza al hallazgo previo. En la práctica esto significa: si el padre acaba de registrar un episodio nuevo y vuelve a Estrategias, el card "Trabajemos esto" puede flashear a loader y volver. No lo arreglo — el brief dijo "sin delay artificial, mostramos lo que dura realmente". Pero si en producción se ve mal, una opción es: mantener sugerencia previa visible mientras carga la próxima (stale-while-revalidate).

5. **Etiqueta `.sectionLblText`.** La extraje a una clase nueva porque el brief la cita literalmente como patrón. Eso es la única clase agregada a `EstrategiasPage.module.css`. **Si en el repo ya existe `.sectionLblText` con otro nombre, eliminar el patch y usar la clase existente.**

6. **`onIrPuerta2()` con scroll API nativa.** Si la app envuelve `EstrategiasPage` en otro contenedor scroll (un `<main>` con `overflow: auto` o un layout sticky), el `scrollIntoView` del elemento puede no funcionar bien. Verificar en QA. Si no funciona, sustituir por `containerRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' })`.

7. **`SugerenciaIACard` borrado vs. `git mv`.** Recomiendo borrarlo (`git rm`) en lugar de moverlo a `puerta1/`. El nuevo `PuertaUnoHallazgo` no es el mismo componente — tiene props distintas (`onDescartar` en vez de `onCerrar`, `onIrPuerta2` nuevo), contrato distinto y estilos completamente nuevos. Mantener el viejo como referencia genera deuda.
