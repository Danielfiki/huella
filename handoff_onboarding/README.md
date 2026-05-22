# Onboarding · Susurro — handoff bundle

Bundle de implementación para Claude Code. Reemplaza el flujo de onboarding
actual con el concepto **Susurro** elegido en Fase 1: 5 slides, contenido
anclado abajo, gradientes con partículas, y un slide 3 que llama a Claude
para responder al texto del padre/madre antes de pedir cualquier configuración.

> **Idioma:** español neutro/chileno con tuteo. Todo el copy del bundle ya
> está en ese registro. **Nunca voseo argentino**: "puedes" no "podés",
> "tienes" no "tenés", "fíjate" no "fijate".

> **Dirección visual:** ver `mockup/Onboarding_Susurro.html`. Las 5 paletas
> y las composiciones por slide están ahí literalmente — si lo que se
> implementa no se ve como ese mockup, parar y avisar.

---

## ⛔ Alcance — protocolo "stop and ask"

**Únicos archivos que este bundle modifica/crea/elimina (ver tabla abajo).**
Si durante la implementación detectas que necesitas tocar algo fuera de esa
lista — **PARA**. Anótalo y pregunta al humano. El default es no tocar.

**NO tocar bajo ninguna circunstancia:**

- Tokens en `src/index.css` — no agregar, no renombrar, no aliasear.
- `HeaderMocha.{jsx,module.css}` — el onboarding NO lo usa (compone su propio
  banner mocha en `OnboardingFormSlide`, distinto layout y altura).
- `frases.js` del flujo de generación de plan — el onboarding tiene sus
  propias frases en `frases-onboarding.js`. Son sistemas independientes.
- `HuellaContext.jsx` — lectura sí, modificación NO sin avisar primero.
- Bottom nav, AI response, EstrategiaActivaCard, EstrategiaPasadaCard, Card,
  LoadingDignificado — ninguno se importa ni se modifica.

---

## Plan de archivos

### CREAR (9 archivos nuevos)

```
src/pages/onboarding/
├── Onboarding.jsx                      ← shell · state machine · swipe
├── Onboarding.module.css
├── OnboardingBottomSlide.jsx           ← plantilla slides 1, 2, 3, 5
├── OnboardingBottomSlide.module.css
├── OnboardingFormSlide.jsx             ← plantilla slide 4
├── OnboardingFormSlide.module.css
├── OnboardingComposer.jsx              ← state machine del slide 3
├── OnboardingComposer.module.css
└── frases-onboarding.js
```

Contenido completo en `implementation/components/`. Copiar **uno a uno**,
mantener nombres exactos.

### MODIFICAR (1 archivo existente)

| Archivo | Cambio | Notas |
|---|---|---|
| `src/App.jsx` o `src/routes.jsx` | Reemplazar la ruta del onboarding actual por `<Onboarding onComplete={…} onSkip={…} />` | Ver sección "Integración" abajo. |

### CREAR / TOCAR EN BACKEND (mínimo)

| Archivo | Cambio | Detalle |
|---|---|---|
| `api/anthropic.js` (o equivalente) | Agregar la función `requestPrimerEncuentro(texto, { signal })` | Contrato exacto en sección "API · primer encuentro". |
| Schema Supabase | `profiles.contexto_inicial text NULL` | Campo opcional para guardar el texto del slide 3 si vino. |

### ELIMINAR (archivos del onboarding actual)

```
src/pages/onboarding/<lo que exista hoy>
```

> Antes de borrar, `grep -r <nombre>` debe devolver 0 hits fuera del onboarding.
> Si el onboarding actual exporta algo que se consume en otro lado,
> **parar** y avisar.

---

## Integración con el router

