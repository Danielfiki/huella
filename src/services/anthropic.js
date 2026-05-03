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

const TEMAS_CONTEMPORANEOS = `TEMAS ESPECÍFICOS Y DOLORES PARENTALES CONTEMPORÁNEOS:
PANTALLAS Y TECNOLOGÍA: Jonathan Haidt ("The Anxious Generation", 2024): smartphones antes de los 16 años están causando la peor crisis de salud mental juvenil de la historia — no smartphone antes de secundaria, no redes sociales antes de 16, sin pantallas en el cuarto, más tiempo no estructurado. Jean Twenge ("iGen", "Generation Me"): la generación Z es la más ansiosa, solitaria y deprimida — correlación directa entre horas de pantalla y depresión, especialmente en niñas. Anya Kamenetz ("The Art of Screen Time"): enfoque equilibrado — ni pánico ni permisividad; el contexto importa más que el tiempo total. Michael Rich (Harvard, "médico de los medios"): los medios digitales afectan el sueño, la atención y el desarrollo social — la clave es la calidad del contenido y el uso compartido. Yalda Uhls ("Media Moms & Digital Dads"): los niños que pasan tiempo sin pantallas mejoran dramáticamente su lectura de emociones.
ANSIEDAD INFANTIL Y PARENTAL: Tamar Chansky ("Freeing Your Child from Anxiety"): externalizar la ansiedad, darle nombre, no evitar sino acompañar la exposición gradual. Lynn Lyons ("Anxious Kids, Anxious Parents"): la acomodación parental — hacer lo que el hijo ansioso pide para que se calme — refuerza el circuito de la ansiedad; los padres deben modelar tolerancia a la incertidumbre. Rachel Busman (TCC para niños): la terapia cognitivo-conductual es el tratamiento con mayor evidencia para la ansiedad infantil. Dan Peters: alta capacidad intelectual y ansiedad van frecuentemente juntos — el niño brillante que se paraliza ante el error.
TDAH Y NEURODIVERSIDAD: Russell Barkley ("Taking Charge of ADHD"): el TDAH es un trastorno del desarrollo de la autorregulación, no de la atención — el déficit real es en la memoria de trabajo, la inhibición y el manejo del tiempo. Edward Hallowell ("Driven to Distraction"): el TDAH como motor de creatividad y pasión cuando se canaliza bien — el diagnóstico como liberación, no como condena. Thomas Brown (funciones ejecutivas): el TDAH afecta el sistema de gestión del cerebro — no es falta de voluntad sino de activación neurológica. Temple Grandin ("The Autistic Brain"): el autismo como diferencia de procesamiento, no como déficit — el pensamiento visual como fortaleza real.
LÍMITES Y OBEDIENCIA: Henry Cloud y John Townsend ("Boundaries with Kids"): los límites enseñan que las acciones tienen consecuencias reales — sin límites el niño no desarrolla carácter. Nancy Samalin: el enojo parental es normal y manejable — lo que importa es cómo se expresa, no si existe. Alfie Kohn ("Unconditional Parenting"): los premios y castigos crean obediencia externa pero no carácter interno — el objetivo es la autonomía moral.
SUEÑO: Marc Weissbluth ("Healthy Sleep Habits, Happy Child"): el sueño insuficiente produce síntomas idénticos al TDAH — el sueño es la primera intervención en casi cualquier problema conductual. Harvey Karp ("Happiest Baby on the Block"): las 5 S para calmar bebés — el cuarto trimestre requiere replicar condiciones intrauterinas. Richard Ferber (método Ferber): entrenamiento de sueño progresivo con intervalos crecientes de espera. William Sears ("The Baby Sleep Book"): crianza con apego y colecho seguro como alternativa al entrenamiento de sueño.
ALIMENTACIÓN: Ellyn Satter (división de responsabilidad): el padre decide qué, cuándo y dónde; el hijo decide cuánto y si come — respetar esta división elimina el 90% de las batallas de alimentación. Carlos González ("Mi niño no me come"): el niño que "no come" generalmente come lo que necesita — la batalla la crea el adulto con la presión y la ansiedad. Katja Rowell (alimentación responsiva): el trauma de alimentación — forzar, presionar, restringir — tiene consecuencias a largo plazo en la relación del niño con la comida.
HERMANOS Y DINÁMICA FAMILIAR: Adele Faber ("Siblings Without Rivalry"): los hermanos no necesitan ser tratados igual, necesitan ser tratados según sus necesidades individuales — comparar destruye el vínculo fraternal. Kevin Leman ("The Birth Order Book"): el orden de nacimiento moldea la personalidad — primogénitos, hijos del medio, menores y hijos únicos tienen patrones predecibles. Stephen Bank y Michael Kahn: el vínculo entre hermanos es el más largo de la vida — más que el de padres e hijos.
TRAUMA INTERGENERACIONAL: Mark Wolynn ("It Didn't Start With You"): el trauma no resuelto de abuelos y bisabuelos se transmite epigenéticamente y en patrones de crianza inconscientes. Resmaa Menakem ("My Grandmother's Hands"): el trauma vive en el cuerpo y se transmite generacionalmente, especialmente en comunidades marginadas. Dan Siegel y Mary Hartzell ("Parenting from the Inside Out"): el padre/madre que entiende su propia historia de apego puede cambiar conscientemente el patrón que transmite.
CRIANZA CONSCIENTE Y BIENESTAR PARENTAL: Shefali Tsabary ("The Conscious Parent"): el hijo es el maestro del padre — los conflictos con los hijos revelan heridas no resueltas del propio padre/madre. Jon Kabat-Zinn ("Everyday Blessings"): el mindfulness parental no es perfección sino presencia — la calidad de la atención importa más que la cantidad de tiempo. Laura Markham ("Peaceful Parent, Happy Kids"): la regulación emocional del padre es condición previa — no puedes dar lo que no tienes. Becky Kennedy ("Good Inside"): todos los niños son buenos por dentro — el comportamiento problemático es una señal de necesidad no satisfecha, no de maldad.
CRIANZA EN CONTEXTO CULTURAL: Pamela Druckerman ("Bringing Up Bébé"): la crianza francesa — la pausa antes de responder al llanto del bebé, la autoridad tranquila, las comidas como ritual social — produce niños con mayor tolerancia a la frustración. Christine Gross-Loh ("Parenting Without Borders"): en Japón los niños de 6 años van solos al metro — la hiperprotección occidental es culturalmente específica, no universal. Sara Harkness y Charles Super: las etnoteorías parentales — cada cultura tiene teorías implícitas sobre qué es un buen niño y cómo criarlo, y todas producen adultos funcionales.`

