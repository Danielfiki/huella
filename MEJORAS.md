# MEJORAS.md — Diagnóstico UX completo de Huella

*Revisión realizada el 19 de abril de 2026. No implementar sin priorizar con el equipo.*

---

## 1. Registro de episodios

### Lo que está bien
El flujo general es correcto: elegir tipo → intensidad → contexto → gatillantes → estado padre → guardar. La separación en cards ayuda a no abrumar. El botón está deshabilitado si no se eligió tipo. La pantalla post-guardado con la orientación es el mejor momento de la app.

### Lo que mejoraría

**Tipos de episodio** — Faltan casos relevantes y sobran términos adultos. "Rechazo social" es ambiguo (¿es que rechazó a otros o fue rechazado por otros?). "Desconexión" es demasiado clínico para un padre de las 11pm.

| Actual | Sugerencia |
|---|---|
| Rabieta | Rabieta / explosión |
| Llanto | Llanto intenso |
| Agresividad | Golpes / agresividad |
| Miedo | Miedo / angustia |
| Dificultad para dormir | No quiere dormir |
| Rechazo social | Se aisló / no quiso relacionarse |
| Desconexión | Se cerró / no respondía |
| — | Oposición / no coopera *(agregar)* |
| Otro | Otro |

**Intensidad** — El slider tiene 5 posiciones pero solo 3 etiquetas (Leve, Moderado, Intenso). Un padre no sabe si 2 es "leve bajo" o "leve alto". Cambiar a 5 botones grandes es más claro y más rápido en móvil:
`😌 Muy leve` · `🙁 Leve` · `😟 Moderado` · `😣 Intenso` · `😱 Muy intenso`

**Gatillantes** — Faltan tres relevantes: `Sobreestimulación`, `Dolor o malestar físico`, `Conflicto en casa`. "Conflicto con pares" suena a reporte escolar — cambiar a "Pelea con amigos". "Estrés familiar" es vago — podría ser "Tensión en casa".

**Estado del padre** — Un textarea libre es demasiado trabajo en el momento del episodio. Nadie escribe bien cuando está desbordado. Cambiar a un picker rápido con 5-6 opciones (`Calmado`, `Frustrado`, `Cansado`, `Ansioso`, `Triste`, `Abrumado`) + textarea opcional.

**Hora del episodio** — El timestamp siempre es "ahora". Los padres registran horas después. Falta un selector de hora simple: "¿Cuándo pasó?" con opciones rápidas (`Hace menos de 1 hora`, `Esta mañana`, `Esta tarde`, `Ayer`) más un picker de hora exacta opcional.

**Flujo después de guardar** — El estado "guardado" muestra tipo e intensidad pero no los gatillantes ni el estado del padre. El usuario no puede verificar qué guardó. No hay botón "Registrar otro episodio" — solo "Volver al inicio". Si hubo dos episodios seguidos, tiene que navegar, volver a "Registrar" y empezar de cero.

**El formulario es muy largo** — 5 cards con scroll. En momento de crisis, los campos opcionales (contexto, estado padre) deberían estar colapsados y expandirse solo si el padre los quiere llenar.

---

## 2. Panel de inicio

### Lo que está bien
El botón "Registrar episodio" es prominente y visible. Los gráficos con datos reales son valiosos. El análisis de patrones con IA es el feature más diferenciador.

### Lo que mejoraría

**El saludo es genérico** — `"Hola"` con `"Esto es lo que está pasando con [nombre]"` es frío y mecánico. No cambia según la hora del día, no usa el nombre del padre, no refleja el contexto real. Propuesta:
- Mañana: `"Buenos días. ¿Cómo empezó [nombre] hoy?"`
- Tarde: `"Buenas tardes. Llevas una semana intensa con [nombre]."`
- Noche: `"Buenas noches. Registrar antes de dormir ayuda a ver el patrón."`
- Si esta semana hubo muchos episodios: reconocerlo con calidez.
- Si llevan 5 días sin registrar: mencionarlo sin culpa.

**El ResumenSemanal tiene un bug de legibilidad** — La tercera columna muestra el *conteo* del tipo más frecuente (ej: `3`) con el *nombre* del tipo como etiqueta (`rabieta`). Es confuso. Debería mostrar el emoji + nombre del tipo como dato principal, con "más frecuente" como etiqueta.

