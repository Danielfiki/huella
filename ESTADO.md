# ESTADO.md — Proyecto Huella

## Stack técnico
- Frontend: React + Vite
- IA: API de Anthropic, modelo claude-sonnet-4-5
- Auth y DB: Supabase
- Deploy: Vercel (huella-theta.vercel.app)
- Repo: github.com/Danielfiki/huella
- Ruta local: C:\Users\dundu\OneDrive\Desktop\florecia

## Credenciales
> ⚠️ No escribir valores reales aquí — usar `.env` local y el dashboard de cada servicio.
- Anthropic API key: ver `.env` → `ANTHROPIC_API_KEY`
- Supabase URL: ver `.env` → `VITE_SUPABASE_URL`
- Supabase Anon Key: ver `.env` → `VITE_SUPABASE_ANON_KEY`
- GitHub token: ver settings de GitHub personal
- GitHub usuario: Danielfiki

## Comando para abrir Claude Code
```
$env:PATH += ";C:\Users\dundu\.local\bin"; cd C:\Users\dundu\OneDrive\Desktop\florecia; claude --dangerously-skip-permissions
```

---

## Módulos implementados ✅

### 1. Registro de episodios
- Tipo, intensidad (1-5), contexto libre, gatillantes, estado emocional del padre
- Llama a la IA al guardar y muestra orientación de inmediato
- Guarda orientación de IA en Supabase (`orientacion_ia`)

### 2. Orientación de IA
- System prompt completo con 35+ referentes (Siegel, Perry, van der Kolk, Schore, Porges, Bowlby, Ainsworth, Hughes, Neufeld, Johnson, Greene, Shanker, Delahooke, Greenspan, Lansbury, Kohn, Markham, Faber, Cohen, Vygotsky, Piaget, Bronfenbrenner, Gardner, Gopnik, Levine, Maté, Bryson)
- Formato: Qué está pasando / Qué hacer ahora / Qué evitar
- Termina con disclaimer clínico + Marco aplicado
- Archivo: `api/anthropic.js` (Vercel serverless) + `src/services/anthropic.js` (cliente)
- Modelo: claude-sonnet-4-5

### 3. Panel de inicio con gráficos reales
- Saludo + botón de registro destacado
- ResumenSemanal: episodios últimos 7 días, intensidad promedio, tipo más frecuente
- 3 gráficos (visibles desde 3+ episodios): frecuencia semanal, intensidad en el tiempo, gatillantes más frecuentes — todos con datos reales de Supabase
- Análisis de patrones con IA (botón on-demand)

### 4. Historial
- Episodios agrupados por día (Hoy / Ayer / fecha)
- Card: tipo con emoji, hora, badge de intensidad, contexto, gatillantes
- Botón expandible "Ver orientación de Huella" (si existe)
- **Requiere migración SQL**: `alter table public.episodios add column if not exists orientacion_ia text;`

### 5. Estrategias
- El padre elige habilidad + contexto opcional
- Plan de 4 semanas generado por IA
- Vista detalle semana a semana con estrategia e indicador
- Semana activa resaltada, completadas con checkmark, próximas bloqueadas
- "Avanzar a semana N" persiste en Supabase
- Banner de plan completado al terminar semana 4

### 6. Hitos positivos
- Categorías predefinidas + descripción libre
- Guardado en Supabase

### 7. Perfil del hijo
- Formulario nombre + edad, guardado en tabla `hijos` de Supabase con upsert
- Estadísticas de actividad (episodios, hitos, estrategias)
- Email de cuenta y botón de cerrar sesión

### 8. Onboarding de bienvenida *(corregido 2026-04-19)*
- 4 pantallas con gradientes, partículas flotantes y animaciones
- Swipe táctil + botones + puntos de progreso
- Botón "Saltar" en pantallas 1-3
- CTA "Empezar ahora →" en la última pantalla
- **Bug corregido hoy**: la clave de localStorage era global (`huella_onboarding_v1`), ahora es por usuario (`huella_onboarding_v1_{userId}`), lo que asegura que cada usuario nuevo vea el onboarding independientemente del dispositivo

### 9. Autenticación
- Login y signup con email + contraseña
- Rutas protegidas (ProtectedRoute)
- Cerrar sesión desde PerfilPage

### 10. Base de datos Supabase
Tablas con Row Level Security activo:
- `hijos`: id, user_id, nombre, edad, created_at
- `episodios`: id, user_id, tipo, intensidad, contexto, gatillantes[], estado_padre, fecha, orientacion_ia
- `hitos`: id, user_id, categoria, descripcion, fecha
- `estrategias`: id, user_id, habilidad, descripcion, plan, fecha_inicio, semana_actual

### 11. PDF clínico exportable *(mejorado 2026-05-06)*
- Botón "Descargar informe PDF" en el historial (lazy-loaded via `PDFSection.jsx`)
- **Secciones del informe** (en orden):
  1. **Vista General**: contexto del hijo, 3 métricas con % delta (últimos 30 días vs período anterior), conteos de estrategias activas/completadas. Cuando no hay período previo, muestra snapshot histórico total + primer registro + mensaje contextual.
  2. **Resumen Ejecutivo**: análisis de patrones generado por IA (`interpretarPatrones`)
  3. **Análisis clínico** por sección: gatillantes frecuentes, estrategias activas, hitos positivos
  4. **Reflexiones del Cuidador**: análisis IA empático de hasta 10 reflexiones. Muestra las 3 más recientes con fecha y tipo de episodio. Se omite si hay menos de 3 reflexiones con texto.
  5. Episodios completos con orientación IA por episodio
- **Manejo de errores IA**: si falla la llamada a Anthropic, muestra estado de error con botón "Reintentar" y opción "Descargar sin resumen" (con texto placeholder)
- **Fuentes tipográficas** *(resuelto 2026-05-06)*:
  - 9 archivos TTF estáticos en `/public/fonts/` (un archivo por peso/estilo, sin variable fonts)
  - Plus Jakarta Sans: Regular, Medium, SemiBold, Bold, Italic
  - Fraunces: `_72pt-Regular`, `_72pt-SemiBold`, `_72pt-Bold`, `_72pt-Italic`
  - `Font.registerHyphenationCallback(word => [word])` como mitigación GSUB adicional
  - Tabla GSUB eliminada de los 9 TTF con `scripts/strip-gsub.mjs` (renombra el tag GSUB→XSUB en el binario — fontkit no la encuentra y nunca aplica sustituciones de ligaduras fi/fl)
- **Formato del texto IA en el PDF** *(resuelto 2026-05-06)*:
  - La IA devuelve texto plano (sin markdown). Los títulos de sección se detectan por string exacto en `renderOrientacion` y se pintan con `s.mdHeading` (negrita, color terracota)
  - `SECTION_TITLES` Set en `InformePDF.jsx` con los 7 títulos reconocidos: "Qué está pasando", "Qué hacer ahora", "Qué evitar", "Lo que está mejorando", "Lo que merece atención", "Posibles causas", "Próximos pasos sugeridos"
  - El check de `**texto**` se mantiene como fallback para orientaciones antiguas guardadas en Supabase

---

## Módulos sin empezar ❌

### ~~Modo pareja~~ ✅ Listo 2026-04-21
- Invitación por email (Resend) + link copiable desde PerfilPage
- Token único con expiración de 7 días (`partner_invitations`)
- Aceptación en `/invitar?token=xxx` (ruta pública)
- Datos compartidos vía RLS con función `get_family_user_ids` — sin cambios en queries del frontend
- Solo el invitante (role='owner') puede desconectar la pareja
- `FamilyContext.jsx`: estado de familia, invitePartner, cancelInvitation, disconnectPartner
- SQL: 3 tablas nuevas + 6 funciones RPC + RLS actualizado en todas las tablas de datos
- **Requiere**: correr el bloque SQL de Modo Pareja en Supabase → SQL Editor
- **Requiere**: variable `RESEND_API_KEY` en Vercel (y opcionalmente `RESEND_FROM_EMAIL`)

### Notificaciones inteligentes
Recordar registrar, alertar patrones nuevos, avisar fechas de evaluación de estrategias.

### Voz a texto
Botón de micrófono en el formulario de registro. Reduce fricción a cero en el momento del episodio.

### Directorio de especialistas
Fase 2 del modelo de negocio. Suscripción mensual para profesionales.

---

## Lo que falta para que Huella sea 100% operativa para usuarios reales

### 🔴 Crítico — bloquea el lanzamiento

**~~1. Rate limiting en la API de Anthropic~~** ✅ Listo 2026-04-19
- Límite: 20 llamadas/día por usuario
- `api/anthropic.js` verifica el JWT del usuario contra tabla `api_llamadas` en Supabase
- `src/services/anthropic.js` envía el token de sesión en el header `Authorization`
- Falla abierta si la tabla no existe (no rompe la app si no se ha corrido el SQL)
- ⚠️ **Requiere migración SQL** (ver sección al final)

**~~2. UX de confirmación de email post-registro~~** ✅ Listo 2026-04-19
- `SignupPage.jsx` muestra pantalla "📬 Revisa tu correo" con el email del usuario
- Botón "Ir a iniciar sesión" + opción "intenta de nuevo"
- Ya no redirige a `/panel` (lo que causaba pantalla en blanco si el email no estaba confirmado)

**~~3. Error boundary global~~** ✅ Listo 2026-04-19
- `main.jsx`: ErrorBoundary global con botón "Recargar app", link "Volver al inicio", y stack trace visible solo en desarrollo
- `App.jsx`: PageErrorBoundary por ruta — si una página crashea, solo esa sección falla; el resto de la app sigue funcionando
- Botón "Reintentar" en PageErrorBoundary para intentar rerenderizar sin recargar

### 🟡 Importante — degradan la experiencia de usuarios reales

**~~4. `setHijo` no hace rollback ni lanza error~~** ✅ Listo 2026-04-19
- Guarda el estado anterior antes del dispatch optimista
- Si el upsert a Supabase falla: revierte el estado y lanza el error
- `PerfilPage` ya capturaba el error y mostraba "No se pudo guardar" — ahora ese mensaje funciona de verdad

**~~5. Pantalla de carga mientras `dataLoading` es true~~** ✅ Listo 2026-04-19
- Barra de progreso animada en la parte superior del Layout mientras los datos cargan desde Supabase
- Gradiente primario con animación de deslizamiento (no bloquea la UI)

**~~6. Página 404 y manejo de rutas inválidas~~** ✅ Listo 2026-04-19
- `NotFoundPage` dentro del Layout: emoji 🔍, mensaje amigable, botón "Volver al inicio"
- Rutas inválidas dentro de la app muestran la página 404 con la barra de navegación activa

### 🟢 Deseable antes o poco después del lanzamiento

**7. Términos de servicio y política de privacidad**
Legalmente obligatorio en Chile (Ley 19.628) y en cualquier mercado hispanohablante antes de aceptar datos personales de menores. Puede ser una página simple enlazada desde el signup.

**8. Analytics básico**
Sin ningún tracking (Posthog, Plausible o similar) es imposible saber cuántos usuarios reales hay, qué módulos usan, dónde abandonan. No afecta la funcionalidad pero ciega el roadmap.

**9. Modelo de negocio / paywall**
Actualmente todo es gratuito e ilimitado. Definir si hay un free tier (ej. 10 registros/mes) y un plan premium antes de escalar.

---

## Migraciones SQL pendientes

Correr en Supabase → SQL Editor antes del próximo deploy:

```sql
-- Eliminar cuenta: función que borra el usuario autenticado (Ley 19.628)
-- Requiere permisos de postgres (ejecutar como superuser en el SQL Editor)
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;
```

```sql
-- Rate limiting: tabla de llamadas diarias a la API
create table if not exists public.api_llamadas (
  user_id uuid references auth.users not null,
  fecha    date not null default current_date,
  cuenta   integer not null default 0,
  primary key (user_id, fecha)
);
alter table public.api_llamadas enable row level security;
create policy "Solo el propio usuario"
  on public.api_llamadas for all
  using (auth.uid() = user_id);

-- Historial: columna de orientación de IA (si no se corrió antes)
alter table public.episodios
  add column if not exists orientacion_ia text;
```

## Orden de trabajo recomendado

