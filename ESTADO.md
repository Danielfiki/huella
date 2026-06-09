# ESTADO.md — Proyecto Huella

*Última actualización: martes 9 junio 2026 — Monetización: arrancó la pasarela de pago real con **Mercado Pago** (NO Stripe — no opera en Chile sin abrir una LLC en EE.UU.). **Paso 1 COMPLETO y validado en producción** (endpoint que crea la suscripción sin tarjeta + toggle mensual/anual en CuentaPage + botón que redirige al checkout alojado de MP). **Paso 2 desplegado, PENDIENTE de validación end-to-end** (webhook que valida la firma y activa `perfiles.plan='pro'`). Dónde retomar: validar el pago de prueba de punta a punta (ver bloque "Cerrado HOY"). Sesión anterior (8 junio): rediseño "Refugio" del flujo Registrar COMPLETO + regla de voz.*

> El histórico de sesiones anteriores (3292 líneas) quedó congelado en `git HEAD`. Si en alguna próxima sesión necesitas recuperarlo:
> ```
> git show HEAD~1:ESTADO.md > ESTADO.historico.md
> ```
> (Ajusta `HEAD~1` al commit donde aún vivía el archivo grande si ya se hicieron commits intermedios.)

---

## Cerrado HOY (martes 9 junio 2026) — Monetización: pasarela Mercado Pago (Paso 1 + Paso 2)

**Arranca la pasarela de pago real con Mercado Pago.** Paso 1 completo y validado en producción; Paso 2 desplegado, pendiente de validación end-to-end.

**Por qué Mercado Pago y no Stripe:** Stripe **NO opera en Chile** sin abrir una LLC en EE.UU. → se descarta. La pasarela es **Mercado Pago**, producto "Suscripciones con integración" (preapproval), con **checkout alojado por MP**: el usuario ingresa la tarjeta en la página de MP; nosotros no manejamos datos de tarjeta.

**Setup de la cuenta MP (modo prueba):**
- App **"Huella app"**, integración **Suscripciones**, User ID **734925237** (modo prueba).
- Variables en Vercel: **`MP_ACCESS_TOKEN`** (token de prueba) y **`MP_WEBHOOK_SECRET`** (clave secreta del webhook, modo prueba).
- Webhook configurado en el panel de MP (modo prueba): URL **`https://huella.lat/api/mp-webhook`**, evento **"Planes y suscripciones"**.
- Comprador de prueba creado en MP: **"Comprador Huella"**, usuario **TESTUSER6504…** (Chile).

**Precios (sin trial):** CLP **9.990/mes** y CLP **99.900/año**. El anual equivale a 10 meses (9.990 × 10) → 2 meses gratis; se muestra como **"2 meses gratis"**, NO como porcentaje.

**PASO 1 — COMPLETO y validado en producción (commit `21a94ce`):**
- `api/mp-crear-suscripcion.js` (nuevo): crea el `preapproval` **sin tarjeta** (suscripción sin plan asociado) y devuelve el `init_point`. Auth del usuario con anon key + Bearer (patrón `push-subscribe`); `external_reference = user.id`, `back_url = https://huella.lat/cuenta?suscripcion=ok`, `notification_url = https://huella.lat/api/mp-webhook`.
- **Toggle mensual/anual en `CuentaPage`** (reemplaza los precios que eran solo texto): casilla seleccionable con tokens existentes (activa: borde `--color-primary` + fondo `--color-primary-bg`), default **mensual**, anual etiquetado **"2 meses gratis"**.
- El botón **"Activar Huella Pro"** llama al endpoint con el ciclo elegido y redirige al `init_point` (página de pago de MP). Estado de carga + mensaje de error (`--color-danger-text`) si MP falla.
- **El `UpgradeModal` quedó desconectado de `CuentaPage`** (el botón ahora va directo al pago). Sigue **activo e intacto en los otros gates** (2do hijo, análisis, estrategias, PDF).

