# Plan de lanzamiento — Huella

> Documento vivo. Actualizar al cerrar cada sesión.

**Última actualización:** 27 mayo 2026
**Capacidad real:** 2-3 horas al día
**Sin deadline fijo.** Foco: cero bugs visibles, marca pulida, base sólida antes de monetizar.

## Visión general — 4 fases

1. Fase 1 — Beta privada (3 semanas). Lanzar a 20-30 mamás reales, PWA, gratis.
2. Fase 2 — Validación (4-6 semanas). Observar uso real, hablar, refinar.
3. Fase 3 — Monetización (2-3 semanas). Stripe. Pro y Profesional.
4. Fase 4 — App Stores (3-4 semanas). App Store y Play Store.

Estimación total: 12-16 semanas calendario.

## FASE 1 — Beta privada

### Bloque 1 — Cierre de bloqueantes técnicos

**[HECHA] Sesión A — Dominio + Resend**
- Comprar huella.app
- Conectar a Vercel
- Configurar Resend con dominio propio (SPF + DKIM)
- Arreglar endpoint /api/invite
- QA real de invitación con dos cuentas

**Sesión B — Bugs Estrategias parte 1**
- Puerta 2 con cuerpo vacío
- Multi-plan solo muestra el primero
- Plan completado en sección incorrecta

**Sesión C — Bugs Estrategias parte 2**
- "Semana 1 de 4" tras cierre de último ciclo
- Chips de habilidades activas sin opacidad
- Skill chips selector
- Regresión Round 6

**Sesión D — Logo + Auditoría tagline**
- Reemplazar wordmark "huella" por logo real en header, login, signup, correos, favicon, ícono PWA
- Buscar tagline viejo en todo el repo y reemplazar

### Bloque 2 — Polish visual

**Sesión E — InvitarPage rediseño**
- Pasar a Claude Design
- Siluetas → avatar real del inviter

**Sesión F — Onboarding refinement**
- Acortar copy slide 2
- Revisar los 5 slides + GuiaPrimerosPasos

**Sesión G — Deudas visuales Fase 6**
- Unificar tokens (base vs aliases)
- Eliminar border-radius hardcoded en Card.jsx
- Limpiar #fff hardcoded en varios componentes
- Borrar CSS muerto
- Unificar sombras de cards

### Bloque 3 — QA + Pre-lanzamiento

**Sesión H — Pendientes UX**
- "Lo que ya trabajaste" abre detalle
- Botón "+ Registrar" Logros → vista 'hito' de NuevoPage
- Copy del loader "te avisamos cuando esté listo"

**Sesión H bis — Auditoría Total Pre-Lanzamiento**
Auditoría sistemática de:
- Código (TODOs, console.log, código muerto, manejo de errores)
- UX (copy en otro idioma, links rotos, botones sin acción, estados vacíos)
- BD (huérfanos, FKs, índices, RLS)
- Seguridad (variables expuestas, endpoints sin auth, secrets)
- Marca (tagline viejo, logos, paleta, tipografías)
- Performance (bundles, queries, re-renders)
- Accesibilidad básica (contraste, labels, teclado)
Output: AUDITORIA_PRE_LANZAMIENTO.md priorizado crítico/alto/medio/bajo.

**Sesión H ter — Fix de bugs de Auditoría**
- Resolver hallazgos crítico y alto
- Documentar medio/bajo para post-lanzamiento

**Sesión I — QA end-to-end completo**
- Recorrer la app con 2 cuentas
- Probar: registro, onboarding, episodios, Acción Rápida, Historial, Estrategias, Logros, modo parejas, reset password
- Lista priorizada de bugs residuales

**Sesión J — Fix residual + LANZAMIENTO BETA**
- Resolver bugs detectados
- Lanzar a 20-30 testers elegidos
- Mensaje de bienvenida personal a cada uno

## FASE 2 — Validación

Trabajo no-código. Hablar con testers, observar Plausible, refinar copys según fricciones reales. Output: documento de product-market fit.

## FASE 3 — Monetización

Sesiones 1-6: Setup Stripe, backend de planes, paywall, flujo de pago, cancelación/dunning, QA + invitar testers a Pro.

## FASE 4 — App Stores

Pre-trabajo (cuentas Apple/Google, política de privacidad, screenshots, descripción, ASO). Sesiones técnicas (Capacitor/PWABuilder, bundles, TestFlight/Internal Testing). Revisión y publicación.

## Reglas para sostener el plan

1. Una sesión = 2-3 horas. No mezclar tareas.
2. Si una sesión se desborda, pasa a la siguiente del bloque.
3. Cero anotaciones "para después".
4. Cero cambios de plan a mitad de sesión.
5. Lo cerrado no se revisita.

## Bitácora de avance

### Martes 26 mayo 2026
- Fix Wolfelt (commit 61015cb)
- Fix modo parejas (commits b1d5c64, d0d7214, e63cc6d)
- Migración SQL 004 aplicada
- QA modo parejas OK con dos cuentas

### Miércoles 27 mayo 2026
- Fix "Olvidaste tu contraseña" + QA OK (commit fc36f41)
- 6 templates de correo Supabase rediseñados
- Tagline oficial aprobado: "Conoce la huella única de tus hijos"
- SVG coherentes en pantallas auth (commit 692445b)
- 7 hijos fantasma limpiados de BD
- Diagnóstico bug Resend (espera compra dominio)
- Postergación del lanzamiento. Sin fecha fija. Foco en calidad.

### Viernes 29 mayo 2026 — Sesión A cerrada
- Dominio propio comprado y conectado: huella.lat (registrado en Vercel, HTTPS automático).
- Resend configurado con dominio propio huella.lat: verificado con SPF + DKIM vía auto-configure de Vercel.
- API key de Resend creada (Sending access). Variables en Vercel Production: RESEND_API_KEY y RESEND_FROM_EMAIL = "Huella <hola@huella.lat>".
- Correo de invitación a la pareja probado con dos cuentas reales: Delivered en Resend y recibido en bandeja. Modo Pareja desbloqueado en producción.
- Fix del rebote al dominio viejo: en Supabase (Authentication > URL Configuration) se cambió Site URL de huella-theta.vercel.app a huella.lat y se agregaron redirect URLs huella.lat/** y www.huella.lat/**. Verificado: la app ya se queda en huella.lat.
- Deuda menor opcional (no bloqueante): el front en FamilyContext.jsx confía en res.ok en vez de leer el campo "sent" del JSON de /api/invite. Conviene endurecerlo en una próxima pasada.
