import React, { useState, useRef, useEffect } from 'react'
import { Keyboard, Check, Mic, ArrowUp } from 'lucide-react'
import Escarabajo from '../ui/Escarabajo'
import VoiceTextarea from '../ui/VoiceTextarea'
import Button from '../ui/Button'
import { extraerEpisodio } from '../../services/anthropic'
import { TAXONOMIA_EMOCIONES } from '../../constants/taxonomiaEmociones'
import { TIPOS, INTENSIDADES, CUANDO_OPCIONES, labelTipo, labelCuando } from '../../constants/catalogoEpisodio'
import styles from './RegistroConversacional.module.css'

// ──────────────────────────────────────────────────────────────────────
// REGISTRO CONVERSACIONAL
//
// Reemplaza el formulario del modo rápido por una conversación:
//   narrar     — el padre cuenta, por voz o escribiendo; Huella escucha.
//   repregunta — solo si el relato no contó ninguna escena. Una y no más.
//   validar    — Huella devuelve un párrafo con las palabras del padre y
//                él toca lo que no calza.
//
// No son pantallas: son momentos de UN hilo que nunca se borra. El párrafo
// de validación entra como una burbuja más al final, y arriba siguen todas
// las burbujas de la conversación que llevó hasta ahí.
//
// La regla que ordena todo el componente: EL RELATO NO SE PIERDE NUNCA.
// Vive en `transcripcionRef` desde que se dicta y sobrevive a cualquier
// fallo de la extracción; si la IA se cae, la validación abre igual con el
// hilo intacto y fichas vacías. El guardado tampoco se bloquea: basta
// relato + intensidad.
// ──────────────────────────────────────────────────────────────────────

const CAMPOS = ['tipo', 'emocion', 'contexto', 'cuandoPaso']

// Lo que Huella pregunta cuando el relato no tiene escena. Pide UN momento, no
// más datos: es lo único que hace falta para poder orientar, y es más fácil de
// contestar que "dame más detalles".
const PREGUNTA_VAGO = 'Te escucho. ¿Me cuentas el momento más difícil, ese que se te quedó pegado?'

// Para lo que no es un episodio: un saludo, texto pegado por error. Es un
// cartel amable, no una conversación — por eso es siempre el mismo y no gasta
// la única repregunta disponible.
const FUERA_DE_TEMA = (nombre) => `Aquí estoy para lo que pase con ${nombre}. Cuando quieras, cuéntame qué pasó.`

// Lo tocable dentro del párrafo es un span, no un button, y eso NO es un
// descuido: WebKit ignora `display: inline` en los botones y los trata como
// caja atómica, así que un destacado largo no se partía entre renglones — se
// iba entero a una línea propia y con su texto centrado. Un span sí fluye como
// texto. Se le devuelve a mano lo que el button traía gratis: rol, foco y
// teclado.
function Tocable({ className, onClick, children }) {
  return (
    <span
      className={className}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {children}
    </span>
  )
}

// Cómo se lee un campo que la extracción entendió pero que no quedó dentro del
// párrafo. Antes se colgaba la etiqueta cruda del catálogo al final del texto
// ("Rabia por no conseguir algo", sin conector y sin sujeto), que se leía como
// una ficha de sistema y no como algo que Huella está diciendo.
const FRASES = {
  tipo:       (v) => `y lo anoté como ${v}`,
  emocion:    (v) => `y me pareció que había ${v}`,
  contexto:   (v) => `y entendí que antes ${v}`,
  cuandoPaso: (v) => `y lo dejé en ${v}`,
}

// Solo la primera letra: bajar la etiqueta entera con toLowerCase se comería
// las mayúsculas de un nombre propio dentro del contexto.
const bajarInicial = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

// Texto de cada hueco. El de tipo empuja un poco más porque es el único campo
// que la extracción siempre intenta llenar: si quedó vacío, algo no se entendió.
const HUECOS = {
  tipo:       '¿qué pasó? · toca para agregarlo',
  emocion:    '¿y la emoción? · toca si quieres',
  contexto:   '¿qué pasaba antes? · toca si quieres',
  cuandoPaso: '¿cuándo fue? · toca si quieres',
}

// Minúsculas y sin acentos, pero carácter por carácter: cada reemplazo es 1:1,
// así el índice que devuelve indexOf sirve tal cual sobre el texto original.
// Por eso no se usa normalize('NFD'), que cambia los largos.
function plegar(s) {
  return s.toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
}