**PASO 2 — DESPLEGADO, PENDIENTE de validación end-to-end (commit `7bfe171`):**
- `api/mp-webhook.js` (nuevo): valida la firma del header **`x-signature`** (HMAC-SHA256, formato `ts=...,v1=...`; manifiesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, con `data.id` en minúsculas). Firma inválida → **401** + `console.error` con el motivo.
- Ante una notificación **`subscription_preapproval`**: hace `GET /preapproval/{data.id}` con el access token para leer `status` y `external_reference`. Si **`status === 'authorized'`** → con cliente **service-role** (`SUPABASE_SERVICE_ROLE_KEY`, patrón `push-remind`): `UPDATE perfiles SET plan='pro' WHERE user_id = external_reference` (**columna `user_id` verificada** contra los usos reales en el código).
- Responde **200** en todos los caminos procesados (para que MP no reintente en loop); cada paso logueado con `console.log`/`console.error` para QA legible en Vercel.
- **NO maneja `cancelled`/`paused` todavía** (hay comentario `PENDIENTE` en el archivo para el downgrade futuro).

**DÓNDE RETOMAR — validar el pago de prueba de punta a punta:**
1. Pagar una suscripción de prueba desde `/cuenta`.
2. **Camino correcto en la página de pago de MP:** elegir **"Ingresar con mi cuenta"** y loguearse con el **comprador de prueba** (TESTUSER6504…). **NO** usar la opción "sin cuenta de Mercado Pago" → no sirve para suscripciones y da rechazo **"por seguridad"**.
3. Pagar con tarjeta de prueba **APRO**: Mastercard **5416 7526 0258 2580**, nombre **APRO**, documento tipo **"Otro"** **123456789**.
4. Revisar los logs de Vercel del webhook (`notificación recibida → suscripción {status, externalReference} → plan activado a pro`).
5. Verificar en Supabase que `perfiles.plan` quedó en **`'pro'`** para ese usuario.

**SIGUIENTE — Paso 3 (tras validar el webhook):** refresco del plan al volver a `/cuenta?suscripcion=ok` (`reloadData` o polling) para que `isPro()` refleje el cambio **sin recargar** la página.

**PENDIENTES anotados (post-validación):**
- **Conectar el `UpgradeModal`** al flujo de pago (hoy el pago solo se dispara desde `CuentaPage`).
- **Downgrade** `cancelled`/`paused` → `'free'` (ya hay comentario `PENDIENTE` en `mp-webhook.js`).
- **Evaluar reverse trial largo (14-30 días)** — el de 7 días sigue descartado.
- **Pasar a credenciales de producción de MP** cuando se cobre de verdad (hoy todo es modo prueba).
- **Durante la beta:** dar Pro gratis marcando `perfiles.plan='pro'` por SQL (no cobrar a testers).

---

## Sesión 7 junio 2026 — Delta 4 (barra de progreso) + rediseño "Refugio": NuevoPage completo + RegistroPage "elegir modo"

**Todo commiteado y en producción (auto-deploy Vercel). QA visual del avance y de "elegir modo" aprobado por Daniel.**

### Delta 4 — barra de progreso en el resultado del episodio (commit `53018c6`)
- Se agregó una **barra de avance percibido** mientras la IA genera la orientación del episodio (`RespuestaIA`, estado loading): sube 0→90% con ease-out y cierra a 100% al llegar la respuesta, junto al `CitaLoader`. Reusa el componente `ProgressBar` existente, con sus colores por defecto.
- **Hook nuevo `src/hooks/useFakeProgress.js`:** extrae la lógica de avance percibido (0→90% + cierre a 100% con `phase='complete'`). Duración calibrada a la orientación del episodio: `DURACION_ORIENTACION_MS = 28000` (más corta que los 60s del análisis del Home).
- **`AnalisisIA` quedó intacto** (su lógica inline original, NO migró al hook): decisión de Daniel para no arriesgar un componente que ya funciona. La duplicación con `useFakeProgress` es **deuda menor anotada** — migra al hook cuando se toque esa zona del Home.

### Rediseño de Registrar — dirección "Refugio" (en curso, vista por vista)
- **Dirección elegida: C · Refugio** (híbrido cálido de "Aliento" + estructura sobria de "Diario"). Aprobada. Mockups completos de las 7 vistas en Claude Design.
- **Decisión de layout (opción 1):** suelo cálido **full-bleed BAJO el header global mocha**. NO se toca `Layout`. Patrón: barra "huella" global arriba + suelo cálido de borde a borde debajo. Verificado que NuevoPage/RegistroPage se renderizan dentro de `<Layout>` (header mocha 56px + bottom-nav).
- **Átomos base creados en `.flujoRefugio` (clase del flujo):** suelo cálido (`radial-gradient` de `--color-primary-tint` → `--color-bg`, full-bleed cancelando el padding 20px de `.main` con márgenes negativos) + top flotante (título Fraunces centrado + discos flotantes para back/controles, `--color-surface` + `--shadow-sm`).

