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
//   *. Hay un momento con relato de hace 2-30 dias      -> se le devuelve lo que EL escribio
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

// Tope de largo del titulo de un rasgo para que quepa en el cuerpo del aviso.
// Mas largo que esto se corta solo en la barra de Android y el papa lee una
// frase partida, asi que se prefiere el cuerpo generico de siempre.
const MAX_TITULO_RASGO = 70

// Cuantas palabras del relato se le devuelven en el aviso de "ultimo momento".
// Ocho alcanzan para que reconozca lo que escribio sin que el aviso sea un
// parrafo.
const PALABRAS_EXTRACTO = 8

// Ventana del aviso de "ultimo momento", en dias. Desde 2 para no repetirle
// algo que anoto ayer; hasta 30 porque mas atras "como sigue" ya no calza.
const MOMENTO_DIAS_MIN = 2
const MOMENTO_DIAS_MAX = 30

// Sube SOLO la primera letra. El titulo del rasgo abre el cuerpo del aviso,
// asi que va capitalizado aunque en la base se haya guardado en minuscula.
function mayusculaInicial(s) {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase('es') + s.slice(1)
}

// Las primeras `n` palabras del relato, sin el signo de puntuacion final para
// que no quede pegado a los puntos suspensivos.
function primerasPalabras(texto, n) {
  const limpio = (texto || '').replace(/\s+/g, ' ').trim()
  if (!limpio) return null
  const corte = limpio.split(' ').slice(0, n).join(' ')
  return corte.replace(/[.,;:!?…]+$/, '') || null
}

// Numero de dia de la semana (0 = domingo) a partir del nombre corto que da
// Intl en 'en-GB'. Asi el dia sale en hora de Chile y no en la del servidor.
const DIA_POR_NOMBRE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Lunes de la semana de un dia de Chile ('2026-09-20' -> '2026-09-14'). Es la
// clave de analisis_semanal. REPLICA de `lunesSemanaChile` en
// src/utils/fechaChile.js: ningun endpoint de api/ importa desde src/ y no se
// estrena ese camino en el aviso diario. Si cambia alla, cambia aca.
function lunesDeLaSemana(diaChile) {
  const [y, m, d] = diaChile.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const desdeLunes = (base.getUTCDay() + 6) % 7
  base.setUTCDate(base.getUTCDate() - desdeLunes)
  return base.toISOString().slice(0, 10)
}

// El texto de la seccion "Mejoro" del analisis guardado, en una sola linea.
// Mismo corte que `partirEnSecciones` de AnalisisSemanalCard: el titulo se
// compara sin ":" final ni mayusculas, y la seccion termina en el siguiente
// titulo. REPLICA por la misma razon que la de arriba.
const TITULOS_ANALISIS = ['mejoró', 'qué mirar', 'un paso']
function limpiarTitulo(linea) {
  return (linea || '').normalize('NFC').trim().replace(/:+$/, '').trim().toLowerCase()
}
function textoMejoro(texto) {
  const lineas = (texto || '').normalize('NFC').split('\n')
  const inicio = lineas.findIndex((l) => limpiarTitulo(l) === 'mejoró')
  if (inicio < 0) return null
  const cuerpo = []
  for (const linea of lineas.slice(inicio + 1)) {
    const t = limpiarTitulo(linea)
    if (TITULOS_ANALISIS.includes(t) || t.startsWith('marco aplicado')) break
    if (linea.trim()) cuerpo.push(linea.trim())
  }
  const unaLinea = cuerpo.join(' ').replace(/\s+/g, ' ').trim()
  return unaLinea || null
}

