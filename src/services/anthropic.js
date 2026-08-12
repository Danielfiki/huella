import { supabase } from '../lib/supabase.js'
import { TAXONOMIA_EMOCIONES } from '../constants/taxonomiaEmociones.js'

// Timeout duro para cualquier llamada al backend de IA. Sin esto el
// fetch puede quedar colgado indefinidamente y los loaders de la UI
// nunca salen (caso reproducido en P3 Cierre). 75s absorbe el caso
// normal de generación de plan y mata cualquier cuelgue real.
const TIMEOUT_MS = 75000

async function llamarAPI(prompt, max_tokens) {
  const headers = { 'content-type': 'application/json' }

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch('/api/anthropic', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, max_tokens }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      const e = new Error('La consulta está tardando demasiado. Intenta en unos minutos.')
      e.code = 'servicio_inaccesible'
      e.status = 0
      throw e
    }
    // TypeError de fetch: offline / DNS / red caída.
    const e = new Error('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    e.code = 'red'
    e.status = 0
    throw e
  }
  clearTimeout(timeoutId)

  let body = null
  try {
    body = await response.json()
  } catch {
    // Body no-JSON o vacío (p. ej. 502 con HTML de proxy).
  }

  if (!response.ok) {
    // El backend ya devuelve { error: <español>, code: <semántico> }.
    // Adjuntamos code y status al Error para que retryAsync y los
    // callers ramifiquen sin parsear strings.
    const msg = body?.error || 'Algo no funcionó al conectar con la IA. Inténtalo de nuevo.'
    const e = new Error(msg)
    e.code = body?.code || 'error_servicio'
    e.status = response.status
    throw e
  }

  const text = body?.text ?? ''
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

// ──────────────────────────────────────────────────────────────────────
// REGLA_IDIOMA — regla de voz única y fuerte, compartida por todos los
// prompts del cliente que llevan su propia instrucción de idioma. Cierra el
// hueco que dejó pasar el voseo enclítico ("decile chau"): las listas viejas
// solo prohibían las formas desnudas (decí, hacé), no las de pronombre pegado.
// NOTA: el backend (api/anthropic.js, sección IDIOMA del SYSTEM_PROMPT) tiene
// una copia equivalente de esta regla porque el cliente y el serverless no
// comparten módulo. Si cambias una, cambia la otra.
// ──────────────────────────────────────────────────────────────────────
const REGLA_IDIOMA = `IDIOMA — REGLA CRÍTICA E INNEGOCIABLE: escribe SIEMPRE en español latinoamericano neutro con TUTEO: tú dices, puedes, quieres, dile, mira, recuerda, haz. PROHIBIDO el voseo argentino/rioplatense en CUALQUIER forma, incluidas las de pronombre pegado al verbo: vos, sos, tenés, podés, querés, sabés, hacés, fijate, mirá, decí, y sobre todo "decile", "contale", "hacele", "mandale", "dale" (imperativo rioplatense). PROHIBIDOS también los modismos regionales marcados (che, boludo) y el español de España (vale, vosotros, coger). Correcto: "dile chau", "puedes intentar", "cuando quieras". Neutro y cálido. VOCABULARIO — Huella es una app chilena. PROHIBIDAS las palabras que en Chile tienen doble sentido vulgar, aunque en otros países sean neutras. En particular NUNCA uses "pico" (di "momento de máxima activación", "punto más alto"), ni "concha", ni "pinchar", ni "polla". Revisa tu respuesta antes de devolverla.`

const TEMAS_CONTEMPORANEOS = `TEMAS ESPECÍFICOS Y DOLORES PARENTALES CONTEMPORÁNEOS:
PANTALLAS Y TECNOLOGÍA: Jonathan Haidt ("The Anxious Generation", 2024): smartphones antes de los 16 años están causando la peor crisis de salud mental juvenil de la historia — no smartphone antes de secundaria, no redes sociales antes de 16, sin pantallas en el cuarto, más tiempo no estructurado. Jean Twenge ("iGen", "Generation Me"): la generación Z es la más ansiosa, solitaria y deprimida — correlación directa entre horas de pantalla y depresión, especialmente en niñas. Anya Kamenetz ("The Art of Screen Time"): enfoque equilibrado — ni pánico ni permisividad; el contexto importa más que el tiempo total. Michael Rich (Harvard, "médico de los medios"): los medios digitales afectan el sueño, la atención y el desarrollo social — la clave es la calidad del contenido y el uso compartido. Yalda Uhls ("Media Moms & Digital Dads"): los niños que pasan tiempo sin pantallas mejoran dramáticamente su lectura de emociones.
ANSIEDAD INFANTIL Y PARENTAL: Tamar Chansky ("Freeing Your Child from Anxiety"): externalizar la ansiedad, darle nombre, no evitar sino acompañar la exposición gradual. Lynn Lyons ("Anxious Kids, Anxious Parents"): la acomodación parental — hacer lo que el hijo ansioso pide para que se calme — refuerza el circuito de la ansiedad; los padres deben modelar tolerancia a la incertidumbre. Rachel Busman (TCC para niños): la terapia cognitivo-conductual es el tratamiento con mayor evidencia para la ansiedad infantil. Dan Peters: alta capacidad intelectual y ansiedad van frecuentemente juntos — el niño brillante que se paraliza ante el error.
TDAH Y NEURODIVERSIDAD: Russell Barkley ("Taking Charge of ADHD"): el TDAH es un trastorno del desarrollo de la autorregulación, no de la atención — el déficit real es en la memoria de trabajo, la inhibición y el manejo del tiempo. Edward Hallowell ("Driven to Distraction"): el TDAH como motor de creatividad y pasión cuando se canaliza bien — el diagnóstico como liberación, no como condena. Thomas Brown (funciones ejecutivas): el TDAH afecta el sistema de gestión del cerebro — no es falta de voluntad sino de activación neurológica. Temple Grandin ("The Autistic Brain"): el autismo como diferencia de procesamiento, no como déficit — el pensamiento visual como fortaleza real.
LÍMITES Y OBEDIENCIA: Henry Cloud y John Townsend ("Boundaries with Kids"): los límites enseñan que las acciones tienen consecuencias reales — sin límites el niño no desarrolla carácter. Nancy Samalin: el enojo parental es normal y manejable — lo que importa es cómo se expresa, no si existe. Alfie Kohn ("Unconditional Parenting"): los premios y castigos crean obediencia externa pero no carácter interno — el objetivo es la autonomía moral.
SUEÑO: Harvey Karp ("Happiest Baby on the Block"): las 5 S para calmar bebés — el cuarto trimestre requiere replicar condiciones intrauterinas. Carlos González ("Dormir sin lágrimas"): los despertares nocturnos son fisiología normal de la infancia temprana; el acompañamiento presente, no el entrenamiento conductual, es la intervención coherente con el desarrollo. T. Berry Brazelton (touchpoints del sueño): cada salto evolutivo desorganiza el sueño transitoriamente; el sueño consolidado se logra con tiempo y consistencia afectiva, no con extinción del llanto.
ALIMENTACIÓN: Ellyn Satter (división de responsabilidad): el padre decide qué, cuándo y dónde; el hijo decide cuánto y si come — respetar esta división elimina el 90% de las batallas de alimentación. Carlos González ("Mi niño no me come"): el niño que "no come" generalmente come lo que necesita — la batalla la crea el adulto con la presión y la ansiedad. Katja Rowell (alimentación responsiva): el trauma de alimentación — forzar, presionar, restringir — tiene consecuencias a largo plazo en la relación del niño con la comida.
HERMANOS Y DINÁMICA FAMILIAR: Adele Faber ("Siblings Without Rivalry"): los hermanos no necesitan ser tratados igual, necesitan ser tratados según sus necesidades individuales — comparar destruye el vínculo fraternal. Stephen Bank y Michael Kahn: el vínculo entre hermanos es el más largo de la vida — más que el de padres e hijos; los celos y las disputas son la materia prima con la que cada hermano descubre dónde termina él y empieza el otro, no patología familiar a eliminar.
TRAUMA INTERGENERACIONAL: Mark Wolynn ("It Didn't Start With You"): el trauma no resuelto de abuelos y bisabuelos se transmite epigenéticamente y en patrones de crianza inconscientes. Resmaa Menakem ("My Grandmother's Hands"): el trauma vive en el cuerpo y se transmite generacionalmente, especialmente en comunidades marginadas. Dan Siegel y Mary Hartzell ("Parenting from the Inside Out"): el padre/madre que entiende su propia historia de apego puede cambiar conscientemente el patrón que transmite.
CRIANZA CONSCIENTE Y BIENESTAR PARENTAL: Shefali Tsabary ("The Conscious Parent"): el hijo es el maestro del padre — los conflictos con los hijos revelan heridas no resueltas del propio padre/madre. Jon Kabat-Zinn ("Everyday Blessings"): el mindfulness parental no es perfección sino presencia — la calidad de la atención importa más que la cantidad de tiempo. Laura Markham ("Peaceful Parent, Happy Kids"): la regulación emocional del padre es condición previa — no puedes dar lo que no tienes. Becky Kennedy ("Good Inside"): todos los niños son buenos por dentro — el comportamiento problemático es una señal de necesidad no satisfecha, no de maldad.
CRIANZA EN CONTEXTO CULTURAL: Christine Gross-Loh ("Parenting Without Borders"): en Japón los niños de 6 años van solos al metro — la hiperprotección occidental es culturalmente específica, no universal; las prácticas que en una cultura parecen negligencia en otra son desarrollo sano de autonomía. Sara Harkness y Charles Super: las etnoteorías parentales — cada cultura tiene teorías implícitas sobre qué es un buen niño y cómo criarlo, y todas producen adultos funcionales; conocer la propia etnoteoría libera al padre/madre de juzgarse desde un único molde universal.
DUELO Y PÉRDIDA EN LA INFANCIA: Alan Wolfelt ("Healing Your Grieving Heart for Kids", "Companioning the Grieving Child"): el duelo infantil no avanza en línea recta sino en oleadas que vuelven con cada recordatorio; el niño no necesita que se le "solucione" la pérdida sino que se le acompañe sin apurar el proceso; nombrar simple ("echas de menos a la abuela, ¿cierto?") valida sin invadir; los rituales concretos — encender una vela, mirar fotos, hablar del que se fue — son anclas más efectivas que cualquier explicación; aplicación: acompañar la oleada cuando aparece, sin agenda de cierre.
AUTISMO Y NEURODIVERSIDAD RESPETUOSA: Barry Prizant ("Uniquely Human: A Different Way of Seeing Autism", modelo SCERTS): el autismo no es un déficit a corregir sino una forma distinta de procesar el mundo; las conductas etiquetadas como "problemáticas" son frecuentemente estrategias de regulación frente a un ambiente que no calza con el sistema sensorial del niño; el lenguaje de "respeto a la persona" reemplaza al de "intervención sobre el síntoma"; lo que parece colapso en un supermercado es acumulación sensorial previa, no episodio aislado; aplicación: anticipar, dar pausas y respetar el procesamiento del niño no es sobreproteger, es ajustar el ambiente.
ALTA SENSIBILIDAD (PAS): Elaine Aron ("The Highly Sensitive Child"): el 15-20% de los niños tiene un sistema nervioso más reactivo a estímulos, emociones y críticas — no es debilidad ni exageración sino un rasgo neurobiológico real; las observaciones menores se sienten amplificadas; la fortaleza paralela es la profundidad de procesamiento, la empatía y la creatividad; el ambiente que les pide "no ser tan sensibles" daña; el ambiente que valida y enseña a confiar en lo que sienten libera el potencial; aplicación: nombrar la sensibilidad como rasgo, no como problema, y enseñar a navegarla.`

// ──────────────────────────────────────────────────────────────────────
// MAPA_DIMENSIONES — qué autor atiende cada dimensión central del episodio.
//
// La dimensión la infiere `inferirDimensionCentral` (heurística determinística
// en cliente, basada en palabras-clave del contexto + emoción + edad). Después
// `seleccionarAutor` lee este mapa y elige autor respetando: (1) compatibilidad
// con la edad, (2) anti-repetición vs `ultimo_autor_ia` del hijo, (3) los 3
// autores específicos (Wolfelt, Prizant, Aron) solo si la dimensión los pide,
// (4) Haidt solo si la dimensión es 'pantallas' y la edad ≥ 10.
// ──────────────────────────────────────────────────────────────────────
export const MAPA_DIMENSIONES = {
  duelo:                    { primario: 'Alan Wolfelt',     lente: 'Duelo infantil' },
  neurodiversidad:          { primario: 'Barry Prizant',    lente: 'Neurodiversidad respetuosa' },
  alta_sensibilidad:        { primario: 'Elaine Aron',      lente: 'Alta sensibilidad' },
  desregulacion:            { primario: 'Daniel Siegel',    secundario: 'Bruce Perry',         lente: 'Desarrollo cerebral' },
  habilidad_rezagada:       { primario: 'Ross Greene',                                          lente: 'Habilidad rezagada' },
  autorregulacion_adulto:   { primario: 'Stuart Shanker',   secundario: 'Gabor Maté',          lente: 'Self-Reg' },
  validacion_emocional:     { primario: 'Faber & Mazlish',  secundario: 'John Gottman',        lente: 'Validación emocional' },
  ritmo_presencia:          { primario: 'Janet Lansbury',   secundario: 'Magda Gerber',        lente: 'Presencia respetuosa' },
  trauma:                   { primario: 'Bruce Perry',      secundario: 'Bessel van der Kolk', lente: 'Trauma somático' },
  conflicto_interno_adulto: { primario: 'Shefali Tsabary',  secundario: 'Gabor Maté',          lente: 'Crianza consciente' },
  sueno_rutinas:            { primario: 'Carlos González',                                      lente: 'Sueño con presencia' },
  apego_conexion:           { primario: 'John Bowlby',      secundario: 'Gordon Neufeld', terciario: 'Gabor Maté', lente: 'Apego' },
  juego_autonomia:          { primario: 'Janet Lansbury',   secundario: 'Magda Gerber',        lente: 'Juego libre' },
  disciplina_sin_castigo:   { primario: 'Laura Markham',    secundario: 'Jane Nelsen',         lente: 'Disciplina sin castigo' },
  comunicacion_adolescente: { primario: 'Lisa Damour',      secundario: 'Daniel Siegel', terciario: 'Laurence Steinberg', lente: 'Adolescencia' },
  pantallas:                { primario: 'Jonathan Haidt',   secundario: 'Jean Twenge',         lente: 'Pantallas y salud mental' },
}

