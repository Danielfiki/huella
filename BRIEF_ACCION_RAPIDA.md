# Brief de producto — Rediseño de "Acción Rápida" en detalle de episodio

**Versión:** 1.2
**Fecha:** 25 mayo 2026
**Autor:** Daniel + Claude
**Estado:** Final — listo para implementación

**Cambios desde v1.1:**
- Auditoría completa del banco de 82 autores cruzada con evidencia científica y ADN de Huella
- ELIMINADOS del banco 6 autores adicionales por incompatibilidad con el ADN (extinción del llanto, pop-psychology desacreditada, o atribución de autoridad sin credencial clínica):
  - Marc Weissbluth (defensor del "crying it out" desde las 6 semanas)
  - William Sears (attachment parenting con afirmaciones desmentidas por AAP)
  - Kevin Leman (teoría del orden de nacimiento desacreditada en consenso académico)
  - Pamela Druckerman (periodista sin formación clínica; "la pause" es extinción suavizada)
  - Robert Epstein (niega el cerebro adolescente; postura minoritaria contraria al marco de Huella)
  - Richard Ferber (ya marcado en v1.1)
- MANTENIDO en el banco con nota interna: Jonathan Haidt. Su tesis sobre smartphones está en debate académico vivo, no es consenso pero tampoco está desmentido. Se usa solo en dimensión de pantallas/adolescencia, no como autoridad de fondo
- SUMADOS al mapeo de dimensiones (de v1.1, se mantienen): Alan Wolfelt (duelo infantil), Barry Prizant (autismo respetuoso), Elaine Aron (alta sensibilidad)

---

## 1. El problema

Hoy la sección "Acción Rápida" del detalle de episodio:

- Siempre da el mismo consejo (agáchate + mano)
- Siempre cita a Janet Lansbury
- Siempre habla en voz presente, sin importar cuánto tiempo pasó
- Se siente genérica y mecánica

Esto rompe la promesa central de Huella: que cada padre sienta que la app entiende a su hijo específico. Si el consejo es siempre igual, el usuario pierde confianza en la inteligencia de la app.

---

## 2. El estándar al que aspiramos

Cada Acción Rápida debe sentirse como escrita a mano para ese momento, ese niño, esa mamá. Cuando el usuario la lee, debe pensar "esto es para mí, esto es lo que necesito ahora".

Estándar mínimo aceptable:
- Cero repetición literal entre episodios distintos del mismo usuario
- Voz adaptada al tiempo transcurrido (no decir "agáchate ahora" si pasó un día)
- Autor citado coherente con la dimensión central del episodio
- Lenguaje cercano y emocional, no clínico

---

## 3. Las 6 variables que debe considerar

### 3.1. Tiempo de apertura

Diferencia entre `created_at` del episodio y el momento en que el usuario abre el detalle.

| Tiempo | Voz | Ejemplo de apertura |
|---|---|---|
| < 1 hora | Presente activo | "Acércate a su altura..." |
| 1-6 horas | Reflexiva cercana | "Lo que probablemente necesitaba era..." |
| 6-24 horas | Aprendizaje del día | "Mirando lo que pasó hoy..." |
| > 24 horas | Aprendizaje para futuro | "La próxima vez que algo así pase..." |

### 3.2. Edad del hijo

El consejo debe adaptarse a la etapa de desarrollo:

- 0-2 años: regulación externa, presencia física, validación corporal
- 3-5 años: nombrar emociones, predictibilidad, juego como vehículo
- 6-9 años: razonamiento, autonomía progresiva, conversación
- 10+ años: identidad, autorregulación, escucha sin solución

### 3.3. Emoción detectada

Cada emoción tiene caminos distintos:

- Rabia/explosión → desregulación cerebral, no desafío
- Frustración → habilidad rezagada, sobrepasado
- Miedo → necesita protección y predictibilidad
- Tristeza → necesita presencia, no solución
- Vergüenza → necesita reparación del vínculo
- Alegría desbordada → regular sin apagar
- Duelo/pérdida → acompañar sin apurar el proceso

### 3.4. Contexto del episodio

Si el usuario lo aportó (registro completo): gatillo, lugar, con quién, antes y después.

Si fue registro rápido (poco contexto): NO inventar. Trabajar con lo que hay, ser honesto en la generalidad pero útil de todos modos.

### 3.5. Patrón en histórico del niño

¿Es la primera vez o se repite?

- Primera vez → tratar como evento puntual
- Recurrente (3+ en última semana) → mencionar patrón, sugerir mirar antecedentes
- Patrón en hora/lugar/situación → señalarlo con cuidado (sin diagnosticar)