**Pushes hechos:**
- **Push 1 (commit `90acd50`):** NuevoPage vista **"elegir"** en Refugio — suelo cálido + top flotante + 2 choice cards con filo de tono (episodio mocha / avance tangerine, vía `inset box-shadow`) + disco de ícono (episodio `--color-surface-alt` / avance `--color-celebration-start`) + chevron.
- **Push 2 (commit `7992241`):** resto de NuevoPage — **formulario de avance** (top flotante con back en disco, campo de escritura protagonista con hairline-renglón, botón "Guardar avance" como **pill tangerine** vía `className` local sobre `Button` sin tocarlo) + **resultado de avance** (celebración elevada: estrella 60px sobre `--color-celebration-start`, `--shadow-md`; "Enmarca este momento" como superficie suave conservando su condición). Quitado el `TooltipAyuda` de la vista elegir (no aportaba).
- **Casilla sobria del avance (commit `1e42414`):** las **categorías del avance** pasaron de "fichas desnudas" (se veían pobres/descuidadas) a **"casilla sobria"** — grilla 2 columnas, fondo `--color-surface-alt` + borde `--color-border` + `--radius-md`; activa: borde `--color-primary` + bg `--color-primary-bg` + texto `--color-primary-dark`. **APROBADA por Daniel (QA visual hecho).**
- **Contraste de casillas inactivas (commit `461f591`):** el texto de las casillas de categoría **inactivas** pasó de `--color-text-muted` a `--color-text` (más presencia). Cambio **local** a `.catChip`, no toca el token global. Aprobado y verificado. *NOTA:* ese commit **arrastró también `ESTADO.md`** (se usó `git add -A`); el contenido es correcto, el mensaje no lo menciona, y se **decidió dejarlo así** (no reescribir historia en `main`).
- **Push 3A — RegistroPage "elegir modo" en Refugio (commits `cbb2c92` + `f625cc0`):** suelo cálido full-bleed + top flotante; las 2 `modoCard` convertidas en **choice cards** (disco de ícono 52px + filo de tono vía `inset box-shadow`: rápido **mocha** / detallado **tangerine** + chevron). **Badges movidos a PIE** de cada card (bajo la descripción). Conserva todo el copy, badges, navegación y lógica de Pro/límite (`MAX_EPISODIOS_FREE`, `isPro`, `UpgradeModal`, aviso de límite + "Conocer Pro"). **APROBADO por Daniel.**

**DECISIÓN DE DISEÑO CLAVE:** las fichas de selección **NO van desnudas** (se ven descuidadas). Van como **CASILLA SOBRIA** (superficie `--color-surface-alt` + borde `--color-border` + `--radius-md`; activa: borde `--color-primary` + bg `--color-primary-bg` + texto `--color-primary-dark`; **texto inactivo `--color-text`**). **Aprobado en el avance** → se **propaga a TODOS los selectores del flujo** (tipos, emociones, gatillantes, estado del adulto, intensidad).

**Deuda técnica nueva — base Refugio DUPLICADA:** `.flujoRefugio` / `.topRefugio` / `.tituloRefugio` están copiadas en `NuevoPage.module.css` y `RegistroPage.module.css` (los CSS modules son scope por archivo). **Extraer a un CSS/módulo compartido** en una sola pasada cuando Refugio esté completo en todo el flujo.

**Nota de tooling (PowerShell 5.1):** las **comillas dobles** en el mensaje de commit rompen `git commit -m` (también vía variable/here-string); usar **`git commit -F <archivo>`**. Y usar **`git add` selectivo** (archivo por archivo), **nunca `git add -A`** (ya coló `ESTADO.md` una vez por eso).

---

## Sesión 8 junio 2026 — RegistroPage completo en Refugio + regla de voz

**Todo commiteado y en producción (auto-deploy Vercel). RegistroPage quedó ENTERO en Refugio: con esto el rediseño "Refugio" del flujo Registrar completo (NuevoPage + RegistroPage) está TERMINADO.**