**El análisis de patrones está enterrado** — Está después de 3 gráficos, al final de la página. Es el feature más poderoso. Debería estar más visible, quizás integrado en el saludo cuando hay suficientes datos.

**Los gráficos no hablan** — Muestran datos pero no dicen qué significan. Un padre ve "frecuencia semanal" pero no sabe si lo que ve es bueno o malo. Agregar una línea de contexto debajo de cada gráfico: `"Esta semana: 4 episodios. La semana pasada: 7. Va mejorando."` o `"Los lunes tienen más episodios que el resto de la semana."`.

**Sin hijo configurado** — Muestra "Esto es lo que está pasando con tu hijo" cuando no hay nombre configurado. Debería ser un call to action: `"Primero, cuéntanos el nombre y edad de tu hijo/a → configurar perfil"`.

---

## 3. Historial

### Lo que está bien
La agrupación por día (Hoy/Ayer/fecha) es el patrón correcto. El badge de intensidad con color es efectivo. La orientación colapsable es buena para no sobrecargar la vista.

### Lo que mejoraría

**No se puede eliminar ni editar un episodio** — Error de typo, intensidad equivocada, episodio cargado duplicado: todo queda para siempre. Al menos un swipe-to-delete o un botón de borrar.

**El estado del padre no aparece** — Se registra, se envía a la IA, pero nunca se muestra en la tarjeta del historial. Si el padre quiere revisar cómo estaba él cuando sucedió, no puede.

**No hay filtros** — Con 30+ episodios no hay forma de filtrar por tipo, gatillante o rango de fechas. Un filtro simple de 3-4 opciones cambiaría completamente la utilidad del historial.

**La orientación siempre colapsada** — Si un padre vuelve a revisar la orientación de la semana pasada, tiene que recordar que existe y hacer clic para verla. Mostrar al menos las primeras 2 líneas en la tarjeta sería suficiente para recordarle el contenido.

**El botón "Exportar PDF" está en el lugar equivocado** — Está al tope de la página, antes del contenido. Se ve como si la app quisiera que el usuario exporte antes de ver nada. Bajarlo al fondo o ponerlo en un menú de acciones.

**No hay estadística de día** — Al agrupar por día, podría mostrar una línea sutil: `"3 episodios · Intensidad promedio: 4"`. Ayuda a comparar días sin hacer cálculos.

---

## 4. Estrategias

### Lo que está bien
El flow de 3 vistas (lista → nueva → detalle) es limpio. El plan semana a semana con "Activa / Completada / Bloqueada" es visualmente claro. La barra de progreso en la lista da feedback inmediato.

### Lo que mejoraría

**Las habilidades son demasiado abstractas** — "Autorregulación emocional" y "Resiliencia ante la frustración" suenan a un manual de psicología. Un padre que tiene rabietas intensas no mapea eso fácilmente. Propuesta con lenguaje más concreto:

| Actual | Sugerencia |
|---|---|
| Autorregulación emocional | Calmarse cuando explota |
| Resiliencia ante la frustración | Aceptar el "no" sin crisis |
| Tolerancia a los cambios | Manejar los cambios de rutina |
| Habilidades sociales | Relacionarse mejor con otros niños |
| Manejo del miedo | Manejar el miedo y la angustia |
| Concentración y calma | Concentrarse y calmarse |

**No hay reflexión antes de avanzar de semana** — El botón "Avanzar a semana 2" es inmediato. No hay check-in. Una pregunta simple antes de avanzar agregaría datos valiosos y haría que el avance se sienta merecido: `"¿Cómo fue la semana? ¿Notaste algún cambio?"` con un textarea breve opcional.

**No se puede eliminar una estrategia** — Si se crea por error no hay salida.

**Al completar, el banner solo dice "Considera crear una nueva"** — Sin botón directo. El momento en que un padre completa las 4 semanas es el mejor momento para retenerlo. Debería ser una pantalla celebratoria con un botón "Nueva estrategia" bien visible.

**Desconexión total con los episodios** — Las estrategias se crean en el vacío. No hay ningún vínculo con los episodios registrados. La IA podría sugerir: "Basado en los 7 episodios de rabieta del último mes, te sugerimos trabajar esta habilidad."

**No muestra la fecha de cada semana** — "Semana 2" no dice cuándo debería empezar ni cuándo termina. Una línea `"Empieza el 22 de abril"` haría el plan más concreto y accionable.

---

## 5. Hitos positivos

