// Banco educativo por edad — LOCAL, sin llamada a IA.
//
// Alimenta el estado "semana pobre" de la tarjeta central del Home: la cuenta
// está activa pero esta semana no hay registros suficientes. En vez de dejar
// un hueco (o pedirle algo al usuario), la tarjeta enseña algo cierto sobre el
// cerebro de su hijo a la edad que tiene.
//
// Reglas del contenido (LA VOZ de la tarjeta central, ver TarjetaCerebro.jsx):
//  · UNA frase corta por entrada. Nada de párrafos (regla dura del Home).
//  · La frase habla del niño POR NOMBRE: `{nombre}` se reemplaza al pedirla.
//    Nunca "su hijo", nunca lenguaje impersonal.
//  · Máximo ~12 palabras. Sin cifras de ningún tipo.
//  · Sin adjetivos de género ("tranquilo", "juzgado", "él"): la app tiene
//    hijos e hijas y no guarda el género. Se escribe neutro a propósito.
//  · Científicamente correcta y sin diagnóstico: describe desarrollo típico,
//    nunca etiqueta al niño ni promete resultados.
//  · Tono Huella: sereno, de alguien que lo conoce. Explica el porqué, no reta.
//  · Mínimo 4 frases por rango.
//
// Cuando exista la versión con IA, esto se queda igual como respaldo offline.

const RANGOS = [
  {
    min: 1,
    max: 2,
    frases: [
      'A {nombre} le manda el cerebro emocional; el freno recién se construye.',
      '{nombre} se calma contigo, y esa compañía entrena el circuito.',
      'Cuando {nombre} dice "no", estrena la idea de ser alguien aparte.',
      '{nombre} entiende muchas más palabras de las que logra decir.',
      'El llanto de {nombre} no manipula: es su forma de pedir ayuda.',
    ],
  },
  {
    min: 3,
    max: 4,
    frases: [
      '{nombre} puede nombrar lo que siente, pero solo en calma.',
      'Jugando, {nombre} ensaya sus miedos y sus enojos sin riesgo.',
      'Esperar el turno le cuesta a {nombre}: es un músculo nuevo.',
      'Para {nombre}, "mañana lo hacemos" se siente como una pérdida hoy.',
      'Repetir la misma rutina le baja a {nombre} la alarma interna.',
    ],
  },
  {
    min: 5,
    max: 6,
    frases: [
      '{nombre} ya entiende que los demás piensan distinto.',
      '{nombre} puede negociar y esperar, salvo con hambre o sueño.',
      'A veces {nombre} guarda lo que siente para no preocuparte.',
      'Las reglas le importan a {nombre}: le dan un mapa del mundo.',
      '{nombre} retiene pocas instrucciones seguidas; de a una le rinde más.',
    ],
  },
  {
    min: 7,
    max: 8,
    frases: [
      '{nombre} ya se compara con otros, y de ahí nace mucha frustración.',
      '{nombre} ya piensa sobre lo que siente: conversar después rinde.',
      '{nombre} llega del colegio con la batería del día gastada.',
      'A {nombre} la vergüenza le pesa más que el reto.',
      'A {nombre} le sirve más una explicación corta que una larga.',
    ],
  },
  {
    min: 9,
    max: 99,
    frases: [
      'El cerebro de {nombre} está en plena remodelación: poda y refuerza.',
      'El grupo empieza a pesarle a {nombre}, y sigue necesitándote igual.',
      '{nombre} busca autonomía y presencia a la vez; las dos son verdad.',
      'Los cambios de humor de {nombre} tienen base biológica, no actitud.',
      '{nombre} puede hablar de lo difícil si no siente reproche.',
    ],
  },
]

// Sin fecha de nacimiento cargada no se puede ubicar un rango. Estas frases
// valen para cualquier edad de la app.
const GENERICAS = [
  '{nombre} está construyendo, de a poco, su manera de regularse.',
  'Ponerle palabra a lo que siente le baja a {nombre} la intensidad.',
  'Lo predecible le baja a {nombre} la alarma: la rutina es seguridad.',
  'Nadie se calma solo: {nombre} toma prestada tu calma.',
]

// La edad va en letras, no en número: la voz de la tarjeta no muestra cifras.
const EDAD_EN_LETRAS = [
  null, 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
  'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis',
  'diecisiete', 'dieciocho',
]

// Día del año — hace que la frase sea estable dentro del día y rote de un día
// a otro, sin aleatoriedad (dos aperturas del Home el mismo día muestran lo
// mismo, que es lo que se espera de una tarjeta educativa).
function diaDelAno(fecha) {
  const inicio = new Date(fecha.getFullYear(), 0, 0)
  return Math.floor((fecha - inicio) / 86400000)
}

// Devuelve { titulo, frase } para la edad dada. `edad` puede ser null.
export function contenidoEducativo(edad, nombre, fecha = new Date()) {
  const rango = Number.isFinite(edad)
    ? RANGOS.find((r) => edad >= r.min && edad <= r.max)
    : null
  const frases = rango ? rango.frases : GENERICAS
  const plantilla = frases[diaDelAno(fecha) % frases.length]
  const frase = plantilla.split('{nombre}').join(nombre)

  const letras = EDAD_EN_LETRAS[edad]
  const titulo = !rango || !letras
    ? 'Algo que vale saber'
    : edad === 1
      ? 'Al año…'
      : `A los ${letras} años…`

  return { titulo, frase }
}