### 3.6. Estado del adulto

Si el usuario menciona cansancio, culpa, frustración consigo mismo, o pide ayuda explícita:

- Validar al adulto primero, antes del consejo sobre el niño
- Recordar que la autorregulación del adulto es el primer paso (Shanker, Maté)

---

## 4. Rotación de autores — por dimensión, no por edad

Hoy el sistema defaultea a Lansbury. Eso debe cambiar a una elección basada en qué dimensión del episodio es la más relevante:

| Dimensión central del episodio | Autores |
|---|---|
| Inmadurez cerebral / desregulación | Siegel, Perry |
| Habilidad rezagada / problemas resolviendo | Greene |
| Autorregulación del adulto / contagio emocional | Shanker, Maté |
| Validación emocional / lenguaje | Faber & Mazlish, Gottman |
| Respeto al ritmo del niño / presencia | Lansbury, Gerber |
| Trauma, estrés tóxico, eventos graves | Perry, van der Kolk |
| Conflicto interno del adulto / disparadores propios | Tsabary, Maté |
| Sueño / rutinas / regulación corporal | Carlos González |
| Apego y conexión | Bowlby, Maté, Neufeld |
| Juego, exploración, autonomía | Lansbury, Gerber |
| Disciplina sin castigo | Markham, Nelsen |
| Comunicación con adolescentes | Damour, Siegel, Steinberg |
| Pantallas / redes sociales / adolescencia digital | Haidt, Twenge (en disputa académica — usar con prudencia) |
| Duelo, pérdida, muerte en la infancia | Wolfelt |
| Autismo, neurodiversidad, perfil sensorial | Prizant |
| Alta sensibilidad, niños altamente sensibles (PAS) | Aron |

Reglas:
- Nunca repetir el mismo autor dos episodios seguidos del mismo usuario
- La cita asociada al autor debe rotar dentro de un pool de mínimo 5 citas por autor
- Si el episodio es ambiguo, elegir el autor cuyo enfoque sea más útil para la acción, no el más conocido
- Los 3 autores específicos (Wolfelt, Prizant, Aron) solo se invocan cuando el episodio claramente toca su dimensión, no se usan como default
- Haidt solo se invoca cuando la dimensión central es uso de pantallas/redes en pre-adolescentes o adolescentes. Nunca como autoridad de fondo en otras dimensiones

---

## 5. Estructura de la Acción Rápida

Cada acción rápida tiene 3 partes mínimas:

### Parte 1 — Anclaje emocional (1 frase)
Reconoce el momento del usuario o del niño. Adaptada al tiempo de apertura.

Ejemplos:
- "Esto está pasando ahora y eso es agotador."
- "Ya pasó, pero quedó dando vueltas."
- "Mirando lo que pasó hoy con calma..."

### Parte 2 — Acción o reflexión concreta (2-3 frases)
Lo que el adulto puede hacer ahora según el tiempo:

- Si presente: acción física/verbal inmediata
- Si pasado cercano: gesto de reparación
- Si pasado lejano: aprendizaje para próxima vez

### Parte 3 — Anclaje teórico (1 frase + autor)
Por qué esto tiene sentido, en lenguaje del autor elegido. Breve, no académico.

Longitud total: 40-70 palabras. No más.

---

## 6. Ejemplos concretos

### Ejemplo A — Registro rápido, hijo 3 años, "pegó a hermana", abierto 5 min después

Mal (estado actual):
> Agáchate, ponte a su altura, ofrécele tu mano. Tu hijo te necesita presente. — Janet Lansbury

Bien (estado deseado):
> Esto está caliente todavía. A los 3 años, pegar es lenguaje, no maldad — su cerebro emocional ganó la pelea contra su parte racional. Acércate sin retarlo todavía, ayúdalo a bajar el cuerpo primero. Las palabras vienen después.
>
> — Daniel Siegel · Desarrollo cerebral

### Ejemplo B — Mismo episodio, abierto al día siguiente

Mal (estado actual):
> Agáchate, ponte a su altura, ofrécele tu mano. — Janet Lansbury

Bien (estado deseado):
> Ya pasó. Hoy, sin urgencia, puedes acercarte y nombrar lo de ayer: "Cuando le pegaste a tu hermana, te sentías muy enojado, ¿cierto?". Eso no le da permiso, le da palabras para la próxima vez.
>
> — Faber & Mazlish · Validación emocional

### Ejemplo C — Registro completo, hijo 7 años, "se frustró con la tarea", abierto 2 horas después

