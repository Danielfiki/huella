# ESTADO.md — Proyecto Huella

*Última actualización: martes 4 agosto 2026 — **DÍA SIN CÓDIGO: diagnóstico del flujo de pago + operación de beta día 3. CERO COMMITS DE FEATURE.** **HALLAZGO CENTRAL: no existe NINGÚN registro de intentos de pago** — ni tabla, ni servicio externo, solo `console.error` en Vercel con retención de **una hora** (plan Hobby). Consecuencia dura: **cada vez que un usuario reporte que no pudo pagar, vamos a estar ciegos igual que hoy**; además `mp-crear-suscripcion.js` ni siquiera loguea el camino exitoso. **El caso que lo destapó:** un usuario real intentó pagar Huella Pro el fin de semana y le salió error DENTRO de la app, al tocar el botón de activar. **Lo verificado:** el checkout **SÍ funciona** (se reprodujo el flujo completo en incógnito y llega bien a Mercado Pago con "Huella Pro mensual $9.990" y las dos formas de pago → la creación del preapproval **no está rota**); en el panel de MP **NO aparece ningún intento entre el 1 y el 3 de agosto** (el registro más reciente es del **12 de julio**) → **el intento nunca llegó a MP**; los logs de Vercel ya vencieron → **el error exacto de ese usuario NO es recuperable**; y `MP_ACCESS_TOKEN` está marcado **Sensitive** en Vercel, así que **no se pudo verificar si es token de prueba o productivo**. **Hipótesis principal (NO confirmada): el "camino silencioso"** — la ruta de éxito nunca hace `setCargando(false)` antes del redirect, así que si el usuario llega a MP y vuelve atrás, el navegador puede restaurar la página desde **bfcache** con el botón todavía en "Redirigiéndote al pago…" y **deshabilitado**: toca y no pasa nada, sin error y sin redirect. **Probado en Chrome de escritorio: NO se reproduce** (el botón vuelve normal); **falta probar en celular** (la TWA de Android y Safari en iPhone manejan bfcache distinto) → **queda abierto**. **PLAN ACORDADO, NO EJECUTADO:** (1) reproducir el camino silencioso en celular, (2) crear tabla `pagos_intentos` con **RLS activa sin policies**, patrón `codigos_beta`, (3) instrumentar `mp-crear-suscripcion.js` con un helper blindado que **nunca pueda romper el pago**, (4) mejorar el error visible con **código de referencia** y **botón de reintentar**. El SQL de la **migración 009** y el diseño completo ya están entregados; quedan **pendientes de ejecutar**. **BETA DÍA 3: 9 cuentas creadas de 17 testers, 5 con al menos un registro.** La señal más limpia es **`matias.lagos.cartagena` (2 registros): el ÚNICO desconocido del grupo, y el que más usó la app.** **EL RELOJ DE GOOGLE NO HA ARRANCADO: hay 9 y se necesitan 12.** **Play Console sigue mostrando "Datos no disponibles"** al tercer día incluso con la métrica correcta → **se deja de pelear con Play Console; Supabase es la fuente de verdad operativa** (crear cuenta implica haber instalado). **Antes (lunes 3 agosto):** **MARCO TEÓRICO VISIBLE EN LAS SALIDAS DE PATRÓN (commit `a5c1595`, en producción, QA aprobado).** Los patrones ("Algo que aún no cambia") ya cierran con "Marco aplicado: [autor] — [concepto]", igual que los episodios. **Causa raíz: no faltaba la instrucción — el formato la anulaba.** El `SYSTEM_PROMPT` sí pedía el marco, pero `analizarPatron` exigía JSON puro con 4 claves y el modelo obedecía el formato. Se agregó la quinta clave `marco_aplicado` (viaja sola al `jsonb` de `orientacion_ia`, **sin migración ni columnas nuevas**), una **lista cerrada de 52 autores** en el prompt con prohibición dura de inventar autores o títulos, y el componente compartido **`PieCientifico`** que replica el pie de `RespuestaIA`. El descargo legal va **hardcodeado en el componente, no generado por IA**; en `derivar` se omite para no repetir el cierre médico. **🔍 HALLAZGO ANOTADO COMO DEUDA (no se resuelve ahora): hay CUATRO inventarios de autores en el repo y no coinciden entre sí** — los **77** de `BRIEF_ACCION_RAPIDA.md` (solo documento, ninguna constante los contiene), los **23** de `AUTORES`, las 16 dimensiones de `MAPA_DIMENSIONES` y los **39** de `src/lib/frases.js`, más 17 ejemplos sueltos en el `SYSTEM_PROMPT` sin respaldo de ningún brief; **no hay forma programática de preguntarle al código si un autor está aprobado.** **BETA EN CURSO, DÍA 2: 7 códigos canjeados de 17** (`HUELLA-19`, `05`, `03`, `08`, `14`, `10`, `02`); **Play Console todavía no muestra datos de instalaciones** — pendiente seguir contando y anotar la fecha en `/beta` al llegar a 12. **Antes (domingo 2 agosto):** **🚀 LA BETA SE LANZÓ, UNA SEMANA ANTES DE LO ACORDADO (estaba fijada para el domingo 9).** Daniel juntó los 17 correos antes de lo previsto y se adelantó, lo que **deja más margen antes del plazo del 31 de agosto**. **Día 100% de operación, sin código.** Los **17 testers** quedaron en el grupo de Google `testers-huella@huella.lat` (19 miembros contando `contacto@huella.lat` y el correo de la prueba de julio; suscripción en "No recibir correo electrónico" para que no genere ruido), en el grupo de WhatsApp "Huella · Beta", y **cada uno recibió su código por privado**: `HUELLA-01..10` y `HUELLA-13..19`, los 17 distintos y sin repetir — **quedan libres el 11, el 12 y el 20**. Orden de los mensajes: bienvenida → paso a paso con el link de opt-in (verificado antes de mandarlo) → 17 privados con el código → aclaración sobre el error "Aplicación no disponible". **Un tester usa correo corporativo** (`v.ramirez@pacificschoolpichilemu.com`) y **se verificó con la persona que es la cuenta de su celular Android**, así que sirve. **INCIDENCIA CONOCIDA, ESPERADA, NO ES BUG:** varios ven **"Aplicación no disponible"** al abrir el link — o el navegador está con otra cuenta de Google, o Google aún no propaga; se resuelve solo o cambiando de cuenta, y ya se avisó al grupo con captura. **⏭️ Revisado el lunes 3 ago: Play Console todavía sin datos de instalaciones; cuando haya 12 o más, anotar esa fecha en `/beta`.** ⚠️ **El reloj de los 14 días NO arrancó con el lanzamiento: arranca con los 12 instalados simultáneos, así que la fecha de término todavía NO está definida.** **📌 Lección: el orden correcto del día de lanzamiento es agregar los correos al grupo de Google, esperar 20 minutos y recién ahí mandar el link — la propagación puede tardar más, así que el mensaje de instalación debe incluir el aviso de "si dice que no está disponible, espera y vuelve a entrar".** **Antes (sábado 1 agosto):** el tablero de `/beta` quedó listo para correr la beta completa, en **tres commits** sobre un solo archivo: **`df9c130`** (la meta subió de 15 a **20**, los textos ahora derivan el número de la constante y se eliminó el paso rojo de verificación del canje, que acusaba un texto ya corregido), **`439d974`** (**seguimiento por tester**: toggle "Registro" y campo de nota libre, más **pasos nuevos para los días 7 y 10** — antes el tablero se quedaba mudo nueve días seguidos y no había forma de saber QUIÉN se cayó; además `d1` y `d3` dejaron de caducar solos) y **`7e78df5`** (**`MIN_CORREOS = 15` como mínimo para lanzar, separado de `META_CORREOS = 20` como meta ideal** — el tablero frenaba pidiendo 20 exactos cuando Google solo exige 12 instalados y el resto es colchón). Las citas del bloque de canje quedaron literales (**"¿Tienes un código de invitación?"**). **Verificado en Supabase: los 20 códigos `HUELLA-01..20` están LIBRES** — `HUELLA-01` NO estaba gastado, como afirmaba el registro anterior. El protocolo se consolidó en un solo documento fuera del repo (`huella-protocolo-beta-android.md`, Drive, versión 1 ago). **Deuda anotada, no resuelta:** el autoasignador de códigos (`BetaPage.jsx:845`) elige el primer libre según el tablero, sin consultar `codigos_beta`. **Antes (28 julio):** **EL TABLERO DE `/beta` YA SINCRONIZA ENTRE PC Y CELULAR + DOS MENSAJES DE TESTERS CORREGIDOS.** El tablero dejó de vivir solo en `localStorage`: ahora el estado se guarda en Supabase (tabla nueva `tablero_beta`, migración `008_tablero_beta.sql`, una fila por usuario con el estado como `jsonb`, RLS activa con policy `own_data` — es privado de Daniel, la pareja de la familia NO lo ve). `localStorage` se mantiene degradado a **cache local** (pinta el tablero al instante mientras llega la nube). Regla de conflicto: **al abrir la página gana Supabase**. Escritura por `upsert` con debounce de 900 ms + subida al ocultar la pestaña y al salir. Aviso rojo **separado** para la falla de sincronización (el guardado local y la subida a la nube son fallas distintas). Además se corrigieron **dos mensajes para copiar** que mandaban a los testers a un campo que no existe: decían que el código de acceso se pone al crear la cuenta, cuando el canje vive en la **pantalla de inicio**, en el bloque **"¿Tienes un código de invitación?"** con botón **"Activar"**. Todo commiteado (`0562258`) y **en producción**; **QA pasado entre PC y celular**. **Sesión anterior (27 julio):** **TABLERO INTERNO DE CONTROL DE LA BETA — EN `/beta`.** Página privada de Daniel (commit `d793ec4`): detrás de login (`ProtectedRoute`) y **FUERA del Layout** (sin barra de navegación), **sin enlace desde ninguna pantalla — solo se llega escribiendo la URL**. Guarda el registro de testers y el avance del protocolo en **localStorage** (clave `huella-beta-operacion`), sin tocar la base, el service worker ni el manifest. Es un tablero de "lo que toca ahora" que va calculando el único próximo paso del protocolo de reclutamiento. **ESTADO GENERAL: la feature "Algo que aún no cambia" quedó CERRADA Y EN PRODUCCIÓN, y NO hay código pendiente. LO QUE SIGUE ES OPERACIÓN, NO CÓDIGO: completar la convocatoria de la beta por Instagram (van 17 de 20)** (historia con caja de preguntas pidiendo el Gmail; juntar los 20 correos y soltar el link el mismo día — Google exige 12 instalados simultáneos por 14 días). **FEATURE "ALGO QUE AÚN NO CAMBIA" (tabla `patrones`) — FASES A, B Y C CERRADAS, COMMITEADAS Y VERIFICADAS EN PRODUCCIÓN (claro y oscuro). LA FEATURE QUEDA CERRADA DE PUNTA A PUNTA.** Tercera entrada de registro, para conductas que duran semanas o meses (chupete, pañal, dormir en la cama de los papás, comer poco), **aislada del motor de rasgos por pared dura** (los patrones viven en `state.patrones`; NUNCA en `state.episodios`/`state.hitos` ni en los arrays que van a `detectarRasgos`). **Fase A** (tabla `patrones` en Supabase, RLS igual que `hitos` — escribir en carpeta propia, leer en familia vía `get_family_user_ids`; CHECK de columnas + regla de regresión→derivar) y **Fase B** (código) quedaron cerradas. **Fase B incluye:** ruta `/patron` (`PatronPage.jsx`, máquina de estados PROPIA — NO la de `NuevoPage`); tercera card en el selector de `/nuevo` (filo indigo, disco lavanda, espiral, con variante bloqueada al llegar a 3 abiertos); formulario de 5 preguntas (relato + 3 selecciones únicas + "qué ya intentaste" opcional, con `VoiceTextarea` donde corresponde); `analizarPatron` en `src/services/anthropic.js` (clasifica esperable/instalado/derivar + 3 textos, `max_tokens 1500`, NO genera plan) con **regla dura de regresión como post-proceso en código** (regresión→derivar SIEMPRE; la IA puede escalar a derivar, nunca bajar); las **tres salidas** (esperable → "Armar un plan"; instalado → "Empecemos con un plan"; derivar → cierre serio, sin plan, sin rojo ni alertas); **enganche del plan** reusando el flujo de caso libre vía `crearPlanDesdeTexto` (extraído al contexto — se **deduplicó** también `handleCasoLibre` de `EstrategiasPage` para que use el mismo helper); **gate Pro** del plan vía `UpgradeModal` (aparece solo, sin candado visual); **tope de 3 patrones abiertos por hijo** (validado en la app contra `state.patrones`, no en la base). **Orden de guardado:** INSERT fila abierta → IA → UPDATE misma fila con clasificación + orientación (nunca al revés; si la IA falla, la fila ya está guardada y se muestra reintentar). **COMMITS:** feature completa `28ca520` + fix del prompt de `analizarPatron` `1f69336` (los tres textos ya no prometen planes/programas; en regresión la IA recibe la clasificación forzada ANTES de redactar, para no escribir en un marco que la pantalla no cumple). **QA EN PRODUCCIÓN APROBADO:** las tres salidas, el tope de 3, modo oscuro, regresión clasificando a derivar sin prometer plan, y el flujo de caso libre de Estrategias **sin regresión** tras la deduplicación (verificado uno-por-uno los 12 puntos del camino viejo). **NOMBRES VISIBLES:** "Algo que aún no cambia" en el selector y los headers; **"Lo que estás acompañando"** en el bloque de Home; **"Acompañas"** en el filtro de Historial; y el filtro **"Todos" se renombró a "Momentos"** (los patrones no tienen fecha de ocurrencia, no caben en la lista agrupada por día; "Momentos" es exacto y ya es la palabra de la app). **La palabra "patrón" NUNCA aparece en la interfaz: es solo el nombre interno de la tabla.** **FASE C (cierre del ciclo) — HECHA:** bloque en Home "Lo que estás acompañando" (con autor del registro y línea "y N más"; aparece también en cuentas sin historial previo, tras el estado vacío — el caso de origen: el chupete registrado en el primer minuto); modo lectura `/patron/:id` (los 3 bloques de `orientacion_ia`, más el cierre médico si la clasificación es 'derivar', y "Ver el plan" si tiene estrategia vinculada); modal de cierre con **tres motivos que pesan exactamente igual** (resuelto / ya_no_preocupa / dejado_estar — sin confeti, sin verde, sin check: un patrón puede terminar de varias formas, no solo bien); filtro "Acompañas" en Historial (abiertos y cerrados del hijo activo; los cerrados atenuados con meta "CERRADO"). **El "Cerrar esto" solo lo ve el autor** (misma convención que editar/borrar en la app). **Commits:** Fase C `81072f9` + ajustes de copy de los chips `6b08687` (más los de Fase B: `28ca520` y `1f69336`). **QA EN PRODUCCIÓN APROBADO (claro y oscuro):** las tres salidas, tope de 3 por hijo, regresión forzada a 'derivar' sin prometer plan, cierre con los tres motivos, autor del registro, cierre restringido al autor, y el caso libre de Estrategias sin regresión. **NO ENTRA EN LA V1 (decidido):** la conversión patrón resuelto → hito. El cierre "ya no pasa" se **guarda** (cierre_motivo='resuelto') pero **NO genera hito todavía**. **PENDIENTES DE ESTA FEATURE, POST-BETA:** **(1) Los patrones NO salen en el PDF que se exporta para el pediatra** — y un patrón clasificado 'derivar' es justamente lo que hay que llevar a la consulta. **Es la primera tarea al cerrar la beta.** **(2) Riesgo de nombres:** el Home ya tiene un bloque **"Análisis IA de patrones"** que lee `episodios` (distinto de la tabla `patrones`); **vigilar que esa IA no reporte como hallazgo algo que el papá ya registró a mano** como patrón. **DEUDAS ANOTADAS (no urgentes):** (a) el **header propio** de `PatronPage`/lectura = **quinto tratamiento de header** distinto en la app (candidato a unificar); (b) tokens `--pill-emo/rut/vin/jue/sal` **declarados en `index.css` y sin uso**; (c) el copy **"Buscando bibliografía pediátrica"** del loader compartido `LoadingDignificado` **dice algo que la app no hace** (no consulta bibliografía); (d) un patrón guardado **sin `hijo_id` no contaría para el tope** de 3 — misma convención que `addHito`/`addEpisodio`, **no es falla de esta feature**. Antes (viernes 24 julio 2026): **BETA ANDROID DESBLOQUEADA: LA v3 YA ESTABA APROBADA + QA EDGE-TO-EDGE APROBADO + GRUPO DE TESTERS ARREGLADO + FLUJO DE TESTER PROBADO DE PUNTA A PUNTA.** **(1) QA DE EDGE-TO-EDGE DE LA v4 EN LA TABLET SAMSUNG — ✅ APROBADO.** Se instaló el **APK firmado (`app-release-signed.apk`) por sideload desde el Drive**, tras **desinstalar la versión anterior**. **Verificado en Home e Historial:** las barras de sistema **no tapan contenido**, la **barra de navegación de la app queda completa sobre el taskbar de Samsung**, y **no hay recortes en los bordes**. **Sin regresiones visuales** por `targetSdk 36`. **(2) HALLAZGO GRANDE: la v3 YA ESTABA APROBADA desde el 18 jul 16:36 — el correo de Google nunca llegó (o se perdió).** Se descubrió revisando el estado **directamente en Play Console**: muestra **"Disponible para determinados testers"**, **canal Alpha activo**, **177 países**. Se creyó por días que la beta estaba bloqueada esperando la aprobación, cuando ya estaba lista. **LECCIÓN: no depender del correo de Google — revisar el estado directo en Play Console.** **(3) BLOQUEO DEL GRUPO DE TESTERS — RESUELTO.** El grupo `testers-huella@huella.lat` solo aceptaba correos del dominio `huella.lat`, así que **habría rebotado con TODOS los testers externos** (Gmail). Se abrió en `admin.google.com` (Aplicaciones → Google Workspace → Grupos para empresas → Opciones para compartir → **"Permitir que los propietarios de grupos añadan miembros externos"**) y luego se activó **"Permitir miembros externos"** en el grupo. **Verificado con un correo externo real.** **(4) FLUJO DE TESTER PROBADO DE PUNTA A PUNTA:** correo externo agregado al grupo → link de opt-in → **"You are a tester"** → descarga desde Play Store → **app funcionando**. **Link de opt-in: `https://play.google.com/apps/testing/lat.huella.app`** **(5) AVISO DE ENLACES PROFUNDOS (19 jul) — descartado como falsa alarma:** Play Console muestra **"Todos los enlaces funcionan"** y `www.huella.lat` sin problemas. **DOCUMENTOS NUEVOS (en el Drive de Daniel, carpeta HUELLA, fuera del repo):** (a) **`huella-protocolo-beta-android.pdf`** — protocolo completo de la beta con todos los textos de convocatoria y mensajes; **reemplaza el flujo PWA anterior de `huella-textos-beta.md`.** (b) **`huella-manual-de-producto.pdf`** — manual de producto (qué es la app, secciones, flujos, motor de rasgos, planes, arquitectura, identidad visual); sirve para dar contexto a sesiones nuevas de Code o Design. **PENDIENTE NUEVO, SIN VERIFICAR (NO tratar como hecho):** un reporte de agentes afirmó que varias funciones que `CuentaPage` vende como Pro **no tendrían gate por plan en el código** (orientación IA, acción rápida, consejo diario, rutina, notificaciones, álbum, medallas, check-in, modo familia). **ESTA AFIRMACIÓN NO ESTÁ VERIFICADA:** se basó solo en buscar `isPro()`, puede ser falso positivo. Antes de actuar: (a) buscar gates de TODAS las formas posibles, no solo `isPro()`; (b) probar con una cuenta Free real en producción. **Otra discrepancia sin resolver:** conteo de medallas — Logros dice **33**, `CuentaPage` dice **34**. **PRÓXIMO PASO:** lanzar la **convocatoria de ~15 testers Android** vía la marca personal de Daniel (historia de Instagram con caja de preguntas pidiendo el Gmail). **Juntar TODOS los correos primero y soltar el link el mismo día:** Google exige **12 testers instalados SIMULTÁNEOS durante 14 días corridos, NO acumulados**. Protocolo completo en `huella-protocolo-beta-android.pdf`. **SIGUE VIGENTE:** (i) **NO subir la v4** mientras corra la beta con la v3; (ii) **plazo 31 ago 2026** — la advertencia de nivel de API solo se cierra cuando la **v4 llegue a PRODUCCIÓN** (no basta la prueba cerrada). Antes (miércoles 22 julio 2026): **STORAGE CERRADO POR ESCRITURA + AVISO DE ENLACES PROFUNDOS DESCARTADO + TWA v4 (targetSdk 36) CONSTRUIDA Y VERIFICADA, SIN SUBIR.** **(1) POLICIES DE ESCRITURA DE STORAGE — ENDURECIDAS Y VERIFICADAS EN PRODUCCIÓN.** Se eliminaron las **6 policies abiertas** (`Avatar upload`/`update`/`delete` y `Momentos upload`/`update`/`delete`) que **solo validaban `bucket_id`**, y se crearon `avatares_insert`/`update`/`delete` y `momentos_insert`/`update`/`delete`, todas con **`(storage.foldername(name))[1] = auth.uid()::text`** — en `with check` para INSERT/UPDATE y en `using` para DELETE. Las **policies SELECT de ayer con `get_family_user_ids` quedaron INTACTAS**: el modelo final es **escribir en carpeta propia, leer en familia** (el modo pareja se resuelve en la lectura, porque el código siempre construye el path con el `user_id` del que sube). **HALLAZGO de la sesión: el DELETE también estaba abierto, no solo el INSERT** — el diagnóstico del 21 jul había detectado únicamente el hueco de INSERT. **QA en producción OK:** reemplazo de un avatar existente (camino `upsert` → **UPDATE**, el más frágil) y creación de un momento nuevo con foto; ambos se ven bien en Historial y Logros. **Baja la deuda técnica correspondiente.** **(2) AVISO DE GOOGLE SOBRE ENLACES PROFUNDOS (19 jul) — FALSA ALARMA, CERRADO.** Play Console muestra **"Todos los enlaces funcionan"** y el dominio `www.huella.lat` con **"No se han encontrado problemas"**. El aviso era **genérico y previo a la verificación de la v3**. **DECISIÓN TOMADA (no reabrir): NO se agrega el apex `huella.lat` como host** — la app sigue reclamando solo `www.huella.lat`; no se toca la ficha de Play. Diagnóstico de respaldo de esta sesión: `assetlinks.json` sirve **200 + `application/json`** en `www.huella.lat` sin redirección, con los 2 fingerprints correctos; el apex responde **307 → www** (y la verificación de App Links no sigue redirecciones, por eso el apex nunca se declaró). **(3) TWA VERSIÓN 4 — CONSTRUIDA Y VERIFICADA, *SIN SUBIR*.** `targetSdkVersion` **35 → 36** y `versionCode` **3 → 4**, editados **a mano** en `huella-twa\app\build.gradle` (2 líneas, nada más). **NO se tocó `twa-manifest.json`**: se preservó su checksum (`79fc27ea…`) para que **Bubblewrap no ofreciera regenerar el proyecto y pisara el targetSdk** — el template de `@bubblewrap/cli@1.24.1` **hardcodea `targetSdkVersion 35`** y 1.24.1 **ya es la última versión publicada**, así que no existe hoy un Bubblewrap que genere 36. **DRIFT DOCUMENTADO Y DELIBERADO:** `twa-manifest.json` quedó diciendo `appVersionCode: 3` (si alguna vez se corre `bubblewrap update`, revierte el targetSdk a 35 — **ojo con eso**). **Artefactos** en `C:\Users\dundu\OneDrive\Desktop\huella-twa`: `app-release-bundle.aab` (1.203.044 bytes) y `app-release-signed.apk` (1.081.794 bytes), ambos del **22 jul 14:33**. **VERIFICADO LEYENDO EL ARTEFACTO, no el `build.gradle`:** el APK por `aapt2 dump badging` (`versionCode='4'`, `targetSdkVersion:'36'`) y el AAB decodificando su manifiesto **protobuf** (`targetSdkVersion` → `1a 02 33 36` / `30 24`=36; `versionCode` → `1a 01 34` / `30 04`=4; `minSdkVersion` intacto en 21). Confirmado además que `app/build.gradle` **no fue revertido** durante el build y que el checksum siguió intacto. **Firmado con la upload key de siempre** (`44:CA:BB:…:23:CF`, `CN=Daniel Undurraga`), que **coincide con el `assetlinks.json`** → no hay que tocar nada del lado web. **El APK firmado está respaldado en el Drive, carpeta HUELLA.** **Nota de tamaño (revisada, no es error):** el APK firmado pesa exactamente lo mismo que el del 18 jul por coincidencia de padding; el AAB sí creció 11 bytes y el `unsigned-aligned.apk` bajó 4. **PENDIENTES QUE DEJA ESTA SESIÓN:** **(a) QA de edge-to-edge de la v4 en la tablet Samsung** (splash, barra de estado, barra de navegación) — **BLOQUEADO: la tablet no está disponible**; se instala el APK desde el Drive. **(b) NO subir la v4 a Play Console mientras la v3 siga en revisión.** **(c) Plazo Google:** la advertencia de nivel de API **solo se cierra cuando la v4 llegue al canal de PRODUCCIÓN — NO basta la prueba cerrada**; fecha límite **31 ago 2026**. **(d)** Sigue esperando la **aprobación de la v3** para sacar el link de opt-in y lanzar la convocatoria de ~15 testers Android. Antes (martes 21 julio 2026): **PRIVACIDAD DE FOTOS — RESUELTO COMPLETO Y VERIFICADO EN PRODUCCIÓN.** El pendiente crítico de buckets públicos (fotos de menores accesibles por URL sin login) quedó **CERRADO**, en 3 fases. **FASE 1 (código):** los 5 write-sites (`onboardingPersistor`, `PerfilPage`, `HitosPage`, `NuevoPage` ×2) ahora guardan el **PATH** del objeto en la BD (no la URL); `HuellaContext` firma URLs temporales al leer (`createSignedUrls`, TTL 2h) en cargas y escrituras incrementales; tolerante a formato viejo. **Commit `0637db1`, pusheado a `origin/main`, desplegado en Vercel** (bundle `index-Cj3wiJbB.js`); QA en prod: todas las fotos cargan. **FASE 2 (backfill de datos):** las **6 filas con URL http** (3 hijos, 3 hitos, 0 episodios) convertidas a path limpio (`user_id/archivo.jpg`) vía `UPDATE` con `regexp_replace + split_part`, verificado por SELECT. **FASE 3 (cierre):** se reemplazaron las policies SELECT de `storage.objects` — se **eliminaron** las viejas `"Avatar public read"` y `"Momentos public read"` (eran `to public` = el hueco) y se crearon `avatares_select`/`momentos_select`, **SELECT `to authenticated`** usando `get_family_user_ids` (cubre **modo pareja**: dueño + pareja ven las fotos); verificado que quedan solo esas 2 policies SELECT, ninguna `to public`. Luego **flip de buckets a privado** (`public = false` en `avatares` y `momentos`). **QA FINAL en prod con bucket privado: todas las fotos cargan** (avatar, álbum de Logros, Historial); modo pareja cubierto. **LECCIÓN DE SECUENCIA (para futuros cambios así):** el orden correcto es **desplegar el código nuevo ANTES del backfill**. En esta sesión el backfill se corrió antes del deploy por error → las fotos se rompieron temporalmente (prod servía el código viejo, que metía el path crudo en el `<img>`); se arregló pusheando la Fase 1. Regla: **deploy primero, migración de datos después.** **PENDIENTE NUEVO (menor, no bloqueante):** endurecer las policies INSERT `"Avatar upload"`/`"Momentos upload"` (tienen `qual = null`, no validan que el usuario suba solo a su carpeta `user_id`) — anotado en PENDIENTES. **CORREO DE CONFIRMACIÓN — NO ERA BUG (Causa A confirmada):** se probó con un correo nuevo real (`igna.collab@gmail.com`) y **el correo SÍ llegó y se vio bien** → el "bug" era que se probaba con correos **ya registrados** (Supabase no reenvía por anti-enumeración). **Pendiente CERRADO como no-bug.** **MEJORA DE MARCA — CORREO DE CONFIRMACIÓN CON ESCARABAJO (HECHO):** se agregó el escarabajo al header de la plantilla "Confirm signup" (antes solo el wordmark "huella" en texto). Se generaron **2 variantes PNG** del escarabajo (export de `escarabajo-huella.svg` con `sharp`, **140×128 RGBA, fondo transparente**): `public/escarabajo-email.png` (**crema `#FAF6F1`**, para fondos oscuros/banda mocha; commit `eed17d8`) y `public/escarabajo-email-terracota.png` (**terracota `#E5743D`**, para fondo crema; commit `7fadc55`); ambas pusheadas y **verificadas vivas en prod** (200 image/png en `www.huella.lat/escarabajo-email.png` y `…-terracota.png`). La plantilla "Confirm signup" (fondo crema `#FAF6F1`) usa la **variante terracota**; se editó en el **dashboard de Supabase** (no en el repo): `<img>` del escarabajo arriba del wordmark, resto intacto (botón, `{{ .ConfirmationURL }}`, textos), guardado. **Nota:** el preview de Supabase muestra la imagen rota (no carga imágenes externas), pero la URL responde 200 y se ve bien en navegador → **verificación definitiva en vivo queda para el primer registro de un tester real** (no se gastaron correos de prueba). **Aprendizajes:** los correos HTML no renderizan SVG confiablemente → usar **PNG hosteado en huella.lat**; y el color del escarabajo depende del fondo (crema sobre mocha, terracota sobre crema). **ESTADO GENERAL: versión 3 sigue EN REVISIÓN por Google.** Antes hoy (21 jul, diagnóstico previo): **DIAGNÓSTICO DEL BUG DE CORREO DE CONFIRMACIÓN (sesión de solo diagnóstico, SIN cambios de código).** **Síntoma:** al registrarse con correo en huella.lat, la app muestra "Revisa tu correo" pero el correo de confirmación **no llega**. **Verificado EN VIVO que TODO lo de envío está BIEN (no es la causa):** SMTP custom activo y correcto (**Resend**, `smtp.resend.com` puerto **465**, sender `hola@huella.lat`, usuario `resend`), dominio `huella.lat` **VERIFIED** en Resend, plantilla **"Confirm sign up"** existe y correcta (asunto + cuerpo con `{{ .ConfirmationURL }}`), toggle **"Confirm email" ACTIVADO**, y **reset password SÍ funciona por el mismo Resend** (el envío en sí sirve). En Resend solo hay **2 envíos, ambos Bounced**, a correos falsos/inexistentes (`testuser123@gmail.com` y `danielundurraga.r+demo@huella.lat`); el registro de prueba con `d.undurraga@pacificschoolpichilemu.com` **NO generó ningún intento de envío** en Resend. **DIAGNÓSTICO DE CODE (flujo real revisado):** único camino de registro = `supabase.auth.signUp({email, password})` en `AuthContext.jsx:28` → **no hay `admin.createUser`, ni OTP, ni magic link; el código es correcto**. La UI (`SignupPage.jsx`) muestra "Revisa tu correo" con **cualquier respuesta sin error**, aunque Supabase no haya enviado nada. **NO se pasa `emailRedirectTo`** (esto NO es la causa; solo afectaría a dónde apunta el link, no al envío) → **la allowlist de Redirect URLs queda DESCARTADA como bloqueante.** **CAUSA MÁS PROBABLE (Causa A):** el email de prueba **YA EXISTÍA** en `auth.users`; con "Confirm email" activo, registrar un email ya existente hace que Supabase devuelva **éxito falso, sin error y sin enviar correo** (anti-enumeración) → explica todos los síntomas, incluido el demo del 15 jul. **PRUEBA DE 1 MINUTO QUE ZANJA TODO (próxima sesión):** registrarse en la app con un correo **100% NUEVO, real, nunca usado** en Huella (no `+alias`; **Daniel lo va a conseguir**) y revisar en Resend si aparece intento de envío a ese correo → si **APARECE** (Delivered o Bounced) el sistema funciona, **NO hay bug**, solo se había probado con correos ya usados → **cerrar como no-bug**; si **NO aparece** → es **Causa B** (config Supabase) y Code entra a arreglar. **Fix según causa:** Causa A = cambio **chico de UX** (manejar "email ya registrado": ofrecer reenviar la confirmación con `supabase.auth.resend` o mandar a login, en vez de mostrar "Revisa tu correo" a ciegas); Causa B = **arreglo en el dashboard de Supabase**. **OTRO CRÍTICO PRE-BETA AÚN ABIERTO (no tocado hoy):** buckets de Storage (`avatares`, `momentos`) **PÚBLICOS** → fotos de niños accesibles por URL sin login; requiere fix de código: **bucket privado + migrar 3 call-sites** (`onboardingPersistor.js:85`, `PerfilPage.jsx:167`, `HitosPage.jsx:742`) de `getPublicUrl` a `createSignedUrl`; diagnosticado, pendiente de aplicar. **ESTADO GENERAL: versión 3 sigue EN REVISIÓN por Google** (esperando aprobación para sacar el link de prueba cerrada y reclutar testers). Antes (viernes 18 julio 2026): **PRUEBA INTERNA DE PLAY — APP INSTALADA Y ABRE EN LA TABLET SAMSUNG:** tras publicar la prueba interna, la app **tardó en propagarse** (la ficha salía vacía un rato) y luego apareció disponible. La **descarga fallaba con "no se puede descargar"** → se resolvió **reiniciando la tablet Samsung**. La app se **instaló correctamente** en la tablet (cuenta `danielundurraga.r@gmail.com`) y **ABRE: Daniel está viendo la pantalla de Huella funcionando.** **QA de la TWA — ✅ CONFIRMADO en dispositivo real:** tras corregir el `assetlinks.json` y redeployar, se **reinstaló en la tablet Samsung** y la app **abre a PANTALLA COMPLETA, SIN barra de navegador** (login con Google OK, navegación sin problemas). **Aclaración importante:** ANTES del fix la app abría sin barra en la tablet **solo por caché de verificación**, no por verificación real (el `assetlinks.json` tenía placeholder); el QA válido es este, POST-fix y POST-reinstalación. **`assetlinks.json` CORREGIDO:** se reemplazó el placeholder `PENDIENTE_FINGERPRINT_BUBBLEWRAP` por los **dos fingerprints reales** — **Play App Signing** (`E2:FE:...:42:B4`, el que Google usa para firmar la app que instalan los testers) + **upload** (`44:CA:...:23:CF`, cubre sideload); commit `2c34af2`, **pusheado y verificado en vivo** en `https://www.huella.lat/.well-known/assetlinks.json`. **AAB REGENERADO con `versionCode 3`** (`versionName "1"`), firmado con la **misma keystore** (alias `huella`) — el versionCode subió porque Play no acepta reusar el 1 (ya consumido por la prueba interna) en otro track. **PRUEBA CERRADA (canal Alpha) ARMADA en Play Console:** **177 países (todos)**; testers gestionados por el **Grupo de Google `testers-huella@huella.lat`** (creado esta sesión); canal de comentarios `contacto@huella.lat`; **política de privacidad** `https://huella.lat/terminos#privacidad`; **edad objetivo 18+**; **categoría Estilo de vida**. **DECLARACIONES DE CONTENIDO COMPLETADAS:** *ID de publicidad = NO* (confirmado mirando el manifiesto EMPAQUETADO del AAB: **sin permiso `AD_ID` y sin SDKs de ads/analytics** — la única dependencia es `androidbrowserhelper`, la librería oficial de TWA). **VERSIÓN 3 ENVIADA A REVISIÓN el 18 jul → estado: EN REVISIÓN por Google.** **PENDIENTE INMEDIATO (no depende de Daniel):** esperar la **aprobación de Google** (horas a 2-3 días; **llega por correo a `danielundurraga.r@gmail.com`**). **OJO con el reloj de los 14 días: NO ha arrancado** — arranca cuando haya **12 testers instalados (opted-in)**, NO cuando Google apruebe. **SIGUIENTE GRAN PASO (cuando Google apruebe):** sacar el **link de opt-in de la prueba cerrada** desde Play Console (confirmar si sirve el de la interna o es uno nuevo); lanzar la **convocatoria** para juntar **~15 testers Android** (marca personal de Daniel; cubre los 12 con colchón) y una **segunda tanda para iOS** después. **Flujo del tester:** manda su Gmail → Daniel lo agrega al grupo `testers-huella@huella.lat` → recibe el link → instala desde Play → se registra con un código `HUELLA-XX` (Pro 45 días) → **mantiene 14 días**. **Adaptar el mensaje de convocatoria** (`huella-textos-beta.md` en el Drive) para incluir los pasos de opt-in/instalación desde Play. **CONFIRMACIÓN DEL SISTEMA DE CÓDIGOS BETA (diagnóstico de Code, sin cambios):** un código `HUELLA-XX` **desbloquea Pro completo por 45 días** (la RPC `canjear_codigo_beta` escribe `plan_beta_hasta = now() + 45 días`); **un solo uso, atómico**; **NO toca `plan`, ni rol, ni admin, ni ningún otro dato**; la tabla `codigos_beta` tiene RLS **sin policies** → acceso solo vía la RPC `security definer`. Antes (martes 15 julio 2026): **GOOGLE PLAY, CONTENIDO DE LA APP COMPLETO (11/11) + PÁGINA DE ELIMINACIÓN EN PRODUCCIÓN + CUENTA DEMO LISTA:** Los **11 cuestionarios de "Contenido de la app" quedaron COMPLETOS (11 de 11)** en Play Console: política de privacidad, datos de inicio de sesión, anuncios, clasificación de contenido, audiencia objetivo, seguridad de los datos, aplicaciones gubernamentales, funciones financieras, salud, categoría + datos de contacto, y ficha de Play Store. **Clasificación de contenido asignada:** apta para todas las edades (L / ESRB Para todos / PEGI 3 / USK 0 / +3). **Audiencia objetivo declarada:** solo **18+** (FUERA del programa "Diseñada para familias"). **Categoría de la tienda:** Estilo de vida; contacto público `contacto@huella.lat` + sitio `huella.lat`, **sin teléfono**; marketing externo activado. **Cuenta de desarrollador:** PERSONAL/individual (a nombre de Daniel, sin datos de empresa) → **aplica el requisito de Google de PRUEBA CERRADA con mínimo 12 testers durante 14 días ANTES de publicar en producción.** **CUENTA DEMO para el revisor de Google — CREADA:** email/contraseña `danielundurraga.r+demo@huella.lat` (subaddress del correo Workspace de Daniel); **se confirmó a mano por SQL (`email_confirmed_at`) porque el correo de confirmación NO llegó**; se le activó **Pro por SQL** (`perfiles.plan = 'pro'`, user_id `a196c7ff-92b2-48df-a36b-3babcabbc651`) para que el revisor vea las funciones de pago; tiene un hijo ficticio ("Mateo") creado vía onboarding; las credenciales quedaron cargadas en el formulario "Datos de inicio de sesión" de Play Console con instrucciones en inglés. **PÁGINA DE ELIMINACIÓN DE CUENTA (nueva, EN PRODUCCIÓN):** se creó `src/pages/legal/EliminarCuentaPage.jsx` con ruta pública `/eliminar-cuenta` (fuera de `ProtectedRoute`, registrada en `App.jsx`); **URL en producción `https://huella.lat/eliminar-cuenta`, VERIFICADA en incógnito** — es la URL entregada a Google en "Seguridad de los datos". Reutiliza `TerminosPage.module.css` **sin modificar Términos**, cero hex hardcodeado; la caja de contacto dice "Equipo de Huella" (sin nombre real, por privacidad); **unifica el plazo de borrado en 30 días** (resolviendo la contradicción 72h vs 30 días que tenía `/terminos`). Commit `449c1e7`, push hecho, **deploy Vercel OK**. **PRUEBA INTERNA DE PLAY — CREADA Y PUBLICADA (15 jul 2026, 13:59):** se subió el AAB **`app-release-bundle.aab`** (ruta `C:\Users\dundu\OneDrive\Desktop\huella-twa\app-release-bundle.aab`, build del 4 jul 2026, ~1 MB) al canal de **Prueba interna**. Versión **"1 (1)"**, **SDK objetivo 35**, estado **"Disponible para testers internos"**. Nombre temporal que ven los testers: **"lat.huella.app (unreviewed)"** (hasta que Google revise la app). Lista **"Testers internos"** creada con **1 correo** (`danielundurraga.r@gmail.com`, el Gmail de la **tablet Samsung Android** de Daniel), activada y guardada; **enlace de unión (web) copiado** para abrir en la tablet. **PENDIENTE INMEDIATO (Daniel, en casa):** abrir el enlace en la **tablet Samsung** (sesión `danielundurraga.r@gmail.com`), convertirse en tester, **instalar Huella desde Play Store** y verificar que la **TWA instalada funcione** (carga `huella.lat`, login OK, se ve bien) — puede tardar minutos/horas en aparecer disponible tras la publicación. **CONTEXTO DE DISPOSITIVOS:** Daniel usa **iPhone** como teléfono personal (no sirve para Android); su **único dispositivo Android es una tablet Samsung** → toda prueba/QA de la app Android se hace en esa tablet. **PENDIENTES PLAY (próxima sesión) → camino a PRODUCCIÓN:** (1) que Daniel **complete la instalación + QA en la tablet** (arriba); (2) **montar la PRUEBA CERRADA en Play Console + obtener el link real** — requisito confirmado por web (15 jul 2026) para cuenta **PERSONAL**: **mínimo 12 testers opted-in durante 14 días consecutivos** antes de solicitar producción (bajó de 20 a 12 desde dic 2024); **Google evalúa engagement real** (que los testers USEN la app), no solo el opt-in, y deben **instalar desde el link de Play Store, NO por APK sideload** (el sideload no cuenta). **Estrategia de reclutamiento (decidida por Daniel):** usar su **marca personal** para convocar mamás/papás activos; **los mismos testers serán la beta de producto** (se integra con el sistema de códigos `HUELLA-01..20` que da Pro dentro de la app); **apuntar a 20-30 inscritos** para colchón sobre el mínimo de 12. La **convocatoria + instructivo de opt-in** se redacta recién cuando exista el link real de la prueba cerrada. **NUEVOS PENDIENTES TÉCNICOS detectados hoy (no urgentes, para después de cerrar Play):** (a) **PRIVACIDAD — buckets de Supabase Storage `avatares` y `momentos` están `public=true`** (`schema.sql:164` y `:203`): son **fotos de menores accesibles por URL sin auth** → prioridad ALTA, cerrarlos a acceso autenticado (contradice el alma anti-vigilancia de Huella); (b) **ENTREGA DE CORREO — el correo de confirmación de registro** (Supabase Auth vía Resend SMTP) **NO llegó** al registrar la cuenta demo → riesgo real de que usuarios nuevos no puedan confirmar su cuenta; revisar config Resend/Supabase y probar entrega; (c) menor: `PerfilPage.jsx:193` aún muestra un Gmail personal en el mensaje de error de borrado de cuenta, en vez de `contacto@huella.lat`. Antes (martes 14 julio 2026): **GOOGLE PLAY, AVANCE GRANDE:** Play Console ahora FUNCIONA — el error *"Cuenta sin nombre"* era **exclusivo del celular**; se resolvió entrando a la app Play Console **desde una tablet Samsung** (el ticket con el agente "Gab" puede cerrarse). **App CREADA en Play Console:** nombre **Huella**, paquete `lat.huella.app`, **gratis**, español `es-419`. **Ficha de la store COMPLETADA y guardada:** título + descripción breve + descripción completa (redactados esta sesión), **icono 512×512** generado por Code (escarabajo crema `#FAF3EC` al 78% sobre terracota `#E56E26`, archivo `icono-play-512.png` en el Escritorio), **feature graphic 1024×500** (escarabajos de colores de la paleta) y **5 capturas de teléfono** (screenshots reales enmarcados por Claude Design; capturas de tablet/Chromebook/XR se saltaron, NO obligatorias). Para las capturas se poblaron **5 rasgos confirmados de demo** del hijo **"Mateo"** (renombrado desde Pascualito + foto cambiada, por privacidad) vía UPDATE SQL en Supabase, para que el retrato mostrara 5 de 12. **Cuestionario "Política de privacidad": COMPLETADO** (URL `https://huella.lat/terminos#privacidad`). **Cuestionario "Datos de inicio de sesión": EN CURSO** — se marcó que la app SÍ está restringida (requiere login); PENDIENTE crear una **cuenta demo LIMPIA (Gmail nuevo)** con datos ficticios para dar a Google como credenciales de revisión (distinta de `contacto@huella.lat`, que tiene episodios reales del hijo, y distinta de los 12 testers reales de la prueba cerrada). **REQUISITO CLAVE DE GOOGLE:** para publicar en producción exige una **PRUEBA CERRADA con mínimo 12 testers** que acepten, **durante ≥14 días**, ANTES de solicitar acceso a producción — el sistema de códigos `HUELLA-01..20` + Tally calza con esto. **CUESTIONARIOS DE PLAY PENDIENTES:** Datos de inicio de sesión (terminar con cuenta demo), Anuncios, Clasificación de contenido, Audiencia objetivo, Seguridad de los datos, Aplicaciones gubernamentales, Funciones financieras, Salud, categoría + datos de contacto; además subir el AAB y configurar la prueba cerrada. **TRES FIXES en producción y verificados esta sesión:** (1) bug de **contacto físico en desborde** RESUELTO (commit `32c9a3d`: sección `CONTACTO FÍSICO EN DESBORDE` en el `SYSTEM_PROMPT` de `api/anthropic.js`, regla por edad; las dos funciones ahora coinciden); (2) **correo de soporte** `hola@huella.app` → `contacto@huella.lat` en `InvitarPage.jsx` (2 lugares) y `PerfilPage.jsx` (1), commit `6676f44` (`assetlinks.json` NO tocado: ahí `lat.huella.app` es el packageId Android); (3) **avatar deformado del Home** RESUELTO con `aspect-ratio: 1` en `.profileImg` de `hero.module.css`, commit `bc779f9`, verificado redondo en prod. **PENDIENTES NUEVOS (no urgentes):** (a) estrategias/orientaciones viejas conservan "Pascualito" fijo en la BD (`orientacion_ia` y textos de IA generados antes del rename; solo data vieja de demo); (b) la app muestra **citas textuales entre comillas atribuidas a autores reales** (ej. "Nombrar para dominar" a Daniel Siegel) en Acción Rápida — riesgo de atribución si no son textuales, revisar; (c) la tarjeta del Home "El retrato de Mateo está creciendo / necesita unos momentos más" sigue casi-vacía aunque el retrato ya tiene 5 rasgos — revisar lógica. Antes (domingo 6 julio 2026): **PUSH ENCENDIDAS Y VERIFICADAS END-TO-END (Web Push/VAPID):** a Daniel le llegó la notificación "Prueba de Huella" a su **iPhone real** (PWA instalada). Pipeline completo funcionando: env VAPID (`VAPID_PUBLIC/PRIVATE/EMAIL`) + `CRON_SECRET` confirmadas en Vercel; suscripción del cliente OK; `webpush.sendNotification` entrega. **Copy de re-enganche del cron reescrito SIN culpa** (fuera el "llevas X días sin registrar"; ahora título "¿Cómo ha estado {hijo}?" / cuerpo "Un momento de hoy suma a su huella"). Servicio muerto `pushNotifications.js` borrado. **Fix de columnas:** la tabla real `push_subscriptions` NO tiene `id` (schema.sql desfasado) → el SELECT de `push-test`/`push-remind` se corrigió a `endpoint, p256dh, auth` y limpia por `endpoint`. **Control permanente de Notificaciones en `CuentaPage` IMPLEMENTADO y VERIFICADO en el iPhone de Daniel** (línea verde "Notificaciones activadas" en `/cuenta` desde la PWA; commit `8dc1b22`): sección nueva que reutiliza `usePushNotifications` (sin duplicar lógica), cubre los 4 estados (default con botón "Activar notificaciones" / activadas / bloqueadas / no soportado), y **desacopla activar push del `NotifBanner` efímero** (cuya X descarta para siempre) → **la deuda del banner queda RESUELTA.** Commits push del día: `5426700`, `ca544ae`, `28b7032`, `8dc1b22`. **FIX DE VOSEO (commit `178693b`):** el bug "decile" venía de las formas **enclíticas** (verbo + pronombre pegado) que ninguna lista prohibía (solo se vetaban las desnudas: decí, hacé). Se creó `REGLA_IDIOMA` canónica en el cliente + copia reforzada en el `SYSTEM_PROMPT` del backend, con enclíticos explícitos (decile/contale/dale) + modismos (che, boludo) + español de España (vale, vosotros). Cubre los 6 prompts con regla propia (Acción Rápida, cierre de ciclo, ciclo N, primer encuentro, detectar patrones, detectar rasgos) y todos los que heredan el system default. **QA pendiente:** Daniel lo verificará en su próximo registro real. **UNIFICACIÓN VISUAL DEL ESCARABAJO (commits `f732654`, `b579279`, `847133b`):** contenedores unificados al **cuadrado redondeado estándar** (radius 10, icono 90%) en `anticipoBicho`/Home, `PropuestaRasgo` y `PuertaUnoLoading`; las dos cajas del Home igualadas a **52×52** (`CTAAskHuella` subió de 40 a 52). **Excepción documentada:** el medallón del retrato (`RetratoSendero`) sigue circular a propósito (lleva foto + aro). **Pospuesto:** `GuiaPrimerosPasos` + `AnalisisIA` (decisiones de tamaño abiertas), Puerta 1 (#9/#10/#11 → pasada de Design Estrategias Fase 5), y la **deuda del `viewBox` asimétrico** de `Escarabajo.jsx` (~6px izq / ~4px arriba descentran la tinta; corregirlo re-escala las 18 instancias + re-calibrar % → sesión propia). **RESET DEL HISTORIAL DE PASCUALITO** completado por Daniel en Supabase (9 tablas del inventario + 13 episodios y 9 hitos huérfanos con `hijo_id` null), todo verificado en 0; **perfil del hijo intacto**, Storage `momentos` limpiado. Incidente menor: se borró por error el **avatar del hijo** (bucket `avatares`) → Daniel lo re-sube, sin pérdida real. **La app queda en uso orgánico real desde hoy** (relevante para leer las métricas de retención del propio Daniel como proto-tester). **FICHA PLAY STORE:** doc `huella-ficha-play-store.md` creado (textos + cuestionarios + checklist de publicación; vive en el Drive junto a los docs de beta). Pendiente de esa ficha: **feature graphic 1024×500** (brief a Claude Design) + **capturas de pantalla**. **DEUDAS de esta sesión (detalle en PENDIENTES → Notificaciones push):** (1) `api/push-test.js` es TEMPORAL → **eliminar antes de la beta** (endpoint de prueba con secreto en la URL); (2) **rotar `CRON_SECRET` de nuevo** en Vercel + redeploy (su valor nuevo quedó expuesto en el chat); (3) **control permanente de Notificaciones en Cuenta: RESUELTO** (commit `8dc1b22`, verificado en iPhone); (4) `NotifBanner` se ve feo (Design); (5) título de la push muestra "from Huella" (default del sistema), limpiar al afinar textos. **INCIDENTE resuelto:** Daniel pisó por error `VITE_SUPABASE_URL` en Vercel (producción cayó unos minutos); restaurada a `https://igwzepnzpibzrbbkwkbb.supabase.co` + redeploy; verificado en vivo (home 200, el bundle apunta al Supabase correcto sin rastro del valor pisado, login OK). Antes (domingo 6 julio 2026): **ANDROID/TWA — ETAPA 4 EN CURSO · CUENTA GOOGLE PLAY CREADA (4 jul 2026):** cuenta tipo PERSONAL, contacto `contacto@huella.lat`, nombre de desarrollador "Huella", ID de cuenta `9107581164759486665`, US$25 pagados, perfil de pagos a nombre de Daniel (individual, Chile). **Bloquean el botón "Crear aplicación" tres verificaciones DE GOOGLE:** (1) **identidad** — documentos ENVIADOS 4 jul, en revisión (puede tomar días; resultado por correo a `contacto@huella.lat`); (2) **acceso a dispositivo Android** — pendiente de Daniel: pedir un Android prestado, instalar la app Google Play Console e iniciar sesión con `contacto@huella.lat` (5 min, no vincula el teléfono); (3) **teléfono de contacto** — se desbloquea solo tras aprobarse la identidad. **PRÓXIMA SESIÓN (cuando pasen las verificaciones):** crear la app (nombre Huella, español, tipo Aplicación, GRATIS — irreversible y correcto porque Pro se cobra vía web/Mercado Pago), ficha de la store (textos + capturas), subir `app-release-bundle.aab`, copiar el SHA-256 de Play App Signing al `assetlinks.json` (reemplaza el placeholder) + redeploy, y enviar a revisión. **Respaldo de keystore + contraseña en Drive (carpeta "Huella - Llaves Android"): HECHO y verificado (3 jul).** Antes (viernes 3 julio 2026): **ANDROID/TWA — ETAPA 3 CERRADA (`bubblewrap build` exitoso):** Daniel generó en `huella-twa` los dos artefactos: `app-release-signed.apk` (para QA en teléfono) y `app-release-bundle.aab` (lo que se sube a Play Console). Incidencias resueltas en el camino: (a) la 1ª corrida falló por corte de red bajando Gradle (Connection reset) → reintento y pasó; (b) la contraseña de la Key no cuadraba con lo anotado → con `keytool -list` se vio que el keystore usa la **misma** contraseña para Store y Key (Daniel ya corrigió su registro externo). SHA-256 del keystore **local** (solo referencia/testeo, **NO** va al assetlinks): `44:CA:BB:01:F5:BE:0C:A8:09:04:B8:7C:25:4D:AB:14:83:DB:9D:ED:B1:1D:1E:4E:F9:77:54:51:2E:31:23:CF`. **QA en teléfono PENDIENTE:** Daniel no tiene Android → se hará con testers internos de Play Console una vez subida (mejor QA real de instalación desde la store). **Etapa 4 EN CURSO — próximo paso inmediato de la próxima sesión:** Daniel crea la cuenta Google Play (`play.google.com/console/signup`, US$25 única vez, tipo **PERSONAL** decidido — no organización) + posible verificación de identidad de Google (horas a días); luego crear la ficha de la app, subir el `.aab`, copiar el SHA-256 de **Play App Signing** (App Integrity en Play Console, **NO** el local) al `assetlinks.json` reemplazando `PENDIENTE_FINGERPRINT_BUBBLEWRAP` + redeploy. **La barra de navegador visible en la TWA es esperada hasta ese reemplazo.** Recordatorio: verificar al abrir la próxima sesión que el respaldo de `android.keystore` + contraseña esté hecho en el Drive de Daniel (carpeta "Huella - Llaves Android"). Detalle en PENDIENTES → App stores. Antes (jueves 2 julio 2026): **ANDROID/TWA EN EJECUCIÓN (Bubblewrap):** se decidió ir por **TWA (Bubblewrap), NO Capacitor** — la TWA carga `www.huella.lat` en su mismo origen, así que los 5 `fetch` relativos `/api/*` funcionan tal cual y el paso de URL absolutas + CORS queda **descartado para Android**. **Etapa 1 CERRADA** (fuentes self-hosted, commit `ce7b2ee`; **Lighthouse prod móvil 89**, umbral 80 superado; se descartó el falso culpable `PDFSection` —ya era lazy, no estaba en la ruta crítica— el fix real fue solo eliminar el render-blocking de Google Fonts). **Etapa 2 CERRADA** (`assetlinks.json` con fingerprint placeholder + excepción `/.well-known/` en `vercel.json`, commit `8933fea`; verificado en vivo: 200 + `application/json` en `www.huella.lat`). **Etapa 3 EN CURSO:** `bubblewrap init` hecho (proyecto Android + keystore alias `huella`, packageId `lat.huella.app`, host `www.huella.lat`, portrait, en carpeta hermana FUERA del repo); **próximo paso inmediato: Daniel corre `bubblewrap build` en su terminal y prueba el APK en un teléfono**. Detalle en PENDIENTES → App stores. Antes (miércoles 1 julio 2026): **DECISIÓN DE LANZAMIENTO: la beta ESPERA a tener Android publicado en Play Store antes de invitar testers** — razón: instalación más simple (Android se baja de la store directo; solo el iPhone hace el paso manual de PWA). Esto convierte la **ejecución de Android/TWA en EL bloqueante de la beta** (próxima sesión ejecuta; detalle en PENDIENTES → App stores). La beta queda **lista en producto/textos/infra, en espera de Android en Play Store por decisión de instalación**. Antes (martes 30 junio 2026): **SISTEMA DE CÓDIGOS DE INVITACIÓN DE UN SOLO USO: COMPLETO y verificado en producción** (commit `75e5428`). Motor en Supabase: tabla `codigos_beta` (RLS activa sin policies, solo accesible vía RPC), RPC `canjear_codigo_beta` `security definer` con `set search_path`, canje **atómico** (imposible usar un código dos veces), 20 códigos `HUELLA-01..20` cargados; migración `007_codigos_beta.sql` en el repo. UI compartida `CanjeCodigoBeta.jsx` (lógica en el contexto: `canjearCodigoBeta`) en Home (`PanelPage`) y Cuenta (`CuentaPage`), **visible solo para no-Pro**, se auto-esconde evaluando el éxito primero para que la confirmación en verde persista aunque `isPro()` pase a true en el instante. Verificado end-to-end: canje OK **activa Pro al instante** (vía `reloadData`), código inválido y ya usado rechazados (el "ya usado" sigue rechazando incluso tras bajar la cuenta a básica), `usado_por`/`usado_en` marcados; downgrade a básica funciona (`plan_beta_hasta = null`). **`HUELLA-01` gastado en QA → quedan `HUELLA-02..20` (19 códigos) para repartir; ya no hace falta SQL tester por tester.** Antes (lunes 29 junio 2026): **BETA LISTA PARA INVITAR AL CÍRCULO CERCANO. Bug del onboarding RESUELTO + PWA con nombre limpio en iOS + corrección de registro del formulario de Tally + FIX DE SEGURIDAD de permisos en `perfiles`.** **FIX DE SEGURIDAD (cambio de BD, sin commit):** se cerró un hueco por el que **cualquier usuario autenticado podía auto-otorgarse Pro** escribiendo `perfiles.plan_beta_hasta`/`plan` directo desde el cliente — la RLS protege por **fila, no por columna**, y la policy `own_data` `FOR ALL` dejaba escribir cualquier columna. Auditoría contra la base viva: `anon` también tenía ese UPDATE, y ambos roles tenían **DELETE y TRUNCATE** (TRUNCATE era el riesgo mayor: **no contenido por RLS** → podía vaciar toda la tabla). Fix con **column-grants**: `authenticated` ahora escribe **solo** `user_id/nombre/intenciones/contexto_inicial` (NO `plan`/`plan_beta_hasta`), `anon` sin escritura, sin DELETE/TRUNCATE. **Pagos (service_role) y onboarding intactos; verificado que cambiar el nombre del padre sigue guardando.** Único camino a Pro ahora: backend (pago) o RPC `security definer`. **Sistema de códigos de invitación de un solo uso: se planificó aquí y se CONSTRUYÓ al día siguiente (30 jun, ver arriba)** (tabla `codigos_beta` + RPC atómica `canjear_codigo_beta` + UI en Cuenta/Home, pase de 45 días, NO compuerta en onboarding); **el fix de permisos era su prerrequisito y ya estaba hecho.** Ajuste final: **20 códigos** `HUELLA-01..20` (no 30). **Bug del onboarding RESUELTO y verificado en producción** (commit `df5ddaa`, solo `HuellaContext.jsx` + `Layout.jsx`): el onboarding (los 5 slides) reaparecía en CADA apertura de la PWA en iOS. Causa raíz: el flag de "completado" vivía solo en `localStorage`, frágil ante la eviction de iOS (~7 días sin uso) y reinstalar la PWA; y la lógica **nunca miraba si el usuario ya tenía datos de cuenta**. Arreglo robusto (opción B): la **fuente de verdad pasa a ser la cuenta** — `state.hijos.length > 0` (el onboarding siempre crea un hijo) **o** `padreNombre` poblado → si ya tiene cuenta, **nunca** ve el onboarding aunque se borre el storage; un usuario nuevo sin datos lo ve **una vez**. Para evitar el flash mientras carga, se agregó el flag **`dataLoaded`** en `HuellaContext` (distingue "aún no cargué" de "cargué y no hay datos"; el gate decide solo después). Se **eliminó el `localStorage` del flujo** (sin señal muerta) y un latch local cierra al instante al completar/saltar. **Blinda contra re-escritura: imposible que alguien con hijo creado vuelva a entrar al onboarding.** Verificado en prod en el iPhone de Daniel. **PWA — nombre limpio en iOS** (commit `0d05416`): se agregó `<meta name="apple-mobile-web-app-title" content="Huella">` para que al instalar en iPhone el nombre bajo el ícono salga **"Huella"** y no el `<title>` largo. **Corrección de registro:** el formulario de inscripción de Tally **ya estaba publicado** (`tally.so/r/KYO4EM`) desde el 21 junio; se corrigió la contradicción en PRIORIDAD INMEDIATA que lo listaba como pendiente (commit `4247aa8`). **ESTADO DE LA BETA: lista para invitar al círculo cercano** — formulario verificado (7 preguntas + link de términos correcto), guía operativa completa (`huella-guia-beta.md`: flujo, SQL del pase Pro con `SELECT` antes del `UPDATE`, métricas, checklist), PWA instalable con nombre limpio, onboarding arreglado; el mensaje de WhatsApp con instrucciones de instalación (iPhone Safari + Android Chrome) queda listo para usar. Antes (domingo 28 junio 2026): **FASE 2 del gancho ("la revelación incompleta") COMPLETA de punta a punta y en producción (Capas 1, 2 y 3).** La app detecta los patrones emergentes (Capa 1, commit `22a392d`), los persiste y gradúa a `candidato` al 3er momento (Capa 2, commits `f397479` + `012e2ab` + `f07f9f3`) y muestra la pista honesta en el Home sin revelar contenido (Capa 3, commits `c74ad31` + `829f427`). Detalle de Capa 1: `detectarRasgos` (`src/services/anthropic.js`) ahora también captura los patrones emergentes de 1-2 momentos que antes botaba — se bajó el umbral del prompt `PROMPT_DETECTAR_RASGOS` de 3 a 1 momento y se reemplazó el filtro `< 3` por clasificación vía flag **`esEmergente`** (1-2 momentos = emergente, 3+ = candidato), con el corte de familia y de confianza **intacto** y descartando solo evidencia 0 (ruido); el CHECK de la tabla `rasgos` se migró a 4 estados (`candidato`/`confirmado`/`descartado`/`emergente`), corrido y verificado contra la base viva. Decisión registrada: la clasificación emergente vs candidato la hace el **código por conteo de evidencia**, no el modelo por etiqueta (el shape que devuelve el modelo no cambió). Validado con QA de datos reales (Pascualito, **71 episodios + 30 hitos** exportados por SQL, vía runner temporal que invoca el **handler real de producción** con el system prompt clínico): **6 candidatos / 3 emergentes, todos patrones reales sin ruido** (separación con 5 momentos y autorregulación con 7 como candidatos sólidos → el motor cuenta bien la evidencia, sin sub-conteo). **Los emergentes hoy se DETECTAN pero NO se guardan ni se muestran: la app no cambia visiblemente todavía.** Pendiente próxima sesión: **Capa 2** (graduar emergente → candidato al 3er momento; UPDATE no INSERT; toca `guardarRasgosDetectados`, arrancar por el diagnóstico del dedup) y **Capa 3** (pista honesta en Home/retrato, sin revelar contenido). Nota para la Fase B del prompt (no para ahora): `detectarRasgos` analiza solo los **40 momentos más recientes** (`slice(0,20)` episodios + `slice(0,20)` hitos), idéntico a producción → los rasgos tiran a lo reciente; queda anotado para la auditoría de prompt, no es bug. Antes (domingo 21 junio 2026): **Bienvenida del usuario nuevo: rediseño CERRADO y VERIFICADO en producción** (commits `61784f2` + `c2340d0`): el QA visual quedó confirmado en prod (paso 1 con su check, el **escarabajo móvil salta al paso 2** al registrar un momento). Se había eliminado el `BienvenidaModal` redundante (antes el usuario nuevo veía el mismo mensaje 3 veces) y rediseñado `GuiaPrimerosPasos` (tarjeta blanca + barra de progreso + el **escarabajo marca el paso actual y se mueve** al avanzar); el flujo es Onboarding (5 slides) → Home con la guía, sin modal intermedio. **BETA — decisiones de esta sesión:** objetivo = validar tres dimensiones con jerarquía (**retención** como métrica principal y conductual: registran ≥1 momento en las primeras 48h y vuelven a registrar en una segunda semana, leído como "X de Y vuelven" con N chico; **calidad de la guía IA** secundaria, conductual + cualitativo; **disposición a pagar** secundaria por **encuesta de salida**, no por conversión real, porque se regala Pro a todos los testers). Reclutamiento de **10-15 testers** (círculo cercano + desconocidos reales, etiquetando el origen para pesar distinto el feedback). Orden de ataque restante: (a) mecánica para regalar Pro [build, no existe hoy], (b) formularios + términos + canal de feedback, (c) métricas/observabilidad. **PASE DE BETA — CONSTRUIDO y VERIFICADO en producción** (commit `843827b`): mecánica para regalar Pro sin pago vía la columna `plan_beta_hasta` (timestamptz) en `perfiles`; `isPro()` en `HuellaContext` devuelve `true` también si esa fecha es futura, en **carril aislado** de Mercado Pago (MP solo lee/escribe `plan`). Vence solo (sin cron) y el QA en prod pasó en ambas direcciones (fecha futura → "Pro Activo"; fecha pasada → "Plan Gratuito"). **Deuda registrada:** `schema.sql` está desfasado de la base real (faltan `plan`, `contexto_inicial`, `intenciones` y `plan_beta_hasta` en `perfiles`) → sincronizar en una pasada. **INFRAESTRUCTURA DE LA BETA — textos LISTOS, montaje pendiente:** las 3 piezas (formulario de inscripción de 7 preguntas, términos de beta, encuesta de salida con el precio real) quedaron definidas; el formulario se montará en **Tally** (no Google Forms) y el canal de feedback será **pasivo** (formulario abierto + correo oficial, NO grupo de WhatsApp, para no inflar la retención). **Verificación legal OK:** la app tiene una sola página legal `/terminos` que combina Términos + Privacidad (Parte 2 en `#privacidad`), consistente con lo que promete la beta (no vende datos, no publicidad, solo Supabase/Anthropic/Vercel, sección de menores bajo Ley 19.628). **Correo oficial — BUZÓN OPERATIVO:** se **descartó Zoho gratis** (su UI precargaba "www" en el dominio sin dejar corregirlo y no integra con Gmail) y se eligió **Google Workspace** (~CLP 15.150/mes, prueba 14 días) como upgrade de la cuenta Google personal existente. El buzón `contacto@huella.lat` **recibe y envía** (QA pasado); MX automáticos vía Entri Connect Google↔Vercel, sin tocar Resend en `send.huella.lat`. **Pendiente:** la bandeja quedó **compartida con la cuenta personal** (se creó vía "Upgrade this account") → separar (cuenta nueva o perfil de Chrome aparte) en otra sesión. **BETA LISTA PARA INVITAR:** **mensaje de invitación CERRADO** (una sola versión cercana: "Soy Daniel, fundador de Huella" + pitch breve + "funciona así"/ejemplo de la pataleta + núcleo de unicidad "mientras más registras, más se afina a tu hijo, no consejos de manual"; texto final en `huella-textos-beta.md`). **Placeholders RESUELTOS:** precio Pro `CLP 9.990/mes` y `CLP 99.900/anual` (confirmado en `api/mp-crear-suscripcion.js`, mostrado en `UpgradeModal`/`CuentaPage`); correo oficial `contacto@huella.lat`; link privacidad `huella.lat/terminos#privacidad`. **Política de privacidad:** el correo del responsable se cambió de gmail personal a `contacto@huella.lat` (constante `CONTACTO` en `TerminosPage.jsx`, 5 apariciones; queda una más fuera de la legal en `PerfilPage.jsx:193`). **Métricas DECIDIDAS (enfoque manual, sin panel, ok para 10-15 testers):** consulta SQL sobre `episodios` por la columna `fecha` (NO `created_at`), cruzando `auth.users.email` con `perfiles`; entrega por tester `entro_el`, `total_registros`, `registros_primeras_48h`, `registros_2da_semana` (métrica reina), `ultimo_registro` y `pase_activo`; filtra `plan_beta_hasta` no nulo; guardada para cuando haya testers reales. **Documentos de la beta CREADOS** (fuera del repo, Drive de Daniel): `huella-textos-beta.md` (los 4 textos sin placeholders) y `huella-guia-beta.md` (manual operativo: objetivo, recorrido del tester, a quién invitar, reglas de WhatsApp invitar-y-no-empujar, activar pase Pro con `SELECT` antes del `UPDATE`, la consulta de métricas con cómo leerla, cierre, checklist). **PRÓXIMO TEMA GRANDE (sesión aparte): "gancho de dopamina"/retorno** — Daniel percibe que la app, siendo hermosa y profunda, puede sentirse plana frente a apps que hacen volver; su intuición es que NO es una recompensa encima sino algo **ESTRUCTURAL** del producto (el flujo, qué pasa después de registrar, qué motiva a volver); abordar como rediseño de producto, conecta con la métrica reina (retención). Pendientes sin avanzar: el `NotifBanner` (¿push real o solo UI?) y la consent screen de Google OAuth (decidir dominio propio en Supabase ~US$10/mes vs. esperar la verificación lenta de Google). **Etapa 4 del logo CERRADA: siembra del escarabajo en momentos clave de la app.** Se creó el componente único `Escarabajo.jsx` (SVG inline, `currentColor`) y reemplazó TODAS las "h" de marca (Home: análisis + CTA; loaders con latido `LoadingDignificado` + `PuertaUnoLoading`; Historial: `OrientacionIA`, `EpisodioCard`, `AccionRapida`; Puerta 1: `PuertaUnoHallazgo` + `PuertaUnoEmpty`; y `RespuestaIA`: loader latiendo + header estático, sacando el `Sparkles`). Estándar: 90% en cuadrados, 78% en círculos, radius 10px, color por `currentColor`. Commits `ac655ea`…`f9be672`, verificado en prod. **PWA afinada y VERIFICADA** (instalada en iPhone, abre en standalone; commit `c9ef1dd`): `theme_color` mocha `#9B7B6A` + `background_color` crema `#FAF3EC`. **Con esto el FRENTE DEL LOGO (etapas 1, 2, 3 y 4) + la PWA quedan COMPLETOS.** **Decisión: NO app stores** por ahora (comisión Apple vs. Mercado Pago), se mantiene PWA. **PENDIENTE prioritario pre-beta:** la pantalla de consentimiento de Google OAuth muestra el subdominio crudo de Supabase (`igwzepnzpibzrbbkwkbb.supabase.co`) — se arregla por CONFIG (Google Cloud OAuth consent + dominio propio en Supabase), no por código. Antes (martes 17 junio): **Reemplazo del dibujo del logo completo: CERRADO y verificado en producción** (commit `f7ad2b6`): se cambió el `<svg>` inline de `Logo.jsx` (nuevo `viewBox` + paths) conservando firma, props y `currentColor`, sin tocar CSS; se ve bien en header (mocha) y en las 5 públicas (terracota), sin problemas de ancho. **Etapa 3 del logo CERRADA** (commit `5b7d1fa`, verificada en prod): favicon (`.ico` + `.svg`) + `apple-touch-icon` + íconos PWA 192/512 con el escarabajo crema sobre terracota, conectados en `index.html`. **Con esto el FRENTE DEL LOGO (etapas 1, 2 y 3) queda COMPLETO.** Próximo: **etapa 4** (sembrar el escarabajo solo dentro de la app — avatares "h" del feed de análisis + latido de los loaders; arranca con auditoría de dónde aparece hoy la "h"). Además, diagnósticos de solo lectura: (1) **Logo en Términos:** el código está correcto (el `<Logo>` está en su lugar y pusheado en `92bc516`); si en producción se ve "huella" en texto es **caché del navegador / deploy sin propagar**, no un bug — hard refresh / incógnita lo resuelve. (2) **Reconocimiento del loader de carga** (cita + skeletons = componente `CitaLoader`, reutilizado en 4 loaders) para agregar el escarabajo "cargando" — **DECISIÓN PENDIENTE:** ponerlo en `CitaLoader` (los 4 loaders) vs. solo en el full-screen de `ProtectedRoute` (sin header, sin redundancia). Antes (lunes 15 junio): **Logo de marca: etapas 1 y 2 cerradas (header + 5 públicas), falta solo la etapa 3 (favicon con `logo_2`)** (commits `6252841` + `ffdee32` + `92bc516`): el texto "huella" se reemplazó por el componente `Logo.jsx` (SVG inline, `currentColor`) + token estable `--color-on-mocha`; el wordmark del Home (`Hero.jsx`) queda como texto a propósito, para no duplicar el escarabajo del header. **Onboarding: dos arreglos al cierre del flujo** (commits `61629cd` + `90c76cc`): el Home ahora recarga tras completar el onboarding (saluda con tu nombre y el del hijo sin refresh, VERIFICADO) y, si el guardado falla, ya NO marca completado — avisa y deja reintentar (QA del camino de fallo PENDIENTE). **Auditoría del flujo de entrada del usuario nuevo** (pre-beta): correo de confirmación verificado OK; pendientes la guía de inicio, el dominio crudo de Supabase en el login con Google, y que el onboarding está atado al `localStorage` y no a la cuenta. **Recuperación de contraseña CERRADA y verificada en producción.** Se conectó **Resend como servidor SMTP custom de Supabase Auth** (sender `hola@huella.lat`, nombre "Huella") y se verificó end-to-end el flujo de "¿Olvidaste tu contraseña?": el correo llega instantáneo desde `Huella <hola@huella.lat>` a la bandeja de entrada (no spam), el link abre la pantalla de clave nueva, el cambio de clave y el re-login funcionan. **El flujo ya existía en código; no se tocó código** (todo fue configuración en los dashboards de Resend y Supabase). **Bloqueante de beta resuelto.** Beneficio colateral: TODOS los correos de Supabase Auth (confirmación de cuenta, invitación de pareja, cambio de email) salen ahora por Resend desde el dominio verificado, sin el límite de 2 correos/hora del servicio por defecto. **Álbum/fotos compartidas: INVESTIGADO y DESCARTADO como bug** (solo lectura, no se tocó código) — las 13 fotos se ven idénticas en ambas cuentas; era latencia normal de carga, no pérdida de datos ni problema de compartición. Antes (domingo 14 junio): Seguridad de llaves Supabase **COMPLETADA y cerrada**: legacy JWT APAGADAS + `sb_secret` expuesta ROTADA. Las DOS llaves que pasaron por el chat (service_role legacy del 10 jun y `sb_secret` del 11 jun) están MUERTAS; app y endpoints verificados OK post-cambios. Historial monetización (jueves 11 junio): **Paso 3 (red de seguridad del pago) CONSTRUIDO, DESPLEGADO y VERIFICADO en producción** (commits `e3233d0` + fix `56fca1e`). Al volver del checkout a `/cuenta?suscripcion=ok`, la app consulta a MP el estado real de la suscripción (`GET /preapproval/search` por `external_reference` + `status=authorized`) con reintentos 0/2s/4s y activa `plan='pro'` por backend (upsert service-role idempotente), como respaldo del webhook. **Condición #1 de la REGLA CRÍTICA: CUMPLIDA** (red de seguridad verificada en su camino "aún no confirmado"). Falta la **condición #2**: primer pago REAL de punta a punta. Sesiones previas: Paso 2 (webhook) verificado por API + fix de upsert (10 junio); Paso 1 validado en producción (9 junio); rediseño "Refugio" del flujo Registrar (8 junio).*

> El histórico de sesiones anteriores (3292 líneas) quedó congelado en `git HEAD`. Si en alguna próxima sesión necesitas recuperarlo:
> ```
> git show HEAD~1:ESTADO.md > ESTADO.historico.md
> ```
> (Ajusta `HEAD~1` al commit donde aún vivía el archivo grande si ya se hicieron commits intermedios.)

---

## PENDIENTES (cola viva)

*Única fuente de pendientes del proyecto. **Regla de proceso:** al cerrar cada sesión, lo que quede diferido ENTRA aquí; lo que se complete SALE. Formato por línea: **qué** — desde cuándo — por qué se difirió.*

**Técnico / costos**
- ✅ **PRIVACIDAD — buckets de Storage públicos — RESUELTO COMPLETO Y VERIFICADO EN PRODUCCIÓN (21 jul 2026).** Los buckets `avatares` y `momentos` pasaron a **privados** con lectura por **URLs firmadas** (`createSignedUrls`, TTL 2h). **Fase 1** (código, commit `0637db1` desplegado, bundle `index-Cj3wiJbB.js`): los 5 write-sites guardan el PATH y `HuellaContext` firma al leer, tolerante a formato viejo. **Fase 2** (backfill): 6 filas de URL http → path limpio (`user_id/archivo.jpg`), verificado por SELECT. **Fase 3** (cierre): se eliminaron las SELECT `to public` (`"Avatar public read"` / `"Momentos public read"`) y se crearon `avatares_select` / `momentos_select` SELECT `to authenticated` con `get_family_user_ids` (cubre modo pareja); flip a `public = false`. **QA final en prod con bucket privado: todas las fotos cargan** (avatar, Logros, Historial). Detalle del proceso en el bloque de sesión del 21 jul (arriba). **Lección de secuencia:** deploy del código ANTES del backfill (en esta sesión se hizo al revés por error y rompió fotos temporalmente).
- ✅ **STORAGE — policies de ESCRITURA endurecidas y verificadas en producción — RESUELTO (22 jul 2026).** Se eliminaron las **6 policies abiertas** (`"Avatar upload"`/`update`/`delete` y `"Momentos upload"`/`update`/`delete`), que **solo validaban `bucket_id`** y no exigían que el usuario escribiera dentro de su propia carpeta. Se crearon `avatares_insert`/`avatares_update`/`avatares_delete` y `momentos_insert`/`momentos_update`/`momentos_delete`, todas con **`(storage.foldername(name))[1] = auth.uid()::text`** — en `with check` para INSERT/UPDATE y en `using` para DELETE. Las **policies SELECT del 21 jul (con `get_family_user_ids`) quedaron intactas**. Modelo final: **escribir en carpeta propia, leer en familia** (el modo pareja vive en la lectura, porque los 5 write-sites construyen el path con el `user_id` del que sube). **HALLAZGO: el DELETE también estaba abierto**, no solo el INSERT como se había diagnosticado el 21 jul. **QA en producción OK:** reemplazo de avatar existente (camino `upsert` → UPDATE) y momento nuevo con foto; ambos se ven en Historial y Logros.
- ✅ **ENTREGA DE CORREO — confirmación de registro: NO ERA BUG, CERRADO (21 jul 2026).** Se probó con un correo nuevo real (`igna.collab@gmail.com`) y **el correo SÍ llegó y se vio bien**. El síntoma original (demo del 15 jul sin correo) era **Causa A**: se registraba con correos **ya existentes** en `auth.users` → Supabase no reenvía la confirmación (anti-enumeración) y devuelve éxito falso, sin error. El envío en sí (Resend SMTP, sender `hola@huella.lat`, dominio VERIFIED) funciona. **Mejora de marca — HECHO (21 jul 2026):** se agregó el escarabajo (PNG **terracota** hosteado, `escarabajo-email-terracota.png`) al header de "Confirm signup" en el dashboard de Supabase; también quedó la variante crema (`escarabajo-email.png`). Detalle en el bloque de sesión del 21 jul (arriba). **Verificación en vivo pendiente del primer registro de un tester real.**
- **Fase 2 del prompt caching** — mover `marcoEdad`+`TEMAS_CONTEMPORANEOS` (~5.300 tok) al `system` como 2º breakpoint — desde **2 jun 2026** (`COSTOS_IA.md`); requiere cambiar el contrato cliente↔backend (2 archivos, ~9 funciones + helper + handler). **DIAGNOSTICADO (10 jul 2026):** a escala actual (20 testers × 10 episodios/mes) el gasto es **~$8/mes** y Fase 2 lo bajaría a **~$5/mes** (ahorro **~$3/mes**; el output a $15/M domina y no cambia). **DECISIÓN: NO hacerlo ahora** — el ahorro no justifica el riesgo de shift de tono (mover `marcoEdad` del rol `user` al `system`) ni el re-QA que exige. **Retomar cuando crezca el volumen de análisis.**
- ✅ **Migrar el modelo de IA — EN PRODUCCIÓN (verificada 10 jul 2026).** `claude-sonnet-4-5` → `claude-sonnet-4-6` aplicado en `api/anthropic.js:250` (única línea de código; las 15 funciones/16 call-sites pasan por ese endpoint). Commit `e5f190a`, pusheado a `origin/main`. **Daniel verificó en producción: el modelo responde bien, tono correcto, sin voseo.** Docs sincronizadas (`COSTOS_IA.md`, `README.md`, este archivo). Nota: Sonnet 4.6 usa `effort: "high"` por defecto, pero el código no setea `thinking`/`effort` → comportamiento cercano a Sonnet 4.5.
- **Evaluar `claude-sonnet-5`** — desde **9 jul 2026** — thinking siempre encendido, tokenizador nuevo (~30% más tokens), sampling params rechazados. Requiere QA dedicado. Precio introductorio hasta 31 ago 2026. Evaluar también Haiku (`claude-haiku-4-5`) para llamadas baratas.
- **Sincronizar `schema.sql`** con la base viva — faltan `plan`, `contexto_inicial`, `intenciones`, `plan_beta_hasta` en `perfiles` — desde **21 jun 2026** — hacerlo en una pasada; falta confirmar el tipo de elemento de `intenciones` (figura como ARRAY). **Además (6 jul 2026):** la tabla real `push_subscriptions` **NO tiene la columna `id`** que declara el schema (rompió `push-test`/`push-remind`; se corrigió el código para no pedir `id` y borrar por `endpoint`) — un ejemplo más del desfase.
- ✅ **BUG DE VOZ — CERRADO (6 → 11 ago 2026), QA aprobado en celular.** El síntoma: tras grabar y tocar **"Agregar"**, la siguiente grabación daba *"No se captó audio"*. 🔴 **CAUSA RAÍZ CONFIRMADA POR EXPERIMENTO: `getUserMedia` (el waveform) y `SpeechRecognition` NO coexisten en Safari iOS** — mientras el `MediaStream` está abierto, el reconocimiento no captura. **La primera grabación funcionaba solo porque el prompt de permiso demoraba a `getUserMedia`** el par de segundos que el reconocimiento necesitaba para engancharse. **Solución:** `getUserMedia` eliminado por completo; el waveform pasó a **animación CSS** (14 barras, ciclos con primos para que no se sincronicen, `prefers-reduced-motion`). ✅ **Cerró de paso el bug del permiso repetido de micrófono.** ✅ **Instrumentación temporal retirada por completo** (Eruda, logs `[VOZ]`, flag `?sinwaveform`). ⚠️ **TRES hipótesis probadas y REFUTADAS — no repetirlas:** registro global stale, instancia vieja de SR compitiendo, y orden de arranque. **La saga: `c4c3ac4` → `467f4a3` → `af3d1fb` → `9fe7876` → `827b508` → `7e21de3` → `a553d55` → `fa756c2`.** **Detalle completo en el bloque del 6 ago, punto 2.**
- 🆕 **La tarjeta de patrones no deja elegir y dice 3 cuando hay 2 casos reales** — desde **6 ago 2026** — **SIN DIAGNOSTICAR**, sin causa identificada. No tratar como bug confirmado hasta reproducirlo.
- 🔴 **RECUPERACIÓN DE EPISODIOS SIN ORIENTACIÓN** — desde **5 ago 2026** — hoy un episodio cuya orientación falló **queda muerto y el usuario ni se entera: el Historial no lo marca de ninguna forma**. Falta **(a) marcarlo visualmente en el Historial** y **(b) permitir regenerar la orientación desde ahí**. **Sin esto, cualquier caída futura de la IA deja episodios vacíos de forma permanente.** (Contexto del incidente que lo destapó: bloque del 5 ago, punto 6.)
- **Cortar la línea 3 de `ESTADO.md`** — desde **4 ago 2026** — pesa **~69 mil caracteres en una sola línea** y **ya no se puede leer con herramientas normales** (hay que medirla e inspeccionarla con PowerShell para poder editarla). Conviene **cortarla dejando solo las últimas 2 o 3 sesiones**; el resto ya vive en los bloques de sesión de más abajo. **Requiere sesión propia: NO hacerlo al cierre de un día**, porque implica decidir qué se conserva y qué se archiva.

**Calidad de voz / prompts de IA** (preexistente, detectado en el QA de la migración a `claude-sonnet-4-6`; NO se tocó en ese commit)
- ✅ **Palabra vulgar "pico" — HECHO (10 jul 2026, verificado en producción).** Estaba hardcodeada en 4 líneas del andamiaje (`src/services/anthropic.js` 549, 550, 627, 648, tramos 6-12 y 12-18, sentido "punto máximo"). Reemplazada por "momento de máxima activación" / "momento más alto del conflicto". Commit `a1ace5a`. Verificado con `\bpico\b`: no queda ninguna en el andamiaje de prompts.
- ✅ **Vocabulario vulgar sin prohibir — HECHO (10 jul 2026).** Cláusula VOCABULARIO agregada en el `SYSTEM_PROMPT` (`api/anthropic.js`) y en `REGLA_IDIOMA` (`src/services/anthropic.js`), **idénticas carácter por carácter**; prohíbe "pico", "concha", "pinchar", "polla". **Cobertura verificada en las 15 llamadas:** 14 vía el `SYSTEM_PROMPT` del backend y `requestPrimerEncuentro` vía `REGLA_IDIOMA` heredado en su system propio. Commit `a1ace5a`.
- ✅ **RESUELTO (13 jul 2026, commit `32c9a3d`, verificado en preview y producción) — Contradicción entre `generarAccionInmediata` y `analizarEpisodio`** sobre contacto físico con el niño en desborde (una decía "mano en la espalda", la otra "no lo toques"). Ningún prompt daba guía sobre esto. **Fix:** se agregó la sección `CONTACTO FÍSICO EN DESBORDE` al `SYSTEM_PROMPT` compartido (`api/anthropic.js`), que heredan ambas funciones por igual. Regla por edad: **0-2** contacto activo salvo rechazo; **2-6** ofrecer y leer la señal del niño (Levine/Lansbury/Greenspan); **6-12+** priorizar presencia corporal sobre el contacto directo; **12-18** no iniciar contacto (lo inicia el adolescente). Principio raíz: el contacto se ofrece, nunca se impone; nunca instruir "toca"/"no toques" como regla absoluta. QA aprobado en preview y prod (varias corridas, las dos funciones ahora coinciden). Detectado 9 jul 2026.

- ⬜ **Citas textuales atribuidas a autores reales — ABIERTO (14 jul 2026).** La app muestra citas entre comillas atribuidas a autores (ej. "Nombrar para dominar" a Daniel Siegel) en la pantalla de **Acción Rápida**. Riesgo de credibilidad/atribución si la cita NO es textual. **Revisar** si son citas reales o parafraseadas.
- ⬜ **Data vieja de demo con el nombre "Pascualito" — ABIERTO (14 jul 2026).** Estrategias/orientaciones generadas ANTES del rename a "Mateo" conservan "Pascualito" fijo en la BD (`orientacion_ia` y textos de IA persistidos, que NO se regeneran al renombrar el perfil). Solo afecta **data vieja de demo**, no usuarios reales.

**Infra de la beta** (antes de invitar a DESCONOCIDOS; NO bloquea al círculo cercano)
- **Autoasignador de códigos del tablero de `/beta` elige a ciegas** (`src/pages/beta/BetaPage.jsx:845`) — desde **1 ago 2026** — toma el primer código libre **según el tablero**, sin consultar la tabla `codigos_beta` en Supabase. Si un código se gasta fuera del tablero (QA, canje manual), el tablero no se entera y se lo asigna igual a un tester. **Hoy no molesta: los 20 códigos están libres.** Decisión explícita de Daniel de anotarlo y no arreglarlo ahora.
- **Separar la bandeja `contacto@huella.lat`** de la cuenta Google personal — desde **21 jun 2026** — se creó vía "Upgrade this account" y quedó compartida; separar con cuenta nueva o perfil de Chrome aparte.
- **Consent screen de Google OAuth** (muestra el subdominio crudo de Supabase) — desde **17 jun 2026** — decisión pendiente: dominio propio en Supabase (~US$10/mes) vs. esperar la verificación lenta de Google. Se arregla por config, no por código.
- **Montar la encuesta de salida en Tally** — desde **21 jun 2026** — texto ya definido (con precio real); recién al final de la beta.
- **Cambiar el registrante del dominio** (gmail personal → `contacto@`) + opcional alinear el remitente `hola@huella.lat` (Resend) a `contacto@` — desde **21 jun 2026** — menor, fuera del repo.
- **Gmail personal en `PerfilPage.jsx:193`** (mensaje de error al eliminar cuenta, fuera de la legal) — desde **21 jun 2026** — decidir si se cambia a `contacto@`.

**Gancho de retención**
- **Fase 3 — "la notificación noble"** (gatillo de retorno con valor, nunca culpa) — el pipeline de Web Push está **ENCENDIDO y verificado end-to-end en iPhone real (6 jul 2026)** y el copy de re-enganche ya se reescribió sin culpa. El **control permanente de Notificaciones en Cuenta** ya quedó RESUELTO (6 jul). Falta: **más contenido/triggers nobles** (hoy solo hay 3 reglas en `push-remind.js`). Es lo que MÁS mueve la retención.
- **Fase 4 — "el loop de la pareja"** (el registro compartido como motivo de retorno suave) — pendiente, sin arrancar.
- **Motor de rasgos — Fase B del prompt** (afinar `PROMPT_DETECTAR_RASGOS` para equilibrar las 4 familias + slug semántico estable para la identidad del rasgo, hoy frágil al reordenamiento de palabras) — desde **27 jun 2026** — requiere datos reales de la beta para calibrar sin sesgo.

**Notificaciones push** (pipeline ENCENDIDO y verificado end-to-end en iPhone real — **6 jul 2026**)
- ✅ **`api/push-test.js` ELIMINADO — RESUELTO (7 jul 2026, commit `9d2df0d`).** El endpoint temporal de prueba (que disparaba una push con el secreto en la URL, `GET ?secret=CRON_SECRET`, destino hardcodeado al owner) ya cumplió su función (verificó el push end-to-end) y **ya no existe en el repo**. Pre-flight confirmó cero referencias de código antes de borrar.
- ✅ **`CRON_SECRET` ROTADO — RESUELTO (7 jul 2026).** Valor rotado en Vercel + redeploy hecho; la llave vieja (que había quedado expuesta en el chat) queda **invalidada**. El cron `push-remind` toma el valor nuevo **automáticamente** (Vercel inyecta `Authorization: Bearer <CRON_SECRET>` desde la misma variable que valida el handler), sin paso manual adicional.
  - **Deuda técnica NO bloqueante:** la validación en `push-remind.js` es condicional (`if (cronSecret && ...)`) → si la variable `CRON_SECRET` faltara, el endpoint quedaría **sin auth**. Endurecer (exigir el secreto siempre) cuando se toque ese endpoint.
- ✅ **Control permanente de Notificaciones en la pantalla Cuenta — RESUELTO (6 jul 2026, commit `8dc1b22`, verificado en iPhone).** Sección "Notificaciones" en `CuentaPage` que reutiliza `usePushNotifications` y cubre los 4 estados (default con botón "Activar notificaciones" / activadas / bloqueadas / no soportado). Ya **no depende del `NotifBanner` efímero** (su X descartaba para siempre). El `NotifBanner` quedó intacto (se rediseña con Design).
- **`NotifBanner` se ve FEO** — desde **6 jul 2026** — pendiente de pasada de Claude Design.
- **Título de la push muestra "from Huella"** (default del sistema, no se está seteando) — desde **6 jul 2026** — limpiar al afinar los textos reales de notificaciones.

**App stores — 🟢 v3 APROBADA · PRUEBA CERRADA (Alpha) LISTA PARA RECIBIR TESTERS · TWA por Bubblewrap** (arrancó **2 jul 2026**; etapas 1-3 CERRADAS; cuenta Google Play creada **4 jul 2026**, identidad APROBADA **8 jul 2026**; app CREADA + ficha COMPLETADA **14 jul**; 11 cuestionarios 11/11 + cuenta demo + página de eliminación + prueba interna **15 jul**; **el 18 jul: `assetlinks.json` corregido con fingerprints reales + verificación TWA CONFIRMADA en tablet (sin barra) + AAB `versionCode 3` + prueba cerrada (Alpha) armada + declaraciones de contenido completas → v3 ENVIADA A REVISIÓN**; **la v3 quedó APROBADA el 18 jul 16:36** —descubierto el **24 jul** revisando Play Console, el correo nunca llegó—, **grupo de testers arreglado** (admite externos) y **flujo de tester probado de punta a punta**; **falta solo: reclutar 12 testers instalados simultáneos ≥14 días corridos** antes de producción)
- **Decisión (2 jul 2026): TWA por Bubblewrap, NO Capacitor.** La TWA carga `www.huella.lat` en su **mismo origen**, así que los 5 `fetch` relativos `/api/*` funcionan tal cual → **el paso de URL absolutas + CORS queda DESCARTADO para Android** (bajó a la nota de iOS futuro; solo Capacitor iOS lo necesitaría). El Web Push actual (VAPID) también funciona en TWA sin cambios. CLI usado: `@bubblewrap/cli@1.24.1` global.
- **Etapa 1 — CERRADA (2 jul 2026, commit `ce7b2ee`):** fuentes self-hosted. Se declararon los `@font-face` locales (Fraunces + Plus Jakarta Sans, `font-display: swap`) en `src/index.css` apuntando a los `.ttf` de `/public/fonts`, se consolidó `FrauncesSplash` en la Fraunces regular, y se quitaron los `preconnect` + el stylesheet de `fonts.googleapis.com` de `index.html`. **Lighthouse producción móvil: 89** (mediana de 3 corridas; umbral TWA ≥80 superado), 0 llamadas externas de fuentes.
  - **Corrección de diagnóstico:** el plan viejo culpaba a `PDFSection` (~1.4MB) y al code-splitting, pero **`PDFSection` NO afectaba Lighthouse** — ya era un chunk **lazy**, fuera de la ruta crítica del arranque (no se descarga al abrir). El fix real que subió el score fue **solo las fuentes** (eliminar el render-blocking de Google Fonts). El bundle JS NO se tocó.
- **Etapa 2 — CERRADA (2 jul 2026, commit `8933fea`):** `public/.well-known/assetlinks.json` con Digital Asset Links (`delegate_permission/common.handle_all_urls`, `package_name: lat.huella.app`) + excepción con negative-lookahead en `vercel.json` para que `/.well-known/` se sirva como estático y no lo pise el catch-all a `index.html`. **Verificado en vivo:** `www.huella.lat/.well-known/assetlinks.json` → **200**, `Content-Type: application/json`. (El apex `huella.lat` hace 307 a `www`; `www` sirve 200 directo → se empaqueta contra **`www.huella.lat`**.)
  - **FINGERPRINTS REALES — ✅ PUESTOS (18 jul 2026, commit `2c34af2`):** se reemplazó el placeholder `PENDIENTE_FINGERPRINT_BUBBLEWRAP` por los **dos** SHA-256: **Play App Signing** `E2:FE:00:36:92:FF:3F:BA:D0:0C:8B:64:C3:8A:58:C7:89:30:20:E9:A4:C8:31:E5:DB:F7:A3:11:C8:B2:42:B4` (el que Google usa para firmar la app que instalan los testers — el que verifica la TWA) + **upload** `44:CA:BB:01:F5:BE:0C:A8:09:04:B8:7C:25:4D:AB:14:83:DB:9D:ED:B1:1D:1E:4E:F9:77:54:51:2E:31:23:CF` (cubre sideload). Pusheado, **verificado en vivo**, y **QA CONFIRMADO**: reinstalada en la tablet Samsung, la TWA **abre a pantalla completa sin barra de navegador**.
- **Etapa 3 — CERRADA (3 jul 2026):** `bubblewrap init` + **`bubblewrap build` exitoso** en `C:\Users\dundu\OneDrive\Desktop\huella-twa` (carpeta hermana, FUERA del repo git de la web). Keystore creado (alias `huella`, packageId `lat.huella.app`, host `www.huella.lat`, orientación **portrait**, **notification delegation SÍ**). Artefactos generados: **`app-release-signed.apk`** (QA en teléfono) y **`app-release-bundle.aab`** (lo que se sube a Play Console).
  - **Incidencias resueltas:** (a) la 1ª corrida de build falló por corte de red descargando Gradle (`Connection reset`) → reintento y pasó; (b) la contraseña de la Key no cuadraba con lo anotado → `keytool -list` mostró que el keystore usa la **misma** contraseña para Store y Key (Daniel corrigió su registro externo de contraseñas).
  - **SHA-256 del keystore LOCAL** (solo referencia/testeo, **NO** va al assetlinks — el que va es el de Play App Signing, etapa 4): `44:CA:BB:01:F5:BE:0C:A8:09:04:B8:7C:25:4D:AB:14:83:DB:9D:ED:B1:1D:1E:4E:F9:77:54:51:2E:31:23:CF`.
  - **QA en teléfono PENDIENTE:** Daniel no tiene Android → el QA de instalación se hará con **testers internos de Play Console** una vez subido el `.aab` (mejor QA real: instalación desde la store, no sideload del APK).
- **Etapa 4 — EN CURSO · CUENTA GOOGLE PLAY CREADA (4 jul 2026) · IDENTIDAD APROBADA (8 jul 2026):**
  - **Cuenta creada:** tipo **PERSONAL**, cuenta de contacto `contacto@huella.lat`, nombre de desarrollador **"Huella"**, **ID de cuenta `9107581164759486665`**, **US$25 pagados** (única vez), perfil de pagos a nombre de **Daniel** (individual, Chile).
  - **Cuenta SANA:** la aprobación de identidad confirma que **Google NO tomó ninguna medida sobre la cuenta**.
  - **Verificaciones DE GOOGLE** (bloquean el botón **Crear aplicación**):
    1. ✅ **Identidad — APROBADA (8 jul 2026):** Google confirmó *"Se ha verificado tu identidad correctamente"*.
    2. ✅ **Acceso a dispositivo Android — RESUELTO (14 jul 2026):** el error *"Cuenta sin nombre"* era **exclusivo del celular**; Daniel entró a la app **Play Console desde una tablet Samsung** y funcionó, destrabando la verificación. **El ticket con el agente "Gab" puede cerrarse.** (Historia del diagnóstico previo, ya superada:) la app móvil **Play Console** con `contacto@huella.lat` sigue mostrando *"Cuenta sin nombre"* y el error *"error durante la carga de tus cuentas de desarrollador"*. **Se descartaron una por una TODAS las causas accionables por Daniel:** caché de la app limpiada; cuenta de Google eliminada y re-agregada en el dispositivo Samsung; servicio Google Play Console confirmado **ACTIVADO para todos** en Workspace Admin; pestaña **"Sobre ti"** del perfil de desarrollador confirmada **completa** (nombre, nombre legal, dirección, correo verificado, teléfono verificado **+56948681448**). El error **persiste tras todo lo anterior**. **Se abrió TICKET de soporte a Google Play** (formulario "Nueva incidencia", en inglés) documentando todo lo descartado.
       - **Google Play Developer Support respondió (11 jul 2026, agente "Gab"):** pidió **probar el inicio de sesión en Play Console desde un computador** para aislar si el problema es de la cuenta o exclusivo del móvil.
       - **Daniel respondió confirmando que en computador Play Console funciona sin problema:** dashboard completo, perfil **"Sobre ti"** completo, y el propio ticket se abrió desde la web en el computador. **El error es exclusivo de la app móvil Play Console en el Samsung** (*"Cuenta sin nombre"* + error de carga de cuentas).
       - **Conclusión compartida con soporte:** la **cuenta está sana**; el problema está **aislado a la app móvil / la sincronización en el dispositivo**. **PENDIENTE: próximos pasos de Google.**
       - **Causas restantes NO accionables por Daniel:** propagación lenta de Google o falla del lado de Google — **nada más que hacer desde acá hasta que responda soporte.** **Dispositivo:** Samsung **sin chip (solo WiFi)**; confirmado que eso **NO afecta** — la verificación de dispositivo no requiere número, y la verificación de teléfono usa el número de contacto ya registrado.
    3. ⬜ **Teléfono de contacto — PENDIENTE:** con la #2 ya resuelta, queda **verificar el número de teléfono de contacto** en Play Console (tarea pendiente de Daniel).
  - **APP CREADA (14 jul 2026):** con la #2 resuelta se habilitó "Crear aplicación". App creada: nombre **Huella**, paquete **`lat.huella.app`**, **GRATIS**, español **`es-419`**.
  - **FICHA COMPLETADA (14 jul 2026):** título + descripción breve + descripción completa (redactados), **icono 512×512** (generado por Code: escarabajo crema `#FAF3EC` al 78% sobre terracota `#E56E26`, archivo `icono-play-512.png` en el Escritorio de Daniel), **feature graphic 1024×500** (escarabajos de colores de la paleta) y **5 capturas de teléfono** (screenshots reales enmarcados por Claude Design; capturas de tablet/Chromebook/XR se saltaron, NO obligatorias). Para las capturas se poblaron **5 rasgos confirmados de demo** del hijo **"Mateo"** (renombrado desde Pascualito + foto cambiada, por privacidad) vía UPDATE SQL en Supabase para mostrar 5 de 12.
  - **CUESTIONARIOS DE PLAY ("Contenido de la app") — ✅ COMPLETOS 11/11 (15 jul 2026):** política de privacidad, datos de inicio de sesión, anuncios, clasificación de contenido, audiencia objetivo, seguridad de los datos, aplicaciones gubernamentales, funciones financieras, salud, categoría + datos de contacto, y ficha de Play Store. Decisiones registradas:
    - **Clasificación de contenido:** apta para todas las edades (L / ESRB Para todos / PEGI 3 / USK 0 / +3).
    - **Audiencia objetivo:** solo **18+** — FUERA del programa "Diseñada para familias".
    - **Categoría de la tienda:** Estilo de vida. **Contacto público:** `contacto@huella.lat` + sitio `huella.lat`, **sin teléfono**. **Marketing externo:** activado.
    - **Política de privacidad:** URL `https://huella.lat/terminos#privacidad`.
    - **Seguridad de los datos → URL de eliminación de cuenta:** `https://huella.lat/eliminar-cuenta` (página pública nueva, ver bloque abajo).
    - **Datos de inicio de sesión → cuenta demo del revisor — CREADA y CARGADA:** email/contraseña `danielundurraga.r+demo@huella.lat` (subaddress del Workspace de Daniel). Se **confirmó a mano por SQL (`email_confirmed_at`)** porque el correo de confirmación NO llegó. Se le activó **Pro por SQL** (`perfiles.plan = 'pro'`, user_id `a196c7ff-92b2-48df-a36b-3babcabbc651`) para que el revisor vea las funciones de pago. Tiene un hijo ficticio ("Mateo") vía onboarding. Credenciales + instrucciones en inglés ya cargadas en el formulario de Play Console. Es distinta de `contacto@huella.lat` (episodios reales) y de los 12 testers de la prueba cerrada.
  - **PÁGINA PÚBLICA DE ELIMINACIÓN DE CUENTA — ✅ CREADA y EN PRODUCCIÓN (15 jul 2026):** `src/pages/legal/EliminarCuentaPage.jsx`, ruta pública `/eliminar-cuenta` (fuera de `ProtectedRoute`, registrada en `App.jsx`). **URL `https://huella.lat/eliminar-cuenta`, verificada en incógnito.** Cumple los 3 requisitos de Google (menciona "Huella"; 2 métodos de borrado con pasos: app + correo; qué datos se eliminan + retención). Reutiliza `TerminosPage.module.css` **sin modificar Términos**, cero hex hardcodeado; caja de contacto dice "Equipo de Huella" (sin nombre real). **Unifica el plazo de borrado en 30 días** (resuelve la contradicción 72h vs 30 días de `/terminos`). Commit `449c1e7`, pusheado, deploy Vercel OK.
  - **PRUEBA INTERNA — ✅ CREADA Y PUBLICADA (15 jul 2026, 13:59):** se subió el AAB **`app-release-bundle.aab`** (ruta `C:\Users\dundu\OneDrive\Desktop\huella-twa\app-release-bundle.aab`, build del 4 jul 2026, ~1 MB) al canal **Prueba interna**. Versión **"1 (1)"**, **SDK objetivo 35**, estado **"Disponible para testers internos"**; nombre temporal que ven los testers **"lat.huella.app (unreviewed)"** (hasta que Google revise). Lista **"Testers internos"** con **1 correo** (`danielundurraga.r@gmail.com`, el Gmail de la **tablet Samsung** de Daniel), activada; **enlace de unión (web) copiado**. **INSTALACIÓN — ✅ HECHA (18 jul 2026):** tras publicar, la app **tardó en propagarse** (ficha vacía un rato) y luego apareció disponible; la **descarga fallaba con "no se puede descargar"** → **se resolvió reiniciando la tablet Samsung**. La app se **instaló y ABRE** en la tablet (cuenta `danielundurraga.r@gmail.com`): Daniel vio la **pantalla de Huella funcionando**. **QA PENDIENTE de detallar (próxima sesión):** confirmar si aparece la **barra del navegador arriba** (por el fingerprint placeholder), si el **login funciona**, y si toda la app se ve/opera bien instalada. **CONTEXTO DE DISPOSITIVOS:** teléfono de Daniel es **iPhone** (no sirve para Android); su **único Android es la tablet Samsung** → todo QA Android va ahí.
  - **REQUISITO CLAVE DE GOOGLE — PRUEBA CERRADA (registrar, confirmado por web 15 jul 2026):** cuenta **PERSONAL** → para publicar en **producción**, Google exige una **PRUEBA CERRADA con mínimo 12 testers opted-in durante 14 días CONSECUTIVOS**, ANTES de solicitar acceso a producción (**bajó de 20 a 12 desde dic 2024**). **Google evalúa engagement REAL** (que los testers USEN la app), no solo el opt-in; deben **instalar desde el link de Play Store, NO por APK sideload** (el sideload **no cuenta**). **Estrategia de reclutamiento (decidida por Daniel):** convocar con su **marca personal** a mamás/papás activos; **los mismos testers = la beta de producto** (se integra con los códigos `HUELLA-01..20` que dan Pro dentro de la app); **apuntar a 20-30 inscritos** para colchón sobre el mínimo de 12. La **convocatoria + instructivo de opt-in** se redacta recién cuando exista el link real de la prueba cerrada.
  - **CIERRE DEL 18 JUL — ✅ TODO ENVIADO A REVISIÓN:** QA de instalación en la tablet HECHO (sin barra); `assetlinks.json` corregido (fingerprints reales, arriba); **AAB `versionCode 3`** (`versionName "1"`) firmado con la misma keystore (alias `huella`) — el versionCode subió porque Play no reutiliza el 1 (prueba interna) en otro track; **prueba cerrada (canal Alpha) armada** (177 países, grupo `testers-huella@huella.lat`, feedback `contacto@huella.lat`); **declaraciones de contenido completas** (ID de publicidad = NO, confirmado en el manifiesto empaquetado: sin `AD_ID` ni SDKs de ads).
  - **✅ LA v3 YA ESTABA APROBADA desde el 18 jul 16:36 (descubierto el 24 jul).** El correo de Google **nunca llegó** (o se perdió); se creyó por días que seguía en revisión. Se confirmó revisando **directo en Play Console**: **"Disponible para determinados testers"**, **canal Alpha activo**, **177 países**. **LECCIÓN: revisar el estado en Play Console, no esperar el correo.**
  - **✅ BLOQUEO DEL GRUPO DE TESTERS — RESUELTO (24 jul).** `testers-huella@huella.lat` solo aceptaba correos del dominio `huella.lat` → habría **rebotado con todos los testers externos** (Gmail). Arreglado en `admin.google.com` (Aplicaciones → Google Workspace → Grupos para empresas → Opciones para compartir → **"Permitir que los propietarios de grupos añadan miembros externos"**) + **"Permitir miembros externos"** en el grupo. **Verificado con un correo externo real.**
  - **✅ FLUJO DE TESTER PROBADO DE PUNTA A PUNTA (24 jul):** correo externo → agregado al grupo → **link de opt-in** → "You are a tester" → descarga desde Play Store → app funcionando. **Link de opt-in: `https://play.google.com/apps/testing/lat.huella.app`**
  - **FALTA (camino a producción):** **reclutar 12 testers opted-in ≥14 días corridos SIMULTÁNEOS** (no acumulados) — **el reloj de los 14 días NO arranca hasta tener 12 testers instalados a la vez**; por eso se juntan TODOS los correos primero y se suelta el link el mismo día. Convocatoria vía la marca personal de Daniel (historia de Instagram con caja de preguntas), integrada con los códigos `HUELLA-01..20`. **Protocolo completo en `huella-protocolo-beta-android.pdf` (Drive, carpeta HUELLA), que reemplaza el flujo PWA de `huella-textos-beta.md`.**
- **ENLACES PROFUNDOS — ✅ AVISO DE GOOGLE (19 jul) CERRADO COMO FALSA ALARMA (22 jul 2026).** Play Console muestra **"Todos los enlaces funcionan"** y `www.huella.lat` con **"No se han encontrado problemas"**; el aviso era **genérico y previo a la verificación de la v3**. **DECISIÓN TOMADA — NO reabrir:** **no se agrega el apex `huella.lat`** como host; la app sigue reclamando **solo `www.huella.lat`** y **no se toca la ficha de Play**. Diagnóstico de respaldo: el `assetlinks.json` sirve **200 + `application/json`** en `www.huella.lat` **sin redirección**, con los 2 fingerprints correctos; el apex responde **307 → www**, y como la verificación de App Links **no sigue redirecciones**, el apex nunca se declaró (por diseño). Las 3 capas de la app son consistentes entre sí: `twa-manifest.json` (`host`), `AndroidManifest.xml` (`intent-filter` con `autoVerify`) y `strings.xml` (`assetStatements`), las tres apuntando a `www.huella.lat`.
- **NIVEL DE API — 🟡 v4 CONSTRUIDA Y VERIFICADA, *SIN SUBIR* (22 jul 2026). Fecha límite: 31 ago 2026.** Google avisó que la app apunta a un nivel de API antiguo y debe estar en **Android 16 / API 36**. **Construida la versión 4:** `targetSdkVersion` **35 → 36** y `versionCode` **3 → 4**, editados **a mano** en `huella-twa\app\build.gradle` (solo esas 2 líneas; `compileSdk` ya estaba en 36, `minSdk 21` y `versionName "1"` sin tocar).
  - **POR QUÉ A MANO, y la trampa a recordar:** el template de **`@bubblewrap/cli@1.24.1` hardcodea `targetSdkVersion 35`** (no se lee de `twa-manifest.json`), y **1.24.1 ya es la última versión publicada** → hoy **no existe** un Bubblewrap que genere 36. Por eso **NO se tocó `twa-manifest.json`**: preservar su checksum (`79fc27ea…` en `manifest-checksum.txt`) evita que `bubblewrap build` ofrezca **regenerar el proyecto y pisar el targetSdk**. ⚠️ **`bubblewrap update` REVIERTE el targetSdk a 35** — no correrlo sin re-parchear después.
  - **DRIFT DOCUMENTADO Y DELIBERADO:** `twa-manifest.json` quedó diciendo `appVersionCode: 3` mientras el `build.gradle` y los artefactos dicen 4. Es intencional, no un error.
  - **Artefactos (22 jul 14:33)** en `C:\Users\dundu\OneDrive\Desktop\huella-twa`: **`app-release-bundle.aab`** (1.203.044 bytes) y **`app-release-signed.apk`** (1.081.794 bytes). **El APK firmado está respaldado en el Drive, carpeta HUELLA.**
  - **VERIFICACIÓN LEYENDO EL ARTEFACTO** (no el `build.gradle`): APK por `aapt2 dump badging` → `versionCode='4'`, `targetSdkVersion:'36'`; AAB decodificando su manifiesto **protobuf** (`aapt2` no lee `.aab` directo) → `targetSdkVersion` = `1a 02 33 36` / `30 24` (=36), `versionCode` = `1a 01 34` / `30 04` (=4), `minSdkVersion` intacto en 21. Confirmado que `app/build.gradle` **no fue revertido** durante el build y que el checksum siguió intacto. **Firma:** upload key de siempre `44:CA:BB:…:23:CF` (`CN=Daniel Undurraga, OU=Huella, O=Huella, C=CL`), **coincide con el `assetlinks.json`** → nada que cambiar del lado web.
  - **✅ QA DE EDGE-TO-EDGE DE LA v4 — APROBADO (24 jul 2026).** Era **el cambio de comportamiento real de Android 16** y tocaba justo las zonas que la TWA configura (`themeColor #9B7B6A`, `navigationColor #000000`). Se instaló el **APK firmado (`app-release-signed.apk`) por sideload desde el Drive** (carpeta HUELLA), tras **desinstalar la versión anterior**. **Verificado en Home e Historial:** las barras de sistema **no tapan contenido**, la **barra de navegación de la app queda completa sobre el taskbar de Samsung**, y **no hay recortes en los bordes**. **Sin regresiones visuales** por `targetSdk 36`. **Pendiente CERRADO.**
  - **⛔ NO SUBIR la v4 a Play Console mientras corra la beta con la v3** — subirla al mismo track puede reemplazar o enredar la prueba cerrada en curso.
  - **⏳ OJO CON EL PLAZO:** la advertencia de nivel de API **solo se cierra cuando la v4 llegue al canal de PRODUCCIÓN — NO basta con la prueba cerrada.** Fecha límite **31 ago 2026**. Esto **acopla** el plazo de API con el camino de los 12 testers: producción depende de completar la prueba cerrada.
- **Ficha de la store — COMPLETADA (14 jul 2026):** textos (título + descripción breve + descripción completa), **icono 512×512**, **feature graphic 1024×500** y **5 capturas de teléfono**, todo cargado en Play Console (detalle en "APP CREADA / FICHA COMPLETADA" arriba). El doc `huella-ficha-play-store.md` (Drive) guarda los textos + cuestionarios + checklist.
- **Iconos PWA / maskable — AUDITADOS y CORRECTOS (10 jul 2026):** se revisaron `public/icons/icon-512x512.png` (declarado `"any maskable"`) e `icon-192x192.png`. Fondo terracota **opaco full-bleed**, escarabajo **centrado** y con **holgura sobre la zona segura del 80%** (contenido dentro del círculo seguro: ~72 px de holgura en el 512, ~13 px en el 192). **NO hay defecto de recorte maskable** — quedan como están. Fuente vectorial disponible (`escarabajo-huella.svg`) por si algún día se quiere regenerar. **NUEVO (14 jul):** el icono de la **ficha de Play Store** NO usa este PNG maskable (tiene mucho margen); se generó uno aparte, **`icono-play-512.png`** (Escritorio), con el escarabajo al **78%** sobre terracota `#E56E26`, **512×512, 32-bit opaco** (generado por Code con `sharp`, verificado).
- **Recordatorio de seguridad — RESUELTO:** respaldo de `android.keystore` + contraseña en el Drive de Daniel (carpeta **"Huella - Llaves Android"**): **HECHO y verificado (3 jul 2026).**
- **iOS nativo (DESPUÉS de Android; NO bloquea la beta):** push nativas por APNs vía Capacitor (el Web Push actual no corre en WebView iOS) + Face ID + navegación nativa, para pasar la Guideline 4.2. **Nota:** si iOS se hace con Capacitor, ESE camino SÍ necesitará convertir los 5 `fetch` `/api/*` a URL base absoluta (`huella.lat`) + CORS en las funciones de Vercel (descartado para Android/TWA, pero vigente para Capacitor iOS).

**Cobros reales** (ver REGLA CRÍTICA más abajo)
- 🟢 **YA NO ESTAMOS CIEGOS EN EL PAGO — el registro de intentos está VIVO en producción** — desde **4 ago 2026**, cerrado en su parte gruesa el **5 ago 2026** — el problema original: no había ningún registro de intentos de pago, solo `console.error` en Vercel con retención de **una hora** (plan Hobby), así que ante cada reclamo de "no pude pagar" se quedaba ciego. Estado del plan acordado: (1) reproducir el camino silencioso en celular → **PENDIENTE**; (2) crear tabla **`pagos_intentos`** con RLS activa sin policies (patrón `codigos_beta`) → ✅ **HECHO — migración `009_pagos_intentos.sql` ejecutada en la base real el 5 ago**; (3) instrumentar `mp-crear-suscripcion.js` con helper blindado → ✅ **HECHO y VERIFICADO EN PRODUCCIÓN el 5 ago** (commit `c609039`); (4) mejorar el error visible con código de referencia + botón de reintentar → ✅ **HECHO y VERIFICADO EN CELULAR el 5 ago** (commit `c61a7fa`). **EL PLAN QUEDÓ CERRADO ENTERO.** Hoy el backend deja rastro de cada intento y de cada corte con user agent y plataforma, y el usuario ve su código `HP-XXXXXX` con un botón de reintentar cuando algo falla. Consulta de diagnóstico lista en `supabase/consultas/pagos_diagnostico.sql`. **Detalle completo en el bloque del 5 ago.**
- 🔴 **Camino silencioso del botón de pago — ABIERTO, y el 5 ago ganó su primera evidencia dura** — desde **4 ago 2026** — la ruta de éxito nunca hace `setCargando(false)` antes del redirect (`CuentaPage.jsx` + `UpgradeModal.jsx`); si el usuario vuelve atrás desde MP, el botón puede quedar en "Redirigiéndote al pago…" y **deshabilitado**, y `if (cargando) return` bloquea cualquier toque: **sin error y sin redirect**. **Probado en Chrome de escritorio: NO se reproduce.** ⚡ **DATO NUEVO (5 ago 2026, QA en celular): a Daniel le apareció un error breve en pantalla ANTES de llegar a Mercado Pago, y en `pagos_intentos` NO quedó ninguna fila de error — solo la de éxito (`HP-9VU7F6`).** Ahora que el backend registra TODOS sus cortes, un error visible sin fila asociada solo puede significar una cosa: **ese error ocurrió en el cliente y nunca llegó a disparar la llamada al endpoint.** **Esto acota el problema al lado del navegador y descarta el backend.** **Falta identificar qué error exacto es y reproducirlo — ese es el frente que sigue abierto.** ⚠️ **ARREGLO PREVENTIVO YA IMPLEMENTADO, PERO EL BUG SIGUE SIN CONFIRMAR (5 ago, commit `c61a7fa`):** se agregó el listener de `pageshow` que repone `setCargando(false)` cuando `event.persisted` es true, en `CuentaPage.jsx` y `UpgradeModal.jsx`. **NO tratar esto como "camino silencioso resuelto":** el bug nunca se logró reproducir, ni en Chrome de escritorio ni en celular, así que **no se sabe si había algo que arreglar.** Lo que existe es un arreglo defensivo para una hipótesis. Además el botón de reintentar del bloque de error **no pasa por el guard `if (cargando) return`**, así que aunque el estado quedara pegado, ese camino siempre puede disparar un intento nuevo.
- ✅ **EL WEBHOOK NUNCA ESTABA LLEGANDO — ERA REAL, Y QUEDÓ ARREGLADO EL MISMO DÍA** — encontrado y cerrado el **5 ago 2026** — `huella.lat` responde **307 Temporary Redirect** hacia `www.huella.lat`, **también en POST** (verificado con `curl`), y tanto el `notification_url` del código como el webhook del panel de MP apuntaban al **apex que redirige**. Mercado Pago espera **200 o 201** en 22 segundos; un 307 no es ninguno. 🔴 **LA EVIDENCIA QUE LO CONFIRMÓ: el panel de Mercado Pago mostraba 0% DE NOTIFICACIONES ENTREGADAS antes del cambio.** Cero, nunca llegó ninguna — dejó de ser riesgo teórico y pasó a hecho medido. **Arreglado en los dos frentes:** (a) código, commit `b80ed77`, `back_url` y `notification_url` a `https://www.huella.lat` (con comentario en el archivo para que nadie "limpie" el `www`); (b) panel de Mercado Pago, cambiado a mano por Daniel a `www.huella.lat` **en modo productivo Y en modo prueba**. **Lo que esto significa hacia atrás:** la doble vía (webhook + red de seguridad) en realidad corría **en una sola vía** — todo dependía de la red post-checkout, que dura ~6 segundos y corre una sola vez. ⏳ **Falta ver el porcentaje de entrega subir de 0%: eso se comprueba recién con el primer pago real.**
- **El webhook responde 200 aunque falle el `upsert`** — desde **4 ago 2026** — se hace a propósito para que MP no reintente en loop, pero el efecto es que **si el upsert falla, el pago queda sin Pro para siempre** y el único rastro es un `console.error` que vence en una hora.
- **La red de seguridad post-checkout tiene ventana de solo ~6 segundos** (0s + 2s + 4s) — desde **4 ago 2026** — y **no hay segunda oportunidad**: tras el intento se borra el query param `?suscripcion=ok` con `replaceState` y el efecto **nunca vuelve a correr**, ni al recargar ni al entrar a `/cuenta` más tarde.
- **No hay manejo de fallo visible para el usuario** — desde **4 ago 2026** — si el pago se rechaza en MP o el usuario abandona el checkout, vuelve a `/cuenta` **sin ningún mensaje ni camino de recuperación**. El único error nuestro cubre solo la falla ANTES del redirect.
- ✅ **RESUELTO (5 ago, commit `c61a7fa`) — Mensaje "No pudimos abrir el pago" duplicado literal** en `CuentaPage.jsx` y `UpgradeModal.jsx` — el copy y el markup viven ahora en el componente compartido `src/components/ui/ErrorPago.jsx`; las dos pantallas lo consumen con las mismas props.
- 🆕 **Cabo suelto menor: la clase `.error` quedó SIN USO** en `CuentaPage.module.css` y `UpgradeModal.module.css` — desde **5 ago 2026** — 0 referencias en el JSX tras pasar a `ErrorPago`. Es CSS muerto, inofensivo. No se borró para no mezclar limpieza con el cambio funcional.
- **El detalle real del error de MP se pierde** — desde **4 ago 2026** — viaja al navegador dentro de `err.detail` pero solo va a `console.error` (`CuentaPage.jsx:165`, `UpgradeModal.jsx:31`), donde **nadie lo ve nunca** en el celular de un usuario real. Es justo lo que la tabla `pagos_intentos` viene a rescatar.
- **Primer pago REAL de punta a punta** con credenciales de producción de MP — pendiente — condición #2 y gate para activar cobros; prueba EN VIVO la firma del webhook + el camino "confirmado".
- **Limpiar usuarios/cuentas de prueba de MP** + cancelar el preapproval de prueba que sigue `authorized` — menor.

**Producto / marca** (sin fecha, menores)
- **Racha por interacción activa** — contar cualquier interacción, no solo registrar episodio — decidido, falta implementar.
- **Pulir la promesa central** ("Entiende por qué tu hijo actúa así…", provisional) + **evaluar un reverse trial largo** (14-30 días, no de 7) — orfebrería de copy/marca.
- **Rediseño visual del `UpgradeModal`** (premium; el centrado ya se resolvió) — falta la pasada estética.
- **Tarjeta del Home "El retrato de {hijo} está creciendo / necesita unos momentos más"** — ABIERTO (14 jul 2026): sigue mostrando el estado **casi-vacío** aunque el retrato ya tiene 5 rasgos confirmados (visto con "Mateo"). **Revisar la lógica** del estado de esa tarjeta.

**Deuda de diseño**
- **Hex hardcodeados a migrar a token:** `#FFD89C` en `HistorialHeader.module.css` (`.pdfLock`) y `white`/`#fff` en `.reflexionSaveBtn`, `.enmarcarBtn`, `.fotoRemoveBtn` y `Button.primary` global — en la próxima pasada de Design.
- **Escarabajo del círculo café se ve más chico que el del cuadrado verde** — el de la card "NUEVO EN SU HUELLA" (`.anticipoBicho`, PanelPage) vs el de `CTAAskHuella` (`.brandIcon`); deben verse iguales — detectado **1 jul 2026**. Diagnóstico HECHO: el círculo usa **58%** (vs 90% del cuadrado, 78% estándar de círculos) y el aire del viewBox lo agrava → se ve al ~84%. Fix propuesto: subir `.anticipoBicho` a **~69%** (iguala la caja de 36px del verde; seguro, <78%, patas no tocan el borde). **Pendiente:** aplicarlo + revisar de paso `.fotoPlaceholder` (58%, RetratoSendero) y `.circuloEscarabajoIcon` (60%, GuiaPrimerosPasos) —los otros círculos bajo 78%— para que el fix sea parejo.
- **SVG sueltos sin commitear en la raíz** — `escarabajo-huella.svg`, `logo 1.svg`, `logo 2.svg`, `logo 3.svg` aparecen como untracked en `git status` — desde **10 jul 2026** — pendiente de orden (decidir si van a `public/`/`assets`, se archivan en Drive o se borran). **No urgente**, pero conviene no dejarlos sueltos para no colarlos en un commit por error.

---

## 🪝 ESTADO DEL GANCHO DE RETENCIÓN (foto de un vistazo)

- ✅ **Fase 1 — el retrato que madura:** COMPLETA, en producción.
- ✅ **Fase 2 — la revelación incompleta (pista honesta):** COMPLETA, en producción (Capas 1, 2 y 3).
- 🟡 **Fase 3 — la notificación noble:** pipeline Web Push **ENCENDIDO y verificado end-to-end en iPhone real (6 jul 2026)** + copy de re-enganche reescrito sin culpa + **control permanente de Notificaciones en Cuenta RESUELTO** (commit `8dc1b22`). Falta **más contenido/triggers nobles**. Es **lo que MÁS mueve la retención real**.
- ⬜ **Fase 4 — el loop de la pareja:** PENDIENTE.

---

## ⏭️ PRIORIDAD INMEDIATA — 🚀 BETA EN CURSO · ✅ EL RELOJ DE GOOGLE ARRANCÓ (se llegó a los 12) · lo único que toca ahora: que los 12 se MANTENGAN

### 📋 LISTA OFICIAL DE TESTERS — LA FUENTE DE VERDAD (fijada el 11 ago 2026)

**Son 18 personas.** ⚠️ **Ojo con el número: veníamos diciendo 17 y el conteo real da 18.** La cuenta que lo explica: los 17 del lanzamiento (2 ago) **+ la mamá** (`nene.pepita`, sumada el 5 ago) = 18, **− Nicole** (salió por falta de espacio en el teléfono) = 17, **+ Nicolás Arriagada** (tomó su lugar) = **18**. En el archivo quedó escrito "17" en varios lados de días anteriores porque cada movimiento se anotó por separado y nunca se rehízo la suma.

**Esta lista es LA FUENTE DE VERDAD** para las métricas del **día 7 del protocolo** y para **cualquier consulta SQL de la beta**. Si un número no cuadra con esta tabla, la tabla manda.

| # | Nombre | Correo | Estado al 11 ago |
|---|---|---|---|
| 1 | Diego Diaz | `ddiegodiaz@gmail.com` | con cuenta |
| 2 | Ceci Leiva | `cecilialeivausset@gmail.com` | con cuenta |
| 3 | Seba | `s.undurragar@gmail.com` | con cuenta |
| 4 | Negra | `bundurraga.r@gmail.com` | con cuenta |
| 5 | **Benja de la Cerda** | `be.delacerda@gmail.com` | 🔴 **sin instalar** |
| 6 | Pia Heap | `pia.heap@gmail.com` | con cuenta |
| 7 | Matias Cartagena | `matias.lagos.cartagena@gmail.com` | con cuenta |
| 8 | Paulina Moraga | `paulinajmg.88@gmail.com` | con cuenta |
| 9 | Tomas Vergara | `tomas.vergara88@gmail.com` | con cuenta |
| 10 | **Moni** | `snackclub2022@gmail.com` | 🔴 **sin instalar** |
| 11 | Vale Ramirez | `v.ramirez@pacificschoolpichilemu.com` | con cuenta |
| 12 | Cata Grez | `catagrez9363@gmail.com` | con cuenta |
| 13 | Javi Zamora | `javiera.zamora.r@gmail.com` | con cuenta |
| 14 | Max Lund | `mlundv@gmail.com` | con cuenta |
| 15 | Igna | `ignacopardo@gmail.com` | con cuenta |
| 16 | **Nicolas Arriagada** | `nicolas.arriagada@gmail.com` | 🔴 **sin instalar** (entró en reemplazo de Nicole) |
| 17 | Anita Gomez | `amgomezsc1@gmail.com` | con cuenta |
| 18 | Mama | `nene.pepita@gmail.com` | con cuenta |

**Resumen al 11 ago: 18 en la lista, 15 con cuenta, 3 sin instalar** (Benja, Moni, Nicolás). **Fuera de la lista:** Nicole, que salió por falta de espacio en el teléfono.

⚠️ **Con 15 instalados hay 3 de colchón sobre los 12 que exige Google, y el requisito es de 12 SIMULTÁNEOS: si cuatro desinstalan, el reloj se reinicia.**

---

**ESTADO AL 6 AGO 2026 (histórico — el conteo de acá quedó corregido por la lista oficial de arriba):** **17 testers en total** — **Nicole salió por falta de espacio en el teléfono**. **13 instalados, 11 con registros.** **Faltan por instalar (3):** Benja, Moni, Igna. **Instalaron pero no registraron (2):** Cata, Javi. Se mandó el **privado de instalación** a los que faltan y **la pregunta del día 3** al grupo. ⚠️ **Con 13 instalados hay apenas 1 de colchón sobre los 12 que exige Google, y el requisito es de 12 SIMULTÁNEOS: si dos desinstalan, el reloj se reinicia.** Por eso los 3 que faltan siguen importando aunque el mínimo ya esté cubierto.

**ESTADO AL 5 AGO 2026 (histórico):** ✅ **SE ALCANZARON LOS 12 MIEMBROS ACTIVOS.** Se sumó `nene.pepita@gmail.com` y ya registró. **Con eso arrancó el reloj de los 14 días corridos que exige Google.** ⚠️ **El requisito es de 12 SIMULTÁNEOS, no acumulados: si alguno desinstala o sale del grupo, el conteo se rompe y el reloj se reinicia.** De aquí en adelante el trabajo es **retención, no reclutamiento**. **Anotar la fecha de los 12 en el tablero de `/beta`** para saber cuándo se cumplen los 14 días.

**ESTADO AL 4 AGO 2026 (histórico) — DÍA 3:** **9 cuentas creadas de 17 testers, 5 con al menos un registro.** **EL RELOJ DE GOOGLE NO HABÍA ARRANCADO: había 9 y se necesitaban 12.**

- **Con cuenta Y registros (5):** `matias.lagos.cartagena` (**2 registros**), `tomas.vergara88` (1), `s.undurragar` (1), `paulinajmg.88` (1), `amgomezsc1` (1).
- **Con cuenta pero 0 registros (4):** `ddiegodiaz`, `catagrez9363`, `cecilialeivausset`, `bundurraga.r`.
- **Faltan 8 por instalar:** Moni, Benja, pia, nicole, vale, igna, javi, max. **Se les mandó privado uno a uno** preguntando si quedaron pegados instalando. A **pia** se le **reenvió su código (`HUELLA-07`)**.
- 🎯 **LA SEÑAL MÁS LIMPIA QUE HAY HASTA AHORA: `matias.lagos.cartagena`** — es el **ÚNICO desconocido del grupo** (todo el resto es círculo cercano) **y además el que más usó la app** (2 registros). Es la única evidencia de uso sin sesgo de cariño que existe hoy.

**⚠️ PLAY CONSOLE NO ENTREGA DATOS — PENDIENTE SIN RESOLVER (4 ago 2026).** Estadísticas muestra **"Datos no disponibles"** al tercer día, **incluso con la métrica correcta** (*Base instalada — Todos los dispositivos*). **No se pudo determinar la causa.** Las tres posibilidades quedaron abiertas, sin poder descartar ninguna: (a) umbral de privacidad de Google con pocos usuarios, (b) que los canales de prueba cerrada no alimenten ese reporte, (c) retraso mayor al esperado. **DECISIÓN: no seguir peleando con Play Console.** **Supabase es la fuente de verdad operativa**, porque **crear cuenta implica haber instalado**. El conteo de la beta se lleva por Supabase de aquí en adelante.

**ESTADO AL 2 AGO 2026:** **LA BETA SE LANZÓ.** Los **17 testers** están en el grupo de Google (`testers-huella@huella.lat`, 19 miembros contando `contacto@` y el correo de la prueba de julio), en el grupo de WhatsApp "Huella · Beta", y **cada uno recibió su código por privado** (`HUELLA-01..10` y `HUELLA-13..19`; quedan libres el 11, el 12 y el 20). El link de opt-in se verificó antes de mandarlo.

**LO ÚNICO QUE TOCA AHORA (martes 4 ago):** **que los 8 que faltan instalen.** El conteo se hace **en Supabase, NO en Play Console** (ver la decisión del 4 ago arriba): cuentas creadas = instalaciones reales. **Cuando haya 12 o más, anotar esa fecha en el tablero de `/beta`**. ⚠️ **OJO CON LA CONFUSIÓN MÁS CARA DEL CALENDARIO: el reloj de los 14 días NO arrancó con el lanzamiento — arranca con los 12 instalados simultáneos.** Hoy es el día 3 *del lanzamiento*, y el día 0 *de los 14*: **con 9 de 12, el reloj de Google todavía NO parte.** **La fecha de término de la beta todavía NO está definida** y depende de ese dato.

**Incidencia conocida, esperada, NO es bug:** varios testers ven **"Aplicación no disponible"** al abrir el link — o tienen el navegador con otra cuenta de Google, o Google todavía no propaga. Se resuelve solo o cambiando de cuenta; ya se avisó al grupo con captura.

**ESTADO AL 1 AGO 2026 (el tablero que se usó para lanzar):** el tablero separa el **mínimo para partir (`MIN_CORREOS = 15`)** de la **meta ideal (`META_CORREOS = 20`)**, así que con 17 no frenó. Los **20 códigos `HUELLA-01..20` estaban libres** (verificado en Supabase; `HUELLA-01` NO estaba gastado). **El protocolo completo vive en `huella-protocolo-beta-android.md` (Drive, versión 1 ago)**, que reemplaza la versión del 24 jul y la guía vieja de la beta web con Tally.

**ESTADO AL 24 JUL 2026 (contexto de cómo se desbloqueó):** la beta Android quedó **DESBLOQUEADA**. **La v3 YA ESTABA APROBADA desde el 18 jul 16:36** — el correo de Google nunca llegó; se confirmó revisando **directo en Play Console** ("Disponible para determinados testers", canal Alpha, 177 países). El **grupo de testers `testers-huella@huella.lat` se arregló** (aceptaba solo correos `huella.lat` → habría rebotado con todos; ahora admite miembros externos, verificado con un correo real). El **flujo de tester se probó de punta a punta** (agregar al grupo → opt-in → "You are a tester" → instalar de Play → app OK). El **QA de edge-to-edge de la v4** quedó **✅ APROBADO** en la tablet. **Único frente abierto ahora: reclutar los testers.**
1. ✅ **Convocatoria COMPLETADA y beta LANZADA el 2 ago** con **17 testers** (la meta eran 20; 17 da colchón suficiente sobre los 12 de Google). Se juntaron todos los correos primero y **el link de opt-in se soltó el mismo día a todos**, como exige el protocolo — Google pide **12 testers instalados SIMULTÁNEOS durante 14 días corridos, NO acumulados**. Link de opt-in: `https://play.google.com/apps/testing/lat.huella.app`. **Protocolo completo (textos de convocatoria y mensajes): `huella-protocolo-beta-android.md`** (Drive, carpeta HUELLA, versión 1 ago), **documento único**: reemplaza la versión del 24 jul, el flujo PWA de `huella-textos-beta.md` y la guía vieja de la beta web con Tally. **Lo que queda de este frente: contar instalaciones y anotar la fecha de los 12.**
2. **⛔ NO subir la v4 mientras corra la beta con la v3.** ⏳ Y ojo: la advertencia de nivel de API **solo se cierra cuando la v4 llegue a PRODUCCIÓN — no basta la prueba cerrada** → el plazo del **31 ago 2026** queda **acoplado** a completar los 14 días con 12 testers. Es la dependencia más importante del calendario ahora mismo.
3. **Pendiente nuevo SIN VERIFICAR (no tratar como hecho):** un reporte de agentes afirmó que varias funciones que `CuentaPage` vende como Pro no tendrían gate por plan en el código (orientación IA, acción rápida, consejo diario, rutina, notificaciones, álbum, medallas, check-in, modo familia). Se basó **solo en buscar `isPro()`** → posible falso positivo. Antes de tocar nada: (a) buscar gates de todas las formas posibles; (b) probar con una cuenta Free real en producción. Aparte: discrepancia de conteo de medallas (Logros dice 33, `CuentaPage` dice 34), sin resolver.

**Cerrado el 22 jul (ya no ocupa espacio mental):** policies de escritura de Storage endurecidas y verificadas en producción (incluía un hueco de **DELETE** que no se había detectado), y el **aviso de enlaces profundos del 19 jul descartado como falsa alarma** (Play Console: "Todos los enlaces funcionan"; decisión firme de **no** agregar el apex `huella.lat`).

**ESTADO AL 18 JUL 2026:** **VERSIÓN 3 ENVIADA A REVISIÓN → EN REVISIÓN por Google.** Ya está TODO lo de configuración: app creada, ficha completada, 11 cuestionarios (11/11), cuenta demo, página de eliminación, **`assetlinks.json` corregido con los fingerprints reales** (Play App Signing + upload, commit `2c34af2`, verificado en vivo), **verificación TWA CONFIRMADA en la tablet Samsung** (abre a pantalla completa, sin barra), **AAB `versionCode 3`** firmado con la misma keystore, **prueba cerrada (canal Alpha) armada** (177 países, grupo `testers-huella@huella.lat`, feedback `contacto@huella.lat`), y **declaraciones de contenido completas** (ID de publicidad = NO). **PRÓXIMOS PASOS (los que quedan para producción):** (1) **esperar la APROBACIÓN de Google** (horas a 2-3 días) — **el reloj de los 14 días NO ha arrancado; arranca recién con 12 testers instalados**; (2) cuando Google apruebe: **sacar el link de opt-in** de la prueba cerrada desde Play Console (confirmar si sirve el de la interna o es uno nuevo) y **lanzar la convocatoria** vía la **marca personal** de Daniel — juntar **~15 testers Android** (cubre los **12 requeridos** con colchón; luego una **2ª tanda para iOS**). **Reglas de Google:** los 12 deben estar **opted-in durante 14 días consecutivos** e **instalar desde Play Store, NO sideload** (el sideload no cuenta); Google evalúa **engagement real**. **Flujo del tester:** manda su Gmail → Daniel lo agrega al grupo `testers-huella@huella.lat` → recibe el link → instala desde Play → se registra con un código `HUELLA-XX` (Pro 45 días) → **mantiene 14 días**. **Falta adaptar el mensaje de convocatoria** (`huella-textos-beta.md` en el Drive) con los pasos de opt-in/instalación desde Play. **El reloj de los 14 días arranca con 12 testers instalados, NO con la aprobación de Google.** Contexto: **PUBLICAR ANDROID EN PLAY STORE — es EL bloqueante de la beta (decisión de Daniel, 1 jul 2026).** La beta está **lista en producto, textos e infraestructura**, pero **en espera de Android en Play Store por decisión de instalación**: Android se baja de la store directo y solo el iPhone hace el paso manual de PWA, así que se invita a testers recién con la app Android publicada. El detalle de ejecución vive en **PENDIENTES → App stores** (al tope del archivo). El **formulario de inscripción de 7 preguntas en Tally está LISTO, publicado y VERIFICADO** (link: `tally.so/r/KYO4EM`; 7 preguntas + link de términos correcto a `huella.lat/terminos#privacidad`). El **bug del onboarding está RESUELTO** (ya no reaparece en la PWA de iOS — commit `df5ddaa`) y la **PWA instala con nombre limpio "Huella"** (commit `0d05416`). La **guía operativa** (`huella-guia-beta.md`) tiene el flujo, el **SQL del pase Pro** (`update public.perfiles set plan_beta_hasta = now() + interval 'N days' where user_id = '...'`, con un `SELECT` antes para confirmar el `user_id`), las métricas y el checklist. El **mensaje de WhatsApp con instrucciones de instalación** (iPhone Safari + Android Chrome) queda listo para usar.

**Para invitar al círculo cercano: bloquea Android en Play Store** (decisión 1 jul 2026). Una vez publicado, el paso es operativo (mandar el mensaje 1 a 1 con el link del formulario + instrucciones de instalación) y activar el pase Pro a cada tester. Ahora hay **dos vías** para el pase: (a) **darle un código `HUELLA-01..20`** para que lo canjee él mismo en el Home o en Cuenta (activa Pro al instante, un solo uso) — vía preferida, ya **no requiere SQL tester por tester**; o (b) el SQL de la guía (`update ... plan_beta_hasta`). **Corrección (1 ago 2026): `HUELLA-01` NO está gastado.** Se verificó la tabla `codigos_beta` en Supabase: **20 códigos, los 20 libres**. El registro anterior decía que se había gastado en el QA y era falso; **los 20 están disponibles para los 20 testers**.

**Antes de invitar a desconocidos (NO bloquea al círculo cercano):**
- **Separar la bandeja de `contacto@huella.lat`** de la cuenta personal de Google.
- **Consent screen de Google OAuth** (hoy muestra el subdominio crudo de Supabase) — se arregla por config, no por código.

**Cola NO bloqueante:**
- **Montar la encuesta de salida en Tally** (texto ya definido con el precio real; recién al final de la beta).
- **Sincronizar `schema.sql`** con la base real (faltan `plan`, `contexto_inicial`, `intenciones`, `plan_beta_hasta` en `perfiles`).
- **Decidir el gmail personal** que aún aparece fuera de la legal en `PerfilPage.jsx:193`.

---

## 🚨 REGLA CRÍTICA — LANZAMIENTO DE COBROS REALES

**NO activar cobros reales (credenciales de PRODUCCIÓN de Mercado Pago) hasta cumplir LAS DOS condiciones:**

1. ✅ **CUMPLIDA — Red de seguridad del pago construida y verificada (Paso 3).** Al volver de pagar a `/cuenta?suscripcion=ok`, la app **consulta a MP el estado real de la suscripción** (`GET /preapproval/search` por `external_reference` + `status=authorized`) y activa `plan='pro'` por backend si está `authorized`, como **respaldo del webhook**. Queda la **doble vía**: webhook (rápido) + verificación al volver (respaldo). Así **ningún pago aprobado queda sin Pro** aunque el webhook falle o no llegue. **Verificada en producción** en su camino "aún no confirmado" (commits `e3233d0` + `56fca1e`). Falta probar EN VIVO el camino "confirmado" (llega con el primer pago real).
2. ⬜ **Un primer pago REAL verificado de punta a punta** con credenciales de producción. Ahí también se prueban EN VIVO: la firma `x-signature` del webhook, el disparo HTTP automático de MP, y el camino "confirmado" de la red de seguridad.

**Estado actual SEGURO:** Vercel tiene credenciales de **PRUEBA** de MP → **nadie puede pagar dinero real hoy** (el botón "Activar Huella Pro" lleva al checkout sandbox). El cambio a credenciales de producción es el **ÚLTIMO paso**, solo tras cumplir las 2 condiciones de arriba.

> ⚠️ **MATIZ IMPORTANTE (4 ago 2026): esto ya NO está verificado, es una suposición.** En Vercel la variable `MP_ACCESS_TOKEN` está marcada como **Sensitive**, así que **su valor no se puede leer desde el panel** y **no se pudo confirmar si sigue siendo de prueba o si es productivo**. Se sigue asumiendo que es de prueba porque nunca se cambió a propósito, pero **hay que tratarlo como suposición, no como hecho**. Para confirmarlo hay que rotar la variable o consultar la identidad del token contra la API de MP. **Dato que juega a favor de la suposición:** en el panel de MP **no aparece ningún movimiento entre el 1 y el 3 de agosto** (el último registro es del **12 de julio**).

**Pendientes derivados de esta regla:**
- **Limpiar usuarios/cuentas de prueba** (comprador, vendedor, `user_id b30d78d5-…`) → menor. Incluye **cancelar el preapproval de prueba** que sigue `authorized` en MP.

> ✅ **Seguridad de llaves Supabase: CERRADA (14 junio).** Legacy JWT apagadas + `sb_secret` rotada. Las dos llaves filtradas en el chat están muertas. (Detalle en "Sesión domingo 14 junio 2026".)

**Ya resueltos hoy (11 junio):**
- ✅ **Downgrade a `free` en el webhook** por `cancelled` / `paused` (commit `e660c00`) — lógica validada en la base real.
- ✅ **`UpgradeModal` conectado al flujo de pago** (commit `f68a8bc`) — QA aprobado en producción.
- ✅ **Migración a llaves nuevas de Supabase** (`sb_publishable` / `sb_secret`) en Vercel — capas 1 y 2 verificadas; legacy aún activas a propósito.

---

## Cerrado HOY — martes 11 agosto 2026 — FASE 1 del registro conversacional EN PRODUCCIÓN + el bug de la mitad del relato, cerrado con logs

**Dos commits, los dos desplegados:** `8761a67` (Fase 1) y `254a2db` (el arreglo de voz que salió del QA de la Fase 1).

**El registro de episodios pasó a "La Conversación".** El modo rápido dejó de ser un formulario de 4 campos: ahora el padre cuenta por voz, la IA extrae la estructura y él valida un párrafo escrito con sus propias palabras. Ataca la causa n°1 de abandono medida en beta. **La vista detallado sobrevive intacta como "Editar todo".**

### Lo que quedó construido

| Pieza | Dónde |
|---|---|
| **`extraerEpisodio`** — relato hablado → estructura + párrafo de validación | `src/services/anthropic.js` (al final) |
| **`RegistroConversacional`** — P1 narrar + P2 validar + hoja de edición | `src/components/registro/RegistroConversacional.jsx` (nuevo) |
| Su CSS, solo tokens | `RegistroConversacional.module.css` (nuevo) |
| **Taxonomía de emociones** extraída a fuente única | `src/constants/taxonomiaEmociones.js` (nuevo) |
| **Catálogos** (TIPOS, INTENSIDADES, CUANDO_OPCIONES) a fuente única | `src/constants/catalogoEpisodio.js` (nuevo) |
| Vista `rapido` reemplazada + 2 handlers puente + `handleGuardar` acepta modo `conversacional` | `RegistroPage.jsx` |

### Decisiones que conviene conocer antes de tocar esto

- **Se crearon dos módulos de constantes en vez de duplicar listas.** `extraerEpisodio` necesita la taxonomía de emociones para armar su prompt y para validar que la específica que devuelve el modelo exista de verdad. Un servicio no puede importar de una página, y copiar la lista habría creado un inventario paralelo que se desincroniza — **el repo ya arrastra ese problema con los cuatro inventarios de autores**. Ahora `RegistroPage` y el servicio leen de la misma fuente.
- **La extracción nunca inventa.** Lo que el relato no dice va en `null`, y hay un saneado defensivo (`normalizarExtraccion`) que descarta tipos inexistentes, emociones fuera de taxonomía y strings vacíos. **La intensidad no se extrae jamás**: la pone el padre, siempre.
- **El párrafo reusa las palabras del padre.** Si dijo "se amurró", el párrafo dice "se amurró". El prompt prohíbe explícitamente traducir a jerga de catálogo y prohíbe la estructura "no fue X, fue Y".
- **Chilenismos mapeados en el prompt:** "se amurró", "se puso pésimo", "quedó la escoba", "estaba chato", "hizo tira", "pescó una pataleta".

### Dos cambios de copy (afectan también al detallado)

- **`Rabieta / explosión` → `Desborde / explosión`.** El `id` sigue siendo `'rabieta'` en base y en `TIPO_A_HABILIDAD`: solo cambia lo que ve el usuario. **Ojo: al vivir en el catálogo compartido, el label nuevo aplica en las dos vistas y en cualquier lugar que lea `TIPOS`.**
- **Emoji de "Muy leve": 😌 → 😕.** La cara serena sugería que no había pasado nada, cuando el padre igual está registrando algo que le costó.

### El estado degradado, que es el que más importa

Ya nos pasó el 5 de agosto: la IA caída medio día y tres testers contra el muro. La regla es que **el relato no se pierde nunca y el guardado no se bloquea**.

- La transcripción se guarda en un ref **antes** de llamar a la IA. Sobrevive a cualquier fallo.
- Si `extraerEpisodio` falla, P2 abre igual: relato intacto arriba, cuatro fichas punteadas, y Huella diciendo *"Guardé tu relato. Esta vez lo ordenamos entre los dos."* **Sin rojo, sin ícono de alarma, sin disculpa larga.**
- **Solo la intensidad bloquea el guardado.** Si el tipo queda vacío se guarda como `'otro'`. Se puede guardar con relato + intensidad y nada más.
- La transcripción completa va a `descripcion_libre` siempre, incluso cuando la extracción funcionó.

### Verificación hecha

- ✅ Build pasa.
- ⚠️ **No hay lint en el repo** — `package.json` solo tiene `dev`, `build` y `preview`, y no existe `eslint.config.js`. No se pudo correr.
- ✅ Los 3 caminos probados con un script sobre `normalizarExtraccion`: extracción completa / parcial con basura que hay que sanear (tipo inventado, emoción fuera de taxonomía, strings vacíos) / respuesta vacía. Los tres sanean bien y la intensidad nunca aparece en el resultado.
- ✅ Cero hex y cero rgb en el CSS nuevo: todo sale de tokens.
- ✅ Cero rojo, cero iconografía de alarma en cualquier estado.

### El bug de la mitad del relato — CERRADO Y CONFIRMADO CON LOGS

Salió del propio QA de la Fase 1: **la segunda grabación captaba solo la mitad de lo hablado, el resto vacío y sin aviso.** Descartado el tope de 2 min (el contador nunca llegó a 2:00). Se cerraron los dos agujeros por donde se perdía relato, y esta vez **hay evidencia de dispositivo real, no deducción**.

**Lo que dijeron los logs de QA:**

- **`soltarMotor: habia un motor vivo, se aborta`** — el zombi queda **confirmado como la causa**, y el cortafuegos de `iniciarGrabacion` lo atajó.
- **`finalizarRevision via onend`** en las dos grabaciones — la red de seguridad ya no se dispara sola en grabaciones sanas.
- **`largoEnviado = largoVisible`** en `confirmarVoz` — cero texto botado.

**Las dos causas y sus arreglos (`254a2db`):**

- **`confirmarVoz` mandaba `transcriptText`**, que es una foto del último render, en vez de `transcriptRef`, que es todo lo dictado. Con relatos largos llegaban resultados entre ese render y el toque de "Agregar", y esa diferencia se botaba.
- **La red de seguridad soltaba la referencia del motor sin abortarlo.** En Safari iOS un `SpeechRecognition` abierto impide que el siguiente capture — **es el mismo conflicto que teníamos con `getUserMedia`, ahora entre dos SR** — y como esto es una SPA, el motor huérfano sobrevivía a la navegación y se arrastraba hasta el episodio siguiente. Ahora existe `soltarMotor()`, que **desconecta los handlers antes de abortar** (porque `abort()` dispara `onend` y ese `onend` volvía a entrar a `finalizarRevision`) y se llama desde los seis puntos de salida.
- **La red pasó de 2 s a 8 s.** 2 s era latencia esperada, pero el trabajo de esa red es detectar que el `onend` **no va a llegar nunca**; con relatos largos Safari se demora más de 2 s solo procesando el audio pendiente. Además ya no descarta el motor al dispararse: pasa a pendiente y lo que emita después se suma al ref y refresca lo que se ve — si no, el padre lee media transcripción y confirma esa.

**La instrumentación se queda unos días.**

Los logs `[VOZ]` y el Eruda de `?debug=1` **siguen en producción a propósito**, hasta acumular 2-3 registros reales limpios. Verificado que Eruda no entra al bundle: vive solo en el HTML y sin `?debug=1` no descarga un byte.

**Para sacarla de una pasada:** los marcadores dicen `TEMPORAL - DIAGNOSTICO HUECOS DE TRANSCRIPCION - SACAR` en `index.html` y en `VoiceTextarea.jsx`, más toda línea que contenga `logVoz`.

### Lo que sigue

**1. Primero de la lista: QA de los párrafos que genera `extraerEpisodio`.** Nadie ha evaluado todavía **cómo se leen** — naturalidad, si de verdad reusa las palabras del padre, si las fichas tocables calzan con lo que dijo. El prompt está afinado en frío, sin haber visto una sola salida real. **Ese veredicto decide el camino:** si los párrafos se leen bien, se sigue con la Fase 2; si suenan a máquina o traducen a jerga de catálogo, primero se afina el prompt. No tiene sentido montar la repregunta sobre una extracción que todavía no sabemos si convence.

**2. Fase 2:** P1.5 repregunta condicional cuando el relato es vago, y el modo chat completo (hoy el botón "Modo chat" abre el textarea simple).

**3. Fase 3:** P3 con el alivio primero, citando palabras textuales del padre.

---

## Sesión jueves 6 agosto 2026 — El grabador de voz pasó a toggle tipo ChatGPT en los 8 campos · queda un bug ABIERTO sin causa confirmada y la instrumentación lista para cazarlo

**4 commits, todos de voz.** El día arrancó con un reporte de tester ("el grabador es confuso") y terminó con el modelo de interacción cambiado entero — más un bug que resistió dos intentos de arreglo.

### Los 4 commits

| Commit | Qué hizo |
|---|---|
| `c4c3ac4` | **Hacer visible el push-to-talk** — botón de 34 a 44px con relleno y borde, hint visible, aviso cuando el toque es corto en vez de fallar en silencio, y CSS contra el menú Copiar/Consultar/Traducir de Safari iOS |
| `467f4a3` | **Cambio a toggle** — se elimina push-to-talk completo; tocar para grabar, botón de stop rojo para detener |
| `af3d1fb` | **Intento de arreglo** de la regresión (ver abajo) |
| `9fe7876` | **Instrumentación TEMPORAL** con Eruda para diagnosticar en el celular |

### 1. Push-to-talk → toggle: el modelo de interacción cambió

**El reporte del tester traía tres síntomas** (ícono chico que no parece botón, no se nota que está grabando, no se entiende cómo detener) **y resultaron ser uno solo: el push-to-talk nunca estuvo comunicado.** La única pista de "mantén presionado" vivía en un `aria-label`, invisible salvo para lectores de pantalla.

Primero se intentó **comunicarlo mejor** (commit `c4c3ac4`). El QA en celular mostró que no alcanzaba: además del menú contextual del sistema que levantaba el long-press, el modelo en sí confundía. **Decisión de Daniel: cambiar a toggle con la estructura de ChatGPT.**

**Lo que hay ahora:** tocar el micrófono una vez arranca la grabación; mientras graba se ve el waveform, un contador y un botón de stop rojo con un cuadrado; tocar stop lleva al estado de revisión de siempre. Aplica a **los 8 campos de voz de la app** (RegistroPage ×4, PatronPage ×2, NuevoPage, SelectorHabilidades).

**Casos que se resolvieron de paso:** tope de **2 minutos** con contador visible que se pone rojo en los últimos 20 segundos (al llegar al tope no se descarta nada, corta y pasa a revisión); **singleton** para que nunca graben dos campos a la vez; **cierre del micrófono al navegar** a otra pantalla; y detener sin audio ya no falla en silencio.

### 2. ✅ BUG DE VOZ — CERRADO el 11 ago 2026, con causa raíz confirmada por experimento

**El síntoma era:** grabo (transcribe bien) → toco **"Agregar"** → grabo de nuevo → **"No se captó audio"**. Las barras del waveform sí se movían, así que `getUserMedia` funcionaba y lo que moría era `SpeechRecognition`.

🔴 **CAUSA RAÍZ: `getUserMedia` y `SpeechRecognition` NO PUEDEN COEXISTIR en Safari iOS.** Mientras el `MediaStream` está abierto, el reconocimiento no captura una sola palabra. **Y el `getUserMedia` existía únicamente para dibujar las barras del waveform** — o sea, estábamos rompiendo la función principal (transcribir) por una decoración.

**Por qué la primera grabación sí funcionaba, que fue lo que despistó todo el diagnóstico:** el prompt de permiso de micrófono **demoraba a `getUserMedia` uno o dos segundos** mientras el usuario tocaba "Permitir". En ese hueco el reconocimiento alcanzaba a engancharse. De la segunda en adelante el permiso ya estaba concedido, `getUserMedia` resolvía en milisegundos y le ganaba el micrófono.

**Cómo se confirmó:** con el flag temporal `?sinwaveform=1`, que salteaba `getUserMedia` por completo. La segunda grabación transcribió perfecto y apareció el `SR onresult` que nunca había aparecido. **Fue el primer experimento cuyo resultado cerraba la pregunta en cualquiera de los dos sentidos.**

⚠️ **TRES HIPÓTESIS PROBADAS Y REFUTADAS ANTES DE LLEGAR A LA BUENA. Anotadas para que nadie las repita:**
1. **El registro global no se limpiaba** (comparaba funciones que se recrean en cada render). Era un bug real y se arregló en `af3d1fb` con un token estable — **pero no era la causa de esto.**
2. **La instancia vieja de `SpeechRecognition` competía con la nueva.** Un test que replicaba los 4 pasos **no reprodujo el fallo**; el cambio se revirtió sin commitear en vez de dejarlo sin evidencia.
3. **El orden de arranque** (commit `827b508`): se hizo arrancar el reconocimiento primero y el waveform 300 ms después. Los logs mostraron que el SR tuvo el micrófono para él solo 358 ms **y aun así no capturó nada en 4 segundos.** No era de orden: era de coexistencia.

**LA SOLUCIÓN (commit `fa756c2`):** se elimina `getUserMedia`, `MediaStream`, `AudioContext` y `analyser` por completo, más siete refs que ya no tenían razón de ser. **El waveform pasa a animación CSS pura, sin leer audio:** 14 barras (en vez de 20, porque comparten fila con el contador y el stop), cada una con su duración, desfase y altura tope calculados con módulos de primos distintos para que los ciclos no coincidan y no se lea como un loop sincronizado; se anima con `scaleY` en la GPU y respeta `prefers-reduced-motion`.

✅ **DE PASO QUEDÓ CERRADO EL BUG DEL PERMISO REPETIDO DE MICRÓFONO** (abierto desde el 4 ago). Nuestro código ya no pide micrófono en ningún lado: el único que lo pide es `SpeechRecognition`, que gestiona el suyo. Aquel `getUserMedia` que reclamaba permiso en cada grabación existía solo para las barras.

✅ **QA APROBADO EN CELULAR (11 ago):** tres grabaciones seguidas con "Agregar" entre medio, **las tres transcribieron y acumularon bien**, y **el permiso se pidió solo la primera vez**.

**Balance del componente: 251 líneas menos, 77 más. Quedó más simple que antes de que empezara todo esto.**

### 3. Instrumentación temporal — RETIRADA POR COMPLETO

Se montó Eruda (consola móvil embebida, solo con `?debug=1`), 24 logs con prefijo `[VOZ]` y el flag `?sinwaveform=1`. **Todo eso ya se sacó** en el commit `fa756c2`: verificado con grep que no queda ni un marcador `TEMPORAL`, ni una llamada a `getUserMedia`, ni un `console.log` en el componente, ni rastro de Eruda en `index.html`.

Las únicas menciones a `getUserMedia` que sobreviven son **comentarios que explican por qué no se puede volver a poner ahí** — para que nadie reintroduzca el bug al intentar "mejorar" unas barras que no reaccionan a la voz.

📌 **Lección del proceso, que es lo que más vale de estos cinco días:** cuatro hipótesis, tres equivocadas. Lo que destrabó el caso no fue una teoría mejor sino **dejar de suponer y montar el experimento**. Con `?debug=1` y `?sinwaveform=1` la pregunta se respondió sola en una prueba de dos minutos en el celular. **Cuando un bug resiste dos intentos, el siguiente movimiento es instrumentar, no adivinar.**

### 4. Beta — el número real, y no son 12

**17 testers en total** (Nicole salió por falta de espacio en el teléfono). **13 instalados. 11 con registros.**

- **Faltan por instalar (3):** Benja, Moni, Igna.
- **Instalaron pero no registraron (2):** Cata, Javi.

Se mandó el **privado de instalación** a los que faltan y **la pregunta del día 3** al grupo.

### 5. 🆕 PENDIENTE NUEVO SIN DIAGNOSTICAR — la tarjeta de patrones

**La tarjeta de patrones no deja elegir, y dice 3 cuando hay 2 casos reales.** ⚠️ Sin diagnosticar, sin causa identificada. Queda anotado para revisar.

---

## Sesión miércoles 5 agosto 2026 — El plan de pagos del 4 ago quedó CERRADO ENTERO · después: se cayó la IA para todos por saldo agotado (resuelto) · y la beta llegó a los 12, así que el reloj de Google arrancó

**Cinco commits, todos de pagos.** El día empezó con "no existe ningún registro de intentos de pago" y cerró con los **4 pasos del plan hechos y verificados en producción**, más un hallazgo grande que no estaba en el plan: **el webhook nunca estaba llegando**.

### Los 5 commits del día

| Commit | Qué hizo |
|---|---|
| `f20f9b7` | **Migración 009 ejecutada** — tabla `pagos_intentos` (RLS activa sin policies, referencia `HP-XXXXXX` generada por la base, índices, comentarios) + `supabase/consultas/pagos_diagnostico.sql` |
| `c609039` | **Instrumentación de `mp-crear-suscripcion.js`** — registra los 8 cortes que antes eran mudos + el camino exitoso, con `user_agent` y `plataforma` |
| `6cc387c` | **`ESTADO.md`** — paso 3 verificado en producción + se anota la deuda del redirect |
| `b80ed77` | **`back_url` y `notification_url` a `www.huella.lat`** — se elimina el salto 307 |
| `c61a7fa` | **Componente `ErrorPago`** — código de referencia visible, botón de reintentar, copy unificado, listener de `pageshow` |

### 1. El plan de pagos del 4 ago: CERRADO ENTERO

| Paso | Estado |
|---|---|
| 1. Reproducir el camino silencioso en celular | 🟡 **Arreglo implementado, bug NO confirmado** (ver punto 4) |
| 2. Crear la tabla `pagos_intentos` | ✅ **HECHO** — migración 009 en la base real |
| 3. Instrumentar `mp-crear-suscripcion.js` | ✅ **HECHO y VERIFICADO EN PRODUCCIÓN** |
| 4. Error visible con código de referencia + reintentar | ✅ **HECHO y VERIFICADO EN CELULAR** |

**QA del paso 3 (en producción, desde el celular):** se tocó el botón de pagar y la fila aterrizó — **referencia `HP-9VU7F6`, etapa `preapproval`, resultado `ok`, plataforma `movil`**. Las cero filas de los primeros intentos eran **timing de deploy**, no un bug: se probó antes de que Vercel terminara de publicar.

**QA del paso 4 (en producción, desde el celular):** con **modo avión** apareció el bloque de error **sin referencia** — que es el comportamiento correcto, porque el intento nunca llegó al endpoint y por lo tanto no hay fila que referenciar. El botón **"Intentar de nuevo"** funcionó: con internet restablecido llevó al checkout de Mercado Pago. **Los dos casos del bloque (con y sin referencia) quedaron cubiertos.**

**El registro es no bloqueante y está probado como tal:** helper con try/catch que se traga todo, techo de 1200 ms vía `Promise.race`, cliente service-role separado del anon. Con Supabase inalcanzable el endpoint responde igual, solo que sin referencia. **La lógica del pago no cambió en ninguna línea.**

### 2. 🔴➡️✅ HALLAZGO GRANDE — el webhook NUNCA estaba llegando (0% de notificaciones entregadas)

Esto no estaba en el plan y resultó ser lo más importante del día.

**Lo que se encontró:** `huella.lat` responde **307 Temporary Redirect** hacia `www.huella.lat`, **también en POST** (verificado con `curl`). Y tanto el `notification_url` del código como el webhook configurado a mano en el panel de MP apuntaban al **apex que redirige**. Mercado Pago espera un **200 o 201** dentro de 22 segundos; un 307 no es ninguno de los dos.

**LA EVIDENCIA QUE LO CONFIRMÓ: el panel de Mercado Pago mostraba 0% DE NOTIFICACIONES ENTREGADAS antes del cambio.** Cero. Ni una sola notificación llegó nunca. Eso deja de ser un riesgo teórico y pasa a ser un hecho medido.

**Lo que se arregló, en dos frentes:**
- **En el código** (commit `b80ed77`): `back_url` y `notification_url` pasan a `https://www.huella.lat`. Quedó un comentario en el archivo explicando el porqué, para que nadie "limpie" el `www` más adelante sin saber qué desarma.
- **En el panel de Mercado Pago** (a mano, fuera del repo): Daniel cambió la URL del webhook a `www.huella.lat` **en modo productivo Y en modo prueba**.

**Por qué importa tanto:** el diseño de doble vía (webhook rápido + red de seguridad como respaldo) en realidad estaba corriendo **en una sola vía**. Todo dependía de la red de seguridad post-checkout, que dura ~6 segundos y corre una sola vez. Si un usuario pagaba y cerraba la pestaña, quedaba sin Pro y sin reintento posible.

**Falta verificarlo en vivo:** que el porcentaje de entrega suba deja de ser 0% recién cuando MP dispare una notificación real. Se comprueba con el primer pago real.

### 3. Barrido de URLs — no había más casos

Se revisó **todo el repo** buscando URLs hardcodeadas hacia nosotros: las únicas dos eran las de `mp-crear-suscripcion.js`. Todo lo que arma URLs propias en `src/` usa `window.location.origin` (dinámico, se adapta al host). `manifest.json` usa `start_url: "/"` relativo, `assetlinks.json` no tiene URLs, `sw.js` e `index.html` tampoco. Lo demás que apareció con "huella.lat" son direcciones de correo `contacto@huella.lat`, que no son callbacks.

### 4. ⚠️ Listener de `pageshow` — ARREGLO IMPLEMENTADO, BUG NO CONFIRMADO

**Hay que leer esto con cuidado y no darlo por cerrado.**

Se agregó en `CuentaPage.jsx` y `UpgradeModal.jsx` un listener de `pageshow` que, cuando `event.persisted` es true (la página vuelve del bfcache), repone `setCargando(false)`.

- **Por qué se agregó:** sin él, el botón de reintentar **no sirve en el escenario real**. Si el estado de carga queda pegado, NO hay error en pantalla, y sin error tampoco hay bloque de reintentar: el usuario solo ve el CTA congelado en "Redirigiéndote al pago…" y deshabilitado. Decisión explícita de Daniel de incluirlo.
- ⚠️ **PERO: NO está verificado que el bug exista.** La hipótesis del camino silencioso **sigue sin confirmar**. En Chrome de escritorio no se reproduce, y en celular no se logró reproducir tampoco. **Lo que hay es un arreglo preventivo para un bug que nunca se vio ocurrir.** No anotarlo como "camino silencioso resuelto", porque no se sabe si había algo que resolver.
- **Dato que sigue abierto del QA del 5 ago:** a Daniel le apareció **un error breve en pantalla antes de llegar a Mercado Pago** y NO quedó fila de error en `pagos_intentos`, solo la de éxito. Como el backend registra todos sus cortes, ese error vino del cliente y nunca disparó la llamada al endpoint. **Ese error concreto todavía no se identificó.**

### 5. Componente `ErrorPago` — el copy dejó de estar duplicado

Nuevo `src/components/ui/ErrorPago.jsx` + su CSS module. Concentra copy y markup en un solo lugar; `CuentaPage` y `UpgradeModal` lo consumen con las mismas tres props (`referencia`, `onReintentar`, `cargando`). Antes el mensaje "No pudimos abrir el pago" vivía **duplicado literal** en los dos archivos.

- **Con referencia:** muestra el código `HP-XXXXXX` grande y espaciado, con `user-select: all` (un toque lo selecciona completo en el celular) e invita a escribir a `contacto@huella.lat`.
- **Sin referencia:** no renderiza esa parte. **No queda hueco ni aparece "null" en pantalla.**
- **Reintentar sin trampa:** el cuerpo del pago se extrajo a `dispararPago()`, **sin** el guard de `cargando`. El guard queda solo en `handleActivar`; reintentar no pasa por ahí, así que no puede quedar bloqueado.
- **Diseño:** tokens de `index.css`, sin hex ni rgb. Sigue el lenguaje de caja de error de `AuthPage` y el patrón de reintentar de `RegistroPage`. Los 7 tokens de color usados tienen override de dark mode.

### 6. 🚨 INCIDENTE — LA ORIENTACIÓN DE IA SE CAYÓ PARA TODOS (5 ago, RESUELTO el mismo día)

**Pasó después del cierre de los 5 commits de pagos, así que se registra acá aparte.**

**El síntoma:** **tres testers distintos reportaron lo mismo el mismo día** — Diego, la mamá de Daniel y Paulina: al registrar un episodio aparecía *"No pudimos obtener tu orientación esta vez. Tu episodio quedó guardado."* **Falla determinista: el botón Reintentar tampoco servía**, fallaba igual y al instante. Eso descartó de entrada red intermitente y timeouts.

🔴 **CAUSA RAÍZ: el saldo de la cuenta de Anthropic estaba en −0,05 USD.** La API respondía 401/403 y `api/anthropic.js` (bloque `esProblemaDeCuota`, líneas 304-317) lo traducía a un **503 `servicio_no_disponible`**. Se confirmó con un `curl` directo al endpoint en producción, que devolvía exactamente ese 503.

✅ **RESUELTO:** Daniel recargó a **19,95 USD** y activó **auto-reload** (umbral 10, recarga a 50). **Verificado con el mismo `curl`: el endpoint responde 200 con texto generado de verdad.**

⚡ **HALLAZGO IMPORTANTE — LA ACCIÓN RÁPIDA ENMASCARA LA CAÍDA.** Esto es lo que hizo perder tiempo en el diagnóstico y hay que tenerlo presente para siempre: **`generarAccionInmediata` (`src/services/anthropic.js:789-798`) tiene un fallback local**, y el **autor se elige en el cliente** antes de llamar a la IA. Cuando la API está caída, el `catch` devuelve `construirFallback(...)` y **el usuario ve una tarjeta con cita de autor que se ve perfectamente normal pero NO fue generada por IA.** Durante el incidente, "la acción rápida sí funciona" parecía significar que el servicio estaba vivo — **y no lo estaba.** ⚠️ **Que aparezca la acción rápida NO es evidencia de que la IA funcione.**

🔴 **DEUDA ABIERTA #1 — LOS EPISODIOS QUE FALLARON QUEDAN SIN ORIENTACIÓN PARA SIEMPRE.** Sin suavizarlo: **no hay ninguna forma de recuperarlos desde la app.** El detalle, verificado en el código:
- `analizarEpisodio` tiene **un solo llamador en todo el proyecto**: `RegistroPage.jsx:564`. No existe otra ruta.
- El botón **Reintentar vive en la vista `guardado` de `RegistroPage`** y depende de `reintentoRef.current`, un `useRef`. Si el usuario navega, recarga o cierra la app, **el ref muere con el componente y ya no hay vuelta**.
- **El Historial no muestra ni el error ni oferta de reintento.** `EpisodioCard.jsx:156` hace `{hasIA && ...}`: si `orientacion_ia` es null, el botón "Ver orientación" **simplemente no se dibuja**. El episodio se ve igual que cualquier otro — **el usuario ni siquiera sabe que le falta algo**.
- **El daño se propaga:** `InformePDF.jsx:913` (el informe para el especialista sale sin esa orientación) y `CheckinPage.jsx:51` (el check-in de 20-48 h la usa como contexto y arranca ciego).
- Recuperación posible hoy: **solo escribiendo la columna a mano por SQL**, o que el usuario borre el episodio y lo registre de nuevo perdiendo la fecha original.
- Para contarlos: `select count(*) from public.episodios where orientacion_ia is null;` — y por día, para aislar el pico del apagón del ruido histórico.

🔴 **DEUDA ABIERTA #2 — SEGUIMOS CIEGOS EN LA IA, IGUAL QUE ESTÁBAMOS EN PAGOS.** El único rastro de un fallo de IA es un **`console.error` en Vercel con una hora de retención**. **Nos enteramos por tres testers, no por una alerta.** Y el saldo llegó a **número negativo** sin que nada avisara. El auto-reload cubre el caso del saldo, pero **no cubre ningún otro motivo de caída** (llave revocada, cambio de contrato, saturación).

### 7. 🎉 BETA — SE ALCANZARON LOS 12: EL RELOJ DE GOOGLE ARRANCÓ

**Se sumó `nene.pepita@gmail.com` y ya registró.** Con eso la beta llega a **12 miembros activos**, que es **exactamente el mínimo que Google exige** para que empiece a correr el reloj de los **14 días corridos con 12 testers simultáneos**.

⚠️ **Ojo con lo que esto significa:** el requisito es de **12 simultáneos, no acumulados**. Si alguno desinstala o sale del grupo, **el conteo se rompe y el reloj se reinicia**. De aquí en adelante lo que toca es **que los 12 se mantengan**, no sumar más.

### 8. 🆕 REPORTE NUEVO SIN DIAGNOSTICAR — la app no funciona en la red de un hospital

Un tester que **trabaja en un hospital** reporta que **la app no le funciona con internet público / la red del hospital**. ⚠️ **SIN VERIFICAR, SIN CAUSA IDENTIFICADA. No se investigó.** Queda anotado como pendiente de revisar. No tratarlo como bug confirmado hasta reproducirlo.

### 9. PENDIENTE ACORDADO — bajar el costo de API con prompt caching, NO recortando autores

**Decisión explícita de Daniel:** la optimización de costos de la API va por **prompt caching**, y **NO** por filtrar el banco de autores. **El razonamiento: filtrar autores atenta contra la calidad de las respuestas; el caching no toca el contenido del prompt en absoluto.** Hoy el **hit rate de caché es 40%** — ahí está el margen de mejora. No abrir la puerta a recortar el marco teórico como vía de ahorro.

### Cabo suelto menor (anotado, NO resuelto)

- **La clase `.error` quedó sin uso** en `CuentaPage.module.css` y en `UpgradeModal.module.css` (0 referencias en el JSX tras el cambio). Es CSS muerto, inofensivo. No se borró para no mezclar limpieza con el cambio funcional.

### Lo que sigue pendiente

1. 🔴 **Primer pago REAL verificado de punta a punta** — **condición #2 de la REGLA CRÍTICA**, el gate para activar cobros. Ahí se prueban EN VIVO: la firma `x-signature`, el disparo automático del webhook (ahora sí a una URL que no redirige) y el camino "confirmado" de la red de seguridad.
2. **Identificar el error de cliente** que apareció en el QA del 5 ago y nunca dejó fila.
3. 🔴 **Rescatar (o al menos contar) los episodios que quedaron sin orientación** por la caída de IA, y decidir si se les avisa a los tres testers afectados.
4. 🔴 **Salir de la ceguera en IA** — hoy un fallo del servicio solo deja un `console.error` de una hora. Nos enteramos por los usuarios.
5. **Beta:** ✅ **el reloj de Google ARRANCÓ — se llegó a los 12.** Lo que toca ahora es **que los 12 se mantengan 14 días corridos**, no sumar más.
6. **Revisar el reporte del hospital** (la app no funciona en esa red) — sin diagnosticar.
7. **Prompt caching** para bajar el costo de API (hit rate actual 40%). **NO recortando autores** — decisión tomada.

---

## Sesión martes 4 agosto 2026 — Día sin código: el flujo de pago quedó diagnosticado y el hallazgo es que estamos ciegos · beta día 3 con 9 de 17

**DÍA SIN CÓDIGO. Cero commits de feature.** El día fue **diagnóstico de solo lectura** y **operación de beta**. Nada de lo que sigue está implementado: es hallazgo y plan. Lo único que se tocó fue este archivo.

### 1. Beta — día 3: 9 cuentas de 17, y la señal más limpia viene del único desconocido

**Supabase muestra 9 cuentas creadas de 17 testers, 5 de ellas con al menos un registro.**

| Tester | Registros | Nota |
|---|---|---|
| `matias.lagos.cartagena` | **2** | 🎯 el **ÚNICO desconocido** del grupo, y el que **más usó la app** |
| `tomas.vergara88` | 1 | |
| `s.undurragar` | 1 | |
| `paulinajmg.88` | 1 | |
| `amgomezsc1` | 1 | |
| `ddiegodiaz` | 0 | cuenta creada, sin registrar |
| `catagrez9363` | 0 | cuenta creada, sin registrar |
| `cecilialeivausset` | 0 | cuenta creada, sin registrar |
| `bundurraga.r` | 0 | cuenta creada, sin registrar |

**Faltan 8 por instalar:** Moni, Benja, pia, nicole, vale, igna, javi, max. **Se les mandó privado uno a uno** preguntando si quedaron pegados instalando. A **pia** se le **reenvió su código (`HUELLA-07`)**.

**Lo que más vale de este día:** `matias.lagos.cartagena` es el **único tester que no es del círculo cercano** y resultó ser **el que más usó la app**. Todo el resto del uso viene de gente que quiere bien a Daniel; este no. **Es la señal más limpia que existe hasta ahora**, y conviene no perderla de vista cuando llegue la encuesta de salida.

**⚠️ EL RELOJ DE GOOGLE NO HA ARRANCADO: hay 9 y se necesitan 12.**

### 2. Play Console no entrega datos — se deja de pelear (PENDIENTE SIN RESOLVER)

**Estadísticas muestra "Datos no disponibles" al tercer día**, incluso usando la métrica correcta (*Base instalada — Todos los dispositivos*). **No se pudo determinar la causa**; quedaron **tres posibilidades abiertas, ninguna descartada**:

1. **Umbral de privacidad de Google** con pocos usuarios (no reporta bajo cierto N).
2. **Que los canales de prueba cerrada no alimenten ese reporte.**
3. **Retraso mayor al esperado** en la consolidación de datos.

**DECISIÓN: no seguir peleando con Play Console.** **Supabase pasa a ser la fuente de verdad operativa de la beta**, con una lógica simple y sólida: **crear cuenta implica haber instalado**. Se anota como pendiente sin resolver, no como problema a investigar.

### 3. Diagnóstico del flujo de pago — qué se verificó

**Síntoma:** un usuario real intentó pagar Huella Pro el fin de semana y **le salió error DENTRO de la app, al tocar el botón de activar**.

**Lo verificado, punto por punto:**

- ✅ **El checkout SÍ funciona.** Se reprodujo el flujo completo en incógnito y **llega correctamente a Mercado Pago**, mostrando **"Huella Pro mensual $9.990"** con las dos formas de pago. **La creación del preapproval no está rota.**
- ✅ **En el panel de MP NO aparece ningún intento entre el 1 y el 3 de agosto.** El registro más reciente es del **12 de julio**. O sea: **el intento nunca llegó a MP** — se cortó antes, del lado de la app.
- ❌ **Los logs de Vercel ya vencieron.** El plan **Hobby** solo permite mirar **hasta 1 hora atrás**. **El error exacto de ese usuario NO es recuperable.**
- ❌ **No se pudo verificar el token.** `MP_ACCESS_TOKEN` está marcado **Sensitive** en Vercel → su valor no se puede leer desde el panel, así que **no se sabe si es de prueba o productivo**.

**Hipótesis principal de Code (NO confirmada) — el "camino silencioso":** la ruta de éxito **nunca hace `setCargando(false)`** antes del redirect. Si el usuario llega a MP y **vuelve atrás**, el navegador **puede restaurar la página desde bfcache** con el botón todavía en **"Redirigiéndote al pago…"** y **deshabilitado**. Ahí el usuario toca y **no pasa nada: sin error, sin redirect.**

**PROBADO EN CHROME DE ESCRITORIO: NO se reproduce** — el botón vuelve a la normalidad. **Falta probar en el celular**, porque **la TWA de Android y Safari en iPhone manejan bfcache distinto**. **Queda abierto.**

### 4. 🔴 HALLAZGO CENTRAL — no existe ningún registro de intentos de pago

**NO EXISTE NINGÚN REGISTRO DE INTENTOS DE PAGO. Ni tabla, ni servicio externo.** Solo `console.error` en Vercel, **con retención de una hora**.

**Consecuencia, dicha sin adornos: cada vez que un usuario reporte que no pudo pagar, se va a estar ciego exactamente igual que hoy.** Y hay algo peor: **`mp-crear-suscripcion.js` ni siquiera loguea el camino exitoso**, solo el error. No existe ningún rastro de "esta persona tocó el botón de pagar".

**Queda anotado como deuda prioritaria en PENDIENTES → Cobros reales.**

### 5. Otros hallazgos del diagnóstico (anotados, sin resolver)

- **El webhook responde 200 aunque falle el `upsert`**, para que MP no reintente en loop. **Si el upsert falla, el pago queda sin Pro para siempre** y el único rastro es un `console.error`.
- **La red de seguridad post-checkout tiene una ventana de solo ~6 segundos** (0s + 2s + 4s) **y no hay segunda oportunidad**: tras el intento se borra el query param y **nunca vuelve a correr**.
- **No hay manejo de fallo visible.** Si el pago se rechaza en MP o el usuario abandona, **vuelve a `/cuenta` sin ningún mensaje ni camino de recuperación**.
- **El mensaje "No pudimos abrir el pago" está duplicado literal** en `CuentaPage.jsx:166` y `UpgradeModal.jsx:32`.
- **El detalle real del error de MP viaja al navegador** dentro de `err.detail` **pero solo va a `console.error`**, donde nadie lo ve nunca.

### 6. Plan acordado — pasos 2 y 3 EJECUTADOS el 5 ago; queda solo el paso 4

1. **Reproducir el camino silencioso en celular** (TWA de Android + Safari en iPhone) — **PENDIENTE**, pero el 5 ago ganó evidencia dura (ver abajo).
2. ✅ **HECHO (5 ago 2026) — Crear la tabla `pagos_intentos`** con **RLS activa sin policies**, patrón `codigos_beta` (migración **009**).
3. ✅ **HECHO y VERIFICADO EN PRODUCCIÓN (5 ago 2026) — Instrumentar `mp-crear-suscripcion.js`** con un **helper blindado que nunca pueda romper el pago** (se traga cualquier error, techo de tiempo, cliente service-role propio).
4. 🔴 **ÚNICO PENDIENTE — Mejorar el error visible** con **código de referencia** (para cruzar el reclamo del usuario contra la fila exacta de la tabla) y **botón de reintentar**.

**ACTUALIZACIÓN 5 ago 2026 — los pasos 2 y 3 se ejecutaron y el 3 quedó VERIFICADO EN VIVO.**

- **Paso 2:** la migración `009_pagos_intentos.sql` corrió completa en la base real (los 5 bloques OK, generador verificado con `HP-5CXQWZ`, fila de prueba borrada). Quedó también la consulta de diagnóstico en `supabase/consultas/pagos_diagnostico.sql`. Commit `f20f9b7`.
- **Paso 3:** `mp-crear-suscripcion.js` quedó instrumentado (commit `c609039`): registra los **8 cortes que antes eran mudos** más el **camino exitoso**, con `user_agent` y `plataforma` derivada. El registro es **no bloqueante** (try/catch que se traga todo, techo de 1200 ms, cliente service-role separado del anon) y **la lógica del pago no cambió**: mismo body a MP, mismos status codes. Lo único que se suma a las respuestas de error es el campo `referencia`.
- ✅ **QA EN PRODUCCIÓN APROBADO (5 ago):** Daniel tocó el botón desde el **celular** y la fila aterrizó — **referencia `HP-9VU7F6`, etapa `preapproval`, resultado `ok`, plataforma `movil`**. Esa es la evidencia de que el rastro funciona de punta a punta.
- **Por qué antes salían cero filas:** era **timing de deploy** — se probó antes de que Vercel terminara de publicar `c609039`. Descartado como bug.
- ⚡ **DATO NUEVO Y VALIOSO DEL MISMO QA:** a Daniel le apareció **un error breve en pantalla ANTES de llegar a Mercado Pago**, y **NO quedó ninguna fila de error en la tabla — solo la de éxito**. Como el backend ahora registra TODOS sus cortes, un error visible sin fila asociada solo puede significar que **ese error ocurrió en el cliente y nunca disparó la llamada al endpoint**. **Refuerza la hipótesis del camino silencioso y acota el problema al lado del navegador, no al backend.** Es el hilo más prometedor que hay para el paso 1.

**Lo que sigue:** el **paso 4** es lo único que queda del plan. Y el **paso 1** cambió de naturaleza: ya no es "reproducir a ciegas", ahora es **cazar ese error de cliente concreto que Daniel vio**, sabiendo que el backend está limpio.

---

## Sesión lunes 3 agosto 2026 — El marco teórico ya es visible en las salidas de patrón: los patrones cierran con respaldo, igual que los episodios

**Un commit a `main`, en producción, QA aprobado por Daniel en los dos caminos: `a5c1595` — `feat(patron): marco teorico visible en las salidas de patron`.** Cinco archivos tocados, ninguna migración de base.

### El síntoma

Los episodios cierran su orientación con **"Marco aplicado: [autor] — [concepto]"**. Los patrones ("Algo que aún no cambia") no mostraban nada. La misma app entregaba orientación **con respaldo visible en un lado y sin respaldo en el otro** — y ese respaldo es justamente lo que separa a Huella de un consejo cualquiera.

### La causa raíz — no faltaba la instrucción, el formato la anulaba

El `SYSTEM_PROMPT` de `api/anthropic.js` **sí pide el marco a toda llamada**. Pero `analizarPatron` exige **JSON puro con 4 claves**, y el modelo obedece el contrato de salida antes que la instrucción de cierre: el marco se perdía en cada patrón. **Vale recordarlo como patrón de diagnóstico: un formato de salida estricto pisa una regla del system prompt sin avisar.**

### Lo que se hizo

- **Quinta clave `marco_aplicado` en el JSON de `analizarPatron`.** Viaja sola al `jsonb` de `orientacion_ia`: **sin migración, sin columnas nuevas, sin romper filas viejas.** El objeto completo ya se guardaba tal cual, así que la clave nueva entró sin tocar Supabase.
- **LISTA CERRADA de 52 autores explícita en el prompt**, con prohibición dura de inventar autores o títulos de libros. Todos salen de `BRIEF_ACCION_RAPIDA.md`. **Haidt y Twenge quedan bloqueados** salvo patrón de pantallas o redes sociales en mayores de 10 años.
- **Componente nuevo `PieCientifico`** (`.jsx` + `.module.css`) en `src/components/patron/`, **compartido por `PatronLecturaPage` y `PatronPage`**. Replica el tratamiento visual de `.marco` de `RespuestaIA.module.css` (11px, itálica, `--color-text-muted`, `border-top`).
- **El descargo legal ("Esta orientación se basa en evidencia…") va HARDCODEADO en el componente, no generado por IA.** En los episodios lo escribe el modelo; acá es texto fijo para que no varíe nunca.
- **Prop `sinDescargo`:** en clasificación `derivar` el descargo se omite — el cierre médico de arriba ya dice que Huella no diagnostica, y repetirlo una línea más abajo le restaba peso al momento más serio de la app. Queda solo el marco. **Si tampoco hay marco, el componente no renderiza nada** (ni el div ni el borde superior).
- **Doble guardia para las filas viejas:** `analizarPatron` normaliza a cadena vacía y el componente revalida el tipo. **Nunca imprime "undefined".**

### QA en producción — los dos caminos aprobados

- **Patrón `derivar`:** muestra solo **"Marco aplicado: Bruce Perry — regular, relacionar, razonar"**, sin descargo duplicado.
- **Patrón `instalado`:** muestra descargo + **"Marco aplicado: T. Berry Brazelton — touchpoints del sueño y consistencia afectiva"**.

La IA **elige el autor por dimensión y no repite**: son autores distintos y correctos para cada tema.

### 🔍 HALLAZGO DEL DÍA — hay CUATRO inventarios de autores en el repo y no coinciden entre sí (DEUDA ANOTADA, NO RESUELTA)

| # | Dónde | Cuántos | Para qué sirve |
|---|---|---|---|
| 1 | `BRIEF_ACCION_RAPIDA.md` §12 | **77** | La lista canónica aprobada. **Solo existe como documento — ninguna constante del código la contiene.** |
| 2 | `AUTORES` en `src/services/anthropic.js` | **23** | Los que pueden firmar una Acción Rápida (con lente y pool de articulaciones). |
| 3 | `MAPA_DIMENSIONES` | 16 dimensiones | Ruteo dimensión → autor. |
| 4 | `src/lib/frases.js` | **39** | Frases de las pantallas de carga. |

Además, el `SYSTEM_PROMPT` de `api/anthropic.js` tiene **17 ejemplos de "Marco aplicado" que no están respaldados por ningún brief**.

**No hay forma programática de preguntarle al código si un autor está aprobado.** Queda anotado como deuda. **NO se resuelve ahora.**

### Estado de la beta (sin cambios de código hoy)

- Lanzada el **domingo 2 de agosto** con **17 testers**.
- Al lunes 3: **7 códigos canjeados de 17** — `HUELLA-19`, `HUELLA-05`, `HUELLA-03`, `HUELLA-08`, `HUELLA-14`, `HUELLA-10`, `HUELLA-02`.
- **Play Console todavía no muestra datos de instalaciones.**
- **Pendiente:** seguir contando y **anotar la fecha en `/beta` cuando haya 12 instalados** — eso arranca el reloj de los 14 días.

---

## Sesión domingo 2 agosto 2026 — 🚀 LA BETA SE LANZÓ, UNA SEMANA ANTES DE LO ACORDADO. 17 testers con su código, todos partiendo el mismo día

**No hubo código: el día fue 100% operación.** El lanzamiento estaba acordado para el **domingo 9 de agosto**, pero Daniel juntó los 17 correos antes de lo previsto y **se adelantó una semana**. Eso deja **más margen antes del plazo del 31 de agosto**, que es la fecha en que la advertencia de nivel de API obliga a tener la v4 en producción.

### Lo que se ejecutó hoy

- **17 testers confirmados** (16 conocidos + 1 desconocido). La meta original eran 20, pero **17 da colchón suficiente sobre los 12 que exige Google**.
- **Los 17 Gmail agregados al grupo `testers-huella@huella.lat`.** El grupo quedó con **19 miembros**: los 17 testers, `contacto@huella.lat` y `d.undurraga@pacificschoolpichilemu.com` (de la prueba de julio). **Suscripción configurada en "No recibir correo electrónico"** para que el grupo no genere ruido.
- **Un tester usa correo corporativo** (`v.ramirez@pacificschoolpichilemu.com`). **Se verificó con la persona: es la cuenta que tiene en su celular Android, así que sirve.** No es un Gmail personal, pero lo que importa es que sea la cuenta activa del dispositivo.
- **Grupo de WhatsApp "Huella · Beta" creado** con los 17.
- **Mensajes enviados, en este orden:** bienvenida al grupo → paso a paso de instalación con el link de opt-in → **17 privados uno por uno con su código** → aclaración al grupo sobre el error "Aplicación no disponible".
- **Códigos asignados: `HUELLA-01` a `HUELLA-10` y `HUELLA-13` a `HUELLA-19`.** Los 17 distintos, **sin repetir ninguno**. **Quedan libres `HUELLA-11`, `HUELLA-12` y `HUELLA-20`.**
- **Link de opt-in verificado funcionando ANTES de mandarlo.**

### Incidencia conocida — esperada, NO es un bug

**Varios testers ven "Aplicación no disponible" al abrir el link.** Dos causas, ninguna del lado de Huella:

1. El navegador está abierto con **otra cuenta de Google** (no la que se agregó al grupo).
2. **Propagación pendiente de Google**, que puede tardar más de lo esperado.

**Se resuelve solo con el tiempo, o cambiando de cuenta.** Ya se avisó al grupo con captura. **No hay nada que arreglar en el código ni en Play Console.**

### ⏭️ PENDIENTE INMEDIATO PARA MAÑANA (lunes 3 de agosto)

**Revisar Play Console → Estadísticas → instalaciones** para ver cuántos instalaron de verdad. **Cuando haya 12 o más, anotar esa fecha en el tablero de `/beta`** (campo "Anota el día que llegaste a 12 instalados").

**Esa fecha arranca el reloj de los 14 días y define cuándo termina la beta.** **HOY NO SE ANOTÓ porque todavía no hay dato real** — el reloj formal de Google **aún no parte**, aunque el lanzamiento ya se hizo. Son dos cosas distintas y conviene no confundirlas: hoy es el día 1 *del lanzamiento*, no el día 1 *de los 14*.

### 📌 Lección para el registro — el orden correcto del día de lanzamiento

**Agregar los correos al grupo de Google → esperar 20 minutos → recién ahí mandar el link.**

**La propagación de Google puede tardar más de 20 minutos**, así que el mensaje de instalación **debe incluir el aviso** de "si dice que no está disponible, espera y vuelve a entrar". Sin ese aviso, cada tester que se topa con la pantalla cree que la app está rota y escribe por privado.

---

## Sesión sábado 1 agosto 2026 — El tablero de `/beta` queda listo para correr la beta completa: meta a 20, seguimiento por tester, pasos de los días 7 y 10, y mínimo para lanzar separado de la meta

**Tres commits a `main`, todos en producción y todos sobre un único archivo (`src/pages/beta/BetaPage.jsx`):**

1. **`df9c130`** — `feat(beta): meta de correos a 20 y elimina paso de verificacion de canje`. QA de Daniel en incógnito (el contador mostraba `16/20` en ese momento).
2. **`439d974`** — `feat(beta): seguimiento por tester y pasos de los dias 7 y 10`.
3. **`7e78df5`** — `feat(beta): separa minimo para lanzar de la meta de correos`.

### 1. La meta pasó de 15 a 20 y los textos ya no repiten el número a mano

**Síntoma:** la meta estaba fija en 15 y ya se había pasado (16 correos), así que el contador mostraba `16/15`. Ruido diario en la pantalla que Daniel mira hasta el lanzamiento.

- **`META_CORREOS` subido de 15 a 20.** Es una **constante de módulo, no un dato de Supabase**: la tabla `tablero_beta` guarda solo el estado (testers, checks, fechas), ninguna configuración. Cambiar la meta es cambiar el código.
- **El número dejó de estar escrito a mano en los textos.** Estaba literal en tres lugares y por eso se desincronizaba: la historia de Instagram ("Busco 15 papás y mamás"), el paso del grupo de WhatsApp ("No esperes a los 15") y la última repetición de la historia ("La meta son 15"). Los tres ahora interpolan `${META_CORREOS}`.
- **No hizo falta convertir nada a función.** El objeto `M` de mensajes ya usaba template strings y ya interpolaba `${LINK}`, y `META_CORREOS` se declara antes que `M`. Se siguió el patrón que el archivo ya tenía; solo el texto del paso del grupo pasó de comilla doble a backtick.
- Verificado con grep: **no queda ningún `15` escrito a mano** en el archivo (los que aparecen son `fontSize: 15`).

### 2. Eliminado el paso rojo "l0" de verificación del canje

Era el pendiente que había quedado abierto el 28 jul. **Acusaba a un texto que ya estaba corregido** ("el mensaje de lanzamiento dice que el código va al crear la cuenta"), así que aparecía como alerta roja sin motivo.

- **Se eliminó el paso completo del arreglo de `calcularHoy()`.** El flujo ahora avanza directo de "Junta los correos que faltan" a "Agrega los Gmail al grupo de Google".
- **La clave `lanz.verificado` quedó huérfana a propósito** en el `jsonb` de `tablero_beta`. Sigue declarada en el objeto `inicial` y simplemente ya no se lee. **No se escribió migración para limpiarla:** es inofensiva y no vale una migración.
- Verificado antes y después: **cero referencias a `lanz.verificado` en el render**. La bandera `alerta: true` sigue en uso por el paso "El reloj está detenido", así que el estilo rojo no quedó muerto.

### 3. Las citas del bloque de canje quedaron literales

Los dos mensajes que se copian a WhatsApp citaban el bloque como `"Tienes un codigo de invitacion?"`, sin signo de apertura y sin tildes. El bloque real dice otra cosa.

- **Corregidas a la cita exacta: `"¿Tienes un código de invitación?"`**, idéntica a `src/components/CanjeCodigoBeta.jsx:73`, en el **paso a paso del lanzamiento** y en el **mensaje del código por privado**.
- El botón sigue siendo **"Activar"**, que ya coincidía.
- **Ojo con la nota del 28 jul:** ese día se dejaron esos dos mensajes *sin tildes* por pedido de Daniel. **Hoy se revirtió solo en la cita**, porque tiene que ser literal para que el tester encuentre el bloque. El resto de esos dos mensajes sigue sin tildes.

### 4. Códigos de beta verificados en Supabase — `HUELLA-01` NO estaba gastado

**Se revisó la tabla `codigos_beta` directo en Supabase: 20 códigos totales, los 20 libres.** El registro anterior decía que `HUELLA-01` se había gastado en el QA — **era falso**. **No se requiere ningún `UPDATE`.** Los 20 quedan disponibles para los 20 testers, que es justo lo que necesita la meta nueva.

### 5. Protocolo de la beta consolidado en un solo documento (fuera del repo)

- **`huella-protocolo-beta-android.md`, versión 1 de agosto**, en Google Drive. Es ahora **la única fuente**.
- **Reemplaza** la versión del 24 jul y la **guía vieja de la beta web con Tally**, que quedaba de cuando la beta iba a ser PWA con formulario.

### 6. Seguimiento por tester y pasos con cadencia para los 14 días (commit `439d974`)

**Síntoma:** el tablero acompañaba bien hasta el día 5 y después se quedaba mudo **nueve días seguidos** (el paso `obs` era una tarjeta estática del día 6 al 14). Además no había forma de saber **QUIÉN** se cayó, solo que el número total bajó.

- **Dos campos nuevos por tester:** `registro` (bool, cuarto toggle con etiqueta **"Registro"** en terracota) y `nota` (string, input de texto libre bajo la fila de toggles, placeholder "Anota lo que te diga"). Se guardan en el mismo estado que sincroniza a Supabase, así que entran en el `upsert` con debounce.
- **Detalle que importa para los testers ya guardados:** el input de nota usa `value={t.nota || ""}`. Sin ese fallback, los 16 testers que ya existían (sin el campo) habrían hecho que React convirtiera el input de no-controlado a controlado al escribir. El toggle `registro` no necesita defensa: `!!undefined` es `false`.
- **Las ventanas de `d1` y `d3` dejaron de cerrarse solas.** Antes `d1` exigía `dia <= 2` y `d3` exigía `dia <= 5`: si Daniel no alcanzaba a marcarlos dentro de la ventana, **el paso desaparecía sin haberse hecho** y quedaba en `false` para siempre. Ahora las condiciones son `!e.dias.revisado` y `dia >= 3 && !e.dias.pregunta` — persisten hasta que se marcan.
- **El paso `obs` se reemplazó por tres pasos con cadencia**, en la misma posición de la escalera:
  - **`d7` — "Clasifica a tus testers"** (`dia >= 7 && !e.dias.clasificado`): marcar el toggle Registro de los que sí están usando la app. La nota manda a correr la consulta de métricas en Supabase, **no a preguntar por WhatsApp**.
  - **`d10` — "Escríbele a los que se cayeron"** (`dia >= 10 && !e.dias.postmortem`): solo a los que NO tienen Registro marcado. Trae el mensaje nuevo `M.postmortem` para copiar.
  - **`obs` — "Observa, no empujes"** (`dia <= 14`): queda igual, como fallback para los días que no caen en los otros dos.
- **Claves nuevas en `e.dias`:** `clasificado` y `postmortem`, ambas en `false`.
- **Mensaje nuevo `M.postmortem`** ("vi que no la seguiste usando y quiero pedirte un favor raro: cuéntame por qué"), agregado también a la lista "Todos los mensajes". **Quedó sin tildes** por pedido de Daniel, igual que `lanzamiento` y `codigo`.
- **Consecuencia del cambio de ventanas, avisada y aceptada:** como `d1`, `d3`, `d7` y `d10` ya no caducan, si se llega al día 15 con alguno sin marcar, ese paso **sigue apareciendo antes** de los pasos de cierre. El tablero no deja cerrar la beta con seguimiento pendiente.

### 7. El mínimo para lanzar quedó separado de la meta (commit `7e78df5`)

**Síntoma:** el tablero obligaba a llegar a **20 correos exactos** para avanzar al lanzamiento. Está mal: **Google exige 12 instalados**, y los 20 son colchón, no requisito. Daniel tenía 16 y el tablero lo frenaba sin razón.

- **Constante nueva `MIN_CORREOS = 15`** — el mínimo para poder lanzar. **`META_CORREOS` se queda en 20** como meta ideal: es lo que sigue mostrando el contador (`17/20`) y lo que dicen los textos.
- **El paso `esperar` dejó de bloquear:** su condición pasó de `correos < META_CORREOS` a `correos < MIN_CORREOS`. Con 15 o más, el flujo avanza solo.
- **Paso nuevo `listo` — "Ya puedes lanzar cuando quieras"** (`correos < META_CORREOS && !e.lanz.decidido`), entre `esperar` y `l1`. No frena: informa que con lo que hay ya se cubren los 12 de Google y que el resto es colchón. Botón "Lanzo ahora" → marca `e.lanz.decidido`. **Si los correos llegan a 20, el paso no aparece nunca** y el flujo pasa directo a `l1`.
- **Clave nueva `lanz.decidido`**, en `false`. **Es irreversible desde la interfaz** (como todos los pasos del tablero); la única salida es "Borrar todo y empezar de nuevo".
- **Auditoría de textos:** se revisaron los 7 usos de `META_CORREOS`. **Ninguno afirmaba que hicieran falta 20 para lanzar**, así que no hubo que corregir nada por esa razón. Las condiciones de `h1` y `h2` se dejaron en `correos < META_CORREOS` a propósito: sigue teniendo sentido insistir con la historia hasta llegar a 20. **Sí se ajustó el texto de `esperar`**, que mostraba solo el 20 cuando la barrera real pasó a ser 15; ahora dice "Con 15 ya puedes partir".

### Estado de la convocatoria

- **17 correos de 20.** Ya se pasó el mínimo de 15, así que **el tablero permite lanzar cuando Daniel quiera**.
- **Fecha de lanzamiento acordada: domingo 9 de agosto.** *(Superado: el lanzamiento terminó siendo el **domingo 2 de agosto**, una semana antes. Ver el bloque del 2 de agosto, arriba.)*

### Deuda menor anotada, NO resuelta (decisión explícita de Daniel)

- **El autoasignador de códigos elige a ciegas.** `src/pages/beta/BetaPage.jsx:845` toma el primer código libre **según el tablero**, sin consultar la tabla `codigos_beta`. **Hoy no molesta porque los 20 están libres.** Se anotó como deuda y se dejó tal cual; el tema se resuelve aparte. **No se tocó `CODIGOS` ni el autoasignador en este commit.**

---

## Sesión martes 28 julio 2026 — Tablero de `/beta` sincronizado con Supabase + ruta real del canje en los mensajes a testers

**Un commit a `main`: `0562258` (`feat: sincronizar el tablero de la beta entre dispositivos`). En producción. QA aprobado por Daniel entre PC y celular.**

### 1. El tablero de `/beta` ahora vive en Supabase (antes: un solo navegador)

**Síntoma:** el tablero guardaba TODO en `localStorage`, así que lo anotado en el PC no existía en el celular. Daniel trabaja desde los dos.

- **Migración nueva: `supabase/migrations/008_tablero_beta.sql`** (corrida a mano por Daniel en el SQL Editor; "Success. No rows returned").
  - Tabla `public.tablero_beta`: **`user_id` es la PRIMARY KEY** (la base garantiza una sola fila por usuario), `estado jsonb`, `created_at`, `updated_at`. `ON DELETE CASCADE` contra `auth.users`.
  - El `jsonb` guarda **la misma forma que ya tenía en `localStorage`**, sin transformar nada: `historia`, `grupoCreado`, `lanz`, `fechaInicio`, `dias`, `cierre`, `testers`, `iphone`.
  - **RLS activa con policy `own_data`** (`auth.uid() = user_id` en USING y WITH CHECK) — **NO `family_data`**: este tablero es privado de Daniel, a diferencia de episodios/hitos/rasgos. La pareja de la familia no lo ve.
  - Sin trigger de `updated_at`, siguiendo la nota de `006_rasgos.sql`: la app lo setea a mano en cada `upsert`.
- **`src/pages/beta/BetaPage.jsx`** (único archivo de front tocado):
  - **Lectura en dos fases.** Primero la cache local (pinta al instante, evita ver el tablero vacío); después Supabase, que **reemplaza** lo local. **Regla de conflicto acordada con Daniel: al abrir la página gana Supabase.** Se descartó comparar timestamps por ser mucho código para un tablero de una sola persona.
  - **Escritura con debounce de 900 ms** vía `upsert` sobre la misma fila (nunca hay `DELETE`). El guardado local sigue siendo **inmediato**.
  - **Subida al ocultar la pestaña (`visibilitychange`) y al desmontar**, para no perder lo pendiente en el celular.
  - **`localStorage` se mantiene**, degradado a cache local.
- **Manejo de fallas — dos avisos rojos separados, a propósito:** el que ya existía ("No se guardó el cambio. Vuelve a tocarlo.") queda **intacto** para fallas del guardado local; el nuevo ("Se guardó en este dispositivo, pero no se pudo sincronizar. Revisa tu conexión.") cubre la falla de red. **Decir "no se guardó" cuando sí quedó guardado localmente sería mentira.**
- **Migración de los datos que ya existían:** se acordó que Daniel entrara **primero desde el PC** y tocara cualquier cosa, para que su lista real subiera antes de que el celular pudiera pisarla.

### 2. Dos mensajes para copiar mandaban a los testers a un campo que no existe

**Síntoma:** el paso a paso del lanzamiento decía *"Abre la app, regístrate, y pon el código de acceso"* — como si el canje estuviera en el registro. **En la app el canje NO está en el signup:** vive en el **Home** (`PanelPage`) y en `/cuenta`, en el bloque **"¿Tienes un código de invitación?"** con botón **"Activar"** (componente `src/components/CanjeCodigoBeta.jsx`, RPC `canjear_codigo_beta`). Quince personas iban a buscar un campo inexistente.

- Corregidos **los dos** mensajes afectados (el error estaba en dos, no en uno): el **paso a paso del lanzamiento** (paso 3, ahora "Crea tu cuenta y activa tu acceso", con la ruta real) y el **mensaje del código por privado**.
- Se mantuvieron **3 pasos** (no 4) para no desalinear la etiqueta "Mensaje de 3 pasos" que la página muestra sobre ese texto.
- Se conservaron los pasos 1 y 2 de instalación completos (aceptar ser tester en Play, esperar si Google se demora).
- Los dos mensajes quedaron **sin tildes** por pedido de Daniel. Ojo: **los otros 6 mensajes de la página SÍ tienen tildes** — quedó inconsistente a propósito, no es un descuido. Las tildes no rompen el copiado.
- **Revisados los otros 6 mensajes** (historia de Instagram, respuesta por DM, respuesta a iPhone, bienvenida al grupo, si alguien no instaló, la pregunta del día 3): **ninguno menciona dónde va el código**, quedaron intactos.

### Pendiente menor que quedó abierto

- ✅ **La advertencia de `/beta` quedó obsoleta — RESUELTO el 1 ago 2026 (commit `df9c130`).** El paso rojo "Verifica dónde se canjea el código" **se eliminó del tablero**. Detalle en el bloque del 1 de agosto (arriba).

---

## Sesión miércoles 1 – jueves 2 julio 2026 — Splash de arranque nuevo COMPLETO y verificado en producción

**Se reemplazó el loader de inicio (cita + skeletons) por un splash de marca. 3 commits a `main`: `b3eb6a0` (splash), `9b27b56` (fix de proporciones del escarabajo) y el docs de cierre.**

### El splash (commits `b3eb6a0` + `9b27b56`)

- **Qué reemplaza:** el loader de arranque de `ProtectedRoute` (que mostraba `CitaLoader` = cita + skeletons). Ahora un **splash de marca apilado**: escarabajo terracota con **latido** (112px de alto, anclado por altura), palabra **huella** (148px) y tagline **"Conoce la huella única de tus hijos"**, centrado óptico (`translateY(-28px)`) sobre fondo crema (`var(--color-bg)` = `#FAF3EC`, no `#FAF6F1`).
- **Comportamiento:** se mantiene hasta **auth resuelto + `dataLoaded` + mínimo 900ms**, y hace **fade de opacidad de 280ms** a la app real **sin skeleton intermedio** (gateado por `dataLoaded`, el mismo flag del fix del onboarding). Logged-out → `/login` sin esperar datos; usuario nuevo sin datos → el fade revela el onboarding. Reduced-motion: sin latido, mismo fade.
- **Solo el escarabajo late** (keyframe idéntico a los loaders de IA: scale 1→1.06, opacity 1→0.85, 1.6s ease-in-out); la palabra queda estable.
- **Componentes nuevos:** `SplashArranque.jsx` (+ `.module.css`) y `PalabraHuella.jsx` — los paths de la palabra se **extrajeron de `Logo.jsx` sin tocarlo** (viewBox recortado al bbox real, calculado con muestreo de béziers). Preload + `@font-face` local `'FrauncesSplash'` para el tagline (aditivo, sin quitar Google Fonts).
- **Los loaders de IA conservan sus citas** — `LoadingDignificado`, `PuertaUnoLoading`, `RespuestaIA` y el `CitaLoader` de `Layout` quedaron intactos. Solo se cambió el de arranque.
- **Fix de proporciones (`9b27b56`):** Design corrigió la spec a la proporción real del SVG. El `92px` original era el ancho del dibujo *tight*, pero el viewBox trae aire lateral → se ancla por **altura (112px, ancho auto ~122px)**. Se compensó el aire vertical con `margin-bottom: -3px` para que el espacio **óptico** pata→"h" quede en ~16px (no ~35px).

### Aprendizaje registrado (reutilizable)

- **El SVG del escarabajo (`Escarabajo.jsx`) trae AIRE en el viewBox `0 0 469.55 429.86`:** el dibujo real ocupa solo **~54% del ancho / ~68% del alto** (bbox medido: x 100.8–356.2, y 63.9–357.2). Consecuencia: **dimensionarlo por "%-de-contenedor" NO da tamaños visibles iguales** entre formas/tamaños distintos, y **anclar por ancho lo achica** (queda más chico de lo esperado). Regla: **anclar por altura y compensar el aire óptico**. Esto conecta directo con el pendiente abierto del escarabajo chico en el círculo café del Home (ver PENDIENTES → Deuda de diseño).

---

## Sesión martes 30 junio 2026 — Sistema de códigos de invitación de un solo uso COMPLETO y verificado en producción

**Se construyó el sistema de códigos de un solo uso para regalar Pro a los testers sin correr SQL a mano tester por tester. Motor (BD) + UI, verificado end-to-end en producción. 1 commit a `main` (`75e5428`); el motor de BD ya se había corrido en el SQL Editor de Supabase y quedó documentado en la migración `007_codigos_beta.sql`, incluida en el commit.**

### 1. Motor en Supabase (migración `007_codigos_beta.sql`)

- **Tabla `codigos_beta`** (`codigo` PK, `usado`, `usado_por` → `auth.users`, `usado_en`, `nota`, `created_at`) con **RLS activa y SIN policies** → intocable directo desde el cliente; el único acceso es vía la RPC.
- **RPC `canjear_codigo_beta(p_codigo)`** `security definer` con **`set search_path = public, pg_temp`** (endurecimiento estándar para una función que otorga acceso de pago). Canje **atómico**: `update ... where codigo = upper(trim(p_codigo)) and usado = false returning` → **imposible usar un código dos veces**. Distingue `no_auth` / `ya_usado` / `invalido`. En éxito escribe `plan_beta_hasta = now() + interval '45 days'` en `perfiles` y devuelve `jsonb { ok, plan_beta_hasta }`.
- **20 códigos** `HUELLA-01..20` cargados por SQL. Query de monitoreo (join a `auth.users` por email) en el bloque 4 de la migración.

### 2. UI — componente compartido `CanjeCodigoBeta.jsx`

- **Lógica de canje en el contexto** (`HuellaContext.canjearCodigoBeta`): valida vacío, llama la RPC, mapea `data.ok`/`data.error` a mensaje en español, y en éxito hace `reloadData()` para que `isPro()` cambie **al instante** sin recargar. **Una sola función**, usada en los dos lugares (cero lógica duplicada).
- **Componente único** insertado en **Home (`PanelPage`)** —bajo el CTA de registrar, la vía principal para que el tester pegue el código sin navegar— y en **Cuenta (`CuentaPage`)** —bajo el CTA de pago, como alternativa al pago—. Card con el idioma visual de `AnticipoRetratoCard` (tokens del design system, cero hex).
- **Visible solo para no-Pro**, con auto-gate DENTRO del componente que **evalúa el éxito ANTES que `isPro()`**: así, cuando el canje activa Pro, el componente no se desmonta en ese instante y la **confirmación en verde persiste** (si gateara el padre con `{!isPro()}`, el 🎉 nunca se vería). Por eso en `CuentaPage` va FUERA del bloque `{!pro}` existente.

### 3. Verificación end-to-end en producción

- **Canje exitoso** → activa Pro **al instante** vía `reloadData()`, sin recargar la página.
- **Código inválido** → rechazado ("Ese código no es válido. Revísalo y vuelve a intentar.").
- **Código ya usado** → rechazado; **probado bajando la cuenta a básica y sigue rechazando** (el código queda quemado en la tabla, no depende del plan del usuario).
- **Marcado correcto:** el código consumido queda con `usado_por` y `usado_en`.
- **Downgrade a básica funciona** (`plan_beta_hasta = null` → `isPro()` vuelve a false).

### Estado de los códigos

- **`HUELLA-01` quedó gastado en el QA.** Quedan **`HUELLA-02..20` (19 códigos)** para repartir a los testers.
- Con esto, activar el pase Pro ya **no requiere SQL tester por tester**: se le da un código y lo canjea él mismo.

### Aprendizaje de proceso

- Se mantuvo el protocolo: motor de BD primero (RPC probada en el SQL Editor, incl. que `no_auth` no consume el código) → diagnósticos de solo lectura antes de cada pieza de UI → diff revisado y aprobado por Daniel → commit (sin firma de Claude) → push → QA en producción.

---

## Sesión lunes 29 junio 2026 — Bug del onboarding RESUELTO + PWA nombre limpio en iOS + corrección de registro + FIX DE SEGURIDAD de permisos en `perfiles` · BETA lista para invitar al círculo cercano

**Sesión de pulido pre-beta: se cerró el último bloqueante real para invitar testers (el onboarding que reaparecía en iOS), se afinó la instalación de la PWA, se corrigió un error de registro en `ESTADO.md`, y se cerró un HUECO DE SEGURIDAD por el que cualquier usuario podía auto-otorgarse Pro desde el cliente. 3 commits a `main` (`4247aa8`, `0d05416`, `df5ddaa`), HEAD en `df5ddaa`; el fix de seguridad es cambio de BD (permisos), sin commit asociado.**

### 1. Corrección de registro — el formulario de Tally ya estaba publicado (commit `4247aa8`)

- La sección PRIORIDAD INMEDIATA (28 jun) listaba **"montar el formulario de Tally"** como bloqueante pendiente, pero el formulario **ya estaba construido y publicado desde el 21 jun** (`tally.so/r/KYO4EM`, confirmado en `huella-textos-beta.md`). Fue un **error de registro**.
- Se reescribió la sección para reflejar la realidad: formulario LISTO (no pendiente), y lo único previo al círculo cercano era verificarlo + tener a mano el SQL del pase Pro.

### 2. PWA — nombre limpio en iOS al instalar (commit `0d05416`, solo `index.html`)

- En iPhone, el nombre bajo el ícono de la PWA se toma del `<title>`, que era largo (`"Huella — Conoce y potencia a tu hijo"`).
- Se agregó **una línea** en el `<head>`: `<meta name="apple-mobile-web-app-title" content="Huella" />`. Ahora iOS propone **"Huella"** limpio por defecto al instalar.
- **Nota de QA:** en un iPhone que ya tenga la PWA instalada, hay que **borrarla y reinstalarla** para que tome el nombre nuevo (iOS lo cachea al momento de instalar); en instalaciones nuevas sale "Huella" directo.

### 3. BUG DEL ONBOARDING RESUELTO (commit `df5ddaa`, solo `HuellaContext.jsx` + `Layout.jsx`)

**Síntoma:** *hoy se ve → el onboarding (los 5 slides de instalación) reaparece en CADA apertura de la PWA en iOS aunque la cuenta ya esté completa; debería verse → solo la primera vez, nunca para un usuario que ya tiene perfil + hijo creados.*

**Diagnóstico (solo lectura, mapa de causas):**
- **Causa raíz A:** el flag de "completado" (`onboarding_done`) vivía **solo en `localStorage`**, sin respaldo en la cuenta. En la PWA standalone de iOS, `localStorage` se evicta (~7 días sin uso por ITP de WebKit) o no se comparte entre Safari y la instancia instalada → flag perdido → reaparece.
- **Causa raíz B:** la lógica del Layout **nunca miraba si el usuario ya tenía datos** (hijos, perfil). El único criterio era el flag (más la guarda de modo pareja). Un usuario con cuenta completa veía el onboarding cada vez que el flag se perdía.
- **Disparador (iOS):** la eviction/aislamiento del storage standalone. **Amplificador:** el default era `return true` (ante ausencia del flag, siempre mostrar).

**Arreglo robusto (opción B) — la fuente de verdad pasa a ser la CUENTA, no `localStorage`:**
- **`HuellaContext.jsx`:** se agregó el flag **`dataLoaded`** (init `false`; `true` en el `finally` de `loadUserData`, una vez; expuesto en el provider). Distingue **"todavía no cargué la cuenta"** de **"ya cargué y estos son los datos reales"** — `dataLoading` no servía porque vale `false` antes y después de la carga.
- **`Layout.jsx`:** la decisión dejó de ser un `useState` síncrono con `localStorage` y pasó a una **condición derivada**: `showOnboarding = dataLoaded && !yaTieneCuenta && !onboardingCerrado && (!family || family.role === 'owner')`, donde **`yaTieneCuenta = state.hijos.length > 0 || padreNombre poblado`** (el onboarding siempre crea un hijo vía `upsert_family_child`).
- **Anti-flash:** al decidir solo después de `dataLoaded`, el onboarding **nunca** aparece en el instante previo a saber si el usuario tiene hijo. Antes muestra la UI de carga que ya existía.
- **Latch local `onboardingCerrado`** (init desde `sessionStorage.dismissed`): cierra al instante al **completar** (puentea el frame entre el guardado y que `reloadData` traiga el hijo) y al **saltar** (mantiene la semántica de skip: callado esta sesión, reaparece en una nueva si sigue sin datos). NO decide quién es nuevo.
- **Se eliminó el `localStorage` del flujo del onboarding** (opción b): `onboarding_done` ya no se escribe ni se lee. **Sin señal muerta.**

**Garantías verificadas:**
- **Imposible que un usuario con hijo creado vuelva a entrar al onboarding**, sin importar el storage del dispositivo (eviction de iOS, reinstalar la PWA). Sin re-escritura de datos para lograrlo: es lectura del estado ya cargado.
- **Al completar el último slide no reaparece** (ni en la sesión ni al recargar): latch local cierra al toque; tras `reloadData`, `hijos.length > 0` lo mantiene cerrado para siempre.
- **Usuario nuevo legítimo (sin hijo): sigue viendo el onboarding una vez.**

**Lo que NO se tocó:** base de datos, `onboardingPersistor.js`, modo pareja (la guarda `role === 'owner'` se conservó en la condición; se eliminó el `useEffect` redundante que hacía `setShowOnboarding(false)`), el flujo de pago, ni el manejo de error al completar (si el guardado falla, no cierra y `yaTieneCuenta` sigue `false` → el onboarding persiste correctamente). Build OK. **Verificado en producción en el iPhone de Daniel.**

### 4. FIX DE SEGURIDAD — hueco de permisos en `perfiles` (cambio de BD, sin commit)

**Síntoma:** *hoy → cualquier usuario autenticado podía auto-otorgarse Pro escribiendo `perfiles.plan_beta_hasta` (o `plan = 'pro'`) directo desde el cliente (`supabase.from('perfiles').update(...)` en la consola del navegador), saltándose pago y futuros códigos; debería → solo el backend (pagos) y la RPC de canje pueden escribir esas columnas.* Se descubrió al auditar el prerrequisito de seguridad del sistema de códigos de invitación.

**Causa raíz:** la policy RLS de `perfiles` era `own_data` `FOR ALL using (auth.uid() = user_id) with check (auth.uid() = user_id)`. **La RLS de Postgres protege por FILA, no por COLUMNA** → esa policy deja que el dueño de la fila escriba **cualquier** columna, incluidas `plan` y `plan_beta_hasta`. El hueco **ya existía** (no lo introdujo nada de esta sesión); el sistema de códigos solo lo habría hecho evidente.

**Hallazgos extra de la auditoría (contra la base viva):**
- **`anon` también** tenía UPDATE sobre `plan`/`plan_beta_hasta` (no solo `authenticated`) → un usuario sin login con permisos de escritura, sin razón legítima.
- **`authenticated` y `anon` tenían DELETE y TRUNCATE** sobre `perfiles`. **TRUNCATE era el riesgo MAYOR: no está contenido por RLS** (Postgres no aplica RLS a TRUNCATE, se rige solo por el privilegio de tabla) → quien lo alcanzara podía **vaciar la tabla `perfiles` entera** (todos los perfiles + planes). DELETE sí lo contiene la RLS a la propia fila, pero no tiene uso legítimo desde el cliente (el borrado de cuenta va por la RPC `delete_user()`).

**Fix aplicado (column-grants, corrido en el SQL Editor; cambio de permisos de BD, NO de código → sin commit):**
- Se **revocó** INSERT/UPDATE/DELETE/TRUNCATE amplios de `authenticated` y **toda escritura** de `anon` sobre `perfiles`.
- Se **devolvió a `authenticated`** INSERT/UPDATE **solo** en `user_id, nombre, intenciones, contexto_inicial`. **`plan` y `plan_beta_hasta` quedaron FUERA** del alcance del cliente. (`user_id` se incluye porque el upsert lo manda; la policy `own_data` `with check` impide reasignarlo a otro usuario, así que no permite escalar.)
- **SELECT de `authenticated` intacto** (leer el propio estado Pro está bien; lo que se cierra es escribirlo).

**Por qué NO se rompe nada:**
- **Onboarding y edición de nombre intactos** — el cliente solo escribe `user_id/nombre/intenciones/contexto_inicial` (`persistirPerfilOnboarding` y el upsert de nombre en `HuellaContext`). **Verificado: cambiar el nombre del padre en la app sigue guardando OK.**
- **Pagos intactos** — los endpoints de Mercado Pago (`mp-webhook.js`, `mp-verificar-suscripcion.js`) escriben `plan` con `SUPABASE_SERVICE_ROLE_KEY`, un rol aparte con bypass de RLS y grants → los revokes no lo tocan.
- **La futura RPC de canje** (`security definer`, corre como owner) podrá escribir `plan_beta_hasta` sin estorbo.

**Resultado:** el único camino para activar Pro es ahora **backend (pago) o RPC `security definer` (código)**; el cliente ya no puede. De paso se cerró el riesgo de TRUNCATE/DELETE sobre `perfiles`.

### 5. Sistema de códigos de invitación de un solo uso — PLANIFICADO, no construido

Para no activar Pro tester por tester con SQL a mano, se diseñó un sistema de **códigos de un solo uso**. **El fix de seguridad de arriba era su prerrequisito y YA está hecho.** Queda **planificado, NO construido**:
- **Tabla `codigos_beta`** (`codigo` PK, `usado`, `usado_por`, `usado_en`, `nota`), con **RLS activa y sin policies** → intocable directo; solo accesible vía RPC.
- **RPC `canjear_codigo_beta(p_codigo)`** `security definer`: marca el código atómicamente (`update ... where codigo = X and usado = false returning` → imposible usarlo dos veces) y activa el pase **Pro de 45 días** (`plan_beta_hasta = now() + 45 días`).
- **UI:** sección de **canje en `CuentaPage`** (donde ya vive el estado de plan) + **card CTA en el Home (`PanelPage`)** visible solo para no-Pro. Tras canjear OK → `reloadData()` para que `isPro()` cambie al instante. **Decisión tomada: NO compuerta en el onboarding** (menos invasivo).
- **30 códigos a mano** (`HUELLA-01` … `HUELLA-30`, legibles, los dicta Daniel), insertados por SQL; monitoreo de uso con un `SELECT` join a `auth.users` por email.

### Estado de la beta al cierre

- **Lista para invitar al círculo cercano.** Ya no queda bloqueante de producto: formulario publicado y verificado, onboarding arreglado, PWA instalable con nombre limpio, guía operativa completa (`huella-guia-beta.md`), mensaje de WhatsApp con instrucciones de instalación (iPhone Safari + Android Chrome) listo.
- **Pendiente solo antes de invitar a DESCONOCIDOS** (no bloquea al círculo cercano): separar la bandeja de `contacto@huella.lat` de la cuenta personal + la consent screen de Google OAuth.

### Aprendizaje de proceso reforzado

- Daniel mantuvo el protocolo: diagnóstico de solo lectura → plan aprobado → implementación → diff revisado → commit con `commitmsg.txt` (sin firma de Claude) → push → QA visual. El QA visual se hizo en el iPhone real **después** de pushear, no mirando producción antes de desplegar.

---

## Sesión domingo 28 junio 2026 — FASE 2 del gancho · Capa 3 (la pista honesta) COMPLETA · FASE 2 COMPLETA de punta a punta

**Sesión de la Capa 3 de la Fase 2 ("la revelación incompleta"): mostrarle al papá la pista honesta de que "hay algo en camino" cuando hay un rasgo emergente, SIN revelar contenido. Con esto la Fase 2 queda COMPLETA end-to-end: detecta (Capa 1), persiste y gradúa (Capa 2), muestra la pista (Capa 3). 2 commits pusheados a `main`, HEAD en `829f427`.**

### Qué se hizo (solo `PanelPage.jsx`)

- **Tercer estado de la `AnticipoRetratoCard` (Home).** Prioridad de la card: **candidato > emergente > progreso** (se muestra UNO). Cuando NO hay candidato pero SÍ hay un rasgo emergente para el hijo activo, aparece la pista honesta: eyebrow **"Algo se está dibujando"**, título **"El retrato de {nombre} está creciendo"**, subtexto **"Huella está notando algo. Necesita unos momentos más para mostrártelo."** Los estados candidato ("Huella notó algo nuevo") y progreso ("N de 12 rasgos") quedaron **sin cambios**.
- **Acento lavanda** en eyebrow y chevron del estado emergente: `var(--color-accent-blue)` (`#6C8EF5`), para diferenciarla del candidato (terracota `--color-primary`) y de la card verde de análisis. El token literal `--color-accent-lavender` es **otro** lila (`#CAC0E0`) y **NO se usó**: se eligió `--color-accent-blue` por ser el hex exacto del mockup, sin hardcodear hex y con dark override ya cubierto.
- **`hayEmergente`** calculado en `PanelPage` (`.some` por `estado === 'emergente' && r.hijoId === hijo?.id`); la condición de render de la card se amplió a `(rasgoCandidato || hayEmergente || rasgosConfirmadosCount > 0)`.
- **Título a 2 líneas solo en el estado emergente** (clamp `-webkit-box` + `WebkitLineClamp: 2`), porque el `whiteSpace: nowrap` heredado lo truncaba con "…". Candidato y progreso siguen en **una** línea.
- **2 commits pusheados:** `c74ad31` (la pista · 3er estado) y `829f427` (fix del título a 2 líneas). Validado en **producción** con una fila emergente sintética de prueba para Pipa (insertada para el QA y **borrada después; tabla limpia**).

### Decisiones de diseño

- **La pista NUNCA usa la palabra "patrón".** Eso evita confundirla con la card verde `CTAAskHuella` ("¿Qué patrón ves esta semana?"), que analiza los **episodios de la semana** — concepto distinto del **retrato/rasgos**. Las dos viven en el mismo scroll del Home y comparten el escarabajo de marca, así que es el lenguaje el que las separa.
- **Solo el Home, NO la ficha del hijo (`HijoPage`).** La pista es un **gatillo de retorno** y se mantuvo el cambio acotado a un solo archivo. `HijoPage`, el contexto y el motor no se tocaron.

### Pendientes anotados (no para ahora)

- **PULIDO DEL ESCARABAJO:** el símbolo del escarabajo (ej. el del círculo café en la ficha del hijo y en la card del Home) se ve poco prolijo. Merece una **pasada de diseño aparte, posiblemente con Claude Design**. Daniel lo marcó explícitamente.
- **APRENDIZAJE DE PROCESO (para no repetir):** el QA visual debe hacerse en **localhost** o **DESPUÉS de pushear a producción**, NUNCA mirando huella.lat antes de desplegar. En esta sesión se perdió tiempo intentando verificar en producción cambios que solo existían en local. Para verificar UI: o se corre el dev server local, o se pushea primero.

---

## Sesión domingo 28 junio 2026 — FASE 2 del gancho · Capa 2 (persistencia y graduación) COMPLETA y en producción

**Sesión enfocada en la Capa 2 de la Fase 2 ("la revelación incompleta"): persistir los rasgos emergentes que el motor ya detecta (Capa 1) y graduarlos a `candidato` cuando juntan su 3er momento, SIN tocar todavía la UI. 3 pasos con QA antes de cada commit; nada se commiteó ni pusheó sin OK de Daniel. 4 commits pusheados a `main`, HEAD en `f07f9f3`.**

### Los 3 pasos (con QA entre cada uno)

- **Paso 1 — reforzar `normalizarTitulo` (commit `f397479`, `HuellaContext.jsx`).** Sobre lo que ya hacía (trim, minúsculas, quitar tildes) se agregaron **dos** normalizaciones: **colapsa espacios internos múltiples a uno** (`\s+ → ' '`) y **quita puntuación de borde** (`. , ; : " '` al inicio/final; NO la interna). Prepara el dedup para que un emergente **se reencuentre consigo mismo entre sesiones** sin generar filas duplicadas del mismo patrón. **QA:** 4 pares de títulos por la función real → **doble espacio interno y punto final ahora emparejan**, el control de idénticos sigue emparejando, y el **reordenamiento de palabras** ("Las despedidas le generan angustia" vs "Le angustian las despedidas") **sigue SIN emparejar a propósito** (queda para la Fase B del prompt, no es objetivo acá).

- **Paso 2 — la rama INSERT lee `esEmergente` (commit `012e2ab`, `HuellaContext.jsx`).** El INSERT de `guardarRasgosDetectados` ahora **setea `estado` explícito** según el flag del motor: `'emergente'` (1-2 momentos) o `'candidato'` (3+), en vez de caer siempre al default `'candidato'` de la tabla. **QA:** (a) **traza del flag confirmada leyendo el flujo** — `esEmergente` se adjunta en `anthropic.js` (`{ ...r, evidencia, esEmergente }`), **sobrevive el `.filter`** (que no re-mapea) y el `return { rasgos }`, y llega **directo** al call site (`rasgosDetectados: resultado.rasgos`, sin mapeo intermedio ni `dbRasgoToApp`) hasta el `for` del guardado; (b) **simulación de la rama INSERT** con el shape real y los rasgos que Capa 1 detectó de Pascualito → los **3 emergentes construyen `estado: 'emergente'`** y los **2 candidatos `'candidato'`**, sin escribir en la tabla.

- **Paso 3 — la rama UPDATE gradúa (commit `f07f9f3`, `HuellaContext.jsx`).** El UPDATE (que ya fusionaba evidencia y recalculaba `evidencia_count` en prod hace meses) ahora calcula `estadoNuevo` y **gradúa `emergente → candidato` cuando la evidencia fusionada llega a 3 momentos**. Regla exacta e innegociable: **solo si `previo.estado === 'emergente'` Y `fusion.length >= 3`**; en cualquier otro caso se mantiene `previo.estado`. **`confirmado` y `descartado` NUNCA revierten, `candidato` no retrocede** — una sola dirección. **QA:** (a) Daniel insertó una **fila sintética emergente real** que **pasó el CHECK** → confirma que la tabla acepta `'emergente'` contra la base viva; (b) por el riesgo de **falso OK** (RLS bloquea el anon key del runner + el `try/catch` traga el error del UPDATE → reportaría "ok" sin haber escrito), **NO se usó runner autenticado**; en su lugar se **extrajo la expresión `estadoNuevo` del archivo (verbatim, sin re-tipearla)** y se corrió contra **10 casos** (`emergente×{1,2,3,5}`, `candidato×{2,4}`, `confirmado×{1,5}`, `descartado×{2,6}`) → **todos coinciden** con la tabla de transiciones. La fila de prueba **`2819d817` se borró después; tabla limpia.**

### Decisiones de diseño registradas

- **La graduación vive solo en el UPDATE y es unidireccional (`emergente → candidato`).** Respeta el principio de la Fase 2: **la claridad solo crece, nunca retrocede** (lo que el papá confirmó o descartó jamás vuelve atrás; un candidato no recae a emergente).
- **La identidad del rasgo se ancla en `familia` + título normalizado.** Es **frágil ante el reordenamiento de palabras** del modelo (el paso 1 cubre espacios y puntuación, no el orden). La solución robusta —un **slug semántico estable** del patrón— queda **anotada para la Fase B del prompt; NO se hizo acá**.

### Lo que NO se hizo (pendiente, próxima sesión)

- **Capa 3 — la pista honesta:** mostrarle al papá que **"hay algo en camino"** sin revelar el contenido (Home y/o retrato). Es el **primer punto donde el papá ve algo de la Fase 2**. Arranca con **diagnóstico de terreno propio**.
- **IMPORTANTE:** la **Capa 2 es invisible en producción**. Los emergentes se **persisten y gradúan en silencio**, pero el papá **todavía no ve ninguna pista**. Eso es la Capa 3.

### Estado del deploy

- `git push origin main` confirmado: `22a392d..f07f9f3`, `origin/main` al día en **`f07f9f3`**. Los 4 commits: `f397479` + `012e2ab` + `f07f9f3` (Capa 2) + el docs `2d25be2` del cierre de Capa 1 que había quedado local. **La verificación de que Vercel tomó el deploy sin error queda del lado de Daniel** (Deployments → Ready): desde la sesión no se puede leer el status (sin `gh` ni token de Vercel).

---

## Sesión sábado 27 junio 2026 — FASE 2 del gancho · Capa 1 (motor) COMPLETA y en producción

**Sesión enfocada en la Capa 1 de la Fase 2 del gancho de retención ("la revelación incompleta"): que el motor capture los patrones emergentes de 1-2 momentos que hasta hoy se botaban, SIN tocar todavía el guardado ni la UI. Commit `22a392d`, pusheado a `main`.**

### Migración del CHECK de `rasgos` — 4 estados

- La tabla `rasgos` ahora admite **4 estados**: `candidato`, `confirmado`, `descartado` y el nuevo **`emergente`**. La migración del CHECK del campo `estado` se corrió y se verificó **contra la base viva** (la aplicó Daniel en el SQL Editor). Reemplaza el CHECK anterior `estado IN ('candidato','confirmado','descartado')`.

### `detectarRasgos` — nuevo umbral (commit `22a392d`, solo `src/services/anthropic.js`)

- **Prompt `PROMPT_DETECTAR_RASGOS`:** se bajó el umbral de **3 → 1 momento**. La regla dura 1 ya no exige un mínimo; ahora pide proponer todo patrón real y coherente aunque tenga 1-2 momentos, descartando solo el ruido (coincidencias sueltas, suposiciones sin respaldo, rasgos genéricos). El umbral de 3 también vivía en la **regla 3** ("mínimo 3 ids") y en la **calibración de confianza de la regla 4** → se ajustaron las tres para que el piso de 3 ya no viva en el prompt.
- **Filtro (`.map`/`.filter`):** se reemplazó `if (r.evidencia.length < 3) return false` por clasificación vía flag **`esEmergente = evidencia.length < 3`** (1-2 momentos = emergente; 3+ = candidato). El filtro ahora descarta **solo evidencia 0** (ningún momento real que ancle = ruido). **Corte de familia válida y de confianza 0-1: INTACTOS.**
- **Decisión de diseño registrada:** la clasificación emergente vs candidato la hace el **CÓDIGO por conteo de evidencia**, NO el modelo por etiqueta. El modelo sigue devolviendo el mismo shape `{familia, titulo, evidencia, confianza}`; `esEmergente` lo agrega el post-proceso. El guardado leerá ese flag en la Capa 2.

### QA con datos reales — el motor cuenta bien la evidencia

- Validado con un **runner temporal de solo lectura** (vivió en la raíz, ya borrado, **no commiteado**) que carga la función real vía Vite (`ssrLoadModule`, resuelve `import.meta.env` desde `.env`) e **invoca el handler real de `api/anthropic.js`** con un req/res mock → la llamada a la IA es idéntica a producción (mismo `SYSTEM_PROMPT` clínico, modelo `claude-sonnet-4-5`, forma `{ text }`). Datos de **Pascualito** exportados por SQL (la anon key no puede leer por RLS): **71 episodios + 30 hitos**. **1 sola llamada**, sin escribir en la tabla.
- **Resultado: 9 rasgos = 6 candidatos (3+) + 3 emergentes (1-2)**, todos patrones reales y específicos del niño, **sin ruido vago**. Candidatos sólidos: la **angustia de separación** en las despedidas (`cuesta`, 5 momentos) y el **calmarse solo tras frustrarse** (`fortalezas`, 7) → confirma que el conteo de evidencia funciona, sin sub-conteo. Los 3 emergentes ("tolera límites mejor que antes" 2; "la frustración en el juego con otros lo desregula" 1; "enfrenta desafíos que antes le daban miedo" 1) anclan en momentos concretos.

### Lo que NO se hizo (pendiente Capa 2 y 3, próxima sesión)

- **Capa 2 — cerrar el bucle:** persistir el emergente y, cuando junta su **3er momento**, **graduarlo a `candidato`** (UPDATE de `estado` + evidencia, **NO** INSERT duplicado). Toca `guardarRasgosDetectados` → ahí sí se **escribe en la tabla**. **Arrancar con el diagnóstico del dedup** antes de tocar nada.
- **Capa 3 — pista honesta:** mostrar al papá que "hay algo en camino" (Home y/o retrato) **sin revelar el contenido**.
- **IMPORTANTE:** hoy los emergentes se **DETECTAN pero NO se guardan ni se muestran**. La app **no cambia visiblemente** todavía.

### Nota técnica para la Fase B del prompt (no para ahora)

- `detectarRasgos` analiza solo los **40 momentos más recientes** (`slice(0,20)` episodios + `slice(0,20)` hitos), **idéntico a producción**. Por eso los rasgos detectados tiran a lo reciente. **Queda anotado para la auditoría de prompt (Fase B); no es bug.**

### Estado del deploy

- `git push origin main` confirmado: `origin/main` quedó al día en `22a392d`. **La verificación de que Vercel tomó el deploy sin error quedó del lado de Daniel** (revisar Deployments → Ready): desde la sesión no se pudo leer el status (sin `gh`, API anónima de GitHub con rate limit, sin token de Vercel).

---

## Sesión domingo 21 junio 2026 — Bienvenida del usuario nuevo VERIFICADA en prod + decisiones de la BETA

**Sesión de cierre del rediseño de bienvenida (ya confirmado en producción) y de toma de decisiones para armar el plan de la BETA. Sin nuevos cambios de código fuera de lo ya desplegado.**

### Bienvenida del usuario nuevo — rediseño CERRADO y VERIFICADO en producción (commits `61784f2` + `c2340d0`)

**El rediseño que se había desplegado el 18 junio con QA pendiente quedó CONFIRMADO en producción.**

- **QA visual aprobado en prod:** al registrar un momento, el **paso 1 muestra su check** y el **escarabajo móvil salta al paso 2**, tal como se diseñó. La tarjeta sigue desapareciendo al llegar a 3 episodios.
- Recordatorio de qué incluyó el rediseño: `BienvenidaModal` **eliminado** (antes el usuario nuevo veía el mismo mensaje 3 veces) y `GuiaPrimerosPasos` rediseñada (tarjeta blanca, barra de progreso de 3 segmentos, checks en terracota, copy más natural, y el **escarabajo de marca marca el paso actual y se mueve** al registrar). Flujo final: Onboarding (5 slides) → Home con la guía, **sin modal intermedio**.

### BETA — decisiones tomadas esta sesión

**Definimos objetivo, métricas, reclutamiento y orden de ataque para armar el plan de la beta.**

- **Objetivo: validar tres dimensiones juntas, con jerarquía.**
  - **Retención = métrica PRINCIPAL, conductual:** el tester registra **≥1 momento en las primeras 48h** y **vuelve a registrar en una segunda semana**. Con N chico se lee como **"X de Y vuelven"** (no porcentajes finos).
  - **Calidad de la guía IA = secundaria:** se mide conductual + cualitativo.
  - **Disposición a pagar = secundaria:** se mide por **ENCUESTA DE SALIDA, no por conversión real.**
- **Razón estructural:** como se **regala Pro a todos los testers**, no se puede observar pago real → por eso la disposición a pagar va por encuesta, no por conversión.
- **Reclutamiento:** **10-15 testers**, mezcla de **círculo cercano + desconocidos reales**. Se **etiqueta el origen** de cada tester para **pesar distinto el feedback** (el del círculo cuenta menos como señal honesta).
- **Orden de ataque restante:** (a) **mecánica para regalar Pro** [build, **no existe hoy**]; (b) **formularios + términos + canal de feedback**; (c) **métricas / observabilidad**.

### PRÓXIMO PASO BETA — mecánica "pase de beta"

- **Qué es:** un **"pase de beta"** que **otorga Pro completo sin pago**, con **fecha de expiración**.
- **Diseño clave:** se chequea **ANTES del estado de Mercado Pago**, para **no chocar con la lógica de pagos ni de downgrade**.
- **Estado: PENDIENTE.** Antes de diseñar e implementar hace falta un **diagnóstico de cómo se resuelve Pro hoy**: tabla/columna/función, webhook de MP y paywalls del frontend.

### Pase de beta — CONSTRUIDO y VERIFICADO en producción (commit `843827b`)

- Mecánica para regalar Pro sin pago. Se agregó la columna `plan_beta_hasta` (timestamptz) a la tabla `perfiles` en Supabase.
- `isPro()` en `src/context/HuellaContext.jsx` ahora devuelve `true` también si `plan_beta_hasta` es una fecha futura, SIN tocar la columna `plan` ni la lógica de Mercado Pago (carril aislado: MP solo lee/escribe `plan`).
- **Vence solo:** cuando la fecha pasa, el usuario vuelve a Free sin cron ni acción manual.
- **QA en producción OK en ambas direcciones:** con fecha futura una cuenta free muestra "Huella Pro — Activo"; con fecha pasada vuelve a "Plan Gratuito".
- **Cómo otorgar un pase a un tester:** `update public.perfiles set plan_beta_hasta = now() + interval 'N days' where user_id = '...'`. Para quitarlo: poner `null` o una fecha pasada.

### Deuda registrada: `schema.sql` desfasado de la base real

- La tabla `perfiles` viva tiene columnas que NO están en `schema.sql`: `plan`, `contexto_inicial`, `intenciones` y ahora `plan_beta_hasta`. Pendiente sincronizar `schema.sql` con la base en una sola pasada (falta confirmar el tipo de elemento de `intenciones`, que figura como `ARRAY`).

### Próxima pieza de la beta

- Formularios + términos + canal de feedback. Después: métricas/observabilidad.

### Infraestructura de la beta — formulario PUBLICADO + invitación CERRADA + placeholders RESUELTOS

- **Formulario de inscripción: CONSTRUIDO completo en Tally (7 preguntas) y PUBLICADO.**
  - **Link (puerta de entrada de la beta): https://tally.so/r/KYO4EM** ← guardar este link.
  - 7 preguntas: nombre; correo que debe coincidir con la cuenta; edad del hijo; más de un hijo; motivación; compromiso de ~3 semanas; consentimiento de términos.
  - El link a los **términos** quedó como **bloque de texto visible** apuntando a `huella.lat/terminos#privacidad`.
- **Mensaje de invitación (WhatsApp, 1 a 1): CERRADO.** Quedó **una sola versión** en tono cercano: abre con **"Soy Daniel, fundador de Huella"**, formato **pitch breve**, **"funciona así" + ejemplo de la pataleta**, y núcleo de **unicidad** ("mientras más registras, más se afina a tu hijo en particular, no consejos de manual"). **Texto final en `huella-textos-beta.md`.**
- **Placeholders de los textos: RESUELTOS.**
  - **Precio Pro = `CLP 9.990/mes` y `CLP 99.900/anual`** (confirmado por Code en `api/mp-crear-suscripcion.js`; mostrado en `UpgradeModal` y `CuentaPage`).
  - **Correo oficial = `contacto@huella.lat`.**
  - **Link privacidad = `huella.lat/terminos#privacidad`.**
- **Términos de la beta** (texto corto y humano; promete que no se vende ni se cobra sin avisar; linkea la privacidad) y **encuesta de salida** (mide disposición a pagar con el precio real + experiencia + calidad de la guía IA): textos definidos. Falta **montar la encuesta de salida en Tally**.
- **Herramienta del formulario:** **Tally** (gratis, brandeable, exporta a Google Sheets), NO Google Forms, por la primera impresión premium.
- **Canal de feedback: PASIVO** (formulario abierto + correo oficial), NO grupo de WhatsApp, para no inflar artificialmente la retención (métrica principal). Invitar 1 a 1 está bien; arrear en grupo no.
- El **origen de cada tester** (cercano vs. desconocido) se etiqueta a mano en la hoja de respuestas, no se pregunta.

### Verificación legal (privacidad) — OK + correo de contacto actualizado

- La app tiene una sola página legal: `/terminos` (`src/pages/legal/TerminosPage.jsx`), que combina Términos + Privacidad. La privacidad es la "Parte 2", anclada en `#privacidad`.
- Contenido consistente con lo que promete la beta: no vende datos, no publicidad, solo Supabase/Anthropic/Vercel como infraestructura, con sección dedicada a datos de menores (Ley 19.628).
- El link de privacidad en los términos de beta apunta a `huella.lat/terminos#privacidad`.
- **Correo de contacto del responsable: cambiado de gmail personal a `contacto@huella.lat`** (Tarea A de esta sesión, constante `CONTACTO` en `TerminosPage.jsx`, cubre las 5 apariciones visibles). El nombre del responsable (Daniel Undurraga R.) no se tocó. **Nota:** queda una aparición del gmail personal FUERA de la legal en `src/pages/perfil/PerfilPage.jsx:193` (mensaje de error al eliminar cuenta) — pendiente decidir si se cambia.

### Métricas de la beta — DECIDIDAS (enfoque manual, sin panel)

- **Enfoque manual** (sin dashboard), apropiado para 10-15 testers.
- **Consulta SQL sobre `episodios`** que mide actividad por la columna **`fecha`** (OJO: NO `created_at`), cruzando `auth.users.email` con `perfiles` (`auth.users.id = perfiles.user_id`).
- **Entrega por tester:** `entro_el`, `total_registros`, `registros_primeras_48h`, `registros_2da_semana` (**métrica reina**), `ultimo_registro` y `pase_activo`.
- **Filtra** testers con `plan_beta_hasta` no nulo.
- **Guardada para usarse cuando haya testers reales.**

### Documentos de la beta — CREADOS (fuera del repo, en el Drive de Daniel)

- **`huella-textos-beta.md`:** los 4 textos sin placeholders (invitación, formulario, términos de beta, encuesta de salida).
- **`huella-guia-beta.md`:** manual operativo — objetivo, recorrido del tester, a quién invitar, reglas de WhatsApp (invitar-y-no-empujar), activar el pase Pro por correo (con `SELECT` antes del `UPDATE`), la consulta de métricas con cómo leerla, cierre y checklist.

### PRÓXIMO TEMA GRANDE (sesión aparte) — "gancho de dopamina" / retorno

- **Síntoma percibido por Daniel:** la app, siendo hermosa y profunda, puede sentirse **plana** frente a apps que hacen volver.
- **Intuición clave:** NO es una recompensa puesta encima, es **ESTRUCTURAL del producto** — el flujo, qué pasa **después de registrar**, qué motiva a volver.
- **Cómo abordarlo:** como **rediseño de producto**, no como feature suelta. **Conecta directo con la métrica reina (retención).**

### Gancho de retención generativo (ROADMAP definido, por construir)

- **Documento estratégico creado** (vive en el Drive de Daniel): `huella-gancho-retencion.md`.
- **Principio:** gancho **GENERATIVO** (la persona vuelve porque gana algo real sobre su hijo), no extractivo tipo TikTok/IG. **Combustible:** la unicidad que se profundiza con cada registro.
- **Investigación base:** Calm (recordatorio diario = 3x retención; registrar + feedback más potente que registrar solo); Duolingo (rachas crean hábito pero pueden generar uso hueco; el valor real es lo que las salva); efecto Zeigarnik (bucles abiertos hacen volver, pero hay que cerrarlos con valor real); apps de crianza/uGrow (insights motivan a seguir registrando, 77%; ver patrones en el tiempo da sensación de control).
- **MARCO ANTI-VERGÜENZA (línea roja, sobre todas las fases):** nada de rachas que se rompen, ni "llevas X días sin registrar", ni puntajes que juzguen. El gancho es por **deseo de saber más del hijo**, nunca por culpa ni miedo a perder. Hallazgo crítico: en crianza, los datos pueden volverse un reflejo del valor del padre y generar juicio/aislamiento; Huella debe evitarlo siempre.
- **Orden de ejecución** (vamos por fases, ninguna se descarta):
  - **Fase 1 (base): "El retrato que madura"** — sección donde el papá ve crecer el retrato cualitativo de la huella única de su hijo con cada registro (rasgos confirmados, patrones emergentes), no un porcentaje frío.
  - **Fase 2: "La revelación incompleta"** — que la orientación abra bucles honestos ("noto algo en las tardes de Lucas, necesito 2 momentos más") en vez de cerrar todo de golpe.
  - **Fase 3: "La notificación noble"** — gatillo de retorno que siempre lleva valor ("vi algo sobre María"), nunca culpa. Depende de resolver si las push del `NotifBanner` son reales o solo UI.
  - **Fase 4: "El loop de la pareja"** — aprovechar el registro compartido para que la pareja sea motivo de retorno suave.
- **PRÓXIMO PASO:** aterrizar la **Fase 1** en algo construible.

#### FASE 1 ("El retrato que madura") — diseño APROBADO (handoff de Claude Design revisado)

Specs completas guardadas en `huella-gancho-retencion.md` (Drive de Daniel). Decisiones cerradas:

- **Ubicación:** el retrato vive en la **pantalla del niño (`/hijo`)**, renovándola (hoy muestra stats + racha; se reemplaza por el retrato). Se entra **tocando el avatar del header**. **Card de anticipo en el Home** debajo del CTA Registrar, antes del resumen semanal, que lleva a `/hijo` (es el **gatillo de retorno**). **NO** se agrega 6º ítem al bottom nav. **NO** se pisa Estrategias. Se **ELIMINA la racha de `/hijo`** (viola el marco anti-vergüenza).
- **Estructura del retrato:** cabecera mocha (foto que se revela + rastro del escarabajo + nombre + píldora de nitidez sutil) + **card de propuesta de rasgo** + **4 familias en orden fijo** (mueve, fortalezas, cuesta, calma). En la card de propuesta, **reemplazar la "h" del avatar por el escarabajo** (Code ya tiene el SVG inline).
- **Motor de rasgos (lógica):** los rasgos maduran en **SILENCIO**; el papá solo ve un rasgo con **evidencia sólida** (opción A, protege la credibilidad). **Confirma el PAPÁ** (Huella propone, no afirma). Si rechaza ("no lo veo en él"): se deja de lado **sin penalizar**, no reaparece salvo evidencia mucho más fuerte. La **nitidez solo crece o se mantiene, nunca reversible**; llega a 100% de lo entendido hoy, pero el mapa se expande porque el niño crece.
- **Specs clave:** 5 niveles de nitidez vía **filtro CSS** (blur/grayscale/saturate/contrast), transición `filter 1.2s ease` al confirmar; **colores de familia** (mueve naranja, fortalezas verde, cuesta lavanda **jamás rojo**, calma mocha); **rastro del escarabajo** en arco ~314° con el bicho posado en la última marca, solo avanza; tipografía **Fraunces** títulos + **Plus Jakarta** cuerpo. Detalle en el documento.
- **Mejoras aprobadas:** micro-animación de revelado ~1.2s al confirmar un rasgo (celebra sin gamificar); **tocar una ficha abre los momentos del Historial que la originaron** (refuerza credibilidad, puede ir fast-follow).
- **Cortes de nivel de nitidez y rasgos rechazados: resueltos** (los cortes se calibran con datos de la beta; el rechazo no reaparece salvo evidencia fuerte).

**PRÓXIMO PASO FASE 1:** diseñar el **MOTOR DE RASGOS** (detección, propuesta y persistencia de rasgos desde los momentos). Tabla nueva **`rasgos`** ligada a `hijo_id` con patrón RLS **`family_data`** (`get_family_user_ids` ya existe). **Materia prima:** `descripcion_libre`, `emocion`, `gatillantes`, `tipo`, `intensidad`, `accion_rapida_dimension` de cada episodio. **Recordar:** `schema.sql` está desfasado, la **base real es la fuente de verdad**; las migraciones se aplican a mano en el SQL Editor y se documentan en `supabase/migrations`.

#### MOTOR DE RASGOS (piezas 1-4 EN MAIN — FASE 1 del gancho COMPLETA; pendiente solo Fase B del prompt)

> ✅ **PENDIENTE OBLIGATORIO — FASE A RESUELTA (avances alimentan el motor):** ver el bloque "FASE A" más abajo. Queda la **Fase B** (afinar el prompt para equilibrar las 4 familias con datos reales de la beta). El contexto original de la decisión se conserva acá abajo:
>
> 🔴 **EL RETRATO DEBE NUTRIRSE DEL NIÑO COMPLETO:** Hoy el motor de rasgos se alimenta SOLO de episodios difíciles (tabla `episodios`). Esto dibuja el retrato del niño únicamente desde rabietas y desregulación = el lado malo del niño, lo que choca con el alma de Huella y con el marco anti-vergüenza. Además, 3 de las 4 familias de rasgos (`mueve`, `fortalezas`, `calma`) son positivas/neutras y casi no pueden llenarse si la única fuente son episodios difíciles. **DECISIÓN DE PRODUCTO DE DANIEL:** los avances/hitos TAMBIÉN deben alimentar el motor de rasgos, para que el retrato refleje al niño completo y no solo sus momentos complicados. Es un cambio de alcance (toca qué datos entran a la detección, la detección misma, y el conteo que dispara el motor cada 5 momentos), se aborda como pieza propia con su plan. **ORDEN ACORDADO:** abordar esto DESPUÉS de cerrar el ajuste "uno por sesión" y validar el QA de la pieza 4A. **NO se descarta ni se posterga indefinidamente: es un must-have del motor.**

- **Diseño cerrado.** **Detección:** corre **fire-and-forget después de `addEpisodio`** (como la Acción Rápida, **no bloquea el guardado**), **cada 5 momentos nuevos** (control del rate limit de **20 llamadas IA/día/usuario**). Se **clona `detectarPatronesEstructurado`** como plantilla (compactar episodios → prompt JSON → parse defensivo → `confianza` + `episodios_ids`), agregando **`descripcion_libre`, `emocion` y `accion_rapida_dimension`** a los datos (materia prima cualitativa). **Salida rediseñada:** rasgos en **4 familias** (mueve/fortalezas/cuesta/calma) en vez de habilidades.
- **Umbral:** mínimo **3 momentos coherentes** para proponer un rasgo (se calibra con datos de la beta).
- **Propuesta al papá: de a UNO a la vez** (no varios de golpe), para no abrumar y dar razón de retorno.
- **Ciclo de vida del rasgo:** `candidato` (IA detectó, evidencia sólida) → `confirmado` (papá dijo sí, entra al retrato y suma nitidez) → `descartado` (papá dijo "no lo veo", no reaparece salvo evidencia mucho más fuerte).
- **PERSISTENCIA LISTA:** tabla **`public.rasgos` creada en producción** (migración `006_rasgos.sql`). Columnas: `id`, `user_id`, `hijo_id` (NOT NULL), `familia` (check mueve/fortalezas/cuesta/calma), `titulo`, `evidencia` (jsonb), `evidencia_count` (int), `estado` (check candidato/confirmado/descartado, default `candidato`), `confianza` (numeric 0-1 nullable), `created_at`, `updated_at`. **RLS `family_data`** con `get_family_user_ids`. `updated_at` **sin trigger** (se setea desde el front, como `estrategia_ciclos`). Índice `idx_rasgos_hijo_id`. `schema.sql` sigue desfasado; la migración 006 documenta el cambio.
- **PIEZA 1 (detección) — CONSTRUIDA, VALIDADA y EN MAIN** (commit `a6afa1e`). Función `detectarRasgos({ hijo, episodios })` + constante `PROMPT_DETECTAR_RASGOS` en `src/services/anthropic.js`. Es **pura** (no escribe en BD ni toca el flujo). Compacta hasta **20 episodios** (con `descripcion_libre` truncada a 300 chars, + `emocion`, `contexto`, `gatillantes`, `dimension`), llama a la IA (`llamarAPI`, `max_tokens` 2000), parse defensivo + **filtro de validez** (familia válida, ≥3 ids de evidencia, confianza 0-1).
  - **VALIDACIÓN:** se probó con **episodios de ejemplo** (12 momentos de un niño tipo, 3 por familia) porque no se pudo leer la base real sin una credencial nueva (anon key bloqueada por RLS; no se le pidió la service role a Daniel). Resultado: detectó **5 rasgos cubriendo las 4 familias**, con **tono correcto** (cálido, observacional, sin diagnóstico; `cuesta` enmarcado con cariño), cada uno con ≥3 ids reales y confianza 0.75-0.85. **La detección funciona.**
  - **DECISIÓN DE DISEÑO confirmada (anotada en el código):** un mismo episodio **PUEDE respaldar varios rasgos** → relación **muchos-a-muchos**, se permite solape de evidencia. En la validación, los mismos 3 episodios de "dinosaurios" alimentaron un rasgo `mueve` (el interés) y uno `fortalezas` (la capacidad de foco). Lo resolverá la pieza 3.
  - **LIMPIEZA hecha:** el runner temporal `window.probarRasgos` (bloque TEMP DEBUG) **NO entró a main**; la rama de prueba `prueba-rasgos` se borró (local y remota). Solo la detección buena quedó en `main`.
- **PIEZA 2 (enganche) — CONSTRUIDA, VALIDADA y EN MAIN** (commit `4808a88`). El enganche vive **dentro de `addEpisodio` en `HuellaContext.jsx`** (NO en `RegistroPage`, como se había anticipado): justo después del refetch exitoso y el `dispatch SET_EPISODIOS`, antes del `return real`. **Reusa el refetch que ya existía** (`episodiosApp`, shape de app) — sin contador nuevo, sin `localStorage`, sin query extra. Condición de disparo: **hay hijo activo Y `total > 0` Y `total % 5 === 0`** (cada 5 momentos del hijo activo). Llama `detectarRasgos({ hijo, episodios })` en **fire-and-forget puro** (mismo patrón que `generarAccionInmediata`: sin `await`, errores tragados con `.catch`, **NUNCA bloquea ni rompe el guardado**). Por ahora **solo loguea** (`console.log('[rasgos] detectados:', resultado)`); no persiste ni toca UI. El contrato de `addEpisodio` queda idéntico (sigue retornando el episodio guardado).
  - **VALIDACIÓN EN PRODUCCIÓN (huella.lat) — CONFIRMADA:** se probó con **Pascualito** registrando de 48 → 50 episodios. Al llegar a 50 (múltiplo de 5) el log `[rasgos] detectados:` apareció con **`Array(5)`**, cubriendo **3 familias** (`cuesta`, `mueve`, `fortalezas`), con rasgos **coherentes y específicos del niño** (no genéricos). **El enganche funciona end-to-end contra la base real.**
- **PIEZA 3 (guardado/persistencia) — CONSTRUIDA, VALIDADA y EN MAIN** (commit `1bc4753`). Todo dentro de `HuellaContext.jsx`, en un solo archivo. Agrega: `rasgos: []` al `initialState`; cases `SET_RASGOS`/`ADD_RASGO`/`UPDATE_RASGO` al reducer; helper `dbRasgoToApp` (snake_case BD → camelCase app); y la función interna `guardarRasgosDetectados({ hijoId, rasgosDetectados, episodios })`. El enganche de la pieza 2 dejó de solo loguear: ahora `detectarRasgos(...).then(guardarRasgosDetectados(...))`, fire-and-forget puro (sin `await`, errores tragados con `console.warn`, NUNCA bloquea ni rompe el guardado del episodio). `state.rasgos` queda expuesto en el `value` del provider para la pieza 4.
  - **Cómo persiste:** transforma `evidencia` de array de ids a jsonb `[{ episodio_id, fecha }]` cruzando cada id contra los episodios (omite ids sin match); `evidencia_count` = largo del resultado. **DEDUP** por `hijo_id` + `familia` + título normalizado (trim + minúscula + sin tildes, solo para comparar; el título guardado NO se altera): si no existe → INSERT (`estado` = `candidato` por default); si ya existe → **UPDATE fusionando evidencia** (unión por `episodio_id`, sin duplicar), recalcula `evidencia_count`, actualiza `confianza` y setea `updated_at = now()` a mano (la tabla no tiene trigger). El UPDATE **NO toca `estado`** (respeta si el papá ya confirmó/descartó). Un solo refetch al final → `SET_RASGOS`. Escribe solo a nombre propio (`user_id = auth.uid()`), consistente con el `WITH CHECK` de la RLS.
  - **VALIDACIÓN EN PRODUCCIÓN (huella.lat) — CONFIRMADA:** QA con **Pascualito**, la tabla `rasgos` pasó de **0 a 4 filas**. Los 4 rasgos quedaron **bien formados:** familia correcta (**3 `cuesta`, 1 `mueve`**), todos `estado` = `candidato`, `evidencia_count` = 3 cada uno, `evidencia` en jsonb `{ episodio_id, fecha }` correcta. **Solape muchos-a-muchos confirmado contra la base real:** un mismo episodio (del 25 jun) alimenta **dos rasgos a la vez** (un `cuesta` y un `mueve`), tal como se diseñó. **El guardado funciona end-to-end.**
- **PIEZA 4A (card de propuesta de rasgo) — CONSTRUIDA, VALIDADA y EN MAIN** (commit `208e2da`). Primera UI del motor: Huella propone UN rasgo candidato y el papá confirma o descarta.
  - **Componente nuevo `src/components/hijo/PropuestaRasgo.jsx` (+ `.module.css`):** card blanca (radius `--radius-md`, `--shadow-sm`) con el **escarabajo en el avatar** (44px, terracota, `currentColor`), encabezado "Huella notó algo en {nombre}", **título del rasgo en Fraunces** (19/1.22), **dot de color por familia** (mueve naranja `#E56E26`, fortalezas verde `#8FA840`, cuesta lavanda-azul `#6C8EF5` **nunca rojo**, calma mocha `#9B7B6A` — constantes locales documentadas, el resto son tokens del sistema), línea "Notado **N** veces", y los botones **"Sí, lo reconozco"** (primario terracota) / **"Esto no lo veo en él"** (secundario borde suave). El componente solo renderiza el rasgo que recibe; no decide cuál mostrar.
  - **Funciones nuevas en `HuellaContext`:** `confirmarRasgo` / `descartarRasgo` (envuelven `cambiarEstadoRasgo` interno; mismo patrón que `updateRutina`: `UPDATE ... estado` con `.eq('id').eq('user_id')` y `updated_at = now()` a mano; **optimista**, revierte y `console.warn` si falla), expuestas en el `value` del provider.
  - **Integración en `HijoPage`:** lee `state.rasgos`, selecciona el **primer candidato del hijo activo** y renderiza la card **ARRIBA de las 3 cards existentes**. La racha y las 3 cards **siguen intactas** (se limpian en 4B). Al confirmar/descartar, el estado deja de ser `candidato` y la card desaparece sola.
  - **Carga inicial agregada:** se sumó la carga de rasgos a `loadHijoDatos` y a `loadUserData` (Fase 2), mismo patrón que episodios/hitos/rutinas (`SELECT * .in('user_id', getPartnerIds()).eq('hijo_id', ...)` → `SET_RASGOS` con `data.map(dbRasgoToApp)`). Así la card aparece **al abrir/recargar la app**, no solo en la sesión donde corrió una detección.
  - **VALIDACIÓN EN PRODUCCIÓN (huella.lat con Pascualito) — CONFIRMADA:** la card apareció, se confirmaron rasgos **de a uno**, el `estado` cambió en la base y la card desapareció al agotar los candidatos. **La 4A funciona end-to-end.**
- **AJUSTE "uno por sesión" — CONSTRUIDO, VALIDADO y EN MAIN** (commit `6ca61e0`). Antes, al confirmar/descartar un candidato aparecía el siguiente al tiro en la misma sesión (se notó porque Pascualito tenía candidatos acumulados de pruebas). El diseño pide **UNO por sesión**: resolver uno y que el resto espere a la próxima visita, para no sentirse a "examen" (**marco anti-vergüenza**). Solución (en `HijoPage.jsx`, sin tocar BD): el candidato a mostrar se **congela en `useState`** al entrar a la pantalla (un `useEffect` lo fija una sola vez con guarda "solo si está en null"); la card se muestra solo mientras ese rasgo siga `candidato` en el estado vivo, y al resolverlo **desaparece y NO salta a otro**. Al cambiar de hijo activo se reinicia para fijar su propio candidato.
  - **VALIDACIÓN EN PRODUCCIÓN (huella.lat con Pascualito) — CONFIRMADA:** aparece un candidato; al confirmarlo la card desaparece y **NO salta al siguiente**; al recargar (nueva sesión) aparece el siguiente candidato. Funciona como se diseñó.
- **FASE A del pendiente obligatorio (los avances alimentan el motor) — CONSTRUIDA y VALIDADA por diagnóstico** (commit `87d9ea2`). `detectarRasgos` ahora lee **episodios Y hitos** en una sola llamada, marcando cada momento con `origen` (`episodio`/`hito`); el prompt menciona ambos y orienta las familias positivas (`mueve`/`fortalezas`/`calma`) hacia los avances. El **gatillo cuenta combinado** (episodios + hitos del hijo activo, cada 5 totales) y el motor **corre desde `addEpisodio` Y desde `addHito`**. La **evidencia** pasó al shape `{ tipo, id, fecha }` (retrocompatible: lee también las filas viejas `{ episodio_id, fecha }` vía helper `idDe`).
  - **VALIDACIÓN POR DIAGNÓSTICO (datos reales de Pascualito, IA real):** como la anon key no puede leer la base (RLS) y no se quiso desplegar logs a prod, se corrió `detectarRasgos` en un script local de solo lectura con los **40 momentos reales** (20 episodios + 20 hitos exportados por SQL) llamando a la IA de verdad. Resultado: **propuso 7 rasgos** — **6 desde avances** cubriendo `fortalezas` (5) y `calma` (1), las familias antes vacías, y **1 `cuesta` desde episodios** (separación). La **evidencia con origen se resolvió correcto** (episodio/hito), el **dedup NO bloquea** (los 7 serían INSERT, ninguno colisiona con los 4 confirmados) y el **filtro no corta** (los 7 pasan). **La lógica está probada end-to-end.**
  - **Pendiente menor (no es bug):** verlos nacer en producción depende solo de que el **gatillo combinado caiga en múltiplo de 5** (timing del conteo, ahora que suma hitos), no de la detección. Los logs temporales del diagnóstico se revirtieron; los temporales (`_rasgos_diag.mjs`, `_rasgos_data.json`) se borraron.
- **PIEZA 4B (retrato visual "El Sendero") — CONSTRUIDA, VALIDADA y EN MAIN** (commit `7015c63`). Diseño final del handoff de Claude Design (concepto "El Sendero"), que **reemplaza** la cabecera vieja del rastro de 314° (obsoleta) y **elimina la racha**.
  - **Componente nuevo `src/components/hijo/RetratoSendero.jsx` (+ `.module.css`):** un solo valor **`progreso = rasgosConfirmados / 12`** (rasgosTotales `12`, calibrable, prop) mueve **los tres a la vez**: cuánto del **camino del escarabajo** se dibuja, el **aro del medallón** y cuánto **color** tiene la foto. El camino es un molde fijo (spline Catmull-Rom resuelta a beziers) que rodea el medallón con nodos (hitos naranjos en índices 1/4/7/10/13/16); se **revela solo el tramo recorrido** (mask + `pathLength=1`) y el **escarabajo va en la punta**, rotado a la tangente (`getTotalLength`/`getPointAtLength` vía `useLayoutEffect`). La **foto SIEMPRE nítida, nunca blur**: maduración B/N → color con **dos capas** (`<img>` color + `<img>` duotono `grayscale sepia contrast`) recortada con **`clip-path`** que sube desde abajo. Sin foto: escarabajo crema central de placeholder, el camino y el aro funcionan igual. Lienzo del handoff 394x432 vía `viewBox` + overlays en % → escala al ancho real del header.
  - **VALIDACIÓN EN PRODUCCIÓN (huella.lat con Pascualito) — CONFIRMADA:** el camino se revela según rasgos confirmados, y al confirmar un rasgo el **escarabajo avanza, el aro sube y la foto gana color, los tres juntos**. La racha quedó eliminada. **El retrato funciona end-to-end.**
  - **Nota de implementación:** la cabecera vieja (rastro de 314°, `nivelNitidez`/`FILTRO_NITIDEZ`, `construirRastro`) se borró de `HijoPage.jsx` y su CSS; `HijoPage` ahora solo renderiza `<RetratoSendero>`. Se conservan intactas la card `PropuestaRasgo` (4A), las 3 cards (se reemplazan en 4C), las tabs y `RutinaDiaria`.
- **PIEZA 4C (la ficha del niño · las 4 familias) — CONSTRUIDA, VALIDADA y EN MAIN** (commit `b127351`). Reemplazó las 3 cards viejas (Episodios del mes / Logros / Avances) por la **ficha:** 4 cards de familia en orden fijo — "Lo que lo mueve", "Sus fortalezas", "Lo que le cuesta", "Lo que lo calma" — cada una con su **dot de color** (`COLOR_FAMILIA`, exportado desde `PropuestaRasgo` para no duplicar) y los **rasgos confirmados** de esa familia (título + "Notado N veces", sin botones). Familia sin rasgos aún → **mensaje anticipatorio** anti-vergüenza ("Aún por descubrir. Sigue registrando y Huella irá conociendo qué [lo mueve/lo fortalece/le cuesta/lo calma] a {nombre}"). Se limpiaron los helpers/derivados/CSS huérfanos de las 3 cards viejas.
- **PIEZA 4D (card de anticipo en el Home · gatillo de retorno) — CONSTRUIDA, VALIDADA y EN MAIN** (commit `5a4fcf2`). En `PanelPage`, **debajo del CTA Registrar**, un `<button>` (patrón de `UltimoHitoCard`) que lleva a `/hijo`, con mini-medallón mocha + escarabajo crema + chevron. **3 estados:** con candidato por confirmar = gancho fuerte ("Nuevo en su huella · Huella notó algo nuevo en {nombre} · Toca para descubrirlo"); sin candidato pero con confirmados = progreso ("Su huella · El retrato de {nombre} · N de 12 rasgos descubiertos"); sin nada = **no se renderiza**. QA en prod confirmado (apareció el estado enganchador con Pascualito).
- **✅ FASE 1 del gancho de retención (el retrato que madura) — COMPLETA y EN PRODUCCIÓN.** Las 4 sub-piezas están en main y validadas: **4A** (card de propuesta), **4B** (retrato "El Sendero"), **4C** (las 4 familias), **4D** (card de anticipo en el Home).
- **PRÓXIMO PENDIENTE DEL MOTOR — FASE B:** **afinar el `PROMPT_DETECTAR_RASGOS` para equilibrar las 4 familias** cuando haya **datos reales de la beta** (calibrar para que no se sesgue, ej. demasiadas `fortalezas` vs. `mueve`/`calma`).
- **MÁS ADELANTE — Fases 2/3/4 del gancho** (según `huella-gancho-retencion.md` en el Drive de Daniel): **Fase 2** "La revelación incompleta" (que la orientación abra bucles honestos), **Fase 3** "La notificación noble" (gatillo de retorno con valor, depende de resolver si las push del `NotifBanner` son reales), **Fase 4** "El loop de la pareja".

##### FASE 2 del gancho ("la revelación incompleta") — COMPLETA de punta a punta y en producción (Capas 1, 2 y 3)

- **Qué es:** mostrarle al papá, de forma **honesta**, cuando Huella está detectando un patrón pero **aún NO tiene evidencia suficiente** (1-2 momentos, menos de los 3 que exige un rasgo). Abre un bucle de retorno ("hay algo en camino") sin afirmar nada del niño con evidencia insuficiente.
- **DECISIÓN DE PRODUCTO DE DANIEL:** la pista **NO revela el contenido** del patrón emergente — solo avisa que *"hay algo en camino, faltan momentos"*. Esto **protege la credibilidad** (no se afirma ningún rasgo del niño hasta tenerlo sólido). El bucle se **cierra solo cuando el patrón llega a 3 momentos** y se vuelve rasgo confirmable (verdad real, no clickbait).
- **DECISIÓN TÉCNICA:** los emergentes se manejan con un **estado nuevo en la tabla `rasgos`** (`'emergente'`), **NO en memoria** (todo el retrato se persiste y se lee al abrir la app). Requiere **migración del CHECK de `estado`** + ajustes en el **dedup** de `guardarRasgosDetectados` y en **todos los conteos de UI** que hoy asumen solo 3 estados (`HijoPage`/`PanelPage`/card 4A/retrato).
- **PLAN DE CONSTRUCCIÓN en 3 capas (en este orden, con QA entre cada una):**
  - ✅ **Capa 1 — motor: COMPLETA y en producción (commit `22a392d`, 27 jun).** `detectarRasgos` ahora devuelve también los patrones de 1-2 momentos que antes botaba, marcados con el flag **`esEmergente`** (clasificación por conteo, la hace el código). Migrado el CHECK de `rasgos` para admitir el estado `'emergente'`. **OJO:** los emergentes se **DETECTAN pero todavía NO se persisten ni se muestran** — eso es Capa 2/3. Detalle en "Sesión sábado 27 junio 2026".
  - ✅ **Capa 2 — cerrar el bucle: COMPLETA y en producción (commits `f397479` + `012e2ab` + `f07f9f3`, 28 jun).** El emergente se **persiste** con su estado propio (INSERT lee `esEmergente`) y **gradúa a `candidato`** al juntar su **3er momento** (UPDATE unidireccional: solo `emergente` + `fusion>=3`; sin INSERT duplicado; sin revertir confirmado/descartado). Dedup reforzado (`normalizarTitulo`: espacios + puntuación de borde) para reencontrar el rasgo entre sesiones. **OJO:** invisible en prod todavía — se persiste/gradúa en silencio, el papá aún no ve ninguna pista. Detalle en "Sesión domingo 28 junio 2026".
  - ✅ **Capa 3 — la pista honesta: COMPLETA y en producción (commits `c74ad31` + `829f427`, 28 jun).** Tercer estado de la `AnticipoRetratoCard` del Home (prioridad candidato > emergente > progreso): cuando hay emergente y ningún candidato, muestra "Algo se está dibujando / El retrato de {nombre} está creciendo" con acento lavanda (`--color-accent-blue`), sin revelar contenido. Solo el Home (no `HijoPage`). La pista NUNCA dice "patrón" para no chocar con la card verde `CTAAskHuella`. Detalle en "Sesión domingo 28 junio 2026".
- **TERRENO RELEVADO (lectura previa, parcialmente superado por la Capa 1):** (1) hoy los `< 3` momentos **se pierden** — el prompt los suprimía (regla 1) y el `.filter` (`anthropic.js`) los remataba *(RESUELTO en Capa 1)*; (2) la hipótesis original era que el prompt devolviera un arreglo **`"emergentes"` separado** del de `rasgos` — **NO se hizo así:** se mantuvo el mismo shape del modelo y la clasificación emergente vs candidato la hace el **código** vía flag `esEmergente` por conteo; (3) el CHECK actual ya es `estado IN ('candidato','confirmado','descartado','emergente')` *(MIGRADO en Capa 1)*; (4) **espacio visual disponible para la Capa 3**: la `AnticipoRetratoCard` del Home (subtexto / un 4º estado) y, en el retrato, las cards de familia / la metáfora del camino (el tramo por delante aún sin dibujar) — ninguno reservado para esto todavía.

### Correo oficial (buzón) — OPERATIVO (recibe y envía), con bandeja compartida pendiente de separar

- **CAMBIO de proveedor: se descartó Zoho gratis.** Su interfaz precargaba "www" en el campo del dominio y no dejaba corregirlo; además el plan gratis no integra con Gmail. Se eligió **Google Workspace** (~CLP 15.150/mes, prueba gratis de 14 días).
- **Buzón `contacto@huella.lat` OPERATIVO:** recibe y envía correctamente (QA pasado). DNS de los MX automático vía la integración **Entri Connect** Google↔Vercel, sin tocar los registros de Resend en `send.huella.lat`.
- **IMPORTANTE — bandeja compartida:** se creó vía **"Upgrade this account"**, lo que **ligó el dominio a la cuenta Google PERSONAL** (`danielundurraga.r@gmail.com`). Por eso `contacto@huella.lat` y la cuenta personal **COMPARTEN bandeja**, no quedaron separadas.
- **PENDIENTE (otra sesión):** separarlas — sea con una **cuenta nueva independiente**, o con un **perfil de Chrome aparte solo para Huella**.

### Pendientes para retomar

1. **Abordar el "gancho de dopamina" / retorno** (tema grande, sesión aparte) — rediseño de producto, conecta con la retención.
2. **Montar la encuesta de salida en Tally.**
3. **Decidir la separación de la cuenta de correo** `contacto@` vs. personal (bandeja compartida): cuenta nueva independiente o perfil de Chrome aparte.
4. **Empezar a invitar** y **activar el pase Pro** a cada inscrito (`plan_beta_hasta` futuro por `user_id`; `SELECT` antes del `UPDATE`).
- Pendiente menor: cambiar el registrante del dominio (gmail personal → `contacto@`, fuera del repo) y, opcional, alinear el remitente transaccional (`hola@huella.lat` vía Resend) a `contacto@`. También queda el gmail personal en `PerfilPage.jsx:193`.

### Pendientes que siguen abiertos (sin avanzar esta sesión)

- **`NotifBanner`** ("Activa recordatorios…"): falta **confirmar si las notificaciones push son reales o solo UI**. **BLOQUEA la Fase 3 del gancho** ("La notificación noble").
- **Consent screen de Google OAuth:** muestra el subdominio crudo de Supabase. Decisión pendiente: **dominio propio en Supabase (~US$10/mes)** vs. **esperar la verificación lenta de Google**.

---

## Sesión miércoles 18 junio 2026 — Etapa 4 del logo CERRADA: siembra del escarabajo en momentos clave de la app

**La etapa 4 (sembrar el escarabajo donde aparecía una "h" de marca) quedó CERRADA y verificada en producción. Con esto el FRENTE DEL LOGO (etapas 1, 2, 3 y 4) está COMPLETO.**

- **Componente reutilizable:** se creó `src/components/ui/Escarabajo.jsx` (SVG inline, `fill="currentColor"`) como **fuente única** del escarabajo de marca.
- **Reemplazo de todas las "h" hardcodeadas** por el componente, en:
  - **Home:** tarjeta de **análisis semanal** (`AnalisisIA`) y CTA **"Pregúntale a Huella"** (`CTAAskHuella`).
  - **Loaders con latido heredado:** `LoadingDignificado` ("Creando tu plan" / "Estamos cerrando tu ciclo") y `PuertaUnoLoading` — el escarabajo va **dentro del contenedor `.pulse`**, así late solo (no se agregó animación nueva).
  - **Historial:** `OrientacionIA`, `EpisodioCard` (botón "Ver orientación", avatar subido a **20px** para que el escarabajo se lea) y `AccionRapida`.
  - **Puerta 1:** `PuertaUnoHallazgo` y `PuertaUnoEmpty`.
  - **Pantalla de análisis de episodio (`RespuestaIA`):** loader "Analizando…" con el escarabajo **latiendo** + header "Orientación de Huella" con el escarabajo **estático**, reemplazando el `Sparkles` de lucide (que se quitó del archivo).
- **Estándar visual:** escarabajo al **90%** en contenedores **cuadrados** y **78%** en **círculos**; **radius de avatar 10px**; **color heredado vía `currentColor`** (cada contexto define el suyo: verde, terracota, crema o apagado).
- **Commits de la tanda:** `ac655ea`, `446bb19`, `5c12f38`, `983e71d`, `25bb894`, `c802d67`, `f9be672`.
- **QA en producción APROBADO.**

### PWA afinada — VERIFICADA (instalada en iPhone, abre en standalone como app) (commit `c9ef1dd`)

- **`manifest.json` + `index.html`:** `theme_color` **mocha `#9B7B6A`** (igual al header → la barra de estado del teléfono combina) y `background_color` **crema canónico `#FAF3EC`** (el splash calza con el fondo real de la app). `display: standalone`, `short_name` y `name` **"Huella"**, `start_url: "/"`; íconos 192/512 intactos.
- **Decisión tomada: NO ir a app stores por ahora** — la comisión de Apple choca con Mercado Pago y exigiría login con Apple; se mantiene como **PWA instalable**.

**Con esto el FRENTE DEL LOGO (etapas 1, 2, 3 y 4) + la PWA quedan COMPLETOS.**

**PENDIENTE prioritario (pre-beta) — pantalla de consentimiento de Google OAuth:** al entrar con Google, la pantalla de permisos muestra el **subdominio crudo de Supabase** (`igwzepnzpibzrbbkwkbb.supabase.co`) en vez de "Huella" → se ve amateur. **Se arregla por CONFIGURACIÓN externa, NO por código:** (1) Google Cloud Console → *OAuth consent screen* con el **nombre y logo de Huella**; (2) **dominio propio en Supabase** (tipo `auth.huella.lat`) para que la URL del consentimiento sea de marca.

### Bienvenida del usuario nuevo — SIMPLIFICADA (desplegado HOY; QA visual PENDIENTE en producción)

**Antes el usuario nuevo veía el mismo mensaje 3 veces: Onboarding (5 slides) → `BienvenidaModal` → `GuiaPrimerosPasos`. Se eliminó la capa redundante del medio.**

- **`BienvenidaModal` ELIMINADO** (commit `61784f2`): archivos borrados (`BienvenidaModal.jsx` + `.module.css`) y sacado de `PanelPage`. **Nuevo flujo:** Onboarding (5 slides) → Home con la guía rediseñada, **sin modal intermedio**.
- **`GuiaPrimerosPasos` rediseñado** (commits `61784f2` + `c2340d0`): tarjeta blanca, **barra de progreso de 3 segmentos**, checks en terracota, copy más natural ("Registrar un momento", pasos en pasado al completarse — "Registraste lo que pasó"). El **escarabajo de marca marca el paso actual** (primer no completado) y **se mueve** a medida que el usuario registra. Lógica intacta (la tarjeta desaparece al llegar a 3 episodios).
- **QA visual PENDIENTE de confirmar en producción:** con 0 episodios → escarabajo en el paso 1; al registrar → paso 1 con check y el escarabajo salta al paso 2.
- **Pendiente relacionado (NO tocado):** el `NotifBanner` ("Activa recordatorios…") sigue **sin confirmar si los recordatorios push funcionan de verdad o es solo UI**.

**PRÓXIMO TEMA GRANDE — armar el plan de la BETA:** objetivo, reclutamiento de testers, **dar cuentas Pro** (hoy **NO existe forma de regalar Pro sin pago — hay que construirla**), formularios de feedback y métricas.

---

## Sesión martes 17 junio 2026 — Reemplazo del dibujo del logo completo (verificado en prod) + diagnósticos de solo lectura (logo de Términos, loader de carga)

**Un cambio de código —el redibujo del logo, verificado en producción— más dos tareas de reconocimiento/diagnóstico de solo lectura.**

### Logo — reemplazo del dibujo del logo completo: CERRADO (commit `f7ad2b6`)

**Se reemplazó el dibujo del logo (escarabajo + wordmark "huella") por la versión nueva con ajustes de diseño. VERIFICADO en producción.**

- **Solo se tocó `src/components/ui/Logo.jsx`:** cambió el `viewBox` (`1126.74` → `1441.39`, el dibujo nuevo es más ancho) y los paths. Se conservaron firma, props (`className`, `height`), `fill="currentColor"`, `role`/`aria-label` y toda la integración. **Sin cambios de CSS.**
- **QA en producción APROBADO:** se ve bien en el **header (mocha, crema)** y en las **5 pantallas públicas (terracota)**, **sin problemas de ancho**.
- Las **etapas 1 (header) y 2 (públicas) siguen CERRADAS**, ahora con el **dibujo nuevo**.

### Logo en Términos — el código está CORRECTO; lo de producción es caché/deploy, no un bug

**Reporte de Daniel:** en producción, `/terminos` seguía mostrando "huella" en **texto** terracota (bajo "Volver"), sin el escarabajo.

- **Diagnóstico (solo lectura):** `TerminosPage.jsx` tiene el `<Logo>` bien puesto — línea 46, dentro del header que **sí** se renderiza, import correcto (línea 3), **no** dentro de una rama condicional. **No queda ningún wordmark "huella" de texto** (los "Huella" que hay son prosa capitalizada del cuerpo).
- **Confirmado en `git`:** el cambio está en HEAD y **pusheado** (commit `92bc516`, ancestro de `origin/main`).
- **Descartado el service worker:** `public/sw.js` solo maneja `push` / `notificationclick`; **no tiene `fetch` handler ni cachea assets**.
- **Hipótesis:** versión vieja servida en el navegador (caché / pestaña abierta) o deploy aún sin propagar. **Acción sugerida:** hard refresh / ventana incógnita + confirmar en Vercel que el último deploy quedó *Ready*. **No hay nada que arreglar en el código.**

### Reconocimiento del loader de carga (para el escarabajo "cargando") — DECISIÓN PENDIENTE

**Objetivo futuro:** poner el logo (escarabajo) en la pantalla de carga (la de la cita + skeletons).

- **Componente:** `CitaLoader` (`src/components/ui/CitaLoader.jsx` + su `.module.css`). Pinta la cita rotatoria (`.texto` itálica + `.autor` en terracota `--color-primary`) y 3 barras `.skLine` con shimmer.
- **Se reutiliza en 4 lugares:** `ProtectedRoute` (**full screen, SIN header**, mientras resuelve auth `loading`); `Layout` → `SkeletonLoader` (**DENTRO del Layout, con header+logo visibles**, mientras `dataLoading` carga el Home — este es el "tras iniciar sesión"); `AnalisisIA` (`compact`, análisis de patrones); `RespuestaIA` (orientación del episodio).
- **DECISIÓN PENDIENTE antes de implementar:** poner el escarabajo en `CitaLoader` (aparece en los **4** loaders; **ojo redundancia** con el escarabajo del header en el caso del `Layout`) **vs.** solo en el loader full-screen de `ProtectedRoute` (sin header → sin redundancia, candidato más natural).

---

## Sesión lunes 15 junio 2026 — Reset de contraseña (Resend SMTP) + álbum descartado como bug + onboarding (2 arreglos) + logo de marca (header + 5 públicas) + auditoría del flujo de entrada

**Cerramos la recuperación de contraseña: conectamos Resend como servidor SMTP custom de Supabase Auth y verificamos el flujo completo en producción. El flujo ya existía en código — no se tocó código; el trabajo fue de configuración en los dashboards de Resend y Supabase.**

**Resend conectado como SMTP custom de Supabase Auth:**
- **Sender:** `hola@huella.lat`, nombre **"Huella"**.
- **Servidor SMTP:** host `smtp.resend.com`, puerto **465**, usuario `resend`.
- **API key dedicada "Supabase SMTP"** creada en Resend — permiso **Sending access**, **acotada al dominio `huella.lat`** (no es la misma key que usa `/api/invite`).

**El flujo de "¿Olvidaste tu contraseña?" ya existía en código (no se tocó nada):**
- `LoginPage` enlaza a `/reset-password`.
- `AuthContext.resetPassword` dispara `resetPasswordForEmail` (con `redirectTo` a `/reset-password`).
- `ResetPasswordPage` (ruta pública, doble modo) maneja el evento `PASSWORD_RECOVERY` y actualiza la clave con `updateUser`.

**Verificación end-to-end en producción (ventana incógnito):**
- El correo llega **instantáneo** desde `Huella <hola@huella.lat>` a la **bandeja de entrada** (no spam).
- El enlace del correo **abre la pantalla de clave nueva**.
- El **cambio de clave es exitoso** y el **inicio de sesión con la clave nueva funciona**.

**Bloqueante de beta resuelto.**

**Beneficio colateral:** ahora TODOS los correos de Supabase Auth (confirmación de cuenta nueva, invitación de pareja, cambio de email) salen por **Resend desde el dominio verificado**, en vez del servicio por defecto de Supabase, que estaba **limitado a 2 correos por hora**.

---

### Álbum / fotos compartidas — INVESTIGADO y DESCARTADO como bug (solo lectura, no se tocó código)

**Daniel reportó "fotos del álbum que se caían / aparecían vacías". Se investigó en solo lectura y quedó DESCARTADO como bug: es latencia normal de carga, no pérdida de datos ni problema de compartición entre cuentas.**

**Cómo funciona el álbum (hallazgo):**
- El "álbum" es la pestaña Álbum de la pantalla de Logros; las fotos son los **"hitos"** que tienen `foto_url`.
- Las fotos viven en el bucket **público `momentos`** (URL pública vía `getPublicUrl`, **sin expiración**); en la base se guarda la **URL completa**.
- Cada hito se asocia a **`user_id` (el adulto que lo creó) + `hijo_id`** (el hijo compartido).
- La **RLS family-aware** (`get_family_user_ids`) permite que la pareja **se lea mutuamente** los hitos; el bucket de fotos es de lectura pública.

**Verificado en producción:**
- Las **13 fotos se ven idénticas en ambas cuentas** (adulto 1 y adulto 2).
- Reproduciendo **login en frío** en el adulto 2, las fotos cargan con una **leve latencia de red**, pero **SIEMPRE aparecen**.

**Conclusión:** **no** es pérdida de datos ni problema de compartición entre cuentas. Es **latencia normal de carga**.

**Observación técnica (NO es tarea — solo nota por si reaparece):** al cargar, el álbum **filtra los hitos en el cliente** por `user_id IN [yo, pareja]`, y ese "pareja" depende de que `FamilyContext` haya resuelto `partner.id`; en cambio, los **hijos** se cargan **confiando solo en la RLS**. Si alguna vez aparece intermitencia **REAL y reproducible**, el endurecimiento sería **alinear el álbum con la carga de hijos**: confiar en la RLS y quitar el filtro manual de `partnerIds`.

---

### Onboarding — dos arreglos al cierre del flujo

**El cierre del onboarding tenía dos problemas: el Home no se refrescaba con los datos recién creados, y si el guardado fallaba el usuario quedaba atrapado sin perfil ni hijo. Ambos arreglados y desplegados.**

- **Home no recargaba tras completar el onboarding (commit `61629cd`):** el perfil y el hijo SÍ se guardaban en la base, pero `PanelPage` seguía con los datos viejos en memoria, así que saludaba con el **email crudo** (ej. `d.undurraga+prueba1`) y decía **"tu hijo/a"** genérico hasta que el usuario hacía refresh manual. **Causa:** el `onComplete` de `Layout.jsx` persistía y cerraba, pero no disparaba la recarga del contexto. **Fix:** llamar a `reloadData()` (mecanismo que ya existía) tras persistir con éxito. **VERIFICADO en producción:** al completar el onboarding, el Home saluda con tu nombre y el del hijo **sin refresh**.
- **Trampa silenciosa: marcaba "completado" aunque el guardado fallara (commit `90c76cc`):** `Layout.jsx` marcaba `onboarding_done='1'` y cerraba el onboarding **siempre**, fuera del `try/catch`. Si `persistirPerfilOnboarding` fallaba (red/RPC caída), el usuario quedaba **sin perfil ni hijo y sin volver a ver el onboarding**. **Fix:** si el guardado falla, `Layout` **re-lanza** el error → NO marca completado, NO cierra; `Onboarding.jsx` **captura** el error, reactiva el botón (vuelve de "Guardando…" a "Empezar ahora →"), muestra un **aviso** (color `var(--color-danger-text)`) y deja **reintentar**. El camino de éxito quedó idéntico.
- **PENDIENTE:** **QA del camino de fallo** — simular red offline con DevTools y confirmar que aparece el aviso y que el botón deja reintentar (no se puede probar solo con `npm run build`).

### Logo de marca — FRENTE COMPLETO: etapas 1, 2, 3 y 4 CERRADAS (header + pantallas públicas + íconos + siembra del escarabajo)

**Reemplazamos el wordmark de texto "huella" por el logo real de la marca. Etapas 1 (header), 2 (pantallas públicas), 3 (favicon + íconos PWA) y 4 (siembra del escarabajo en la app) CERRADAS y verificadas en producción.** *(El dibujo del logo se actualizó el 17 junio, commit `f7ad2b6`, verificado en prod; las etapas 1 y 2 quedaron con el dibujo nuevo.)* **La etapa 4 (siembra del escarabajo) se cerró el 18 junio — detalle en "Sesión miércoles 18 junio 2026".**

- **Qué es el logo:** un **escarabajo** (no la huella dactilar del brief original): junta los **rastros/huellas** que se leen + el **símbolo egipcio de sabiduría/aprendizaje**. La esencia del nombre (la unicidad de cada niño) y el tagline se mantienen.
- **Etapa 1 — header (HECHO):** componente nuevo `src/components/ui/Logo.jsx` — **SVG inline** con `fill="currentColor"` para heredar el color del contexto. Reemplaza el texto "huella" del header en `Layout.jsx`. Token nuevo **`--color-on-mocha`** (`#FAF3EC`, **crema estable en claro y oscuro**) en `index.css`, porque los tokens crema existentes se oscurecen en modo oscuro y el header es mocha en ambos modos. Alto **32px**. **VERIFICADO en producción:** crema sobre mocha, igual en las 5 secciones.
- **Etapa 2 — pantallas públicas (CERRADA, commits `ffdee32` + `92bc516`):** el logo de marca ya está en las **5 pantallas públicas**, en **terracota** (`--color-primary`), reutilizando el componente `Logo` existente. **Tamaños:** Login / Signup / Reset **56px** (clase `.logoMark` en `AuthPage.module.css`); Términos **36px** (discreto, es página legal); Invitar **52px** (protagonista, primera impresión de la pareja). **Verificado en producción:** Login, Signup y Reset OK. Términos e Invitar implementados; el **QA visual de esos dos queda por confirmar** (Invitar requiere un link de invitación real para verse).
- **Decisión (grupo A) — el wordmark del Home queda como TEXTO, NO lleva el logo:** el "huella" del saludo en `Hero.jsx` se mantiene en texto. **Razón:** el header, justo encima, ya muestra el escarabajo; poner otro ahí duplicaría el símbolo. **No es un pendiente — es decisión tomada:** no instalar el logo en el Hero.
- **Deuda (CSS muerto):** la clase `.logo` **de texto** en `AuthPage.module.css` quedó **sin uso** (Login / Signup / Reset ahora usan `.logoMark`). Sumar a la limpieza de CSS muerto pendiente.
- **Etapa 3 — íconos (CERRADA, commit `5b7d1fa`, verificada en producción):** favicon e íconos PWA con la variante del **escarabajo solo** (crema sobre terracota). Se agregaron `public/favicon.ico` (15865 B), `public/favicon.svg` (4790 B) y `public/apple-touch-icon.png` (6094 B); se reemplazaron los íconos PWA `public/icons/icon-192x192.png` (887 → 6501 B) y `icon-512x512.png` (5310 → 15347 B). En `index.html` se conectaron los `<link rel="icon">` (ico + svg) y se corrigió el `apple-touch-icon` (antes apuntaba al ícono viejo). `manifest.json` ya apuntaba a las rutas correctas (sin cambios). **QA en producción:** el favicon (escarabajo crema sobre terracota) se ve bien en la pestaña del navegador. **Nota:** esa variante es **multicolor** (no monocromática), por eso los íconos son archivos con colores fijos, no el componente `Logo` con `currentColor`.
- **Etapa 4 — siembra del escarabajo (CERRADA, 18 junio):** se creó el componente único `src/components/ui/Escarabajo.jsx` y reemplazó **todas** las "h" de marca en la app (Home: análisis + CTA; loaders con latido: `LoadingDignificado` + `PuertaUnoLoading`; Historial: `OrientacionIA`, `EpisodioCard`, `AccionRapida`; Puerta 1: `PuertaUnoHallazgo` + `PuertaUnoEmpty`; y `RespuestaIA`: loader latiendo + header estático). **Detalle completo en "Sesión miércoles 18 junio 2026".**
- **El FRENTE DEL LOGO (etapas 1, 2, 3 y 4) queda COMPLETO.**

**Próximo paso del frente PWA (PENDIENTE):** afinar `manifest.json` (`name`/`short_name`, `display: standalone`, `theme_color` de marca). **Decisión: NO ir a app stores** por ahora (comisión de Apple choca con Mercado Pago); se mantiene como PWA.

### Auditoría del flujo de entrada del usuario nuevo (pre-beta) — hallazgos

**Mapeamos de punta a punta el alta del usuario nuevo (signup → confirmación de correo → login → onboarding → Home). Esto es diagnóstico; los arreglos van por separado.**

- ✅ **Verificado OK:** el **correo de confirmación de cuenta nueva** llega rápido a la bandeja por Resend. Era el **gate duro** del flujo email/clave; quedó confirmado que funciona.
- **Pendientes a resolver/evaluar:**
  - **(a)** Guía **"¿Por dónde empezar?"** (`GuiaPrimerosPasos`) en Inicio: Daniel quiere **evaluarla** (si se queda, cambia o se va).
  - **(b)** El **login con Google** muestra el **dominio crudo de Supabase** ("to continue to `<ref>.supabase.co`") → se ve amateur; arreglar vía config de Google Cloud / dominio propio.
  - **(c)** El **onboarding está atado al `localStorage` del navegador, NO a la cuenta** → no reaparece y es **frágil** para parejas o equipos en dispositivos compartidos.
  - **(d) Menores:** tras **saltar** el onboarding, crear el hijo **no es evidente** desde el Panel; se puede llegar al final del onboarding **por swipe con el formulario vacío** (hijo sin nombre); **tres capas de intro encimadas** (onboarding + `BienvenidaModal` + `GuiaPrimerosPasos`); **mensajes de error de Supabase crudos en inglés**.

---

## Sesión domingo 14 junio 2026 — Seguridad de llaves Supabase COMPLETADA (legacy apagadas + sb_secret rotada)

**Cerramos por completo la seguridad de llaves: auditoría → apagón de las legacy → rotación de la `sb_secret` expuesta, todo verificado en producción. Las DOS llaves que alguna vez pasaron por el chat quedaron MUERTAS.**

**RESUMEN DE SEGURIDAD DE LLAVES (CERRADO):**
- **Legacy JWT apagadas** + **`sb_secret` rotada**. Las **dos llaves filtradas en el chat** — la **service_role legacy del 10 junio** y la **`sb_secret` del 11 junio** — están **MUERTAS**.
- App y endpoints verificados **OK** después de cada cambio. Hoy solo existe **una** service-role válida: `service_role_2`.

**Auditoría previa al apagón (solo lectura, ningún cambio de código):**
- **Ningún código del repo depende de llaves legacy por valor.** Todo lee variables de entorno **por nombre** (`VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); Vercel ya apunta esos nombres a las llaves nuevas.
- **No hay Edge Functions de Supabase** (no existe `supabase/functions/`); bajo `supabase/` solo viven `schema.sql` y migraciones.
- **Todos los endpoints `api/` leen del entorno, sin hardcodear llaves.** Service-role: `mp-webhook`, `push-remind`, y la activación de `mp-verificar-suscripcion`. Publishable/anon: `anthropic`, `mp-crear-suscripcion`, `push-subscribe`, y la auth de `mp-verificar-suscripcion`. `invite.js` no usa Supabase (usa Resend).
- **Cero llaves hardcodeadas en todo el repo** (los "hits" de búsqueda fueron prosa de docs y un hash de `package-lock.json`, falsos positivos). El `.env` local ya está en el sistema nuevo (`sb_publishable`) y no tiene service-role.

**Apagón ejecutado:**
- **Llaves legacy de Supabase APAGADAS** con el botón **"Disable JWT-based API keys"**. La **service_role legacy expuesta el 10 junio quedó MUERTA**.

**Verificado post-apagón (nada roto):**
- App OK en producción: carga normal de datos (la `sb_publishable` del frontend sigue sirviendo).
- `curl` service-role a `/rest/v1/perfiles` devolvió filas (la `sb_secret` nueva sigue saltando RLS, que es lo que necesita el webhook).

**Rotación de la `sb_secret` expuesta (pantallazo del 11 junio):**
- Creada una **nueva `service_role_2`** en Supabase y cargada en Vercel (`SUPABASE_SERVICE_ROLE_KEY`) → **redeploy**.
- **Verificada** con el `curl` service-role a `/rest/v1/perfiles` (devolvió filas → la nueva llave escribe saltando RLS).
- **Borrada la `sb_secret` "default" filtrada.** Ahora **solo existe `service_role_2`**.
- Nota: el apagón de legacy **no rotaba** esta `sb_secret` nueva — era acción aparte, por eso fue un paso propio.

---

## Sesión jueves 11 junio 2026 — Monetización: Paso 3 red de seguridad + UpgradeModal al pago + downgrade automático

**Construimos, desplegamos y verificamos en producción la red de seguridad del pago: el respaldo del webhook que activa el plan al volver del checkout. Condición #1 de la REGLA CRÍTICA: CUMPLIDA.**

**Endpoint nuevo `api/mp-verificar-suscripcion.js` (commit `e3233d0`):**
- **Auth por token de Supabase** (mismo patrón que `mp-crear-suscripcion`): anon key + Bearer del header → `getUser()`. El `user.id` sale del **token verificado, nunca del body** → nadie puede activar el plan de otro.
- **Consulta a MP:** `GET /preapproval/search?external_reference=<user.id>&status=authorized`. `external_reference = user.id` se mandó al crear el preapproval, así que es el puente para encontrar la suscripción del usuario.
- **Chequeo defensivo:** no confía solo en el filtro de MP; confirma que en `results` haya una suscripción con `status='authorized'` **y** `external_reference === user.id` antes de activar.
- **Activación idempotente:** mismo **upsert service-role** del webhook (`onConflict: 'user_id'`, `plan='pro'`). Si el webhook ya activó el plan, el upsert deja `plan='pro'` igual, sin efecto raro.
- **Logs para auditar en Vercel:** entrada (`userId`), resultado de la consulta (`total`, `autorizada`) y filas afectadas al activar.
- Devuelve `{ pro: true }` / `{ pro: false }`, o status de error (`401`/`502`/`500`) sin activar si MP falla.

**Frontend `CuentaPage.jsx` (commits `e3233d0` + fix `56fca1e`):**
- Al volver a `/cuenta?suscripcion=ok`, un `useEffect` verifica **hasta 3 veces con delays 0 / 2s / 4s**. En cuanto una respuesta trae `pro: true` → corta los reintentos, llama **`reloadData()`** → `isPro()` pasa a `true` y la UI muestra "Pro activo" **sin recargar**.
- Si tras los 3 intentos no confirma → **aviso suave** "Estamos confirmando tu pago, puede tardar unos minutos." (sin error duro; confiamos en que el webhook complete).
- **Robustez:** el efecto corre **una sola vez al montar** (deps `[]`); `reloadData` va por **ref** y el param se lee de `window.location` para que un re-render del provider durante los ~6s **no re-dispare ni aborte** la verificación. Guard `yaVerificado` (ref) contra doble disparo.
- **BUG encontrado y arreglado en QA (fix `56fca1e`):** la limpieza de URL con `navigate('/cuenta', {replace:true})` **reseteaba el estado de `CuentaPage` y se comía el `avisoPago`** recién seteado (aparecía "Confirmando…" pero el aviso final nunca se veía). Solución: limpiar con **`window.history.replaceState(null, '', '/cuenta')`**, que **no pasa por el router ni re-monta** el componente, así el aviso sobrevive. De paso se quitó `useSearchParams` (el param se lee de `window.location`).

**VERIFICADO EN PRODUCCIÓN (huella.lat):** "Confirmando tu suscripción…" aparece, el aviso "Estamos confirmando tu pago, puede tardar unos minutos." **queda visible y persiste**, y la URL queda limpia en `/cuenta`. Probado el camino **"aún no confirmado"** (el normal hoy, con credenciales de prueba). El camino **"confirmado"** (que activa el plan de verdad) se prueba EN VIVO con el primer pago real.

---

### UpgradeModal conectado al pago directo (commit `f68a8bc`)

**El modal de upsell ahora inicia el pago desde adentro, en vez de solo cerrar.**
- **Toggle mensual/anual** coherente con CuentaPage (CLP 9.990/mes, CLP 99.900/año + badge "2 meses gratis").
- **CTA "Activar Huella Pro"** → inicia el checkout vía el **helper compartido `src/services/pago.js`** (`iniciarSuscripcion(ciclo)`: `getSession` → `POST /api/mp-crear-suscripcion` → `init_point`, sin redirect adentro). Estado "Redirigiéndote al pago…" y error suave que **no cierra** el modal. CuentaPage también pasó a usar el helper (refactor sin cambio de comportamiento → una sola fuente de verdad del pago).
- **Enlace discreto "Ver todo lo que incluye Pro"** → `/cuenta` (y cierra el modal). **"Ahora no"** cierra.
- **QA aprobado en producción** abriendo el modal desde **Historial** y **Estrategias**.
- **Hallazgos corregidos:** (1) el CTA viejo **solo hacía `onClose`** — no llevaba a ningún lado ni iniciaba pago; (2) el modal entero estaba en **estilos inline con hex hardcodeados** → migrado a **`UpgradeModal.module.css` con tokens** (scrim con `--color-scrim`), cumpliendo el sistema de diseño; (3) la **bajada por defecto** tenía el tagline viejo → ahora **"Conoce la huella única de tus hijos"**.

### Downgrade automático en `mp-webhook.js` (commit `e660c00`)

**El webhook ahora maneja el ciclo de vida completo, no solo la activación.**
- `authorized` → activa `plan='pro'` (sin cambios). `paused` | `cancelled` → **UPDATE a `'free'` con filtro `and plan='pro'`** (protege admin y deja intactos free/null; 0 filas afectadas es resultado válido). `pending` u otro → **no-op** (solo loguea). Respuesta **siempre 200** (patrón actual, para que MP no reintente en loop).
- Usa UPDATE (no upsert) a propósito: si no existe fila, no hay Pro que bajar. El cliente service-role se crea una sola vez y lo comparten ambas ramas. Logs: status recibido, rama tomada, filas afectadas.
- **Lógica validada en la base real** (SQL Editor de Supabase, sobre la cuenta de prueba `b30d78d5`): SELECT inicial `pro` → UPDATE con filtro **1 fila afectada** → SELECT final `free`. **Idempotencia comprobada:** una corrida repetida del UPDATE devolvió **0 filas** ("Success. No rows returned"). La cuenta `b30d78d5` quedó en `free`.
- **Pendiente de ver EN VIVO:** el **disparo automático del webhook** por MP (con validación de firma `x-signature`) cuando una suscripción real se cancela/pausa → amarrado al primer pago real.

### Migración a las llaves nuevas de Supabase (sistema `sb_publishable` / `sb_secret`)

**Empezamos a migrar del sistema legacy de llaves (anon / service_role JWT) al nuevo (`sb_publishable_…` / `sb_secret_…`).**
- **Vercel actualizado:** `VITE_SUPABASE_ANON_KEY` → `sb_publishable`, `SUPABASE_SERVICE_ROLE_KEY` → `sb_secret`. **Redeploy hecho.**
- **Capa 1 verificada:** la app funciona OK en producción con datos cargando (la `sb_publishable` sirve para el cliente del frontend).
- **Capa 2 verificada:** la `sb_secret` funciona como **service-role** — un `curl` a `/rest/v1/perfiles` devolvió filas **saltando RLS**, que es justo lo que necesita el webhook para escribir `perfiles`.
- **Las llaves legacy siguen ACTIVAS a propósito** — no se apagan hasta hacer la auditoría (ver pendientes).

**REGLA CRÍTICA — estado:** **condición #1 CUMPLIDA** (red de seguridad construida y verificada). Falta **condición #2**: primer pago REAL de punta a punta (que también probará EN VIVO la firma `x-signature`, el disparo automático del webhook y el camino "confirmado" de la red de seguridad).

**DÓNDE RETOMAR (próxima sesión, en este orden):**
- ✅ **Seguridad de llaves Supabase — CERRADA (14 junio):** auditoría + legacy apagadas + `sb_secret` rotada. Las dos llaves filtradas en el chat están muertas. (Detalle en "Sesión domingo 14 junio 2026".)
- ✅ **LoginPage "¿Olvidaste tu contraseña?"** — **RESUELTO y verificado en producción (15 junio):** Resend conectado como SMTP custom de Supabase Auth + flujo de reset verificado end-to-end. **Ya no es bloqueante de beta.** (Detalle en "Sesión lunes 15 junio 2026".)
- ✅ **Álbum / fotos faltantes — INVESTIGADO y DESCARTADO como bug (15 junio):** era **latencia normal de carga**, no pérdida de datos ni problema de compartición entre cuentas. Las 13 fotos se ven idénticas en ambas cuentas (adulto 1 y adulto 2). (Detalle en "Sesión lunes 15 junio 2026".)
- ⬜ **Condición #2 de la REGLA CRÍTICA:** primer **pago real** de punta a punta (al pasar a credenciales de producción de MP).
- **Mantener (limpieza menor):** cancelar el **preapproval de prueba** que sigue `authorized` en MP (la cuenta Huella `b30d78d5` ya quedó en `free`, pero su suscripción de prueba en MP sigue viva); limpiar cuentas de prueba.

---

## Sesión martes 10 junio 2026 — Monetización: webhook Paso 2 VERIFICADO por API + fix de upsert

**Verificamos la lógica del webhook end-to-end por API, sin tocar producción, y arreglamos un bug real de activación del plan.**

**FIX del webhook (commit `ac81fb2`):** `api/mp-webhook.js` ahora hace **UPSERT** (no `UPDATE`) sobre `perfiles` al activar el plan, con el mismo `onConflict: 'user_id'` que ocupa `savePadreNombre` en `HuellaContext`. **El bug:** si el usuario pagaba sin tener ficha previa en `perfiles` (todavía no había guardado su nombre, que es lo que crea la fila), el viejo `UPDATE` afectaba **0 filas y fallaba en silencio** → el pago entraba pero el plan **no se activaba**, sin error visible en los logs. **Ahora:** si la fila existe la actualiza a `plan='pro'`; si no existe la **crea** con `user_id` + `plan='pro'` (nombre `null`, el usuario lo completa después). Loguea cuántas filas afectó para que el QA sea legible en Vercel.

**PASO 2 (webhook) — lógica de activación VERIFICADA por API:**
- Autorizamos una suscripción de prueba **enteramente por API** (el checkout manual de sandbox no dejaba confirmar: borde de MP sin sesión). Para que MP dejara crear el preapproval, **comprador y vendedor tienen que ser ambos del mismo tipo**: con el token real como cobrador y un comprador de prueba daba `400 "Both payer and collector must be real or test users"`. Se resolvió creando un **vendedor de prueba** además del comprador de prueba (ambos test users).
- Tokenizamos la tarjeta **APRO** y creamos el preapproval ya **`authorized`** (modelo "pago autorizado"). El `PUT` para pasar de `pending` a `authorized` lo rechaza el cobrador con `"only the payer can"`, así que se creó autorizado directo en el `POST`.
- Replicamos la lógica exacta del webhook: `GET /preapproval/{id}` → `status='authorized'` → upsert a `perfiles`. Resultado: **`plan='pro'`** (1 fila afectada).

**Se comprobó EN VIVO el bug del upsert:** el `SELECT` previo del usuario devolvió **`[]`** — la fila **NO existía**. Con el viejo `UPDATE` el plan **no se habría activado**; el **upsert nuevo creó la fila** con `plan='pro'`. **El fix funciona en la práctica.**

**NO probado EN VIVO (queda para el primer pago real al activar cobros):**
- La **validación de firma `x-signature`** del webhook (HMAC con `MP_WEBHOOK_SECRET`) — se saltó a propósito por el lío de secrets entre la app de prueba y la de producción.
- El **disparo HTTP automático** de MP hacia `https://huella.lat/api/mp-webhook`.
- (El código estándar de ambos ya está revisado; solo falta la prueba viva con un pago real.)

**Usuarios/cuentas de prueba (guardar para futuras pruebas):**
- Comprador de prueba MP: `test_user_3312252198273799442@testuser.com` (pass `lLR75knSxg`).
- Vendedor de prueba MP: `test_user_8634531742674956960@testuser.com` (pass `bEGLwH69DU`).
- Cuenta Huella de prueba: `user_id = b30d78d5-e094-4c9a-a500-4a6cd270906b` (quedó con `plan='pro'` por la prueba; si quieres dejarla limpia, hay que volverla a `free`/`null` por SQL).

**⚠️ PENDIENTE DE SEGURIDAD:** la **`SUPABASE_SERVICE_ROLE_KEY` pasó por el chat** durante este QA (es la llave maestra de Supabase, saltea RLS). Conviene **regenerarla** en Supabase → Settings → API y, si se regenera, **actualizarla en Vercel** (sino el webhook deja de poder escribir `perfiles`).

**DÓNDE RETOMAR:**
- **Paso 3:** refresco del plan al volver a `/cuenta?suscripcion=ok` (`reloadData` o polling) para que `isPro()` refleje el cambio **sin recargar** la página.
- Primer **pago real** (al pasar a credenciales de producción): ahí se prueban EN VIVO la firma `x-signature` y el disparo automático del webhook.

---

## Sesión martes 9 junio 2026 — Monetización: pasarela Mercado Pago (Paso 1 + Paso 2 desplegado)

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

> **Superado el 9 junio 2026** — la monetización arrancó con **Mercado Pago** (NO Stripe: no opera en Chile sin abrir una LLC en EE.UU.). Ver el bloque **"Sesión martes 9 junio 2026"** arriba. Lo de abajo es el plan original con Stripe; se conserva como contexto histórico.

1. ~~**Integrar Stripe**~~ → reemplazado por **Mercado Pago Suscripciones** (preapproval). Pricing en pie: **CLP 9.990/mes + CLP 99.900/año** (commit `b6ae281`; **NO 5.990**). Al confirmar el pago, el webhook actualiza `perfiles.plan` de `'free'` a `'pro'`.
2. **Trial:** el de 7 días quedó **DESCARTADO**; el CTA es **"Activar Huella Pro"**. Pendiente: **evaluar un reverse trial largo (14-30 días), NO de 7**.
3. **Página de configuración de cuenta** (ver plan actual + activar Pro).
4. **Probar el modal de upgrade** con cuenta nueva sin plan admin.

**Antes de la monetización, pendientes menores:** cerrar el **QA de voz** + **documentar la regla de voz en `CLAUDE.md`**; opcional, afinar el anidado de `VoiceTextarea` si se ve recargado. La **pasada de limpieza de CSS / extracción de la base Refugio** puede ir cuando se quiera.

---

## Stack técnico

- Frontend: React + Vite
- IA: API de Anthropic, modelo `claude-sonnet-4-6`
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
