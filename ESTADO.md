# ESTADO.md — Proyecto Huella

*Última actualización: sábado 31 mayo 2026 — Sesión C (prevenciones de raíz) cerrada y verificada en producción.*

> El histórico de sesiones anteriores (3292 líneas) quedó congelado en `git HEAD`. Si en alguna próxima sesión necesitas recuperarlo:
> ```
> git show HEAD~1:ESTADO.md > ESTADO.historico.md
> ```
> (Ajusta `HEAD~1` al commit donde aún vivía el archivo grande si ya se hicieron commits intermedios.)

---

## Stack técnico

- Frontend: React + Vite
- IA: API de Anthropic, modelo `claude-sonnet-4-5`
- Auth y DB: Supabase
- Deploy: Vercel (huella-theta.vercel.app, auto-deploy en `git push origin main`)
- Repo: github.com/Danielfiki/huella
- Ruta local: `C:\Users\dundu\OneDrive\Desktop\florecia`
- Comando para abrir Claude Code:
  ```
  $env:PATH += ";C:\Users\dundu\.local\bin"; cd C:\Users\dundu\OneDrive\Desktop\florecia; claude --dangerously-skip-permissions
  ```

---

## Cerrado hoy (martes 26 mayo 2026)

### 1. Bug Wolfelt — autor incorrecto en Acción Rápida — RESUELTO EN PRODUCCIÓN

- **Diagnóstico:** la keyword `'se fue'` dentro de `KEYWORDS_DUELO` matcheaba contextos cotidianos como "mamá se fue de la pieza" o "abuelos se fueron", disparando `dimension = 'duelo'` y `autor = Alan Wolfelt` en episodios que en realidad eran de miedo nocturno o llanto por despedida temporal.
- **Bug secundario:** cuando la dimensión `duelo` se gatillaba mal, el modelo introducía las palabras "duelo" / "pérdida" en el cuerpo del consejo, contaminando el output.
- **Fix aplicado** en `src/services/anthropic.js`:
  - Split de `KEYWORDS_DUELO` en dos listas separadas:
    - `KEYWORDS_DUELO_INEQUIVOCAS`: `muri`, `funeral`, `cementerio`, `velorio`, `tumba`, `cremacion`, `entierro`, `sin vida`, `ya no esta/vive`, etc. — términos que por sí solos garantizan duelo real.
    - `KEYWORDS_DUELO_AMBIGUAS`: `se fue`, `perdida`, `separaci`, `divorci`, `extraña a`, `me dejo`, `abuela enferm`, etc. — términos que aparecen en duelo pero también en contextos cotidianos.
  - Solo INEQUIVOCAS detonan dimensión = duelo. AMBIGUAS quedan declaradas para confirmación cruzada futura (no se evalúan hoy).
  - Blindaje del prompt: regla explícita en `REGLAS DURAS` que prohíbe mencionar la dimensión, el autor, la lente o jerga clínica en el cuerpo del consejo (ej. "duelo", "autorregulación", "ventana de tolerancia", "apego seguro").
- **Limpieza de BD:** 2 episodios históricos con falso positivo fueron seteados a `NULL` en sus 5 columnas `accion_rapida_*` para regenerarse con la heurística nueva al próximo render del Historial:
  - `2cad220b-8753-4a33-b302-9495e63599df` (Pascualito, miedo, 24 mayo)
  - `1bb5a328-1ac3-46a7-83b0-ca5d0692756b` (llanto, 23 mayo)
- **Commit único:** `61015cb` — `fix(accion-rapida): split KEYWORDS_DUELO en inequívocas/ambiguas + blinda prompt contra autorreferencia de dimensión`.
- **Verificación en producción:** OK. Ambos episodios quedaron firmados por *Daniel Siegel · Desarrollo cerebral*, sin mencionar duelo en el cuerpo.

### 2. Bug Modo Parejas — hijo duplicado al aceptar invitación — RESUELTO EN PRODUCCIÓN CON QA REAL EXITOSO