**Pushes de esta sesión:**
- **Push 3B — formulario RÁPIDO en Refugio (commit `db30986`):** casillas sobrias en los 3 selectores (tipo emoji-arriba 3×3; intensidad como **escala horizontal de 5 — sin grilla de 2**; "¿cuándo?" a casilla 2-col). `VoiceTextarea` sin tocar. **APROBADO.**
- **Push 4 — formulario DETALLADO en Refugio (commit `00c8811`):** todos los selectores a casilla sobria; tipo **unificado con el rápido** (`bigEmoji`). **EMOCIONES = Opción 1:** casilla sobria en la FORMA conservando el **color de cada categoría como acento** (la seleccionada se marca con su propio color, NO tangerine); 2 niveles intactos. Gatillantes (multi) y estado del adulto (toggle-off) conservados. **APROBADO.**
- **Ajuste — títulos de sección del flujo Refugio (commit `6567f9b`):** `.label` a `--color-text` + 16px (más presencia), parejo en rápido/detallado/avance. **APROBADO.**
- **Push 5A — resultado del episodio en Refugio, todo menos la orientación (commit `5ff36db`):** celebración elevada (✅ igual que el resultado del avance) + reflexión y "crear estrategia" como superficies suaves + "Volver al inicio" pill tangerine. **APROBADO.**
- **Push 5B — "Orientación de Huella" con jerarquía de secciones del Home (commit `2ed7b2a`):** los títulos "Qué está pasando / Qué hacer ahora / Qué evitar" salen en **Fraunces tangerine** (jerarquía estilo Home), contenedor en superficie suave Refugio. Se **extrajo `SECTION_TITLES` a un módulo compartido nuevo `src/utils/seccionesIA.js`** (importado por `RespuestaIA` y `AnalisisIA`) — saldó la deuda de las dos listas desincronizadas.
- **Fix — detección TOLERANTE de títulos (commit `39feb8d`):** la comparación era de igualdad exacta y el modelo agregaba **`:` al final**, por eso los títulos del episodio salían como párrafo plano. Nuevo `esTituloSeccion()` en `seccionesIA.js` ignora `:` final, mayúsculas/minúsculas y forma Unicode (NFC). Aplicado en `RespuestaIA` y en el Home (cambio **aditivo**: el Home se ve igual). **QA confirmado: los títulos ya salen con jerarquía.**

**REGLA DE VOZ (campos de escritura libre dictables):**
- **Diagnóstico:** `VoiceTextarea` usa Web Speech API **push-to-talk**, estado **por instancia**, sin singleton. Varias instancias en una pantalla **NO se pisan** (cada una escribe en su propio campo vía `onVoiceResult`; el push-to-talk serializa el uso del único motor de voz del navegador).
- **Implementado (commit `5fd42f3`):** `VoiceTextarea` en los **3 campos de relato libre** — avance "Cuéntame qué pasó", contexto del detallado "¿Qué estaba pasando antes?", y reflexión del resultado "¿Qué harías diferente?". Cada uno a su propio estado; la reflexión conserva el reset de "Guardar reflexión" al dictar/editar. **Sin tocar el componente global.**
- **EXCLUIDOS (decisión):** "¿Quién estuvo presente?" (dato corto), tipo "Otro" y "algo más" del estado del adulto (cortos/opcionales; sumables después).
- **Nota:** el avance **perdió el `autoFocus`** al pasar a `VoiceTextarea` (coherente con el episodio; se dejó así a propósito).
- **PENDIENTE:** (a) **QA de Daniel** del push de voz — cruce de micrófonos en el detallado (2 mics: principal + contexto) y el anidado "caja-dentro-de-caja" en avance/reflexión (afinar si se ve recargado); (b) **documentar la regla en `CLAUDE.md`** una vez confirmado el QA.

**Deudas técnicas acumuladas (para una pasada de limpieza):**
- **Base Refugio DUPLICADA** (`.flujoRefugio` / `.topRefugio` / `.tituloRefugio`) entre `NuevoPage.module.css` y `RegistroPage.module.css` (CSS modules scope por archivo) → **extraer a un módulo/CSS compartido**.
- **CSS muerto de los pushes Refugio:** clases viejas sin uso — `.tipoBtn`/`.tipoEmoji`/`.tipoSelected`, `.intensidadGrid`/`.intensidadBtn`/`.intensidadEmoji`/`.intensidadSelected`, `.tagsGrid`/`.tag`/`.tagSelected`, `.vistaHeader`/`.backBtn`/`.titulo`, `.guardadoCard*`, `.escrituraTextarea` — **+ renombrar `.cuandoChip`** (reusado como casilla genérica en el detallado) a `.casillaChip`. Saldar junto con la extracción de la base.
- **Tokens blanco-sobre-tangerine:** `.reflexionSaveBtn`, `.enmarcarBtn`, `.fotoRemoveBtn` y `Button.primary` global usan `white`/`#fff` hardcodeado → migrar cuando exista el token.