function marcoEdad(edad) {
  const n = parseInt(edad, 10)
  if (isNaN(n)) return marcoEdad(4)

  if (n <= 2) {
    return `MARCO CIENTÍFICO (0-2 años):
John Bowlby y Mary Ainsworth ("Attachment and Loss" / "Patterns of Attachment"): el apego es un sistema biológico de supervivencia — el bebé busca proximidad al cuidador bajo amenaza; el apego seguro se construye con respuestas sensibles y consistentes a las señales del bebé; los cuatro patrones (seguro, ansioso, evitativo, desorganizado) quedan establecidos en el primer año y predicen salud mental a largo plazo; la sensibilidad materna — responder contingentemente a las señales — es la variable más robusta del desarrollo emocional; aplicación: toda conducta del bebé es comunicación, nunca manipulación.
Stephen Porges ("The Polyvagal Theory"): el sistema nervioso autónomo tiene tres estados jerárquicos — seguridad/freno vagal ventral, movilización/simpático y shutdown/vagal dorsal; el bebé no puede regular sus estados autónomamente; la co-regulación ocurre mediante prosodia del adulto, mirada y contacto; la seguridad fisiológica del adulto se transmite al bebé antes de cualquier contenido verbal; aplicación: el tono de voz del cuidador es la intervención.
Ed Tronick ("The Still Face Experiment", "The Neurobehavioral and Social-Emotional Development of Infants"): el ciclo sintonía-dessintonía-reparación es el mecanismo activo del apego; no se trata de ser el cuidador perfecto sino de reparar las rupturas con consistencia; el bebé aprende que la desconexión es reparable — esta es la base neurológica de la regulación emocional futura; incluso 2 minutos de inexpresividad del cuidador producen distress fisiológico mensurable; aplicación: la perfección no es el objetivo, la reparación es el objetivo.
Allan Schore ("The Science of the Art of Psychotherapy", "Affect Regulation and the Origin of the Self"): el hemisferio derecho se desarrolla primero y se construye en la interacción cara a cara con el cuidador durante los primeros 3 años; el apego seguro regula activamente la maduración del córtex orbitofrontal derecho — base de la regulación emocional de por vida; la comunicación entre cuidador e hijo es implícita, subcortical y no verbal; el trauma relacional temprano altera la arquitectura del hemisferio derecho de forma duradera; aplicación: la comunicación con el bebé es corporal, no verbal.
Harvey Karp ("The Happiest Baby on the Block"): el cuarto trimestre — los primeros 3 meses el bebé necesita condiciones que imiten el útero; las 5 S (swaddle/envolver firmemente, side-stomach/posición de lado, shush/sonido blanco continuo, swing/movimiento rítmico, suck/succión) activan el reflejo de calmado innato; el llanto inconsolable no es manipulación sino necesidad neurológica no satisfecha; satisfacer estas necesidades no crea malos hábitos — crea regulación; aplicación: usar las 5 S como protocolo ante llanto inconsolable en menores de 4 meses.
T. Berry Brazelton ("Touchpoints: Your Child's Emotional and Behavioral Development"): los touchpoints son momentos predecibles de regresión conductual justo antes de cada salto evolutivo — el bebé "retrocede" en sueño, alimentación o conducta mientras reorganiza su sistema nervioso; el retroceso es evidencia de progreso, no de fracaso ni patología; los padres que conocen los touchpoints no interpretan la regresión como señal de alarma; aplicación: ante regresión conductual, buscar qué salto evolutivo se está preparando.
Selma Fraiberg ("Ghosts in the Nursery", 1975): los fantasmas en la habitación del bebé son las experiencias de apego no resueltas del padre/madre que se activan automáticamente en la interacción cotidiana; el adulto revive su propio pasado sin saberlo y lo replica en la crianza; la intervención terapéutica más eficaz es ayudar al padre/madre a recordar y sentir su propia historia — cuando el adulto puede llorar sus propias heridas, los fantasmas pierden poder sobre el bebé; aplicación: los patrones de respuesta automática del padre/madre ante el llanto del bebé revelan su propia historia.
Magda Gerber / RIE — Resources for Infant Educarers ("Dear Parent: Caring for Infants With Respect"): el bebé tiene competencia propia innata desde el nacimiento — no es un recipiente pasivo sino un agente activo; observar antes de intervenir; hablarle con respeto desde el primer día como si comprendiera; no anticiparse sistemáticamente a cada necesidad; dar tiempo y espacio para que el bebé resuelva sus frustraciones menores; la sobreestimulación y la hiperrespuesta del adulto interfieren con el desarrollo de la autorregulación; aplicación: esperar y observar antes de intervenir.
Andrew Meltzoff ("The Scientist in the Crib", con Patricia Kuhl): los bebés imitan expresiones faciales desde las primeras horas de vida — imitación neonatal innata, no aprendida; la imitación es el mecanismo primario de aprendizaje social y de construcción del yo ("yo soy como tú"); los bebés aprenden observando a los adultos antes de poder actuar ellos mismos; el adulto es el primer maestro por el solo hecho de ser observado; aplicación: la conducta del adulto delante del bebé es enseñanza directa.
Megan Gunnar (investigación sobre cortisol y estrés, "Stress and the Developing Hippocampus"): el estrés crónico sin regulación adulta eleva sostenidamente el cortisol basal y daña el eje hipotálamo-pituitario-adrenal (HPA); el apego seguro actúa literalmente como buffer del sistema de estrés — bebés con apego seguro muestran menor respuesta de cortisol ante amenazas; el estrés tóxico en los primeros años establece un set point de activación elevado que persiste de por vida; aplicación: la consistencia de la respuesta del cuidador es medicina neurológica.
Peter Levine ("Waking the Tiger", "In an Unspoken Voice"): el trauma somático se origina cuando la energía de activación del sistema nervioso — preparada para lucha/huida — no se descarga completamente; el cuerpo del bebé guarda el estrés no procesado como tensión muscular crónica, patrones respiratorios alterados y respuestas de sobresalto fijas; el trauma infantil no requiere memoria declarativa para dejar huella neurológica duradera; el cuerpo es el archivo del sistema nervioso; aplicación: la tensión corporal del bebé es información, no conducta a corregir.
Bessel van der Kolk ("The Body Keeps the Score"): el trauma temprano vive en el cuerpo y en el sistema nervioso autónomo, no solo en la memoria cognitiva; las intervenciones que no incluyen la dimensión somática son insuficientes; el contacto físico, el movimiento rítmico y la co-regulación son intervenciones de primer orden con bebés; el padre/madre que cuida su propio sistema nervioso cuida el de su bebé; aplicación: el estado regulatorio del cuidador es la intervención primaria.
Mark Wolynn ("It Didn't Start with You"): el trauma no resuelto de generaciones anteriores se transmite epigenéticamente — cambios en la expresión genética relacionados con el estrés se heredan — y en patrones de interacción cotidiana que el padre/madre repite sin saberlo; identificar el trauma familiar no resuelto e interrumpirlo conscientemente es posible; el trabajo del adulto sobre su propia historia es protección directa para el bebé; aplicación: los patrones automáticos del padre/madre ante el bebé que no tienen explicación lógica son candidatos a origen intergeneracional.
INSTRUCCIÓN DE CALIBRACIÓN (0-2): Orienta exclusivamente desde la co-regulación y el vínculo. Ninguna técnica cognitiva, ninguna consecuencia, ningún razonamiento verbal, ningún "hablar sobre lo que pasó". La única intervención efectiva es la presencia física segura, el tono de voz calmado, el contacto piel con piel y el ritmo sostenido. Trata siempre la historia del padre/madre como variable clínica central del sistema — no solo como contexto sino como parte del problema o de la solución.
${TEMAS_CONTEMPORANEOS}`
  }

  if (n <= 5) {
    return `MARCO CIENTÍFICO (2-6 años):
Daniel Siegel y Tina Payne Bryson ("The Whole-Brain Child", "No-Drama Discipline"): la corteza prefrontal — sede del autocontrol, la planificación y la regulación emocional — no madura hasta los 25 años; a esta edad el cerebro límbico domina y las emociones son inmediatas, intensas y sin filtro racional; "connect then redirect" — conectar emocionalmente antes de cualquier corrección; el cerebro se integra mediante relaciones, no mediante consecuencias; narrar lo ocurrido después del episodio en calma construye integración cortical; aplicación: conexión emocional es el primer paso sin excepción.
Stuart Shanker ("Self-Reg: How to Help Your Child (and You) Break the Stress Cycle"): el niño actúa desde el estrés acumulado, no desde la maldad; Self-Reg distingue estrés de descontrol — el objetivo no es inhibir la conducta sino reducir la carga de estrés que la genera; cinco dominios de estrés se acumulan (biológico, emocional, cognitivo, social, prosocial); reducir el estrés en un dominio libera recursos para los demás; la pregunta correcta no es "por qué se porta mal" sino "qué le está sobrecargando"; aplicación: buscar el estresor antes de intervenir sobre la conducta.
Bruce Perry ("The Boy Who Was Raised as a Dog", modelo neurosequencial del desarrollo): el cerebro se desarrolla de abajo hacia arriba — tronco encefálico (regulación básica), mesencéfalo (movimiento y emoción), sistema límbico (apego), córtex (pensamiento); no puedes acceder al razonamiento cortical sin haber regulado los niveles inferiores; la secuencia es regulación, relación, razonamiento — en ese orden, sin excepciones posibles; las intervenciones deben empezar en el nivel donde el niño está funcionando, no donde el adulto quiere que esté; aplicación: regular primero, razonar después es una ley neurológica, no una preferencia.
Ross Greene ("The Explosive Child", CPS — Collaborative Problem Solving): los niños se portan bien cuando pueden; si no pueden, falta una habilidad — cognitiva, lingüística, de regulación o de flexibilidad — no voluntad ni motivación; el CPS identifica el problema específico y lo resuelve colaborativamente con el niño en calma; el Plan B (solución colaborativa) supera al Plan A (imposición) en durabilidad del cambio conductual; las consecuencias durante el episodio de desregulación no producen aprendizaje; aplicación: preguntar qué habilidad falta, no qué consecuencia aplicar.
Janet Lansbury ("No Bad Kids", "Elevating Child Care"): el berrinche es una necesidad de descarga emocional completamente legítima y necesaria para el desarrollo; interrumpirlo o calmarlo prematuramente impide el procesamiento emocional completo; la intervención correcta es acompañar con presencia segura y calma, sin intentar resolver, distraer, negociar ni eliminar la emoción; el adulto que tolera el berrinche sin ansiedad transmite al niño que sus emociones son manejables; aplicación: presencia sin rescate es la técnica.
Stanley Greenspan ("The Secure Child", "Engaging Autism", Floortime/DIR): Floortime — seguir el liderazgo del niño en el juego, unirse a su mundo antes de intentar ampliarlo; la conexión emocional es la condición de todo aprendizaje y desarrollo; las seis etapas del desarrollo emocional funcional (regulación, engagement, intencionalidad, comunicación bidireccional, resolución de problemas, pensamiento simbólico) son la base del desarrollo sano y deben respetarse en secuencia; aplicación: unirse al juego del niño antes de dirigirlo.
Haim Ginott ("Between Parent and Child", "Teacher and Child"): el lenguaje que describe sin juzgar la persona — "veo que estás muy enojado" en lugar de "eres un malcriado" — valida la experiencia emocional sin reforzar la conducta; los mensajes deben ser sobre la situación, nunca sobre la identidad del niño; nunca atacar el carácter; el sarcasmo y la crítica a la identidad dañan la relación de forma acumulativa e irreversible; la comunicación sana empieza siempre por reconocer los sentimientos antes de cualquier otra acción; aplicación: describir lo que se observa, no juzgar lo que el niño es.
Adele Faber y Elaine Mazlish ("How to Talk So Kids Will Listen & Listen So Kids Will Talk"): validar antes de resolver es la secuencia sin excepción — un niño que se siente genuinamente escuchado reduce su activación antes de que el adulto haya propuesto ninguna solución; cinco alternativas al castigo que producen aprendizaje real; describir lo que se ve en lugar de juzgar; dar opciones dentro de límites aceptables; las etiquetas son prisiones — el niño tímido, el difícil, el torpe se convierten en identidad; aplicación: validar la emoción antes de cualquier intervención correctiva.
Jane Nelsen ("Positive Discipline"): firmeza y amabilidad simultáneas no son contradictorias sino la única combinación con evidencia de eficacia duradera; el objetivo de la disciplina es la dignidad mutua y la resolución de problemas a largo plazo, no la obediencia inmediata; las consecuencias naturales enseñan más que las artificiales porque tienen relación lógica con la conducta; los niños aprenden mejor cuando se sienten conectados, no cuando se sienten mal consigo mismos; aplicación: preguntar qué está aprendiendo el niño, no qué está sufriendo.
Barbara Coloroso ("Kids Are Worth It!"): el objetivo final de la disciplina no es que el niño obedezca sino que desarrolle disciplina interna y capacidad de resolver problemas con criterio moral propio; tres tipos de familias — brick wall (autoritaria), jellyfish (permisiva) y backbone (firme y cálida); solo la backbone family produce niños con recursos internos reales y autoestima sólida; la obediencia sin comprensión no construye carácter; aplicación: preguntar si la intervención enseña o solo controla.
Alfie Kohn ("Punished by Rewards", "Unconditional Parenting"): los premios y castigos externos — incluyendo el elogio evaluativo — socavan sistemáticamente la motivación intrínseca y el pensamiento autónomo; el elogio evaluativo ("qué inteligente eres") daña la tolerancia al fracaso y la autoestima real más que el silencio; el amor no debe retirarse nunca como herramienta disciplinaria — el amor condicional produce ansiedad de aprobación crónica; trabajar con los niños en lugar de hacer cosas a los niños; aplicación: reemplazar el elogio evaluativo por descripción de lo observado.
Gabor Maté ("Scattered Minds", "Hold On to Your Kids"): el niño difícil es el niño con mayor sensibilidad neurológica al ambiente, no con mayor maldad; el TDAH y las dificultades conductuales severas son frecuentemente respuestas adaptativas al estrés temprano o a la falta de sintonía relacional en sistemas nerviosos más sensibles; el diagnóstico no debe reemplazar la pregunta por el ambiente y la historia; la pregunta correcta no es "qué le pasa a este niño" sino "qué le ha pasado a este niño y en qué entorno vive"; aplicación: siempre explorar el contexto y la historia antes de patologizar.
Laura Markham ("Peaceful Parent, Happy Kids"): la regulación del padre/madre es condición previa e ineludible a cualquier intervención eficaz — un adulto fisiológicamente desregulado no puede regular a nadie, independientemente de qué técnica aplique; el padre/madre debe manejar su propio "inner life" — sus detonadores, sus miedos, su historia — antes de intervenir; la conexión emocional diaria (tiempo especial, juego, sintonía) es la base que hace posible toda disciplina efectiva; aplicación: la primera intervención es la regulación del adulto.
Becky Kennedy ("Good Inside"): todo comportamiento tiene una raíz comprensible desde el interior del niño — no hay niños malos, hay niños con recursos insuficientes en ese momento; el niño no es el problema, el problema es el problema — separar la identidad del niño de su conducta es el acto terapéutico más importante que puede hacer un padre/madre; "deeply feeling kids" no están dañados, están desbordados; el rol del padre/madre es ser regulador y guía, no juez; aplicación: reformular "mi hijo es difícil" como "mi hijo está teniendo dificultades".
Shefali Tsabary ("The Conscious Parent", "Out of Control"): la crianza consciente requiere que el padre/madre trabaje activamente su propio mundo interior — sus miedos no resueltos, sus patrones reactivos, su historia de apego; el hijo no es una extensión del padre/madre ni un proyecto de mejora sino un ser separado con su propio espíritu; el conflicto con el hijo es siempre una invitación al crecimiento del propio padre/madre; aplicación: antes de corregir al hijo, preguntarse qué activa ese comportamiento en el propio sistema nervioso del adulto.
Jon Kabat-Zinn ("Everyday Blessings: The Inner Work of Mindful Parenting"): la calidad de la presencia del padre/madre importa más que la cantidad de tiempo — la atención plena reduce la reactividad automática ante la conducta del hijo; el mindfulness parental es la capacidad de responder en lugar de reaccionar; la práctica de observar los propios pensamientos y emociones crea el espacio entre el estímulo y la respuesta donde reside la elección consciente; aplicación: la pausa de tres segundos antes de responder ante la conducta difícil es una práctica concreta.
Carlos González ("Mi niño no me come", "Bésame mucho"): el niño que "no come" generalmente come exactamente lo que su cuerpo necesita — la batalla de la alimentación la crea el adulto con presión, distracción, negociación y condicionamiento; retirar la presión y respetar la autorregulación del hambre resuelve el problema en la mayoría de los casos sin ninguna intervención adicional; las demandas de afecto físico del niño pequeño no crean dependencia excesiva sino seguridad que posteriormente habilita la autonomía; aplicación: retirar la presión en la alimentación es la primera intervención.
Stephen Porges (teoría polivagal aplicada 2-6): el tono de voz del adulto — su prosodia, su cadencia, su volumen — activa o suprime el sistema de seguridad social del niño antes de que procese ninguna palabra; un adulto que habla en tono elevado o con prosodia plana desactiva el sistema de engagement social del niño y activa el sistema de defensa; la regulación se transmite por canales implícitos no verbales que el niño procesa antes que el contenido; aplicación: bajar el tono de voz es la primera herramienta.
Bessel van der Kolk (trauma somático en 2-6): la conducta difícil en niños pequeños puede ser expresión de estrés somático acumulado — el cuerpo expresa lo que no puede verbalizarse; las intervenciones puramente conductuales son insuficientes cuando hay trauma somático activo; el movimiento, el juego físico, el contacto y el ritmo son vías primarias de procesamiento del estrés a esta edad; aplicación: cuando ninguna intervención conductual funciona, pensar en trauma somático.
INSTRUCCIÓN DE CALIBRACIÓN (2-6): Co-regulación primero, siempre, sin excepción. Conexión antes que corrección — el cerebro límbico dominante no puede procesar instrucciones sin conexión emocional previa. Redirigir solamente cuando el sistema nervioso del niño ya está calmado. Lenguaje concreto, sensorial, breve. El estado regulatorio del padre/madre es la variable más importante del sistema — nombrarlo explícitamente en cada orientación.
${TEMAS_CONTEMPORANEOS}`
  }

  if (n <= 11) {
    return `MARCO CIENTÍFICO (6-12 años):
Adele Diamond ("Executive Functions", investigación en neurociencia cognitiva del desarrollo): las funciones ejecutivas — inhibición de respuesta, memoria de trabajo y flexibilidad cognitiva — son los predictores más robustos del éxito académico y social, superando al cociente intelectual en estudios longitudinales; se desarrollan en la corteza prefrontal entre los 3 y los 25 años con mayor velocidad entre los 6 y los 12; son frágiles bajo estrés crónico, privación de sueño, tristeza o miedo; el juego libre, la actividad física y las artes son los mejores promotores de funciones ejecutivas en esta etapa; aplicación: antes de intervenir conducta, evaluar sueño y nivel de estrés crónico.
Ross Greene (CPS — Collaborative Problem Solving, "The Explosive Child", "Lost at School"): la habilidad rezagada — no la motivación ni la voluntad — es siempre el punto de partida correcto; identificar la habilidad específica (flexibilidad cognitiva, tolerancia a la frustración, resolución de problemas, comunicación emocional) que falta para resolver el problema de otro modo; el Plan B (resolver el problema colaborativamente con el niño en calma) supera al Plan A (imposición) en todos los outcomes medidos a largo plazo; aplicación: evaluar habilidades rezagadas, no conductas problemáticas.
Alan Kazdin ("The Kazdin Method for Parenting the Defiant Child", Parent Management Training — Yale): el refuerzo positivo sistemático, específico e inmediato es más eficaz que cualquier consecuencia punitiva para cambiar conducta de forma durable; el moldeado gradual — reforzar aproximaciones sucesivas a la conducta objetivo — funciona mejor que exigir la conducta completa desde el inicio; la práctica deliberada de conductas positivas en calma consolida el repertorio más que cualquier conversación o razonamiento; el castigo suprime temporalmente pero no enseña; aplicación: identificar y reforzar específicamente cada aproximación a la conducta deseada.
John Gottman ("Raising an Emotionally Intelligent Child", "The Heart of Parenting"): coaching emocional vs desestimación emocional — los padres que validan las emociones como información legítima, ayudan a nombrarlas y enseñan a manejarlas crían niños con mejor salud física, menor incidencia de enfermedades, mejor rendimiento académico y mejor competencia social medido en estudios longitudinales; la meta-emoción del padre/madre — su filosofía implícita sobre las emociones — determina el clima emocional del hogar más que ninguna técnica específica; aplicación: nombrar las emociones del niño antes de cualquier otra intervención.
Gordon Neufeld ("Hold On to Your Kids"): cuando el niño busca en sus pares lo que debería encontrar en los adultos — aprobación, orientación, identidad, sentido de pertenencia — pierde su brújula de desarrollo y queda a merced de la cultura de pares; el vínculo sólido con adultos significativos es el andamiaje que permite el desarrollo sano; la solución no es aislar al niño de sus pares sino fortalecer y proteger los vínculos con adultos; la orientación hacia pares es el problema psicológico central de la infancia occidental moderna; aplicación: el vínculo adulto-niño es la prioridad terapéutica.
Russell Barkley ("Taking Charge of ADHD", "Executive Functions: What They Are, How They Work"): el TDAH es específicamente un trastorno del desarrollo de la autorregulación — no de la atención, no de la inteligencia — con retraso de aproximadamente 3 años en funciones ejecutivas respecto a los pares; las funciones ejecutivas son habilidades que se desarrollan con el tiempo, no fallas de carácter ni problemas de voluntad; requiere acomodaciones en el entorno y expectativas calibradas a la edad de desarrollo, no a la cronológica; el TDAH no tratado tiene consecuencias en salud, relaciones y rendimiento que superan ampliamente los riesgos del tratamiento; aplicación: ajustar las expectativas a la edad de desarrollo ejecutivo, no a la edad cronológica.
Edward Hallowell ("Driven to Distraction", "ADHD 2.0"): el TDAH incluye fortalezas reales y documentadas — creatividad divergente, hiperfoco en áreas de interés genuino, energía, pensamiento asociativo no lineal, empatía intensa en muchos casos; estas fortalezas desaparecen en entornos diseñados para la conformidad, la quietud y el procesamiento lineal; el problema frecuentemente es el diseño del entorno escolar y familiar, no el niño; el diagnóstico debe ir acompañado siempre de un mapa de fortalezas; aplicación: identificar las condiciones en las que el niño funciona bien como punto de partida.
Tamar Chansky ("Freeing Your Child from Anxiety", "Freeing Your Child from Negative Thinking"): la ansiedad infantil es un hábito cognitivo entrenable, no un rasgo fijo ni síntoma de patología grave; externalizar la ansiedad — darle un nombre separado del niño ("el señor preocupón", "el detector de humo hiperactivo") — permite ganar perspectiva metacognitiva y no identificarse con los pensamientos ansiosos; el cerebro ansioso distorsiona la probabilidad y la magnitud de la amenaza de forma predecible y corregible; aplicación: enseñar al niño a "atrapar" y cuestionar los pensamientos ansiosos.
Lynn Lyons ("Anxious Kids, Anxious Parents"): los padres ansiosos crían hijos ansiosos no principalmente por genética sino por modelado conductual y acomodación sistemática; la acomodación — evitar situaciones ansiógenas, proporcionar exceso de seguridad, resolver el problema del hijo — refuerza y amplifica la ansiedad en lugar de reducirla; aprender a tolerar la incomodidad del hijo ansioso sin rescatarlo es parte central e ineludible del tratamiento; aplicación: identificar los comportamientos de acomodación del padre/madre como parte del problema a cambiar.
Henry Cloud y John Townsend ("Boundaries", "Boundaries with Kids"): los límites claros y consistentes son regalos para el desarrollo, no castigos ni señales de frialdad afectiva; el niño que no experimenta límites consistentes no puede desarrollar un sentido diferenciado de sí mismo, regulación emocional ni responsabilidad personal; los límites enseñan la realidad del mundo — que las acciones tienen consecuencias; amar sin límites no es amor sino abandono de la función reguladora del adulto; aplicación: los límites y el calor afectivo no son opuestos, son complementarios.
Diana Baumrind (investigación en estilos parentales, "Child Care Practices Anteceding Three Patterns of Preschool Behavior"): el estilo parental autoritativo — alta calidez emocional combinada con alta exigencia y estructura clara, explicación de razones y autonomía guiada — produce consistentemente los mejores outcomes en salud mental, rendimiento académico y competencia social en investigación longitudinal de más de 30 años; ni el permisivo (alta calidez, baja exigencia) ni el autoritario (baja calidez, alta exigencia) se acercan a estos resultados; aplicación: el objetivo es combinar calidez genuina con exigencia clara — no elegir entre los dos.
Dan Siegel y Mary Hartzell ("Parenting from the Inside Out"): el padre/madre que ha procesado narrativamente su propia historia de apego puede cambiar activamente el patrón que transmite a su hijo; la coherencia narrativa de la historia personal del adulto predice el estilo de apego del hijo con más fuerza que los eventos traumáticos en sí; la plasticidad del apego es real — no estamos determinados por nuestra historia si la hemos integrado con sentido; aplicación: el padre/madre que "entiende de dónde viene" puede criar distinto de como fue criado.
Ellyn Satter ("Child of Mine", "How to Get Your Kid to Eat"): la división de responsabilidades en alimentación — el padre/madre decide qué ofrecer, cuándo y dónde; el hijo decide cuánto come y si come — es la única estrategia con evidencia robusta para criar comensales competentes; violar esta división mediante presión, vigilancia, distracción o recompensas produce exactamente los problemas de alimentación que pretende resolver; la autorregulación del hambre y la saciedad es innata y debe preservarse activamente; aplicación: retirar toda presión y vigilancia en la alimentación.
Marc Weissbluth ("Healthy Sleep Habits, Happy Child"): el sueño insuficiente crónico en la infancia produce síntomas clínicamente indistinguibles del TDAH, la ansiedad y los trastornos del estado de ánimo — irritabilidad, inatención, hiperactividad, labilidad emocional; la intervención en higiene del sueño es frecuentemente la primera y más eficaz intervención conductual disponible antes de cualquier otra; los horarios de sueño consistentes son herramientas de salud mental, no solo de salud física; aplicación: evaluar cantidad y calidad del sueño como primera variable clínica.
Jean Piaget ("The Psychology of the Child", teoría del desarrollo cognitivo): los niños de 6-12 años están en la etapa de operaciones concretas — pueden razonar lógicamente sobre objetos y eventos concretos pero no aún sobre abstracciones puras; el aprendizaje ocurre mediante interacción activa con el entorno — manipular, experimentar, construir; el niño construye su comprensión desde adentro, no la recibe pasivamente; las instrucciones abstractas sin anclaje concreto no producen comprensión real; aplicación: anclar toda instrucción y consecuencia en lo concreto, observable y tangible.
Lev Vygotsky ("Mind in Society", zona de desarrollo próximo): la zona de desarrollo próximo (ZDP) es el espacio entre lo que el niño puede hacer solo y lo que puede hacer con ayuda competente; el aprendizaje óptimo ocurre en la ZDP — ni demasiado fácil ni demasiado difícil; el andamiaje adulto debe retirarse gradualmente a medida que el niño adquiere competencia; el lenguaje y la interacción social son el motor del desarrollo cognitivo, no solo el resultado; aplicación: identificar la ZDP del niño para calibrar el nivel de exigencia y apoyo.
Stanley Turecki ("The Difficult Child"): el temperamento difícil — alta intensidad emocional, baja adaptabilidad, reactividad elevada, irregularidad biológica, umbral sensorial bajo — es una característica neurológica real, no resultado de mala crianza; los padres de niños con temperamento difícil necesitan estrategias específicas calibradas al temperamento, no las mismas recomendaciones generales; entender el temperamento del hijo reduce la culpa del padre/madre y aumenta dramáticamente la eficacia de las intervenciones; aplicación: mapear el temperamento del niño antes de diseñar cualquier estrategia.
Jerome Kagan (investigación sobre temperamento e inhibición conductual): la inhibición conductual — timidez, reactividad al estrés, cautela extrema — tiene base neurológica en la reactividad de la amígdala y es parcialmente hereditaria; el temperamento es estable pero no determinista — el ambiente puede modular significativamente su expresión; los niños con alta reactividad necesitan exposición gradual y apoyo consistente, no exposición abrupta ni sobreprotección; aplicación: diferenciar entre temperamento y patología evitando tanto la patologización como la sobreprotección.
Brené Brown ("Daring Greatly", "The Gifts of Imperfection"): la vergüenza — "soy malo, soy un fracaso" — es diferente de la culpa — "hice algo malo" — y produce resultados opuestos en el desarrollo; la vergüenza crónica destruye la autoestima, aumenta la conducta problemática y bloquea el aprendizaje; la cultura de la perfección y el perfeccionismo parental dañan el desarrollo; criar en la suficiencia — "eres suficiente tal como eres" — y modelar la vulnerabilidad como fortaleza son los antídotos reales; aplicación: diferenciar corrección de la conducta (culpa funcional) de ataque a la identidad (vergüenza disfuncional).
Temple Grandin ("Thinking in Pictures", "The Autistic Brain"): el pensamiento visual y los estilos de procesamiento atípicos son diferencias, no defectos; muchos niños que no encajan en los moldes educativos estándar tienen fortalezas cognitivas específicas que el sistema no sabe detectar ni valorar; el ambiente que maximiza las fortalezas produce mejores resultados que el que solo intenta corregir los déficits; la neurodiversidad requiere respuestas individualizadas, no tratamientos uniformes; aplicación: identificar cómo piensa y aprende este niño específico antes de diseñar intervenciones.
Richard Ferber ("Solve Your Child's Sleep Problems"): los problemas de sueño en la infancia son frecuentes, tratables y tienen consecuencias conductuales y cognitivas significativas si se cronifican; el sueño independiente es una habilidad enseñable mediante métodos graduales con evidencia de seguridad; el sueño del niño afecta directamente el sueño, el estado de ánimo y la capacidad regulatoria del padre/madre; aplicación: tratar el sueño del niño como prioridad terapéutica familiar, no solo individual.
William Sears ("The Baby Book", attachment parenting): el contacto físico frecuente, la respuesta sensible y el vínculo cercano construyen apego seguro y sincronía biológica; la respuesta sensible no crea dependencia excesiva sino seguridad que posteriormente permite la autonomía genuina; contextualizar estas prácticas en la cultura, los recursos y las necesidades específicas de cada familia; aplicación: el contacto físico y la respuesta sensible siguen siendo herramientas de regulación válidas en la infancia media.
Bessel van der Kolk (trauma en 6-12): el trauma vive en el cuerpo y las intervenciones puramente cognitivas o conductuales no alcanzan cuando hay trauma somático activo; el movimiento físico, las artes expresivas, el teatro, los deportes de contacto y la música son vías de procesamiento del estrés traumático que la terapia verbal no puede reemplazar; los niños traumatizados frecuentemente no pueden acceder al lenguaje para describir su experiencia — el cuerpo habla primero; aplicación: cuando el niño no puede hablar de lo que le pasa, buscar vías expresivas no verbales.
Stephen Porges (seguridad neurofisiológica en el entorno 6-12): el sistema nervioso del niño evalúa constantemente la seguridad del entorno mediante señales no verbales del adulto — tono de voz, postura, expresión facial — antes de cualquier contenido verbal; la neurorecepción precede a la percepción consciente; un hogar y un aula neurofisiológicamente seguros son condición de posibilidad del aprendizaje, la conducta prosocial y el acceso a las funciones ejecutivas; aplicación: diseñar la seguridad del ambiente antes de intervenir sobre la conducta.
Mark Wolynn (patrones intergeneracionales en 6-12): los síntomas y conductas que no tienen explicación en la historia del niño frecuentemente tienen raíz en traumas no resueltos de generaciones anteriores transmitidos en patrones relacionales; identificar estos patrones en la familia de origen del padre/madre puede cambiar la respuesta al niño más que cualquier técnica; aplicación: cuando los patrones del niño no responden a ninguna intervención, explorar la historia familiar de los cuidadores.
Carlos González (alimentación en 6-12): las batallas de alimentación en esta etapa tienen la misma etiología que en etapas anteriores — la presión, el condicionamiento y la negociación del adulto crean y mantienen el problema; retirar la presión y confiar en la autorregulación del hambre resuelve la mayoría de los casos; el niño que "solo come pasta" frecuentemente está respondiendo a la presión y la ansiedad del adulto, no expresando una preferencia biológica fija; aplicación: la intervención es retirar la presión, no aumentarla.
Adele Faber ("Siblings Without Rivalry"): los hermanos no necesitan ser tratados igual — necesitan ser tratados según sus necesidades individuales; el trato igualitario forzado genera comparación y resentimiento; comparar hermanos destruye la relación entre ellos; cada hijo necesita sentir que es amado de forma única e irrepetible; aplicación: nombrar explícitamente la individualidad de cada hijo en lugar de enfatizar el trato igual.
INSTRUCCIÓN DE CALIBRACIÓN (6-12): Identificar la habilidad rezagada detrás de cada conducta — no el problema de motivación o de carácter. Las intervenciones cognitivas y conductuales son eficaces en calma, no en el pico de activación. Reforzar positivamente con especificidad conductual. Usar resolución colaborativa de problemas. Evaluar sueño como variable de primer orden antes de cualquier otra intervención. El contexto social — relación con pares y con adultos significativos — es el segundo factor más importante después de la regulación del sistema nervioso.
${TEMAS_CONTEMPORANEOS}`
  }

  return `MARCO CIENTÍFICO (12-18 años):
Daniel Siegel ("Brainstorm: The Power and Purpose of the Teenage Brain"): el cerebro adolescente atraviesa una segunda poda sináptica masiva — se eliminan conexiones no usadas y se refuerzan las frecuentes; el sistema límbico está hiperactivo mientras la corteza prefrontal aún remodelan; esto explica la impulsividad, la búsqueda de riesgo y la reactividad emocional como fenómenos neurobiológicos normales, no defectos de carácter; el cerebro adolescente tiene cuatro cualidades adaptativas reales — spark (intensidad emocional), social engagement, novelty-seeking y creative exploration — que deben canalizarse, no suprimirse; aplicación: tratar la intensidad emocional adolescente como energía a canalizar, no como patología a corregir.
Laurence Steinberg ("Age of Opportunity", investigación en neurociencia adolescente): la presencia de pares duplica mediblemente la toma de riesgos en laboratorio — es neurobiología del sistema de recompensa social, no rebeldía; el sistema de recompensa está sobreactivado en la adolescencia temprana — el riesgo se siente más atractivo y las consecuencias negativas menos disuasorias que en cualquier otra etapa; la autorregulación mejora gradualmente entre los 16 y los 25 años; el período 12-25 es de enorme plasticidad cerebral, positiva y negativamente; aplicación: reducir la exposición al riesgo cambiando el ambiente, no solo razonando con el adolescente.
Lisa Damour ("Untangled: Guiding Teenage Girls Through the Seven Transitions", "Under Pressure"): las chicas necesitan que se normalice su ansiedad funcional, no que se elimine — la ansiedad adaptativa es señal de un sistema nervioso que funciona; el problema clínico es la ansiedad que desborda y limita, no toda la ansiedad; las siete transiciones de la adolescencia femenina incluyen separarse de los padres, unirse al grupo de pares, desarrollar un cuerpo adulto, manejar la sexualidad y prepararse para la adultez; la validación sin catastrofizar es la intervención central; aplicación: distinguir entre ansiedad funcional (útil, normalizar) y ansiedad disfuncional (limita, intervenir).
Jonathan Haidt ("The Anxious Generation: How the Great Rewiring of Childhood Is Causing an Epidemic of Mental Illness"): los smartphones entregados antes de los 16 años y las redes sociales basadas en engagement — especialmente Instagram y TikTok — están produciendo la peor crisis de salud mental adolescente registrada; los mecanismos documentados son privación del sueño, comparación social constante, acoso 24/7 y sustitución del juego libre por pantalla; la solución es colectiva y de normas sociales — ninguna familia puede resolver sola lo que requiere coordinación comunitaria; aplicación: tratar el uso de pantallas como variable estructural del entorno, no como conducta individual a controlar.
Jean Twenge ("iGen: Why Today's Super-Connected Kids Are Growing Up Less Rebellious, More Tolerant, Less Happy — and Completely Unprepared for Adulthood"): la generación Z (nacidos desde 1995) es la más solitaria, ansiosa y deprimida de la que tenemos registro sistemático; el punto de inflexión es 2012, cuando el uso del smartphone se masificó entre adolescentes; las causas son estructurales — sustitución del tiempo de socialización presencial y juego libre por pantalla, hiperprotección que elimina la exposición al riesgo y al fracaso necesarios para el desarrollo, pérdida de autonomía real; aplicación: identificar cuánto tiempo de pantalla se ha sustituido por interacción social presencial.
Kenneth Ginsburg ("Building Resilience in Children and Teens", "A Parent's Guide to Building Resilience"): los 7 componentes de la resiliencia — competencia, confianza, conexión, carácter, contribución, afrontamiento (coping) y control — son habilidades enseñables que requieren práctica y experiencia real de superación de obstáculos; la sobreprotección que elimina el fracaso también elimina el desarrollo de la resiliencia; los adolescentes necesitan experimentar consecuencias reales para desarrollar competencia real; la conexión con al menos un adulto significativo es el factor protector más robusto identificado en la investigación; aplicación: identificar qué componente de resiliencia está más rezagado y cómo fortalecerlo.
Michael Bradley ("Yes, Your Teen Is Crazy!", "When Things Get Crazy with Your Teen"): la testosterona durante la poda sináptica adolescente masculina produce impulsividad, búsqueda activa de riesgo, agresividad y déficit de planificación a consecuencias con base hormonal y neurológica documentada; los padres que entienden la base neurobiológica responden con estructura y conexión en lugar de solo consecuencias; los chicos necesitan adultos que les ofrezcan riesgo positivo — deportes, responsabilidades reales, desafíos físicos — para canalizar la energía; aplicación: ofrecer canales de riesgo positivo antes de intentar eliminar el riesgo negativo.
Anthony Wolf ("Get Out of My Life, but First Could You Drive Me and Cheryl to the Mall?"): el adolescente necesita psicológicamente "matar" a sus padres — desidealizar, cuestionar sistemáticamente, rechazar la autoridad con la que se ha identificado — para construir su propia identidad diferenciada; esta devaluación de los padres es un proceso de desarrollo sano y necesario, no patología relacional; los padres que entienden esto pueden tolerar la oposición sin tomársela como ataque personal y sin abandonar el vínculo; aplicación: interpretar la oposición adolescente como señal de desarrollo sano, no como fracaso de crianza.
Carl Pickhardt ("Surviving Your Child's Adolescence", "The Connected Father"): la identidad adolescente se construye por oposición y diferenciación activa — el adolescente necesita distinguirse de sus padres para saber quién es; el conflicto con los padres es parte estructural del proceso de individuación, no el problema a eliminar; los padres que mantienen el vínculo mientras toleran la oposición facilitan la individuación sana; la separación psicológica saludable requiere que haya algo sólido de qué separarse; aplicación: mantener el vínculo y los límites simultáneamente, sin colapsar ninguno.
Robert Epstein ("Teen 2.0: Saving Our Children and Families from the Torment of Adolescence"): la adolescencia turbulenta no es universal — es una construcción cultural moderna que resulta de infantilizar a los jóvenes durante más tiempo del necesario; en culturas y épocas históricas que otorgan responsabilidades reales y autonomía genuina a los adolescentes, los problemas conductuales típicos de la adolescencia occidental no existen en la misma medida; privar a los jóvenes de responsabilidades reales crea la tormenta que después diagnosticamos como rasgo inherente de la etapa; aplicación: identificar qué responsabilidades reales puede asumir el adolescente en el hogar y en la comunidad.
Erik Erikson ("Identity: Youth and Crisis", etapas del desarrollo psicosocial): la tarea central de la adolescencia es la resolución de la crisis identidad vs confusión de roles — el adolescente necesita explorar, experimentar y eventualmente comprometerse con una identidad cohesiva; la moratoria psicosocial — tiempo y espacio para experimentar sin consecuencias definitivas — es necesaria para la resolución sana; los adultos que no toleran la exploración identitaria (incluyendo valores, sexualidad, creencias) bloquean el desarrollo normal; aplicación: tolerar la exploración de identidad como proceso necesario, no como amenaza a controlar.
Resmaa Menakem ("My Grandmother's Hands: Racialized Trauma and the Pathway to Mending Our Hearts and Bodies"): el trauma racial y cultural se transmite somáticamente de generación en generación — vive en el sistema nervioso y en el cuerpo antes de llegar al lenguaje; la regulación del sistema nervioso es el primer paso para interrumpir la transmisión intergeneracional del trauma; los adolescentes de comunidades con trauma histórico acumulado necesitan intervenciones que incluyan la dimensión somática, cultural y comunitaria, no solo psicológica individual; aplicación: considerar el contexto cultural e histórico como parte del cuadro clínico.
Bessel van der Kolk (trauma en adolescentes): los adolescentes con trauma somático activo no responden a consecuencias, razonamientos ni intervenciones cognitivas aisladas; el cuerpo, el movimiento, las artes expresivas, el teatro, los deportes y la regulación del sistema nervioso autónomo son parte central del trabajo terapéutico; el trauma complejo en adolescentes frecuentemente se presenta como conducta oposicionista, impulsividad extrema o disociación que es mal interpretada como rebeldía o patología de carácter; aplicación: cuando ninguna intervención conductual funciona, pensar en trauma somático no resuelto.
Stephen Porges (teoría polivagal en adolescentes): el sistema nervioso del adolescente sigue evaluando la seguridad del entorno mediante señales no verbales antes que verbales; la calma corporal del adulto, su tono de voz y su postura abierta regulan al adolescente y abren la posibilidad de conversación antes que cualquier argumento racional; la confrontación con tono elevado activa el sistema de defensa y hace imposible el acceso a la corteza prefrontal; aplicación: regular el propio cuerpo antes de iniciar cualquier conversación difícil con el adolescente.
Shefali Tsabary ("The Conscious Parent", "The Awakened Family"): el padre/madre que ha trabajado y procesado su propia adolescencia — sus heridas de identidad, sus vergüenzas no resueltas, sus duelos de individuación — puede acompañar la individuación del hijo sin confundirla con una amenaza personal; el conflicto con el adolescente frecuentemente es un espejo de los conflictos no resueltos del padre/madre en su propia adolescencia; el trabajo interior del adulto es el trabajo de crianza más importante en esta etapa; aplicación: antes de intervenir en el conflicto con el adolescente, preguntarse qué activa este comportamiento en la propia historia del adulto.
Jon Kabat-Zinn ("Everyday Blessings"): la presencia mindful del adulto — sin agenda de cambio, sin juicio, con curiosidad genuina por el mundo interior del adolescente — es la condición de posibilidad de cualquier conversación difícil y de cualquier influencia real; la práctica de no reaccionar automáticamente ante la conducta adolescente es una habilidad que el padre/madre puede cultivar deliberadamente; aplicación: la calidad de la escucha es más importante que el contenido de lo que el adulto dice.
Pamela Druckerman ("Bringing Up Bébé"): la crianza francesa — tolerancia a la frustración temprana, estructura de comidas, autonomía graduada desde pequeños, adultos con vida propia — produce niños con mayor capacidad de espera, mejor regulación y menos ansiedad adolescente; el enfoque que centra toda la vida familiar en las necesidades del hijo no produce mejor desarrollo sino mayor ansiedad en el hijo y mayor agotamiento en el adulto; el adolescente necesita ver que los adultos tienen una vida propia e intereses más allá de él; aplicación: el padre/madre que tiene vida propia modela la autonomía que el adolescente necesita desarrollar.
Christine Gross-Loh ("Parenting Without Borders"): las prácticas de crianza varían enormemente entre culturas — lo que en una cultura occidental parece abandono o negligencia, en otra es desarrollo sano de autonomía; la hipervigilancia occidental del riesgo es una anomalía histórica y cultural, no un estándar universal de buen cuidado; los adolescentes de culturas con mayor autonomía física, responsabilidades domésticas reales y menos supervisión adulta muestran mayor competencia y menor ansiedad; aplicación: cuestionar qué prácticas de "protección" son en realidad obstáculos al desarrollo de la autonomía.
INSTRUCCIÓN DE CALIBRACIÓN (12-18): Respetar la autonomía como necesidad legítima de desarrollo, no como concesión ni como permisividad. Evitar el control coercitivo, la humillación y la comparación — erosionan el vínculo sin producir cambio. Buscar siempre el problema subyacente antes de intervenir sobre la conducta visible. Intervenir únicamente en calma, nunca en el pico del conflicto. Mantener el vínculo por encima de ganar cualquier discusión. Tratar el uso de pantallas como variable estructural del entorno que requiere respuesta colectiva. El estado regulatorio del propio adulto es la variable más importante — nombrarlo siempre.
${TEMAS_CONTEMPORANEOS}`
}

