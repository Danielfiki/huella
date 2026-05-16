# AUDITORÍA TÉCNICA — Módulo Estrategias
**Fecha:** 2026-05-09  
**Cobertura:** EstrategiasPage, EstrategiaNuevaPage, EstrategiaDetailPage, 11 componentes, helpers.js, frases.js, HuellaContext (secciones de estrategias), anthropic.js (funciones relevantes), todos los CSS modules.  
**Estado:** Solo lectura — ningún archivo modificado.

---

## DIMENSIÓN 1 — Lógica y flujos

### H1.1 — `pasoActual` salta de 0 a 1 directamente, nunca muestra paso 0
**Severidad:** baja  
**Archivo:** `src/pages/estrategias/EstrategiaNuevaPage.jsx` líneas 75-86  
**Descripción:** `generar()` llama `setPasoActual(0)` y después, sin `await`, `setPasoActual(1)`. En React 18 con batching automático, ambas actualizaciones se fusionan en un solo render: el componente nunca pinta el paso 0. El usuario ve directamente el paso 1, que permanece hasta que la IA responde. Luego `setPasoActual(2)` y `setPasoActual(3)` se ejecutan en microsegundos (la normalización es síncrona), así que los pasos 2 y 3 tampoco se ven: el usuario pasa de paso 1 a navegar sin verlos. Las frases de las fases 2, 3 y 4 nunca se muestran.  
**Recomendación:** Añadir `await new Promise(r => setTimeout(r, 0))` entre los pasos para forzar renders intermedios, o simplificar a 2 pasos reales (esperando API / guardando).

---

### H1.2 — Race condition: doble-tap en "Generar mi plan"
**Severidad:** media  
**Archivo:** `EstrategiaNuevaPage.jsx` líneas 49-59, 74  
**Descripción:** `iniciarCreacion()` llama `generar()` que llama `setEstado('generando')`. Pero la re-renderización es asíncrona: si el usuario toca dos veces antes de que React repinte, `generar()` se ejecuta dos veces, disparando dos llamadas a la API de Anthropic y dos inserts en `estrategias`. No hay guard síncrono (ref o flag) que bloquee la segunda invocación.  
**Recomendación:** Añadir `const generando = useRef(false)` y al inicio de `generar()`: `if (generando.current) return; generando.current = true;`. Reset en finally.

---

### H1.3 — `onAvanzar` sin loading state ni error handling
**Severidad:** alta  
**Archivo:** `EstrategiaDetailPage.jsx` líneas 101-123  
**Descripción:** El botón "Avanzar" / "Cerrar el plan" ejecuta un `await supabase.update()` sin: (a) deshabilitar el botón mientras espera (posible doble-tap que crea checkins duplicados), (b) try/catch (si la red cae, el dispatch se ejecuta y el estado local avanza pero la DB no). El plan queda en semana N+1 localmente y en semana N en DB. Al recargar, el usuario vuelve a la semana anterior.  
**Recomendación:** Añadir `const [avanzando, setAvanzando] = useState(false)`, deshabilitar el botón durante la operación, y envolver en try/catch con mensaje de error.

---

### H1.4 — `onToggleTarea` fire-and-forget sin error handling
**Severidad:** media  
**Archivo:** `EstrategiaDetailPage.jsx` líneas 86-99  
**Descripción:** El toggle de tarea actualiza la DB en background sin try/catch. Si falla, la tarea aparece marcada en UI pero no en DB. Al recargar, la tarea vuelve al estado anterior. Además no hay "guardando…" visual, así que el usuario puede seguir tocando otras tareas mientras la primera está en vuelo.  
**Recomendación:** Añadir try/catch con rollback optimista en el estado local de `SemanaActiva` (o mostrar un toast de error).

---