// ──────────────────────────────────────────────────────────────────────
// AUTORES — pool de articulaciones por autor.
//
// Cada autor tiene una `lente` corta (1-3 palabras, para la firma "— Autor ·
// Lente" al pie de la Acción Rápida) y un pool de articulaciones: frases
// cortas en lenguaje chileno conversacional que parafrasean el enfoque del
// autor sin citar literal. `seleccionarArticulacion` rota dentro del pool
// para evitar repetición textual.
//
// Pool ≥5 para los 10 autores más frecuentes (según el brief) + los 3 nuevos.
// Pool ≥3 para el resto del MAPA. Si el modelo decide invocar un autor que
// no está aquí (no debería, porque autor llega pre-elegido en el prompt),
// `seleccionarArticulacion` devuelve null y la 3ra parte de la acción se
// construye solo con la lente.
// ──────────────────────────────────────────────────────────────────────
export const AUTORES = {
  'Daniel Siegel': {
    lente: 'Desarrollo cerebral',
    pool_articulaciones: [
      'el cerebro emocional ganó la pelea contra la parte racional — la corteza prefrontal aún está en construcción',
      'a esta edad, pegar (o gritar, o tirarse al piso) es lenguaje, no maldad',
      'conectar primero, redirigir después — no al revés',
      'el cerebro se integra a través del vínculo, no a través de la consecuencia',
      'narrar lo ocurrido en calma, después del episodio, construye la integración que el momento no permitió',
    ],
  },
  'Bruce Perry': {
    lente: 'Regulación primero',
    pool_articulaciones: [
      'regular el cuerpo primero, conversar después — el orden importa, no es opcional',
      'un cerebro en alarma no puede aprender; primero hay que bajarle el ritmo',
      'lo que parece desafío puede ser huella de estrés que no se descargó',
      'el ritmo, el movimiento y la presencia son intervención antes que cualquier palabra',
      'la pregunta correcta es "¿qué le pasó?", no "¿qué le pasa?"',
    ],
  },
  'Ross Greene': {
    lente: 'Habilidad rezagada',
    pool_articulaciones: [
      'los niños se portan bien cuando pueden — si no pueden, lo que falta es una habilidad, no voluntad',
      'esto no es flojera ni falta de motivación, es una habilidad que todavía no aparece',
      'el plan B —resolver con él, no por él— es lo que enseña, no la consecuencia',
      'antes de pedirle que siga, preguntarle qué se le hizo difícil',
      'la consecuencia durante la desregulación no enseña, solo asusta',
    ],
  },
  'Stuart Shanker': {
    lente: 'Self-Reg',
    pool_articulaciones: [
      'esto no es mal comportamiento, es estrés acumulado pidiendo salida',
      'la pregunta no es "por qué se porta mal", sino "qué le está sobrecargando"',
      'bajar el estrés en un dominio libera energía para los otros',
      'el descontrol no se inhibe con voluntad, se descarga ayudándolo a regularse',
      'cinco fuentes de estrés se suman: cuerpo, emoción, cognición, social, prosocial',
    ],
  },
  'Gabor Maté': {
    lente: 'Mirar el contexto',
    pool_articulaciones: [
      'el niño con más sensibilidad responde más fuerte al ambiente — no es maldad, es cableado',
      'la pregunta es "¿qué le ha pasado?", no "¿qué le pasa?"',
      'tu propia regulación es la primera intervención disponible',
      'el conflicto con el hijo activa heridas tuyas — verlas no es perderlo, es ganarlo',
      'los síntomas hablan de un contexto, no de un defecto del niño',
    ],
  },
  'Faber & Mazlish': {
    lente: 'Validación emocional',
    pool_articulaciones: [
      'validar antes de resolver — sin excepción',
      'nombrar lo que está sintiendo, antes de cualquier consejo o corrección',
      'describir lo que ves, en vez de juzgar lo que el niño es',
      'las etiquetas —tímido, difícil, torpe— se convierten en identidad; evitarlas es regalo',
      'darle palabras para la próxima vez no le da permiso, le da herramientas',
    ],
  },
  'Janet Lansbury': {
    lente: 'Presencia respetuosa',
    pool_articulaciones: [
      'el berrinche no se interrumpe, se acompaña',
      'tu presencia segura sin rescatar enseña que las emociones se manejan',
      'no resolver, no distraer, no negociar — estar',
      'el juego del niño es trabajo serio; no se interrumpe sin necesidad',
      'un "no" desde la calma vale más que cien gritos',
    ],
  },
  'Alan Wolfelt': {
    lente: 'Duelo infantil',
    pool_articulaciones: [
      'el duelo no avanza en línea, vuelve en oleadas con cada recordatorio',
      'no hace falta solucionar la pérdida, hace falta acompañarla',
      'nombrar simple ("echas de menos a la abuela, ¿cierto?") es más útil que una explicación elaborada',
      'los rituales concretos anclan el duelo mejor que las palabras grandes',
      'el cierre no es la meta — la convivencia con la ausencia, sí',
    ],
  },
  'Barry Prizant': {
    lente: 'Neurodiversidad respetuosa',
    pool_articulaciones: [
      'lo que parece colapso fue acumulación sensorial que venía de antes',
      'para ese sistema, el supermercado es ruido, luz y gente todo al mismo tiempo',
      'la conducta es estrategia de regulación, no problema a corregir',
      'anticipar y dar pausas no es sobreproteger, es ajustar el ambiente',
      'respetar cómo procesa el mundo es la intervención',
    ],
  },
  'Elaine Aron': {
    lente: 'Alta sensibilidad',
    pool_articulaciones: [
      'una observación pequeña puede sentirse como un golpe grande — no es exageración',
      'su sistema está cableado para reaccionar más; eso no es debilidad',
      'enseñarle a confiar en lo que siente es lo que necesita, no a minimizarlo',
      'la profundidad de procesamiento es fortaleza paralela a la reactividad',
      'nombrar la sensibilidad como rasgo, no como problema, abre el camino',
    ],
  },
  'John Gottman': {
    lente: 'Coaching emocional',
    pool_articulaciones: [
      'nombrar la emoción antes que cualquier otra intervención',
      'la filosofía implícita del adulto sobre las emociones define el clima del hogar',
      'coaching emocional construye salud mental; desestimar la erosiona',
    ],
  },
  'Magda Gerber': {
    lente: 'Observar antes',
    pool_articulaciones: [
      'observar antes de intervenir — siempre',
      'hablarle desde el primer día con respeto, como si comprendiera',
      'darle tiempo y espacio para que resuelva sus frustraciones menores',
    ],
  },
  'Bessel van der Kolk': {
    lente: 'El cuerpo recuerda',
    pool_articulaciones: [
      'el cuerpo guarda lo que el lenguaje no alcanza',
      'cuando ninguna intervención conductual funciona, pensar en trauma somático',
      'movimiento, ritmo y co-regulación son intervención antes que las palabras',
    ],
  },
  'Shefali Tsabary': {
    lente: 'Crianza consciente',
    pool_articulaciones: [
      'antes de corregir al hijo, preguntarse qué activa esto en uno mismo',
      'el hijo no es proyecto de mejora — es un ser separado con su propio camino',
      'el conflicto con el hijo es invitación al crecimiento del propio padre/madre',
    ],
  },
  'Carlos González': {
    lente: 'Sueño con presencia',
    pool_articulaciones: [
      'los despertares nocturnos son fisiología normal de la infancia, no patología',
      'retirar la presión es la primera intervención, no agregarla',
      'el niño que "no come" generalmente come lo que necesita — la batalla la crea el adulto',
    ],
  },
  'John Bowlby': {
    lente: 'Apego seguro',
    pool_articulaciones: [
      'toda conducta del bebé es comunicación, nunca manipulación',
      'la sensibilidad consistente del cuidador construye el apego seguro',
      'la base segura habilita la exploración, no la frena',
    ],
  },
  'Gordon Neufeld': {
    lente: 'Vínculo adulto',
    pool_articulaciones: [
      'el vínculo con adultos significativos es el andamiaje del desarrollo',
      'la orientación a pares antes que a adultos es lo que conviene prevenir',
      'fortalecer y proteger el vínculo, no aislar al niño de sus pares',
    ],
  },
  'Laura Markham': {
    lente: 'Padre regulado',
    pool_articulaciones: [
      'tu regulación es condición previa de cualquier intervención eficaz',
      'no puedes dar lo que no tienes — primero el oxígeno propio',
      'la conexión emocional diaria es la base que hace posible toda disciplina',
    ],
  },
  'Jane Nelsen': {
    lente: 'Firmeza amable',
    pool_articulaciones: [
      'firmeza y amabilidad simultáneas no son contradictorias, son la combinación que funciona',
      'preguntar qué está aprendiendo el niño, no qué está sufriendo',
      'las consecuencias naturales enseñan más que las artificiales',
    ],
  },
  'Lisa Damour': {
    lente: 'Adolescencia',
    pool_articulaciones: [
      'validar sin catastrofizar es la intervención central',
      'distinguir ansiedad funcional (útil) de ansiedad disfuncional (limita)',
      'la adolescencia tiene transiciones predecibles que no son patología',
    ],
  },
  'Laurence Steinberg': {
    lente: 'Cerebro adolescente',
    pool_articulaciones: [
      'cambiar el ambiente reduce el riesgo más que razonar con el adolescente',
      'la presencia de pares amplifica la toma de riesgos — es neurobiología, no rebeldía',
      'el período 12-25 es plasticidad cerebral enorme, en ambas direcciones',
    ],
  },
  'Jonathan Haidt': {
    lente: 'Pantallas y salud mental',
    pool_articulaciones: [
      'tratar el uso de pantallas como variable estructural del entorno, no como conducta a controlar',
      'la solución es colectiva — coordinación familiar y comunitaria, no batalla individual',
      'el smartphone antes de los 16 tiene evidencia documentada de daño a salud mental',
    ],
  },
  'Jean Twenge': {
    lente: 'Generación conectada',
    pool_articulaciones: [
      'el tiempo de socialización presencial sustituido por pantalla es el cambio estructural',
      'la generación más conectada es también la más solitaria que tenemos medida',
      'preguntarse qué reemplazó la pantalla en la vida del niño, no solo cuánto consume',
    ],
  },
}

// ──────────────────────────────────────────────────────────────────────
// HELPERS NUEVOS para "Acción Rápida" v1.2
//
// Todas funciones puras, determinísticas, sin llamadas a IA. Se ejecutan
// en cliente antes de armar el prompt de `generarAccionInmediata`, así el
// autor y la articulación llegan pre-elegidos al modelo (en vez de que el
// modelo invente — lo que producía el sesgo a Lansbury).
// ──────────────────────────────────────────────────────────────────────

// Mapea la diferencia entre `fechaEpisodio` y `ahora` a uno de los 4 buckets
// de tiempo del brief. Drive la voz del prompt: presente activo / reflexiva
// cercana / aprendizaje del día / aprendizaje para futuro.
export function bucketTiempo(fechaEpisodio, ahora = new Date()) {
  const ms = Math.max(0, new Date(ahora).getTime() - new Date(fechaEpisodio).getTime())
  const horas = ms / 3600000
  if (horas < 1)  return 'inmediato'
  if (horas < 6)  return 'reciente'
  if (horas < 24) return 'dia'
  return 'pasado'
}

// Conjuntos de palabras-clave por dimensión específica. Se evalúan en orden
// (la primera dimensión específica que matchea gana). Si nada matchea, se
// cae a heurística por emoción / tipo / edad / default.
// Duelo se evalúa en dos niveles para evitar falsos positivos. Antes la lista
// estaba unificada y términos laxos como 'se fue', 'perdida' o 'separaci'
// disparaban dimensión=duelo en episodios de miedo nocturno donde aparecían
// frases cotidianas tipo "mamá se fue de la pieza" — eso terminaba firmando
// la Acción Rápida con Alan Wolfelt y contaminando el texto con vocabulario
// de duelo (caso reportado 25 mayo 2026 con Pascualito).
//
// INEQUIVOCAS: términos que por sí solos garantizan duelo real.
// AMBIGUAS:    términos que aparecen en duelo pero también en contextos
//              cotidianos. Quedan declaradas para uso futuro (ej. requerir
//              confirmación cruzada con otra señal). Hoy NO detonan duelo
//              por sí solas — si solo matchea acá, la heurística cae al
//              siguiente paso (tipo, emoción, edad).
const KEYWORDS_DUELO_INEQUIVOCAS = [
  'muri', 'murio', 'falleci', 'fallecio', 'fallecimiento',
  'funeral', 'cementerio', 'velorio', 'velatorio',
  'duelo', 'lapida', 'tumba', 'entierro', 'sepultura',
  'cremacion', 'urna',
  'sin vida', 'ya no esta', 'ya no está', 'ya no vive',
]
const KEYWORDS_DUELO_AMBIGUAS = [
  'se fue', 'perdida', 'perdimos',
  'separaci', 'divorci',
  'extraña a', 'echa de menos',
  'me dejo', 'nos dejo',
  // Heredadas del banco viejo. Quedan acá para que la red de confirmación
  // cruzada futura las cubra. Enfermedad de un cuidador puede preceder duelo
  // pero no lo garantiza. "echar de menos" en infinitivo aparece tanto en
  // duelo real como en ausencias temporales (papá de viaje, primer día sin
  // mamá, etc.).
  'abuela enferm', 'abuelo enferm', 'echar de menos',
]
const KEYWORDS_NEURODIVERSIDAD = [
  'autis', 'tea ', 'tdah', 'asperger', 'neurodiver', 'sensorial', 'sensor',
  'colapso sensorial', 'meltdown', 'shutdown', 'estimulaci', 'sobreestimul',
  'procesamiento', 'perfil sensorial',
]
const KEYWORDS_ALTA_SENSIBILIDAD = [
  'altamente sensible', 'muy sensible', 'pas ', 'reactivo a est', 'abrumad',
  'desbord', 'crítica menor', 'critica menor', 'le afecta todo',
]
const KEYWORDS_PANTALLAS = [
  'pantalla', 'tablet', 'celular', 'smartphone', 'youtube', 'tiktok',
  'instagram', 'redes sociales', 'videojuego', 'fortnite', 'roblox',
]
const KEYWORDS_ESTADO_ADULTO = [
  'cansad', 'agotad', 'al límite', 'al limite', 'no puedo más', 'no puedo mas',
  'culpa', 'me siento mal', 'me frustr', 'me supera', 'no doy más', 'no doy mas',
]
const KEYWORDS_TRAUMA = [
  'pesadilla', 'asustad', 'evento', 'accidente', 'violencia', 'gritó alguien',
  'grito alguien', 'lo asustó', 'lo asusto', 'lo asustaron',
]

// Detecta si alguno de los términos aparece como substring en el texto.
// Acentos y mayúsculas se normalizan para no perder matches por tipeo.
function matchKeywords(texto, lista) {
  if (!texto) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return lista.some((k) => {
    const kNorm = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    return norm.includes(kNorm)
  })
}