1. ~~UX de confirmación de email~~ ✅
2. ~~Rate limiting en API~~ ✅
3. ~~Error boundary global~~ ✅
4. ~~Rollback + error en `setHijo`~~ ✅
5. ~~Pantalla de carga con `dataLoading`~~ ✅
6. ~~Página 404~~ ✅
7. ~~Términos y política de privacidad~~ ✅ Listo 2026-04-19
8. ~~Analytics básico — Plausible~~ ✅ Listo 2026-04-19
   - Script inyectado dinámicamente desde `main.jsx` solo si `VITE_PLAUSIBLE_DOMAIN` está configurado (no corre en dev por defecto)
   - `PageTracker` en `App.jsx` dispara `plausible('pageview')` en cada cambio de ruta de React Router (skip del primer render para no duplicar el pageview inicial)
   - Sin cookies, sin datos personales — compatible con GDPR y Ley 19.628
   - **Para activar**: crear cuenta en plausible.io → añadir sitio `huella-theta.vercel.app` → agregar `VITE_PLAUSIBLE_DOMAIN=huella-theta.vercel.app` en Vercel → redeploy

---

## BASE TEÓRICA (referencia)
Ver `api/anthropic.js` — el system prompt completo está implementado con todos los 35+ referentes.

---

## Diseño y UX *(actualizado 2026-05-05)*

### CLAUDE.md
- Creado en raíz del proyecto con: descripción de Huella, stack técnico, reglas inmutables del sistema de diseño (SIEMPRE/NUNCA), instrucciones de handoff desde Claude Design, estilo de comunicación, workflow de sesión.

### Claude Design
- Setup completado en claude.ai/design — design system generado leyendo el repo
- **Pendiente**: subir los 9 TTF estáticos nuevos al asset panel de Claude Design (los variables viejos ya no existen en el repo)

### CSS consolidado (index.css) *(2026-05-05)*
- Todos los tokens de color, tipografía, sombras y radios consolidados en `src/index.css`
- **Imperfecciones conocidas** (documentadas, no bloqueantes):
  - Blues (`--color-blue`, `--color-blue-bg`, etc.) no completamente consolidados — algunos valores hex directos pueden quedar en módulos legacy
  - `--color-accent` duplicado con un valor diferente en el bloque dark mode
  - `--color-warning` comparte valor con `--color-primary-light` — ambos son el mismo terracota claro

### Sistema de tokens (index.css)
- **Fondo**: `--color-bg: #FBF7F2` (crema cálido) · `--color-surface: #FFFFFF` · `--color-surface-alt: #F5EEE6`
- **Primario**: `--color-primary: #C4714A` (terracota) · dark `#A05838` · light `#E8C4B0`
- **Texto**: `--color-text: #2D1F1A` (marrón oscuro) · muted `#7A6258` · light `#B8A8A0`
- **Acento**: verde salvia `#C5D9C6` · azul `#B0C8DC` · lavanda `#CAC0E0` · amarillo `#F0DFA0`
- **Estados**: success `#7A9E7E` · warning `#D4944A` · danger `#C85050`
- **Radios**: sm `10px` · md `16px` · lg `20px` · xl `28px`
- **Sombras**: difusas sobre `rgba(45,31,26,…)` — sm `0 2px 12px / .06` · md `0 6px 24px / .09` · lg `0 12px 48px / .12`
- **Tipografía**: `Fraunces` (serif orgánico, headings) + `Plus Jakarta Sans` (body 400/500/600/700)
- **Dark mode**: mismos tokens adaptados a tonos cálidos oscuros vía `@media (prefers-color-scheme: dark)`

### Principios de UI
- Lenguaje humano sin jerga clínica · diseño tipo app móvil centrado en pantalla
- Nunca diagnostica, siempre orienta · cada respuesta termina con disclaimer clínico
- Todos los colores y radios usan variables CSS — sin hardcodeo en módulos

---

---

### 12. Rediseño visual del Panel de Inicio *(implementado 2026-05-06)*

Implementado desde handoff `handoff-panel-inicio.md` (guardado en raíz del proyecto):
- **Hero mocha** full-width con saludo dinámico por franja horaria (madrugada/mañana/tarde/noche), fecha formateada, botón de perfil, wordmark "huella"
- **CTAPrimary** — botón tangerina grande con gradiente, sombra y glyph "+" como acción dominante → navega a `/nuevo`
- **CTAAskHuella** — card secundaria "Pregúntale a Huella" → dispara `interpretarPatrones()` y hace scroll automático a la sección de análisis
- **ResumenSemanal** — 3 tiles (episodios + delta %, intensidad media + delta, top gatillo con emoji) con `showDeltas` condicional (≥3 episodios de semana anterior)
- **ChartFrecuencia** — barras verticales 7 días con peak destacado en gradiente tangerina, caption narrativo
- **ChartIntensidad** — sparkline SVG mocha con área degradada, punto peak y punto final, caption narrativo
- **ChartGatillos** — ranking horizontal con emoji por chip, barra de progreso mocha, mapping `GATILLANTE_EMOJIS`
- **AnalisisIA** — 3 estados: idle (prompt)/loading/resultado con título extraído de primera línea, botones "Ver estrategias" + "Cerrar" (o "Reintentar" en error)
- **SectionEyebrow** — etiqueta tipográfica entre secciones
- **Delta** — indicador de cambio con `positiveDirection` (para esta app siempre "down")
- 6 tokens nuevos en `src/index.css`: `--shadow-card-soft`, `--shadow-card-medium`, `--shadow-cta-primary`, `--shadow-fab`, `--radius-cta: 22px`, `--color-white`; con overrides dark mode
- Toda la funcionalidad existente preservada: ConsejoBubble, EstrategiaActivaPanel, EstadoVacio, selector de hijos múltiples, UltimoHitoCard, BienvenidaModal, GuiaPrimerosPasos
- 22 archivos nuevos en `src/components/panel/` (10 JSX + 11 CSS modules + 1 panel.module.css)

---

### 13. Rediseño visual del Historial *(implementado 2026-05-07)*

Implementado desde handoff `handoff-historial-cronologico-denso` (zip en Downloads):
- **HistorialHeader** — barra mocha con gradientes de luz, título "Historial", búsqueda, estadísticas (Momentos · Intensidad media · rango dinámico), botón PDF con dot indicador (solo Pro)
- **FiltroChips** — sticky bar con 3 filtros: Todos / Difíciles / Avances + chips de contexto hijo y rango
- **EpisodioCard** — grid emoji-tile + body: emoji tile coloreado (5 colores), título, hora, delete con confirmación, descripción, pills coloreadas por categoría de gatillante (5 tonos), IntensidadDots (5 dots), botón inline "Ver orientación" con panel OrientacionIA expandible `grid-column: 1/-1`
- **Features existentes preservadas**: delete con confirmación, reflexión editable con guardar, badge "Seguimiento hecho", botón "¿Cómo siguió?" condicional
- **DaySeparator** — separador con label (Hoy/Ayer/día de semana/rango), meta count, punto tangerina para "Hoy"
- **IntensidadDots** — 5 dots con semántica: empty/low/peak/calm según tipo e intensidad
- **OrientacionIA** — panel inline con badge "h", label, título parseado, resumen; sin botón "Ver completo" (simplificado)
- **Adapter de datos**: merge episodios + hitos en lista unificada normalizada; mapper tipo→emoji/titulo; intensidad→nivel; orientacion_ia text→{titulo,resumen,completa}; parser SECTION_TITLES para extraer titulo legible
- **PDF clínico**: integrado en header (solo Pro) con lazy PDFSection; dot indicador desaparece al activar
- **EstrategiaActiva removida del historial** — quedó solo en Panel de Inicio
- 17 tokens CSS nuevos en `src/index.css` (pills saturadas ×10, intensity dots ×4, stat colors ×3) con dark mode overrides
- Fix handoff: `--color-error` → `--color-danger` en `--color-int-peak`
- 16 archivos nuevos en `src/components/historial/` (7 JSX + 8 CSS modules + 1 helpers.js)

**Fixes post-implementación (misma sesión):**
- Botón PDF centrado durante loading: Suspense fallback cambiado de `<p>` a `<button className={pdfLoadingBtn}>` con spinner Loader; `width: 100%` en `.link` de `GenerarInformeBtn.module.css` para que `<button>` se comporte igual que `<a>`
- Lupa (buscador inline) conectada al filtro real: `showSearch` + `busqueda` state en HistorialPage; input con autoFocus y botón ✕; filtro en `filtered` useMemo sobre descripción, descripcionLibre y gatillantes (con fallback `|| ''` y soporte para gatillantes objeto con `.nombre`)
- Espaciado buscador→contenido: `.busquedaWrap` con `padding-bottom: 12px` en lugar de 0

---

### 15. Rediseño completo de Estrategias *(implementado 2026-05-07)*

Implementado desde handoff bundle `design_handoff_estrategias/` (en raíz del proyecto):

**Arquitectura nueva:**
- 3 páginas separadas: `/estrategias` (Lista), `/estrategias/nuevo` (Creación), `/estrategias/:id` (Detalle)
- 11 componentes nuevos con sus CSS modules en `src/pages/estrategias/components/`
- `helpers.js` con catálogo de 11 habilidades (2 grupos: Regulación emocional / Desarrollo y aprendizaje)

**Puerta 1 — Sugerencia IA:**
- `detectarPatronesEstructurado()` nueva función en `anthropic.js` — llama a la IA y devuelve JSON estructurado `{ patrones: [{ tipo, descripcion, bajada, episodios_ids, confianza }] }`
- `SugerenciaIACard` muestra sugerencia con episodio detonante, botones Empezar / ✕
- Descarte persistido en `estrategia_sugerencias_descartadas` (fingerprint, reaparece en 14 días)
- `EmptyPuerta1` cuando hay < 3 episodios o la sugerencia fue descartada

**Puerta 2 — Selector manual:**
- `SelectorHabilidades` con las 11 habilidades en 2 grupos como chips seleccionables
- Opción "Otra situación" con textarea libre

**Creación del plan:**
- `EstrategiaNuevaPage` llama a `generarEstrategia({ hijo, habilidad, descripcion })`
- Normaliza tareas de `string[]` → `{id, texto, completada: false}` y `accion` → `descripcion`
- `LoadingDignificado` con pasos animados durante la generación IA
- Persistencia: INSERT en `estrategias` con columna `plan` JSONB (sin `estrategia_semanas`)

**Vista detalle:**
- `EstrategiaDetailPage` — semanas activa/pasadas/futuras con merge de reflexiones desde `checkins` JSONB
- `SemanaActiva` con toggle de tareas (useState local, no muta props) + checkin semanal
- `SemanaPasada` expandible con reflexión · `SemanaFutura` bloqueada
- `BannerCompletado` cuando se cierra la última semana
- `onAvanzar` persiste en JSONB (`estrategias.checkins` append-only + `semana_actual`)

**HuellaContext:**
- `dbEstrategiaToApp` actualizado: expone snake_case nuevas columnas (`semana_actual`, `total_semanas`, `completado_at`, `abandonado_at`, `episodios_detonantes_ids`, `hijo_id`, `habilidad_nombre`, `created_at`) + camelCase aliases para backward compat
- Reducer: nuevos casos `ESTRATEGIA_CREADA` y `ESTRATEGIA_AVANZADA`

**CSS tokens nuevos en index.css:**
- Aliases semánticos: `--color-mocha`, `--color-tangerine`, `--color-cream`, `--color-ink`, `--color-muted`, `--radius-xs`
- Pills por categoría: `--pill-emo-bg/fg`, `--pill-rut-bg/fg`, `--pill-vin-bg/fg`, `--pill-jue-bg/fg`, `--pill-sal-bg/fg`
- `--shadow-soft` · todos con dark mode overrides

**SQL (ya ejecutado):** `design_handoff_estrategias/sql/001_estrategias_rediseno.sql`
- Tabla `estrategia_sugerencias_descartadas` con RLS
- 5 columnas nuevas en `estrategias` con IF NOT EXISTS
- Migración de `episodio_origen_id` → `episodios_detonantes_ids`

