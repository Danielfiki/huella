import React, { useState, useRef } from 'react'
import { Keyboard, Check } from 'lucide-react'
import Escarabajo from '../ui/Escarabajo'
import VoiceTextarea from '../ui/VoiceTextarea'
import Button from '../ui/Button'
import { extraerEpisodio } from '../../services/anthropic'
import { TAXONOMIA_EMOCIONES } from '../../constants/taxonomiaEmociones'
import { TIPOS, INTENSIDADES, CUANDO_OPCIONES, labelTipo, labelCuando } from '../../constants/catalogoEpisodio'
import styles from './RegistroConversacional.module.css'

// ──────────────────────────────────────────────────────────────────────
// REGISTRO CONVERSACIONAL — Fase 1
//
// Reemplaza el formulario del modo rápido por dos momentos:
//   P1 narrar   — el padre cuenta por voz; Huella escucha.
//   P2 validar  — Huella devuelve un párrafo con las palabras del padre y
//                 él toca lo que no calza.
//
// La regla que ordena todo el componente: EL RELATO NO SE PIERDE NUNCA.
// Vive en `transcripcion` desde que se dicta y sobrevive a cualquier fallo
// de la extracción; si la IA se cae, P2 igual abre con el relato arriba y
// fichas vacías. El guardado tampoco se bloquea: basta relato + intensidad.
// ──────────────────────────────────────────────────────────────────────

const CAMPOS = ['tipo', 'emocion', 'contexto', 'cuandoPaso']

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
  onConfirmar,
  onEditarTodo,
  onVolver,
  guardando = false,
  errorGuardar = '',
}) {
  // narrar → (extrayendo) → validar
  const [fase, setFase] = useState('narrar')
  const [transcripcion, setTranscripcion] = useState('')
  const [modoEscritura, setModoEscritura] = useState(false)

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

  const nombre = hijo?.nombre || 'tu hijo'
  // La app no guarda foto del cuidador (la tabla `perfiles` solo tiene nombre y
  // plan), así que el avatar es la inicial. Sin nombre cargado queda el guion:
  // un círculo vacío se vería como una foto que no cargó.
  const inicialPadre = (padreNombre || '').trim().charAt(0).toUpperCase() || '—'

  // ── Paso de narrar a validar ──
  async function procesarRelato(texto) {
    const limpio = (texto || '').trim()
    if (!limpio) return

    // Se guarda antes de cualquier llamada: pase lo que pase, el relato queda.
    transcripcionRef.current = limpio
    setTranscripcion(limpio)
    setFase('extrayendo')

    try {
      const r = await extraerEpisodio({ transcripcion: limpio, hijo })
      setTipo(r.tipo || '')
      setEmocion(r.emocion?.especifica || null)
      setContexto(r.contexto || '')
      setCuandoPaso(r.cuandoPaso || '')
      setParrafo(r.parrafo || '')
      setCitas(r.citas || {})
      setSinOrdenar(false)
    } catch {
      // Sin rojo y sin alarma: el relato está a salvo y se sigue igual,
      // solo que las fichas las llena el padre.
      setSinOrdenar(true)
      setParrafo('')
      setCitas({})
    } finally {
      setFase('validar')
    }
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

  // ════════ P1 · NARRAR ════════
  if (fase === 'narrar' || fase === 'extrayendo') {
    const extrayendo = fase === 'extrayendo'

    return (
      <div className={styles.pantalla}>
        <div className={styles.top}>
          <button className={styles.volver} onClick={onVolver} aria-label="Volver">←</button>
          <h2 className={styles.titulo}>{nombre}</h2>
        </div>

        <div className={styles.hilo}>
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

          {extrayendo && (
            <div className={styles.filaPadre}>
              <div className={styles.burbujaPadre}>
                <p className={styles.relato}>{transcripcion}</p>
              </div>
              <span className={styles.avatarPadre} aria-hidden="true">{inicialPadre}</span>
            </div>
          )}

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
        </div>

        {!extrayendo && (
          <div className={styles.zonaEntrada}>
            {modoEscritura ? (
              <div className={styles.escrituraWrap}>
                <VoiceTextarea
                  value={transcripcion}
                  onChange={setTranscripcion}
                  onVoiceResult={setTranscripcion}
                  placeholder="Cuéntame qué pasó, con tus palabras…"
                />
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => procesarRelato(transcripcion)}
                  disabled={!transcripcion.trim()}
                >
                  Continuar
                </Button>
                <button className={styles.pillSecundaria} onClick={() => setModoEscritura(false)}>
                  Volver a la voz
                </button>
              </div>
            ) : (
              <>
                <GrabadorVoz onTexto={procesarRelato} />
                <button className={styles.pillSecundaria} onClick={() => setModoEscritura(true)}>
                  <Keyboard size={15} />
                  Modo chat
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ════════ P2 · VALIDAR ════════
  const puedeGuardar = !!intensidad && !guardando

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

      <div className={styles.hiloScroll}>
        <div className={styles.filaPadre}>
          <div className={styles.burbujaPadre}>
            <p className={styles.relato}>{transcripcion}</p>
          </div>
        </div>

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
                    <button className={styles.hueco} onClick={() => setCampoEditando(campo)} type="button">
                      {HUECOS[campo]}
                    </button>{' '}
                  </React.Fragment>
                ))}
              </p>
            ) : (
              <>
                <p className={styles.parrafo}>
                  {segmentos.map((seg, i) => seg.campo ? (
                    <button
                      key={i}
                      className={styles.marca}
                      onClick={() => setCampoEditando(seg.campo)}
                      type="button"
                    >
                      {seg.texto}
                    </button>
                  ) : (
                    <React.Fragment key={i}>{seg.texto}</React.Fragment>
                  ))}

                  {colgados.map(({ campo, etiqueta }) => (
                    <React.Fragment key={campo}>
                      {' '}
                      <button
                        className={etiqueta ? styles.marca : styles.hueco}
                        onClick={() => setCampoEditando(campo)}
                        type="button"
                      >
                        {etiqueta || HUECOS[campo]}
                      </button>
                    </React.Fragment>
                  ))}
                </p>

                <p className={styles.voyBien}>¿Voy bien?</p>
                <p className={styles.microcopy}>Toca cualquier palabra destacada si no calza.</p>
              </>
            )}
          </div>
        </div>

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
      </div>

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

  // Cuando VoiceTextarea confirma la transcripción, se pasa directo al
  // siguiente paso: en este flujo no hay nada más que escribir.
  function recibir(actualizador) {
    const valor = typeof actualizador === 'function' ? actualizador(texto) : actualizador
    setTexto(valor)
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