// Infiere la dimensión central del episodio. Heurística determinística en
// cliente. Se evalúan las dimensiones específicas primero (las que más
// importa no perder cuando aparecen). Si nada calza, fallback a
// 'desregulacion' que es la dimensión más frecuente y cubre el caso default.
function inferirDimensionCentral({ episodio, hijo }) {
  const edad = parseInt(hijo?.edad, 10) || 4
  const textoCrudo = [
    episodio?.contexto || '',
    episodio?.descripcionLibre || '',
    episodio?.emocion || '',
    (episodio?.gatillantes || []).join(' '),
    episodio?.estadoPadre || '',
  ].join(' ')

  // 1. Dimensiones específicas — se chequean primero porque cuando aparecen,
  //    no queremos perderlas a manos de una dimensión más genérica.
  //    Duelo solo se detona con keywords INEQUIVOCAS (muri/funeral/cementerio/
  //    velorio/tumba/etc.). Las ambiguas ('se fue', 'perdida', 'separaci',
  //    'divorci') ya no detonan duelo por sí solas — caen a la siguiente
  //    heurística (tipo de episodio, emoción, edad). KEYWORDS_DUELO_AMBIGUAS
  //    queda declarada arriba para uso futuro con confirmación cruzada.
  if (matchKeywords(textoCrudo, KEYWORDS_DUELO_INEQUIVOCAS) && edad >= 3) return 'duelo'
  if (matchKeywords(textoCrudo, KEYWORDS_NEURODIVERSIDAD))               return 'neurodiversidad'
  if (matchKeywords(textoCrudo, KEYWORDS_ALTA_SENSIBILIDAD))             return 'alta_sensibilidad'
  if (matchKeywords(textoCrudo, KEYWORDS_PANTALLAS) && edad >= 10)       return 'pantallas'

  // 2. Estado del adulto crítico — el brief dice que en ese caso prioriza al
  //    adulto antes que al niño. Mapea a autorregulacion_adulto (Shanker/Maté).
  if (matchKeywords(textoCrudo, KEYWORDS_ESTADO_ADULTO))                 return 'autorregulacion_adulto'

  // 3. Trauma: solo si hay marcadores claros + alta intensidad.
  if (matchKeywords(textoCrudo, KEYWORDS_TRAUMA) && (episodio?.intensidad ?? 0) >= 4) return 'trauma'

  // 4. Por tipo de episodio.
  const tipo = (episodio?.tipo || '').toLowerCase()
  if (tipo === 'sueño' || tipo === 'sueno')                              return 'sueno_rutinas'
  if (tipo === 'miedo')                                                   return 'desregulacion'
  if (tipo === 'social' || tipo === 'desconexion')                       return 'apego_conexion'

  // 5. Por emoción declarada.
  const emocion = (episodio?.emocion || '').toLowerCase()
  if (/frustr|rabieta no resuelta/.test(emocion))                        return 'habilidad_rezagada'
  if (/triste|pena/.test(emocion))                                       return 'ritmo_presencia'
  if (/vergüenza|verguenza/.test(emocion))                               return 'validacion_emocional'

  // 6. Por edad — adolescentes default a comunicación.
  if (edad >= 12)                                                         return 'comunicacion_adolescente'

  // 7. Default: desregulación (la más frecuente).
  return 'desregulacion'
}

// Mapas de edad mínima para autores que tienen restricción etaria estricta.
// Si la edad del hijo es menor, se descarta al autor de la pool y se cae al
// siguiente del MAPA_DIMENSIONES (o al fallback Siegel).
const EDAD_MINIMA_AUTOR = {
  'Alan Wolfelt':       3,
  'Lisa Damour':        12,
  'Laurence Steinberg': 12,
  'Jonathan Haidt':     10,
  'Jean Twenge':        10,
}

// Elige autor para esta dimensión + edad, respetando anti-repetición vs el
// último autor que se usó para este hijo. Si tras filtrar queda lista vacía,
// fallback a 'Daniel Siegel' (presente en el banco, sin restricción etaria,
// dimensión 'desregulacion').
function seleccionarAutor({ dimension, edad, ultimoAutorUsado }) {
  const mapeo = MAPA_DIMENSIONES[dimension] || MAPA_DIMENSIONES.desregulacion
  const candidatosCrudos = [mapeo.primario, mapeo.secundario, mapeo.terciario].filter(Boolean)

  const edadNum = parseInt(edad, 10) || 4
  const compatibles = candidatosCrudos.filter((autor) => {
    const minimo = EDAD_MINIMA_AUTOR[autor]
    return minimo == null || edadNum >= minimo
  })

  if (compatibles.length === 0) return 'Daniel Siegel'

  // Anti-repetición: si hay más de un candidato compatible, descartamos al
  // último autor usado. Si solo hay uno y es justo el último, lo dejamos
  // pasar igual (no podemos forzar variedad cuando no hay alternativa).
  if (compatibles.length > 1 && ultimoAutorUsado) {
    const sinRepetir = compatibles.filter((a) => a !== ultimoAutorUsado)
    if (sinRepetir.length > 0) return sinRepetir[0]
  }

  return compatibles[0]
}

// Devuelve una articulación al azar del pool del autor. Si el autor no está
// en AUTORES (no debería pasar si autor viene de seleccionarAutor → MAPA),
// devolvemos null y la 3ra parte de la acción se construye solo con la lente.
function seleccionarArticulacion(autor) {
  const data = AUTORES[autor]
  if (!data || !Array.isArray(data.pool_articulaciones) || data.pool_articulaciones.length === 0) {
    return null
  }
  const idx = Math.floor(Math.random() * data.pool_articulaciones.length)
  return data.pool_articulaciones[idx]
}

// Devuelve solo el bloque INSTRUCCIÓN DE CALIBRACIÓN por edad, sin la prosa
// larga de autores que sí incluye marcoEdad(). Es lo que necesita el prompt
// de Acción Rápida: la calibración por etapa y nada más, porque el autor y
// la articulación ya llegan pre-elegidos en el prompt como variables.
function calibracionEdadCompacta(edad) {
  const n = parseInt(edad, 10)
  if (isNaN(n)) return calibracionEdadCompacta(4)

  if (n <= 2) return 'CALIBRACIÓN (0-2 años): co-regulación y vínculo, exclusivamente. Sin técnicas cognitivas, sin consecuencias, sin razonamiento verbal. La intervención es presencia física segura, tono calmado, contacto piel con piel y ritmo sostenido.'
  if (n <= 5) return 'CALIBRACIÓN (2-6 años): co-regulación primero, sin excepción. Conexión antes que corrección — el cerebro límbico domina y no procesa instrucciones sin conexión previa. Lenguaje concreto, sensorial, breve. El estado regulatorio del adulto es la variable más importante.'
  if (n <= 11) return 'CALIBRACIÓN (6-12 años): identificar la habilidad rezagada detrás de la conducta, no la motivación. Intervenciones eficaces en calma, no en el momento de máxima activación. Evaluar sueño como variable de primer orden. El contexto social — pares y adultos significativos — pesa segundo después de la regulación.'
  return 'CALIBRACIÓN (12-18 años): respetar la autonomía como necesidad legítima de desarrollo, no como concesión ni permisividad. Evitar el control coercitivo, la humillación y la comparación. Intervenir solo en calma, nunca en el momento más alto del conflicto. Mantener el vínculo por encima de ganar cualquier discusión.'
}

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
Jean Piaget ("The Psychology of the Child", teoría del desarrollo cognitivo): los niños de 6-12 años están en la etapa de operaciones concretas — pueden razonar lógicamente sobre objetos y eventos concretos pero no aún sobre abstracciones puras; el aprendizaje ocurre mediante interacción activa con el entorno — manipular, experimentar, construir; el niño construye su comprensión desde adentro, no la recibe pasivamente; las instrucciones abstractas sin anclaje concreto no producen comprensión real; aplicación: anclar toda instrucción y consecuencia en lo concreto, observable y tangible.
Lev Vygotsky ("Mind in Society", zona de desarrollo próximo): la zona de desarrollo próximo (ZDP) es el espacio entre lo que el niño puede hacer solo y lo que puede hacer con ayuda competente; el aprendizaje óptimo ocurre en la ZDP — ni demasiado fácil ni demasiado difícil; el andamiaje adulto debe retirarse gradualmente a medida que el niño adquiere competencia; el lenguaje y la interacción social son el motor del desarrollo cognitivo, no solo el resultado; aplicación: identificar la ZDP del niño para calibrar el nivel de exigencia y apoyo.
Stanley Turecki ("The Difficult Child"): el temperamento difícil — alta intensidad emocional, baja adaptabilidad, reactividad elevada, irregularidad biológica, umbral sensorial bajo — es una característica neurológica real, no resultado de mala crianza; los padres de niños con temperamento difícil necesitan estrategias específicas calibradas al temperamento, no las mismas recomendaciones generales; entender el temperamento del hijo reduce la culpa del padre/madre y aumenta dramáticamente la eficacia de las intervenciones; aplicación: mapear el temperamento del niño antes de diseñar cualquier estrategia.
Jerome Kagan (investigación sobre temperamento e inhibición conductual): la inhibición conductual — timidez, reactividad al estrés, cautela extrema — tiene base neurológica en la reactividad de la amígdala y es parcialmente hereditaria; el temperamento es estable pero no determinista — el ambiente puede modular significativamente su expresión; los niños con alta reactividad necesitan exposición gradual y apoyo consistente, no exposición abrupta ni sobreprotección; aplicación: diferenciar entre temperamento y patología evitando tanto la patologización como la sobreprotección.
Brené Brown ("Daring Greatly", "The Gifts of Imperfection"): la vergüenza — "soy malo, soy un fracaso" — es diferente de la culpa — "hice algo malo" — y produce resultados opuestos en el desarrollo; la vergüenza crónica destruye la autoestima, aumenta la conducta problemática y bloquea el aprendizaje; la cultura de la perfección y el perfeccionismo parental dañan el desarrollo; criar en la suficiencia — "eres suficiente tal como eres" — y modelar la vulnerabilidad como fortaleza son los antídotos reales; aplicación: diferenciar corrección de la conducta (culpa funcional) de ataque a la identidad (vergüenza disfuncional).
Temple Grandin ("Thinking in Pictures", "The Autistic Brain"): el pensamiento visual y los estilos de procesamiento atípicos son diferencias, no defectos; muchos niños que no encajan en los moldes educativos estándar tienen fortalezas cognitivas específicas que el sistema no sabe detectar ni valorar; el ambiente que maximiza las fortalezas produce mejores resultados que el que solo intenta corregir los déficits; la neurodiversidad requiere respuestas individualizadas, no tratamientos uniformes; aplicación: identificar cómo piensa y aprende este niño específico antes de diseñar intervenciones.
Bessel van der Kolk (trauma en 6-12): el trauma vive en el cuerpo y las intervenciones puramente cognitivas o conductuales no alcanzan cuando hay trauma somático activo; el movimiento físico, las artes expresivas, el teatro, los deportes de contacto y la música son vías de procesamiento del estrés traumático que la terapia verbal no puede reemplazar; los niños traumatizados frecuentemente no pueden acceder al lenguaje para describir su experiencia — el cuerpo habla primero; aplicación: cuando el niño no puede hablar de lo que le pasa, buscar vías expresivas no verbales.
Stephen Porges (seguridad neurofisiológica en el entorno 6-12): el sistema nervioso del niño evalúa constantemente la seguridad del entorno mediante señales no verbales del adulto — tono de voz, postura, expresión facial — antes de cualquier contenido verbal; la neurorecepción precede a la percepción consciente; un hogar y un aula neurofisiológicamente seguros son condición de posibilidad del aprendizaje, la conducta prosocial y el acceso a las funciones ejecutivas; aplicación: diseñar la seguridad del ambiente antes de intervenir sobre la conducta.
Mark Wolynn (patrones intergeneracionales en 6-12): los síntomas y conductas que no tienen explicación en la historia del niño frecuentemente tienen raíz en traumas no resueltos de generaciones anteriores transmitidos en patrones relacionales; identificar estos patrones en la familia de origen del padre/madre puede cambiar la respuesta al niño más que cualquier técnica; aplicación: cuando los patrones del niño no responden a ninguna intervención, explorar la historia familiar de los cuidadores.
Carlos González (alimentación en 6-12): las batallas de alimentación en esta etapa tienen la misma etiología que en etapas anteriores — la presión, el condicionamiento y la negociación del adulto crean y mantienen el problema; retirar la presión y confiar en la autorregulación del hambre resuelve la mayoría de los casos; el niño que "solo come pasta" frecuentemente está respondiendo a la presión y la ansiedad del adulto, no expresando una preferencia biológica fija; aplicación: la intervención es retirar la presión, no aumentarla.
Adele Faber ("Siblings Without Rivalry"): los hermanos no necesitan ser tratados igual — necesitan ser tratados según sus necesidades individuales; el trato igualitario forzado genera comparación y resentimiento; comparar hermanos destruye la relación entre ellos; cada hijo necesita sentir que es amado de forma única e irrepetible; aplicación: nombrar explícitamente la individualidad de cada hijo en lugar de enfatizar el trato igual.
INSTRUCCIÓN DE CALIBRACIÓN (6-12): Identificar la habilidad rezagada detrás de cada conducta — no el problema de motivación o de carácter. Las intervenciones cognitivas y conductuales son eficaces en calma, no en el momento de máxima activación. Reforzar positivamente con especificidad conductual. Usar resolución colaborativa de problemas. Evaluar sueño como variable de primer orden antes de cualquier otra intervención. El contexto social — relación con pares y con adultos significativos — es el segundo factor más importante después de la regulación del sistema nervioso.
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
Erik Erikson ("Identity: Youth and Crisis", etapas del desarrollo psicosocial): la tarea central de la adolescencia es la resolución de la crisis identidad vs confusión de roles — el adolescente necesita explorar, experimentar y eventualmente comprometerse con una identidad cohesiva; la moratoria psicosocial — tiempo y espacio para experimentar sin consecuencias definitivas — es necesaria para la resolución sana; los adultos que no toleran la exploración identitaria (incluyendo valores, sexualidad, creencias) bloquean el desarrollo normal; aplicación: tolerar la exploración de identidad como proceso necesario, no como amenaza a controlar.
Resmaa Menakem ("My Grandmother's Hands: Racialized Trauma and the Pathway to Mending Our Hearts and Bodies"): el trauma racial y cultural se transmite somáticamente de generación en generación — vive en el sistema nervioso y en el cuerpo antes de llegar al lenguaje; la regulación del sistema nervioso es el primer paso para interrumpir la transmisión intergeneracional del trauma; los adolescentes de comunidades con trauma histórico acumulado necesitan intervenciones que incluyan la dimensión somática, cultural y comunitaria, no solo psicológica individual; aplicación: considerar el contexto cultural e histórico como parte del cuadro clínico.
Bessel van der Kolk (trauma en adolescentes): los adolescentes con trauma somático activo no responden a consecuencias, razonamientos ni intervenciones cognitivas aisladas; el cuerpo, el movimiento, las artes expresivas, el teatro, los deportes y la regulación del sistema nervioso autónomo son parte central del trabajo terapéutico; el trauma complejo en adolescentes frecuentemente se presenta como conducta oposicionista, impulsividad extrema o disociación que es mal interpretada como rebeldía o patología de carácter; aplicación: cuando ninguna intervención conductual funciona, pensar en trauma somático no resuelto.
Stephen Porges (teoría polivagal en adolescentes): el sistema nervioso del adolescente sigue evaluando la seguridad del entorno mediante señales no verbales antes que verbales; la calma corporal del adulto, su tono de voz y su postura abierta regulan al adolescente y abren la posibilidad de conversación antes que cualquier argumento racional; la confrontación con tono elevado activa el sistema de defensa y hace imposible el acceso a la corteza prefrontal; aplicación: regular el propio cuerpo antes de iniciar cualquier conversación difícil con el adolescente.
Shefali Tsabary ("The Conscious Parent", "The Awakened Family"): el padre/madre que ha trabajado y procesado su propia adolescencia — sus heridas de identidad, sus vergüenzas no resueltas, sus duelos de individuación — puede acompañar la individuación del hijo sin confundirla con una amenaza personal; el conflicto con el adolescente frecuentemente es un espejo de los conflictos no resueltos del padre/madre en su propia adolescencia; el trabajo interior del adulto es el trabajo de crianza más importante en esta etapa; aplicación: antes de intervenir en el conflicto con el adolescente, preguntarse qué activa este comportamiento en la propia historia del adulto.
Jon Kabat-Zinn ("Everyday Blessings"): la presencia mindful del adulto — sin agenda de cambio, sin juicio, con curiosidad genuina por el mundo interior del adolescente — es la condición de posibilidad de cualquier conversación difícil y de cualquier influencia real; la práctica de no reaccionar automáticamente ante la conducta adolescente es una habilidad que el padre/madre puede cultivar deliberadamente; aplicación: la calidad de la escucha es más importante que el contenido de lo que el adulto dice.
Christine Gross-Loh ("Parenting Without Borders"): las prácticas de crianza varían enormemente entre culturas — lo que en una cultura occidental parece abandono o negligencia, en otra es desarrollo sano de autonomía; la hipervigilancia occidental del riesgo es una anomalía histórica y cultural, no un estándar universal de buen cuidado; los adolescentes de culturas con mayor autonomía física, responsabilidades domésticas reales y menos supervisión adulta muestran mayor competencia y menor ansiedad; aplicación: cuestionar qué prácticas de "protección" son en realidad obstáculos al desarrollo de la autonomía.
INSTRUCCIÓN DE CALIBRACIÓN (12-18): Respetar la autonomía como necesidad legítima de desarrollo, no como concesión ni como permisividad. Evitar el control coercitivo, la humillación y la comparación — erosionan el vínculo sin producir cambio. Buscar siempre el problema subyacente antes de intervenir sobre la conducta visible. Intervenir únicamente en calma, nunca en el momento más alto del conflicto. Mantener el vínculo por encima de ganar cualquier discusión. Tratar el uso de pantallas como variable estructural del entorno que requiere respuesta colectiva. El estado regulatorio del propio adulto es la variable más importante — nombrarlo siempre.
${TEMAS_CONTEMPORANEOS}`
}

// ──────────────────────────────────────────────────────────────────────
// generarAccionInmediata — corazón del rediseño "Acción Rápida" v1.2.
//
// Diferencias clave con la versión anterior:
//   • El AUTOR llega pre-elegido en código (seleccionarAutor) y se pasa
//     como variable al prompt. Antes el modelo lo improvisaba desde la
//     prosa de marcoEdad() y sesgaba 100% a Lansbury.
//   • La voz del output se adapta al BUCKET de tiempo entre la creación
//     del episodio y `ahora`. Sin esto, todo decía "Ahora mismo…" aunque
//     el episodio fuera de hace 3 días.
//   • Output JSON estructurado para persistir metadata (autor, dimensión,
//     bucket) en la BD. El caller pone la firma "— Autor · Lente" aparte
//     en la UI, no la pide el prompt.
//   • Anti-repetición: el caller pasa `ultimoAutorUsado` (de hijos.ultimo_autor_ia).
//
// Inputs:
//   • hijo:               { id, nombre, edad, genero }
//   • episodio:           { tipo, intensidad, emocion, contexto, gatillantes,
//                           descripcionLibre, estadoPadre, fecha }
//   • ultimoAutorUsado:   string | null (autor de la última Acción Rápida
//                          del MISMO hijo; null si es la primera)
//   • ahora:              Date (default: new Date()) — driver del bucket
//
// Output: Promise<{
//   texto:        string,  // 40-70 palabras, 3 partes integradas, sin firma
//   autor:        string,  // el que eligió seleccionarAutor (no el modelo)
//   dimension:    string,  // la que eligió inferirDimensionCentral
//   bucket:       string,  // 'inmediato' | 'reciente' | 'dia' | 'pasado'
//   generada_en:  string   // ISO timestamp
// }>
// ──────────────────────────────────────────────────────────────────────
export async function generarAccionInmediata({ hijo, episodio, ultimoAutorUsado = null, ahora = new Date() }) {
  // 1. Pre-cálculo determinístico en cliente — autor y articulación llegan
  //    al prompt como variables ya elegidas.
  const fechaEpisodio = episodio?.fecha || episodio?.created_at || ahora
  const bucket        = bucketTiempo(fechaEpisodio, ahora)
  const dimension     = inferirDimensionCentral({ episodio, hijo })
  const autor         = seleccionarAutor({ dimension, edad: hijo?.edad, ultimoAutorUsado })
  const articulacion  = seleccionarArticulacion(autor) // puede ser null
  const lente         = AUTORES[autor]?.lente || MAPA_DIMENSIONES[dimension]?.lente || ''
  const calibracion   = calibracionEdadCompacta(hijo?.edad)

  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  // 2. Voz del prompt según el bucket. Cada bucket tiene una apertura modelo
  //    distinta para que la primera frase no se repita entre versiones del
  //    mismo episodio reabierto en distintos momentos.
  const VOZ_POR_BUCKET = {
    inmediato: 'Acaba de pasar — voz en presente activo. Apertura tipo "Esto está caliente todavía." o "Esto está pasando ahora y eso es agotador." La acción es física, concreta, ejecutable en los próximos 2 minutos. Verbos en imperativo presente: acércate, baja, respira, ofrece.',
    reciente:  'Pasó hace algunas horas — voz reflexiva cercana. Apertura tipo "Lo que probablemente necesitaba era…" o "Ya pasó, pero quedó dando vueltas." La acción es un gesto de reparación o de nombrar lo vivido. Verbos: pudiste, podrías, conviene.',
    dia:       'Pasó hoy más temprano — voz de aprendizaje del día. Apertura tipo "Mirando lo que pasó hoy…" o "Hoy, con calma, se ve más claro que…" La acción es interpretación + un gesto suave para hoy mismo. Sin urgencia.',
    pasado:    'Pasó hace más de un día — voz de aprendizaje para futuro. Apertura tipo "La próxima vez que algo así pase…" o "Esto ya quedó atrás, lo que sirve mirar hoy es…" La acción es preparación / aprendizaje, no intervención sobre algo en curso.',
  }
  const vozBucket = VOZ_POR_BUCKET[bucket] || VOZ_POR_BUCKET.inmediato

  // 3. Datos del episodio compactados (solo lo que existe).
  const datosEpisodio = [
    `Tipo: ${episodio?.tipo || 's/d'}`,
    `Intensidad: ${episodio?.intensidad ?? 's/d'}/5`,
    episodio?.emocion          ? `Emoción del ${genero}: ${episodio.emocion}`                      : null,
    episodio?.contexto         ? `Contexto: ${episodio.contexto}`                                  : null,
    episodio?.gatillantes?.length ? `Gatillantes: ${episodio.gatillantes.join(', ')}`              : null,
    episodio?.descripcionLibre ? `Relato del padre/madre: ${episodio.descripcionLibre}`            : null,
    episodio?.estadoPadre      ? `Estado del padre/madre: ${episodio.estadoPadre}`                 : null,
  ].filter(Boolean).join('\n- ')

  // 4. Prompt nuevo. Todo pre-elegido (autor, lente, articulación, bucket).
  //    El modelo solo escribe el texto que integra las 3 partes — NO inventa
  //    autor, NO firma con autor, NO agrega "— Autor · Lente" al final.
  const prompt = `${calibracion}