**Bugs corregidos sobre el bundle:**
- Import path supabase: `services/supabase` → `lib/supabase`
- `interpretarPatrones` → `detectarPatronesEstructurado` (JSON estructurado, no texto)
- `generarEstrategia` signature adaptada al API real
- `generarTareas` removida (innecesaria, `generarEstrategia` ya incluye semanas)
- `hijo.edad_label` → `hijo.edad`
- `plan.semanas` → `plan.plan?.semanas` (JSONB path correcto)
- `estrategia_semanas` table writes eliminados → JSONB
- `contenido_ia` column → `plan` column
- `SemanaActiva.toggleTarea` directo mutation → useState local

---

### 14. Fixes del Panel de Inicio *(2026-05-07)*

- **ConsejoBubble movido del Panel al Perfil del hijo** — libera espacio visual en el Panel de Inicio; aparece ahora en la pantalla de perfil de cada hijo
- **Avatar del Hero muestra foto del hijo activo** — `Hero.jsx` acepta prop `childAvatarUrl`; si existe muestra `<img object-fit:cover>`, si no muestra inicial del nombre del hijo (antes mostraba inicial del padre). Campo real en el contexto: `hijo.avatarUrl` (mapeado desde `avatar_url` en Supabase). Círculo agrandado de 40px → 48px con `font-size: 16px` y `overflow: hidden`. Click sigue navegando a `/perfil`

---

---

### 16. Fix crítico — tareas no persistían tras reload *(2026-05-08)*

**Root cause:** columna `plan` en tabla `estrategias` es `TEXT`, no `JSONB`. Supabase serializa el objeto JS como JSON string al insertar. Al leer de vuelta, `row.plan` es un string; `plan.plan?.semanas = undefined`; `SemanaActiva` nunca renderizaba.

**Fixes aplicados (commit d8ae7c3):**
- `HuellaContext.jsx` — `parsePlanField()` parsea `row.plan` si es string; los planes ya creados con el bug se recuperan automáticamente.
- `SemanaActiva.jsx` — init defensivo `Array.isArray(semana.tareas)` cubre `{}`, `undefined`, `null` además de `[]`.
- `EstrategiaDetailPage.jsx` — `key={actual}` en `SemanaActiva` fuerza remount al avanzar semana; corrige bug de tareas de semana 1 que se repetían en semana 2 (stale useState).

**Migración SQL recomendada (no urgente):** Cambiar la columna a JSONB es limpiador pero no bloquea. Correr en SQL Editor cuando sea conveniente:
```sql
ALTER TABLE estrategias ALTER COLUMN plan TYPE jsonb USING plan::jsonb;
```

---

### 17. Round 2 de Estrategias — refinamientos y UX *(2026-05-08)*

**Cambios implementados en una sola pasada:**

1. **Cap de 3 planes activos** — `MAX_PLANES_ACTIVOS_FREE = 3` en helpers.js. `EstrategiaNuevaPage` verifica antes de llamar a `generar()`; si supera el cap, muestra modal para abandonar un plan existente antes de crear uno nuevo. `abandonarPlanYCrear(id)` hace UPDATE en Supabase + dispatch optimista.

2. **Regla de descarte mejorada (7d / 5 eps)** — reemplaza la anterior (14 días fijos). `debeMostrarSugerencia` en helpers.js: compara contra el rechazo más reciente del hijo; muestra si pasaron ≥7 días O se registraron ≥5 episodios desde ese rechazo. Incluye `episodios_count_al_rechazar` en el INSERT de descarte. **Requiere SQL:** `ALTER TABLE estrategia_sugerencias_descartadas ADD COLUMN IF NOT EXISTS episodios_count_al_rechazar integer DEFAULT 0;`

3. **Filtro de habilidades ya trabajadas** — `habilidadesExcluidas` en EstrategiasPage: descarta planes activos o completados/abandonados en los últimos 90 días. Si la sugerencia IA propone una habilidad ya trabajada, no se muestra.

4. **SugerenciaIACard rediseñada** — sin badge "SUGERENCIA DE HUELLA" ni título narrativo. Nueva sección "Vamos a trabajar:" + nombre de habilidad en Fraunces grande.

5. **Módulo colapsable "🌱 Sugerencias de Huella"** — header siempre visible con chevron; badge "1 nueva" tangerine cuando es la primera vez que se ve la sugerencia. Auto-expande cuando la sugerencia es nueva (no vista en sessionStorage). Se considera "vista" al navegar fuera de la pantalla o al hacer click en el header. Llave sessionStorage: `huella_sug_{hijo.id}` con array de fingerprints vistos.

6. **"Nace de" chips movidos del HeaderMocha** — ahora en banda cream debajo del header (EstrategiaDetailPage), con chips strawberry por cada episodio detonante.

7. **BannerCompletado** — botón primario en tangerine (era mocha).

8. **Estado post-rechazo diferenciado** — `esPostRechazo` distingue entre "sin sugerencia porque rechazaste hace poco" vs "sin sugerencia por falta de datos". EmptyPuerta1 acepta prop `postRechazo` y muestra mensaje diferente.

9. **SemanaPasada títulos sin truncado** — `white-space: normal; word-break: break-word` en `.nm`.

**SQL pendiente (dar al usuario):**
```sql
ALTER TABLE estrategia_sugerencias_descartadas ADD COLUMN IF NOT EXISTS episodios_count_al_rechazar integer DEFAULT 0;
```

---

---

### 18. Round 3 mini — fixes post-verificación *(2026-05-08)*

**Cambio A — "Ver tu hito" lleva a la medalla específica:**
- `BannerCompletado.jsx`: `navigate('/hitos')` → `navigate('/hitos?highlight=plan_completo')`
- `HitosPage.jsx`: importa `useSearchParams`, lee param `highlight`, hace `scrollIntoView` al badge con ese DOM id 350ms después del mount
- `BadgeCard`: agregado `id={badge.id}` en el div raíz (cada badge tiene id único en NIVELES)
- Decisión de producto: no existe URL `/hitos/:id` ni registro DB por badge — los badges son computados client-side. La medalla de completar un plan es siempre `plan_completo`. Se usa query param + scroll.

**Cambio B — Mensaje correcto cuando filtro bloquea sugerencias:**
- `EstrategiasPage.jsx`: `esPostRechazo` simplificado de useMemo complejo a `const esPostRechazo = !sugerenciaVisible && episodios.length >= 5 && !loadingPatrones`
- Cubre los 3 subcasos: post-rechazo, filtro 90 días, IA sin patrón detectado
- `EmptyPuerta1.jsx`: sin cambios (ya usaba el prop `postRechazo` correctamente)
- Nota de producto respetada: filtro 90 días aplica solo a Puerta 1, no al selector manual (Puerta 2)

---

### 19. Round 4 — Frases de autores en el taskbar de carga del plan *(2026-05-08)*

**Archivos tocados:**
- `src/lib/frases.js`: agregado `FRASES_LOADING` con 4 grupos (fase1/fase2/fase3/fase4), `HABILIDAD_A_GRUPO_FASE2` (mapping interno), y función exportada `fraseCarga(fase, habilidadId, edad)`
- `src/pages/estrategias/components/LoadingDignificado.jsx`: acepta `habilidadId` y `hijoEdad`; inicializa 4 frases al montar (`useState(() => ...)`); muestra la frase del paso activo con `key={pasoActual}` para disparo automático del fade
- `src/pages/estrategias/components/LoadingDignificado.module.css`: agregados `.fraseWrap` (fade-in 350ms), `.fraseTexto` (Fraunces italic 16px ink, centrado), `.fraseAutor` (13px mocha)
- `src/pages/estrategias/EstrategiaNuevaPage.jsx`: pasa `habilidadId={habilidad.id}` y `hijoEdad={hijo?.edad}` a LoadingDignificado

**Grupos de frases:**
- **Fase 0** ("Leyendo lo que registraste"): Brazelton, Winnicott, Faber, Lansbury — observar antes de intervenir
- **Fase 1** ("Buscando bibliografía"): por habilidad — 9 grupos (regulacion_emocional, limites, social, ansiedad, atencion, autonomia, rutinas, autoestima, aprendizaje) + fallback
- **Fase 2** ("Adaptando a la edad"): 4 rangos (0-2, 2-6, 6-12, 12-18), referentes calibrados por edad
- **Fase 3** ("Escribiendo el plan"): Brazelton, Lansbury, Winnicott, Markham — paciencia y confianza en el proceso

**Total: 51 frases nuevas de 27 autores.**

### 20. Round 5 mini — Limpieza visual en SelectorHabilidades *(2026-05-08)*

**Cambio A — Quitar el círculo "2" del título:**
- `SelectorHabilidades.jsx`: eliminado `<span className={styles.num}>2</span>` del header
- `SelectorHabilidades.module.css`: eliminada regla `.num` (ya sin referencias)

**Cambio B — Centrar los chips de habilidades:**
- `SelectorHabilidades.module.css`: agregado `justify-content: center` en `.skills`
- Los chips siguen siendo `flex-wrap: wrap` — se centran como grupo en cada línea

**Archivos tocados:**
- `src/pages/estrategias/components/SelectorHabilidades.jsx`
- `src/pages/estrategias/components/SelectorHabilidades.module.css`

---

---

### 22. Audio en "Cuéntame tu caso" — VoiceTextarea *(2026-05-11)*

**Refactor puro: NarrativaBar → componente reutilizable VoiceTextarea**

- **Archivos creados:**
  - `src/components/ui/VoiceTextarea.jsx` — componente extraído de NarrativaBar con prop `placeholder` opcional
  - `src/components/ui/VoiceTextarea.module.css` — estilos narrativa* y voz* movidos desde RegistroPage.module.css
- **Archivos modificados:**
  - `src/pages/registro/RegistroPage.jsx` — elimina NarrativaBar inline, importa VoiceTextarea; props idénticas en ambos usos (modo rápido y detallado)
  - `src/pages/registro/RegistroPage.module.css` — eliminadas clases narrativa*/voz* (movidas al módulo del componente)
  - `src/pages/estrategias/components/SelectorHabilidades.jsx` — reemplaza `<textarea>` plano por `<VoiceTextarea>` en la card "Cuéntame tu caso"
- **API**: Web Speech API nativa del browser (sin Whisper, sin Anthropic, sin env vars)
- **Commit:** `5088c90`

---

### 21. Round 6 — Robustez y multi-planes *(2026-05-09)*

**Auditoría técnica previa:** `AUDITORIA_ESTRATEGIAS.md` (43 hallazgos en 8 dimensiones). Round 6 ataca 4 ALTAS + 5 MEDIAS.

**Cambios implementados:**

1. **H2.6 — BannerCompletado: texto corregido + INSERT real a hitos** (`EstrategiaDetailPage.jsx`, `BannerCompletado.jsx`)
   - Texto: "Tu reflexión final ya quedó guardada en Hitos." → "Tu reflexión quedó guardada en el álbum de logros."
   - Al completar la última semana, `onAvanzar` llama `addHito()` con `categoria: 'otro'` y descripción con nombre de habilidad + semanas + reflexión

2. **H4.1 — Mostrar TODOS los planes activos** (`EstrategiasPage.jsx`)
   - `planActivo = planes.find(...)` → `planesActivos = planes.filter(...)`
   - `planActivoEnriquecido` (singular) → `planesActivosEnriquecidos` (array)
   - Render: `planesActivosEnriquecidos.map(plan => <EstrategiaActivaCard key={plan.id} ... />)`
   - Sugerencias ahora visibles cuando `planesActivos.length < MAX_PLANES_ACTIVOS_FREE` (antes solo si 0 activos)

3. **H1.3 — Loading + error en onAvanzar** (`EstrategiaDetailPage.jsx`)
   - Estados `avanzando` (bool) y `avanzarErr` (string)
   - Guard anti-doble-tap: `if (avanzando) return;`
   - Supabase v2: `const { error: dbErr } = await supabase...` + `if (dbErr) throw`
   - `setAvanzarErr(...)` en catch; `avanzando` pasado como prop a SemanaActiva

4. **H1.4 — Optimistic rollback en onToggleTarea** (`EstrategiaDetailPage.jsx`)
   - Dispatch optimista primero; si DB falla, revierte dispatch + incrementa `tareaKey`
   - `tareaKey` fuerza remount de SemanaActiva (resets local useState `tareas`)
   - `toggleErr` mostrado 4s sobre la card de semana activa