```jsx
// En App.jsx o donde se monte la ruta del onboarding
import Onboarding from './pages/onboarding/Onboarding';

<Route
  path="/bienvenida"
  element={
    <Onboarding
      onComplete={async (perfil) => {
        await persistirPerfilOnboarding(perfil);  // ver "Persistencia" abajo
        navigate('/');
      }}
      onSkip={() => {
        // El padre/madre saltó. NO persistimos nada. Marcamos onboarding como
        // visto (no como completado) y dejamos que vuelva a aparecer la
        // próxima vez que abra la app.
        marcarOnboardingVisto();
        navigate('/');
      }}
    />
  }
/>
```

---

## Contrato del componente raíz

```jsx
<Onboarding
  onComplete={(perfil) => void}  // slide 5 "Empezar ahora"
  onSkip={() => void}            // botón "Saltar" arriba en slides 1, 2, 4
/>
```

### Forma del objeto `perfil`

```js
{
  nombrePadre: string,           // requerido en slide 4
  nombreHijo: string,            // requerido en slide 4
  nacimiento: {                  // requerido en slide 4
    dia: string,                 // "DD" (sólo dígitos)
    mes: string,                 // "MM"
    anio: string,                // "AAAA"
  },
  sexo: 'Niño' | 'Niña' | 'Otro' | null,  // requerido en slide 4
  fotoBlob: File | null,         // OPCIONAL
  intenciones: string[],         // al menos 1, set fijo (ver OnboardingFormSlide)
  contextoInicial: string | null, // OPCIONAL · texto del slide 3 si lo escribió
}
```

> El campo `fotoBlob` es un `File` nativo. Antes de persistirlo en Supabase,
> Claude Code decide: subir a Storage y guardar URL, o convertir a base64
> y guardar inline. **Decisión técnica** — no de diseño.

> El campo `intenciones` viene como labels en español: `"Entender berrinches"`,
> `"Manejar pantallas"`, etc. Si el backend necesita IDs estables (para alimentar
> al sistema de sugerencias IA), mapear en el persistor antes del insert.
> No cambiar las labels en el componente — son user-facing.

---

## Lógica de estado · cuándo se renderiza cuál

El shell mantiene dos pedazos de estado:

- `index` (0..4) — slide actual
- `perfil` — objeto del usuario, se va completando en slide 4 (y opcionalmente
  recibe `contextoInicial` desde el slide 3)

Tabla de comportamiento por slide:

| Slide | Topbar skip | Contenido | CTA principal | CTA secundario |
|---|---|---|---|---|
| 1 — Gancho | "Saltar" → `onSkip()` | título, body, sub | "Continuar" → `goNext()` | — |
| 2 — Promesa | "Saltar" → `onSkip()` | título, body, sub | "Continuar" → `goNext()` | — |
| 3 — Encuentro | **oculto** | título + `<OnboardingComposer/>` | dentro del Composer | "Saltar este paso" inline |
| 4 — Sistema | "Saltar" → `onSkip()` | header mocha + form | "Continuar" → `goNext()` (sólo si form válido) | — |
| 5 — Afirmación | **oculto** | badge personalizado + título + body + sub | "Empezar ahora →" → `onComplete(perfil)` | — |

### Slide 3 — máquina de estados interna

`OnboardingComposer` mantiene su propio `state ∈ { 'idle', 'typing', 'loading', 'response', 'fallback' }`:

| state | render | trigger de salida |
|---|---|---|
| `idle` | textarea + placeholder + CTA disabled | usuario empieza a escribir → `typing` |
| `typing` | textarea con borde focus + CTA enabled | pulsar CTA → `loading` |
| `loading` | loader + frase rotatoria (2.5s) + CTA con spinner | fetch resuelve → `response` o `fallback` |
| `response` | response card + CTA "Continuar" | pulsar CTA → `onSubmit(texto)` → `goNext()` |
| `fallback` | igual que `response` pero con `FALLBACK_RESPONSE` | igual |

> El usuario **nunca distingue** `response` de `fallback`. Visualmente son
> el mismo render. Lo único que cambia es el origen del payload.

---

## API · primer encuentro

### Contrato del helper

`requestPrimerEncuentro(texto, opts)` debe vivir en `api/anthropic.js` (o
equivalente) y exportar la siguiente firma:

```js
/**
 * @param {string} texto         Texto que escribió el padre/madre.
 * @param {Object} opts
 * @param {AbortSignal} opts.signal  Para cancelar al desmontar.
 * @returns {Promise<{
 *   comprension: string,  // 1 párrafo cálido, validante · 60–120 palabras
 *   cita: string,         // cita real, sin comillas dentro · 1 oración
 *   autor: string,        // ej. "Daniel Siegel"
 *   marco: string,        // marco aplicado en minúsculas · ej. "ventana de tolerancia"
 * }>}
 *
 * Lanza si: 4xx/5xx, timeout (8s · ya seteado en el caller), parse error,
 * o payload incompleto (sin `comprension`). El caller cae a FALLBACK_RESPONSE.
 */
export async function requestPrimerEncuentro(texto, { signal }) { … }
```

### Sugerencia de configuración (decisión final de Claude Code)

- **Modelo:** `claude-sonnet-4-5` (ya en uso).
- **Max tokens:** `320` (objetivo de costo ≤ $0.002/usuario nuevo).
- **System prompt** — esqueleto sugerido (Claude Code afina):
  > Eres Huella. Un padre o madre acaba de contarte algo que vivió con su
  > hijo/a. Tu respuesta debe tener exactamente esta forma JSON, sin texto
  > antes ni después:
  > `{"comprension": "...", "cita": "...", "autor": "...", "marco": "..."}`
  >
  > Reglas: tono validante en español neutro con tuteo, nunca voseo
  > argentino. La `comprension` valida lo que el padre/madre describe —
  > no diagnostica, no juzga, no patologiza al niño. La `cita` es real
  > y atribuida a un autor del marco aplicado. El `marco` se nombra en
  > minúsculas (ej. "ventana de tolerancia", "presencia", "corregulación").

- **Timeout:** 8000ms. Ya implementado en `OnboardingComposer.jsx` vía
  `AbortController`. El helper sólo necesita respetar el `signal`.

### Manejo de error — qué pasa si falla

1. `OnboardingComposer` setea `state = 'loading'` y dispara la promesa.
2. Si la promesa **rechaza** por cualquier motivo (sin conexión, timeout,
   4xx/5xx, parse error, payload sin `comprension`) → `setResponse(FALLBACK_RESPONSE)`
   y `setState('fallback')`.
3. El render es **idéntico** al de éxito. El padre/madre nunca ve un
   mensaje de error.
4. **No reintentamos** automáticamente. Es el primer encuentro — no le
   hacemos sentir que algo se trabó.

> El copy del fallback está en `frases-onboarding.js → FALLBACK_RESPONSE` y
> está pensado para encajar con cualquier texto del padre/madre. Si producto
> quiere ajustarlo, editar **sólo** ese archivo.

---

## Persistencia en Supabase

Al recibir `onComplete(perfil)`, el caller persiste:

| Tabla / campo | Origen | Notas |
|---|---|---|
| `profiles.nombre` | `perfil.nombrePadre` | Para el saludo del panel. |
| `profiles.contexto_inicial` | `perfil.contextoInicial` | OPCIONAL · puede ser `null` si saltó el slide 3 o si lo persistió como string vacío. Esto **NO** se persiste como episodio en borrador. Se queda como contexto del perfil para alimentar al sistema de sugerencias IA. |
| `profiles.intenciones` | `perfil.intenciones` | array de labels. Mapear a IDs estables si tu backend lo requiere. |
| `children` (insert nuevo) | `perfil.nombreHijo`, `perfil.nacimiento.{dia,mes,anio}`, `perfil.sexo`, `perfil.fotoBlob` | El insert vincula con `profiles.id`. Si `fotoBlob` viene null, no se sube nada. |

> **Decisión de diseño** (ya tomada): el texto del slide 3 NO se persiste
> como episodio en borrador en `episodes`. Va a `profiles.contexto_inicial`.
> Razón: no queremos que el primer episodio "real" del padre/madre sea uno
> escrito en un onboarding — eso contamina el historial visible.