export async function generarAccionInmediata({ hijo, episodio }) {
  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.
Acaba de tener: ${episodio.tipo} (intensidad ${episodio.intensidad}/5).${episodio.emocion ? `\nEmoción del ${genero}: ${episodio.emocion}` : ''}${episodio.contexto ? `\nContexto: ${episodio.contexto}` : ''}${episodio.gatillantes?.length ? `\nGatillantes: ${episodio.gatillantes.join(', ')}` : ''}${episodio.descripcionLibre ? `\nRelato del padre/madre: ${episodio.descripcionLibre}` : ''}

Escribe UNA sola acción concreta que el padre/madre puede hacer AHORA MISMO en los próximos 2 minutos. Máximo 3 líneas. Sin listas, sin títulos, sin markdown. Lenguaje simple y cálido, calibrado estrictamente para la edad indicada según el marco científico anterior. Empieza con "Ahora mismo:" y describe el gesto o acción física específica, incluyendo palabras exactas si aplica. Que sea algo que cualquier padre/madre pueda hacer en casa ahora, sin preparación. Cuida la gramática y la sintaxis con precisión. Evita frases ambiguas o mal construidas. Usa oraciones cortas y claras. Nunca dejes frases incompletas. Revisa que cada adjetivo y adverbio esté correctamente ubicado respecto al sustantivo que modifica.`

  return llamarAPI(prompt, 350)
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

  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.

Episodio registrado:
- Tipo: ${episodio.tipo}
- Intensidad: ${episodio.intensidad}/5${episodio.emocion ? `\n- Emoción del ${genero}: ${episodio.emocion}` : ''}
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

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico. Cuida la gramática y la sintaxis con precisión. Evita frases ambiguas o mal construidas. Usa oraciones cortas y claras. Nunca dejes frases incompletas. Revisa que cada adjetivo y adverbio esté correctamente ubicado respecto al sustantivo que modifica.`

  return llamarAPI(prompt, 1400)
}

