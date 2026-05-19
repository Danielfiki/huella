# EstrategiasPage.patch.md
## Puerta 1 · Concepto C — patches puntuales sobre `src/pages/estrategias/EstrategiasPage.jsx`

Son **5 ediciones acotadas**. Ninguna toca lógica fuera del bloque Puerta 1. El plan activo, `HeaderMocha`, `EstrategiaActivaCard`, `SelectorHabilidades` y `DrawerPasados` quedan **idénticos**.

> ⚠️ **PRE-CHECK CRÍTICO antes de aplicar (decisión del producto: hasta 3 planes activos simultáneos)**.
> El usuario confirmó que con plan activo + sugerencia, "Trabajemos esto" puede crear un segundo plan activo. **Antes de aplicar los patches**, valida que la creación de un segundo plan activo funciona out-of-the-box:
> 1. `HuellaContext.jsx` — `state.estrategias` debe poder tener N planes con `estadoPlan(p) === 'activo'`. Hoy el filtro `planes.find(...)` toma el primero, así que si hay 2 activos el segundo queda invisible.
> 2. `EstrategiaNuevaPage.jsx` + servicio que inserta plan en Supabase — verificar que no hay constraint UNIQUE(hijo_id, estado='activo') ni lógica que cierre el plan anterior al crear uno nuevo.
> 3. `EstrategiasPage` post-patch — el ternario `planActivo ? ... : ...` desaparece, pero `planActivo = planes.find(estado === activo)` sigue tomando solo el primero. Si quieres ver los N activos, hay que cambiar a `planesActivos = planes.filter(...)` y mapear. **Eso ya NO es parte de este bundle** — es alcance "multi-plan" que el producto deberá decidir.
>
> Si cualquiera de las tres condiciones falla → **PARAR y avisar al humano antes de continuar**. No "arreglar por las dudas" HuellaContext ni backend. Default = no tocar.
> Si las tres pasan → aplicar los patches abajo.

---

## Edit 1 · imports (líneas 7–10)

**LOCALIZAR:**
```jsx
import EstrategiaActivaCard from './components/EstrategiaActivaCard';
import SugerenciaIACard from './components/SugerenciaIACard';
import SelectorHabilidades from './components/SelectorHabilidades';
import EmptyPuerta1 from './components/EmptyPuerta1';
```

**REEMPLAZAR POR:**
```jsx
import EstrategiaActivaCard from './components/EstrategiaActivaCard';
import PuertaUnoHallazgo from '../../components/estrategias/puerta1/PuertaUnoHallazgo';
import PuertaUnoEmpty from '../../components/estrategias/puerta1/PuertaUnoEmpty';
import PuertaUnoLoading from '../../components/estrategias/puerta1/PuertaUnoLoading';
import SelectorHabilidades from './components/SelectorHabilidades';
```

Verificar que la ruta relativa (`../../components/estrategias/puerta1/`) coincide con tu estructura. Si los nuevos componentes Puerta 1 viven en `src/components/estrategias/puerta1/` y este archivo en `src/pages/estrategias/`, la ruta `../../components/estrategias/puerta1/...` es correcta.

---

## Edit 2 · eliminar el early return que mata la sugerencia con plan activo (línea ~54)

**LOCALIZAR** (dentro del useEffect que genera la sugerencia):
```jsx
  // Generar sugerencia IA si no hay plan activo
  useEffect(() => {
    if (planActivo) { setSugerencia(null); return; }
    if (!hijo?.id || episodios.length < 3) { setSugerencia(null); return; }
```

**REEMPLAZAR POR:**
```jsx
  // Generar sugerencia IA (independiente de si hay plan activo o no — Puerta 1 vive en su propia sección)
  useEffect(() => {
    if (!hijo?.id || episodios.length < 3) { setSugerencia(null); return; }
```

(El comentario también cambia. Eliminamos la línea `if (planActivo) { setSugerencia(null); return; }`. Nada más en ese useEffect se toca.)

---

## Edit 3 · helper para foco en Puerta 2

**LOCALIZAR** (cerca de los handlers, antes del return):
```jsx
  const onElegirHabilidad = (hab) => {
    navigate(`/estrategias/nuevo?habilidad=${hab.id}`);
  };
```

**AGREGAR** (debajo de `onElegirHabilidad`):
```jsx
  // Link sutil en Puerta 1 → lleva el foco a Puerta 2 (sección hermana).
  // Implementación: scroll a la sección con id="puerta-2". No abre nada, no navega.
  const onIrPuerta2 = () => {
    const el = document.getElementById('puerta-2');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
```

> ⚠️ Esto añade un `id="puerta-2"` a la sección de Puerta 2 (ver Edit 5). El scroll usa la API nativa; no se usa `scrollIntoView` con focus, solo scroll de la página (no del viewport completo). Si tu app envuelve la página en otro contenedor scroll, usar `el.scrollTo()` desde el contenedor padre.

---

## Edit 4 · `onCerrarSugerencia` → `onDescartarSugerencia` (cosmético, rename)

El handler `onCerrarSugerencia` queda igual en lógica. Solo recomendamos renombrarlo a `onDescartarSugerencia` para alinear con el copy "No por ahora" del nuevo componente. Si no quieres renombrar, simplemente pásalo al prop `onDescartar` del componente. Ambas opciones son equivalentes.

**Opción A (recomendada, rename):**
```jsx
  const onDescartarSugerencia = async () => {
    // ... contenido idéntico al actual onCerrarSugerencia ...
  };
```

**Opción B (sin rename, solo pasar al prop):**
```jsx
  <PuertaUnoHallazgo
    sugerencia={sugerencia}
    onAceptar={onAceptarSugerencia}
    onDescartar={onCerrarSugerencia}
    onIrPuerta2={onIrPuerta2}
  />
```

