import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// ── Pieza 7 · "recordar sin reclamar" ────────────────────────────────────
//
// UN aviso al dia como maximo. El contenido NO se elige por urgencia sino por
// VALOR para el cuidador, en este orden:
//
//   1. Hay un rasgo candidato esperando que lo confirme  -> solo el puede darlo
//   2. Ayer hubo un episodio intenso                     -> como quedo EL
//   3. Domingo, resumen semanal                          -> hueco, llega con la pieza 4
//   4. Plan activo esta semana                           -> se lo recuerda sin pasar lista
//   5. Pregunta abierta del dia                          -> el default
//   6. Lleva 7+ dias sin abrir                           -> algo de valor, sin pedirle nada
//
// 🔴 REGLA DURA, no negociable: NINGUN mensaje dice ni insinua "no has
// registrado". Cero rachas, cero contadores, cero dias transcurridos en el
// texto. Cada mensaje ofrece algo. Una app de crianza que le cobra al padre lo
// que no hizo se desinstala.
//
// El mensaje 5 NO tiene condicion de ausencia: es lo que se manda cuando no
// hay nada mejor que decir, no un castigo por no registrar.
//
// El 6 no baja la frecuencia del aviso: la mantiene y le cambia el contenido a
// algo que se lee sin tener que hacer nada.

// Dias sin abrir la app a partir de los cuales el aviso deja de pedir registro.
const DIAS_SIN_ABRIR = 7

// Banco de frases por tramo de edad para el mensaje 6. Mismos tramos que
// `marcoEdad` en el cliente. Salen del corpus que la app ya usa —Bowlby,
// Porges, Tronick y Brazelton en los tramos chicos; Siegel y Greene en el
// medio; Steinberg y Damour en adolescencia— reescritas en voz de Huella y
// SIN nombrar autor: es un aviso, no una clase.
//
// 🔴 NINGUNA FRASE ASUME EL GENERO DEL HIJO. No se usa el helper de genero a
// proposito: el texto se escribe neutro de entrada, que es mas simple que
// conjugar en tiempo de envio y no puede fallar si el genero esta vacio —hoy
// es un paso opcional del onboarding—.
//
// Se dicen "rabietas", nunca "berrinches": es la palabra que la app usa en
// todas partes.
//
// 🔴 Y NO PUEDEN SONAR A IA. Es una amiga que sabe de crianza hablandole a un
// papa cansado: sin "no es X, es Y", sin paralelismos, sin frases de poster,
// sin remates ingeniosos, sin regla de tres. Ver la regla de voz en CLAUDE.md.
const BANCO_ETAPA = {
  '0-2': [
    'A esta edad todavía no sabe calmarse sin ti. Tu voz hace ese trabajo por ahora.',
    'Si andaba bien y de repente se puso difícil, ojo: muchas veces está a punto de dar un salto.',
    'Con lo poco que tiene para expresarse, llorar y protestar es su forma de contarte algo.',
  ],
  '3-5': [
    'La parte del cerebro que frena los impulsos todavía está en obra. Por eso cuesta tanto que pare cuando se lo pides.',
    'En plena rabieta el cuerpo va más rápido que la cabeza. Primero calma, después conversación.',
    'Un mal rato con reparación después vale más que un día perfecto. Volver a acercarse es lo que queda.',
  ],
  '6-8': [
    'Ya se compara con los demás y escucha mucho lo que tú dices sobre cómo es. Ahí pesa cada palabra.',
    'Puede esperar bastante bien, hasta que aparece el cansancio o el hambre. Ahí se le acaba todo.',
    'Cuando se porta mal, muchas veces le falta una habilidad, no ganas de hacerte la vida difícil.',
  ],
  '9-12': [
    'Empieza a pedir espacio propio. Eso no es alejarse de ti, es armar su rincón.',
    'Los amigos empiezan a pesar tanto como tú. Es normal, y tú sigues ahí.',
    'Puede razonar como grande y perder el control como chico, en el mismo día.',
  ],
  '13+': [
    'Su reloj interno se corrió de verdad. Le cuesta dormirse temprano aunque quiera.',
    'El cerebro adolescente tiene el acelerador listo antes que el freno. Sabe que es riesgoso y lo hace igual.',
    'Necesita que estés cerca sin encima. Una puerta abierta rinde más que una conversación forzada.',
  ],
}

// Tramo de edad al que pertenece un hijo. Espeja los cortes de `marcoEdad`.
function tramoEdad(edad) {
  const n = parseInt(edad, 10)
  if (isNaN(n)) return null
  if (n <= 2)  return '0-2'
  if (n <= 5)  return '3-5'
  if (n <= 8)  return '6-8'
  if (n <= 12) return '9-12'
  return '13+'
}