// Parte el párrafo en trozos: los que corresponden a un campo quedan marcados y
// tocables, el resto es texto normal.
//
// Las citas vienen del modelo, así que no se les cree: se exige que aparezcan de
// verdad en el párrafo. La que no se encuentra no se marca y su campo cae a
// hueco — es la única forma de que el padre siempre pueda corregir todo, incluso
// cuando el modelo devuelve una cita que se inventó a medias.
function marcarParrafo(parrafo, citas) {
  const sinMarca = { segmentos: [{ texto: parrafo }], ubicados: [] }
  if (!parrafo) return sinMarca

  const plano = plegar(parrafo)
  const marcas = []

  for (const campo of CAMPOS) {
    const cita = (citas?.[campo] || '').trim()
      // Puntuación de los bordes: el modelo suele arrastrar la coma o el punto
      // final, y eso solo hace fallar la búsqueda.
      .replace(/^[\s"'¿¡(]+/, '')
      .replace(/[\s"'?!.,;:)]+$/, '')
    if (cita.length < 3) continue

    const desde = plano.indexOf(plegar(cita))
    if (desde === -1) continue
    marcas.push({ campo, desde, hasta: desde + cita.length })
  }

  // Si dos citas pisan el mismo trozo gana la que empieza antes; la otra pasa a
  // hueco. Anidar marcas tocables dejaría zonas donde no se sabe qué se abre.
  marcas.sort((a, b) => a.desde - b.desde)
  const finales = []
  for (const m of marcas) {
    if (finales.length && m.desde < finales[finales.length - 1].hasta) continue
    finales.push(m)
  }
  if (!finales.length) return sinMarca

  const segmentos = []
  let cursor = 0
  for (const m of finales) {
    if (m.desde > cursor) segmentos.push({ texto: parrafo.slice(cursor, m.desde) })
    segmentos.push({ texto: parrafo.slice(m.desde, m.hasta), campo: m.campo })
    cursor = m.hasta
  }
  if (cursor < parrafo.length) segmentos.push({ texto: parrafo.slice(cursor) })

  return { segmentos, ubicados: finales.map((m) => m.campo) }
}

export default function RegistroConversacional({
  hijo,
  padreNombre = '',
  padreAvatarUrl = null,
  onConfirmar,
  onEditarTodo,
  onVolver,
  guardando = false,
  errorGuardar = '',
}) {
  // narrar → (extrayendo) → [repregunta → (extrayendo)] → validar
  const [fase, setFase] = useState('narrar')
  // El relato acumulado vive solo en `transcripcionRef`: ahora que las burbujas
  // se pintan desde `mensajes`, nadie lee el texto fusionado, y tenerlo también
  // como estado era re-renderizar de gratis.
  const [modoChat, setModoChat] = useState(false)
  const [borrador, setBorrador] = useState('')

  // El hilo visible: lo que dijo el padre y lo que respondió Huella, en orden.
  // La burbuja de bienvenida no vive acá, se renderiza fija al principio.
  const [mensajes, setMensajes] = useState([])

  // Una repregunta por episodio y no más. Si el relato sigue vago después de
  // preguntar, se pasa a validar igual: insistir dos veces es un interrogatorio.
  const [yaRepregunto, setYaRepregunto] = useState(false)
  // Lo que devolvió la primera pasada, por si el padre elige seguir sin
  // contestar: se usa eso en vez de tirar la extracción a la basura.
  const extraccionPreviaRef = useRef(null)

  // Lo que quedó del episodio. Arranca vacío y lo llena la extracción o el padre.
  const [tipo, setTipo] = useState('')
  const [emocion, setEmocion] = useState(null)      // string: la específica
  const [contexto, setContexto] = useState('')
  const [cuandoPaso, setCuandoPaso] = useState('')
  const [intensidad, setIntensidad] = useState(null)

  const [parrafo, setParrafo] = useState('')
  const [citas, setCitas] = useState({})
  // true = la IA no pudo ordenar el relato. No es un error del padre y la
  // pantalla no lo trata como tal: solo cambia el texto y muestra las fichas.
  const [sinOrdenar, setSinOrdenar] = useState(false)

  // Campo abierto en la hoja de edición: 'tipo' | 'emocion' | 'contexto' | 'cuandoPaso'
  const [campoEditando, setCampoEditando] = useState(null)

  const transcripcionRef = useRef('')
  const relatoPrevioRef = useRef('')
  const hiloRef = useRef(null)

  // Scroll de chat: cada burbuja nueva se asoma sola. Se dispara también con la
  // fase porque los puntos de "está leyendo" y el párrafo de validación entran
  // sin agregar nada a `mensajes`.
  useEffect(() => {
    const el = hiloRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes, fase])

  const nombre = hijo?.nombre || 'tu hijo'
  // Avatar del cuidador: su foto si la subió en Perfil, si no la inicial del
  // nombre. Sin nombre cargado queda el guion: un círculo vacío se vería como
  // una foto que no cargó.
  const inicialPadre = (padreNombre || '').trim().charAt(0).toUpperCase() || '—'

  // ── El hilo ──

  // Suma lo que dijo el padre: al hilo visible y al relato acumulado. Devuelve
  // el acumulado para que quien llama decida si ya procesa o espera más.
  function recibirDelPadre(texto) {
    const limpio = (texto || '').trim()
    if (!limpio) return ''

    setMensajes((prev) => [...prev, { de: 'padre', texto: limpio }])
    const todo = transcripcionRef.current
      ? `${transcripcionRef.current}\n\n${limpio}`
      : limpio
    // Se recuerda lo anterior por si este mensaje resulta no ser un episodio:
    // ahí se descarta del relato y no llega a la base.
    relatoPrevioRef.current = transcripcionRef.current
    // Se guarda antes de cualquier llamada: pase lo que pase, el relato queda.
    transcripcionRef.current = todo

    return todo
  }

  function aplicarExtraccion(r) {
    setTipo(r.tipo || '')
    setEmocion(r.emocion?.especifica || null)
    setContexto(r.contexto || '')
    setCuandoPaso(r.cuandoPaso || '')
    setParrafo(r.parrafo || '')
    setCitas(r.citas || {})
    setSinOrdenar(false)
  }

  // ── Paso de narrar a validar, con parada opcional en la repregunta ──
  async function procesarRelato(texto) {
    const limpio = (texto || '').trim()
    if (!limpio) return

    transcripcionRef.current = limpio

    setFase('extrayendo')

    // Se lee antes del await: si esta es la segunda pasada, lo que diga
    // relatoVago ya no importa.
    const esSegundaPasada = yaRepregunto

    try {
      const r = await extraerEpisodio({ transcripcion: limpio, hijo })

      // Esto no era un episodio. El mensaje se saca del relato para que no
      // viaje a la base, la burbuja se queda en el hilo porque el padre la
      // escribió, y se vuelve a esperar. No gasta la repregunta: no se le
      // preguntó nada, se le avisó para qué sirve esto.
      if (r.fueraDeTema) {
        transcripcionRef.current = relatoPrevioRef.current
        setMensajes((prev) => [...prev, { de: 'huella', texto: FUERA_DE_TEMA(nombre) }])
        setFase('narrar')
        return
      }

      if (r.relatoVago && !esSegundaPasada) {
        extraccionPreviaRef.current = r
        setYaRepregunto(true)
        setMensajes((prev) => [...prev, { de: 'huella', texto: PREGUNTA_VAGO }])
        setFase('repregunta')
        return
      }

      aplicarExtraccion(r)
    } catch {
      // Sin rojo y sin alarma: el relato está a salvo y se sigue igual,
      // solo que las fichas las llena el padre. Vale para las dos pasadas.
      setSinOrdenar(true)
      setParrafo('')
      setCitas({})
    }
    setFase('validar')
  }

  // Llega texto del padre. En voz se procesa al toque, porque el dictado ya
  // terminó; en chat se acumula y espera, porque puede seguir escribiendo.
  function recibirVoz(texto) {
    const todo = recibirDelPadre(texto)
    if (todo) procesarRelato(todo)
  }

  // Enviar es enviar: se procesa al toque, igual que la voz al confirmar el
  // dictado. No hay botón de "ya terminé" porque no hace falta: si el relato
  // alcanza, sale el párrafo; y si quedó corto, la repregunta es justamente la
  // invitación a seguir contando. La conversación no espera a un botón.
  function enviarChat() {
    const todo = recibirDelPadre(borrador)
    setBorrador('')
    if (todo) procesarRelato(todo)
  }

  // "Prefiero seguir así": se valida con lo que dio la primera pasada. Si esa
  // pasada no dejó nada usable, se cae al camino degradado, nunca a un muro.
  function seguirSinResponder() {
    const previa = extraccionPreviaRef.current
    if (previa) aplicarExtraccion(previa)
    else setSinOrdenar(true)
    setFase('validar')
  }

  function confirmar() {
    onConfirmar({
      transcripcion: transcripcionRef.current,
      tipo,
      emocion,
      contexto,
      cuandoPaso,
      intensidad,
    })
  }

  function editarTodo() {
    onEditarTodo({
      transcripcion: transcripcionRef.current,
      tipo,
      emocion,
      contexto,
      cuandoPaso,
      intensidad,
    })
  }

  // ════════ RENDER ════════
  // Una sola pantalla para todo el flujo. Validar NO es otra vista: es una
  // burbuja más al final del mismo hilo. Separarlas hacía que al validar
  // desaparecieran la repregunta y las burbujas del padre, y la conversación
  // que se venía teniendo se borraba justo en el momento de confirmarla.
  const extrayendo    = fase === 'extrayendo'
  const repreguntando = fase === 'repregunta'
  const validando     = fase === 'validar'
  const puedeGuardar  = !!intensidad && !guardando

  // El párrafo es la pantalla: los datos entendidos se leen dentro del texto,
  // no como fichas al lado. Lo que no alcanzó a quedar dentro del párrafo se
  // engancha al final, en la misma línea, para que nada quede sin poder tocarse.
  const { segmentos, ubicados } = marcarParrafo(parrafo, citas)
  const etiquetas = {
    tipo:       labelTipo(tipo),
    emocion:    emocion,
    contexto:   contexto,
    cuandoPaso: labelCuando(cuandoPaso),
  }
  const colgados = CAMPOS
    .filter((campo) => !ubicados.includes(campo))
    .map((campo) => ({ campo, etiqueta: etiquetas[campo] || null }))

  return (
    <div className={styles.pantalla}>
      <div className={styles.top}>
        <button className={styles.volver} onClick={onVolver} aria-label="Volver">←</button>
        <h2 className={styles.titulo}>{nombre}</h2>
      </div>

      <div className={styles.hiloScroll} ref={hiloRef}>
        <div className={styles.filaHuella}>
          <span className={styles.avatarHuella} aria-hidden="true">
            <Escarabajo className={styles.avatarSvg} />
          </span>
          <div className={styles.burbujaHuella}>
            <p className={styles.pregunta}>¿Qué pasó con {nombre}?</p>
            <p className={styles.subtexto}>
              Cuéntamelo como se lo contarías a una amiga. Sin orden, sin filtro.
            </p>
          </div>
        </div>

        {mensajes.map((m, i) => m.de === 'padre' ? (
          <div className={styles.filaPadre} key={i}>
            <div className={styles.burbujaPadre}>
              <p className={styles.relato}>{m.texto}</p>
            </div>
            <span className={styles.avatarPadre} aria-hidden="true">
              {padreAvatarUrl
                ? <img src={padreAvatarUrl} alt="" className={styles.avatarPadreFoto} />
                : inicialPadre}
            </span>
          </div>
        ) : (
          <div className={styles.filaHuella} key={i}>
            <span className={styles.avatarHuella} aria-hidden="true">
              <Escarabajo className={styles.avatarSvg} />
            </span>
            <div className={styles.burbujaHuella}>
              <p className={styles.pregunta}>{m.texto}</p>
            </div>
          </div>
        ))}

        {extrayendo && (
          <div className={styles.filaHuella}>
            <span className={styles.avatarHuella} aria-hidden="true">
              <Escarabajo className={styles.avatarSvg} />
            </span>
            <div className={styles.burbujaHuella}>
              <span className={styles.puntos} role="status" aria-label="Huella está leyendo">
                <i /><i /><i />
              </span>
            </div>
          </div>
        )}

        {validando && (
        <div className={styles.filaHuella}>
          <span className={styles.avatarHuella} aria-hidden="true">
            <Escarabajo className={styles.avatarSvg} />
          </span>
          <div className={styles.burbujaHuella}>
            {sinOrdenar ? (
              <p className={styles.parrafo}>
                Guardé tu relato. Esta vez lo ordenamos entre los dos:{' '}
                {CAMPOS.map((campo) => (
                  <React.Fragment key={campo}>
                    <Tocable className={styles.hueco} onClick={() => setCampoEditando(campo)}>
                      {HUECOS[campo]}
                    </Tocable>{' '}
                  </React.Fragment>
                ))}
              </p>
            ) : (
              <>
                <p className={styles.parrafo}>
                  {segmentos.map((seg, i) => seg.campo ? (
                    <Tocable key={i} className={styles.marca} onClick={() => setCampoEditando(seg.campo)}>
                      {seg.texto}
                    </Tocable>
                  ) : (
                    <React.Fragment key={i}>{seg.texto}</React.Fragment>
                  ))}

                  {colgados.map(({ campo, etiqueta }) => (
                    <React.Fragment key={campo}>
                      {etiqueta ? ' — ' : ' '}
                      <Tocable
                        className={etiqueta ? styles.marca : styles.hueco}
                        onClick={() => setCampoEditando(campo)}
                      >
                        {etiqueta ? (
                          <>
                            {FRASES[campo](bajarInicial(etiqueta))}
                            <span className={styles.pista}> · tócalo si no calza</span>
                          </>
                        ) : HUECOS[campo]}
                      </Tocable>
                    </React.Fragment>
                  ))}
                </p>

                <p className={styles.voyBien}>¿Voy bien?</p>
                <p className={styles.microcopy}>Toca cualquier palabra destacada si no calza.</p>
              </>
            )}
          </div>
        </div>
        )}

        {validando && (
          <div className={styles.tarjetaIntensidad}>
            <p className={styles.labelIntensidad}>Intensidad — la pones tú</p>
            <div className={styles.intensidadGrid}>
              {INTENSIDADES.map((op) => (
                <button
                  key={op.valor}
                  className={`${styles.intensidadBtn} ${intensidad === op.valor ? styles.intensidadBtnOn : ''}`}
                  onClick={() => setIntensidad(op.valor)}
                  type="button"
                >
                  <span className={styles.intensidadEmoji}>{op.emoji}</span>
                  <span className={styles.intensidadLabel}>{op.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Abajo va lo que corresponde al momento: mientras se cuenta, la entrada;
          al validar, el cierre. Nunca los dos. */}
      {validando ? (
        <div className={styles.pieAcciones}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={confirmar}
            disabled={!puedeGuardar}
            loading={guardando}
          >
            Listo, así fue
          </Button>
          {errorGuardar && <p className={styles.avisoGuardar}>{errorGuardar}</p>}
          <button className={styles.linkEditar} onClick={editarTodo}>Editar todo</button>
        </div>
      ) : !extrayendo && (
        <div className={styles.zonaEntrada}>
          {modoChat ? (
            <div className={styles.escrituraWrap}>
              <div className={styles.barraChat}>
                <textarea
                  className={styles.campoChat}
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  placeholder={repreguntando ? 'Cuéntame ese momento…' : 'Cuéntame qué pasó…'}
                  rows={1}
                />
                <button
                  className={styles.enviarChat}
                  onClick={enviarChat}
                  disabled={!borrador.trim()}
                  type="button"
                  aria-label="Enviar"
                >
                  <ArrowUp size={18} />
                </button>
              </div>

              <button className={styles.pillSecundaria} onClick={() => setModoChat(false)} type="button">
                <Mic size={15} />
                Volver a hablar
              </button>
            </div>
          ) : (
            <>
              <GrabadorVoz onTexto={recibirVoz} />
              <button className={styles.pillSecundaria} onClick={() => setModoChat(true)} type="button">
                <Keyboard size={15} />
                Modo chat
              </button>
            </>
          )}

          {repreguntando && (
            <button className={styles.linkEditar} onClick={seguirSinResponder} type="button">
              Prefiero seguir así
            </button>
          )}
        </div>
      )}

      {campoEditando && (
        <HojaEdicion
          campo={campoEditando}
          valores={{ tipo, emocion, contexto, cuandoPaso }}
          onCerrar={() => setCampoEditando(null)}
          onElegir={(campo, valor) => {
            if (campo === 'tipo')       setTipo(valor)
            if (campo === 'emocion')    setEmocion(valor)
            if (campo === 'contexto')   setContexto(valor)
            if (campo === 'cuandoPaso') setCuandoPaso(valor)
            setCampoEditando(null)
          }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Grabador de P1 — envuelve VoiceTextarea para quedarse solo con el botón
// grande y el contador. No reimplementa nada de la grabación: el arreglo
// del micrófono (toggle, tope de 2 min, singleton) vive en VoiceTextarea
// y se hereda tal cual.
// ══════════════════════════════════════════════════════════════════════
function GrabadorVoz({ onTexto }) {
  const [texto, setTexto] = useState('')

  // Cada dictado se entrega SOLO, sin arrastrar el anterior: por eso se le pasa
  // '' al actualizador de VoiceTextarea, que por defecto concatena con lo que
  // ya había. Quien acumula el relato es el hilo, y si acá también se
  // concatenara, el segundo dictado entraría dos veces.
  function recibir(actualizador) {
    const valor = typeof actualizador === 'function' ? actualizador('') : actualizador
    setTexto('')
    onTexto(valor)
  }

  return (
    <div className={styles.grabador}>
      <VoiceTextarea
        value={texto}
        onChange={setTexto}
        onVoiceResult={recibir}
        placeholder="Toca el micrófono y cuéntame"
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Hoja de edición — sube desde abajo con las opciones reales del campo.
// ══════════════════════════════════════════════════════════════════════
function HojaEdicion({ campo, valores, onCerrar, onElegir }) {
  const [catAbierta, setCatAbierta] = useState(null)
  const [textoLibre, setTextoLibre] = useState(valores.contexto || '')

  const titulos = {
    tipo:       '¿Qué pasó?',
    emocion:    '¿Qué emoción había detrás?',
    contexto:   '¿Qué estaba pasando antes?',
    cuandoPaso: '¿Cuándo pasó?',
  }

  return (
    <div className={styles.hojaOverlay} onClick={onCerrar}>
      <div className={styles.hoja} onClick={(e) => e.stopPropagation()}>
        <span className={styles.hojaAsa} aria-hidden="true" />
        <p className={styles.hojaTitulo}>{titulos[campo]}</p>

        {campo === 'tipo' && (
          <div className={styles.hojaOpciones}>
            {TIPOS.map((t) => (
              <button
                key={t.id}
                className={`${styles.opcion} ${valores.tipo === t.id ? styles.opcionOn : ''}`}
                onClick={() => onElegir('tipo', t.id)}
                type="button"
              >
                <span className={styles.opcionEmoji}>{t.emoji}</span>
                <span>{t.label}</span>
                {valores.tipo === t.id && <Check size={15} className={styles.opcionCheck} />}
              </button>
            ))}
          </div>
        )}

        {campo === 'cuandoPaso' && (
          <div className={styles.hojaOpciones}>
            {CUANDO_OPCIONES.map((c) => (
              <button
                key={c.id}
                className={`${styles.opcion} ${valores.cuandoPaso === c.id ? styles.opcionOn : ''}`}
                onClick={() => onElegir('cuandoPaso', c.id)}
                type="button"
              >
                <span>{c.label}</span>
                {valores.cuandoPaso === c.id && <Check size={15} className={styles.opcionCheck} />}
              </button>
            ))}
          </div>
        )}

        {campo === 'emocion' && (
          <div className={styles.hojaOpciones}>
            {!catAbierta && TAXONOMIA_EMOCIONES.map((cat) => (
              <button
                key={cat.id}
                className={styles.opcion}
                onClick={() => setCatAbierta(cat.id)}
                type="button"
              >
                <span className={styles.opcionEmoji}>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className={styles.opcionFlecha}>›</span>
              </button>
            ))}

            {catAbierta && (() => {
              const cat = TAXONOMIA_EMOCIONES.find((c) => c.id === catAbierta)
              return (
                <>
                  <button className={styles.hojaVolver} onClick={() => setCatAbierta(null)} type="button">
                    ‹ {cat.label}
                  </button>
                  {cat.especificas.map((esp) => (
                    <button
                      key={esp}
                      className={`${styles.opcion} ${valores.emocion === esp ? styles.opcionOn : ''}`}
                      onClick={() => onElegir('emocion', esp)}
                      type="button"
                    >
                      <span>{esp}</span>
                      {valores.emocion === esp && <Check size={15} className={styles.opcionCheck} />}
                    </button>
                  ))}
                </>
              )
            })()}
          </div>
        )}

        {campo === 'contexto' && (
          <div className={styles.hojaTexto}>
            <textarea
              className={styles.hojaTextarea}
              value={textoLibre}
              onChange={(e) => setTextoLibre(e.target.value)}
              placeholder="Ej: íbamos saliendo al jardín"
              rows={3}
              autoFocus
            />
            <Button variant="primary" fullWidth onClick={() => onElegir('contexto', textoLibre.trim())}>
              Guardar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
