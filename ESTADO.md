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

### Bug Historial vacío — Investigación frontend (sesión actual)

**Contexto**: Fase 1 SQL aplicada y verificada. DB correcta. Pero el Historial de la partner sigue vacío.

**Diagnóstico**: El bug NO está en HistorialPage (lee `state.episodios` sin filtros adicionales). Está en `HuellaContext.jsx:293-295` — la selección de `hijoActivoId`.

**Bug principal (casi certero)**:
La vieja `accept_partner_invitation` (antes del fix Fase 1) hacía `UPDATE hijos SET family_id` en el hijo de la partner en vez de borrarlo. Resultado: mama tiene `hijo_B` propio (vacío) + ve `hijo_A` del papá (via family RLS). Ambos con el mismo `family_id`. La query `loadUserData` pide hijos ordenados por `created_at ASC` → `hijos[0] = hijo_B` (más viejo) → `hijoActivoId = hijo_B.id` → todos los filtros de episodios/hitos/estrategias apuntan a `hijo_B` → 0 resultados. Los 22 episodios del papá tienen `hijo_id = hijo_A.id`.

**Bug secundario (posible agravante)**:
La política `family_members_read` es auto-referencial. Si falla en Supabase/PostgREST, `FamilyContext` no puede leer la fila del papá → `family.partner = null` → `partnerIds = [mama.id]` → episodios del papá (con `user_id = papa.id`) no se traen aunque `hijo_id` sea correcto.

**Query de diagnóstico para Daniel** (correr en SQL Editor como la cuenta de la partner):
```sql
SELECT id, user_id, nombre, family_id, created_at
FROM hijos ORDER BY created_at ASC;
-- Si devuelve 2 filas → bug del hijo duplicado confirmado
-- Si devuelve 1 fila → bug está en partnerIds / family.partner
```

**Plan de fix (pendiente aprobación)**:
- **Fix A** (SQL, para usuarios existentes): DELETE del hijo vacío de mama que quedó de la migración vieja
- **Fix B** (Frontend): cambiar `hijoActivoId` para no elegir ciegamente `hijos[0]`
- **Fix C** (RLS opcional): reemplazar política `family_members_read` con helper SECURITY DEFINER, o usar el RPC `get_partner_info()` en FamilyContext

---

## Pendientes próxima sesión

1. **Daniel corre la query diagnóstico** (ver arriba) y confirma si hay 1 o 2 hijos visibles para la partner
2. **Implementar fix** según confirmación (Fix A + posiblemente B o C)
3. **Probar flujo Mi Familia** — papá invita → mamá acepta → mamá ve datos del papá correctamente
4. **Fase 2 + 3 Mi Familia** — "quién registró" en UI y permisos de edición (cuando esté confirmado que el fix funciona)
5. **Pass de diseño coherente con Inicio e Historial** — usar Claude Design cuando vuelva el límite semanal
6. *(Opcional, futuro)* **Generación incremental por semana**

---

*Última actualización: 2026-05-11*
