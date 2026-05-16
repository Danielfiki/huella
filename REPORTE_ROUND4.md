# REPORTE ROUND 4 — Frases de autores en el taskbar de carga
*Fecha: 2026-05-08 · Commit: 54430b3*

---

## Sin SQL requerido para este round

---

## Qué se implementó

Al crear un plan, la pantalla "Creando tu plan" ahora muestra una frase de autor que cambia con cada una de las 4 fases del taskbar. La frase aparece entre el subtítulo ("Tarda menos de un minuto...") y el listado de pasos.

---

## Archivos tocados

| Archivo | Qué cambió |
|---------|-----------|
| `src/lib/frases.js` | Agregado `FRASES_LOADING`, `HABILIDAD_A_GRUPO_FASE2`, `fraseCarga()` |
| `src/pages/estrategias/components/LoadingDignificado.jsx` | Props `habilidadId`/`hijoEdad`; inicialización de frases; bloque de frase con fade |
| `src/pages/estrategias/components/LoadingDignificado.module.css` | `.fraseWrap`, `.fraseTexto`, `.fraseAutor`, `@keyframes fraseFadeIn` |
| `src/pages/estrategias/EstrategiaNuevaPage.jsx` | Pasa `habilidadId={habilidad.id}` y `hijoEdad={hijo?.edad}` a LoadingDignificado |

---

## Estructura del repertorio de frases

### `fraseCarga(fase, habilidadId, edad)` (exportado desde `src/lib/frases.js`)

Devuelve `{ texto, autor }` aleatorio del grupo correcto según fase, habilidad y edad.

### Grupo Fase 0 — Observación parental (8 frases)
Aparece con: *"Leyendo lo que registraste"*
Autores: T. Berry Brazelton, D.W. Winnicott, Adele Faber, Janet Lansbury
Tema: el valor de observar al hijo sin la urgencia de corregirlo.

### Grupo Fase 1 — Bibliografía por habilidad (9 subgrupos + fallback, 37 frases)
Aparece con: *"Buscando bibliografía pediátrica"*
Mapping habilidad → subgrupo:

| Habilidad | Subgrupo | Autores principales |
|-----------|----------|-------------------|
| `calmarse_explosion`, `concentrarse_calmarse` | `regulacion_emocional` | Siegel, Shanker, Greene |
| `aceptar_no`, `manejar_cambios` | `limites` | Lansbury, Faber, Kohn, Neufeld |
| `relacionarse_ninos` | `social` | Gottman, Neufeld, Cohen |
| `manejar_miedo` | `ansiedad` | Chansky, Lyons, Siegel |
| `mejorar_atencion` | `atencion` | Barkley, Hallowell, Delahooke |
| `autonomia_independencia` | `autonomia` | Brazelton, Lansbury, Vygotsky |
| `rutinas_funcionen` | `rutinas` | Brazelton, Weissbluth, Shanker, Karp |
| `motivacion_autoestima` | `autoestima` | Brown, Kohn, Gottman |
| `dificultades_colegio` | `aprendizaje` | Diamond, Gardner, Vygotsky, Greene |
| Habilidad no reconocida | `fallback` | Brazelton, Siegel, Shanker |

### Grupo Fase 2 — Desarrollo por edad (12 frases)
Aparece con: *"Adaptando a la edad de tu hijo"*
Rangos: 0-2 (Brazelton, Schore, Winnicott), 2-6 (Siegel, Brazelton, Faber), 6-12 (Greene, Diamond, Cohen), 12-18 (Siegel, Damour)

### Grupo Fase 3 — Confianza en el proceso (8 frases)
Aparece con: *"Escribiendo tu plan personalizado"*
Autores: Janet Lansbury, D.W. Winnicott, T. Berry Brazelton, Laura Markham
Tema: paciencia, imperfección parental y ritmo del cambio.

**Total: 51 frases · 27 autores calibrados.**

---

## Decisiones técnicas

**¿Por qué `useState(() => ...)` para inicializar las frases?**
Las 4 frases se inicializan UNA VEZ al montar el componente y no cambian durante la carga. Usar un initializer function en `useState` garantiza que los 4 valores aleatorios se calculen una sola vez y sean consistentes durante toda la pantalla de loading. Si el usuario vuelve a crear un plan, verá frases distintas.

**¿Por qué `key={pasoActual}` en el bloque de frase?**
Al cambiar `key`, React desmonta y remonta el elemento, lo que dispara el `@keyframes fraseFadeIn` automáticamente. Es el patrón idiomático de React para triggear animaciones CSS al cambiar un valor sin usar `useEffect` ni librerías externas.

**¿Por qué no se usó `libro_o_contexto_opcional` (del spec)?**
El componente que consume las frases (`LoadingDignificado`) no renderiza un campo `obra`. El formato existente en `frases.js` tiene `{ texto, autor }`. Se mantuvo la consistencia para no agregar un campo que quedaría sin usar en la UI. Si en el futuro se quiere mostrar el libro, se agrega el campo a las frases que lo necesiten sin romper nada.

---

## Cómo verificar en producción

1. Ir a Estrategias → elegir una habilidad cualquiera → click "Generar mi plan"
2. En la pantalla de loading, **arriba del listado de 4 pasos**, debe aparecer una frase en Fraunces itálica con el autor abajo en pequeño
3. Verificar que la frase CAMBIA al avanzar cada fase (los cambios son rápidos — añadir un `console.log(pasoActual)` temporalmente si se quiere ver más claro, o hacer el proceso intencionalmente lento)
4. Crear dos planes seguidos: las frases deben ser distintas (aleatorio)
5. Elegir una habilidad de regulación emocional y otra de rutinas y comparar la frase de Fase 1 — deben venir de autores distintos

## Limitaciones conocidas

- Los pasos 0→1 en `generar()` son sincrónicos (sin `await` entre ellos), por lo que React puede batchear los dos `setEstado` + `setPasoActual` en un solo render. En la práctica el usuario ve pasoActual=1 al entrar a loading, no pasoActual=0. La frase de fase 0 puede verse muy brevemente o no verse. Esto es un comportamiento de EstrategiaNuevaPage, no de LoadingDignificado — no se tocó porque el spec dice "NO toques nada fuera de la pantalla de carga y archivos de frases".
- Las frases son paráfrasis/ideas atribuidas a los autores, en el mismo estilo del archivo `frases.js` existente en el proyecto. No son citas textuales verificadas de libros.
