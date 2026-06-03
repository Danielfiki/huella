# ESTADO.md — Proyecto Huella

*Última actualización: miércoles 3 junio 2026 — Vitrina premium de /cuenta + pricing definitivo (CLP 9.990/mes · CLP 99.900/año) + primer gate de monetización (2do hijo) en producción. Pendiente grande: pasarela de pago real.*

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

## Sesión 26 mayo 2026 — fix Wolfelt + modo parejas

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

#### B. ~~Bug: LoginPage no tiene opción "¿Olvidaste tu contraseña?"~~ — RESUELTO ✅

- **Resuelto en producción** (commits `fc36f41` + `692445b`, QA OK 27 mayo). Auditoría de raíz el 1 jun confirmó el flujo completo de punta a punta: link en `LoginPage` → `resetPassword` (`AuthContext`) con `resetPasswordForEmail` → página doble-modo `ResetPasswordPage` (solicitar/enviado/actualizar/éxito/link inválido) en ruta pública `/reset-password`. Ya no es pendiente ni bloqueante de beta.

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

## Sesión 27 mayo 2026 — reset contraseña + templates de correo

- Fix "Olvidaste tu contraseña" completo en producción (commit `fc36f41`) + QA real exitoso end-to-end con dos cuentas.
- 6 templates de correo de Supabase rediseñados en español con identidad Huella (Reset, Invite, Confirm Sign Up, Magic Link, Change Email, Reauthentication).
- Tagline oficial aprobado: **"Conoce la huella única de tus hijos"**. Reemplaza al viejo *"La huella que dejamos en un ser humano"*.
- Diagnóstico bug Resend: `RESEND_API_KEY` no está en Vercel Production. Endpoint `/api/invite` retorna status 200 cuando NO envía (oculta el fallo). Resolución pendiente para Sesión A del `PLAN.md` (requiere compra de dominio `huella.app` primero).
- Limpieza BD: borrados 7 hijos fantasma (6 "Pascual" + 1 "pascu") de `danielundurraga.r@gmail.com`. Cero datos asociados perdidos. Pascualito intacto.
- SVG inline coherentes con paleta Huella en `ResetPasswordPage` (estados exito, enviado, link_invalido). Commit `692445b`.
- Decisión: postergación del lanzamiento beta. Foco total en calidad. Cronograma a 4 fases definido en `PLAN.md`.

---

## Sesión 29 mayo 2026 — dominio huella.lat + Resend (Sesión A)

- **Dominio propio:** comprado y conectado `huella.lat` (registrado en Vercel, HTTPS automático). El dominio final fue `huella.lat`, no `huella.app`.
- **Resend con dominio propio:** verificado con SPF + DKIM vía auto-configure de Vercel.
- **Variables en Vercel Production:** `RESEND_API_KEY` y `RESEND_FROM_EMAIL = "Huella <hola@huella.lat>"`. API key de Resend creada con Sending access.
- **QA real:** correo de invitación a la pareja probado con dos cuentas reales → Delivered en Resend y recibido en bandeja. **Modo Pareja desbloqueado en producción.**
- **Fix rebote al dominio viejo:** en Supabase (Authentication > URL Configuration) se cambió Site URL de `huella-theta.vercel.app` a `huella.lat` y se agregaron redirect URLs `huella.lat/**` y `www.huella.lat/**`. Verificado: la app se queda en `huella.lat`.
- **Deuda menor opcional (no bloqueante):** el front en `FamilyContext.jsx` confía en `res.ok` en vez de leer el campo `sent` del JSON de `/api/invite`. Conviene endurecerlo en una próxima pasada.

---

## Sesión 31 mayo 2026 — bugs Estrategias (Sesión B)

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

## Sesión 31 mayo 2026 — prevenciones de raíz (Sesión C)

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

## Sesión 2 junio 2026 — prompt caching + auditorías

**Prompt caching Fase 1 → EN PRODUCCIÓN, verificada (commits `c89f104`, `29c11d3`, `91cc788`)**
- Se cachea el `SYSTEM_PROMPT` (~6.200 tokens, idéntico en todas las llamadas) con `cache_control: ephemeral` en `api/anthropic.js` — el `system` pasó de string a array de un bloque. Sin header beta (GA), sin tocar el cliente ni el comportamiento.
- **Verificado en logs de Vercel:** primera llamada `cache_creation_input_tokens: 6844`; siguientes `cache_read_input_tokens: 6844`. **Costo de IA por llamada pesada recortado ~⅓.**
- Log temporal de `usage` agregado para verificar y luego removido (commit `29c11d3`).
- Tabla completa de costo de IA por tipo de llamada versionada en `COSTOS_IA.md` (commit `91cc788`).

