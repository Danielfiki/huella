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

## Pendientes próxima sesión

1. **Verificar visualmente el panel rediseñado en producción** (huella-theta.vercel.app) — confirmar: (a) Hero mocha se ve completo arriba, (b) CTAPrimary tiene la sombra tangerina, (c) CTAAskHuella hace scroll y dispara el análisis, (d) ResumenSemanal muestra los 3 tiles, (e) gráficos visibles desde 3+ episodios
2. **Verificar el PDF en producción** — ligaduras, títulos de sección, sin voseo
3. **Subir fuentes estáticas a Claude Design** — los 9 TTF al asset panel de claude.ai/design

---

*Última actualización: 2026-05-06*
