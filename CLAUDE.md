# Huella — Project Memory

## Qué es Huella

Huella es una app de crianza con IA en español latinoamericano que ayuda a padres a registrar y entender los episodios conductuales de sus hijos. Provee guía con IA, análisis de patrones y estrategias de crianza basadas en frameworks clínicos (Siegel, Perry, Shanker, Greene, Lansbury, Maté, y 70+ expertos calibrados por edad).

- **Live:** huella-theta.vercel.app
- **GitHub:** github.com/Danielfiki/huella
- **Owner:** Daniel — primera experiencia construyendo apps, no es developer profesional

## Stack técnico

- Frontend: React + Vite
- Backend/DB: Supabase (auth, RLS, RPC functions, SQL Editor para schema)
- AI: Anthropic API (`src/services/anthropic.js`)
- Deploy: Vercel (auto-deploy en `git push origin main`)
- Idioma: código en inglés, copy de UI 100% en español latinoamericano natural (no traducido)

## Sistema de diseño — REGLAS INMUTABLES

La fuente única de verdad del diseño es `src/index.css`. Todos los colores, tipografías, sombras, radios y demás tokens viven ahí como CSS variables.

### SIEMPRE

- Usa las CSS variables existentes de `src/index.css` para TODOS los colores, fuentes, tamaños, sombras y border-radii
- Referencia variables con sintaxis `var(--color-primary)`, nunca hex directos
- Si necesitas un token nuevo, AGRÉGALO primero a `src/index.css` (incluyendo override en el bloque `@media (prefers-color-scheme: dark)`), luego úsalo
- Respeta la paleta "Mocha Mix": Mocha header, Tangerine primary, Cream/Vanilla fondos, Pistachio/Strawberry acentos
- Tipografía: Fraunces para headings, Plus Jakarta Sans para cuerpo

### NUNCA

- Introduzcas hex colors hardcodeados, rgb/rgba, font-sizes, sombras o radii directamente en CSS modules ni en inline styles JSX
- Definas un estilo visual nuevo sin primero verificar si un token existente lo cubre
- Modifiques `src/index.css` sin considerar el impacto en componentes existentes

### Handoffs desde Claude Design

Cuando implementes un diseño que viene de un handoff bundle de Claude Design:
- Sigue las instrucciones del handoff exactamente
- El handoff es la fuente de verdad para ese cambio específico
- Si el handoff referencia tokens nuevos, agrégalos a `src/index.css` correctamente (con override de dark mode)

## Estilo de comunicación

- Responde en español latinoamericano, conversacional
- Daniel no es developer profesional — explica decisiones técnicas brevemente, evita jerga innecesaria
- Da instrucciones concretas y direccionales ("anda al SQL Editor de Supabase y corre esta query"), no vagas
- Una acción clara a la vez; múltiples opciones simultáneas confunden
- Nunca declares un bug "resuelto" sin verificación previa de Daniel
- Los pasos de Supabase SQL siempre se separan con queries listas para copy-paste

## PROTOCOLO ANTI-DESASTRE

Reglas duras. No negociables. Aplican a TODA sesión.

1. **Investigar es libre; modificar no.** Leer código, rastrear flujos y diagnosticar no requiere permiso. Pero **MODIFICAR código requiere confirmación explícita de Daniel de que el comportamiento es un defecto real, no una feature intencional.** Ante la duda, se pregunta antes de tocar.
2. **Síntoma en una frase antes de modificar.** Antes de cambiar nada, escribe el síntoma así: *"hoy se ve X / debería verse Y"*. Si no se puede formular esa frase, **NO es un bug accionable — se pausa** (no se toca el código).
3. **Nada se commitea ni se pushea hasta que Daniel apruebe el QA visual.** Compilar (`npm run build`) y dejar el cambio listo está bien; `git commit` / `git push` solo después de que Daniel revise en la app y dé el OK.

## Workflow

- Al inicio de cada sesión: lee `ESTADO.md` para el estado actual
- Al final de cada sesión: actualiza `ESTADO.md` con lo completado y lo pendiente
- Después de cada cambio funcionando: `git add -A && git commit -m "..." && git push` para deploy a Vercel