- **Diagnóstico:** cadena de 3 fallas combinadas que producía un hijo huérfano (con `family_id = NULL`) al lado del hijo canónico del owner. La RLS aislaba a cada miembro de la pareja de los datos del otro.
  - **Falla 1:** `SignupPage.jsx` no preservaba el query param `?redirect=` después de la confirmación de email ni en el flujo de Google OAuth. Resultado: la pareja invitada terminaba en `/panel` sin pasar nunca por `accept_partner_invitation`.
  - **Falla 2:** `Layout.jsx` no era family-aware. Decidía mostrar el onboarding solo con localStorage/sessionStorage, sin consultar `FamilyContext`. Resultado: la pareja veía el onboarding completo (incluyendo el slide 4 con nombre/fecha/sexo/foto del hijo) aunque ya fuera member de una familia.
  - **Falla 3:** `onboardingPersistor.js` no chequeaba si había una invitación pendiente antes de llamar `upsert_family_child(p_hijo_id = null)`. Como el partner aún no era member, el guard de role en el SQL no se activaba y se hacía INSERT del hijo huérfano.
- **Fix en 3 commits separados** (granularidad de revert preservada — cada commit toca archivos disjuntos):
  - **Commit `b1d5c64`** — `fix(auth): preserva redirect en signup/login y propaga a Google OAuth`
    - `src/context/AuthContext.jsx`: firma nueva `signInWithGoogle(nextPath = '/panel')`, valida que el path empiece con `/`.
    - `src/pages/auth/SignupPage.jsx`: lee `?redirect=`, lo pasa a Google y lo preserva en el `Link` post-confirm-email.
    - `src/pages/auth/LoginPage.jsx`: pasa `redirectTo` a Google y preserva el redirect en el footer `Link to /signup`.
  - **Commit `d0d7214`** — `fix(layout): Layout family-aware para no mostrar onboarding a partners`
    - `src/components/layout/Layout.jsx`: consume `useFamily()`, `useEffect` reactivo a `family?.role` cierra `showOnboarding` si el rol no es `owner`, gating del render con `!familyLoading && (!family || family.role === 'owner')` evita el flash visual mientras FamilyContext carga.
  - **Commit `e63cc6d`** — `fix(onboarding): guard contra duplicado de hijo si hay invitación pendiente`
    - `src/services/onboardingPersistor.js`: guard ANTES de cualquier escritura. Llama RPC `get_my_pending_invitation`. Si hay invitación pendiente, dispara `window.location.assign('/invitar?token=xxx')` y aborta. Defensivo con try/catch: si la RPC falla por cualquier razón (incluida "no existe"), trata como "no hay invitación" y sigue el flujo normal.
    - `supabase/migrations/004_get_my_pending_invitation.sql` (nuevo): RPC `SECURITY DEFINER` para que el invitee pueda leer su propia invitación (la policy `invitations_own` solo permite lectura al inviter).
    - `supabase/schema.sql`: espejo de la RPC para mantener consistencia entre repo y producción.
- **Migración 004 aplicada en Supabase:** OK.
- **QA end-to-end con 2 cuentas reales en 2 dispositivos:** la pareja invitada llega directo al `/panel` viendo los hijos del owner, sin pasar por el onboarding. Falla 1 + Falla 2 confirmadas funcionando. Falla 3 quedó como defensa adicional (no se gatilló en el QA porque las dos primeras hicieron su trabajo, pero protege el flujo si alguna de las anteriores fallara en el futuro).

---

## Pendiente pre-lanzamiento (3 días: miércoles 27, jueves 28, viernes 29)

### URGENTE — descubiertos hoy en QA de modo parejas

#### A. Bug: correo de invitación no llega al destinatario — prioridad MÁXIMA