5. **H1.5 — abandonarPlanYCrear verifica error de Supabase** (`EstrategiaNuevaPage.jsx`)
   - `const { error: dbErr } = await supabase...` + `if (dbErr) throw`
   - `capError` state con mensaje inline en el modal de cap

6. **H1.2 — Guard doble-tap en "Generar mi plan"** (`EstrategiaNuevaPage.jsx`)
   - `generando = useRef(false)` — sincrónico, no batched
   - `generar()`: early return si `generando.current`; set true antes del primer await; reset en finally

7. **H2.2 — Modal de confirmación para "Cerrar el plan"** (`SemanaActiva.jsx`, `SemanaActiva.module.css`)
   - Botón "Cerrar el plan ✓" → abre modal; botón "Avanzar a Semana N →" → llama onAvanzar directamente
   - Modal con backdrop, "¿Listo para cerrar el plan?" + "Esta acción no se puede deshacer."
   - `avanzando` y `errMsg` pasados como props desde EstrategiaDetailPage

8. **H6.7 — SelectorHabilidades bloquea habilidades con plan activo** (`SelectorHabilidades.jsx`, `.module.css`, `EstrategiasPage.jsx`)
   - `habilidadesEnPlanActivo = new Set(planesActivos.map(p => p.habilidad_nombre || p.habilidad))` computado en EstrategiasPage
   - Pasado como prop a SelectorHabilidades
   - Chips bloqueados: `.bloqueada` (opacity 0.4, cursor not-allowed) + mensaje inline 3s al hacer click

**SQL H7.2 — YA APLICADO EN PRODUCCIÓN:**
La columna `episodios_count_al_rechazar` en `estrategia_sugerencias_descartadas` fue aplicada en la sesión anterior. No requiere acción.

---

---

## ÚLTIMA SESIÓN — 10 mayo 2026

- **Bug plan vacío: RESUELTO de raíz** (max_tokens 1200→4000 en `generarEstrategia`)
- **Owner override rate limit:** verificado y activo (UUID `04ddd97a-e674-4e59-8f37-78cb38d46090`, en `api/anthropic.js` → `verificarRateLimit` desde commit `092e71c`)
- **Round 6 commiteado y desplegado:** multi-planes activos visibles, INSERT real a hitos, modal cierre plan, opacity habilidades en plan
- **Bloque 3.1 (commit `9b6d186`):** selector con lista plana, chips de filtro horizontal, grupos visuales (REGULACIÓN EMOCIONAL / DESARROLLO Y APRENDIZAJE), 11 habilidades con tags completos
- **Bloque 3.2 (commit `b96cbeb`):** "Cuéntame tu caso" con función `generarEstrategiaDesdeContexto`, plan ad-hoc personalizado o usando habilidad existente según calce
- **Duplicación "+ Otra situación" eliminada** (commit `82ba5b6`)
- **Wording emocional aplicado:** "Lo que estás trabajando", "Lo que más se repite en tus registros", "Empecemos juntos"

---

## Pendientes (actualizados abajo, ver sección ÚLTIMA SESIÓN)

---

## Arquitectura actual — Módulo Estrategias

- 11 habilidades en `src/pages/estrategias/helpers.js` con tags definidos
- Chips de filtro: Todos · Berrinches · Enojo · Frustración · Miedos · Sociales · Atención · Rutinas · Autonomía · Autoestima · Colegio
- Card "Cuéntame tu caso" arriba del divisor "— o —" en `SelectorHabilidades`
- Catálogo curado con 2 grupos visuales como divisores sutiles (no contenedores colapsables)

---

## ÚLTIMA SESIÓN — 11 mayo 2026 (continúa)

- **Audio en "Cuéntame tu caso": IMPLEMENTADO** — VoiceTextarea extraído, conectado en SelectorHabilidades, commit `5088c90`
- **Diagnóstico bug Mi Familia: COMPLETO** — investigación punta a punta completada
- **Fase 1 bug Mi Familia: IMPLEMENTADO** — commit `a25fcc7` pusheado a main

### Fase 1 bug Mi Familia — Qué se hizo (commit a25fcc7)

**Problema resuelto**: `accept_partner_invitation` creaba un segundo `hijo` duplicado para el partner, causando que los datos del invitador (con su `hijo_id`) fueran invisibles para el partner (que tenía un `hijo_id` diferente).

**SQL reescrito** (`supabase/schema.sql` → función `accept_partner_invitation`):
- **Caso A**: partner sin hijos propios → join directo (igual que antes)
- **Caso B**: partner tiene hijos pero sin datos derivados (episodios/hitos/estrategias/rutinas) → borra los hijos vacíos, luego join. Evita el duplicado.
- **Caso C**: partner tiene datos propios → retorna `{ success: false, error_code: 'pending_data' }` sin tocar nada en la BD. La invitación queda pendiente.

**Frontend** (`src/pages/invitar/InvitarPage.jsx`):
- Nuevo estado `pending_data`: pantalla con emoji 📋, explicación amigable y CTA "Contactar soporte" (`mailto:hola@huella.app`) + "Ir a mi panel"

**Limpieza**:
- `supabase/modo_pareja.sql` → renombrado a `modo_pareja.deprecated.sql`
- `supabase/migrations/001_add_hijo_id_columns.sql` → documenta columnas hijo_id (ya en prod)
- `supabase/migrations/002_fix_rls_descartadas_family.sql` → SQL listo para correr en Supabase

### ⚠️ ACCIÓN REQUERIDA — correr en Supabase SQL Editor

**1. Nueva función `accept_partner_invitation`** (lo más importante):
Copiar y pegar el bloque completo desde `supabase/schema.sql` (buscar la función, línea ~419). La función está actualizada en el archivo; hay que aplicarla en producción.

**2. Fix RLS de sugerencias descartadas** (para que las parejas puedan compartir descartes):
Copiar y correr el contenido de `supabase/migrations/002_fix_rls_descartadas_family.sql`.

### Decisiones de producto tomadas (Mi Familia) — NO cuestionar

1. Cada episodio/dato derivado muestra quién lo registró (avatar del adulto creador)
2. Cada adulto solo puede editar/eliminar lo que él mismo creó. Todos los de la familia pueden VER todo
3. Aplica a TODO: episodios, estrategias, hitos, casos "Cuéntame tu caso" y demás datos del hijo

### Fases pendientes

- **Fase 2** — "Quién registró": exponer `user_id` en los mappers (`dbEpisodioToApp`, etc.) + UI con avatar/label del adulto creador
- **Fase 3** — Permisos de edición: ya cubiertos por RLS (`WITH CHECK auth.uid() = user_id`), solo necesitan surfacearse en UI (deshabilitar botones editar/borrar si no eres el creador)

---

### Bug Historial vacío — Fix aplicado (commit 3bbddad)

**Causa raíz confirmada**: La política `family_members_read` en Supabase tiene una subquery auto-referencial sobre la misma tabla. Esto causa que la query directa desde `FamilyContext` devuelva `null` para la fila del partner → `family.partner = null` → `partnerIds = [mama.id]` → los datos del owner (con `user_id = papa.id`) nunca se traían al frontend.

**Fix aplicado** (`src/context/FamilyContext.jsx`):
- **Antes**: dos queries directas a `family_members` (sujetas a RLS auto-referencial)
- **Ahora**: una llamada al RPC `get_partner_info()` que es `SECURITY DEFINER` y bypassa la RLS

`get_partner_info()` retorna `{ hasFamily, familyId, role, partner: { id, email } | null }`. La shape del objeto `family` en el contexto no cambió — `partner.id` sigue siendo el mismo UUID.

**Casos cubiertos**:
- Owner sin partner: `partner: null` ✓
- Owner con partner: `partner: { id, email }` ✓
- Partner (mama): antes devolvía `null`, ahora devuelve correctamente al owner ✓
- Sin familia: `hasFamily: false` → `family = null` ✓

**⚠️ Verificar en producción**: Daniel debe abrir la app con la cuenta de la partner y confirmar que el Historial ahora muestra los episodios del owner.

---

### Fase 2 — Mostrar autor de cada entry (commit 8199ae7) ✅

**Qué se hizo:**
- `get_partner_info()` extendida con LEFT JOIN a `perfiles` para incluir `nombre` del partner
- `HuellaContext.jsx`: `dbEpisodioToApp`, `dbEstrategiaToApp`, `dbRutinaToApp` exponen `userId`; nuevo `profilesByUserId` useMemo expuesto en el contexto
- `src/utils/authorDisplay.js`: helper `getAuthorDisplay(userId, profilesByUserId)` — retorna `''` si solo hay 1 adulto en la familia
- `EpisodioCard.jsx` + `EpisodioCard.module.css`: prop `authorName`, renderizado inline `· Nombre` junto a la hora, clase `.author`
- `HistorialPage.jsx`: pasa `authorName` a cada `<EpisodioCard>` (episodios y hitos), agrega `userId` en ambos norms
- `PanelPage.jsx`: `UltimoHitoCard` y `EstrategiaActivaPanel` aceptan y renderizan `authorName`
- `EstrategiaActivaCard.jsx` + `.module.css`: `authorName` junto a "Semana X de Y", clase `.author`
- `EstrategiasPage.jsx`: pasa `authorName` a cada `<EstrategiaActivaCard>`

**⚠️ ACCIÓN REQUERIDA — correr en Supabase SQL Editor:**
La función `get_partner_info()` fue actualizada en `supabase/schema.sql` con el JOIN a `perfiles`. Debe aplicarse en producción para que el nombre del partner aparezca. Busca la función en el archivo (línea ~130 aprox.) y corre el bloque completo `CREATE OR REPLACE FUNCTION public.get_partner_info()` hasta el `GRANT EXECUTE`.

---

### Fase 3 — Permisos de edición en UI (commit c4a04a2) ✅

**Qué se hizo:**
- `canModify(entryUserId, currentUserId)` en `src/utils/authorDisplay.js` — retorna `true` si no hay userId (usuario solo), `false` si IDs difieren
- `EpisodioCard.jsx`: importa `useAuth`, oculta botón delete + reflexión entera si `!canModify`
- `EstrategiaActivaCard.jsx`: importa `useAuth`, oculta botón ✕. Botón "Ver tu semana" (navegación) permanece
- `DrawerPasados.jsx`: importa `useAuth`, oculta ✕ por plan individual (no todos, solo los ajenos)
- `RutinaDiaria.jsx`: importa `useAuth`, oculta div de acciones (Pencil + Trash2) para bloques ajenos. Botón "Agregar bloque" siempre visible (crea entry propio)
- `HitosPage → HitoCard`: importa `canModify`, oculta "Agregar foto" para hitos de la pareja. La foto existente sigue siendo visible (es navegación)

**Comportamiento entries propios:** idéntico al anterior — todos los botones siguen apareciendo.

---

## Pendientes próxima sesión

### SQL pendiente (correr en Supabase antes de verificar)
- **`get_partner_info()`** — busca la función en `supabase/schema.sql` (~línea 130) y corre el bloque `CREATE OR REPLACE FUNCTION` completo. Necesario para que el nombre del partner aparezca en Fase 2.
- **`accept_partner_invitation`** — mismo archivo (~línea 419), correr el bloque completo. Ya commiteado, falta aplicar en producción.
- **RLS sugerencias descartadas** — correr `supabase/migrations/002_fix_rls_descartadas_family.sql`.

### Verificaciones en producción
1. **⚠️ Verificar fix Historial (RPC)** — abrir con cuenta partner y confirmar que el Historial muestra los episodios del owner
2. **⚠️ Verificar Fase 3 (permisos UI)** — probar con ambas cuentas que los botones de eliminar/editar desaparecen en entries ajenos

### Bugs conocidos
3. **Bug email de invitación** — el email de invitación al partner no llega. Investigar: revisar logs de Resend, verificar que `RESEND_API_KEY` está activa en Vercel y que el dominio está verificado.
4. **13 episodios sin hijo_id** — backfill SQL pendiente. Esos episodios no aparecen al filtrar por hijo activo. Requiere query de asignación manual en SQL Editor.