HIJO/A
Nombre: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años. Género: ${genero}.
Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona.

EPISODIO
- ${datosEpisodio}

TIEMPO TRANSCURRIDO
Bucket: ${bucket}. ${vozBucket}

LENTE TEÓRICA YA ELEGIDA POR EL SISTEMA (no la cambies, no la inventes, no nombres al autor, no nombres la dimensión clínica)
- Enfoque: ${lente}
${articulacion ? `- Ángulo a integrar en la frase final: "${articulacion}"` : ''}

TAREA
Escribe la Acción Rápida en español neutro/chileno con tuteo. Estructura de 3 partes integradas en prosa fluida (no listas, no saltos de línea):
1. Anclaje emocional — 1 frase corta calibrada al bucket de tiempo (ver Voz arriba).
2. Acción o reflexión concreta — 2 a 3 frases. Para bucket inmediato: gesto físico/verbal específico ejecutable ahora. Para reciente: gesto de reparación. Para día: nombrar lo vivido + gesto suave para hoy. Para pasado: aprendizaje para la próxima vez.
3. Anclaje teórico — 1 frase que integre el "Ángulo a integrar" cuando exista, o que articule el enfoque de la lente. Sin nombrar al autor, sin firma. El cliente pone la firma "— Autor · Lente" aparte.

REGLAS DURAS
- Largo total entre 40 y 70 palabras. Cuenta antes de devolver.
- Cero markdown: nada de #, *, _, listas con guion ni numeración.
- Cero "Ahora mismo:" literal como apertura.
- Cero diagnóstico clínico del hijo/a ni del adulto.
- Cero invención de contexto que no está en EPISODIO.
- NUNCA nombres en el cuerpo la dimensión, el autor, la lente, ni jerga clínica. Palabras como "duelo", "muerte", "pérdida", "autorregulación", "corregulación", "desregulación", "apego", "vínculo seguro", "ventana de tolerancia", "trauma", "neurodivergencia", "alta sensibilidad", "habilidad rezagada" son metadata del sistema y NO van en el texto. La firma "— Autor · Lente" se imprime aparte fuera de tu output. Escribe en lenguaje cotidiano de papá/mamá, no de manual clínico.
- ${REGLA_IDIOMA}
- Si el bucket es "pasado", está PROHIBIDO usar verbos en presente activo ("acércate ahora", "respira").

