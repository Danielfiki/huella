import { supabase } from '../lib/supabase.js'

async function llamarAPI(prompt, max_tokens) {
  const headers = { 'content-type': 'application/json' }

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  }

  const response = await fetch('/api/anthropic', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, max_tokens }),
  })

  if (response.status === 429) {
    const err = await response.json()
    throw new Error(err.error || 'Límite diario de consultas alcanzado. Vuelve mañana.')
  }

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al conectar con la IA')
  }

  const data = await response.json()
  return data.text
}

function marcoEdad(edad) {
  const n = parseInt(edad, 10)
  if (isNaN(n)) return marcoEdad(4)

  if (n <= 2) {
    return `MARCO CIENTÍFICO (0-2 años):
El cerebro del bebé depende por completo del adulto como regulador externo — la corteza prefrontal es funcionalmente inexistente (Bowlby/Ainsworth, teoría del apego). Las respuestas de lucha, huida o congelamiento son reflejos subcorticales automáticos, nunca conductas intencionales. El sistema nervioso autónomo está en desarrollo (Porges, teoría polivagal): el niño no puede calmarse solo; solo puede calmarse a través de la corregulación del adulto. El experimento Still Face de Tronick muestra que incluso segundos de no-respuesta del cuidador desregulan el sistema nervioso del bebé. Allan Schore (regulación afectiva del hemisferio derecho): los primeros 3 años construyen la arquitectura cerebral literal; el apego seguro regula activamente la maduración del córtex orbitofrontal derecho, base neurobiológica de la regulación emocional de por vida — el hemisferio derecho se desarrolla primero y opera mediante comunicación implícita, no verbal. Harvey Karp (cuarto trimestre del embarazo): las 5 S — swaddle (envolver firmemente), side/stomach position (posición de lado), shush (sonido blanco), swing (movimiento rítmico) y suck (succión) — replican el entorno uterino y activan el reflejo calmante durante el período de mayor vulnerabilidad neurológica postnatal. T. Berry Brazelton (touchpoints del desarrollo): los momentos de regresión conductual son señales predecibles de reorganización neurológica que ocurren justo antes de cada salto evolutivo — el bebé comunica con el cuerpo su estado de reorganización interna; el "retroceso" es evidencia de progreso, no de problema. Selma Fraiberg ("Fantasmas en la habitación del bebé"): el trauma no resuelto del padre/madre se transmite directamente al bebé a través de la interacción cotidiana — las respuestas automáticas de crianza del adulto replican sus propias experiencias de apego tempranas, activando patrones de apego desorganizado antes de que el bebé tenga lenguaje. Ed Tronick (reparación del vínculo): no se trata de ser perfecto sino de reparar — el ciclo sintonía-dessintonía-reparación es el mecanismo que construye el apego seguro; el bebé aprende que la ruptura de la conexión es reparable, lo cual es la base de la regulación emocional futura. Magda Gerber / RIE: el bebé tiene competencia propia innata; observar antes de intervenir, hablarle con respeto desde el nacimiento, no anticiparse sistemáticamente a cada necesidad ni sobreestimular — la competencia emerge cuando se da espacio. Andrew Meltzoff (imitación neonatal como mecanismo de aprendizaje): los bebés imitan expresiones faciales desde las primeras horas de vida — la imitación es el mecanismo primario de aprendizaje social y de construcción del yo; los bebés aprenden observando desde el nacimiento, antes de cualquier intervención deliberada. Megan Gunnar (cortisol y estrés en bebés): el estrés crónico sin regulación adulta eleva sostenidamente el cortisol basal, daña el eje hipotálamo-pituitario-adrenal y establece una respuesta al estrés hiperactiva que persiste de por vida — el apego seguro es literalmente el regulador del sistema de estrés del bebé. Peter Levine (trauma somático desde la infancia): el cuerpo del bebé guarda el estrés no procesado como tensión muscular crónica, patrones respiratorios alterados y respuestas autónomas fijas — el trauma infantil no requiere memoria declarativa para dejar huella neurológica duradera. Stephen Porges (teoría polivagal): el tono de voz del adulto regula o desregula al bebé antes que cualquier contenido verbal — la prosodia, la mirada y el contacto físico activan el freno vagal ventral o lo suprimen; la seguridad se transmite por canales no verbales. Bessel van der Kolk: el trauma temprano vive en el cuerpo y en el sistema nervioso autónomo; las intervenciones que no incluyen la dimensión somática son insuficientes para el trabajo con bebés y con adultos cuidadores. Mark Wolynn (trauma intergeneracional): el trauma no resuelto de generaciones anteriores se transmite epigenéticamente y en patrones de interacción cotidiana — el padre/madre que trabaja su propio trauma interrumpe activamente la transmisión intergeneracional antes de que llegue al bebé. El único mecanismo efectivo a esta edad es la corregulación: presencia física segura, tono de voz suave, contacto piel con piel, ritmo calmado. Las consecuencias, el razonamiento verbal y los límites explicados no tienen base neurológica a esta edad.
INSTRUCCIÓN: Orienta exclusivamente desde la corregulación. Ninguna técnica cognitiva, ninguna consecuencia, ningún "hablar sobre lo que pasó". Solo presencia, cuerpo, voz, contacto. Considera siempre la historia del padre/madre como variable clínica central del sistema.`
  }

  if (n <= 5) {
    return `MARCO CIENTÍFICO (2-6 años):
La corteza prefrontal — sede del autocontrol, la planificación y la regulación emocional — está en construcción y no madura hasta los 25 años (Siegel & Bryson, "The Whole-Brain Child"). A esta edad el cerebro límbico domina: las emociones son inmediatas, intensas y sin filtro racional. Los episodios de conducta desafiante son desbordamiento emocional genuino, no manipulación (Shanker, Self-Reg: el niño actúa desde el estrés acumulado, no desde la maldad). El niño no puede "portarse bien" cuando está en zona roja de activación — la capacidad de razonar desaparece fisiológicamente. Bruce Perry (modelo neurosequencial del desarrollo): el cerebro se desarrolla de abajo hacia arriba — tronco encefálico, sistema límbico, córtex; no puedes llegar al razonamiento cortical sin haber regulado primero los niveles inferiores; regular primero, razonar después no es una preferencia pedagógica sino una ley neurológica; intentar razonar con un niño desregulado es neurológicamente imposible. La secuencia efectiva es: regular → conectar → redirigir (Siegel & Bryson, "No-Drama Discipline"). La corregulación del adulto (calma corporal, voz baja, proximidad segura) activa el freno parasimpático del niño (Porges, teoría polivagal). Ross Greene ("El niño explosivo"): los niños se portan bien cuando pueden; si no pueden, falta una habilidad, no voluntad — detrás de cada conducta problema hay una habilidad cognitiva, lingüística o de regulación que aún no está desarrollada. Las consecuencias durante el episodio no producen aprendizaje; el aprendizaje ocurre en la calma posterior. Janet Lansbury: el berrinche es una necesidad de descarga emocional completamente legítima — interrumpirlo o calmarlo prematuramente impide el procesamiento emocional; la intervención correcta es acompañar con presencia segura sin intentar resolver, distraer ni eliminar la emoción. Stanley Greenspan (Floortime / DIR): seguir el liderazgo del niño en el juego — unirse a su mundo antes de intentar ampliarlo — construye conexión emocional genuina y desarrollo de competencias sociales desde la iniciativa y el placer del propio niño. Haim Ginott: el lenguaje que describe sin juzgar la persona — "veo que estás muy enojado" en lugar de "eres un malcriado" — valida la experiencia emocional sin reforzar la conducta y preserva la autoestima; la comunicación con los hijos empieza siempre por reconocer sus sentimientos. Adele Faber y Elaine Mazlish ("Cómo hablar para que los niños escuchen"): validar antes de resolver es la secuencia que no tiene excepción — un niño que se siente genuinamente escuchado reduce su activación antes de que el adulto haya propuesto ninguna solución. Jane Nelsen (Disciplina Positiva): firmeza y amabilidad simultáneas no son contradictorias sino complementarias — el límite claro y la conexión cálida se necesitan mutuamente; las consecuencias naturales enseñan más que las artificiales porque tienen relación lógica con la conducta. Barbara Coloroso (disciplina interna): el objetivo final de la disciplina no es que el niño aprenda a obedecer sino que desarrolle disciplina interna y capacidad de resolver — la obediencia sin comprensión no construye carácter ni competencia social. Alfie Kohn: los premios y castigos externos socavan sistemáticamente la motivación intrínseca y el aprendizaje genuino; el elogio evaluativo ("qué inteligente eres") daña más la autoestima real y la tolerancia al fracaso que el silencio o el elogio descriptivo. Gabor Maté: el niño difícil es el niño con mayor sensibilidad neurológica, no con mayor maldad — el TDAH y las dificultades conductuales severas son frecuentemente respuestas adaptativas al estrés temprano en sistemas nerviosos más sensibles; el diagnóstico no debe sustituir la pregunta sobre el entorno. Laura Markham: la regulación del padre/madre es condición previa e ineludible a cualquier intervención efectiva con el niño — un adulto fisiológicamente desregulado no puede regular a nadie más, independientemente de qué técnica aplique. Becky Kennedy ("Good Inside"): todo comportamiento tiene una raíz comprensible desde el interior del niño; el niño no es el problema, el problema es el problema — separar la identidad del niño de su conducta es el acto terapéutico más importante que puede hacer un padre/madre. Stephen Porges: el tono de voz y la postura corporal del adulto activan o inhiben el sistema de seguridad social del niño antes que cualquier contenido verbal — la regulación se transmite por canales implícitos. Shefali Tsabary (crianza consciente): el padre/madre que trabaja su propio mundo interior — sus miedos, sus patrones reactivos, su historia de apego — reduce la transmisión involuntaria de sus conflictos no resueltos al hijo. Jon Kabat-Zinn (mindfulness parental): la calidad de la presencia del padre/madre importa más que la cantidad de tiempo — la atención plena reduce la reactividad automática y aumenta la sintonía en los momentos de mayor intensidad emocional. Carlos González: el niño que "no come" generalmente come exactamente lo que necesita — la batalla de la alimentación la crea el adulto con presión, distracción y negociación; retirar la presión y respetar la autorregulación del hambre resuelve el problema en la mayoría de los casos.
INSTRUCCIÓN: Corregulación primero siempre. Conexión antes que corrección. Redirigir solo cuando el sistema nervioso ya está calmado. Lenguaje concreto, sensorial, simple. El estado regulatorio del padre/madre es variable clínica central — evalúalo siempre.`
  }

  if (n <= 11) {
    return `MARCO CIENTÍFICO (6-12 años):
La corteza prefrontal está en maduración activa pero incompleta: emergen las funciones ejecutivas (planificación, inhibición de impulsos, flexibilidad cognitiva) pero todavía son frágiles bajo estrés (Adele Diamond, investigación en funciones ejecutivas). Los enfoques cognitivo-conductuales empiezan a ser eficaces porque el niño puede reflexionar sobre su conducta en calma. El modelo de Ross Greene (Collaborative & Proactive Solutions) es central: identificar la habilidad específica que le falta al niño para resolver el problema de otro modo — no es un problema de motivación sino de habilidad rezagada. Alan Kazdin (Parent Management Training): el refuerzo positivo sistemático, la práctica deliberada de conductas alternativas y el moldeado gradual son consistentemente más eficaces que las consecuencias punitivas en modificar conducta de forma durable. John Gottman (coaching emocional vs desestimación emocional): los padres que validan las emociones de sus hijos — en lugar de desestimar, minimizar, distraer o castigar las emociones — crían niños con mejor salud física, mental y social medida longitudinalmente en múltiples variables; la meta-emoción del padre/madre determina el clima emocional del hogar. Gordon Neufeld (orientación hacia pares): cuando el niño busca en sus pares lo que debería encontrar en los adultos — aprobación, orientación, identidad, seguridad — pierde su brújula de desarrollo; el vínculo sólido con adultos significativos es el andamiaje que permite el desarrollo sano; la solución no es aislar al niño de sus pares sino fortalecer los vínculos adultos. Russell Barkley: las funciones ejecutivas son habilidades que se desarrollan progresivamente con el tiempo, no fallas de carácter ni problemas de voluntad — el TDAH es específicamente un trastorno del desarrollo de la autorregulación, con un retraso de desarrollo de aproximadamente 3 años en las funciones ejecutivas respecto a los pares. Edward Hallowell: el TDAH incluye fortalezas reales y documentadas — creatividad divergente, hiperfoco en áreas de interés, energía, pensamiento asociativo — que desaparecen en entornos que sólo miden conformidad, quietud y velocidad de procesamiento lineal; el problema frecuentemente es el diseño del entorno, no el niño. Tamar Chansky (ansiedad infantil como hábito mental): la ansiedad es un hábito cognitivo entrenable, no un rasgo fijo — externalizar la ansiedad dándole un nombre ("el señor preocupón", "el detector de humo") permite al niño ganar perspectiva metacognitiva sobre sus propios pensamientos ansiosos y no identificarse con ellos. Lynn Lyons: los padres ansiosos crían hijos ansiosos no principalmente por genética sino por modelado conductual y acomodación — la acomodación sistemática del padre/madre a los miedos del hijo los refuerza y amplifica; aprender a tolerar la incomodidad del hijo ansioso es parte central del tratamiento. Henry Cloud y John Townsend (límites como estructura de desarrollo): los límites claros y consistentes son regalos para el desarrollo, no castigos — el niño que no experimenta límites consistentes no puede desarrollar un sentido de sí mismo diferenciado, regulación emocional ni responsabilidad personal. Diana Baumrind (estilos parentales): el estilo parental autoritativo — alta calidez emocional combinada con alta exigencia y estructura clara, explicación de razones y autonomía guiada — produce consistentemente los mejores resultados en salud mental, rendimiento académico y competencia social; ni el permisivo ni el autoritario se acercan a estos outcomes en investigación longitudinal. Dan Siegel y Mary Hartzell ("Parenting from the Inside Out"): el padre/madre que comprende y ha procesado narrativamente su propia historia de apego puede cambiar activamente el patrón que transmite — la coherencia narrativa de la historia personal predice el estilo de apego del hijo más que los eventos traumáticos en sí. Ellyn Satter (división de responsabilidades en alimentación): el padre/madre decide qué alimentos ofrecer, cuándo y dónde; el hijo decide cuánto come y si come — violar esta división mediante presión, vigilancia o recompensas produce exactamente los problemas de alimentación que pretende resolver. Marc Weissbluth (sueño infantil como variable clínica de primer orden): el sueño insuficiente crónico produce síntomas clínicamente indistinguibles del TDAH, la ansiedad y los trastornos del estado de ánimo — la intervención en higiene del sueño es frecuentemente la primera y más eficaz intervención conductual disponible antes de cualquier otra. La regulación emocional puede enseñarse explícitamente (nombrar, identificar, tolerar, recuperarse). El contexto social — pares, escuela, estatus — comienza a ser factor clave de estrés. Bessel van der Kolk: el trauma vive en el cuerpo y las intervenciones puramente cognitivas no alcanzan cuando hay trauma somático activo — el movimiento, la respiración, la conciencia corporal y las artes expresivas son parte del tratamiento, no complementos opcionales. Stephen Porges: el sistema nervioso del niño evalúa constantemente la seguridad del entorno mediante señales no verbales del adulto — la neurorecepción precede a la percepción consciente; el aula y el hogar seguros neurofisiológicamente son condición de posibilidad del aprendizaje. Mark Wolynn: los patrones de conducta que no tienen explicación en la historia personal del niño frecuentemente tienen raíz en traumas no resueltos de generaciones anteriores que se transmiten en patrones relacionales. Carlos González: las batallas de alimentación en esta edad tienen la misma etiología que en etapas anteriores — la presión del adulto crea y mantiene el problema; retirarla y confiar en la autorregulación del hambre lo resuelve en la mayoría de los casos. Adele Faber: los hermanos no necesitan ser tratados igual, necesitan ser tratados según sus necesidades individuales — el trato igualitario forzado genera más resentimiento que el trato diferenciado reconocido explícitamente.
INSTRUCCIÓN: Identifica la habilidad rezagada detrás de la conducta. Enseña en calma. Refuerza lo positivo con especificidad conductual. Usa resolución colaborativa de problemas. Intervén en el contexto, no solo en el episodio. Evalúa el sueño como variable de primer orden antes de cualquier otra intervención.`
  }

  return `MARCO CIENTÍFICO (12-18 años):
El cerebro adolescente atraviesa una segunda poda sináptica masiva (Siegel, "Brainstorm"): el sistema límbico (recompensa, intensidad emocional, sensibilidad social) está hiperactivo mientras la corteza prefrontal aún remodelan — esto explica la impulsividad, la búsqueda de riesgo y la reactividad emocional como fenómenos neurobiológicos, no como defectos de carácter. La necesidad de autonomía e identidad propia son necesidades de desarrollo genuinas y sanas, no rebeldía (Erikson, etapas del desarrollo). Laurence Steinberg (neurociencia del cerebro adolescente): la presencia de pares duplica mediblemente la toma de riesgos en adolescentes en condiciones de laboratorio — no es rebeldía ni mala intención sino neurobiología del sistema de recompensa social; el riesgo baja cuando los pares no están presentes. La influencia de pares alcanza su máximo; el rechazo social activa las mismas regiones cerebrales que el dolor físico (neuroimagen funcional). Jonathan Haidt ("La generación ansiosa"): los smartphones y las redes sociales entregados antes de los 16 años están produciendo la peor crisis de salud mental adolescente registrada en la historia — la solución es colectiva y de normas sociales, no individual; ninguna familia puede resolver sola lo que requiere coordinación comunitaria. Jean Twenge (iGen): la generación Z es la más solitaria, ansiosa y deprimida de la que tenemos registro sistemático — las causas son estructurales: sustitución del juego libre por tiempo de pantalla, hiperprotección que elimina la exposición al riesgo y al fracaso, pérdida de autonomía y de tiempo no supervisado con pares. Kenneth Ginsburg (resiliencia adolescente): los 7 componentes de la resiliencia son competencia, confianza, conexión, carácter, contribución, afrontamiento y control — ninguno es un rasgo fijo, todos son habilidades enseñables que requieren práctica y experiencia real. Michael Bradley (cerebro adolescente masculino bajo testosterona): la impulsividad, la búsqueda activa de riesgo y la agresividad de los adolescentes varones tienen base hormonal y neurológica documentada durante la poda sináptica — la respuesta eficaz es estructura clara, conexión genuina y redireccionamiento hacia riesgo positivo, no solo consecuencias. Anthony Wolf (individuación adolescente): el adolescente necesita psicológicamente "matar" a sus padres — desidealizar, cuestionar sistemáticamente, rechazar la autoridad — para construir su propia identidad diferenciada; la resistencia activa a los padres es un signo de desarrollo sano, no de patología relacional. Carl Pickhardt: la identidad adolescente se construye por oposición y diferenciación activa — el conflicto con los padres es parte estructural del proceso de individuación, no el problema a eliminar; los padres que entienden esto pueden acompañar sin sentirlo como ataque personal. Robert Epstein: la infantilización cultural moderna de la adolescencia — privar a los jóvenes de responsabilidades reales y autonomía genuina — crea la tormenta conductual que después diagnosticamos como rasgo inherente de la etapa; en culturas y épocas que otorgan responsabilidades reales a los adolescentes, la "tormenta adolescente" universal no aparece. Lisa Damour ("Untangled"): las chicas necesitan que se normalice su ansiedad funcional, no que se elimine — la ansiedad adaptativa es señal de un sistema nervioso que funciona; el problema clínico es la ansiedad que desborda y limita, no toda la ansiedad; la validación sin catastrofizar es la intervención central. Las estrategias de control coercitivo erosionan el vínculo y aumentan la resistencia; la conexión auténtica con respeto a la autonomía es más eficaz. El modelo Greene sigue siendo útil: encontrar el problema subyacente y resolverlo juntos. Bessel van der Kolk: los adolescentes con trauma somático activo no responden a intervenciones puramente cognitivas ni a consecuencias — el cuerpo, el movimiento, la regulación del sistema nervioso autónomo y las artes expresivas son parte central del trabajo terapéutico. Stephen Porges: el sistema nervioso del adolescente sigue evaluando la seguridad del entorno mediante señales no verbales y paraverbales antes que verbales — la calma corporal del adulto regula y abre la posibilidad de conversación antes que cualquier argumento racional. Mark Wolynn: los conflictos de identidad, síntomas y patrones que no tienen explicación en la historia personal del adolescente pueden tener raíz en traumas intergeneracionales no resueltos que se transmiten en patrones relacionales y lealtades sistémicas inconscientes. Shefali Tsabary (crianza consciente): el padre/madre que ha trabajado y procesado su propia adolescencia — sus heridas de identidad, sus vergüenzas no resueltas, sus duelos de individuación — puede acompañar la individuación del hijo sin confundirla con una amenaza personal ni con un rechazo. Jon Kabat-Zinn: la presencia mindful del adulto en el vínculo con el adolescente — sin agenda de cambio inmediato, sin juicio, con curiosidad genuina por su mundo interior — es la condición de posibilidad de cualquier conversación difícil y de cualquier influencia real.
INSTRUCCIÓN: Respeta la autonomía como necesidad legítima de desarrollo, no como concesión. Evita el control coercitivo, la humillación y la comparación. Busca siempre el problema subyacente antes de intervenir sobre la conducta. Intervén en calma, nunca en el pico del conflicto. Mantén el vínculo por encima de ganar la discusión. Trata el uso de pantallas como variable estructural del desarrollo, no solo como conducta individual a corregir.`
}