// ── El selector ──────────────────────────────────────────────────────────
// Devuelve el primer mensaje que aplica, o null si no hay nada que decir.
// Recibe TODO ya resuelto: no consulta la base, asi es facil de leer y de
// probar. Cada rama nombra a SU hijo (el del dato que la disparo), nunca al
// primero de la lista.
function elegirMensaje(ctx) {
  const { resumenSemanal, rasgo, episodioIntenso, estrategia, ultimoMomento, hijoReciente, horaAviso, diasSinAbrir, hoyDia } = ctx

  // 3. Resumen semanal del domingo. Se numera 3 por el orden original, pero
  //    el domingo GANA a todas, incluidas la 1 y la 2 (decision de Daniel,
  //    22 sep 2026): es el unico dia en que Huella devuelve la semana entera.
  //    Solo llega si ya existe el analisis de esta semana, que genera el Home;
  //    sin analisis la prioridad sigue igual que cualquier otro dia. El texto
  //    es el "Mejoro" tal como quedo guardado.
  //    `rama` no viaja en el aviso: el handler la usa para marcar el envio.
  if (resumenSemanal?.hijoNombre) {
    return {
      rama:  3,
      title: `${resumenSemanal.hijoNombre} esta semana`,
      body:  resumenSemanal.mejoro,
      url:   `/panel?hijo=${resumenSemanal.hijoId}&desde=domingo`,
    }
  }

  // 1. Un rasgo esperando confirmacion. Va primero porque es lo unico que
  //    SOLO el cuidador puede resolver: la IA propone, el papa decide.
  if (rasgo?.hijoNombre) {
    // El titulo dice QUE se repite. Sin el, el aviso obliga a entrar para
    // saber de que se trata. Con el, el papa ya puede ir pensandolo.
    const titulo = (rasgo.titulo || '').trim().replace(/\.+$/, '')
    return {
      title: `Huella notó algo en ${rasgo.hijoNombre}`,
      body:  titulo && titulo.length <= MAX_TITULO_RASGO
        ? `${mayusculaInicial(titulo)}. ¿Lo ves igual?`
        : `Algo se repite en ${rasgo.hijoNombre}. ¿Tú también lo ves?`,
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

  // *. El ultimo momento con relato. Va DESPUES de la 6 y ANTES del default
  //    porque no pregunta de cero: le devuelve al papa algo que EL escribio.
  //
  //    🔴 No cuenta dias sin entrar ni dice "no has registrado". El "hace N
  //    dias" es la edad DEL MOMENTO, que es un dato del hijo, no una factura
  //    por lo que el papa no hizo.
  if (ultimoMomento?.hijoNombre) {
    const extracto = primerasPalabras(ultimoMomento.texto, PALABRAS_EXTRACTO)
    if (extracto) {
      return {
        title: ultimoMomento.hijoNombre,
        body:  `Hace ${ultimoMomento.dias} días anotaste: ${extracto}… ¿Cómo sigue?`,
        url:   `/registro?hijo=${ultimoMomento.hijoId}`,
      }
    }
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
  //
  // El DIA sale del mismo Intl. Antes se usaba now.getDay(), que en Vercel es
  // el dia UTC: un domingo 21:30 en Chile ya es lunes en UTC, y la rama 4
  // salia el domingo en la noche y no el viernes.
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const parte = (tipo) => partes.find((p) => p.type === tipo).value
  const horaLocal = parseInt(parte('hour'), 10)
  const diaSemanaChile = DIA_POR_NOMBRE[parte('weekday')]
  const esDomingo = diaSemanaChile === 0
  const semanaChile = lunesDeLaSemana(`${parte('year')}-${parte('month')}-${parte('day')}`)
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

    // La ventana larga es SOLO para el aviso de "ultimo momento". El resto de
    // las reglas sigue mirando 7 dias; ver el filtro de `episodios7d` abajo.
    const cutoff30d = new Date(now.getTime() - MOMENTO_DIAS_MAX * 864e5).toISOString()

    // TODOS los hijos, no `maybeSingle()`. Con dos hijos o mas, maybeSingle
    // devolvia null y el mensaje terminaba diciendo "tu hijo/a": el aviso
    // dejaba de nombrar a nadie justo en las familias mas activas.
    const [{ data: hijos }, { data: rasgos }, { data: episodios }, { data: hitos }, { data: estrategias }, { data: perfil }] =
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
          .select('id, hijo_id, fecha, intensidad, descripcion_libre')
          .eq('user_id', userId)
          .gte('fecha', cutoff30d)
          .order('fecha', { ascending: false })
          .limit(50),
        supabase
          .from('hitos')
          .select('id, hijo_id, fecha, descripcion')
          .eq('user_id', userId)
          .gte('fecha', cutoff30d)
          .order('fecha', { ascending: false })
          .limit(50),
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
    const hijoEst = estRow && diaSemanaChile >= 1 && diaSemanaChile <= 5
      ? porId.get(estRow.hijo_id)
      : null

    // El hijo de la pregunta abierta: el del episodio mas reciente, y si no
    // hay ninguno, el unico o el primero de la lista.
    //
    // ⚠️ Se filtra a 7 dias A PROPOSITO. La consulta ahora trae 30 para el
    // aviso de "ultimo momento"; sin este filtro, ampliar la ventana habria
    // cambiado a que hijo nombran las reglas 5 y 6 en familias con dos o mas
    // hijos, que no es lo que se pidio.
    const limite7d = now.getTime() - 7 * 864e5
    const episodios7d = (episodios ?? []).filter(
      (e) => new Date(e.fecha).getTime() >= limite7d
    )
    const hijoReciente =
      (episodios7d[0] && porId.get(episodios7d[0].hijo_id)) || hijos[0]

    // El momento con relato mas reciente dentro de la ventana, venga de
    // episodios o de hitos: los dos son "momentos" y el papa no distingue.
    const momRow = [
      ...(episodios ?? []).map((e) => ({ hijoId: e.hijo_id, fecha: e.fecha, texto: e.descripcion_libre })),
      ...(hitos ?? []).map((h) => ({ hijoId: h.hijo_id, fecha: h.fecha, texto: h.descripcion })),
    ]
      .filter((m) => m.hijoId && m.texto && m.texto.trim())
      .map((m) => ({ ...m, dias: Math.floor((now - new Date(m.fecha)) / 864e5) }))
      .filter((m) => m.dias >= MOMENTO_DIAS_MIN && m.dias <= MOMENTO_DIAS_MAX)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0]
    const hijoMomento = momRow ? porId.get(momRow.hijoId) : null

    // Solo el domingo: el analisis de esta semana de cualquiera de sus hijos.
    // Se busca por hijo y no por user_id porque lo pudo generar la pareja.
    // Con dos hijos con analisis gana el mas reciente. Si la lectura falla,
    // el domingo sigue como un dia normal. La lectura no usa las columnas de
    // la migracion 025, asi que funciona aunque esa migracion no este corrida.
    let resumenSemanal = null
    if (esDomingo) {
      const { data: analisis, error: errAnalisis } = await supabase
        .from('analisis_semanal')
        .select('id, hijo_id, texto, created_at')
        .in('hijo_id', hijos.map((h) => h.id))
        .eq('semana', semanaChile)
        .order('created_at', { ascending: false })
      if (errAnalisis) console.warn('[push-remind] analisis_semanal no se pudo leer:', errAnalisis.message)
      for (const fila of analisis ?? []) {
        const mejoro = textoMejoro(fila.texto)
        const hijoRes = porId.get(fila.hijo_id)
        if (mejoro && hijoRes) {
          resumenSemanal = { analisisId: fila.id, hijoId: hijoRes.id, hijoNombre: hijoRes.nombre, mejoro }
          break
        }
      }
    }

    const diasSinAbrir = perfil?.ultima_actividad
      ? Math.floor((now - new Date(perfil.ultima_actividad)) / 864e5)
      : null

    const notification = elegirMensaje({
      resumenSemanal,
      rasgo: hijoRasgo
        ? { hijoId: hijoRasgo.id, hijoNombre: hijoRasgo.nombre, titulo: rasgoRow.titulo }
        : null,
      episodioIntenso: hijoEp
        ? { id: epRow.id, hijoId: hijoEp.id, hijoNombre: hijoEp.nombre }
        : null,
      estrategia: hijoEst
        ? { hijoId: hijoEst.id, hijoNombre: hijoEst.nombre, habilidad: estRow.habilidad }
        : null,
      ultimoMomento: hijoMomento
        ? { hijoId: hijoMomento.id, hijoNombre: hijoMomento.nombre, texto: momRow.texto, dias: momRow.dias }
        : null,
      hijoReciente,
      horaAviso: perfil?.hora_aviso,
      diasSinAbrir,
      hoyDia,
    })

    if (!notification) continue
    const { rama, ...payload } = notification

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sent++

      // El denominador de "se abrio o no": se marca solo si el aviso salio.
      // Con dos dispositivos se escribe dos veces, con la misma hora.
      if (rama === 3) {
        const { data: marcada, error: errMarca } = await supabase
          .from('analisis_semanal')
          .update({ push_enviado_at: new Date().toISOString() })
          .eq('id', resumenSemanal.analisisId)
          .select('id')
        if (errMarca || !marcada?.length) {
          console.warn('[push-remind] push_enviado_at no se guardo:', errMarca?.message ?? '0 filas')
        }
      }
    } catch (e) {
      // Suscripción expirada o revocada — limpiar
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return res.json({ sent, total: subs.length, hora: `${horaLocal}:${minutoLocal}` })
}