FORMATO DE RESPUESTA
Devuelve SOLO un JSON válido con esta forma exacta:
{"texto":"..."}
Sin texto antes ni después. Sin cercas de código markdown. El texto va completo en una sola string (sin saltos de línea internos).`

  // 5. Llamada IA y parsing defensivo. Si el modelo devuelve algo no-JSON,
  //    o JSON sin `texto`, caemos a un texto fallback construido en cliente
  //    con la lente + articulación que ya elegimos. Eso evita que la card
  //    quede vacía y mantiene la persistencia en BD útil.
  const generada_en = new Date(ahora).toISOString()

  try {
    // max_tokens 600: 40-70 palabras útiles ≈ 100 tokens, + envoltura JSON
    // y escapes ≈ 30 tokens, + margen para que el modelo no se quede sin
    // espacio antes de cerrar la oración (raíz del bug del episodio
    // "Oposición / no coopera" que terminó en "...voz suave:" truncado).
    const raw   = await llamarAPI(prompt, 600)
    const texto = extraerTextoAccion(raw)

    if (!texto) {
      return {
        texto: construirFallback({ bucket, lente, articulacion }),
        autor,
        dimension,
        bucket,
        generada_en,
      }
    }

    return { texto, autor, dimension, bucket, generada_en }
  } catch (err) {
    console.error('[generarAccionInmediata] fallo, usando fallback:', err)
    return {
      texto: construirFallback({ bucket, lente, articulacion }),
      autor,
      dimension,
      bucket,
      generada_en,
    }
  }
}

// extraerTextoAccion — parser robusto específico para el output de
// generarAccionInmediata. No se usa con `extraerJSON` (compartido por otros
// flujos) porque queremos defensas extra para este caso particular sin
// introducir regresiones en estrategias/tareas.
//
// Bug 2 (sábado 23 mayo): el modelo devolvió un JSON con comillas tipográficas
// (" ") y JSON.parse falló. El parser anterior cayó al `raw.trim()` y guardó
// la string literal `{"texto":"Esto ya quedó atrás..."}` con llaves en la BD.
//
// Esta función:
//   1. Strip de BOM y cercas markdown.
//   2. Intenta JSON.parse sobre el shape limpio.
//   3. Si falla, normaliza comillas tipográficas estructurales y reintenta.
//   4. Si vuelve a fallar, extrae el valor de "texto" con regex defensiva.
//   5. Defensa última: descarta cualquier resultado que aún contenga
//      `{"texto"` como substring (significa que algo en el camino metió
//      el JSON crudo dentro del texto extraído — el caller debe usar
//      construirFallback en su lugar).
//
// Retorna: string limpia con el texto, o null si nada se pudo recuperar.
function extraerTextoAccion(raw) {
  // pareceTruncado — defensa contra respuestas que se cortaron a mitad.
  // Si el último caracter del texto NO es un cierre natural (punto,
  // exclamación, interrogación, puntos suspensivos, comilla de cierre,
  // paréntesis/corchete cerrado), asumimos truncamiento y descartamos.
  // Esto fixea el caso del episodio "Oposición / no coopera" que persistió
  // con "...voz suave:" como cierre — el modelo se quedó sin tokens.
  const pareceTruncado = (texto) => {
    if (!texto) return true
    const cierre = texto.trim().slice(-1)
    return !/[.!?…"”»')\]]/.test(cierre)
  }

  if (typeof raw !== 'string') return null
  let s = raw

  // 1. BOM al inicio (algunos backends lo agregan).
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1)

  // 2. Cercas markdown al inicio/final, con o sin "json" después de los backticks.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  if (!s) return null

  // 3. Si no parece objeto JSON, podría ser texto plano que el modelo devolvió
  //    sin envolver. Lo aceptamos solo si NO contiene el patrón `{"texto"` —
  //    eso siempre es señal de JSON mal terminado, no de texto válido — y
  //    si no parece truncado a la mitad.
  if (!s.startsWith('{') || !s.endsWith('}')) {
    if (s.includes('{"texto"') || s.includes('{ "texto"')) return null
    if (pareceTruncado(s)) return null
    return s.length > 0 ? s : null
  }

  // 4. Saltos de línea dentro de strings rompen JSON.parse. Los reemplazamos
  //    por espacio antes de cada intento.
  const sLimpia = s.replace(/[\r\n]+/g, ' ')

  // 5. Intento 1: parse directo.
  const intentoParse = (input) => {
    try {
      const obj = JSON.parse(input)
      if (obj && typeof obj.texto === 'string' && obj.texto.trim().length > 0) {
        return obj.texto.trim()
      }
    } catch {
      // sigue al siguiente intento
    }
    return null
  }
  const r1 = intentoParse(sLimpia)
  if (r1 && !r1.includes('{"texto"') && !pareceTruncado(r1)) return r1

  // 6. Intento 2: normalizar comillas tipográficas estructurales y reintentar.
  //    Esta es la causa más frecuente del bug 2 — el modelo a veces escribe
  //    "texto" con curly quotes que rompen el parser.
  const sNorm = sLimpia
    .replace(/[“”]/g, '"')   // " " → "
    .replace(/[‘’]/g, "'")   // ' ' → '
  const r2 = intentoParse(sNorm)
  if (r2 && !r2.includes('{"texto"') && !pareceTruncado(r2)) return r2

  // 7. Intento 3: regex defensiva. Captura el valor de "texto" aunque el
  //    resto del JSON esté roto.
  const m = sLimpia.match(/"texto"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m && m[1]) {
    const candidato = m[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\\\\/g, '\\')
      .trim()
    if (candidato.length > 0 && !candidato.includes('{"texto"') && !pareceTruncado(candidato)) {
      return candidato
    }
  }

  // 8. Nada funcionó — el caller debe usar construirFallback.
  return null
}

// Texto de fallback cuando la llamada a IA falla o no devuelve JSON parseable.
// Combina la lente y articulación que ya elegimos en cliente, calibrado al
// bucket. No es tan personalizado como la respuesta del modelo, pero mantiene
// el formato de 3 partes y la firma queda coherente con autor/dimension/bucket.
function construirFallback({ bucket, lente, articulacion }) {
  const aperturas = {
    inmediato: 'Esto está pasando ahora y eso pesa.',
    reciente:  'Ya pasó, pero quedó dando vueltas.',
    dia:       'Mirando lo que pasó hoy con calma.',
    pasado:    'Esto ya quedó atrás, lo que sirve mirar hoy es esto.',
  }
  const apertura = aperturas[bucket] || aperturas.inmediato
  const cierre = articulacion || (lente ? `Lo importante acá es ${lente.toLowerCase()}.` : 'Acompañar es la intervención.')
  return `${apertura} Por ahora, quédate cerca, regula tu propio cuerpo primero y desde ahí responde. ${cierre.charAt(0).toUpperCase()}${cierre.slice(1)}.`
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

Responde con este formato exacto, calibrando cada sección al marco científico de la edad indicada.

FORMATO OBLIGATORIO: PROHIBIDO usar #, ##, ###, **, *, -, _ ni ningún símbolo de markdown en la respuesta. Escribe cada título de sección en su propia línea con mayúscula inicial, sin negritas ni símbolos. Separa párrafos con una línea en blanco. Para listas usa 1., 2., 3. sin viñetas ni guiones.

FORMATO DE TÍTULOS: cuando uses un título de sección como "Qué está pasando", "Qué hacer ahora", "Qué evitar", "Lo que está mejorando", "Lo que merece atención", "Posibles causas" o "Próximos pasos sugeridos", escríbelo EXACTAMENTE así, en una línea aparte, sin agregar dos puntos al final, sin agregar palabras antes ni después, sin variarlo. El sistema detecta esos strings exactos para aplicar formato visual.

Qué está pasando
(1-2 oraciones explicando el mecanismo neurológico o de desarrollo específico para esta edad)

Qué hacer ahora
1. [paso concreto, apropiado para la edad]
2. [paso concreto, apropiado para la edad]
3. [paso concreto, apropiado para la edad]

Qué evitar
1. [cosa a evitar y por qué en 1 línea, específica para la edad]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico. Cuida la gramática y la sintaxis con precisión. Evita frases ambiguas o mal construidas. Usa oraciones cortas y claras. Nunca dejes frases incompletas. Revisa que cada adjetivo y adverbio esté correctamente ubicado respecto al sustantivo que modifica.`

  return llamarAPI(prompt, 1400)
}

// teaser=true (plan free): genera SOLO la sección "Lo que está mejorando" con
// un tope de tokens reducido. El resto del análisis (atención, causas, pasos)
// es contenido Pro y NO debe generarse ni viajar al cliente free — el gate es
// real, no un ocultamiento por CSS.
export async function interpretarPatrones({ hijo, episodios, teaser = false }) {
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

  if (teaser) {
    const promptTeaser = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.

Historial de episodios (más recientes primero):
${resumen}

Analiza estos patrones desde el marco científico de la edad indicada y responde ÚNICAMENTE con la sección "Lo que está mejorando". No incluyas ninguna otra sección.

FORMATO OBLIGATORIO: PROHIBIDO usar #, ##, ###, **, *, -, _ ni ningún símbolo de markdown en la respuesta. Escribe el título de la sección en su propia línea con mayúscula inicial, sin negritas ni símbolos. Separa párrafos con una línea en blanco.

FORMATO DE TÍTULO: escribe el título EXACTAMENTE así, en una línea aparte, sin dos puntos al final y sin variarlo, porque el sistema detecta ese string exacto para aplicar formato visual:

Lo que está mejorando
[2 a 3 oraciones con una observación positiva basada en los datos, interpretada a la luz del desarrollo esperado para la edad]

No agregues secciones de atención, causas ni próximos pasos. No agregues disclaimer. Cuida la gramática y la sintaxis con precisión. Usa oraciones cortas y claras. Nunca dejes frases incompletas.`

    return llamarAPI(promptTeaser, 400)
  }

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.

Historial de episodios (más recientes primero):
${resumen}

Analiza estos patrones desde el marco científico de la edad indicada y responde con estas secciones en orden.

FORMATO OBLIGATORIO: PROHIBIDO usar #, ##, ###, **, *, -, _ ni ningún símbolo de markdown en la respuesta. Escribe cada título de sección en su propia línea con mayúscula inicial, sin negritas ni símbolos. Separa párrafos con una línea en blanco. Si enumeras pasos, usa 1., 2., 3. sin viñetas ni guiones.

FORMATO DE TÍTULOS: cuando uses un título de sección como "Qué está pasando", "Qué hacer ahora", "Qué evitar", "Lo que está mejorando", "Lo que merece atención", "Posibles causas" o "Próximos pasos sugeridos", escríbelo EXACTAMENTE así, en una línea aparte, sin agregar dos puntos al final, sin agregar palabras antes ni después, sin variarlo. El sistema detecta esos strings exactos para aplicar formato visual.

Lo que está mejorando
[observación positiva basada en los datos, interpretada a la luz del desarrollo esperado para la edad]

Lo que merece atención
[patrón preocupante si existe, o "Sin patrones de alerta por ahora"; si hay patrón, explica brevemente por qué importa para esta etapa]

Posibles causas
[hipótesis basadas en los datos y en el marco de desarrollo para esta edad]

Próximos pasos sugeridos
[1-2 acciones concretas, calibradas a la edad, para los próximos días; usa 1., 2. si son más de una]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico. Cuida la gramática y la sintaxis con precisión. Evita frases ambiguas o mal construidas. Usa oraciones cortas y claras. Nunca dejes frases incompletas. Revisa que cada adjetivo y adverbio esté correctamente ubicado respecto al sustantivo que modifica.`

  return llamarAPI(prompt, 2500)
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

  const contexto = `Datos: ${semanaEp.length} episodios${avgIntensidad ? `, intensidad ${avgIntensidad}/5` : ''}${topGatillante ? `, gatillante frecuente: "${topGatillante}"` : ''}${hitosCount > 0 ? `, ${hitosCount} avances positivos` : ''}${estrategiaActiva ? `, estrategia activa: "${estrategiaActiva.habilidad}"` : ''}.${semanaEp.length > 0 ? ` Detalle: ${resumenEp}` : ''}`

  const prompt = `${marco}

${contexto}

Escribe exactamente 2 oraciones sobre ${hijo?.nombre || 'este niño'} (${genero}, ${hijo?.edad || '?'} años).

Oración 1: El patrón más claro de esta semana y qué hacer. Máximo 20 palabras.
Oración 2: Una frase entre *asteriscos* basada en el marco científico anterior que explique por qué. Máximo 15 palabras.

Solo esas 2 oraciones. Sin títulos. Sin explicaciones extra.`

  return llamarAPI(prompt, 200)
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

Responde SOLO con JSON puro, sin bloques de código markdown, sin \`\`\`json, sin \`\`\` al inicio o al final, sin texto adicional antes o después. La estrategia debe estar calibrada estrictamente a la edad y al marco científico anterior. Estructura exacta:
{"porQueImporta":"2-3 frases sobre por qué esta habilidad importa en esta etapa del desarrollo para un niño de esta edad específica, sin markdown","semanas":[{"numero":1,"titulo":"Observar y preparar","accion":"Acción concreta para esta semana, máximo 2 frases, en segunda persona al padre/madre, apropiada para la edad","indicador":"Cómo saber si está funcionando, 1 frase","tareas":["tarea 1 en segunda persona, max 90 caracteres, apropiada para la edad","tarea 2","tarea 3"]},{"numero":2,"titulo":"Introducir","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":3,"titulo":"Practicar","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":4,"titulo":"Consolidar","accion":"...","indicador":"...","tareas":["...","...","..."]}]}`

  const raw = await llamarAPI(prompt, 4000)
  return extraerJSON(raw)
}

export async function generarReflexionCheckin({ hijo, episodio, checkin }) {
  const genero = (() => {
    if (hijo?.genero === 'f')  return 'niña'
    if (hijo?.genero === 'm')  return 'niño'
    if (hijo?.genero === 'nb') return 'niñe'
    return 'niño/a'
  })()

  const evolucionTexto = { mejoro: 'mejoró', igual: 'se mantuvo igual', empero: 'empeoró' }

  const prompt = `El padre/madre tuvo un episodio con su ${genero} (${hijo?.nombre || 'su hijo/a'}, ${hijo?.edad || '?'} años): ${episodio?.tipo || 'dificultad'} de intensidad ${episodio?.intensidad || '?'}/5.

Qué intentó hacer: ${checkin.queIntentaste || 'no especificado'}
Cómo respondió el ${genero}: ${checkin.respuestaHijo || 'no especificado'}
Evolución: ${evolucionTexto[checkin.evolucion] || checkin.evolucion || 'no especificada'}
Cómo está el padre/madre ahora: ${checkin.estadoPadre || 'no especificado'}

Escribe exactamente 2-3 oraciones que cierren este ciclo. Reconoce lo que intentó el padre/madre, conecta la acción con el resultado que observó, y valida su esfuerzo. Sin consejos nuevos. Sin diagnósticos. Habla en segunda persona al padre/madre. Tono cálido y concreto. No uses listas ni títulos.`

  return llamarAPI(prompt, 250)
}

export async function analizarReflexionesCuidador(reflexiones) {
  const lista = reflexiones
    .map((r, i) => `${i + 1}. (${r.tipoEpisodio}, ${r.fecha}): "${r.texto}"`)
    .join('\n')

  const prompt = `Eres un acompañante empático para padres y madres que cuidan a hijos con desafíos de desarrollo o conductuales.

El padre o la madre ha compartido estas reflexiones personales al cerrar episodios difíciles:
${lista}

Escribe un párrafo corto (máximo 100 palabras) que:
- Reconozca el esfuerzo sostenido de este cuidador
- Conecte lo que expresó en sus propias palabras con el proceso que está viviendo
- Valide su capacidad de reflexionar como una fortaleza real del vínculo con su hijo/a
- NO repita textualmente ninguna de las frases
- NO ofrezca consejos ni diagnósticos
- Hable en segunda persona al padre/madre usando TÚ (tú, tienes, haces — nunca vos, tenés, hacés)
- Tono cálido, directo y concreto
- PROHIBIDO markdown en la respuesta: nada de #, ##, **, *, _ ni símbolos de formato
- FORMATO DE TÍTULOS: si usas algún título de sección como "Qué está pasando", "Qué hacer ahora", "Qué evitar", "Lo que está mejorando", "Lo que merece atención", "Posibles causas" o "Próximos pasos sugeridos", escríbelo EXACTAMENTE así, en línea aparte, sin dos puntos al final, sin variación`

  return llamarAPI(prompt, 250)
}

function extraerJSON(raw) {
  if (typeof raw !== 'string') return raw
  // Eliminar bloques markdown al inicio y al final
  let texto = raw.replace(/^[\s\S]*?```(?:json)?\s*/i, '').replace(/\s*```[\s\S]*$/i, '').trim()
  // Si no había bloques, usar el raw original limpio
  if (texto === '') texto = raw.trim()
  // Extraer solo el objeto JSON: desde el primer { hasta el último }
  const start = texto.indexOf('{')
  const end   = texto.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return raw
  // Reemplazar newlines literales por espacio antes de parsear.
  // El modelo los genera dentro de strings multi-frase (JSON inválido).
  const jsonStr = texto.slice(start, end + 1).replace(/[\r\n]+/g, ' ')
  try {
    return JSON.parse(jsonStr)
  } catch {
    return raw
  }
}

// ════════════════════════════════════════════════════════════════════
// generarEstrategiaDesdeContexto — alimenta el flujo "Cuéntame tu caso"
// Parámetros: { texto_libre, hijo, edad_hijo }
// Devuelve el mismo shape que generarEstrategia + habilidad_id/label_inferido
// ════════════════════════════════════════════════════════════════════

const CATALOGO_PROMPT = `CATÁLOGO DE HABILIDADES (usa el id exacto si el caso calza):
emocional:
- calmarse_explosion "Calmarse cuando explota" [enojo, berrinches]
- aceptar_no "Aceptar el \\"no\\" sin crisis" [berrinches, frustracion]
- manejar_cambios "Manejar los cambios de rutina" [frustracion, rutinas]
- relacionarse_ninos "Relacionarse mejor con otros niños" [sociales]
- manejar_miedo "Manejar el miedo y la angustia" [miedos]
- concentrarse_calmarse "Concentrarse y calmarse" [atencion, frustracion]
desarrollo:
- mejorar_atencion "Mejorar la atención y concentración" [atencion, colegio]
- autonomia_independencia "Desarrollar autonomía e independencia" [autonomia]
- rutinas_funcionen "Establecer rutinas que funcionen" [rutinas]
- motivacion_autoestima "Motivación y autoestima" [autoestima]
- dificultades_colegio "Dificultades en el colegio" [colegio, atencion]`

export async function generarEstrategiaDesdeContexto({ texto_libre, hijo, edad_hijo }) {
  const edad = edad_hijo ?? hijo?.edad
  const marco = marcoEdad(edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const prompt = `${marco}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona en toda tu respuesta.

El padre/madre describe esta situación en sus propias palabras:
"${texto_libre}"

${CATALOGO_PROMPT}

Analiza la situación y genera un plan de 4 semanas calibrado a la edad. Reglas:
1. Si el caso calza claramente con una habilidad del catálogo, pon su id exacto en habilidad_id y su label oficial en label_usado.
2. Si no calza claramente, pon null en habilidad_id y en label_inferido escribe una frase CÁLIDA y EMOCIONAL que resuma el caso (ej: "Acompañar la frustración al apagar pantallas", nunca un slug técnico).
3. El plan debe estar calibrado al marco científico de la edad.

Responde SOLO con JSON puro, sin bloques markdown, sin \`\`\`json, sin texto adicional:
{"habilidad_id":"<id exacto del catálogo o null>","label_usado":"<label oficial si hay habilidad_id, sino null>","label_inferido":"<frase cálida si habilidad_id es null, sino null>","porQueImporta":"2-3 frases sobre por qué trabajar esto importa en esta etapa, sin markdown","semanas":[{"numero":1,"titulo":"Observar y preparar","accion":"Acción concreta para esta semana, máximo 2 frases, en segunda persona al padre/madre, apropiada para la edad","indicador":"Cómo saber si está funcionando, 1 frase","tareas":["tarea 1, max 90 caracteres, segunda persona","tarea 2","tarea 3"]},{"numero":2,"titulo":"Introducir","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":3,"titulo":"Practicar","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":4,"titulo":"Consolidar","accion":"...","indicador":"...","tareas":["...","...","..."]}]}`

  const raw = await llamarAPI(prompt, 4000)
  return extraerJSON(raw)
}

// ════════════════════════════════════════════════════════════════════
// analizarPatron — Fase B "Algo que aún no cambia"
// Clasifica una conducta que dura semanas o meses y devuelve orientación en
// tres textos. NO genera plan (eso reusa el flujo de caso libre después, si
// el padre/madre acepta). La EDAD del hijo es el dato central de la
// clasificación.
// Recibe: { descripcion, desde_cuando, frecuencia, interferencia, ya_intentado, hijo }
// Devuelve: { clasificacion, que_esta_pasando, que_ayuda, que_lo_empeora }
//
// REGLA DURA DE CLASIFICACIÓN (post-proceso en código, no en el prompt):
//   - desde_cuando === 'regresion'  →  'derivar' SIEMPRE.
//   - la IA puede escalar a 'derivar'; nunca puede bajar de 'derivar'.
// Se aplica aquí sobre la respuesta para que ningún caller pueda saltársela.
// ════════════════════════════════════════════════════════════════════
export async function analizarPatron({ descripcion, desde_cuando, frecuencia, interferencia, ya_intentado, hijo }) {
  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const desdeTexto  = { siempre: 'Siempre ha sido así, nunca lo dejó', reciente: 'Empezó hace poco', regresion: 'Ya lo había dejado y volvió' }
  const frecTexto   = { diario: 'Todos los días', semanal: 'Varias veces por semana', ocasional: 'De vez en cuando' }
  const interfTexto = { alta: 'Les complica la rutina', baja: 'Molesta pero conviven' }

  // Capa 2: si es regresión, el post-proceso de abajo ya fija la clasificación
  // en 'derivar'. Se lo avisamos a la IA ANTES de redactar para que los tres
  // textos no prometan un acompañamiento que esa pantalla no ofrece.
  const avisoRegresion = desde_cuando === 'regresion'
    ? `\nCLASIFICACIÓN YA DETERMINADA: este caso es una REGRESIÓN (ya lo había dejado y volvió), así que la clasificación final ya está fijada en "derivar". Devuelve "derivar" en el campo clasificacion y redacta los tres textos en ese marco: es algo que conviene que vea un profesional, sin restarle importancia y sin alarmar. No sugieras que la app ni un plan lo resuelvan.\n`
    : ''

  const prompt = `${marco}

${REGLA_IDIOMA}

Nombre: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años. Género: ${genero}. Usa siempre "${genero}", "${pronombre}" y "${articulo}" al referirte a esta persona.

El padre/madre registra una conducta que dura semanas o meses (NO un episodio puntual):
Qué pasa: "${descripcion}"
Desde cuándo: ${desdeTexto[desde_cuando] || desde_cuando}
Qué tan seguido: ${frecTexto[frecuencia] || frecuencia}
Cuánto les complica: ${interfTexto[interferencia] || interferencia}
Qué ya intentó: ${ya_intentado ? `"${ya_intentado}"` : 'no lo dice'}

La EDAD es el dato central de la clasificación: una misma conducta puede ser esperable a una edad y motivo de consulta a otra. Clasifica en una de estas tres:
- "esperable": es propia de la etapa de desarrollo a esta edad; no requiere intervención especial, solo acompañamiento.
- "instalado": es un hábito que se sostiene y se puede trabajar con un plan; no es señal de alerta médica.
- "derivar": por la edad y el cuadro, conviene que lo vea un profesional (pediatra u otro). Huella no diagnostica.
${avisoRegresion}
Escribe SIEMPRE los tres textos, en las tres clasificaciones, incluida "derivar": decir qué ayuda y qué no ayuda protege al ${genero} mientras la familia consulta.

Reglas de tono INNEGOCIABLES: nunca diagnostiques, nunca etiquetes al ${genero} (prohibido "es ansioso", "es mañoso", "es problemático" y cualquier rótulo), nunca uses lenguaje de defecto ni culpes al padre/madre. Habla del comportamiento y del contexto, no de una condición del ${genero}. Sereno, cálido y concreto.

REGLA DURA SOBRE LOS TRES TEXTOS: que_esta_pasando, que_ayuda y que_lo_empeora describen SOLO qué está pasando, qué ayuda en el día a día y qué lo empeora. NUNCA mencionan planes, programas, semanas, pasos a seguir ni ofertas de acompañamiento estructurado — ofrecer un plan es trabajo de la interfaz, no del texto. PROHIBIDAS dentro de los tres textos estas palabras y giros: "plan", "programa", "semana 1", "cuatro semanas", "te puedo armar", "sigue estos pasos". Los consejos concretos de "qué ayuda" SÍ se mantienen: lo prohibido es ofrecer un producto de la app, no dar orientación para el día a día.

MARCO APLICADO — REGLA DURA. El campo marco_aplicado nombra al autor cuyo enfoque guió esta orientación. Formato exacto: nombre completo del autor, espacio, guion largo (—), espacio, concepto clave en minúsculas. Puedes listar dos autores separados por " + ".
Ejemplos válidos:
"Daniel Siegel — ventana de tolerancia"
"Bruce Perry — regular, relacionar, razonar"
"Ross Greene — habilidades no adquiridas"
"Carlos González — autorregulación del hambre"
El autor DEBE salir de la lista cerrada de abajo. PROHIBIDO inventar autores. PROHIBIDO citar a alguien fuera de esta lista. PROHIBIDO inventar títulos de libros. Si ningún autor de la lista calza bien con este patrón, elige el más cercano por dimensión; nunca improvises uno nuevo.
LISTA CERRADA DE AUTORES VÁLIDOS: Daniel Siegel, Bruce Perry, Ross Greene, Stuart Shanker, Gabor Maté, Adele Faber, Elaine Mazlish, Janet Lansbury, Magda Gerber, John Gottman, Bessel van der Kolk, Carlos González, John Bowlby, Gordon Neufeld, Laura Markham, Jane Nelsen, Lisa Damour, Laurence Steinberg, Alan Wolfelt, Barry Prizant, Elaine Aron, Stephen Porges, Tina Payne Bryson, Mona Delahooke, Dan Hughes, Lawrence Cohen, Peter Levine, Alfie Kohn, Jean Piaget, Lev Vygotsky, Ellyn Satter, Adele Diamond, Russell Barkley, Edward Hallowell, Tamar Chansky, Lynn Lyons, Diana Baumrind, Becky Kennedy, Haim Ginott, Stanley Greenspan, T. Berry Brazelton, Harvey Karp, Ed Tronick, Allan Schore, Jerome Kagan, Stanley Turecki, Brené Brown, Temple Grandin, Kenneth Ginsburg, Erik Erikson, Jon Kabat-Zinn, Shefali Tsabary.
EXCEPCIÓN ACOTADA: Jonathan Haidt y Jean Twenge SOLO pueden aparecer si este patrón trata de pantallas o redes sociales en un niño o niña mayor de 10 años. En cualquier otro caso están PROHIBIDOS.

Responde SOLO con JSON puro, sin bloques markdown, sin \`\`\`json, sin texto antes o después. Estructura exacta:
{
  "clasificacion": "esperable" | "instalado" | "derivar",
  "que_esta_pasando": "2-3 oraciones que expliquen la conducta a esta edad, sin diagnosticar y sin mencionar planes ni pasos a seguir",
  "que_ayuda": "2-3 oraciones de orientación concreta para el día a día (nunca un plan ni un producto de la app)",
  "que_lo_empeora": "2-3 oraciones concretas de qué conviene evitar o restar",
  "marco_aplicado": "Autor — concepto clave que guió esta orientación"
}`

  const raw = await llamarAPI(prompt, 1500)
  const parsed = extraerJSON(raw)

  // Post-proceso duro de la clasificación. Si la IA devuelve algo fuera del
  // set válido, lo tratamos como fallo (el caller muestra reintentar sobre la
  // fila ya guardada; no escribimos basura que además rebotaría en el CHECK).
  const VALIDAS = ['esperable', 'instalado', 'derivar']
  if (!parsed || typeof parsed !== 'object' || !VALIDAS.includes(parsed.clasificacion)) {
    throw new Error('El análisis no se generó correctamente. Intenta de nuevo.')
  }
  const clasificacion = (desde_cuando === 'regresion' || parsed.clasificacion === 'derivar')
    ? 'derivar'
    : parsed.clasificacion

  // El marco es un extra, no un requisito: si el modelo lo omite o lo devuelve
  // mal tipado, la orientación sigue siendo válida. Cae a cadena vacía y la UI
  // simplemente no pinta esa línea (mismo camino que las filas viejas, que se
  // guardaron antes de que este campo existiera).
  const marco_aplicado = typeof parsed.marco_aplicado === 'string'
    ? parsed.marco_aplicado.trim()
    : ''

  return { ...parsed, clasificacion, marco_aplicado }
}

/**
 * Fase 3 del rediseño Estrategias con Ciclos.
 * Genera el análisis estructurado al cerrar un ciclo de una estrategia.
 * El resultado se guarda en estrategia_ciclos.cierre_analisis (jsonb).
 *
 * @param {Object} args
 * @param {Object} args.hijo - { nombre, edad, genero }
 * @param {Object} args.ciclo - { numero_ciclo, plan, fecha_inicio, fecha_cierre, duracion_semanas }
 * @param {Array}  args.notas_bitacora - [{ contenido, created_at, ... }]
 * @param {Array}  args.episodios_vinculados - [{ fecha, tipo, intensidad, gatillantes, ... }]
 * @returns {Promise<{que_cambio: string, que_quedo_pendiente: string, recomendaciones: string[]}>}
 *          recomendaciones es SIEMPRE un array de strings (posiblemente vacío);
 *          la UI (P3 Cierre) decide cómo listarlo.
 */
export async function analizarCierreCiclo({ hijo, ciclo, notas_bitacora = [], episodios_vinculados = [] }) {
  const marco = marcoEdad(hijo?.edad)
  const { genero, pronombre, articulo } = (() => {
    if (hijo?.genero === 'f')  return { genero: 'niña',  pronombre: 'ella',  articulo: 'la' }
    if (hijo?.genero === 'm')  return { genero: 'niño',  pronombre: 'él',    articulo: 'lo' }
    if (hijo?.genero === 'nb') return { genero: 'niñe',  pronombre: 'elle',  articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }
  })()

  const diasReales = ciclo.fecha_cierre && ciclo.fecha_inicio
    ? Math.round((new Date(ciclo.fecha_cierre) - new Date(ciclo.fecha_inicio)) / (1000 * 60 * 60 * 24))
    : null

  const notasTexto = notas_bitacora.length > 0
    ? notas_bitacora.map(n => `[${n.created_at}] ${n.contenido}`).join('\n')
    : 'Sin notas registradas en la bitácora.'

  const episodiosTexto = episodios_vinculados.length > 0
    ? episodios_vinculados.map(e => `[${e.fecha || e.created_at}] Tipo: ${e.tipo || 's/d'}, Intensidad: ${e.intensidad || 's/d'}, Gatillantes: ${(e.gatillantes || []).join(', ') || 's/d'}`).join('\n')
    : 'Sin episodios registrados durante el ciclo.'

  const prompt = `${marco}

DATOS DEL HIJO/A
Nombre: ${hijo?.nombre || 'el niño/a'}
Edad: ${hijo?.edad || 's/d'} años
Género: ${genero}

CICLO QUE SE ESTÁ CERRANDO
Ciclo N°: ${ciclo.numero_ciclo}
Duración planificada: ${ciclo.duracion_semanas || 4} semanas
Duración real: ${diasReales !== null ? `${diasReales} días` : 's/d'} (de ${ciclo.fecha_inicio || 's/d'} a ${ciclo.fecha_cierre || 's/d'})

Plan que se trabajó:
${JSON.stringify(ciclo.plan || {}, null, 2)}

NOTAS DE BITÁCORA (${notas_bitacora.length} entradas)
${notasTexto}

EPISODIOS REGISTRADOS DURANTE EL CICLO (${episodios_vinculados.length})
${episodiosTexto}

TAREA
Genera un análisis del cierre de este ciclo con TRES secciones:
1. que_cambio: qué evolución observable hubo durante este ciclo (en el hijo/a, en ${pronombre} ${articulo}, en la dinámica familiar). Concreto, observacional, sin diagnóstico.
2. que_quedo_pendiente: qué del plan no se logró, qué patrones siguen presentes, qué obstáculos aparecieron. Honesto pero sin culpabilizar.
3. recomendaciones: 3 a 4 sugerencias prácticas y específicas para el próximo paso (un nuevo ciclo o un cierre definitivo de esta habilidad). Cada recomendación es una frase corta y accionable de 1 a 2 oraciones, NO un párrafo. Concreta, no abstracta. Dirigida al papá o mamá en segunda persona con tuteo chileno ("fíjate", "intenta", "prueba", "ten en cuenta"). Sin numeración dentro del texto del ítem (nada de "1.", "2.") — la UI decide cómo listarlas.

REGLAS DURAS
- ${REGLA_IDIOMA}
- Habla AL padre o madre en segunda persona singular.
- Sin diagnósticos clínicos del hijo/a ni del adulto.
- Sin frases cliché ("recuerda que cada niño es único", "estás haciendo un gran trabajo", "lo importante es el proceso").
- Sin markdown: prohibido #, ##, ###, **, *, -, _.
- que_cambio y que_quedo_pendiente: entre 2 y 4 oraciones cada una. Concretas, observacionales.
- recomendaciones: 3 a 4 ítems, cada uno una frase corta y accionable (1 a 2 oraciones), sin numeración dentro del texto del ítem.

FORMATO DE RESPUESTA
Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "que_cambio": "...",
  "que_quedo_pendiente": "...",
  "recomendaciones": ["primera recomendación accionable...", "segunda recomendación accionable...", "tercera recomendación accionable..."]
}
recomendaciones DEBE ser un array de strings (3 a 4 elementos), nunca un string único.
Sin texto antes ni después del JSON. Sin cercas de markdown. Sin comentarios.`

  try {
    const raw = await llamarAPI(prompt, 2000)
    const parsed = extraerJSON(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { que_cambio: '', que_quedo_pendiente: '', recomendaciones: [] }
    }
    return {
      que_cambio: typeof parsed.que_cambio === 'string' ? parsed.que_cambio : '',
      que_quedo_pendiente: typeof parsed.que_quedo_pendiente === 'string' ? parsed.que_quedo_pendiente : '',
      recomendaciones: Array.isArray(parsed.recomendaciones)
        ? parsed.recomendaciones.filter((item) => typeof item === 'string' && item.trim().length > 0)
        : []
    }
  } catch (err) {
    console.error('analizarCierreCiclo failed:', err)
    return { que_cambio: '', que_quedo_pendiente: '', recomendaciones: [] }
  }
}

/**
 * Fase 3 del rediseño Estrategias con Ciclos.
 * Genera el plan de un ciclo 2+ de una estrategia.
 * Si usar_memoria_ia es false o no hay ciclo_anterior: reutiliza generarEstrategia (4 semanas fijas, sin contexto histórico).
 * Si usar_memoria_ia es true y hay ciclo_anterior: genera plan adaptado al contexto del ciclo previo, con duración variable (2-6 semanas).
 *
 * @param {Object} args
 * @param {Object} args.hijo - { nombre, edad, genero }
 * @param {string} args.habilidad - habilidad que se está trabajando
 * @param {string} [args.descripcion] - contexto adicional
 * @param {boolean} args.usar_memoria_ia - si la IA debe considerar el ciclo anterior
 * @param {Object} [args.ciclo_anterior] - { plan, cierre_analisis } del ciclo previo
 * @param {number} args.numero_ciclo - número del ciclo que se está generando (2, 3, 4...)
 * @returns {Promise<{porQueImporta: string, duracion_semanas: number, semanas: Array} | null>}
 */
export async function generarCicloN({ hijo, habilidad, descripcion, usar_memoria_ia, ciclo_anterior, numero_ciclo }) {
  if (!Number.isInteger(numero_ciclo) || numero_ciclo < 2) {
    return null
  }

  if (!usar_memoria_ia || !ciclo_anterior) {
    const resultado = await generarEstrategia({ hijo, habilidad, descripcion })
    if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.semanas)) {
      return null
    }
    return { ...resultado, duracion_semanas: 4 }
  }

  const marco = marcoEdad(hijo?.edad)
  const { genero } = (() => {
    const g = hijo?.genero
    if (g === 'f') return { genero: 'niña', pronombre: 'ella', articulo: 'la' }
    if (g === 'm') return { genero: 'niño', pronombre: 'él', articulo: 'el' }
    if (g === 'nb') return { genero: 'niñe', pronombre: 'elle', articulo: 'le' }
    return { genero: 'niño/a', pronombre: 'el niño/a', articulo: 'al niño/a' }
  })()

  const planAnterior = JSON.stringify(ciclo_anterior?.plan || {}, null, 2)
  const cierreAnalisis = ciclo_anterior?.cierre_analisis || {}

  const prompt = `${marco}

DATOS DEL HIJO/A
Nombre: ${hijo?.nombre || 'el niño/a'}
Edad: ${hijo?.edad || 's/d'} años
Género: ${genero}

HABILIDAD QUE SE ESTÁ TRABAJANDO
${habilidad}
${descripcion ? 'Contexto adicional: ' + descripcion : ''}

NÚMERO DE CICLO
Este es el Ciclo ${numero_ciclo} de esta estrategia.

CICLO ANTERIOR (Ciclo ${numero_ciclo - 1})
Plan que se trabajó:
${planAnterior}

Análisis al cierre del ciclo anterior:
- Qué cambió: ${cierreAnalisis.que_cambio || 's/d'}
- Qué quedó pendiente: ${cierreAnalisis.que_quedo_pendiente || 's/d'}
- Recomendaciones del cierre: ${cierreAnalisis.recomendaciones || 's/d'}

TAREA
Diseña el plan del Ciclo ${numero_ciclo} CONSIDERANDO lo aprendido en el ciclo anterior:
- Construye sobre lo que cambió. No repitas lo que ya está consolidado.
- Aborda lo que quedó pendiente con un enfoque distinto si el anterior no resultó.
- Incorpora las recomendaciones del cierre.
- Decide la duración del ciclo entre 2 y 6 semanas según la complejidad de lo que queda por trabajar. Más simple = menos semanas. Más complejo o que requiere consolidación = más semanas.

REGLAS DURAS
- ${REGLA_IDIOMA}
- Habla AL padre o madre en segunda persona singular.
- Sin diagnósticos clínicos.
- Sin markdown: prohibido #, ##, ###, **, *, -, _.
- Cada tarea en máximo 90 caracteres, empezando con verbo de acción.
- Exactamente 3 tareas por semana.

FORMATO DE RESPUESTA
Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "porQueImporta": "2-3 frases sobre por qué importa seguir trabajando esta habilidad en este nuevo ciclo, dado lo aprendido.",
  "duracion_semanas": 4,
  "semanas": [
    {"numero": 1, "titulo": "...", "accion": "...", "indicador": "...", "tareas": ["...", "...", "..."]},
    {"numero": 2, "titulo": "...", "accion": "...", "indicador": "...", "tareas": ["...", "...", "..."]}
  ]
}

El array semanas es la fuente de verdad: duracion_semanas debe ser igual a semanas.length. Si decides que el ciclo dura 4 semanas, genera exactamente 4 objetos en el array. Sin texto fuera del JSON. Sin cercas de markdown.`

  try {
    const raw = await llamarAPI(prompt, 4000)
    const parsed = extraerJSON(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.semanas)) {
      return null
    }
    if (parsed.semanas.length < 2 || parsed.semanas.length > 6) {
      return null
    }
    return {
      porQueImporta: typeof parsed.porQueImporta === 'string' ? parsed.porQueImporta : '',
      duracion_semanas: parsed.semanas.length,
      semanas: parsed.semanas
    }
  } catch (err) {
    console.error('generarCicloN failed:', err)
    return null
  }
}