export async function interpretarPatrones({ hijo, episodios }) {
  if (episodios.length < 3) {
    return 'Registra al menos 3 episodios para que pueda identificar patrones en el comportamiento de tu hijo.'
  }

  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const resumen = episodios.slice(0, 20).map(e =>
    `${new Date(e.fecha).toLocaleDateString('es-CL')}: ${e.tipo} (intensidad ${e.intensidad}/5, gatillantes: ${e.gatillantes?.join(', ') || 'ninguno'})`
  ).join('\n')

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.

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

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico. Cuida la gramática y la sintaxis con precisión. Evita frases ambiguas o mal construidas. Usa oraciones cortas y claras. Nunca dejes frases incompletas. Revisa que cada adjetivo y adverbio esté correctamente ubicado respecto al sustantivo que modifica.`

  return llamarAPI(prompt, 1800)
}

export async function celebrarHito({ hijo, hito }) {
  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.

El padre/madre acaba de registrar este avance positivo:
- Tipo: ${hito.categoria}
- Descripción: ${hito.descripcion || '(sin descripción)'}

Responde con exactamente 2 oraciones cálidas y concretas. Valida el significado de este momento para el desarrollo del niño en esta etapa específica, explicando brevemente por qué este tipo de avance importa neurológicamente o conductualmente a esta edad según el marco científico anterior. Habla en segunda persona al padre/madre. No uses listas ni títulos. No incluyas disclaimer ni marco aplicado. Cuida la gramática y la sintaxis con precisión. Evita frases ambiguas o mal construidas. Usa oraciones cortas y claras. Nunca dejes frases incompletas. Revisa que cada adjetivo y adverbio esté correctamente ubicado respecto al sustantivo que modifica.`

  return llamarAPI(prompt, 180)
}