### Lo que está bien
Las categorías con emoji son cálidas y acertadas. El copy del empty state ("La primera vez que se calmó solo...") es emotivo y uno de los mejores textos de la app.

### Lo que mejoraría

**El formulario está oculto detrás de un botón** — Para una feature de "captura el momento", tener que presionar "Registrar" para que aparezca el formulario es una fricción innecesaria. El formulario debería estar visible directamente, o mejor: el botón grande en la lista debería abrir un modal/sheet rápido.

**La descripción es obligatoria pero debería ser opcional** — A veces solo quieres marcar "Se calmó solo" sin escribir nada. La categoría sola ya es suficiente información.

**No hay respuesta de la IA tras guardar** — Es la única sección donde guardar no genera ningún feedback más allá de "aparece en la lista". Un mensaje breve de la IA al guardar un hito sería muy potente: `"Que [nombre] haya pedido disculpas es una señal de que su cerebro está desarrollando empatía y regulación. Estos momentos importan más de lo que parece."` Dos líneas. Sin pedirlo explícitamente, sin un botón.

**Los hitos no aparecen en el panel** — El panel muestra gráficos de episodios pero nunca menciona los hitos. Deberían tener visibilidad ahí: "Esta semana: 2 hitos positivos" junto a "4 episodios".

**"Hitos positivos"** — El nombre de la pestaña en la nav bar es "Hitos". Para un padre nuevo, "Hitos" podría no ser claro. "Logros" o "Avances" comunica mejor.

---

## 6. Perfil

### Lo que está bien
El formulario de hijo con nombre y edad está bien integrado con Supabase. Las estadísticas de actividad son un buen toque motivacional. El link a términos al fondo es correcto.

### Lo que mejoraría

**No hay nombre del padre/madre** — La app dice "Hola" pero no sabe cómo llamar al padre. Agregar un campo "¿Cómo te llamamos a ti?" en el perfil permitiría personalizar el saludo del panel.

**Solo soporta un hijo** — No hay indicación de esta limitación. Un padre con dos hijos en edad preescolar no tiene cómo distinguirlos. Al menos debería haber un aviso o, idealmente, un selector de hijo activo.

**Las estadísticas son conteos puros** — `"4 episodios"` no dice nada en contexto. Mejor: `"4 episodios esta semana · 2.8 de intensidad promedio"` o `"Llevas 3 semanas usando Huella · 12 episodios registrados"`.

**No hay opción de eliminar cuenta** — Los términos dicen que hay que escribir un email para eliminar la cuenta. Debería haber un botón directo en perfil, con confirmación. Es un requerimiento legal (Ley 19.628).

**No hay "Cambiar contraseña"** — Feature básico de cualquier app con auth.

**El botón "Cerrar sesión" es el más grande y visible** — Visualmente compite con "Guardar" del formulario del hijo. Debería ser texto pequeño, no un botón full-width igual al de guardar.

---

## 7. Colores y diseño general

### Lo que está bien
La paleta cálida (salmón/crema) es coherente con el tono emocional del producto. Las CSS variables están bien organizadas. Inter es la tipografía correcta. El max-width de 430px está bien pensado para móvil.

### Lo que mejoraría

**No hay modo oscuro** — El onboarding mismo dice "Son las 11pm". Un porcentaje alto de uso va a ser nocturno. Blanco brillante en pantalla a las 11pm es literalmente doloroso. Un modo oscuro suave (no negro puro, sino un `#1a1410` tipo noche cálida) sería muy relevante aquí.

**La nav bar no tiene suficiente diferenciación de estado activo** — Solo cambia el color del ícono. No hay pill/background. En mobile, el estado activo es difícil de detectar rápido.

**El ítem "Registrar" en la nav** — El ícono `+` es genérico. La acción más importante de la app merece destacarse: botón central más grande, de color primario, elevado sobre la barra.

**La etiqueta "Hitos" en la nav** — "Logros" o "Avances" es más claro para un padre que no conoce el término.

**Cards tocables sin affordance** — Las cards de estrategias son clickeables pero no tienen ningún indicador visual de que son tocables (sin sombra hover, sin chevron visible en el estado base, sin ripple). En móvil, un padre prueba tocar y no sabe si funcionó.

**Estados de éxito poco celebratorios** — Al guardar un episodio, aparece `✅`. Un momento de "lo guardé, pude registrar esto que pasó" merece más peso emocional. Una animación suave, un color, una frase de reconocimiento.