// ════════════════════════════════════════════════════════════════════
// detectarPatronesEstructurado — alimenta PuertaUnoHallazgo
// Devuelve { patrones: [{ tipo, descripcion, bajada, episodios_ids, confianza }] }
// ════════════════════════════════════════════════════════════════════

const PROMPT_DETECTAR_PATRONES = `Eres un asistente clínico para una app de crianza basada en evidencia.
Tu tarea: identificar UN solo patrón en los episodios registrados que sugiera trabajar una habilidad concreta.

Habilidades disponibles (usar EXACTAMENTE uno de estos ids como "tipo"):
- calmarse_explosion, aceptar_no, manejar_cambios, relacionarse_ninos, manejar_miedo, concentrarse_calmarse
- mejorar_atencion, autonomia_independencia, rutinas_funcionen, motivacion_autoestima, dificultades_colegio

Reglas:
1. Sólo devolver un patrón si hay ≥3 episodios coherentes que lo respalden en los últimos 30 días.
2. "descripcion" debe nombrar el patrón en una frase observacional, sin diagnóstico.
3. "bajada" sugiere brevemente por qué trabajar esa habilidad ayudaría (1-2 frases, lenguaje cálido y no clínico).
4. "episodios_ids" lista 1-5 ids de episodios concretos que evidencian el patrón.
5. "confianza" entre 0 y 1 según fuerza de la evidencia (≥3 episodios y < 21 días = ~0.7; ≥5 episodios concentrados = ~0.85).
6. Si no hay patrón claro: devolver { "patrones": [] }.
7. ${REGLA_IDIOMA}

Output: JSON válido y sólo JSON, sin texto adicional, con este shape exacto:
{
  "patrones": [
    {
      "tipo": "<id habilidad>",
      "descripcion": "<frase observacional>",
      "bajada": "<por qué trabajar esto ayudaría>",
      "episodios_ids": ["<uuid>", "..."],
      "confianza": 0.0
    }
  ]
}`