---

### Próximo paso — PRÓXIMA SESIÓN (con cabeza fresca): MONETIZACIÓN de Huella

> **Superado el 9 junio 2026** — la monetización arrancó con **Mercado Pago** (NO Stripe: no opera en Chile sin abrir una LLC en EE.UU.). Ver el bloque **"Cerrado HOY (martes 9 junio 2026)"** arriba. Lo de abajo es el plan original con Stripe; se conserva como contexto histórico.

1. ~~**Integrar Stripe**~~ → reemplazado por **Mercado Pago Suscripciones** (preapproval). Pricing en pie: **CLP 9.990/mes + CLP 99.900/año** (commit `b6ae281`; **NO 5.990**). Al confirmar el pago, el webhook actualiza `perfiles.plan` de `'free'` a `'pro'`.
2. **Trial:** el de 7 días quedó **DESCARTADO**; el CTA es **"Activar Huella Pro"**. Pendiente: **evaluar un reverse trial largo (14-30 días), NO de 7**.
3. **Página de configuración de cuenta** (ver plan actual + activar Pro).
4. **Probar el modal de upgrade** con cuenta nueva sin plan admin.

**Antes de la monetización, pendientes menores:** cerrar el **QA de voz** + **documentar la regla de voz en `CLAUDE.md`**; opcional, afinar el anidado de `VoiceTextarea` si se ve recargado. La **pasada de limpieza de CSS / extracción de la base Refugio** puede ir cuando se quiera.

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
- HEAD: `5fd42f3` (dictado por voz en avance, contexto y reflexión)
- Working tree limpio (salvo este `ESTADO.md` mientras se edita el cierre; Daniel decide cuándo versionarlo).

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

## Sesión 3 junio 2026 — vitrina premium + pricing + gate 2do hijo

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

## Sesión 4 junio 2026 — 4 gates de monetización + fix modal + limpieza vitrina

**Todo commiteado y en producción (auto-deploy Vercel).** Se implementaron 4 gates de monetización, se arregló el posicionamiento del `UpgradeModal`, se enganchó Puerta 1 para el free y se limpiaron promesas fantasma de la vitrina.

**Gates de monetización (4) → EN PRODUCCIÓN:**
- **2do hijo** (venía de la sesión anterior, commit `d2f4a4c`): free = 1 hijo; al agregar otro → `UpgradeModal` ("Cada hijo tiene su huella").
- **Análisis de patrones (commit `90949e8`):** el free ve un teaser **real** — solo la sección "Lo que está mejorando" (modo `teaser` nuevo en `interpretarPatrones`, max_tokens reducido) + las otras 3 secciones bloqueadas con candado y CTA a Pro. **Gate real:** el contenido Pro NO se genera ni viaja al cliente free (no es ocultamiento por CSS). Pro/Admin: análisis completo igual que antes.
- **Crear estrategias (commit `e02f7c9`):** el free ve TODO el preview (11 habilidades, Puerta 1, Puerta 2, pantalla de confirmación), pero al crear (`iniciarCreacion` en `EstrategiaNuevaPage.jsx` + `handleCasoLibre` en `EstrategiasPage.jsx`) → `UpgradeModal`, **antes** del `llamarAPI` caro (ahorra ~4000 tokens). Cap de 3 activas intacto para Pro/Admin (va después del gate).
- **Export PDF (commit `6cd4fd5`):** de "oculto en silencio" a invitación. El free ve el botón con **candado**; al tocar → `UpgradeModal`. `PDFSection` no se monta para el free (cero llamadas a Anthropic). Puntito "nuevo" queda solo para Pro. Sin episodios: botón oculto (Pro y free).