### Decisiones de producto parqueadas
5. **Capa de monetización Mi Familia** — 3 opciones en evaluación (freemium 1 adulto / paywall invitación / add-on familiar). Insight clave: el momento de enviar la invitación es el punto de upsell natural. Pendiente conversación con Daniel para decidir.
6. **"Funciones nuevas" del usuario** — tarea 3 original de la sesión, quedó parqueada mientras se trabajó Mi Familia. Retomar en próxima sesión con conversación de Claude.

### Diseño
7. **Pass de diseño coherente** — usar Claude Design cuando vuelva el límite semanal

---

## ÚLTIMA SESIÓN — 12 mayo 2026

### Cerrado hoy

**Los 3 SQL pendientes de la sesión anterior se aplicaron en producción** (`accept_partner_invitation` v1, `get_partner_info` con JOIN a `perfiles`, fix RLS de `estrategia_sugerencias_descartadas`). Verificado con queries read-only: `pg_get_functiondef` y `pg_policy`.

**5 cambios consolidados antes del QA final de Mi Familia:**

1. **Placeholder "Pareja"** (`src/utils/authorDisplay.js` + 4 call sites en HistorialPage / PanelPage / EstrategiasPage) — `getAuthorDisplay` ahora recibe `currentUserId` como tercer argumento. Si el autor es otro adulto de la familia sin nombre seteado → muestra `'Pareja'`. Si eres tú → siempre `''`. Si el `userId` no está en el mapa → `''`. Antes mostraba vacío y parecía bug.

2. **Banner persistente sin nombre** (`src/pages/perfil/PerfilPage.jsx` + `.module.css`) — si `state.padreNombre` está vacío y `!dataLoading`, aparece un banner amber arriba de la Card "Tú" con texto invitando a completar el nombre. Click → `scrollIntoView` + `focus()` al input. Desaparece automáticamente al guardar. Tokens reutilizados (`--color-amber-bg`, `--color-amber-dark`).

3. **Solo el owner agrega hijos** — UI: botón "+ Agregar otro hijo/a" envuelto en `{(!family || family.role === 'owner') && …}`. SQL: guard en `upsert_family_child` que `raise exception` si `v_family_id is not null` y el role del usuario `<> 'owner'`. Solo aplica a INSERT — UPDATE sigue compartido. Usuario solo sin familia sigue viendo el botón.

4. **Counts en mensaje de Caso C** — SQL: `accept_partner_invitation` ahora cuenta episodios/hitos/estrategias/rutinas en `pending_data` y devuelve `counts` en el response. UI: `InvitarPage.jsx` con función `describirCounts()` que arma texto humano con singular/plural y combina con coma + "y". Ejemplo: "Ya tienes 3 episodios, 1 hito y 2 estrategias en tu cuenta."

5. **Auto-rechazo de invitación en Caso C** — nuevo status `'rejected_pending_data'` en `partner_invitations`. `accept_partner_invitation` marca la invitación con ese status antes de retornar pending_data. `create_family_and_invite` ahora cancela también `'rejected_pending_data'` al reinvitar. `FamilyContext` trae invitaciones con `.in('status', ['pending', 'rejected_pending_data'])` y expone el status. `PerfilPage` muestra rama nueva con bloque amber "Tu pareja no pudo unirse" + botón "Descartar invitación".

**SQL aplicado hoy en Supabase (3 bloques):**
- `upsert_family_child` actualizada (guard del Cambio 3)
- `create_family_and_invite` actualizada (cancela también `rejected_pending_data`)
- `accept_partner_invitation` actualizada (counts + status nuevo)

### Decisión de producto descartada esta sesión

**Cambio 4 (RLS DELETE en hijos)** — al inspeccionar `pg_policy` se confirmó que producción ya tiene 4 policies separadas (`hijos_select/insert/update/delete`) con DELETE restringido a `user_id = auth.uid()`. La policy `family_data` que aparecía en `schema.sql` nunca llegó a producción. Cambio descartado.

### Deuda técnica anotada

1. **`supabase/schema.sql` desalineado con producción** — el archivo del repo declara policies `family_data` `FOR ALL` sobre `hijos` (líneas 327-352) que no existen en prod. En prod hay 4 policies separadas por operación.
2. **Policies de `estrategia_sugerencias_descartadas` también más sofisticadas en prod que en repo** — el fix RLS de la sesión anterior se aplicó pero el archivo no se actualizó.
3. **Próxima sesión sin urgencia**: alinear `schema.sql` con `pg_policy` de prod para evitar futuras confusiones.

### Próximo paso

**QA completo de Mi Familia con la checklist armada en sesión previa** (4 cuentas de prueba, 3 casos de aceptación, verificación de placeholder/banner/permisos, mensaje específico Caso C, descarte de invitación rejected_pending_data).

---

---

## ÚLTIMA SESIÓN — 13 mayo 2026

### Proyecto activo

**Rediseño completo de Estrategias bajo modelo "estrategia con ciclos".** Una estrategia pasa a ser un contenedor continuo sobre una habilidad. Dentro vive uno o más ciclos cronológicos (Ciclo 1 = 4 semanas como hoy; ciclos 2+ con duración variable). Cada ciclo activo tiene bitácora (notas + episodios vinculados) y al cerrar dispara análisis IA en 3 secciones (Qué cambió / Qué quedó pendiente / Recomendaciones para integrar). Volver a una habilidad ofrece "Ciclo N con memoria" usando lo aprendido en ciclos anteriores.

Cap: 3 estrategias activas máx., 1 ciclo activo por estrategia.

### Hecho hasta ahora

- **Informe técnico-funcional inicial** del estado actual de Estrategias y PDF clínico. Mapea pantallas, modelo de datos, funciones SQL/RPC/IA, puntos de contacto con otras secciones y riesgos. Sirve como baseline.
- **18 approaches conceptuales** (3 por pantalla × 6 pantallas) entregados para que Daniel eligiera dirección.
- **6 mockups detallados** pixel-coherentes en 3 lotes:
  - **Lote 1** — Pantalla 1 (lista con timeline horizontal por estrategia, approach 1A) + Pantalla 2 (detalle del ciclo con bitácora "Lo que está pasando", approach 2C).
  - **Lote 2** — Pantalla 3 (cierre del ciclo con 2 CTAs gemelas y 3 secciones IA, approach 3A) + Pantalla 4 (modal Ciclo 2 con preview del historial y fallback sin análisis IA, approach 4B).
  - **Lote 3** — Pantalla 5 (PDF tabla maestra + dossier por ciclo, con versión con y sin columna Δ Intensidad, approach 5B) + Pantalla 6 (card Panel "en descanso" con tono muted, approach 6A).

### Correcciones ya aplicadas al Lote 1

1. **Sin modo readonly del DetailPage.** El sheet de ciclo pasado en la Pantalla 1 pasó de "Ver detalle completo" a "Ver bitácora completa de este ciclo", escalado en 2 niveles dentro del mismo sheet (resumen → bitácora). Toda la info de un ciclo pasado vive en sheets ligeros.
2. **Sin long-press para eliminar.** Reemplazado por menú "..." (lucide `MoreHorizontal`) en el header de cada carril, con `<MenuPopover>` reusable. Item único actual: "Eliminar estrategia". Estructura preparada para futuras opciones.

### Pendiente — aplicar al inicio de la próxima sesión

1. **Pantalla 4 · "Ciclo independiente".** Debe crear un Ciclo N+1 dentro de la misma estrategia (sin memoria IA), NO una estrategia paralela. Preserva la invariante "una habilidad = una estrategia". La spec actual hace lo contrario; hay que actualizar §4.7 del Lote 2.
2. **Pantalla 6 · icono.** Reemplazar `Moon` (lucide) por emoji 🌿 para coherencia con el resto de la app. Mantener el resto del componente igual.
3. **Pantalla 6 · persistencia "Ocultar de aquí".** Pasar de sessionStorage a persistencia real (DB o localStorage). Si no se persiste, recargar vuelve a mostrar la card. Decidir: tabla nueva `estrategias_panel_descartadas` (mismo patrón que `estrategia_sugerencias_descartadas`) o `localStorage` por user_id. Recomendación: DB para que funcione cross-device de la pareja.

### Después de las 3 correcciones

Generar **bundle de implementación** que Claude Code pueda consumir sin ambigüedad. Debe incluir:
- Tokens CSS finales (los existentes que se usan y cualquiera nuevo justificado).
- Props y comportamientos por componente (`EstrategiaCarril`, `MenuPopover`, sheets de 2 niveles, `NotaCard`, `EpisodioVinculadoCard`, `EstrategiaDescansoCard`, etc.).
- Schema SQL nuevo: tabla `estrategia_ciclos` (extracción del modelo plano actual), `estrategia_bitacora_notas`, columna `ciclo_id` en `episodios` para vincular, posibles tablas auxiliares para "panel descartadas".
- Migración de datos desde el modelo actual (cada `estrategias` existente → 1 estrategia + 1 ciclo).
- Contract IA para 2 funciones nuevas en `services/anthropic.js`:
  - `analizarCierreCiclo({ ciclo, notas, episodios, hijo })` → `{ queCambio: string, queQuedoPendiente: string, recomendaciones: string[] }`.
  - `analizarHistorialEstrategias({ estrategias_con_ciclos, hijo })` → texto narrativo 3-5 frases para fallback PDF cuando no se incluye Δ Intensidad.

### Decisión clave de flujo

**Claude Code primero (mockups + implementación), Claude Design después para pulir estética.** El rediseño es estructural y funcional, no solo visual — la prioridad es construir el modelo nuevo (DB + lógica + componentes) y validar que funciona end-to-end. El pulido de diseño se hace sobre algo ya operativo.

### Reglas duras del rediseño (no negociables)

- NO se tocan Mi Familia, Historial, pantallas de Hitos/Perfil hijo/Perfil padre.
- Panel/Inicio: los componentes existentes (`EstrategiaActivaPanel`, etc.) NO se rediseñan. Sólo se agrega `EstrategiaDescansoCard` debajo de `EstrategiaActivaPanel`.
- Tokens visuales existentes (`--color-mocha`, `--color-tangerine`, `--color-cream`, `--color-surface-alt`, `--color-amber-bg/dark`, etc.) son la fuente de verdad. No introducir tokens nuevos sin justificación.

---

## ÚLTIMA SESIÓN — 13 mayo 2026 (cont.) — Mockups, viewer y Fase 0 del bundle de implementación

### Lo que se hizo

1. **Lote completo de 6 mockups** del rediseño "Estrategias con Ciclos" generado en `design_handoff_estrategias/mockups/` (13 archivos: README + 6 pares `.jsx` / `.module.css`).
2. **3 correcciones aplicadas durante la generación inicial**:
   - **P4** — copy del "Ciclo independiente" deja claro que sigue dentro de la misma estrategia (sin memoria IA al prompt). El handler de confirmación crea ciclo N+1 con `usar_memoria_ia = false`, NO una estrategia paralela.
   - **P6** — emoji 🌿 reemplaza icono `Moon` de lucide. Sin import de `Moon`.
   - **P6** — persistencia "Ocultar de aquí" con `localStorage` (clave `huella_descanso_ocultado_${estrategiaId}`). Se lee al montar y oculta sin confirmación.
3. **2 correcciones finales aplicadas tras revisión visual**:
   - **P3** — CTAs gemelas sin sesgo ("Trabajar libre" / "Iniciar nuevo ciclo"), mismo tamaño y peso visual, sin íconos, sin `ctaPrim/ctaSec`. Pregunta neutral "¿Qué quieres hacer ahora?". Side-by-side en ≥520px, apiladas en mobile.
   - **P1** — redefinición de "estrategia activa" — solo cuentan estrategias con ciclo en curso (`ciclos.some(c => c.estado === 'activo')`). Header dinámico "N activas · M en descanso". Sección "EN DESCANSO" separada con cards atenuadas (opacity 0.7 + `--color-surface-alt`).
4. **Viewer temporal montado en `/mockups`** (ruta pública fuera de `ProtectedRoute`):
   - Archivos: `design_handoff_estrategias/mockups/MockupViewer.jsx` + `.module.css`
   - Modificación en `src/App.jsx`: línea 25 (import) + línea 147 (Route hermana de `/invitar`).
   - Comando de revert documentado: `git checkout -- src/App.jsx && rm design_handoff_estrategias/mockups/MockupViewer.jsx design_handoff_estrategias/mockups/MockupViewer.module.css`