export async function detectarPatronesEstructurado({ hijo_id, hijo_edad, episodios }) {
  const compactados = episodios.slice(0, 30).map((e) => ({
    id: e.id,
    fecha: e.fecha,
    tipo: e.tipo || '',
    intensidad: e.intensidad,
    gatillantes: e.gatillantes || [],
  }))

  const prompt = `${PROMPT_DETECTAR_PATRONES}

Datos a analizar:
${JSON.stringify({ contexto: { hijo_id, hijo_edad, total_episodios: episodios.length }, episodios: compactados }, null, 2)}`

  const raw = await llamarAPI(prompt, 1024)

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return { patrones: [] }
  try {
    const parsed = JSON.parse(match[0])
    if (!parsed || !Array.isArray(parsed.patrones)) return { patrones: [] }
    return parsed
  } catch {
    return { patrones: [] }
  }
}

// ════════════════════════════════════════════════════════════════════
// Motor de rasgos — "el retrato que madura" (pieza 1: detección pura).
// Clona la mecánica de detectarPatronesEstructurado pero adaptada a
// rasgos en 4 familias. Función pura: NO escribe en BD ni toca el flujo
// de registro (eso son las piezas 2 y 3). Devuelve { rasgos: [...] }.
// ════════════════════════════════════════════════════════════════════

const PROMPT_DETECTAR_RASGOS = `Eres Huella, una compañera de crianza cálida basada en evidencia del desarrollo infantil. NO eres clínica y NO diagnosticas. Tu rol es PROPONER, con humildad, rasgos que podrían describir a este niño a partir de lo que su padre o madre registró. El padre/madre es el verdadero experto en su hijo: tú ofreces una mirada extra, nunca una sentencia.

La materia prima son los momentos que el padre o madre registró sobre su hijo. Cada momento trae un campo "origen":
- "episodio": un momento difícil (rabieta, llanto, miedo, oposición u otro momento complicado).
- "hito": un avance positivo (se calmó solo, mostró empatía, pidió disculpas, toleró un "no" u otro logro).
Usa AMBOS tipos de momentos para construir el retrato. Las familias positivas o neutras (mueve, fortalezas, calma) se nutren sobre todo de los avances; la familia "cuesta" se nutre sobre todo de los episodios difíciles, pero cualquier momento puede aportar a cualquier familia si la respalda.

Tu tarea: detectar rasgos del niño y clasificarlos en EXACTAMENTE estas 4 familias (usa el id tal cual en el campo "familia"):
- mueve: lo que lo enciende, le interesa o disfruta.
- fortalezas: capacidades y recursos propios del niño.
- cuesta: lo que le resulta difícil, SIEMPRE enmarcado con cariño, jamás como falla ni diagnóstico.
- calma: qué lo regula, cómo se tranquiliza.

Reglas duras:
1. Propon cualquier patron real y coherente que observes en el nino, aunque por ahora solo lo respalden 1 o 2 momentos (sean episodios, hitos o una mezcla). No exijas una cantidad minima de momentos para incluirlo. Lo unico que NO debes proponer es ruido: coincidencias sueltas, suposiciones sin respaldo en los momentos entregados, o rasgos genericos que le calzarian a cualquier nino. Si el patron es real, incluyelo aunque su evidencia sea todavia pequena.
2. "titulo": una frase corta, observacional y cálida, sin diagnóstico ni etiquetas (ejemplo: "Busca consolar cuando alguien está triste"). Habla del niño con respeto; nunca lo reduzcas a un problema.
3. "evidencia": lista con los ids de los momentos que respaldan el rasgo (al menos 1 id real tomado de los datos entregados, sea de episodios o de hitos; incluye TODOS los ids que de verdad lo respalden).
4. "confianza": numero entre 0 y 1 segun la fuerza de la evidencia (1 momento ~0.4; 2 momentos coherentes ~0.55; 3 momentos ~0.7; 5 o mas concentrados ~0.85).
5. Nunca etiquetes al niño, nunca uses jerga clínica, nunca insinúes un diagnóstico ni una condición.
6. Si no hay ningún rasgo claro, devuelve { "rasgos": [] }.
7. ${REGLA_IDIOMA}

Output: JSON válido y SOLO JSON, sin texto adicional, sin markdown, con este shape exacto:
{
  "rasgos": [
    {
      "familia": "mueve|fortalezas|cuesta|calma",
      "titulo": "<frase corta observacional>",
      "evidencia": ["<id>", "<id>", "<id>"],
      "confianza": 0.0
    }
  ]
}`

// Decisión de diseño (confirmada con Daniel): un mismo momento (episodio o
// hito) PUEDE respaldar varios rasgos — relación muchos-a-muchos, se permite
// solape de evidencia entre rasgos. Lo resuelve guardarRasgosDetectados.
export async function detectarRasgos({ hijo, episodios, hitos }) {
  const FAMILIAS_VALIDAS = ['mueve', 'fortalezas', 'cuesta', 'calma']

  // Los episodios llegan en shape de app (camelCase, vía dbEpisodioToApp):
  // descripcionLibre, accionRapida?.dimension. Los hitos llegan crudos de la
  // BD (snake_case: categoria, descripcion). Se vuelcan a "momentos" marcados
  // con "origen" ('episodio'|'hito') para que la IA distinga un momento difícil
  // de un avance positivo. El relato se trunca a 300 chars para no inflar el
  // prompt ni el costo. Se toman hasta 20 de cada tipo (los más recientes).
  const episodiosCompactados = (episodios || []).slice(0, 20).map((e) => ({
    origen: 'episodio',
    id: e.id,
    fecha: e.fecha,
    tipo: e.tipo || '',
    intensidad: e.intensidad,
    gatillantes: e.gatillantes || [],
    emocion: e.emocion || null,
    contexto: e.contexto || null,
    descripcion_libre: e.descripcionLibre ? e.descripcionLibre.slice(0, 300) : null,
    dimension: e.accionRapida?.dimension || null,
  }))

  const hitosCompactados = (hitos || []).slice(0, 20).map((h) => ({
    origen: 'hito',
    id: h.id,
    fecha: h.fecha,
    categoria: h.categoria || null,
    descripcion: h.descripcion ? h.descripcion.slice(0, 300) : null,
  }))

  // Mapa id -> origen para resolver la evidencia que devuelve la IA (lista de
  // ids) a objetos { tipo, id }, sin depender de que la IA adivine el origen.
  const tipoPorId = new Map()
  for (const e of episodiosCompactados) tipoPorId.set(e.id, 'episodio')
  for (const h of hitosCompactados) tipoPorId.set(h.id, 'hito')

  const momentos = [...episodiosCompactados, ...hitosCompactados]

  const prompt = `${PROMPT_DETECTAR_RASGOS}

Datos a analizar:
${JSON.stringify({
  contexto: {
    hijo_nombre: hijo?.nombre || 'sin nombre',
    hijo_edad: hijo?.edad ?? null,
    total_episodios: (episodios || []).length,
    total_hitos: (hitos || []).length,
  },
  momentos,
}, null, 2)}`

  const raw = await llamarAPI(prompt, 2000)

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return { rasgos: [] }
  try {
    const parsed = JSON.parse(match[0])
    if (!parsed || !Array.isArray(parsed.rasgos)) return { rasgos: [] }
    // Resuelve cada id de evidencia a { tipo, id } según de dónde salió
    // (episodio o hito); descarta ids que no estén entre los momentos enviados.
    // Luego filtra por validez: familia permitida, >=3 items de evidencia, y
    // confianza dentro de 0-1 si viene. Protege los CHECK de la tabla rasgos.
    const validos = parsed.rasgos
      .map((r) => {
        if (!r) return null
        const evidencia = (Array.isArray(r.evidencia) ? r.evidencia : [])
          .map((id) => {
            const tipo = tipoPorId.get(id)
            return tipo ? { tipo, id } : null
          })
          .filter(Boolean)
        // Clasificacion por CONTEO, no por etiqueta del modelo: 1-2 momentos =
        // patron emergente (aun sin evidencia suficiente para proponerlo como
        // rasgo confirmable); 3 o mas = candidato, como hasta hoy. El guardado
        // leera este flag en el paso siguiente; aca NO se escribe en la tabla.
        const esEmergente = evidencia.length < 3
        return { ...r, evidencia, esEmergente }
      })
      .filter((r) => {
        if (!r || !FAMILIAS_VALIDAS.includes(r.familia)) return false
        // Antes se botaban los de menos de 3 momentos; ahora se conservan y se
        // distinguen via esEmergente. Solo se descarta si NO hay ninguna
        // evidencia real que lo ancle (0 momentos resueltos = ruido).
        if (r.evidencia.length < 1) return false
        if (r.confianza != null && (typeof r.confianza !== 'number' || r.confianza < 0 || r.confianza > 1)) return false
        return true
      })
    return { rasgos: validos }
  } catch {
    return { rasgos: [] }
  }
}