- **Síntoma:** al invitar pareja desde el perfil, la app muestra "invitación enviada" pero el email B nunca recibe el correo. Solo funciona con el link copiable manual de respaldo.
- **Hipótesis a investigar:**
  - Variable de entorno `RESEND_API_KEY` en Vercel (¿activa? ¿con el valor correcto?).
  - Dominio remitente verificado en Resend (SPF/DKIM/DMARC).
  - Endpoint `/api/invite` fallando silenciosamente (status 200 pero error interno).
  - Configuración del `RESEND_FROM_EMAIL` en Vercel.
- **Sin esto, modo parejas no funciona en el mundo real** para parejas que no saben copiar links.
- **Próximo paso:** diagnóstico de `/api/invite`, revisar logs de Vercel en runtime + dashboard de Resend (entregas, bounces, rejected).

#### B. Bug: LoginPage no tiene opción "¿Olvidaste tu contraseña?" — prioridad ALTA

- **Síntoma:** en `/login` solo aparece "¿No tienes cuenta? Crear cuenta". Una pareja invitada que no recuerda su password queda bloqueada definitivamente.
- **Fix esperado:** agregar link "¿Olvidaste tu contraseña?" debajo del botón "Ingresar", que dispare `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`.
- **Pre-lanzamiento obligatorio.**

#### C. Limpieza BD: hijo fantasma "Pascu" — prioridad BAJA

- **Contexto:** en la cuenta `d.undurraga@pacificschoolpichilemu.com` existe un hijo llamado "Pascu" generado por el flujo viejo de onboarding antes del fix de hoy. Los hijos reales que SÍ deben permanecer: `Pascualito`, `Pipa`, `Prueba`. Solo "Pascu" se borra.
- **Cosmético, no bloqueante para lanzamiento.**
- **Aprovechar para correr las 3 queries de auditoría (A, B, C) que se dejaron preparadas hoy** para detectar otros duplicados históricos:
  - QUERY A — detección de duplicados por invitación (grupos de hijos con mismo nombre + vínculo de invitación).
  - QUERY B — hijos huérfanos (`family_id IS NULL` cuyo dueño aparece como invitee en `partner_invitations` con status `accepted` o `rejected_pending_data`).
  - QUERY C — conteo global de invitaciones por status.
  - Las queries quedaron en el chat de la sesión de hoy (no se versionaron en el repo). Si las necesitas, recupéralas del transcript o regéneralas pidiendo a Claude Code.

---

## Deudas UI/UX anotadas hoy

### D. InvitarPage muestra siluetas genéricas en lugar del avatar real del inviter

- Es la primera impresión de la pareja invitada — debería sentirse premium.
- Pasar a Claude Design en la próxima pasada visual (probablemente después del lanzamiento beta).

---

## Estado del lanzamiento

Lanzamiento beta POSTERGADO sin fecha fija. Decisión tomada el 27 mayo 2026: priorizar calidad sobre deadline. El cronograma completo de aquí en adelante vive en `PLAN.md` en la raíz del repo.

---

## Estado de git al cierre

- Branch: `main`
- HEAD: `e63cc6d` (Falla 3 del bug de modo parejas)
- Working tree limpio salvo este archivo ESTADO.md (modificado, sin stagear). Daniel decide cuándo versionarlo.

---

## Cerrado HOY (miércoles 27 mayo 2026)

- Fix "Olvidaste tu contraseña" completo en producción (commit `fc36f41`) + QA real exitoso end-to-end con dos cuentas.
- 6 templates de correo de Supabase rediseñados en español con identidad Huella (Reset, Invite, Confirm Sign Up, Magic Link, Change Email, Reauthentication).
- Tagline oficial aprobado: **"Conoce la huella única de tus hijos"**. Reemplaza al viejo *"La huella que dejamos en un ser humano"*.
- Diagnóstico bug Resend: `RESEND_API_KEY` no está en Vercel Production. Endpoint `/api/invite` retorna status 200 cuando NO envía (oculta el fallo). Resolución pendiente para Sesión A del `PLAN.md` (requiere compra de dominio `huella.app` primero).
- Limpieza BD: borrados 7 hijos fantasma (6 "Pascual" + 1 "pascu") de `danielundurraga.r@gmail.com`. Cero datos asociados perdidos. Pascualito intacto.
- SVG inline coherentes con paleta Huella en `ResetPasswordPage` (estados exito, enviado, link_invalido). Commit `692445b`.
- Decisión: postergación del lanzamiento beta. Foco total en calidad. Cronograma a 4 fases definido en `PLAN.md`.