**Auditorías de la sesión (sin construir nada nuevo):**
- **Recuperación de contraseña:** ya estaba completa en prod (commits `fc36f41` + `692445b`). Pendiente "LoginPage sin ¿Olvidaste tu contraseña?" marcado RESUELTO.
- **Monetización:** auditado el andamiaje Free/Pro/Admin existente — tiers (`isPro`/`isAdmin` leen `perfiles.plan`), precio $5.990 CLP/mes hardcodeado, gating real (cap 15 episodios free, `MAX_PLANES_ACTIVOS_FREE=3`), página `/cuenta` + `UpgradeModal`. **Falta toda la pasarela de pago real** (no hay Stripe/MercadoPago/etc.; el botón de upgrade no conecta con nada). No se construye aún.

**Logo:** se descartó la vía IA. Va a diseñador humano; brief ya entregado.

---

## Sesión anterior — acceso Pro descubrible + muro de 15 (3 junio 2026)

**Pricing más humano de punta a punta → EN PRODUCCIÓN**
- **Acceso descubrible a Pro (commit `46967d9`):** tarjeta "Huella Pro" en el Perfil (posición 4, tras "Tú"), con 3 estados (free/pro/admin) y migrada a tokens. Linkea a `/cuenta`.
- **Muro de 15 episodios → invitación (commit `ede5fb9`):** constante única `MAX_EPISODIOS_FREE` (en `helpers.js`, reemplaza el `15` suelto del gate y el texto de `/cuenta`); aviso previo suave en "¿Cómo registrar?" cuando quedan 1-3 registros ("Te quedan N registros…" + "Conocer Pro"); el `UpgradeModal` acepta `tituloCustom`/`mensajeCustom` y en el muro muestra "Registraste 15 episodios" + copy que felicita. El modal voluntario de `/cuenta` sigue genérico. La pasarela de pago NO se tocó (sigue pendiente).

**Estrategia de precio definida (números aún por afinar):**
- **Posicionamiento PREMIUM** calibrado a Chile (no volumen). Rango orientativo **$8.990–$11.990 CLP/mes** + **plan anual con descuento**. Número exacto y estructura mensual/anual: **pendiente de afinar**. (Reemplazaría al $5.990 actual.)

**Contenido base de `/cuenta` definido (copy aún por pulir):**
- **4 beneficios destilados** que reemplazan las ~16 features actuales: (1) entender el *porqué*, (2) saber *qué hacer*, (3) historial serio + PDF, (4) en familia.
- **Promesa central PROVISIONAL:** *"Entiende por qué tu hijo actúa así y acompáñalo mejor"* — funcional, pero **pendiente de pulir** a algo que conmueva (orfebrería de copy/marca, igual que el logo).

---

## Cerrado HOY (miércoles 3 junio 2026) — vitrina premium + monetización

**Vitrina premium de Huella Pro + pricing definitivo → EN PRODUCCIÓN (commit `b6ae281`)**

**Pricing Huella Pro definido:** **CLP 9.990/mes** + **CLP 99.900/año** (20% de ahorro anual). Basado en estudio de mercado (Calm USD 16.99, Headspace USD 12.99; Chile con alta resistencia a pago). Reemplaza al $5.990 anterior.

**Vitrina premium `/cuenta` (`CuentaPage.jsx` + `CuentaPage.module.css` nuevo):**
- Hero con promesa central + precio (mes/año con badge de ahorro).
- 4 beneficios destilados (reemplazan las ~16 features): entender el porqué / qué hacer en crisis / registrar cada avance / en familia.
- Acordeón "+ Ver todo lo que incluye Pro" con los 16 ítems completos.
- Migrada a tokens (**cero hex hardcodeado**), **sin emoji**.

**`UpgradeModal`:** precio actualizado a **CLP 9.990** y emoji ✨ eliminado. Botón principal cambiado a **"Activar Huella Pro"** (antes "Probar 7 días gratis") — **decisión aplicada: sin trial de 7 días por ahora**. Layout y resto del copy sin tocar (el rediseño visual del modal queda para Design).

**Ajuste de copy en la vitrina:** beneficio 2 → **"Ten claro qué hacer, incluso en plena crisis"**.

**Gate del 2do hijo → EN PRODUCCIÓN (commit `d2f4a4c`) — primer gate de la fase de monetización.**
- Free limitado a 1 hijo; Pro/Admin, ilimitados. Al intentar agregar un 2do hijo (botón "Agregar otro hijo/a" del Perfil + "+" del selector del Panel), abre el `UpgradeModal` con invitación **"Cada hijo tiene su huella"** en vez de agregarlo en silencio. Admin pasa sin bloqueo (`isPro()` incluye admin).

**Cálculo de monetización (referencia):** 3 escenarios de conversión (5 / 10 / 15%). Base ~**CLP 50M/año** a 10% de conversión con 1.000 usuarios.

---

## Segmentación Free vs Pro — DECISIÓN CERRADA (3 junio 2026)

**Principio rector:** lo inmediato y de crisis es **gratis**; lo profundo, lo que escala y lo que se comparte es **Pro**.