**Otros cambios → EN PRODUCCIÓN:**
- **Fix UpgradeModal centrado (commit `71cb70b`):** portal a `document.body` + `alignItems: center` + 4 esquinas redondeadas + `maxHeight 90dvh` + `overflowY auto`. Arregla el posicionamiento en los 4 gates (antes salía pegado abajo, capturado por el `transform` de `.pageWrap` tras la animación de página). Resuelve la deuda de Design "centrar el modal".
- **Puerta 1 visible para el free con 3 activas (commit `0d2a308`):** "Lo que Huella ve" (`EstrategiasPage`) ahora se muestra al free aunque tenga 3 estrategias activas (engancha hacia Pro; al aceptar una sugerencia cae en el gate de crear). Para Pro/Admin se mantiene la ocultación con 3 activas (cap de foco).
- **Limpieza de vitrina `/cuenta` (commit `3010d7f`):** quitadas 2 promesas fantasma del array `TODO_PRO` — "Historial completo sin límite de tiempo" y "Búsqueda en todos tus registros" (el free ya tiene ambas).

**Patrón común de los gates:** todos reusan `isPro()` + `UpgradeModal` con `tituloCustom`/`mensajeCustom`. En `PanelPage` el modal se generalizó con un estado `upgradeCopy` para servir a varios gates con copy distinto sin pisarse.

---

## Sesión 5 junio 2026 — Rediseño de Registrar (deltas 1-3) + brief y mockup de Design

**Todo commiteado y en producción (auto-deploy Vercel).** Primeros pasos del rediseño del flujo de Registrar: tres deltas visuales puntuales sobre el código real, más el brief y el mockup que guían la parte gruesa que viene.

**Brief para Design (commit `2cf5571`):** se creó `BRIEF_REGISTRAR_DESIGN.md` en la raíz, con la estructura REAL del flujo de Registrar (las dos páginas `NuevoPage` + `RegistroPage`, todas las vistas, copy textual, tokens, estados) + la dirección estética. Decisión estructural fijada: **mantener las dos pantallas, NO unificar** (la idea de unificar quedó como nota "no implementar"). Con ese brief se generó el **mockup en Claude Design** (handoff "Registrar · Handoff").

**Rediseño de Registrar — Parte 1 (commit `f5ee6b8`):**
- **Delta 1 — placeholder cálido:** el campo principal "¿Qué pasó?" (`VoiceTextarea`) ya no sale vacío; muestra **"Cuéntame qué pasó, con tus palabras…"** en modo rápido Y detallado. Color del placeholder `--color-text-light` (ya existía en el CSS del componente). La prop `placeholder` ya existía; solo se pasó en ambos usos de `RegistroPage`.
- **Delta 2 — Acción rápida sin salto de color:** el skeleton de carga (`.accionCard` / `.accionSkeleton` en `RegistroPage`) era **ámbar** mientras el resultado final (`AccionRapida`) es **tangerine**. Se replicaron los tokens tangerine del componente final en el skeleton (mismo fondo `--color-surface`, borde `--color-border`, `border-left` `--color-primary`, label `--color-primary-deep`). Shimmer migrado de hex hardcodeado a tokens (`--color-primary-bg` → `--color-primary`), visible en light y dark. No se tocó el componente `AccionRapida`.

**Rediseño de Registrar — Parte 2 (commit `3aa61bd`):**
- **Delta 3 — colores de emoción tokenizados:** los **12 hex hardcodeados** de `TAXONOMIA_EMOCIONES` (un par color + colorBg por cada una de las 6 emociones) salieron de `RegistroPage.jsx` y pasaron a tokens **`--color-emocion-*` / `-bg`** definidos en `index.css`, con override de modo oscuro. Los inline styles de los chips de emoción (borde, texto, fondo) ahora consumen `var()`. Cero hex de emoción en `RegistroPage.jsx`.

**Nota de QA anotada:** los valores light de los tokens de emoción **no son idénticos** a los hex originales (se afinaron a la paleta), así que los chips de emoción se ven un poco distintos a antes en light, no solo "lo mismo tokenizado". Daniel debe revisarlos en la app (light + dark).

---

## Segmentación Free vs Pro — DECISIÓN CERRADA (3 junio 2026, actualizada 4 junio)

**Principio rector:** lo inmediato y de crisis es **gratis**; lo profundo, lo que escala y lo que se comparte es **Pro**.

