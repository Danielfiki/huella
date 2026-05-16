# Estados y transiciones · Estrategias

## Vista 1 · Principal (lista)
- **loading-init** · cargando state.estrategias e interpretarPatrones() → `con-data` | `vacio`
- **vacio** · 0 episodios, 0 planes → muestra `<EmptyPuerta1 totalEpisodios={0}/>` + `<SelectorHabilidades/>`
- **vacio-con-episodios** · N episodios pero sin patrón claro → `<EmptyPuerta1 totalEpisodios={N}/>` + `<SelectorHabilidades/>`
- **con-sugerencia** · interpretarPatrones devolvió patrón + no descartado → `<SugerenciaIACard/>` + `<SelectorHabilidades/>`
- **con-plan-activo** · existe plan donde estado='activo' → `<EstrategiaActivaCard/>` reemplaza el slot superior; sugerencia se oculta hasta cerrar el plan activo
- **con-pasados** · existen planes completados/abandonados → `<DrawerPasados/>` al fondo

Transiciones:
- Aceptar sugerencia → navega a `/estrategias/nuevo?habilidad=X&episodios=a,b,c`
- Cerrar sugerencia (✕) → INSERT en `estrategia_sugerencias_descartadas` → optimistic hide
- Tap habilidad en selector → navega a `/estrategias/nuevo?habilidad=X`
- Tap "Ver tu semana N" → navega a `/estrategias/:id`
- Tap card pasada → navega a `/estrategias/:id` (read-only, sin check-in)

## Vista 2 · Detalle (`/estrategias/:id`)
- **loading** · cargando plan + semanas
- **activo** · plan.estado='activo' → muestra `<SemanaActiva/>` para semana_actual, `<SemanaPasada/>` para anteriores, `<SemanaFutura/>` para futuras
- **completado** · plan.estado='completado' → muestra `<BannerCompletado/>` arriba, todas las semanas como pasadas
- **abandonado** · plan.estado='abandonado' → mismo que completado pero con CTA "Retomar este plan"

Transiciones:
- Toggle tarea → optimistic UPDATE en `estrategia_tareas`
- "Avanzar a sem N+1" (o "Cerrar el plan") con check-in → 
  - INSERT reflexión en `estrategia_semanas`
  - UPDATE `plan.semana_actual = N+1` o `plan.completado_at = now()` si era última
  - Si última → navegar a vista detalle ya completada (banner se muestra automáticamente)

## Vista 3 · Creación (`/estrategias/nuevo`)
- **paso-1-confirmar** · query params habilidad + episodios → hero confirmatorio + textarea opcional
- **generando** · `<LoadingDignificado/>` con 4 pasos:
  1. "Leyendo lo que registraste"
  2. "Buscando bibliografía pediátrica"
  3. "Adaptando a la edad de tu hijo"
  4. "Escribiendo tu plan personalizado"
- **error** · falla de generarEstrategia/generarTareas → mostrar error + retry
- **listo** · plan creado → navegar a `/estrategias/:id`

## Iteraciones futuras (no incluidas)
- **plan-pausado** · estado intermedio entre activo y abandonado
- **multi-hijo** · selector de hijo en topbar
- **detector mejorado** · interpretarPatrones devuelve directamente formato de SugerenciaIACard sin adaptador
