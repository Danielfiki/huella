// Banco educativo por edad — LOCAL, sin llamada a IA.
//
// Alimenta el estado "semana pobre" de la tarjeta central del Home: la cuenta
// está activa pero esta semana no hay registros suficientes. En vez de dejar
// un hueco (o pedirle algo al usuario), la tarjeta enseña algo cierto sobre el
// cerebro de su hijo a la edad que tiene.
//
// Reglas del contenido:
//  · UNA frase corta por entrada. Nada de párrafos (regla dura del Home).
//  · Científicamente correcta y sin diagnóstico: describe desarrollo típico,
//    nunca etiqueta al niño ni promete resultados.
//  · Tono Huella: descriptivo y sin culpa. Explica el porqué, no reta.
//  · Mínimo 4 frases por rango.
//
// Cuando exista la versión con IA, esto se queda igual como respaldo offline.

const RANGOS = [
  {
    min: 1,
    max: 2,
    frases: [
      'Su cerebro emocional manda: la parte que frena los impulsos recién está empezando a construirse.',
      'Todavía no puede calmarse solo. Se calma contigo, y esa compañía es la que entrena el circuito.',
      'Cuando dice "no" está estrenando la idea de que es alguien separado de ti.',
      'Entiende muchas más palabras de las que logra decir. Buena parte de la frustración viene de ahí.',
      'El llanto a esta edad no es manipulación: es la vía más rápida que tiene para pedir ayuda.',
    ],
  },
  {
    min: 3,
    max: 4,
    frases: [
      'Ya puede nombrar lo que siente, pero solo estando tranquilo. En plena crisis esa función se apaga.',
      'El juego simbólico es su laboratorio: ahí ensaya miedos y enojos sin riesgo.',
      'Empieza a poder esperar su turno, y le cuesta muchísimo. Es un músculo recién estrenado.',
      'Todavía mezcla deseo con realidad. Por eso "mañana lo hacemos" se siente como una pérdida hoy.',
      'Repetir la misma rutina lo calma: lo predecible le baja la alarma interna.',
    ],
  },
  {
    min: 5,
    max: 6,
    frases: [
      'Ya entiende que los demás piensan distinto que él. Recién ahí aparece el pedir perdón de verdad.',
      'Puede negociar y esperar, pero esa capacidad se cae cuando tiene hambre o sueño.',
      'Empieza a esconder emociones para no preocuparte. Su silencio también es información.',
      'Las reglas le importan mucho: le dan un mapa de un mundo que todavía está aprendiendo.',
      'Su memoria de trabajo aguanta pocas instrucciones seguidas. De a una le funciona mejor.',
    ],
  },
  {
    min: 7,
    max: 8,
    frases: [
      'Ya se compara con otros. Buena parte de su frustración nace ahí, no en la casa.',
      'Puede pensar sobre lo que siente. Es la edad en que conversar después del conflicto rinde.',
      'Sostiene la atención más rato, pero llega con la batería gastada del día escolar.',
      'La vergüenza empieza a pesarle más que el reto. Corregir en privado le llega mejor.',
      'Ya sigue causas y consecuencias reales: una explicación corta le sirve más que una larga.',
    ],
  },
  {
    min: 9,
    max: 99,
    frases: [
      'Su cerebro entra en una remodelación grande: poda lo que no usa y refuerza lo que sí.',
      'El grupo empieza a pesar tanto como la casa. No significa que te necesite menos.',
      'Busca autonomía y presencia al mismo tiempo. Las dos cosas son verdad a la vez.',
      'Los cambios de humor a esta edad tienen base biológica, no solo actitud.',
      'Puede sostener una conversación difícil si no siente que lo están juzgando.',
    ],
  },
]

// Sin fecha de nacimiento cargada no se puede ubicar un rango. Estas frases
// valen para cualquier edad de la app.
const GENERICAS = [
  'El cerebro que regula las emociones se construye de a poco, y se construye acompañado.',
  'Ponerle palabra a lo que siente le baja la intensidad. Nombrar calma.',
  'Lo predecible le baja la alarma interna: la rutina no es rigidez, es seguridad.',
  'Nadie aprende a calmarse solo. Se aprende tomando prestada la calma de otro.',
]

// Día del año — hace que la frase sea estable dentro del día y rote de un día
// a otro, sin aleatoriedad (dos aperturas del Home el mismo día muestran lo
// mismo, que es lo que se espera de una tarjeta educativa).
function diaDelAno(fecha) {
  const inicio = new Date(fecha.getFullYear(), 0, 0)
  return Math.floor((fecha - inicio) / 86400000)
}

// Devuelve { titulo, frase } para la edad dada. `edad` puede ser null.
export function contenidoEducativo(edad, fecha = new Date()) {
  const rango = Number.isFinite(edad)
    ? RANGOS.find((r) => edad >= r.min && edad <= r.max)
    : null
  const frases = rango ? rango.frases : GENERICAS
  const frase = frases[diaDelAno(fecha) % frases.length]
  const titulo = rango
    ? `A los ${edad} año${edad === 1 ? '' : 's'}…`
    : 'Su cerebro, por dentro'
  return { titulo, frase }
}