> Documentación de la decisión. **El primer gate (2do hijo) ya está implementado (commit `d2f4a4c`); faltan los demás** — ver "Gates a implementar" abajo. Auditoría que motivó esto: solo existían 2 topes reales (15 episodios con invitación; PDF oculto sin invitación); casi todas las features "Pro" de la vitrina ya las tiene el free, y los límites de "1 hijo" e "historial 7 días" eran promesas fantasma no implementadas (1 hijo ya quedó implementado).

**FREE (lo inmediato / el aha que engancha):**
- Registrar hasta 15 episodios.
- 1 hijo.
- Orientación IA inmediata por episodio.
- Su historial **completo** (NO se corta a 7 días — promesa fantasma ya quitada de la vitrina).
- **Búsqueda en sus registros** (movida de Pro a Free — ver nota abajo).
- Álbum de fotos + badges.

**PRO (lo profundo / lo que escala / lo que se comparte):**
- Episodios ilimitados.
- Hijos ilimitados.
- Análisis de patrones en el tiempo (el free ve un **teaser** que invita). ✅ HECHO
- Estrategias de 4 semanas (el free ve **preview**; crear es Pro). ✅ HECHO
- Informe PDF para especialista (free ve botón con candado → invitación). ✅ HECHO
- Modo familia: **el que inicia paga** para conectar; la pareja invitada accede **sin pagar**. ⏸️ DIFERIDO a Stripe.

**Cambio de segmentación (4 junio): BÚSQUEDA pasa de Pro a FREE.** Razones: (1) es 100% local en el cliente, sin costo de API; (2) el free con ≤15 registros no la necesita (no convierte); (3) es utilidad básica sobre los datos propios — gatearla se siente mezquino, igual que el historial. Su valor real emerge solo con el volumen que tiene Pro. Por eso también se quitó de la vitrina `TODO_PRO`.

**Gates implementados (4 de los previstos):** ✅ 2do hijo (`d2f4a4c`) · ✅ análisis de patrones (`90949e8`) · ✅ crear estrategia (`e02f7c9`) · ✅ export PDF (`6cd4fd5`). **Búsqueda:** ya no se gatea (queda Free). **Modo familia:** diferido a Stripe (ver abajo). **Cada tope invita a Pro al chocarlo** (no bloquea en silencio).

**Modo familia — NO implementado, DIFERIDO a la fase Stripe (decisión 4 junio):**
- *Razón 1:* sin pago real (Stripe) nadie es Pro de verdad; gatear "solo Pro invita" hoy rompería el modo pareja para todos sin monetizar nada.
- *Razón 2:* hacer solo "el que inicia paga" sin herencia de plan deja a la pareja invitada (free) chocando con los gates sobre el mismo hijo (incoherente).
- *Diseño pendiente (va junto con Stripe):* gate "iniciador paga" (choke point: `handleInvite` en `PerfilPage.jsx:199`) **+** herencia de plan efectivo de familia — RPC `security definer` que extienda `get_partner_info` con el plan (el join a `perfiles` ya existe), redefinir `isPro()` para considerar `plan propio || plan de familia`, y resolver el downgrade al desconectar y el loophole de reventa. Hoy el plan es **estrictamente por usuario** (`perfiles.plan`), no hay noción de plan a nivel de familia.

---

## Próximo paso

### Rediseño de Registrar — ✅ COMPLETO (8 junio 2026)
- **El rediseño "Refugio" del flujo Registrar entero está TERMINADO** (NuevoPage + RegistroPage, vistas elegir/avance/rápido/detallado/resultado/orientación). El detalle por push vive en el bloque "Sesión 8 junio 2026" arriba. Pendientes menores derivados: QA de voz + documentar la regla de voz en `CLAUDE.md`; y la pasada de limpieza de CSS muerto + extracción de la base Refugio duplicada (ver "Deudas técnicas" en el bloque de hoy).

### Beta — documento y arranque
- **Guardar el plan de beta como `PLAN_BETA.md`** en el repo. Documento ya armado: 1 mes de uso, arranque en 1-2 semanas, testers conocidos + referidos, feedback por grupo de WhatsApp + encuesta, 4 métricas, mensajes listos.
- **Paso 1 del calendario:** auditoría pre-lanzamiento (prompt ya definido, **aún sin correr**).

### Producto — idea nueva (decidida, falta implementar)
- **Racha por interacción activa:** la racha debe contar por **cualquier** interacción activa con la app, no solo por registrar un episodio. Decidido; falta implementarlo.