---

## Cerrado HOY (viernes 29 mayo 2026) — Sesión A del PLAN.md cerrada

- **Dominio propio:** comprado y conectado `huella.lat` (registrado en Vercel, HTTPS automático). El dominio final fue `huella.lat`, no `huella.app`.
- **Resend con dominio propio:** verificado con SPF + DKIM vía auto-configure de Vercel.
- **Variables en Vercel Production:** `RESEND_API_KEY` y `RESEND_FROM_EMAIL = "Huella <hola@huella.lat>"`. API key de Resend creada con Sending access.
- **QA real:** correo de invitación a la pareja probado con dos cuentas reales → Delivered en Resend y recibido en bandeja. **Modo Pareja desbloqueado en producción.**
- **Fix rebote al dominio viejo:** en Supabase (Authentication > URL Configuration) se cambió Site URL de `huella-theta.vercel.app` a `huella.lat` y se agregaron redirect URLs `huella.lat/**` y `www.huella.lat/**`. Verificado: la app se queda en `huella.lat`.
- **Deuda menor opcional (no bloqueante):** el front en `FamilyContext.jsx` confía en `res.ok` en vez de leer el campo `sent` del JSON de `/api/invite`. Conviene endurecerlo en una próxima pasada.

---

## Cerrado HOY (sábado 31 mayo 2026) — Sesión B del PLAN.md cerrada

**Bug 1 — "Multi-plan solo muestra el primero" → RESUELTO EN PRODUCCIÓN (commit `7c2a67a`)**
- Diagnóstico: `buildSugerenciaFromInterpretacion` (helpers.js) tomaba solo `interpretacion.patrones[0]`, descartando el resto de patrones detectados por la IA.
- Fix en 2 archivos:
  - `helpers.js`: renombrada a `buildSugerenciasFromInterpretacion` (plural) — itera **todos** los patrones, devuelve arreglo, ordena por **confianza descendente** y limita a **máximo 3**. Confianza no-numérica → al final (`-Infinity`), sin romper.
  - `helpers.js`: `debeMostrarSugerencia` ahora filtra los descartes **por `habilidad_id`** — así "No por ahora" descarta **solo esa tarjeta**, no oculta las demás.
  - `EstrategiasPage.jsx`: estado `sugerencia` → `sugerencias` (arreglo); "Lo que Huella ve" apila una `PuertaUnoHallazgo` por patrón con aceptar/descartar propios; badge dinámico "N nuevas".
- `npm run build` OK. Push a `main` → auto-deploy Vercel.
- **Observación anotada (no implementada):** `construirSugerencia` pone `confianza: 0.6` por defecto cuando el patrón no trae el campo, así que en la práctica "sin confianza" se ordena en el medio (0.6), no al final. Quitar ese default sería tocar más del bug 1; queda a criterio de Daniel.

**Bug 2 — "Plan completado en sección incorrecta" → NO ERA BUG (fix revertido)**
- Síntoma reportado: plan "Aceptar el no" aparecía activo en "Lo que estás trabajando" mostrando "Ciclo 1: 4/4" + "Ciclo 2: SEM 1/4".
- Investigación (sin datos corruptos, sin huérfanas): son **dos estrategias reales** de la misma habilidad — `69383b67` (activa, ciclo nuevo) y `d9382e1c` (completada). `ciclosAnterioresDe` (helpers.js) las agrupa por nombre de habilidad y las pinta como cronología de ciclos del mismo plan.
- **Veredicto de Daniel:** esa cronología Ciclo 1 + Ciclo 2 de una misma habilidad es **FEATURE INTENCIONAL** (el usuario puede trabajar la misma estrategia varias veces). "Sem 1/4" = semana 1 de 4, correcto.
- El fix que se había implementado (construir líneas solo desde `plan.ciclos`, eliminar `ciclosAnterioresDe`/`cicloNumeroDe`) **se revirtió completo**. `ciclosAnterioresDe`, `cicloNumeroDe`, `fechaCierreDe`, `EstrategiaActivaCard.jsx` y `EstrategiaPasadaCard.jsx` quedaron tal cual estaban en producción.