### H1.5 — `abandonarPlanYCrear` no verifica el error de Supabase
**Severidad:** media  
**Archivo:** `EstrategiaNuevaPage.jsx` líneas 61-72  
**Descripción:** El cliente de Supabase JS v2 NO lanza excepciones — devuelve `{data, error}`. La línea `await supabase.from('estrategias').update({abandonado_at}).eq('id', id)` siempre resuelve. El error se ignora. Si la actualización falla (network, RLS), el plan queda activo en DB pero el dispatch lo marca como abandonado localmente. Luego `generar()` crea un nuevo plan, superando el cap real en DB.  
**Recomendación:** Desestructurar: `const { error } = await supabase...update(...)`. Si `error`, mostrar feedback y no llamar `generar()`.

---

### H1.6 — `descartes` carga async; ventana donde sugerencia aparece si debería estar bloqueada
**Severidad:** baja  
**Archivo:** `EstrategiasPage.jsx` líneas 63-72  
**Descripción:** Los descartes se cargan con un `useEffect` asíncrono. Mientras `descartes = []` (estado inicial), `debeMostrarSugerencia` retorna `true` aunque haya un rechazo reciente. El módulo "Sugerencias" puede expandirse brevemente mostrando la sugerencia antes de que los descartes lleguen y la oculten. El flash es breve pero visible.  
**Recomendación:** Añadir `const [cargandoDescartes, setCargandoDescartes] = useState(true)` y no evaluar `sugerenciaVisible` hasta que cargue.

---

### H1.7 — `ESTRATEGIA_CREADA` appende al final, contrario al orden de DB
**Severidad:** baja  
**Archivo:** `HuellaContext.jsx` línea 106  
**Descripción:** `case 'ESTRATEGIA_CREADA': return { ...state, estrategias: [...state.estrategias, action.plan] }`. La DB carga con `order('fecha_inicio', { ascending: false })` (más nuevo primero). Después de crear un plan, el nuevo queda al final del array. El `planActivo = planes.find(...)` puede encontrar un plan más antiguo primero si hay varios activos, mostrando el wrong plan como "Lo que estás trabajando".  
**Recomendación:** Cambiar a `estrategias: [action.plan, ...state.estrategias]`.

---

### H1.8 — EstrategiaDetailPage muestra "Cargando…" indefinido si el plan no existe
**Severidad:** media  
**Archivo:** `EstrategiaDetailPage.jsx` línea 25  
**Descripción:** `if (!plan) return <div className={styles.loading}>Cargando…</div>`. Si el ID en la URL no corresponde a ningún plan (eliminado desde otra tab, URL inválida), el usuario ve "Cargando…" para siempre, sin botón de regreso ni mensaje de error.  
**Recomendación:** Separar el caso "cargando datos" del caso "plan no encontrado". Si `state.estrategias` ya cargó (no está vacío o `dataLoading` es false) y `plan` sigue siendo null, mostrar un estado 404 con botón a `/estrategias`.

---

## DIMENSIÓN 2 — Funcionalidades faltantes

### H2.1 — No existe edición manual de tareas
**Severidad:** baja  
**Descripción:** Confirmado: las tareas generadas por IA no son editables. El usuario puede marcarlas como completadas pero no cambiar su texto. No es un bug, es una funcionalidad ausente.

---

### H2.2 — Acciones destructivas sin confirmación: "Avanzar semana" y "Cerrar el plan"
**Severidad:** media  
**Archivo:** `SemanaActiva.jsx` línea 61 + `EstrategiaDetailPage.jsx` línea 101  
**Descripción:**
| Acción | ¿Tiene confirmación? |
|---|---|
| Eliminar plan (EstrategiasPage) | ✅ Modal con "Eliminar / Cancelar" |
| Eliminar plan (DrawerPasados) | ✅ idem |
| Abandonar plan en modal de cap | ✅ El modal mismo es la confirmación |
| Avanzar a semana siguiente | ❌ Un tap cierra la semana actual sin confirmación |
| Cerrar el plan (última semana) | ❌ Acción irreversible sin confirmación |
| Rechazar sugerencia IA | ❌ El ✕ es inmediato, sin "¿Seguro?" |
| Generar tareas en semana vacía | ✅ (no es destructiva) |