export async function generarTareas({ hijo, habilidad, descripcion }) {
  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.
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
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const semanaEp = episodios.filter((e) => new Date(e.fecha) >= hace7).slice(0, 8)
  const hitosCount = hitos.filter((h) => new Date(h.fecha) >= hace7).length
  const estrategiaActiva = (estrategias || []).find((e) => e.semanaActual < 4)

  const resumenEp = semanaEp.length > 0
    ? semanaEp.map((e) => {
        let line = `- ${e.tipo}, intensidad ${e.intensidad}/5`
        if (e.gatillantes?.length) line += `, gatillantes: ${e.gatillantes.join(', ')}`
        if (e.emocion) line += `, emoción del ${genero}: ${e.emocion}`
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

Datos de esta semana — ${hijo?.nombre || 'hijo/a'}, ${hijo?.edad || '?'} años (${genero}):
Episodios: ${semanaEp.length}${avgIntensidad ? `, intensidad promedio ${avgIntensidad}/5` : ''}${topGatillante ? `, gatillante más frecuente: "${topGatillante}"` : ''}${hitosCount > 0 ? `, avances positivos: ${hitosCount}` : ''}${estrategiaActiva ? `, estrategia activa: "${estrategiaActiva.habilidad}" semana ${Math.min(estrategiaActiva.semanaActual, 4)}/4` : ''}.
${semanaEp.length > 0 ? `Detalle: ${resumenEp}` : ''}

INSTRUCCIÓN: Escribe exactamente dos bloques, sin títulos ni markdown.

Bloque 1 — insight (2-3 oraciones): Observa los datos anteriores y extrae algo concreto y útil que revelen sobre ${hijo?.nombre || 'tu hijo/a'} esta semana. Nombra el patrón real: un gatillante específico, un tipo de episodio que se repite, la intensidad en contexto. Sugiere algo accionable apropiado para la edad. Nada genérico. Segunda persona, tono directo y cálido.

Bloque 2 — frase de acompañamiento (1 oración en cursiva con *): Una sola oración que nazca orgánicamente del marco científico (Siegel, Shanker, Perry, Greene, Lansbury o Maté según corresponda a la situación). Que suene humana y cálida, no académica ni motivacional. Que aporte comprensión real, no consuelo vacío. Escríbela en cursiva usando *frase*.

Máximo 80 palabras en total. Sin listas. Sin disclaimer. Cuida la gramática: oraciones cortas, ninguna frase incompleta, adjetivos bien ubicados. Usa "${genero}", "${pronombre}" y "${articulo}" al referirte a ${hijo?.nombre || 'tu hijo/a'}.`

  return llamarAPI(prompt, 250)
}

export async function generarEstrategia({ hijo, habilidad, descripcion }) {
  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.
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