5. **Diagnóstico técnico completo** realizado: mapeo de DB actual, código actual, brecha con modelo de ciclos, riesgos por tipo de migración (destructiva vs aditiva).
6. **7 decisiones de implementación tomadas** (todas confirmadas por Daniel):
   - ALTER `plan` TEXT→JSONB se corre **dentro del script de migración a ciclos**.
   - Episodios vinculados al ciclo: **columna `ciclo_id` en tabla `episodios`** (no pivote N:N).
   - "Ocultar de aquí" del Panel descanso: **tabla `estrategias_panel_descartadas` en DB** (cross-device para parejas).
   - `tareas jsonb` (dead column): se borra en la misma migración.
   - Migración con **ventana de mantenimiento corta** (madrugada chilena), no lectura doble en cliente.
   - Análisis IA al cerrar ciclo: se guarda en DB (columna `cierre_analisis jsonb` en `estrategia_ciclos`).
   - Validar policies RLS prod vs repo antes de la migración: **HECHO en Fase 0 de esta sesión**.

### Fase 0 — Validación previa: COMPLETADA con luz verde

- **Q1 (policies):** `estrategias.family_data` coincide perfecto con el repo. En `estrategia_sugerencias_descartadas` aparecen 3 policies legacy ("delete propio", "insert propio", "select propio") junto a "family members can manage discards". No bloquea (la nueva es más permisiva, gana por OR). Queda anotado para limpiar en Fase 6.
- **Q2 (columnas):** las 16 columnas de `estrategias` en prod coinciden con la referencia del repo. `plan` sigue como `text` (esperado), `tareas jsonb` presente (planeado borrar en Fase 2).
- **Q3 (planes corruptos):** 0 filas. ALTER `plan::jsonb` va a correr limpio.

### Plan de implementación acordado (6 fases)

- **Fase 0:** Validación previa — DONE.
- **Fase 1:** DB aditiva — crear tablas `estrategia_ciclos`, `estrategia_bitacora_notas`, `estrategias_panel_descartadas`; agregar columna `ciclo_id` a `episodios`. No destructivo.
- **Fase 2:** Migración destructiva con ventana de mantenimiento — ALTER `plan` a JSONB, copiar datos a ciclos, borrar columnas legacy. ÚNICA fase con riesgo alto, requiere backup previo.
- **Fase 3:** Backend IA — función `analizarCierreCiclo()` y soporte para "Ciclo independiente" (flag `usar_memoria_ia` en `generarEstrategia`).
- **Fase 4:** Cliente adapta lectura — `HuellaContext`, `PanelPage`, `InformePDF` migran al modelo de ciclos sin cambiar UI todavía.
- **Fase 5:** Nueva UI por pantalla — se despliega pantalla por pantalla a medida que están listas. Decisión Daniel: **P5 (PDF rediseñado) se pospone para iteración posterior**; las 5 restantes son obligatorias.
- **Fase 6:** Limpieza — quitar viewer `/mockups`, mover catálogo a `src/lib/habilidades.js`, borrar dead code, limpiar las 3 policies legacy de Q1.

### Próximo paso para la siguiente sesión

Arrancar **Fase 1**: Claude Code escribe el SQL de las 3 tablas nuevas + columna `ciclo_id` en `episodios`, con policies `family_data` análogas a `estrategias`. Daniel lo corre en Supabase y valida.

### Pendiente (deuda anotada)

- Limpiar las 3 policies legacy en `estrategia_sugerencias_descartadas` (Fase 6).
- Eliminar viewer `/mockups` después de terminar el rediseño (Fase 6).
- Decisión Daniel: **P5 (PDF rediseñado) queda para después de las otras 5 pantallas**.

---

*Última actualización: 2026-05-14*

---

## ÚLTIMA SESIÓN — 14 mayo 2026

### Sesión 14 mayo 2026

Qué se hizo:
- Fase 1 del rediseño Estrategias con Ciclos COMPLETADA.
- SQL ejecutado en producción Supabase desde snippet `fase1_estrategias_ciclos`:
  - 3 tablas nuevas: estrategia_ciclos, estrategia_bitacora_notas, estrategias_panel_descartadas.
  - Columna ciclo_id agregada a episodios (uuid, FK a estrategia_ciclos, ON DELETE SET NULL).
  - Policies family_data ALL en las 3 tablas, clonando el patrón exacto de estrategias en prod (USING = user_id ∈ get_family_user_ids, WITH CHECK = auth.uid() = user_id).
  - RLS habilitado en las 3 tablas.
  - Índice único parcial uniq_ciclo_activo_por_estrategia garantiza 1 ciclo activo máx por estrategia.
  - UNIQUE (estrategia_id, numero_ciclo) evita ciclos duplicados.
- SQL guardado como migración histórica en design_handoff_estrategias/sql/002_estrategias_ciclos_fase1.sql.
- Validación post-migración: query devolvió 10 filas exactas (3 tablas + 1 columna + 3 policies + 3 RLS).

Qué quedó pendiente:
- Fase 2 — Migración destructiva (la única peligrosa). Requiere:
  - Backup previo de la DB.
  - Ventana de mantenimiento (madrugada chilena).
  - ALTER plan TEXT→JSONB en estrategias.
  - Borrar columna `tareas jsonb` (dead column).
  - Definir y ejecutar mapeo de datos legacy de estrategias.plan hacia estrategia_ciclos.
- Pendientes de QA Mi Familia en producción (heredados de sesiones anteriores) siguen abiertos pero no bloquean Fase 2.

---

### Sesión 14 mayo 2026 — continuación

Qué se hizo:
- SQL completo de Fase 2 escrito y guardado en design_handoff_estrategias/sql/003_estrategias_ciclos_fase2.sql.
- NO ejecutado. Espera a que Fase 3 y Fase 4 estén desplegadas.
- Decisiones de mapeo legacy → ciclos tomadas por Claude (no descargadas a Daniel) según regla nueva en memoria:
  - completado_at o abandonado_at → fecha_cierre + estado='cerrado'. NO se preserva distinción completado vs abandonado.
  - checkins → preservar como checkins_legacy jsonb en ciclos (ALTER aditivo en estrategia_ciclos dentro del SQL).
  - tareas → se borra (decisión 4 ya tomada, 2 estrategias tenían datos en tareas, se pierden).
  - semana_actual → se persiste como columna nueva en estrategia_ciclos.
  - episodios.ciclo_id se pobla desde episodio_origen_id + episodios_detonantes_ids de cada estrategia.
- Counts de recon (snippet fase2_recon_datos): 5 estrategias totales / 3 activas / 2 completadas / 0 abandonadas / 0 planes corruptos / 3 con checkins / 2 con tareas / 0 FK episodios→estrategias.
- Bug detectado y corregido en el SQL: la sintaxis JOIN LATERAL ... ON det.episodio_id = ep.id no es válida en UPDATE de PostgreSQL. Reemplazada por ep.id = ANY(e.episodios_detonantes_ids) en parte C.2.

Qué quedó pendiente:
- Arrancar Fase 3 (backend IA: función analizarCierreCiclo + soporte "Ciclo independiente" con flag usar_memoria_ia).
- Después Fase 4 (cliente adapta lectura al modelo de ciclos sin cambiar UI).
- Cuando Fase 3 y Fase 4 estén desplegadas: ejecutar 003_estrategias_ciclos_fase2.sql en ventana corta de madrugada chilena + backup previo.

---

### Sesión 14 mayo 2026 — Fase 3 completada

Qué se hizo:
- Fase 3 del rediseño Estrategias con Ciclos COMPLETADA.
- 2 funciones nuevas agregadas a src/services/anthropic.js:
  - analizarCierreCiclo({ hijo, ciclo, notas_bitacora, episodios_vinculados }): al cerrar un ciclo genera análisis estructurado en JSON (que_cambio, que_quedo_pendiente, recomendaciones). max_tokens 2000. Se guarda en estrategia_ciclos.cierre_analisis (jsonb).
  - generarCicloN({ hijo, habilidad, descripcion, usar_memoria_ia, ciclo_anterior, numero_ciclo }): genera el plan de un ciclo 2+. Si usar_memoria_ia es false o no hay ciclo_anterior, reutiliza generarEstrategia (4 semanas fijas, mismo prompt que ciclo 1). Si es true y hay ciclo_anterior, prompt nuevo con contexto histórico del ciclo previo (plan + cierre_analisis), duración variable 2-6 semanas controlada por semanas.length. max_tokens 4000.
- Ajustes de robustez aplicados a generarCicloN tras revisión crítica:
  - Guard al inicio: rechaza llamadas con numero_ciclo no entero o menor a 2.
  - IIFE de género usando valores consistentes con el resto del archivo (niña / niño / niñe / niño/a).
  - Validación de coherencia: duracion_semanas = parsed.semanas.length, con rango exigido 2-6.
  - Prompt actualizado para que la IA sepa que el array semanas es la fuente de verdad.
- Bug detectado y corregido durante implementación: spec original de analizarCierreCiclo usaba JSON.parse(extraerJSON(raw)), que siempre fallaba porque extraerJSON ya devuelve objeto parseado. Corregido a const parsed = extraerJSON(raw) con guard de tipo. Mismo patrón aplicado en generarCicloN.
- Total de líneas de src/services/anthropic.js: 573 → 779 (+206 líneas, todas insertadas, ninguna línea pre-existente modificada).

Qué quedó pendiente:
- Fase 4: cliente adapta lectura al modelo de ciclos sin cambiar UI. Los puntos que hoy leen de estrategias.plan, estrategias.semana_actual, estrategias.completado_at, etc., deben migrar a estrategia_ciclos del ciclo activo. HuellaContext, PanelPage, EstrategiasPage, InformePDF son los principales call sites.
- Fase 5: implementación de 5 pantallas nuevas (P1 Lista, P2 Detalle, P3 Cierre, P4 Modal Ciclo 2, P6 Panel descanso). P5 PDF pospuesto.
- Fase 6: limpieza (eliminar viewer /mockups, mover catálogo a src/lib/habilidades.js, limpiar 3 policies legacy en estrategia_sugerencias_descartadas).
- Cuando Fase 4 esté desplegada y verificada en producción: ejecutar 003_estrategias_ciclos_fase2.sql en ventana corta de madrugada chilena + backup previo.

Deudas técnicas anotadas para roadmap futuro:
- Bloque IIFE de género duplicado N veces en src/services/anthropic.js. Extraer a helper compartido cuando haya una refactorización general.
- Validación interna de cada elemento del array semanas ausente en generarCicloN, generarEstrategia y generarTareas. Patrón a unificar en pasada futura.
- 'el niño/a' en el default del IIFE de género no es estrictamente un pronombre. Trampa semántica para el futuro si se extrae a helper sin revisar.
- En generarCicloN el IIFE de género devuelve { genero, pronombre, articulo } pero solo se destructura { genero }, coherente con el patrón estructural del archivo. Si se extrae a helper, los otros 2 campos quedan disponibles para funciones que sí los necesiten.

---

### Sesión 14 mayo 2026 — Fase 2 dividida en 2a/2b

Qué se hizo:
- Decisión arquitectónica revisada: Fase 2 se divide en 2a (aditivo) y 2b (destructivo).
- Razón: Fase 4 (cliente adapta lectura) necesita datos reales en estrategia_ciclos para desarrollarse y testearse. Si Fase 2 se ejecuta entera en ventana corta, Fase 4 no se puede validar contra prod hasta el último momento.
- Respeta decisión 5 (no lectura doble en cliente): mientras Fase 4 no esté desplegada, el cliente actual sigue leyendo solo del modelo viejo. La duplicación temporal vive en DB, no en lectura.
- Archivos SQL reorganizados:
  - design_handoff_estrategias/sql/003_estrategias_ciclos_fase2a_aditivo.sql: ALTER ADD COLUMN + INSERT estrategia_ciclos + UPDATE episodios.ciclo_id. NO destructivo.
  - design_handoff_estrategias/sql/004_estrategias_ciclos_fase2b_destructivo.sql: solo DROP COLUMN de las 8 columnas legacy en estrategias.