**Bug 3 — "Puerta 2 con cuerpo vacío" → EN PAUSA**
- No se logró reproducir en el código: `SelectorHabilidades` siempre renderiza (la card "Cuéntame tu caso" + lista). El único vaciado posible es si un chip de filtro no matchea ninguna habilidad, pero todos los slugs actuales tienen al menos una.
- **Sin síntoma reproducido, no se toca.** Pendiente: que Daniel describa qué vio exactamente en pantalla.

---

## Cerrado HOY (sábado 31 mayo 2026) — Sesión C (prevenciones de raíz) cerrada

> Nota: esta sesión se reorientó a robustez de raíz (no a la "Bugs Estrategias parte 2" que figuraba en PLAN.md). Esos ítems quedan pendientes — ver Próximo paso.

**Ambas prevenciones de raíz en producción, verificadas.**

**Fix #2 — Idempotencia "Iniciar nuevo ciclo" → EN PRODUCCIÓN (commit `e1826b7`)**
- Causa: `handleIniciarNuevoCiclo` (EstrategiaCierrePage.jsx) no tenía candado; un doble-tap o reentrada podía insertar ciclos duplicados.
- Dos capas:
  - **BD:** índice único `estrategia_ciclos_unq_numero` sobre `(estrategia_id, numero_ciclo)` — duplicado imposible a nivel base.
  - **Cliente:** `useRef creandoRef` bloquea el doble-tap sincrónico + estado `procesando` deshabilita el botón. `Pantalla3_Cierre` recibe la prop `procesando`.
- El `catch` ya mostraba mensaje prolijo ("No pudimos crear el nuevo ciclo. Intenta de nuevo."), sin error técnico crudo.

**Fix #1 — Atomicidad al crear plan → EN PRODUCCIÓN, verificado por las 2 vías (commit `9b39f03`)**
- Causa: `crearEstrategiaConCiclo` (HuellaContext.jsx) hacía 2 inserts separados (estrategias + estrategia_ciclos) + cleanup best-effort; si el 2º fallaba podía quedar una estrategia huérfana sin ciclos (se renderiza como plan fantasma "activo").
- Fix: RPC `public.crear_estrategia_con_ciclo` (transacción atómica, todo o nada) + refactor del cliente a **una sola** `supabase.rpc(...)`. La RPC deriva `duracion_semanas` del plan y setea `user_id` con `auth.uid()`.
- **QA real en producción:** crear plan funciona atómico por las **2 vías** (Acción "Cuéntame tu caso" libre + selector de habilidades).

**Cambios de BD versionados:** `supabase/migrations/005_idempotencia_y_atomicidad.sql` (índice único + función RPC). Ya aplicados manualmente en prod vía SQL Editor; el archivo deja el registro en el repo (idempotente).

---

## Próximo paso

**Pendientes arrastrados (la Sesión C nominal de PLAN.md no se hizo; se reorientó a robustez):**
- **Bugs Estrategias parte 2:** "Semana 1 de 4" tras cierre de último ciclo · chips de habilidades activas sin opacidad · skill chips selector · regresión Round 6.
- **Bug 3 "Puerta 2 con cuerpo vacío"** (de Sesión B): en pausa hasta tener síntoma reproducible.

**Siguiente en PLAN.md — Sesión D: Logo + Auditoría tagline**
- Reemplazar wordmark "huella" por logo real en header, login, signup, correos, favicon, ícono PWA.
- Buscar el tagline viejo en todo el repo y reemplazar por "Conoce la huella única de tus hijos".