"Cerrar el plan" es la más crítica: es irreversible, requiere reflexión de ≥5 chars y ≥2 tareas completas pero no pide confirmación explícita después de cumplir los requisitos.  
**Recomendación:** Al menos un diálogo de confirmación antes de `onAvanzar` cuando `esUltima === true`.

---

### H2.3 — `onGenerarTareas` falla silenciosamente
**Severidad:** baja  
**Archivo:** `EstrategiaDetailPage.jsx` líneas 63-84  
**Descripción:** Si la API falla al generar tareas, solo hay `console.error`. El botón "Generar tareas de esta semana" vuelve a aparecer sin ningún mensaje al usuario.  
**Recomendación:** Añadir un estado de error local y mostrar "No pudimos generar las tareas. Intenta de nuevo."

---

### H2.4 — No existe "Pausar plan"
**Severidad:** baja  
**Descripción:** Confirmado y documentado en el código: `// Estado del plan (sin "pausado" — esa lógica vendrá en iteración futura)`. Acceptable para la iteración actual.

---

### H2.5 — No existe "Eliminar plan" en EstrategiaDetailPage
**Severidad:** baja  
**Descripción:** Desde la vista de detalle del plan NO hay botón de eliminar. Solo se puede eliminar desde EstrategiasPage. Si el usuario ya está en el detalle y quiere eliminar, debe volver a la lista. No es un bug sino una omisión de conveniencia.

---

### H2.6 — BannerCompletado dice "Tu reflexión final ya quedó guardada en Hitos" — FALSO
**Severidad:** alta  
**Archivo:** `BannerCompletado.jsx` línea 17 + `EstrategiaDetailPage.jsx` líneas 101-123  
**Descripción:** El banner promete que la reflexión final se guardó en Hitos, pero `onAvanzar` solo actualiza `estrategias.completado_at` y `estrategias.checkins`. No existe ningún INSERT en la tabla `hitos` en todo el flujo de completar plan. El botón "Ver tu hito" funciona porque los badges son computados client-side (no requieren registro en DB), pero la frase sobre "reflexión guardada en Hitos" es incorrecta y puede confundir al usuario.  
**Recomendación:** Cambiar el texto del banner a algo verdadero (ej. "Tu plan está completo. Encontrarás el hito de progreso en tu colección."), o implementar el INSERT en `hitos` al completar el plan.

---

## DIMENSIÓN 3 — Coherencia visual

### H3.1 — Colores hardcodeados `#D94040`, `#fff` y `rgba()` en CSS modules
**Severidad:** baja  
**Archivos:**
- `DrawerPasados.module.css` línea 15: `.del:hover { color: #D94040; }` → debería ser `var(--color-danger)`
- `EstrategiaActivaCard.module.css` línea 25: `.del:hover { color: #D94040; }` → idem
- `HeaderMocha.module.css`: `rgba(255,255,255,0.12)`, `rgba(255,255,255,0.14)`, `rgba(255,255,255,0.18)`, `rgba(255,255,255,0.15)` — no tienen tokens equivalentes
- `EstrategiasPage.module.css`, `EstrategiaNuevaPage.module.css`: `rgba(0,0,0,0.45)` para overlay y `rgba(0,0,0,0.3)` para sombras de modal — podrían tener tokens
- Múltiples archivos: `color: #fff` en botones primarios — existe `var(--color-white)` pero no se usa

**Recomendación:** Reemplazar `#D94040` → `var(--color-danger)` (ya existe). Para los `rgba` de HeaderMocha sobre mocha, crear tokens `--color-mocha-overlay-12`, etc. Para `#fff` en botones, usar `var(--color-white)`.

---