Bien:
> A los 7, frustrarse con la tarea no es flojera — es una habilidad rezagada de tolerar la dificultad. Cuando llegue de nuevo ese momento, antes de pedirle que siga, pregúntale qué se le hizo difícil. Resolver con él, no por él.
>
> — Ross Greene · Habilidad rezagada

### Ejemplo D — Hijo 5 años, episodio recurrente (3ª vez esta semana misma situación: dormir)

Bien:
> Esta es la tercera vez esta semana en torno al sueño. No es coincidencia — algo en la rutina antes de dormir está sobrepasándolo. Esta noche, prueba bajando el ritmo 30 min antes y observa qué cambia.
>
> — Stanley Greenspan · Regulación

### Ejemplo E — Hijo 4 años, contexto "pregunta por la abuela que murió hace dos meses", abierto al día siguiente

Bien:
> Ya pasó el momento, pero quedó dando vueltas en él. A esa edad, el duelo no avanza en línea — vuelve en oleadas, especialmente cuando algo lo recuerda. Hoy puedes nombrarlo simple: "Echas de menos a la abuela, ¿cierto?". No hace falta solucionarlo, solo acompañarlo ahí.
>
> — Alan Wolfelt · Duelo infantil

### Ejemplo F — Hijo 6 años con perfil sensorial intenso, "colapso en supermercado", abierto 3 horas después

Bien:
> Lo que probablemente lo desbordó no fue el supermercado — fue lo que su sistema sensorial venía acumulando antes. Para él, esos espacios son ruido, luz y gente todo al mismo tiempo. La próxima vez, anticipar y dar pausas no es sobreproteger, es respetar cómo procesa el mundo.
>
> — Barry Prizant · Neurodiversidad respetuosa

### Ejemplo G — Hija 8 años altamente sensible, "lloró por crítica menor del profesor", abierto al día siguiente

Bien:
> Para una niña altamente sensible, una observación pequeña puede sentirse como un golpe grande — no es exageración, es cómo está cableado su sistema. Hoy, sin minimizar lo que sintió, puedes decirle: "Lo que pasó ayer te dolió, y eso no es debilidad". Eso le enseña a confiar en lo que siente.
>
> — Elaine Aron · Alta sensibilidad

---

## 7. Casos especiales

### Registro rápido con poquísima info
No inventar contexto. Usar emoción detectada + edad como mínimos. La acción puede ser más general pero nunca repetir literal entre episodios.

### Episodio antiguo (semanas atrás)
Pasar a modo "aprendizaje archivado": "Esto ya quedó atrás. Lo que aprendemos de mirarlo hoy es..."

### Episodios positivos (alegría, conexión)
También merecen Acción Rápida. No solo regular lo difícil — celebrar y consolidar lo que funcionó.

### Estado del adulto crítico (culpa fuerte, agotamiento)
La acción rápida prioriza al adulto antes que al niño. Primero el oxígeno propio.

---

## 8. Lo que NO debe pasar nunca

- Misma frase de apertura dos veces seguidas
- Mismo autor dos episodios seguidos
- Voz en presente cuando el episodio fue hace más de 1 hora
- Acción genérica tipo "respira y acompáña" sin ancla específica
- Tono clínico ("se observa una desregulación") — siempre cercano
- Inventar detalles que el usuario no aportó
- Diagnosticar al niño o al adulto
- Citar a ninguno de los 6 autores eliminados (ver sección 9): Ferber, Weissbluth, Sears, Leman, Druckerman, Epstein

---

## 9. Limpieza del banco de autores (precondición)

Antes de implementar el rediseño, el banco de autores en `src/services/anthropic.js` debe quedar limpio. Auditoría cruzada con evidencia científica y ADN de Huella detectó 6 autores incompatibles.

### ELIMINAR del archivo `src/services/anthropic.js`:

Cada uno de estos nombres debe ser quitado de toda mención (prosa de `marcoEdad()`, `TEMAS_CONTEMPORANEOS`, `PROMPT_PRIMER_ENCUENTRO`, y cualquier otra ocurrencia):

1. **Richard Ferber** — Creador del método Ferber (extinción gradual del llanto). Incompatible con regulación con presencia.
2. **Marc Weissbluth** — Autor de "Healthy Sleep Habits, Happy Child". Defensor del "crying it out" desde las 6 semanas. Mismo árbol que Ferber.
3. **William Sears** — Su "attachment parenting" no es lo mismo que la teoría del apego de Bowlby. La AAP no respalda varias de sus tesis específicas. Genera culpa maternal. Lo valioso que aporta (porteo, lactancia, colecho) ya está cubierto por Bowlby, Maté, Neufeld, González.
4. **Kevin Leman** — Teoría del orden de nacimiento desacreditada en consenso académico. Pop-psychology con evidencia anecdótica.
5. **Pamela Druckerman** — Periodista sin formación clínica. Su "la pause" es extinción del llanto suavizada. Huella no atribuye autoridad de crianza a periodistas sin credencial.
6. **Robert Epstein** — Sostiene que el "cerebro adolescente" es un mito cultural. Postura minoritaria contraria al consenso de neurociencia del desarrollo que Huella usa (Siegel, Steinberg, Damour).