**Sin skeleton loading** — Al entrar a la app, hay un flash de contenido vacío antes de que carguen los datos de Supabase. Las páginas deberían tener esqueletos de carga que mantengan el layout.

**Tipografía del ResumenSemanal** — Usa `color: var(--color-muted, #6b7280)` con fallback hardcodeado en lugar del token del sistema `var(--color-text-muted)`. Inconsistencia menor pero real.

---

## Resumen de prioridades

| Prioridad | Sección | Mejora | Impacto |
|---|---|---|---|
| ~~🔴 Alta~~ | ~~Registro~~ | ~~Picker de estado del padre (5 opciones rápidas) en lugar de textarea~~ | ✅ 2026-04-19 |
| ~~🔴 Alta~~ | ~~Registro~~ | ~~"¿Cuándo pasó?" — selector de hora del episodio~~ | ✅ 2026-04-19 |
| ~~🔴 Alta~~ | ~~Registro~~ | ~~Intensidad como 5 botones, no slider~~ | ✅ 2026-04-19 |
| ~~🔴 Alta~~ | ~~Estrategias~~ | ~~Habilidades en lenguaje de padre, no clínico~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Panel~~ | ~~Saludo dinámico por hora del día~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Panel~~ | ~~Fix ResumenSemanal — tercer columna (bug real)~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Hitos~~ | ~~Respuesta automática breve de IA al guardar un hito~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Historial~~ | ~~Borrar episodio (con confirmación de 2 pasos)~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Perfil~~ | ~~Campo nombre del padre/madre~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Panel~~ | ~~Hitos positivos visibles en el panel~~ | ✅ 2026-04-19 |
| ~~🟡 Media~~ | ~~Estrategias~~ | ~~Check-in antes de avanzar de semana~~ | ✅ 2026-04-19 |
| ~~🟢 Baja~~ | ~~Diseño~~ | ~~Modo oscuro (noche cálida, no negro puro)~~ | ✅ 2026-04-19 |
| ~~🟢 Baja~~ | ~~Nav~~ | ~~"Hitos" → "Logros"~~ | ✅ 2026-04-19 |
| ~~🟢 Baja~~ | ~~Nav~~ | ~~Botón "Registrar" destacado visualmente~~ | ✅ 2026-04-19 |
| ~~🟢 Baja~~ | ~~Perfil~~ | ~~Eliminar cuenta desde la app~~ | ✅ 2026-04-19 |
| ~~🟢 Baja~~ | ~~Diseño~~ | ~~Skeleton loading en todas las páginas~~ | ✅ 2026-04-19 |

---

*Archivo generado por revisión de código + análisis UX. Actualizar a medida que se implementen mejoras.*

---

## Deuda técnica detectada — Estrategias (2026-05-08)

### Migración SQL pendiente (no urgente)
La columna `plan` en tabla `estrategias` es `TEXT`. Funciona porque ahora la parseamos en `parsePlanField()`, pero JSONB sería más limpio y permitiría queries directas. Correr cuando sea conveniente:
```sql
ALTER TABLE estrategias ALTER COLUMN plan TYPE jsonb USING plan::jsonb;
```

### Posible bug de duplicados al crear plan de misma habilidad
No verificado, pero sospechoso: si el usuario presiona "Generar mi plan" dos veces rápido (por doble-tap o red lenta), `EstrategiaNuevaPage` podría hacer dos INSERTs. La variable `estado` pasa a `'generando'` en el primer click, lo que desactiva el botón, pero no hay `useRef` ni flag persistente. Agregar un guard con `useRef(false)` o deshabilitar el botón con `disabled={estado !== 'paso-1-confirmar'}`.

### `checkins` column — default `'{}'::jsonb` pero se espera array
El schema define `checkins jsonb default '{}'::jsonb` (objeto vacío) pero el código trata `checkins` como array: `Array.isArray(row.checkins)`. Si un plan nuevo tiene `checkins = {}`, `Array.isArray({})` = false, y se devuelve `{}` (no array). El `checkin.find(...)` fallaría. En la práctica, los planes nuevos nunca tienen checkins al crear (se inicializa en `[]` en el dispatch), pero si alguien consulta un plan antes de hacer el primer check-in podría haber un edge case. Solución: cambiar el default a `'[]'::jsonb` en el schema, o manejar `{}` en el mapper.
