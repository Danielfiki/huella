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

### 11. PDF exportable
- Botón "Exportar informe PDF" en el historial (lazy-loaded)
- Incluye historial clínico completo: episodios, estrategias, hitos

---

## Módulos sin empezar ❌

### Modo pareja
Placeholder "Próximamente". Requiere tabla de vínculos entre usuarios, lógica de invitación y vista compartida.

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

## Diseño y UX
- Colores pastel cálidos, fondo salmón/crema
- Tipografía limpia, lenguaje humano sin jerga clínica
- Diseño tipo app móvil centrado en pantalla
- Nunca diagnostica, siempre orienta
- Cada respuesta termina con disclaimer clínico

---

*Última actualización: 2026-04-19*