Qué quedó pendiente:
- Ejecutar 003 (Fase 2a) en producción Supabase. Validar con queries.
- Implementar Fase 4 en bloques (mapper + loads, escrituras, helpers).
- Implementar Fase 5 (5 pantallas nuevas).
- Cuando Fase 4+5 estén desplegadas y verificadas: ventana corta para ejecutar 004 (Fase 2b). Antes de eso, re-correr la PARTE B de 003 para capturar estrategias nuevas creadas en el intervalo.

---

### Sesión 14 mayo 2026 — Fase 2a ejecutada

Qué se hizo:
- SQL 003_estrategias_ciclos_fase2a_aditivo.sql actualizado con ON CONFLICT DO UPDATE en la PARTE B para que sea idempotente Y sincronizadora.
- Ejecutado en producción Supabase. Output: Success.
- Validación post-ejecución (snippet fase2a_verificacion) devolvió 10 filas exactas como se esperaba:
  - 5 ciclos totales, todos numero_ciclo=1.
  - 3 activos (estado='activo'), 2 cerrados (estado='cerrado').
  - 5 con plan, 2 con fecha_cierre, 3 con checkins_legacy.
  - 3 episodios vinculados al ciclo vía PARTE C.
  - Las 2 columnas nuevas (semana_actual, checkins_legacy) en estrategia_ciclos confirmadas.
- A partir de este momento, los datos viven DUPLICADOS en estrategias.* y estrategia_ciclos.* hasta la ventana de Fase 2b.

Regla crítica para roadmap:
- 003 se re-corre solo dentro de la ventana de Fase 2b, justo antes del DROP de columnas.
- NUNCA re-correr 003 después de que Fase 4 esté desplegada en producción, porque sobrescribiría progreso real del usuario con datos viejos de estrategias.*.

Qué quedó pendiente:
- Implementar Fase 4 (cliente adapta lectura al modelo de ciclos sin cambiar UI). Plan en 3 bloques:
  - Bloque 1: adaptar mapper dbEstrategiaToApp + loadHijoDatos + loadUserData en src/context/HuellaContext.jsx para que aplanen el ciclo activo en las claves que la UI ya espera (shim de compatibilidad).
  - Bloque 2: adaptar las funciones de escritura para que apunten a estrategia_ciclos en vez de estrategias. Call sites: addEstrategia y updateEstrategia en HuellaContext.jsx; onAvanzar / onGenerarTareas / onToggleTarea en EstrategiaDetailPage.jsx; abandonarPlanYCrear en EstrategiaNuevaPage.jsx; handleCasoLibre en EstrategiasPage.jsx.
  - Bloque 3: refactor de estadoPlan en src/pages/estrategias/helpers.js (basado en el estado del ciclo activo, no en completado_at/abandonado_at).
- Implementar Fase 5: 5 pantallas nuevas (P1 Lista, P2 Detalle, P3 Cierre, P4 Modal Ciclo 2, P6 Panel descanso). P5 PDF pospuesto.
- Cuando Fase 4 + Fase 5 estén desplegadas y verificadas en producción: ventana corta para ejecutar 004_estrategias_ciclos_fase2b_destructivo.sql. Antes del DROP, re-correr 003 una última vez para capturar cualquier cambio hecho desde el cliente viejo en el intervalo.

Reporte de auditoría de Fase 4 (resumen):
- 80 call sites identificados (60 lecturas + 20 escrituras) a columnas legacy de estrategias.
- Centro de gravedad: HuellaContext.jsx (mapper dbEstrategiaToApp + funciones add/updateEstrategia + loads).
- Approach decidido: shim de compatibilidad en el mapper (mantener mismas claves que la UI espera, leer internamente del ciclo activo). 80% de los componentes no requieren cambios.

---

### Sesión 14 mayo 2026 — Fase 4 Bloque 1 implementado (pendiente verificación de Daniel)

Qué se hizo:
- Bloque 1 de Fase 4 implementado en src/context/HuellaContext.jsx. Todos los cambios son de LECTURA — ninguna escritura tocada (eso es Bloque 2).
- dbEstrategiaToApp reescrito como shim de compatibilidad:
  - Lee row.estrategia_ciclos (array que viene del join anidado).
  - Ordena ciclos por numero_ciclo desc.
  - Elige el "ciclo visible": primero el que tiene estado='activo'; si no hay activo, el más reciente. Garantiza continuidad cuando una estrategia está "entre ciclos".
  - Aplana el ciclo visible en las claves legacy que la UI ya espera: plan, semana_actual, semanaActual, total_semanas, completado_at, checkins, cierre_analisis.
  - Suma claves aditivas para Bloques 2/3 y Fase 5: ciclos[] (array completo con shape de app), ciclo_activo_id, numero_ciclo_actual.
  - Caso sin ciclos (estrategia recién creada o join vacío): valores neutros coherentes con shape legacy.
- Decisiones de traducción legacy → ciclos aplicadas (aprobadas previamente por Daniel):
  - plan jsonb se sigue leyendo con parsePlanField — defensivo por si algún ciclo viejo quedó como string.
  - semana_activa NO se aplana (no existe en el modelo nuevo, posible confusión con semana_actual).
  - completado_at se deriva: cicloVisible.estado === 'cerrado' ? cicloVisible.fecha_cierre : null.
  - checkins legacy se leen desde cicloVisible.checkins_legacy ?? [] (Fase 2a los movió ahí).
  - total_semanas = cicloVisible.duracion_semanas ?? row.total_semanas ?? 4.
  - tareas siempre {} (dead column, se borra en Fase 2b).
  - abandonado_at siempre null (decisión 4: no se preserva la distinción completado/abandonado).
- loadHijoDatos: query a estrategias ahora hace .select() con join anidado a estrategia_ciclos (13 columnas explícitas, no *).
- loadUserData (fase 2 interna): mismo join anidado en la query de estrategias.
- 0 cambios en escrituras (addEstrategia, updateEstrategia, deleteEstrategia siguen apuntando a estrategias.* legacy — eso es Bloque 2).
- 0 cambios en UI ni en otros archivos.

Por qué funciona sin romper nada:
- Los datos viven duplicados en estrategias.* y estrategia_ciclos.* desde Fase 2a. El shim lee del modelo nuevo y devuelve el shape viejo.
- 80% de los componentes no se enteran del cambio. Los que sí leen claves aditivas (ciclos[], ciclo_activo_id) tendrán datos disponibles desde ya, listos para Bloques 2/3 y Fase 5.

Qué quedó pendiente:
- VERIFICACIÓN EN PRODUCCIÓN POR DANIEL (auto-deploy en Vercel después del push). Solo cuando confirme, este bloque pasa a "completado".
- Bloque 2: adaptar escrituras (addEstrategia, updateEstrategia, onAvanzar, onGenerarTareas, onToggleTarea, abandonarPlanYCrear, handleCasoLibre) para que apunten a estrategia_ciclos.
- Bloque 3: refactor de estadoPlan en src/pages/estrategias/helpers.js basado en el estado del ciclo activo.
- Fase 5: 5 pantallas nuevas (P1 Lista, P2 Detalle, P3 Cierre, P4 Modal Ciclo 2, P6 Panel descanso). P5 PDF pospuesto.
- Fase 2b (DROP de 8 columnas legacy) cuando Fase 4 + 5 estén verificadas.

---

### Sesión 14 mayo 2026 — Fase 4 Bloque 2A implementado (pendiente verificación de Daniel)

Qué se hizo:
- Bloque 2A de Fase 4 implementado: 3 funciones de creación de estrategia ahora escriben en el modelo nuevo (identidad + ciclo 1 activo) en lugar de las columnas legacy.
- Decisión durante el bloque: se detectaron 3 funciones de creación (no 2 como decía el prompt original). Daniel aprobó extender el scope a las 3:
  1. addEstrategia (HuellaContext.jsx) — código zombie sin caller, se refactorizó igual para que quede lista.
  2. handleCasoLibre (EstrategiasPage.jsx) — flujo "Cuéntame tu caso".
  3. generar (EstrategiaNuevaPage.jsx) — flujo principal "elegir habilidad → wizard". Era el más crítico: sin este bloque, las estrategias nuevas creadas por el flujo más usado aparecían con plan=null en pantalla por el shim de Bloque 1.
- Helper compartido en HuellaContext.jsx:
  - crearEstrategiaConCiclo({ hijo_id, habilidad, habilidad_grupo, descripcion, plan, fecha_inicio, episodio_origen_id, episodios_detonantes_ids }):
    * INSERT identidad en estrategias (user_id, hijo_id, habilidad, descripcion, fecha_inicio, episodio_origen_id, episodios_detonantes_ids, habilidad_grupo si aplica). Las columnas plan/semana_actual/total_semanas/tareas/completado_at/abandonado_at NO se escriben (quedan NULL, se borran en Fase 2b).
    * INSERT ciclo 1 en estrategia_ciclos (numero_ciclo=1, estado='activo', plan jsonb, semana_actual=1, duracion_semanas derivado de plan.semanas.length con fallback 4, usar_memoria_ia=false).
    * Cleanup: si el segundo INSERT falla, DELETE de la fila de estrategias para no dejar huérfanos.
    * Retorna la row de identidad. NO hace dispatch (el caller decide).
  - reloadEstrategias(): refresca solo el array de estrategias del hijo activo con join anidado a estrategia_ciclos (mismo shape de query que loadHijoDatos del Bloque 1).
  - Ambas expuestas en el value del context.
- addEstrategia (HuellaContext.jsx) reescrito:
  - Quitó el dispatch optimista ADD_ESTRATEGIA (no aporta valor, nadie llama esta función hoy).
  - Llama al helper + reloadEstrategias. Retorna el id como antes para no romper la firma.
- handleCasoLibre (EstrategiasPage.jsx) reescrito:
  - Quitó el INSERT directo a Supabase + el dispatch ESTRATEGIA_CREADA con objeto manual.
  - Llama al helper + reloadEstrategias + navigate al detalle.
  - Quité dispatch del destructure de useHuella() porque ya no se usa.
- generar (EstrategiaNuevaPage.jsx) reescrito:
  - Quitó el INSERT directo + dispatch ESTRATEGIA_CREADA con nuevoPlan manual.
  - Llama al helper + reloadEstrategias + navigate al detalle.
  - Quitó useAuth import + const user (quedó huérfano tras el refactor).
- 0 cambios en abandonarPlanYCrear (es Bloque 2C). 0 cambios en updateEstrategia / deleteEstrategia / onAvanzar / onGenerarTareas / onToggleTarea (son Bloque 2B). 0 cambios en UI.

Stat del diff:
- src/context/HuellaContext.jsx: +123 / -... (helper + reloadEstrategias + refactor addEstrategia + 2 keys nuevas en context value).
- src/pages/estrategias/EstrategiasPage.jsx: 47 líneas removidas en handleCasoLibre, 8 agregadas.
- src/pages/estrategias/EstrategiaNuevaPage.jsx: 55 líneas removidas en generar, 9 agregadas. Import useAuth y const user huérfanos eliminados.

Por qué funciona sin romper nada:
- Las estrategias creadas con cualquiera de los 3 flujos ahora viven en el modelo nuevo. El shim de Bloque 1 las aplana automáticamente: el ciclo 1 activo se ve como "plan, semana_actual=1, estado activo" en la UI.
- Las estrategias viejas (creadas antes de Bloque 2A) siguen leyéndose vía el ciclo 1 poblado por Fase 2a — coexisten sin problema.
- Sigue escribiendo fecha_inicio en estrategias para mantener el ORDER BY funcionando. Deuda anotada: cambiar ORDER BY a created_at o a estrategia_ciclos.fecha_inicio antes de correr Fase 2b (que dropea fecha_inicio).

Qué quedó pendiente:
- VERIFICACIÓN EN PRODUCCIÓN POR DANIEL del flujo de creación (mejor por "elegir habilidad", que es el más usado).
- Bloque 2B: onAvanzar, onGenerarTareas, onToggleTarea en EstrategiaDetailPage.jsx. Tocan UPDATE de estrategias.* legacy hoy; tienen que apuntar a estrategia_ciclos.
- Bloque 2C: abandonarPlanYCrear en EstrategiaNuevaPage.jsx. Hoy es un UPDATE que setea abandonado_at en estrategias.* legacy. En el modelo nuevo debe cerrar el ciclo activo (estado='cerrado' + fecha_cierre).
- Bloque 3: refactor de estadoPlan en src/pages/estrategias/helpers.js.
- Fase 5: 5 pantallas nuevas. Fase 2b después.
- Deuda anotada: cambiar el ORDER BY de loadHijoDatos / loadUserData / reloadEstrategias antes de Fase 2b.