### SUMAR al banco:

1. **Alan Wolfelt** → Categoría nueva "Duelo y pérdida en la infancia". Asociar a episodios donde el contexto mencione muerte, pérdida, separación significativa, abuelos enfermos.
2. **Barry Prizant** → Categoría nueva "Autismo y neurodiversidad". Asociar a episodios donde el usuario mencione perfil sensorial, autismo, diagnóstico de neurodiversidad, dificultades de procesamiento.
3. **Elaine Aron** → Categoría nueva "Alta sensibilidad (PAS)". Asociar a episodios donde el usuario describa al hijo como muy sensible, reactivo a estímulos, abrumado por críticas, niño altamente sensible.

### MANTENER con nota interna:

**Jonathan Haidt** — Se queda en el banco pero con uso acotado. Su tesis sobre smartphones y salud mental adolescente está en debate académico (Nature publicó crítica fuerte de Candice Odgers). Solo se invoca en dimensión de pantallas/redes/adolescencia digital, nunca como autoridad de fondo en otras dimensiones. No usar para episodios fuera de ese contexto específico.

---

## 10. Implementación técnica (alto nivel para Code)

Code debe auditar el código actual y resolver lo siguiente como parte de la implementación:

- Localizar dónde se genera hoy la Acción Rápida (probablemente `src/services/anthropic.js`)
- Identificar el prompt actual y las variables que recibe
- Ampliar `marcoEdad()` o crear `marcoDimension()` que mapee episodio → dimensión central → autor recomendado
- Implementar lógica de "último autor usado" para no repetir (puede ser campo en tabla `episodios` o cache local en localStorage)
- Pasar `created_at` y `now()` al prompt para que la IA calcule tiempo transcurrido y ajuste voz
- Generar pool de mínimo 5 citas por autor activo (al menos para los autores más usados: Siegel, Perry, Greene, Shanker, Maté, Faber & Mazlish, Lansbury, Wolfelt, Prizant, Aron)

Code resuelve estas decisiones técnicas y reporta el plan antes de ejecutar cambios mayores.

---

## 11. Métricas de éxito

Cómo sabremos que el rediseño funcionó:

- Daniel registra 5 episodios distintos y las 5 Acciones Rápidas son claramente distintas en tono, autor y enfoque
- Daniel abre el mismo episodio dos veces con días de diferencia y la voz se adapta al tiempo
- Daniel siente que cada acción es para ese momento específico, no genérica
- Cero repeticiones literales en 10 episodios consecutivos
- Las dimensiones nuevas (duelo, neurodiversidad, alta sensibilidad) se activan correctamente cuando el contexto del episodio las menciona
- Cero menciones a Ferber, Weissbluth, Sears, Leman, Druckerman, Epstein en cualquier output de la app

---

## 12. Banco final tras limpieza (77 autores)

**Eliminados (6):** Ferber, Weissbluth, Sears, Leman, Druckerman, Epstein
**Sumados (3):** Wolfelt, Prizant, Aron
**Total:** 82 - 6 + 3 = 77 autores

Lista completa final, en orden alfabético por apellido:

Ainsworth, Aron, Bank, Barkley, Baumrind, Bowlby, Bradley, Brazelton, Brené Brown, Thomas Brown, Bryson, Busman, Chansky, Cloud, Coloroso, Damour, Diamond, Erikson, Faber, Fraiberg, Gerber, Ginott, Ginsburg, Carlos González, Gottman, Grandin, Greene, Greenspan, Gross-Loh, Gunnar, Haidt (uso acotado, ver sección 9), Hallowell, Harkness, Hartzell, Kabat-Zinn, Kagan, Kahn, Kamenetz, Karp, Kazdin, Becky Kennedy, Kohn, Kuhl, Lansbury, Levine, Lyons, Markham, Maté, Mazlish, Meltzoff, Menakem, Nelsen, Neufeld, Perry, Peters, Piaget, Pickhardt, Porges, Prizant, Rich, Rowell, Samalin, Satter, Schore, Shanker, Siegel, Steinberg, Super, Townsend, Tronick, Tsabary, Turecki, Twenge, Uhls, van der Kolk, Vygotsky, Wolf, Wolfelt, Wolynn.