// Edad en anios a partir de la fecha de nacimiento, con la columna `edad` como
// respaldo (hay hijos cargados antes de que existiera la fecha).
function edadDe(hijo) {
  if (hijo?.fecha_nacimiento) {
    const nac = new Date(hijo.fecha_nacimiento)
    if (!isNaN(nac)) {
      const ms = Date.now() - nac.getTime()
      return Math.floor(ms / (365.25 * 864e5))
    }
  }
  return hijo?.edad ?? null
}

// Rotacion determinista: mismo hijo y mismo dia -> misma frase, sin guardar
// nada. Evita repetir la de ayer sin necesitar una tabla de historial.
function frasePorEtapa(hijoId, edad, dia) {
  const tramo = tramoEdad(edad)
  const frases = tramo ? BANCO_ETAPA[tramo] : null
  if (!frases?.length) return null
  const semilla = (hijoId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return frases[(semilla + dia) % frases.length]
}

// ── El selector ──────────────────────────────────────────────────────────
// Devuelve el primer mensaje que aplica, o null si no hay nada que decir.
// Recibe TODO ya resuelto: no consulta la base, asi es facil de leer y de
// probar. Cada rama nombra a SU hijo (el del dato que la disparo), nunca al
// primero de la lista.
function elegirMensaje(ctx) {
  const { rasgo, episodioIntenso, estrategia, hijoReciente, horaAviso, diasSinAbrir, hoyDia } = ctx

  // 1. Un rasgo esperando confirmacion. Va primero porque es lo unico que
  //    SOLO el cuidador puede resolver: la IA propone, el papa decide.
  if (rasgo?.hijoNombre) {
    return {
      title: `Huella notó algo en ${rasgo.hijoNombre}`,
      body:  `Algo se repite en ${rasgo.hijoNombre}. ¿Tú también lo ves?`,
      url:   `/hijo?hijo=${rasgo.hijoId}`,
    }
  }

  // 2. Ayer hubo un episodio intenso. El foco es el ADULTO, no el nino: es el
  //    unico campo de la app que es solo suyo.
  if (episodioIntenso?.hijoNombre) {
    return {
      title: '¿Cómo estás tú hoy?',
      body:  `Ayer fue difícil con ${episodioIntenso.hijoNombre}. Vale la pena mirar cómo quedaste tú.`,
      url:   `/checkin/${episodioIntenso.id}?hijo=${episodioIntenso.hijoId}`,
    }
  }

  // 3. Resumen semanal del domingo. HUECO RESERVADO: nace con el retrato del
  //    padre (pieza 4). Hasta entonces devuelve null y la prioridad sigue.
  //    Se deja escrito para que el orden no se decida de nuevo despues.
  //    if (esDomingo && resumenSemanal) return { ... }

  // 4. Plan activo. Informa y ofrece; NO pregunta si hizo las tareas — el copy
  //    viejo decia "¿Revisaste las tareas de esta semana?", que es pasar lista.
  if (estrategia?.hijoNombre) {
    return {
      title: `Tu plan con ${estrategia.hijoNombre} sigue en marcha`,
      body:  `Esta semana el foco es "${estrategia.habilidad}". Está ahí cuando quieras.`,
      url:   `/estrategias?hijo=${estrategia.hijoId}`,
    }
  }

  if (!hijoReciente) return null

  // 6. Lleva mucho sin abrir: se le cuenta algo de su hijo, sin pedirle nada.
  //    Va ANTES de la 5 porque la reemplaza — no se suman.
  if (diasSinAbrir != null && diasSinAbrir >= DIAS_SIN_ABRIR) {
    const frase = frasePorEtapa(hijoReciente.id, edadDe(hijoReciente), hoyDia)
    if (frase) {
      return {
        title: `Lo que pasa en el cerebro de ${hijoReciente.nombre}`,
        body:  frase,
        url:   `/hijo?tab=cerebro&hijo=${hijoReciente.id}`,
      }
    }
    // Sin frase para ese tramo (edad sin guardar) cae a la 5, que tampoco le
    // reclama nada.
  }

  // 5. La pregunta abierta del dia. SIN condicion de ausencia: es el default.
  //    Dos variantes segun a que hora pidio el aviso — preguntar "¿cómo estuvo
  //    hoy?" a las 8 de la maniana no tiene sentido.
  const temprano = (horaAviso ?? 9) < 14
  return temprano
    ? {
        title: `¿Cómo amaneció ${hijoReciente.nombre}?`,
        body:  'Un momento de ayer o de hoy, en una línea. Con eso basta.',
        url:   `/registro?hijo=${hijoReciente.id}`,
      }
    : {
        title: `¿Cómo estuvo hoy con ${hijoReciente.nombre}?`,
        body:  'Cuéntame en una línea. Con eso basta.',
        url:   `/registro?hijo=${hijoReciente.id}`,
      }
}

export default async function handler(req, res) {
  // Vercel cron sends Authorization: Bearer {CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Hora LOCAL DE CHILE de esta corrida. Se calcula con Intl y no restando
  // horas a mano, porque Chile cambia de huso dos veces al anio y hacerlo a
  // mano significa que medio anio los avisos salen corridos.
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const horaLocal = parseInt(partes.find((p) => p.type === 'hour').value, 10)
  // El job corre en :00 y :30, pero puede arrancar unos segundos tarde. Se
  // redondea al bloque de media hora para que un disparo a las 9:00:07 siga
  // contando como el bloque de las 9:00.
  const minutoLocal =
    parseInt(partes.find((p) => p.type === 'minute').value, 10) < 30 ? 0 : 30

  // EL FILTRO VA EN LA CONSULTA, no en el bucle. El job corre 48 veces al dia:
  // traer las 14 suscripciones cada vez y descartarlas en JavaScript seria
  // hacer 48 veces el trabajo para mandar un punado de avisos.
  const { data: destinatarios } = await supabase
    .from('perfiles')
    .select('user_id')
    .eq('hora_aviso', horaLocal)
    .eq('minuto_aviso', minutoLocal)

  if (!destinatarios?.length) {
    return res.json({ sent: 0, total: 0, hora: `${horaLocal}:${minutoLocal}` })
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', destinatarios.map((d) => d.user_id))

  if (!subs?.length) {
    return res.json({ sent: 0, total: 0, hora: `${horaLocal}:${minutoLocal}` })
  }

  const now = new Date()
  const hoyDia = Math.floor(now.getTime() / 864e5)
  let sent = 0

  for (const sub of subs) {
    const userId = sub.user_id

    const cutoff7d = new Date(now.getTime() - 7 * 864e5).toISOString()

    // TODOS los hijos, no `maybeSingle()`. Con dos hijos o mas, maybeSingle
    // devolvia null y el mensaje terminaba diciendo "tu hijo/a": el aviso
    // dejaba de nombrar a nadie justo en las familias mas activas.
    const [{ data: hijos }, { data: rasgos }, { data: episodios }, { data: estrategias }, { data: perfil }] =
      await Promise.all([
        supabase
          .from('hijos')
          .select('id, nombre, edad, fecha_nacimiento')
          .eq('user_id', userId),
        supabase
          .from('rasgos')
          .select('id, hijo_id, titulo')
          .eq('user_id', userId)
          .eq('estado', 'candidato')
          .order('evidencia_count', { ascending: false })
          .limit(1),
        supabase
          .from('episodios')
          .select('id, hijo_id, fecha, intensidad')
          .eq('user_id', userId)
          .gte('fecha', cutoff7d)
          .order('fecha', { ascending: false })
          .limit(20),
        supabase
          .from('estrategias')
          .select('hijo_id, habilidad, semana_actual')
          .eq('user_id', userId)
          .lt('semana_actual', 4)
          .limit(1),
        supabase
          .from('perfiles')
          .select('hora_aviso, ultima_actividad')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

    if (!hijos?.length) continue
    const porId = new Map(hijos.map((h) => [h.id, h]))

    // Cada dato trae SU hijo. Si el hijo ya no existe (borrado), la regla se
    // salta en vez de nombrar a otro.
    const rasgoRow = rasgos?.[0]
    const hijoRasgo = rasgoRow ? porId.get(rasgoRow.hijo_id) : null

    const epRow = episodios?.find((e) => {
      const horas = (now - new Date(e.fecha)) / 3600000
      return e.intensidad >= 4 && horas >= 20 && horas <= 48
    })
    const hijoEp = epRow ? porId.get(epRow.hijo_id) : null

    const estRow = estrategias?.[0]
    const diaSemana = now.getDay()
    const hijoEst = estRow && diaSemana >= 1 && diaSemana <= 5
      ? porId.get(estRow.hijo_id)
      : null

    // El hijo de la pregunta abierta: el del episodio mas reciente, y si no
    // hay ninguno, el unico o el primero de la lista.
    const hijoReciente =
      (episodios?.[0] && porId.get(episodios[0].hijo_id)) || hijos[0]

    const diasSinAbrir = perfil?.ultima_actividad
      ? Math.floor((now - new Date(perfil.ultima_actividad)) / 864e5)
      : null

    const notification = elegirMensaje({
      rasgo: hijoRasgo ? { hijoId: hijoRasgo.id, hijoNombre: hijoRasgo.nombre } : null,
      episodioIntenso: hijoEp
        ? { id: epRow.id, hijoId: hijoEp.id, hijoNombre: hijoEp.nombre }
        : null,
      estrategia: hijoEst
        ? { hijoId: hijoEst.id, hijoNombre: hijoEst.nombre, habilidad: estRow.habilidad }
        : null,
      hijoReciente,
      horaAviso: perfil?.hora_aviso,
      diasSinAbrir,
      hoyDia,
    })

    if (!notification) continue

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(notification)
      )
      sent++
    } catch (e) {
      // Suscripción expirada o revocada — limpiar
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return res.json({ sent, total: subs.length, hora: `${horaLocal}:${minutoLocal}` })
}