---

## Edit 5 · el render — esta es la edición grande, pero acotada

**LOCALIZAR** (todo el bloque dentro de `<div className={styles.body}>`):
```jsx
      <div className={styles.body}>
        {planActivo ? (
          <section className={styles.section}>
            <div className={styles.sectionLbl}>Lo que estás trabajando</div>
            <EstrategiaActivaCard
              plan={planActivo}
              hijo={hijo}
              onAbrir={() => navigate(`/estrategias/${planActivo.id}`)}
            />
          </section>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionLbl}>
                <span className={styles.dotDot} /> Sugerencias para vos
              </div>
              {sugerenciaVisible ? (
                <SugerenciaIACard
                  sugerencia={sugerencia}
                  onAceptar={onAceptarSugerencia}
                  onCerrar={onCerrarSugerencia}
                />
              ) : (
                <EmptyPuerta1 totalEpisodios={episodios.length} />
              )}
            </section>

            <section className={styles.section}>
              <SelectorHabilidades onElegir={onElegirHabilidad} />
            </section>
          </>
        )}

        {planesPasados.length > 0 && (
          <DrawerPasados planes={planesPasados} />
        )}
      </div>
```

**REEMPLAZAR POR:**
```jsx
      <div className={styles.body}>

        {/* ════════════════════════════════════════════════════════
            Puerta 1 — REPOSICIONAMIENTO DINÁMICO
            - con sugerencia o generando → encima del plan activo
            - sin sugerencia              → debajo del plan activo
            El nombre del hijo se inyecta en el label.
            ════════════════════════════════════════════════════════ */}

        {/* Posición ARRIBA: solo cuando hay hallazgo activo o estamos generando */}
        {(loadingPatrones || sugerenciaVisible) && (
          <PuertaUnoSection hijoNombre={hijo?.nombre}>
            {loadingPatrones ? (
              <PuertaUnoLoading onIrPuerta2={onIrPuerta2} />
            ) : (
              <PuertaUnoHallazgo
                sugerencia={sugerencia}
                onAceptar={onAceptarSugerencia}
                onDescartar={onCerrarSugerencia}
                onIrPuerta2={onIrPuerta2}
              />
            )}
          </PuertaUnoSection>
        )}

        {/* Plan activo — IDÉNTICO al actual, solo deja de estar bajo ternario */}
        {planActivo && (
          <section className={styles.section}>
            <div className={styles.sectionLbl}>Lo que estás trabajando</div>
            <EstrategiaActivaCard
              plan={planActivo}
              hijo={hijo}
              onAbrir={() => navigate(`/estrategias/${planActivo.id}`)}
            />
          </section>
        )}

        {/* Posición ABAJO: solo cuando NO hay hallazgo ni estamos generando */}
        {!loadingPatrones && !sugerenciaVisible && (
          <PuertaUnoSection hijoNombre={hijo?.nombre} calm>
            <PuertaUnoEmpty
              totalEpisodios={episodios.length}
              onIrPuerta2={onIrPuerta2}
            />
          </PuertaUnoSection>
        )}

        {/* Puerta 2 — sección hermana, no se rediseña.
            Anchor id="puerta-2" para el scroll suave desde Puerta 1. */}
        <section id="puerta-2" className={styles.section}>
          <SelectorHabilidades onElegir={onElegirHabilidad} />
        </section>

        {planesPasados.length > 0 && (
          <DrawerPasados planes={planesPasados} />
        )}
      </div>
```

**Y AGREGAR al final del archivo, fuera del componente principal:**
```jsx
// Wrapper para la sección Puerta 1. Sólo encapsula la etiqueta de sección
// con el nombre del hijo. NO es un componente nuevo "compartido": vive en este
// archivo y existe únicamente para no duplicar el label.
function PuertaUnoSection({ hijoNombre, calm = false, children }) {
  const nombre = hijoNombre || 'tu hijo';
  return (
    <section className={styles.section}>
      <div className={styles.sectionLbl}>
        <span
          className={styles.dotDot}
          style={calm ? { background: 'var(--color-text-light)' } : undefined}
        />
        <span className={styles.sectionLblText}>
          Lo que Huella ve en {nombre}
        </span>
      </div>
      {children}
    </section>
  );
}
```

> ⚠️ El span con `className={styles.sectionLblText}` necesita que esa clase exista en `EstrategiasPage.module.css`. Ver `EstrategiasPage.module.css.patch.md` — es el único cambio en ese stylesheet.

---

## Resumen de cambios en EstrategiasPage.jsx

| # | Línea aprox. | Tipo | Qué |
|---|---|---|---|
| 1 | 7–10 | reemplazar imports | Quita `SugerenciaIACard` y `EmptyPuerta1`. Agrega 3 imports de `puerta1/`. |
| 2 | 54 | quitar 1 línea | Elimina early return `if (planActivo) { setSugerencia(null); return; }`. |
| 3 | tras `onElegirHabilidad` | agregar handler | `onIrPuerta2()` — scroll a `#puerta-2`. |
| 4 | (opcional, cosmético) | rename | `onCerrarSugerencia` → `onDescartarSugerencia`. |
| 5 | render del body | reemplazar todo el body | Posición arriba (gen/hallazgo), plan activo, posición abajo (empty), Puerta 2 con `id`. |
| 6 | fin del archivo | agregar local | Helper local `<PuertaUnoSection>` (no se exporta). |

**No se toca:** `useEffect` de descartes, `useMemo` de `planActivo`/`planesPasados`, `onAceptarSugerencia`, `onElegirHabilidad`, render de `<HeaderMocha>`, `<DrawerPasados>`.