export async function generarAccionInmediata({ hijo, episodio }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años.
Acaba de tener: ${episodio.tipo} (intensidad ${episodio.intensidad}/5).${episodio.emocion ? `\nEmoción del niño: ${episodio.emocion}` : ''}${episodio.contexto ? `\nContexto: ${episodio.contexto}` : ''}${episodio.gatillantes?.length ? `\nGatillantes: ${episodio.gatillantes.join(', ')}` : ''}${episodio.descripcionLibre ? `\nRelato del padre/madre: ${episodio.descripcionLibre}` : ''}

Escribe UNA sola acción concreta que el padre/madre puede hacer AHORA MISMO en los próximos 2 minutos. Máximo 3 líneas. Sin listas, sin títulos, sin markdown. Lenguaje simple y cálido, calibrado estrictamente para la edad indicada según el marco científico anterior. Empieza con "Ahora mismo:" y describe el gesto o acción física específica, incluyendo palabras exactas si aplica. Que sea algo que cualquier padre/madre pueda hacer en casa ahora, sin preparación.`

  return llamarAPI(prompt, 120)
}

export async function analizarEpisodio({ hijo, episodio, historialReciente = [], bloqueRutina = null }) {
  const marco = marcoEdad(hijo?.edad)

  const contexto = historialReciente.length > 0
    ? `\n\nÚltimos episodios registrados:\n${historialReciente
        .slice(0, 5)
        .map(e => `- ${e.tipo} (intensidad ${e.intensidad}/5) el ${new Date(e.fecha).toLocaleDateString('es-CL')}`)
        .join('\n')}`
    : ''

  const bloqueCtx = bloqueRutina
    ? `\n- Momento de la rutina diaria: "${bloqueRutina.nombre}" (${bloqueRutina.hora})${bloqueRutina.esMomentoRiesgo ? ' — marcado por los padres como momento de riesgo' : ''}${bloqueRutina.nota ? `. Nota: ${bloqueRutina.nota}` : ''}`
    : ''

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

Episodio registrado:
- Tipo: ${episodio.tipo}
- Intensidad: ${episodio.intensidad}/5${episodio.emocion ? `\n- Emoción del niño: ${episodio.emocion}` : ''}
- Contexto: ${episodio.contexto || 'no especificado'}
- Gatillantes posibles: ${episodio.gatillantes?.join(', ') || 'no especificados'}${episodio.descripcionLibre ? `\n- Relato del padre/madre: ${episodio.descripcionLibre}` : ''}${bloqueCtx}${contexto}

Responde con este formato exacto, calibrando cada sección al marco científico de la edad indicada:

**Qué está pasando** (1-2 oraciones explicando el mecanismo neurológico o de desarrollo específico para esta edad)

**Qué hacer ahora**
1. [paso concreto, apropiado para la edad]
2. [paso concreto, apropiado para la edad]
3. [paso concreto, apropiado para la edad]

**Qué evitar**
- [cosa a evitar y por qué en 1 línea, específica para la edad]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 900)
}

export async function interpretarPatrones({ hijo, episodios }) {
  if (episodios.length < 3) {
    return 'Registra al menos 3 episodios para que pueda identificar patrones en el comportamiento de tu hijo.'
  }

  const marco = marcoEdad(hijo?.edad)

  const resumen = episodios.slice(0, 20).map(e =>
    `${new Date(e.fecha).toLocaleDateString('es-CL')}: ${e.tipo} (intensidad ${e.intensidad}/5, gatillantes: ${e.gatillantes?.join(', ') || 'ninguno'})`
  ).join('\n')

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

Historial de episodios (más recientes primero):
${resumen}

Analiza estos patrones desde el marco científico de la edad indicada y responde con:

**Lo que está mejorando**
[observación positiva basada en los datos, interpretada a la luz del desarrollo esperado para la edad]

**Lo que merece atención**
[patrón preocupante si existe, o "Sin patrones de alerta por ahora"; si hay patrón, explica brevemente por qué importa para esta etapa]

**Posibles causas**
[hipótesis basadas en los datos y en el marco de desarrollo para esta edad]

**Próximos pasos sugeridos**
[1-2 acciones concretas, calibradas a la edad, para los próximos días]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 1800)
}

export async function celebrarHito({ hijo, hito }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años.

El padre/madre acaba de registrar este avance positivo:
- Tipo: ${hito.categoria}
- Descripción: ${hito.descripcion || '(sin descripción)'}

Responde con exactamente 2 oraciones cálidas y concretas. Valida el significado de este momento para el desarrollo del niño en esta etapa específica, explicando brevemente por qué este tipo de avance importa neurológicamente o conductualmente a esta edad según el marco científico anterior. Habla en segunda persona al padre/madre. No uses listas ni títulos. No incluyas disclaimer ni marco aplicado.`

  return llamarAPI(prompt, 180)
}