### H3.2 — CTAs del módulo: consistencia de color
**Severidad:** baja  
| CTA | Color actual | ¿Correcto? |
|---|---|---|
| "Ver tu semana N" (EstrategiaActivaCard) | Tangerine ✅ | ✅ |
| "Empezar este plan" (SugerenciaIACard) | Tangerine ✅ | ✅ |
| "Avanzar / Cerrar plan" (SemanaActiva → Button) | Heredado del componente Button | A verificar |
| "Generar mi plan" (EstrategiaNuevaPage → Button) | Heredado del componente Button | A verificar |
| "Ver tu hito" (BannerCompletado) | Tangerine ✅ | ✅ |
| "Usar este texto" (SelectorHabilidades) | Tangerine ✅ | ✅ |
| "Eliminar" (modal) | Rojo (#D94040) ✅ | ✅ (destructivo) |
| ✕ Eliminar (EstrategiaActivaCard, DrawerPasados) | Muted → rojo en hover ✅ | ✅ |

El componente `Button` de UI general se usa en SemanaActiva y EstrategiaNuevaPage. No se auditó `Button.jsx` — si usa tangerine por defecto, todo OK; si usa otro color, habría inconsistencia.

---

### H3.3 — Doble header: no encontrado
**Severidad:** ninguna  
**Descripción:** El Layout de la app usa navegación bottom tab (no top bar). HeaderMocha es el único header visible en las 3 páginas de Estrategias. No hay doble header.

---

### H3.4 — Tipografía: usos fuera de patrón
**Severidad:** baja  
**Descripción:** Fraunces se usa correctamente en títulos (h1, h2, h3, `.ttl`, `.skillNombre`, etc.). Plus Jakarta Sans en body/labels. Un uso a revisar: `.ask` en `SemanaActiva.module.css` usa `font-family: var(--font-heading)` a 16px para la pregunta del check-in — es un caso borderline (título pequeño de sección vs texto de body). Consistente con el estilo general del módulo.

---

### H3.5 — `--color-celebration-end` como background del checkin en SemanaActiva
**Severidad:** baja  
**Archivo:** `SemanaActiva.module.css` línea 14  
**Descripción:** `.checkin { background: var(--color-celebration-end); }` — usa un token de celebración para la sección de check-in semanal. Este token es correcto semánticamente (colores cálidos/positivos), pero si el token se modifica para ajustar el banner de celebración, el checkin cambiaría de color también. Considerar un token dedicado.

---

## DIMENSIÓN 4 — Estados de la pantalla principal

### H4.1 — Con 2-3 planes activos, solo el primero es visible
**Severidad:** alta  
**Archivo:** `EstrategiasPage.jsx` líneas 37-44  
**Descripción:** El sistema permite hasta 3 planes activos simultáneos (MAX_PLANES_ACTIVOS_FREE = 3), pero la pantalla principal usa `planes.find(...)` que retorna el primero encontrado. Con 2 planes activos, el segundo es completamente inaccesible desde la pantalla principal. No aparece en ninguna sección. El usuario que creó 2 planes activos en sesiones distintas puede pensar que el segundo desapareció.

**Estado de renders por configuración:**

| Escenario | Render actual | ¿Problema? |
|---|---|---|
| Sin episodios | Sugerencias colapsadas, EmptyPuerta1 "Empieza registrando..." | ✅ |
| 1-2 episodios | EmptyPuerta1 "Llevas N momentos..." | ✅ |
| 3-4 episodios sin patrón | EmptyPuerta1 (IA no detecta patrón) | ✅ |
| 3-4 episodios con patrón | SugerenciaIACard | ✅ |
| ≥5 episodios, filtro bloquea | EmptyPuerta1 postRechazo | ✅ |
| Sugerencia disponible, nueva | Módulo auto-expande, badge "1 nueva" | ✅ |
| Sugerencia rechazada reciente | EmptyPuerta1 postRechazo | ✅ (si SQL corrido) |
| Sin planes activos | Sugerencias + Selector | ✅ |
| 1 plan activo | EstrategiaActivaCard del único | ✅ |
| 2 planes activos | Solo el primero visible; el segundo inaccesible | ❌ |
| 3 planes activos | Solo el primero visible; los otros 2 inaccesibles | ❌ |
| 3 activos + intento de crear | Modal de cap con los 3 planes | ✅ |
| Solo planes en historial | DrawerPasados colapsado | ✅ |
| 2 activos + 1 completado + sugerencia | 1er activo visible; sugerencias ocultas (sin plan activo es false) | ❌ Sugerencias se ocultan aunque hay slots disponibles |

**Recomendación:** Cambiar `planActivo` (singular) a `planesActivos` (array) y renderizar una card por cada plan activo. Ajustar la lógica de "Sugerencias" para que aparezca cuando `planesActivos.length < MAX_PLANES_ACTIVOS_FREE`.

---

## DIMENSIÓN 5 — Feedback al usuario

### H5.1 — Ausencia de feedback tras acciones completadas
**Severidad:** media  

| Acción | Toast / Feedback | Estado |
|---|---|---|
| Plan creado exitosamente | Navegación directa a detail, sin toast | ❌ |
| Plan completado | BannerCompletado en detail | ✅ |
| Plan eliminado | Modal desaparece, plan desaparece de lista | ❌ Sin "Plan eliminado" |
| Sugerencia rechazada | Desaparece silenciosamente | ❌ |
| Semana avanzada | Detail se re-renderiza con nueva semana activa | ✅ (implícito) |
| Error de red en avanzar | Nada visible al usuario | ❌ |

---

### H5.2 — Loading states ausentes en operaciones async
**Severidad:** media  

| Operación async | Loading state | Estado |
|---|---|---|
| Generar plan (IA + DB) | LoadingDignificado completo | ✅ |
| Detectar patrones | "Analizando tus registros…" | ✅ |
| Toggle tarea | Ninguno | ❌ |
| Avanzar semana | Ninguno (botón no se deshabilita) | ❌ |
| Eliminar plan | Ninguno (modal desaparece, lista se actualiza) | ❌ |
| Abandonar plan (cap) | "Cerrando…" en el botón | ✅ |
| Generar tareas vacías | "Generando tareas…" en botón | ✅ |

---

## DIMENSIÓN 6 — Consistencia interna y code smells

### H6.1 — `addEstrategia` en HuellaContext es dead code
**Severidad:** baja  
**Archivo:** `HuellaContext.jsx` líneas 524-554  
**Descripción:** La función `addEstrategia` existe y se expone en el contexto pero no es usada por ninguna página. EstrategiaNuevaPage hace el INSERT directamente con `supabase.from('estrategias').insert()` y su propio dispatch. Hay dos caminos paralelos de creación de estrategias que pueden divergir.  
**Recomendación:** Consolidar en uno: que EstrategiaNuevaPage use `addEstrategia`, o marcar la función del contexto como obsoleta y eliminarla.

---

### H6.2 — `updateEstrategia` en HuellaContext casi nunca se usa
**Severidad:** baja  
**Archivo:** `HuellaContext.jsx` líneas 556-572  
**Descripción:** Similar al punto anterior. EstrategiaDetailPage hace sus propias actualizaciones directas a Supabase + dispatch(UPDATE_ESTRATEGIA). La función `updateEstrategia` del contexto no se usa en el flujo nuevo.

---

### H6.3 — `seleccionada` prop de `SelectorHabilidades` nunca se pasa
**Severidad:** baja  
**Archivo:** `SelectorHabilidades.jsx` línea 5 + `EstrategiasPage.jsx` línea 250  
**Descripción:** El componente acepta una prop `seleccionada` para activar el estado `.on` (tangerine) en el chip seleccionado. Pero la llamada es `<SelectorHabilidades onElegir={onElegirHabilidad} />` — sin `seleccionada`. El estado visual de chip activo nunca se activa. En este módulo no importa mucho (la selección navega de inmediato), pero es una prop muerta que confunde.

---

### H6.4 — Clase CSS `.dotDot` declarada pero no usada
**Severidad:** baja  
**Archivo:** `EstrategiasPage.module.css` línea 10  
**Descripción:** `.dotDot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-tangerine); }` no se referencia en el JSX de EstrategiasPage.

---

### H6.5 — `habilidad_nombre` y `habilidad` son la misma columna DB
**Severidad:** baja  
**Archivo:** `HuellaContext.jsx` líneas 207-208  
**Descripción:** En `dbEstrategiaToApp`: `habilidad: row.habilidad` y `habilidad_nombre: row.habilidad ?? null` mapean la misma columna DB. No hay columna `habilidad_nombre` en la DB. Es un alias útil pero puede crear confusión al mantener dos keys con el mismo valor.

---

### H6.6 — `SemanaActiva` tiene fuente de verdad local desincronizable del context
**Severidad:** media  
**Archivo:** `SemanaActiva.jsx` línea 7  
**Descripción:** `const [tareas, setTareas] = useState(...)` inicializa una vez al montar. El `key={actual}` en EstrategiaDetailPage obliga remount al cambiar de semana, lo que reinicializa el estado. Pero dentro de la misma semana, si el context actualiza `plan.plan.semanas` (ej: desde otro tab, o si `onAvanzar` hace un full reload), SemanaActiva no refleja el cambio porque su useState no se reinicializa. El "fix del Round 1" resolvió el bug entre semanas pero no el bug dentro de la misma semana.

---

### H6.7 — `SelectorHabilidades` no bloquea habilidades ya trabajadas
**Severidad:** media  
**Archivo:** `EstrategiasPage.jsx` líneas 104-117  
**Descripción:** `habilidadesExcluidas` se calcula pero solo se usa para filtrar `sugerenciaFiltrada` (Puerta 1). El `SelectorHabilidades` (Puerta 2) muestra las 11 habilidades sin ningún indicador visual de cuáles están activas o en los últimos 90 días. El usuario puede crear un plan duplicado para la misma habilidad manualmente.  
**Recomendación:** Pasar `habilidadesExcluidas` a SelectorHabilidades y mostrar los chips excluidos con opacidad reducida + tooltip "Ya en progreso".

---

### H6.8 — Modal overlay con `rgba` hardcodeado — dos implementaciones duplicadas
**Severidad:** baja  
**Archivos:** `EstrategiasPage.module.css` líneas 16-22 y `EstrategiaNuevaPage.module.css` líneas 27-35  
**Descripción:** Los modales de ambas páginas tienen el mismo código CSS duplicado (`.modalOverlay`, `.modalCard`, `.modalTtl`, `.modalSub`, `.modalCancel`). Son estructuralmente idénticos. Un componente `Modal` compartido evitaría la duplicación.

---

## DIMENSIÓN 7 — Persistencia y datos

### H7.1 — Columna `plan` sigue siendo TEXT (migración opcional pendiente)
**Severidad:** baja  
**Descripción:** `parsePlanField()` en HuellaContext compensa el parse en el cliente. Funcional. Pero es deuda técnica documentada. El SQL opcional para convertirla a JSONB no se ha corrido.

---

### H7.2 — Columna `episodios_count_al_rechazar` no existe → regla de 5 episodios rota
**Severidad:** alta  
**Archivo:** `helpers.js` líneas 147-158 + SQL pendiente del Round 2  
**Descripción:** El SQL `ALTER TABLE estrategia_sugerencias_descartadas ADD COLUMN IF NOT EXISTS episodios_count_al_rechazar integer DEFAULT 0` no se ha corrido. Cuando Supabase devuelve un descarte sin esa columna, `ultimoRechazo.episodios_count_al_rechazar` es `undefined`. `undefined ?? 0` = `0`. La condición `totalEpisodios - 0 >= 5` se cumple en cuanto hay 5 episodios en total (no 5 NUEVOS desde el rechazo). La sugerencia reaparece prematuramente.  
**Recomendación:** Correr el SQL pendiente. Prioridad alta — es la única acción que bloquea el correcto funcionamiento de la regla de descarte del Round 2.

---

### H7.3 — Columna `tareas` (legacy) en la tabla es dead column
**Severidad:** baja  
**Descripción:** `dbEstrategiaToApp` mapea `tareas: row.tareas ?? {}`. Esta es la columna `tareas` JSONB anterior al rediseño. En la nueva arquitectura, las tareas viven en `plan.semanas[].tareas`. La columna `tareas` existe en DB pero ya no se escribe ni se lee con propósito. Es deuda de esquema.

---

### H7.4 — `onCerrarSugerencia` no verifica el error del insert en Supabase
**Severidad:** baja  
**Archivo:** `EstrategiasPage.jsx` líneas 181-194  
**Descripción:** `await supabase.from('estrategia_sugerencias_descartadas').insert(reg)` — el resultado no se verifica. Si el insert falla (columna `episodios_count_al_rechazar` no existe, error de RLS, network), el rechazo se guarda en el estado local `descartes` pero no en DB. Al recargar, el rechazo desaparece y la sugerencia vuelve.  
**Recomendación:** Verificar `{error}` del insert y hacer rollback de `setDescartes` si falla.

---

### H7.5 — checkins default `{}` no normalizado a `[]` en el mapper
**Severidad:** baja  
**Archivo:** `HuellaContext.jsx` línea 212  
**Descripción:** `checkins: Array.isArray(row.checkins) ? row.checkins : (row.checkins ?? [])` — si `row.checkins` es `{}` (objeto vacío, el valor por defecto que puede venir de Supabase JSONB), `Array.isArray({})` es false y `{} ?? []` retorna `{}` porque `{}` no es null/undefined. El resultado es `checkins = {}`. EstrategiaDetailPage se protege: `Array.isArray(plan.checkins) ? plan.checkins : []`. Pero es frágil.  
**Recomendación:** Cambiar el mapper a: `checkins: Array.isArray(row.checkins) ? row.checkins : []`.

---

## DIMENSIÓN 8 — Edge cases y bugs latentes

### H8.1 — `detectarPatronesEstructurado` puede devolver episodios_ids inventados
**Severidad:** baja  
**Archivo:** `helpers.js` líneas 104-117  
**Descripción:** El modelo de IA puede alucinar UUIDs de episodios que no existen. El `.filter(Boolean)` en `buildSugerenciaFromInterpretacion` elimina los no encontrados. Si todos los IDs son alucinados, `detonantes.length === 0` → `return null` (correcto). Si algunos son reales y otros no, la sugerencia se muestra con menos episodios detonantes de los que el modelo analizó. No produce crash, pero la narrativa puede estar desalineada con los episodios reales.

---

### H8.2 — Plan sin `semanas` renderiza body vacío sin mensaje de error
**Severidad:** media  
**Archivo:** `EstrategiaDetailPage.jsx` líneas 28-30  
**Descripción:** `const semanas = plan.plan?.semanas || []`. Si `plan.plan` es null (parsePlanField falló porque el JSON guardado estaba corrupto) o no tiene `semanas`, el array queda vacío. Con `actual = 1` y semanas vacías: ningún `<SemanaActiva>` se renderiza (porque `semanasConReflexion[actual - 1]` = undefined), ningún `<SemanaPasada>` ni `<SemanaFutura>`. El body está vacío excepto por el HeaderMocha. El usuario ve una pantalla en blanco sin saber qué pasó.  
**Recomendación:** Agregar un guard: `if (semanas.length === 0) return <EmptyState message="El plan no se cargó correctamente" onRetry={...} />`

---

### H8.3 — Duplicados por misma habilidad: no hay guard
**Severidad:** media  
**Archivo:** `SelectorHabilidades.jsx`, `EstrategiaNuevaPage.jsx`  
**Descripción:** No existe ningún check que impida crear dos planes activos para la misma habilidad. El filtro de 90 días aplica solo a Puerta 1 (sugerencia IA). El selector manual (Puerta 2) no valida. Un usuario puede tener dos planes activos de "Calmarse cuando explota" simultáneamente.

---

### H8.4 — `sugerenciaPrecocida` desde `location.state` no se limpia
**Severidad:** baja  
**Archivo:** `EstrategiasPage.jsx` línea 22  
**Descripción:** `const sugerenciaPrecocida = location.state?.sugerencia_precocida ?? null`. Si el usuario navega Panel → Estrategias (con sugerencia precocida) → detalle → volver (con navigate(-1)), React Router borra el `location.state`. La segunda visita a Estrategias en la misma sesión llama a la API para detectar patrones de nuevo. Comportamiento correcto pero puede generar una llamada API extra innecesaria en el mismo día.

---

## RANKING DE PRIORIDAD — Top 10

| # | Hallazgo | Dimensión | Severidad | Qué hacer |
|---|---|---|---|---|
| 1 | **SQL `episodios_count_al_rechazar` no corrido** — regla de 5 episodios rota | H7.2 | Alta | Correr el ALTER TABLE en Supabase SQL Editor |
| 2 | **BannerCompletado dice "reflexión guardada en Hitos" — no ocurre** | H2.6 | Alta | Cambiar texto del banner o implementar el INSERT en hitos |
| 3 | **Con 2-3 planes activos, solo el primero es visible** | H4.1 | Alta | Cambiar a array `planesActivos` en EstrategiasPage |
| 4 | **`onAvanzar` sin loading ni error handling** — doble-tap crea checkins duplicados; fallo de red pasa silencioso | H1.3 | Alta | Añadir estado `avanzando`, deshabilitar botón, try/catch |
| 5 | **`onToggleTarea` fire-and-forget** — fallo de red desincroniza UI y DB | H1.4 | Media | try/catch con rollback optimista en estado local |
| 6 | **Doble-tap en "Generar mi plan"** — dos API calls + dos inserts | H1.2 | Media | Añadir guard síncrono con `useRef` |
| 7 | **`abandonarPlanYCrear` no verifica error de Supabase** — cap puede superarse en DB | H1.5 | Media | Desestructurar `{error}` y validar antes de llamar `generar()` |
| 8 | **No hay confirmación antes de "Cerrar el plan"** — acción irreversible | H2.2 | Media | Dialog de confirmación cuando `esUltima === true` |
| 9 | **SelectorHabilidades muestra habilidades excluidas sin indicación** | H6.7 | Media | Pasar `habilidadesExcluidas` y renderizar chips con opacidad reducida |
| 10 | **EstrategiaDetailPage muestra "Cargando…" indefinido si el plan no existe** | H1.8 | Media | Detectar plan inexistente (cuando dataLoading=false y plan=null) y mostrar 404 con back |

---

## HALLAZGOS ADICIONALES (fuera del top 10)

- **`#D94040` hardcodeado** en DrawerPasados y EstrategiaActivaCard → reemplazar por `var(--color-danger)`
- **`addEstrategia` y `updateEstrategia` en HuellaContext son dead code** en el flujo nuevo
- **`seleccionada` prop en SelectorHabilidades** nunca se pasa desde ninguna página
- **Clase CSS `.dotDot`** declarada en EstrategiasPage.module.css sin uso en el JSX
- **`checkins: row.checkins ?? []`** debería ser el default en el mapper para evitar el `{}` edge case
- **Modal overlay CSS duplicado** entre EstrategiasPage y EstrategiaNuevaPage — candidato a componente compartido
- **`onGenerarTareas` falla silenciosamente** — añadir estado de error visual
- **Plan con `semanas: []`** renderiza body vacío sin mensaje — añadir guard

---

*Fin de auditoría. No se modificó ningún archivo.*