> Si la decisión cambia en el futuro, sólo se modifica el persistor (no este
> bundle). El componente sigue entregando el texto en `perfil.contextoInicial`.

---

## Animaciones

Tres movimientos en todo el onboarding. Todo respeta `prefers-reduced-motion`.

| Animación | Dónde | Spec | Reduced motion |
|---|---|---|---|
| Slide ↔ slide | `Onboarding.module.css` `.track` | `transform: translateX(-N*100%)` · `transition: transform 280ms ease-out` | sin transition |
| Respuesta del slide 3 | `OnboardingComposer.module.css` `.respCard` | `opacity 0→1` + `translateY 12px→0` · `600ms cubic-bezier(.22,.61,.36,1)` | sin animation |
| Frase rotatoria | `OnboardingComposer.module.css` `.phrase` | `opacity 0→0.92` + `translateY 4px→0` · `380ms` al cambiar `key={phraseIndex}` | sin animation |

No usar `framer-motion`. No agregar parallax a las partículas. Mantener el
costo de render mínimo: las partículas son `background-image` con
`radial-gradient`, no nodos DOM.

---

## Tokens utilizados

Todo viene de `src/index.css` (= `colors_and_type.css`). **Cero aliases nuevos.**

```
--color-bg
--color-surface
--color-surface-alt
--color-border
--color-primary
--color-primary-light
--color-primary-dark
--color-primary-bg
--color-primary-border
--color-primary-tint
--color-accent-green
--color-accent-mocha
--color-text
--color-text-muted
--color-text-light
--shadow-primary-sm
--shadow-primary-md
--font-family
--font-heading
--radius-md
--radius-lg
```

### Constantes locales del onboarding (no entran a tokens globales)

Estas viven en los CSS Modules del bundle. Si en el futuro otro componente
necesita las mismas paletas, **abrir otro ticket** para promoverlas a tokens.
Por ahora son exclusivas del onboarding.

```
Slide 1 · noche:      linear-gradient(160deg, #2A1B3F 0%, #4A2438 55%, #6B2A35 100%)
Slide 2 · amanecer:   linear-gradient(168deg, #C45A18 0%, #E8956D 50%, #FEE4D0 100%)
Slide 3 · encuentro:  linear-gradient(160deg, #1F4438 0%, #2E6B5C 50%, #4A9B8C 100%)
Slide 4 · sistema:    --color-bg + banner --color-accent-mocha
Slide 5 · afirmacion: linear-gradient(175deg, #A84B28 0%, #E56E26 50%, #EE9452 100%)
```

---

## Checklist final

- [ ] 9 archivos creados en `src/pages/onboarding/`.
- [ ] Ruta del router apunta a `<Onboarding/>`.
- [ ] `api/anthropic.js` expone `requestPrimerEncuentro(texto, { signal })` con el contrato de respuesta documentado arriba.
- [ ] Migración Supabase aplicada: `profiles.contexto_inicial text NULL`.
- [ ] El onboarding actual fue eliminado y `grep -r` lo confirma.
- [ ] **QA visual** · los 5 slides se ven como `mockup/Onboarding_Susurro.html`.
- [ ] **QA funcional**:
  - [ ] Swipe lateral funciona en los 5 slides.
  - [ ] Dots de progreso se actualizan (5 dots, actual marcado, completados diferenciados).
  - [ ] "Saltar" arriba aparece **sólo** en slides 1, 2, 4. **No** en 3 ni 5.
  - [ ] "Saltar este paso" inline aparece **sólo** en slide 3.
  - [ ] Slide 3 · placeholder visible.
  - [ ] Slide 3 · CTA "Ver qué dice Huella" disabled hasta que `text.trim().length >= 3`.
  - [ ] Slide 3 · al pulsar CTA, aparece loader con frase rotatoria que cambia cada ~2.5s.
  - [ ] Slide 3 · respuesta se revela con fade-up suave (no instantáneo).
  - [ ] Slide 3 · si la API falla (forzar offline para probar), aparece la respuesta de fallback con la misma UI.
  - [ ] Slide 4 · CTA "Continuar" disabled hasta tener nombre padre + nombre hijo + fecha de nacimiento completa + sexo + ≥1 intención.
  - [ ] Slide 4 · "Agregar foto" abre el file picker; al seleccionar, el botón muestra el nombre del archivo + "cambiar".
  - [ ] Slide 5 · badge muestra "Bienvenido/a, [Nombre]" con el nombre del padre/madre.
  - [ ] Slide 5 · si el usuario saltó el slide 4, el badge degrada a "Bienvenido/a a Huella" sin nombre.
  - [ ] `onComplete(perfil)` se invoca con el objeto completo.
  - [ ] `prefers-reduced-motion: reduce` desactiva las transitions del track, el reveal de la respuesta y la rotación de frase.