> Documentación de la decisión. **El primer gate (2do hijo) ya está implementado (commit `d2f4a4c`); faltan los demás** — ver "Gates a implementar" abajo. Auditoría que motivó esto: solo existían 2 topes reales (15 episodios con invitación; PDF oculto sin invitación); casi todas las features "Pro" de la vitrina ya las tiene el free, y los límites de "1 hijo" e "historial 7 días" eran promesas fantasma no implementadas (1 hijo ya quedó implementado).

**FREE (lo inmediato / el aha que engancha):**
- Registrar hasta 15 episodios.
- 1 hijo.
- Orientación IA inmediata por episodio.
- Su historial **completo** (NO se corta a 7 días — quitar esa promesa fantasma de la vitrina).
- Álbum de fotos + badges.

**PRO (lo profundo / lo que escala / lo que se comparte):**
- Episodios ilimitados.
- Hijos ilimitados.
- Análisis de patrones en el tiempo (el free ve un **teaser** que invita).
- Estrategias de 4 semanas (el free ve **preview**; crear es Pro).
- Búsqueda en todos los registros.
- Informe PDF para especialista (hoy se oculta en silencio → **agregar invitación**).
- Modo familia: **el que inicia paga** para conectar; la pareja invitada accede **sin pagar**.

**Gates a implementar (fase futura, ANTES de Stripe):** ✅ ~~2do hijo~~ (HECHO, commit `d2f4a4c`) · análisis de patrones · crear estrategia · búsqueda · modo familia · invitación en el PDF · alinear vitrina (quitar promesa fantasma "historial 7 días"). **Cada tope debe invitar a Pro al chocarlo** (no bloquear en silencio).

---

## Próximo paso

### Fase monetización — gates restantes (ANTES de Stripe)
- **Gate análisis de patrones:** el free ve un **teaser** que invita.
- **Gate crear estrategias de 4 semanas:** el free ve **preview**; crear es Pro.
- **Gate búsqueda en registros.**
- **Gate modo familia:** el que inicia paga para conectar; la pareja invitada accede **sin pagar**.
- **Agregar invitación a Pro en el export PDF** (hoy se oculta en silencio).
- **Alinear la vitrina:** quitar la promesa fantasma "historial 7 días".
- *(Cada tope debe **invitar** a Pro al chocarlo, no bloquear en silencio.)*
- *(✅ Gate 2do hijo — HECHO esta sesión, commit `d2f4a4c`.)*

### Monetización — después de los gates
- **Pasarela de pago real (Stripe).** El botón "Activar Huella Pro" y el `UpgradeModal` **NO cobran aún**. Tarea grande aparte.
- **Evaluar reverse trial largo (14-30 días, NO 7)** cuando llegue Stripe. *(El trial de 7 días quedó descartado esta sesión.)*

### UX / Producto (notas de esta sesión)
- **Login estratégico:** mover el gate de login de la puerta a "registrar primer episodio" (dejar explorar antes). Tarea de onboarding + rutas. Incluye fix: el login redirige a `huella.lat` **incluso desde `localhost`** → ajustar config de Supabase para respetar `localhost` en dev.
- **Botón de respiración para el cuidador** antes de registrar (co-regulación; base Siegel/Shanker).
- **Reevaluar onboarding modal "Así funciona Huella"** (3 pasos) que aparece al iniciar sesión.
- **Reevaluar banner "Activa recordatorios para no perder el hilo con tu hijo/a".**
- **Verificar implementación real del "check-in emocional":** confirmar qué hace y que el copy de la vitrina calce.

### Diseño (a Claude Design)
- **Rediseño del `UpgradeModal`**, incluyendo **centrarlo bien en pantalla** (hoy sale pegado abajo).
- **Pasar por Design la vitrina `/cuenta` y la sección de Registros.**
- **Decisión de formato de precio:** "$9.990" (natural en Chile) vs "CLP 9.990".

### En recámara (optimización de costo, no urgente)
- **Fase 2 del caching:** cachear también el `marcoEdad()` (~5.300 tokens, 4 variantes por edad) como 2º breakpoint del `system` — recorta otro ~⅓. Requiere refactor del contrato cliente↔backend. Detalle en `COSTOS_IA.md`.
- **Evaluar Haiku** (`claude-haiku-4-5`) para tareas simples (celebrar hito, reflexión check-in, consejo diario) en vez de Sonnet para todo.

### Pendientes de fondo (sin fecha)
- **"Bugs Estrategias parte 2" + "Puerta 2 con cuerpo vacío" → DESCARTADOS (1 jun 2026).** Revisados en prod, sin defecto real; descartados por falta de síntoma.
- **Sesión D del PLAN.md — Logo + Auditoría tagline:** reemplazar wordmark "huella" por el logo real (cuando llegue del diseñador) en header, login, signup, correos, favicon, ícono PWA; y buscar/reemplazar el tagline viejo por "Conoce la huella única de tus hijos".