export async function generarTareas({ hijo, habilidad, descripcion }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.
Habilidad a trabajar: ${habilidad}
Contexto: ${descripcion || 'ninguno'}

Genera exactamente 4 semanas de tareas concretas para el padre/madre, calibradas estrictamente a la edad y al marco científico anterior. Devuelve ÚNICAMENTE JSON válido sin texto adicional, sin markdown, sin explicaciones:

{"1":[{"id":"s1t1","texto":"..."},{"id":"s1t2","texto":"..."},{"id":"s1t3","texto":"..."}],"2":[{"id":"s2t1","texto":"..."},{"id":"s2t2","texto":"..."},{"id":"s2t3","texto":"..."}],"3":[{"id":"s3t1","texto":"..."},{"id":"s3t2","texto":"..."},{"id":"s3t3","texto":"..."}],"4":[{"id":"s4t1","texto":"..."},{"id":"s4t2","texto":"..."},{"id":"s4t3","texto":"..."}]}

Reglas por tarea: máximo 90 caracteres, verbo de acción concreto, realizable en casa sin preparación, en segunda persona al padre/madre. Semana 1: observar y preparar el ambiente. Semana 4: consolidar y generalizar. 3 tareas por semana. Cada tarea debe ser posible para un padre/madre con un niño de la edad indicada.`

  const raw = await llamarAPI(prompt, 700)
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)
    const result = {}
    for (const sem of ['1', '2', '3', '4']) {
      result[sem] = (parsed[sem] || []).map((t) => ({ ...t, completada: false }))
    }
    return result
  } catch {
    return null
  }
}

export async function generarConsejoDiario({ hijo, episodios, hitos, estrategias }) {
  const marco = marcoEdad(hijo?.edad)

  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const semanaEp = episodios.filter((e) => new Date(e.fecha) >= hace7).slice(0, 8)
  const hitosCount = hitos.filter((h) => new Date(h.fecha) >= hace7).length
  const estrategiaActiva = (estrategias || []).find((e) => e.semanaActual < 4)

  const resumenEp = semanaEp.length > 0
    ? semanaEp.map((e) => {
        let line = `- ${e.tipo}, intensidad ${e.intensidad}/5`
        if (e.gatillantes?.length) line += `, gatillantes: ${e.gatillantes.join(', ')}`
        if (e.emocion) line += `, emoción del niño: ${e.emocion}`
        if (e.estadoPadre) line += `, estado del padre/madre: ${e.estadoPadre}`
        if (e.contexto) line += ` | contexto: ${e.contexto.slice(0, 80)}`
        return line
      }).join('\n')
    : 'Sin episodios esta semana.'

  const gatillanteCounts = {}
  for (const e of semanaEp) for (const g of e.gatillantes || []) gatillanteCounts[g] = (gatillanteCounts[g] || 0) + 1
  const topGatillante = Object.entries(gatillanteCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const avgIntensidad = semanaEp.length > 0
    ? (semanaEp.reduce((s, e) => s + (e.intensidad || 0), 0) / semanaEp.length).toFixed(1)
    : null

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'hijo/a'}, ${hijo?.edad || '?'} años.

Episodios esta semana (${semanaEp.length}):
${resumenEp}
${avgIntensidad ? `Intensidad promedio: ${avgIntensidad}/5.` : ''}${topGatillante ? ` Gatillante más frecuente: "${topGatillante}".` : ''}${hitosCount > 0 ? ` Avances positivos esta semana: ${hitosCount}.` : ''}${estrategiaActiva ? ` Estrategia activa: "${estrategiaActiva.habilidad}" (semana ${Math.min(estrategiaActiva.semanaActual, 4)}/4).` : ''}

INSTRUCCIÓN: Escribe 2-3 oraciones como consejo para hoy, fundamentado en el marco científico de la edad indicada. Menciona algo específico de los datos anteriores (un gatillante concreto, un patrón de intensidad, una emoción específica). Nada genérico. Si hay un patrón claro, nómbralo y da una acción concreta apropiada para la edad. Tono cálido, segunda persona, sin markdown, sin listas, sin disclaimer.`

  return llamarAPI(prompt, 150)
}

export async function generarEstrategia({ hijo, habilidad, descripcion }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.
Habilidad a fortalecer: ${habilidad}
Contexto adicional: ${descripcion || 'ninguno'}

Devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional, sin markdown, sin bloque de código. La estrategia debe estar calibrada estrictamente a la edad y al marco científico anterior. Estructura exacta:
{"porQueImporta":"2-3 frases sobre por qué esta habilidad importa en esta etapa del desarrollo para un niño de esta edad específica, sin markdown","semanas":[{"numero":1,"titulo":"Observar y preparar","accion":"Acción concreta para esta semana, máximo 2 frases, en segunda persona al padre/madre, apropiada para la edad","indicador":"Cómo saber si está funcionando, 1 frase","tareas":["tarea 1 en segunda persona, max 90 caracteres, apropiada para la edad","tarea 2","tarea 3"]},{"numero":2,"titulo":"Introducir","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":3,"titulo":"Practicar","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":4,"titulo":"Consolidar","accion":"...","indicador":"...","tareas":["...","...","..."]}]}`

  const raw = await llamarAPI(prompt, 1200)
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return raw
  }
}