---

## OBSERVACIONES — fuera de alcance

> Notas para discusión humana posterior. Ningún archivo del bundle las aplica.

1. **Variantes de glyph emoji.** Los emojis del slide 1, 2, 3, 5 (🌙 📖 💬 ✨) están hardcoded en `Onboarding.jsx`. Si producto quiere A/B-testearlos, mover a una constante exportada o a un feature flag. **No lo hago en este bundle.**

2. **Persistencia "soft" del onboarding al salir y volver.** Si el padre/madre cierra la app a mitad de slide 4, hoy vuelve a empezar desde slide 1. Si producto quiere recordar el slide actual y el form parcial, agregar a localStorage. **No lo hago** — el brief no lo pidió y es un caso edge.

3. **Validación profunda de fecha.** Hoy `OnboardingFormSlide` valida que los tres campos de fecha tengan algo, pero no valida que la fecha sea **real** (no acepta "32/13/2025"). Recomendación: validar contra `new Date(year, month-1, day)` en el persistor antes del insert. **No lo hago en el componente** — prefiero no obstruir el tipeo del padre/madre con errores inline durante el onboarding.

4. **Idiomas y formato de fecha.** El input está hardcoded DD/MM/AAAA — formato chileno. Si en el futuro hay locales con MM/DD/AAAA (ej. EE.UU. hispano), parametrizar. No lo hago.

5. **Botón "atrás" del navegador / hardware back en Android.** Hoy el shell no maneja `popstate`. Si el padre/madre pulsa back en slide 3, sale del onboarding entero. Recomendación: interceptar y mapear a `goPrev()`. **No lo hago** — requiere validar con el resto del routing.

6. **Persistencia del audio/imagen del foto picker en iOS Safari.** Si el padre/madre selecciona una foto, navega entre slides (swipe back+forward), el `File` queda en memoria React. Funciona, pero **NO sobrevive a recarga**. No lo arreglo — es el comportamiento esperado.

7. **Foco automático del textarea del slide 3.** Hoy el textarea **no** recibe foco automáticamente al llegar al slide 3 (decisión: evitar abrir el teclado virtual antes de que el usuario haya leído el título). Si producto quiere cambiar esto, agregar `useEffect(() => { if (active) textareaRef.current?.focus(); }, [active])` dentro de `OnboardingComposer`. La prop `active` ya está siendo pasada para ese caso.

8. **Animación de entrada del primer slide.** Hoy el onboarding aparece sin animación. Si producto quiere un fade-in inicial, agregar al shell. No lo hago — me parece que sumar otra animación al ya cinematográfico arco emocional dilata el TTI sin ganancia.

9. **Caracteres máximos del nombre.** Hoy `maxLength={60}` en `nombrePadre` y `nombreHijo`. Si en producción aparecen nombres más largos que rompen el badge del slide 5 ("Bienvenido/a, [muy largo]"), considerar truncado elegante con `text-overflow: ellipsis` (ya está aplicado en `.badge` del BottomSlide, así que **debería estar cubierto**). Validar en QA.