### Fase monetización — gates ✅ COMPLETADOS (4 junio)
- ✅ Gate 2do hijo (`d2f4a4c`) · ✅ análisis de patrones (`90949e8`) · ✅ crear estrategias (`e02f7c9`) · ✅ export PDF (`6cd4fd5`).
- ✅ Vitrina alineada: promesas fantasma "historial 7 días" y "búsqueda" quitadas de `TODO_PRO` (`3010d7f`).
- **Búsqueda:** decidida como FREE (no se gatea).
- **Modo familia:** diferido a la fase Stripe (ver sección Segmentación para el diseño completo).

### Monetización — LO GRANDE que sigue
- **Pasarela de pago real (Stripe).** Los 4 gates muestran la invitación, pero el botón "Activar Huella Pro" y el `UpgradeModal` **NO cobran aún**. Tarea grande, **va antes del modo familia**.
- **Modo familia (junto con Stripe):** gate "iniciador paga" + herencia de plan efectivo de familia (RPC `security definer` + redefinir `isPro()` + downgrade al desconectar + cerrar loophole de reventa). Detalle en la sección Segmentación.
- **Evaluar reverse trial largo (14-30 días, NO 7)** cuando llegue Stripe. *(El trial de 7 días quedó descartado.)*

### Producto / UX (notas nuevas de esta sesión)
- **Barra de progreso / tiempo estimado** en la pantalla "Creando tu plan" (estrategias) — dar feedback de avance durante la espera.
- **Idea rediseño Historial:** mostrar los últimos 3 sucesos + un cuadro desplegable con el resto (cuidar que el historial completo siga fácil de revisar — es free).
- **Auditar las 16 líneas completas del array `TODO_PRO`** (`CuentaPage.jsx`) contra la segmentación real cuando la vitrina pase por Design (ya se quitaron 2; revisar el resto).

### UX / Producto (notas de esta sesión)
- **Login estratégico:** mover el gate de login de la puerta a "registrar primer episodio" (dejar explorar antes). Tarea de onboarding + rutas. Incluye fix: el login redirige a `huella.lat` **incluso desde `localhost`** → ajustar config de Supabase para respetar `localhost` en dev.
- **Botón de respiración para el cuidador** antes de registrar (co-regulación; base Siegel/Shanker).
- **Reevaluar onboarding modal "Así funciona Huella"** (3 pasos) que aparece al iniciar sesión.
- **Reevaluar banner "Activa recordatorios para no perder el hilo con tu hijo/a".**
- **Verificar implementación real del "check-in emocional":** confirmar qué hace y que el copy de la vitrina calce.

### Diseño (a Claude Design)
- **Rediseño estético del `UpgradeModal`** (colores/tipografía/layout premium). El **centrado ya quedó resuelto** esta sesión (commit `71cb70b`); falta solo el rediseño visual.
- **Pasar por Design la vitrina `/cuenta` y la sección de Registros.**
- **Decisión de formato de precio:** "$9.990" (natural en Chile) vs "CLP 9.990".
- **Deuda de tokens:** `HistorialHeader.module.css` usa `#FFD89C` hardcodeado en el candado del PDF (`.pdfLock`, espejo del `.pdfDot` existente) — migrar a token en la pasada de Design.

### En recámara (optimización de costo, no urgente)
- **Fase 2 del caching:** cachear también el `marcoEdad()` (~5.300 tokens, 4 variantes por edad) como 2º breakpoint del `system` — recorta otro ~⅓. Requiere refactor del contrato cliente↔backend. Detalle en `COSTOS_IA.md`.
- **Evaluar Haiku** (`claude-haiku-4-5`) para tareas simples (celebrar hito, reflexión check-in, consejo diario) en vez de Sonnet para todo.

### Pendientes de fondo (sin fecha)
- **"Bugs Estrategias parte 2" + "Puerta 2 con cuerpo vacío" → DESCARTADOS (1 jun 2026).** Revisados en prod, sin defecto real; descartados por falta de síntoma.
- **Sesión D del PLAN.md — Logo + Auditoría tagline:** reemplazar wordmark "huella" por el logo real (cuando llegue del diseñador) en header, login, signup, correos, favicon, ícono PWA; y buscar/reemplazar el tagline viejo por "Conoce la huella única de tus hijos".