---

### Sesión 15 mayo 2026 — Fase 4 Bloque 2B implementado (pendiente verificación de Daniel)

Qué se hizo:
- Bloque 2B de Fase 4 implementado: las interacciones con un plan ya creado escriben en el ciclo activo de estrategia_ciclos, no en columnas legacy de estrategias.
- Patrón único aplicado en las 3 acciones de EstrategiaDetailPage.jsx:
  - Helper local getCicloActivo(): busca el ciclo con estado='activo' dentro de plan.ciclos (que el shim de Bloque 1 expone). Si no hay, loguea y retorna sin escribir (no inventa ciclo).
  - UPDATE targeteado por PK del ciclo activo: .eq('id', cicloActivo.id).eq('estado', 'activo'). El segundo filtro es refuerzo anti-race: si el ciclo cambió de estado entre el guard JS y la escritura (otra pestaña/dispositivo), el UPDATE afecta 0 filas en vez de escribir sobre un ciclo cerrado.
- onToggleTarea: mantiene dispatch optimista + revert (checkbox instantáneo). Solo cambió el target del UPDATE a estrategia_ciclos.plan del ciclo activo.
- onGenerarTareas: mantiene dispatch optimista. La llamada a la IA (generarTareas) no cambió. Solo cambió el target del UPDATE a estrategia_ciclos.plan.
- onAvanzar: reescrito sin dispatch optimista. Hace UPDATE a estrategia_ciclos + reloadEstrategias() (patrón Bloque 2A). El estado avanzando absorbe el round-trip.
  - Avance normal: { semana_actual: actual + 1, checkins_legacy: newCheckins }.
  - Cierre de ciclo (cuando actual + 1 > duracion_semanas): { estado: 'cerrado', fecha_cierre: hoy (date, slice 0-10), semana_actual: dur, checkins_legacy: newCheckins }. El shim de Bloque 1 traduce estado='cerrado'+fecha_cierre a completado_at para la UI; el BannerCompletado aparece tras el reload.
  - duracion_semanas se lee del ciclo activo (cicloActivo.duracion_semanas) con fallback a plan.total_semanas ?? 4.
  - El check-in semanal se escribe en checkins_legacy con el shape exacto del legacy: { semana_numero, reflexion, completada_at } (completada_at con 'a' final — NO se "corrigió" a 'o', el shim lo lee así).
  - El INSERT de hito al completar (addHito) se conserva igual; es no-crítico.
- updateEstrategia (HuellaContext.jsx) — código ZOMBIE sin callers reales. Refactorizado igual para que, si algún flujo futuro la usa, escriba en estrategia_ciclos del ciclo activo (WHERE estrategia_id = id AND estado = 'activo') en lugar de columnas legacy. Sin rama de identidad (habilidad/descripcion): nadie la pasa. Quitado el dispatch optimista (coherente con addEstrategia de 2B). checkins → checkins_legacy; plan → plan; semanaActual → semana_actual.
- 0 cambios en abandonarPlanYCrear (Bloque 2C), deleteEstrategia, helpers.js/estadoPlan (Bloque 3), UI de componentes.

Stat del diff:
- src/context/HuellaContext.jsx: ~+12/-8 (refactor updateEstrategia zombie).
- src/pages/estrategias/EstrategiaDetailPage.jsx: ~+55/-20 (3 acciones + helper getCicloActivo + reloadEstrategias en destructure).

Por qué funciona sin romper nada:
- Las escrituras ahora van al mismo ciclo activo que el shim de Bloque 1 lee. Marcar tarea / avanzar / completar persiste y se ve tras recargar.
- onToggleTarea/onGenerarTareas siguen sintiéndose instantáneos por el optimista; onAvanzar muestra "Avanzando…/Cerrando…" durante el round-trip.

Deuda menor anotada (NO se borra en este bloque, fuera de scope):
- El reducer case ESTRATEGIA_AVANZADA en HuellaContext.jsx quedó sin uso tras pasar onAvanzar a reloadEstrategias. Es código muerto inofensivo. Limpiar en una pasada futura junto con otros zombies (addEstrategia/updateEstrategia exposiciones, ESTRATEGIA_CREADA si también queda sin uso).

Qué quedó pendiente:
- VERIFICACIÓN EN PRODUCCIÓN POR DANIEL de las 3 acciones (marcar tarea, avanzar de semana, completar plan).
- Bloque 2C: abandonarPlanYCrear en EstrategiaNuevaPage.jsx → cerrar el ciclo activo (estado='cerrado' + fecha_cierre) en vez de setear abandonado_at legacy.
- Bloque 3: refactor de estadoPlan en src/pages/estrategias/helpers.js.
- Fase 5: 5 pantallas nuevas. Fase 2b después.
- Deuda: ORDER BY antes de Fase 2b; limpieza de zombies (reducer + funciones expuestas sin caller).

---

### Sesión 15 mayo 2026 — Fase 4 Bloque 2C implementado (pendiente verificación de Daniel)

Qué se hizo:
- Bloque 2C de Fase 4 implementado: abandonar un plan para crear otro ahora cierra el ciclo activo en el modelo de ciclos.
- Hallazgo durante el bloque: abandonarPlanYCrear NO crea la estrategia nueva. Solo cierra el plan viejo y delega en generar(), que ya fue migrado en Bloque 2A (usa crearEstrategiaConCiclo + reloadEstrategias + navigate). El pseudo-código del prompt habría duplicado la creación (2 estrategias por abandono). Daniel aprobó el scope reducido: solo refactorizar el cierre.
- abandonarPlanYCrear (EstrategiaNuevaPage.jsx) refactorizado:
  - Busca el plan viejo en state.estrategias y su ciclo activo en .ciclos[] (el shim de Bloque 1 lo expone).
  - Guard: si no hay ciclo activo → setCapError("No pudimos cerrar tu plan actual. Recarga la app e inténtalo de nuevo.") + abortar SIN llamar generar().
  - UPDATE a estrategia_ciclos: estado='cerrado', fecha_cierre=hoy (date), cierre_analisis={ motivo:'abandonado', abandonado_at:<ISO> }. Filtros .eq('id', cicloActivo.id).eq('estado','activo') (cinturón anti-race).
  - Manejo de error reforzado: si el UPDATE del cierre falla, NO se llama generar() (evita que el papá termine con 2 estrategias activas). Solo si el cierre tuvo éxito → setShowCapModal(false) + generar().
  - Quitado el dispatch optimista (generar() hace reloadEstrategias al final). dispatch quedó huérfano en el archivo → eliminado del destructure de useHuella().
- Caso 2 confirmado contra migración 002: la columna estado de estrategia_ciclos solo admite 'activo'/'cerrado' (CHECK constraint). Por eso el motivo "abandonado" va en cierre_analisis, no en estado.
- 0 cambios en generar() (Bloque 2A), HuellaContext, helpers.js, UI.

Stat del diff:
- src/pages/estrategias/EstrategiaNuevaPage.jsx: +26/-5 (refactor abandonarPlanYCrear + limpieza dispatch huérfano).

Cómo queda la semántica:
- Un plan abandonado: su ciclo queda estado='cerrado' + fecha_cierre + cierre_analisis con motivo='abandonado'. El shim de Bloque 1 lo traduce a completado_at poblado → estadoPlan lo saca de "activos" y lo manda a planes pasados. NO se preserva la distinción visual completado vs abandonado en la UI actual (decisión 4 del rediseño). El rastro del abandono queda en cierre_analisis para Fase 5.

Deuda menor anotada (NO se borra en este bloque):
- cierre_analisis tiene ahora dos shapes posibles: análisis IA de Fase 3 ({ que_cambio, que_quedo_pendiente, recomendaciones }) vs cierre por abandono ({ motivo:'abandonado', abandonado_at }). Fase 5 (pantalla de cierre P3) debe ramificar por presencia de la clave 'motivo'. Anotado para Fase 5.
- Sigue pendiente: reducer ESTRATEGIA_AVANZADA huérfano (Bloque 2B), ORDER BY antes de Fase 2b, limpieza general de zombies.

Qué quedó pendiente:
- VERIFICACIÓN EN PRODUCCIÓN POR DANIEL del flujo abandonar+crear.
- Bloque 3: refactor de estadoPlan en src/pages/estrategias/helpers.js (basado en estado del ciclo activo, no en completado_at/abandonado_at legacy).
- Fase 5: 5 pantallas nuevas (P1 Lista, P2 Detalle, P3 Cierre, P4 Modal Ciclo 2, P6 Panel descanso). P5 PDF pospuesto.
- Fase 2b (DROP de 8 columnas legacy) cuando Fase 4 + 5 estén verificadas.

---

### Sesión 15 mayo 2026 — Fase 4 Bloque 3 implementado — FASE 4 COMPLETA (pendiente verificación final de Daniel)

Qué se hizo:
- Bloque 3 de Fase 4 implementado: estadoPlan (src/pages/estrategias/helpers.js) decide a partir de los ciclos del shim de Bloque 1, no de columnas legacy.
- estadoPlan refactorizado (misma API, mismos 3 valores de retorno):
  1. Si algún ciclo tiene estado='activo' → 'activo'.
  2. Si no hay ciclos (caso borde post-2A improbable) → 'activo' (replica el default legacy exacto: antes retornaba 'activo' cuando no había completado_at ni abandonado_at).
  3. Si el ciclo más reciente (ciclos[0], el shim los entrega ordenados desc por numero_ciclo) tiene cierre_analisis?.motivo === 'abandonado' → 'abandonado'.
  4. Cualquier otro ciclo cerrado → 'completado'.
- Defensivo: p?.ciclos puede ser undefined/[]; cierre_analisis puede ser null. Optional chaining en ambos.
- Bug latente corregido: antes de este bloque, post-2C, un plan abandonado se clasificaba MAL como 'completado'. Causa: el shim de Bloque 1 expone abandonado_at siempre null y deriva completado_at de cualquier ciclo estado='cerrado' (incluido el abandonado). Ahora la distinción se hace por cierre_analisis.motivo.
- Callers verificados (6 sitios, 4 archivos), ninguno necesita cambios porque la API no cambió:
  - EstrategiaNuevaPage.jsx:51 (cap de 3 activos).
  - EstrategiaDetailPage.jsx:29 (BannerCompletado + render de semanas).
  - EstrategiasPage.jsx:47/51/126 (planesActivos / planesPasados / exclusión 90 días).
  - DrawerPasados.jsx:20 (distingue completado ✓ "X sem" vs abandonado ✕ "abandonado en sem N").
- estadoPlan no depende de otros helpers internos. 0 cambios fuera de la función.

Stat del diff:
- src/pages/estrategias/helpers.js: +18/-4 (solo estadoPlan).

ESTADO DE FASE 4: COMPLETA en código (Bloques 1 + 2A + 2B + 2C + 3), pendiente verificación final de Daniel en producción. Una vez verificada toda la Fase 4, se puede arrancar Fase 5 y, tras Fase 5, la ventana de Fase 2b.

Recordatorio crítico de roadmap (sigue vigente):
- NUNCA re-correr 003_estrategias_ciclos_fase2a_aditivo.sql ahora que Fase 4 escribe directo a estrategia_ciclos. Solo dentro de la ventana de Fase 2b, justo antes del DROP, para capturar cambios del cliente viejo (que ya no existe).

Deuda menor (NO se borra, fuera de scope de Bloque 3):
- reducer ESTRATEGIA_AVANZADA huérfano (Bloque 2B). Posible ESTRATEGIA_CREADA también huérfano tras 2A — verificar en limpieza futura.
- cierre_analisis con dos shapes (análisis IA Fase 3 vs { motivo:'abandonado' }). Fase 5 P3 debe ramificar por la clave 'motivo'.
- ORDER BY de loadHijoDatos/loadUserData/reloadEstrategias usa estrategias.fecha_inicio (se dropea en Fase 2b). Cambiar a created_at o estrategia_ciclos.fecha_inicio antes de correr 004.
- Limpieza general de zombies (addEstrategia/updateEstrategia expuestas sin caller).