// ── Onboarding · primer encuentro ─────────────────────────────────────────
// Se usa en el slide 3 del Onboarding Susurro, donde el padre/madre escribe
// algo que vivió y la IA le devuelve una respuesta cálida y validante.
//
// Diferencias con el resto del archivo (intencionales):
//
//   1. NO usa `llamarAPI()` porque ese helper crea su propio AbortController
//      con timeout interno de 75s — incompatible con el timeout de 8s y
//      el AbortController que el `OnboardingComposer` ya configuró. Acá
//      hacemos fetch directo respetando el `signal` del caller.
//
//   2. NO usa `marcoEdad()` — en este punto del onboarding aún no hay datos
//      del hijo (el formulario llega en el slide 4). Solo tenemos el texto
//      crudo del padre/madre.
//
//   3. Cualquier fallo (HTTP, parse, payload sin `comprension`) propaga
//      excepción. Eso es lo que necesita el caller para caer al
//      FALLBACK_RESPONSE de `frases-onboarding.js` y mostrarle al usuario
//      una respuesta indistinguible — su primer encuentro nunca debe ver
//      un mensaje de error técnico.
const PROMPT_PRIMER_ENCUENTRO = `Eres Huella, una compañera de crianza basada en evidencia científica del desarrollo infantil. Un padre o madre acaba de escribirte por primera vez y te contó algo que vivió con su hijo o hija. No tienes ningún dato previo sobre el niño, ni edad, ni historial — solo este relato.

Tu única tarea es responder con un objeto JSON con exactamente esta forma:

{"comprension": "...", "cita": "...", "autor": "...", "marco": "..."}

Sin texto antes ni después del JSON. Sin bloques de código markdown. Sin etiquetas. Solo el objeto JSON crudo.

Contenido de cada campo:

1. "comprension": RESPONDE EN EXACTAMENTE 2 PÁRRAFOS separados por una línea en blanco (\n\n). MÁXIMO 50 PALABRAS TOTALES — esta es regla dura, no sugerencia. Si tu primer borrador supera 50 palabras, recórtalo antes de devolverlo.

   PÁRRAFO 1 (máximo 30 palabras): empieza con "Te leo." seguido de un análisis científico muy breve — qué está pasando en el desarrollo del niño según el marco que aplicas (desarrollo cerebral, ventana de tolerancia, apego, corregulación, lo que corresponda al relato). En lenguaje humano, sin jerga clínica. Ejemplo de tono y largo: "Te leo. A esta edad, la corteza prefrontal de tu hijo aún está en construcción — por eso no puede frenar el impulso cuando algo lo desborda. El grito es desregulación, no desafío."

   PÁRRAFO 2: exactamente esta frase, sin modificarla, sin agregarle ni quitarle palabras: "En Huella vas a entender por qué pasa cada episodio, y qué hacer con eso."

PROHIBIDO: agregar un tercer párrafo, dar consejos prácticos, listar pasos, diagnosticar al niño, juzgar al padre/madre, patologizar, sermonear, expandir más allá de las 50 palabras.

2. "cita": una cita real, completa y atribuida a un autor reconocido del marco que decidas aplicar. Una sola oración. Sin comillas dobles internas (porque va dentro de JSON). Debe encajar con lo que el padre/madre escribió.

3. "autor": nombre del autor de la cita. Ejemplos válidos: "Daniel Siegel", "Janet Lansbury", "Stuart Shanker", "Bruce Perry", "Ross Greene", "Laura Markham", "Becky Kennedy", "Gabor Maté", "Bessel van der Kolk", "Tina Payne Bryson", "Magda Gerber", "Harvey Karp", "Adele Faber".

4. "marco": el marco aplicado, en minúsculas, breve, de 1 a 4 palabras. Ejemplos: "ventana de tolerancia", "presencia", "corregulación", "apego seguro", "regulación emocional", "habilidad rezagada", "co-regulación", "reparación".

Reglas de tono y lenguaje:

- ${REGLA_IDIOMA}
- Cálido, en presente, sin tecnicismos clínicos.
- Habla en primera persona de Huella si encaja ("te leo", "te entiendo", "estoy contigo").
- Nunca uses términos diagnósticos hacia el niño (no decir "ansiedad clínica", "TDAH", "trastorno", "patológico").
- Nunca pongas en duda lo que el padre/madre cuenta.
- Esto es contacto, no acción — no sermonees, no listes pasos, no resuelvas el problema.`

/**
 * Llamada de "primer encuentro" del Onboarding Susurro (slide 3).
 * Toma el texto crudo que escribió el padre/madre y devuelve una respuesta
 * cálida y validante en formato JSON estructurado.
 *
 * @param {string} texto                    Texto del padre/madre. Trim antes de pasar.
 * @param {Object} [opts]
 * @param {AbortSignal} [opts.signal]       Para cancelar el fetch (el Composer
 *                                          ya configura un timeout de 8s).
 * @returns {Promise<{
 *   comprension: string,   // 40-50 palabras · 3 partes (anclaje + análisis breve + cierre fijo)
 *   cita: string,          // cita real, 1 oración, sin comillas internas
 *   autor: string,         // ej. "Daniel Siegel"
 *   marco: string,         // marco en minúsculas · ej. "ventana de tolerancia"
 * }>}
 *
 * Tira si:
 *   - El fetch falla por red, abort o status != 2xx.
 *   - El body no es JSON parseable.
 *   - El payload no incluye `comprension`.
 *
 * El caller (OnboardingComposer) atrapa cualquier throw y cae al
 * FALLBACK_RESPONSE de `frases-onboarding.js` con la misma UI.
 */
export async function requestPrimerEncuentro(texto, { signal } = {}) {
  // PROMPT_PRIMER_ENCUENTRO viaja como `system` (no como user message) para
  // que pise al SYSTEM_PROMPT clínico default del backend. Sin esto, el
  // modelo respondía con el formato Huella ("Qué está pasando / Marco
  // aplicado: ...") en vez del JSON que el onboarding necesita, y todo
  // caía al FALLBACK_RESPONSE.
  const prompt = `Texto del padre/madre:

"${texto}"`

  const headers = { 'content-type': 'application/json' }
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  }

  // Fetch directo (sin pasar por llamarAPI) para honrar el `signal` del caller
  // en vez del timeout interno de 75s que llamarAPI configura.
  const response = await fetch('/api/anthropic', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      // 200 tokens ≈ 130 palabras en español: holgura para la comprension
      // de ~50 palabras + cita corta + autor + marco + estructura JSON,
      // pero apretado para que el modelo no pueda expandirse a 80+ palabras.
      max_tokens: 200,
      system: PROMPT_PRIMER_ENCUENTRO,
    }),
    signal,
  })

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`)
    err.status = response.status
    throw err
  }

  const body = await response.json()
  const raw = (body?.text ?? '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // Tolerante a texto antes/después del objeto: extrae el primer bloque
  // que parezca JSON. Si tampoco hay match, JSON.parse va a tirar.
  const match = raw.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(match ? match[0] : raw)

  if (!parsed || typeof parsed !== 'object' || !parsed.comprension) {
    throw new Error('payload-incompleto')
  }

  return {
    comprension: String(parsed.comprension || ''),
    cita:        String(parsed.cita        || ''),
    autor:       String(parsed.autor       || ''),
    marco:       String(parsed.marco       || ''),
  }
}

// ════════════════════════════════════════════════════════════════════
// extraerEpisodio — el corazón del registro conversacional
//
// Toma el relato hablado del padre y devuelve la estructura del episodio
// más un párrafo de validación escrito con SUS palabras. Una sola llamada.
//
// El system va como override (mismo patrón que requestPrimerEncuentro):
// sin eso, el SYSTEM_PROMPT clínico del backend contesta con el formato
// "Qué está pasando / Marco aplicado:" en vez del JSON que esto necesita.
//
// Dos reglas duras que el prompt repite y el post-proceso hace cumplir:
//   1. Lo que el relato no dice va en null. Nunca se inventa un campo.
//   2. La intensidad NO se extrae jamás — la pone el padre, siempre.
// ════════════════════════════════════════════════════════════════════

// Los 9 tipos reales con una línea de definición cada uno. Sin esto el
// modelo inventa categorías propias o manda casi todo a 'otro'.
const TIPOS_PARA_EXTRACCION = `rabieta — explosión emocional intensa: grita, se tira al suelo, patalea, se descontrola.
llanto — llanto sostenido o desconsolado como manifestación principal, sin explosión.
agresividad — pega, muerde, empuja, tira cosas, agrede a personas u objetos.
miedo — miedo, angustia, ansiedad, no querer separarse, terror a algo puntual.
sueño — resistencia a dormir, despertares, pesadillas, todo lo relacionado al sueño.
oposicion — se niega, desobedece, no coopera, desafía, "no quiero", lucha de poder.
social — se aisló, no quiso juntarse con otros, conflicto o retraimiento con pares.
desconexion — se cerró, no respondía, se quedó en blanco, se desconectó del entorno.
otro — no calza con ninguno de los anteriores.`

const CUANDO_PARA_EXTRACCION = `ahora — acaba de pasar, recién.
hora_antes — hace alrededor de una hora.
manana — esta mañana.
tarde — esta tarde.
ayer — ayer.
custom — un momento específico distinto a los anteriores.`

const EMOCIONES_PARA_EXTRACCION = TAXONOMIA_EMOCIONES
  .map((c) => `${c.label} → ${c.especificas.join(' | ')}`)
  .join('\n')

const PROMPT_EXTRACCION = `Eres el oído de Huella, una app de crianza chilena. Un padre o madre acaba de contarte por voz algo difícil que pasó con su hijo. Tu trabajo es entender lo que dijo y devolverlo ordenado, sin agregar nada.

━━━ TIPOS DE EPISODIO ━━━
${TIPOS_PARA_EXTRACCION}

━━━ CUÁNDO PASÓ ━━━
${CUANDO_PARA_EXTRACCION}

━━━ EMOCIONES (categoría → específicas) ━━━
${EMOCIONES_PARA_EXTRACCION}

━━━ REGLAS DURAS ━━━
1. LO QUE EL RELATO NO DICE VA EN null. No deduzcas, no completes, no adivines. Si el padre no mencionó una emoción, emocion es null. Si no dijo cuándo, cuandoPaso es null. Prefiere null antes que una suposición razonable.
2. NUNCA devuelvas intensidad. No es tu campo. Esa la pone el padre.
3. El campo tipo es el único obligatorio: elige siempre el id más cercano. Si de verdad no calza con ninguno, usa "otro".
4. Los chilenismos y el lenguaje coloquial se entienden por significado, no literalmente: "se amurró" es enojo o retraimiento, "se puso pésimo" es un desborde, "quedó la escoba" es caos, "estaba chato" es cansado o harto, "hizo tira" es rompió, "pescó una pataleta" es una rabieta. Mapea al tipo más cercano según lo que realmente pasó.

━━━ EL PÁRRAFO ━━━
Es lo que el padre va a leer para confirmar que entendiste. Reglas:
- USA LAS PALABRAS DEL PADRE. Si dijo "se amurró", el párrafo dice "se amurró". Si dijo "le grité", dice "le grité". No traduzcas a jerga de catálogo.
- Escríbelo en segunda persona, hablándole a él: "Me contaste que...".
- Máximo 2 frases. Natural, como se lo repetirías a un amigo para chequear que entendiste bien.
- PROHIBIDA la estructura "no fue X, fue Y" en cualquiera de sus formas.
- Sin diagnóstico, sin consejo, sin interpretación. Solo devolver lo que escuchaste.
- El relato viene de un dictado por voz y la última palabra puede llegar cortada ("dif" por "difícil", "compl" por "complicado"). Si es evidente cuál era, complétala; si no lo es, omítela. Nunca inventes contenido para rellenar.
- Español latinoamericano neutro con TUTEO. Prohibido el voseo (vos, tenés, podés, decile).

━━━ ¿EL RELATO ALCANZA? (relatoVago) ━━━
Devuelve relatoVago en true SOLO cuando el relato no cuenta ninguna escena: no se sabe qué pasó, ni quién hizo qué, ni en qué momento. Son los desahogos sin hechos.
- "estuvo difícil la tarde, no sé, todo mal" → true. No hay escena.
- "anda insoportable últimamente" → true. Es un juicio, no algo que pasó.
- "se tiró al suelo gritando cuando le dije que no" → false. Hay escena, aunque falten datos.
- "lloró como media hora en la noche" → false. Hay escena.
Que falten campos NO lo hace vago: un relato puede dejar emoción, contexto y momento en null y aun así contar perfectamente qué pasó. Ante la duda, false.

━━━ LAS CITAS ━━━
Sirven para resaltar dentro del párrafo la parte que corresponde a cada campo, así el padre puede tocarla si no calza. Por eso:
- Cada cita tiene que ser un FRAGMENTO LITERAL DEL PÁRRAFO que acabas de escribir, copiado carácter por carácter. No del relato original: del párrafo. Si no aparece igual en el párrafo, no sirve.
- Lo más corta posible sin dejar de entenderse: unas pocas palabras, no la frase completa.
- No las hagas solaparse entre sí: cada una apunta a un trozo distinto del párrafo.
- Si un campo es null, o si en el párrafo no quedó nada que lo diga, no lo incluyas en citas.

━━━ FORMATO ━━━
Responde SOLO con JSON puro. Sin markdown, sin bloques de código, sin texto antes ni después. Estructura exacta:
{"tipo":"<id>","emocion":{"categoria":"<label de categoría>","especifica":"<específica exacta>"},"contexto":"<frase corta de qué estaba pasando antes>","cuandoPaso":"<id>","relatoVago":<true o false>,"parrafo":"<el párrafo>","citas":{"tipo":"<fragmento literal del párrafo>","emocion":"<fragmento literal del párrafo>","contexto":"<fragmento literal del párrafo>","cuandoPaso":"<fragmento literal del párrafo>"}}

emocion, contexto y cuandoPaso van en null si el relato no los menciona.`

// Ids válidos: no se confía en que el modelo respete el catálogo.
const TIPOS_VALIDOS  = ['rabieta', 'llanto', 'agresividad', 'miedo', 'sueño', 'oposicion', 'social', 'desconexion', 'otro']
const CUANDO_VALIDOS = ['ahora', 'hora_antes', 'manana', 'tarde', 'ayer', 'custom']

export async function extraerEpisodio({ transcripcion, hijo }) {
  const nombre = hijo?.nombre || 'su hijo/a'
  const edad   = hijo?.edad ?? '?'

  const prompt = `El hijo se llama ${nombre} y tiene ${edad} años.

Esto es lo que contó el padre o madre, transcrito de su voz:

"${transcripcion}"`

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
    body: JSON.stringify({
      prompt,
      // ~400 alcanza para la estructura, un párrafo de 2 frases y las citas.
      // Apretado a propósito: con más espacio el modelo empieza a interpretar.
      max_tokens: 400,
      system: PROMPT_EXTRACCION,
    }),
  })

  if (!response.ok) {
    const e = new Error(`HTTP ${response.status}`)
    e.status = response.status
    throw e
  }

  const body = await response.json()
  const parsed = extraerJSON(body?.text ?? '')

  // extraerJSON devuelve el string crudo cuando no logra parsear: eso es fallo.
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('extraccion-no-parseable')
  }

  return normalizarExtraccion(parsed)
}

// Saneado defensivo. El modelo puede devolver un tipo inexistente, una
// específica de emoción fuera de la taxonomía, o strings vacíos donde debería
// ir null. Se corrige acá para que la pantalla de validación pueda asumir que
// lo que recibe es válido o es null, sin defenderse de nuevo.
function normalizarExtraccion(raw) {
  const limpiar = (v) => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return (t === '' || t.toLowerCase() === 'null') ? null : t
  }

  const tipo       = TIPOS_VALIDOS.includes(raw.tipo) ? raw.tipo : 'otro'
  const cuandoPaso = CUANDO_VALIDOS.includes(raw.cuandoPaso) ? raw.cuandoPaso : null

  // La emoción vale solo si la específica existe de verdad: una inventada
  // rompería al selector, que busca por coincidencia exacta en las listas.
  let emocion = null
  const esp = limpiar(raw?.emocion?.especifica)
  if (esp) {
    const cat = TAXONOMIA_EMOCIONES.find((c) => c.especificas.includes(esp))
    if (cat) emocion = { categoria: cat.label, especifica: esp }
  }

  const citasRaw = (raw.citas && typeof raw.citas === 'object') ? raw.citas : {}
  const citas = {}
  for (const campo of ['tipo', 'emocion', 'contexto', 'cuandoPaso']) {
    const c = limpiar(citasRaw[campo])
    if (c) citas[campo] = c
  }

  return {
    tipo,
    emocion,
    contexto: limpiar(raw.contexto),
    cuandoPaso,
    // Solo un true explícito cuenta. Cualquier otra cosa —ausente, "true" como
    // texto, null— se lee como "el relato alcanza": repreguntar de más molesta
    // más que quedarse corto.
    relatoVago: raw.relatoVago === true,
    parrafo: limpiar(raw.parrafo) || '',
    citas,
  }
}
