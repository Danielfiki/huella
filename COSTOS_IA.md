# COSTOS_IA.md — Costo de IA por llamada (Huella)

> Doc de referencia para validar el modelo de precios y planear optimizaciones. **No es código ni configuración** — es la foto del costo de IA al 2 jun 2026.
> Origen: auditoría de `api/anthropic.js` + `src/services/anthropic.js`.

## Modelo

**Todas las llamadas usan `claude-sonnet-4-5`**, hardcodeado en `api/anthropic.js:249`. No hay variación por tipo de llamada (ni Haiku para tareas baratas, ni Opus para nada). Un solo modelo para todo.

> Nota: `claude-sonnet-4-5` es un modelo *legacy pero activo*. Migrar a `claude-sonnet-4-6` (o evaluar Haiku para llamadas baratas) es una decisión aparte, fuera de este doc.

## El gran driver de costo: andamiaje clínico fijo (y duplicado)

Cada llamada que pasa por `llamarAPI()` (casi todas) carga texto clínico fijo enorme, y hay **duplicación** entre dos bloques:

- **Backend `SYSTEM_PROMPT`** (`api/anthropic.js:48-209`): ~22.900 caracteres ≈ **~6.200 tokens**. Se envía en TODAS las llamadas `llamarAPI()` porque el cliente no manda `system` propio → cae al default.
- **Cliente `marcoEdad()`** (`src/services/anthropic.js:542-639`): marco científico por edad + bloque `TEMAS_CONTEMPORANEOS`. Juntos ≈ 19.600 caracteres ≈ **~5.300 tokens**. Se antepone al `prompt` en 9 de las funciones.

→ Las llamadas "pesadas" arrastran **~11.500 tokens de scaffolding casi fijo** antes de un solo dato del usuario. **Hoy no hay prompt caching**, así que esos ~11.500 tokens se re-facturan a precio completo de input en cada llamada.

*(Conversión usada: español ≈ 3,7 caracteres/token. Son estimaciones, no conteos exactos del tokenizer.)*

## Tabla por tipo de llamada

| Tipo de llamada | Función | Modelo | Tokens input aprox | max_tokens output |
|---|---|---|---|---|
| Acción inmediata (post-episodio) | `generarAccionInmediata` | sonnet-4-5 | ~6.600 *(sys, sin marco)* | 600 |
| Análisis de episodio | `analizarEpisodio` | sonnet-4-5 | ~11.800 *(sys+marco+1 ep+5 recientes)* | 1.400 |
| Interpretar patrones | `interpretarPatrones` | sonnet-4-5 | ~12.300 *(sys+marco+hasta 20 eps)* | 2.500 |
| Detectar patrones (estructurado) | `detectarPatronesEstructurado` | sonnet-4-5 | ~8.000–9.000 *(sys+prompt propio+30 eps)* | 1.024 |
| Consejo diario | `generarConsejoDiario` | sonnet-4-5 | ~11.900 *(sys+marco+hasta 8 eps)* | 200 |
| Generar estrategia (Puerta 2) | `generarEstrategia` | sonnet-4-5 | ~11.650 *(sys+marco+habilidad)* | 4.000 |
| Generar estrategia desde texto (Puerta 1 libre) | `generarEstrategiaDesdeContexto` | sonnet-4-5 | ~11.900 *(sys+marco+catálogo+texto)* | 4.000 |
| Generar ciclo N (nuevo ciclo) | `generarCicloN` | sonnet-4-5 | ~12.000 *(sys+marco+ciclo anterior)* | 4.000 |
| Analizar cierre de ciclo | `analizarCierreCiclo` | sonnet-4-5 | ~12.000–13.000 *(sys+marco+notas+eps vinculados)* | 2.000 |
| Generar tareas semanales | `generarTareas` | sonnet-4-5 | ~11.650 *(sys+marco+habilidad)* | 700 |
| Celebrar hito | `celebrarHito` | sonnet-4-5 | ~11.600 *(sys+marco+hito)* | 180 |
| Reflexión check-in | `generarReflexionCheckin` | sonnet-4-5 | ~6.400 *(sys, sin marco)* | 250 |
| Analizar reflexiones cuidador | `analizarReflexionesCuidador` | sonnet-4-5 | ~6.400 *(sys, sin marco)* | 250 |
| Primer encuentro (onboarding) | `requestPrimerEncuentro` | sonnet-4-5 | ~1.200 *(system propio, NO usa SYSTEM_PROMPT)* | 200 |

**Notas:**
- `max_tokens` es el tope de salida, no lo que sale siempre. Las de estrategia (4.000) son las que más output generan en la práctica (JSON de 4 semanas).
- `requestPrimerEncuentro` es la única barata de input: pasa su propio `system` (~1.060 tokens) que reemplaza al `SYSTEM_PROMPT`.
- `interpretarPatrones` y `detectarPatronesEstructurado` son dos funciones de patrones distintas que coexisten.

## Límites de uso

- **`DAILY_LIMIT = 20`** llamadas a la IA por usuario/día (`api/anthropic.js:3`), trackeadas en la tabla `api_llamadas`. Al pasarse → 429 "Alcanzaste el límite de 20 consultas diarias."
- **`OWNER_ID`** hardcodeado (UUID de Daniel) → **sin límite** (override).
- No hay otros límites de API. (El cap de 15 episodios free y `MAX_PLANES_ACTIVOS_FREE=3` son límites de producto, no de llamadas a la IA.)

## Estimación de costo (supuesto de precio explícito)

Tarifa pública estándar de Sonnet: **$3/M tokens input, $15/M tokens output**. (Confírmala en la cuenta antes de modelar — es supuesto, no dato verificado.)

Costo aproximado por llamada, **sin caching**:
- **Análisis de episodio:** ~11.800 in × $3 + ~1.000 out × $15 ≈ **$0,050**
- **Generar estrategia:** ~11.700 in × $3 + ~3.500 out × $15 ≈ **$0,088**
- **Acción inmediata:** ~6.600 in × $3 + ~400 out × $15 ≈ **$0,026**

Peor caso teórico (20 llamadas/día llenas de estrategias ~$0,09): **~$1,8/día ≈ ~$54/mes** contra un precio de $5.990 CLP/mes (~$6 USD). El caso promedio es mucho más bajo, pero el peor caso teórico se come el margen.

## Palanca de optimización: prompt caching

El mayor ahorro disponible es **cachear el `SYSTEM_PROMPT`** (idéntico en todas las llamadas) con `cache_control`. Antes se pagaba ~6.200 tokens de input clínico repetido a precio completo en cada llamada. Con caching, ese bloque se cobra a ~0,1× tras la primera llamada.

**Fase 1 — EN PRODUCCIÓN, verificada (2 jun 2026, commit `c89f104`).** Se cachea el `SYSTEM_PROMPT` con `cache_control: ephemeral` (`api/anthropic.js`). Logs de Vercel confirmaron `cache_creation_input_tokens: 6844` en la primera llamada y `cache_read_input_tokens: 6844` en las siguientes → recorta ~⅓ del costo de las llamadas pesadas.

**Fase 2 — pendiente.** Cachear también el `marcoEdad()` (~5.300 tokens, 4 variantes por edad) como segundo breakpoint en el `system`. Requiere cambiar el contrato cliente↔backend (mandar el marco separado de los datos del episodio). Recortaría otro ~⅓. Hacerlo después de tener datos reales de la Fase 1.
