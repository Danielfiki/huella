import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import Escarabajo from '../ui/Escarabajo'
import CardPlegable from '../ui/CardPlegable'
import PieCientifico from '../patron/PieCientifico'
import BarrasSemana, { contarMomentosPorDia } from './BarrasSemana'
import GuiaPrimerosPasos from './GuiaPrimerosPasos'
import MomentosEnNumeros from './MomentosEnNumeros'
import { esLetraChicaDelModelo } from '../registro/OrientacionSecciones'
import { esTituloSeccion, tituloSeccionLimpio } from '../../utils/seccionesIA'
import { momentosDeLaSemana, MIN_MOMENTOS_ANALISIS } from '../../services/anthropic'
import styles from './AnalisisSemanalCard.module.css'

// La card "Esta semana" del Home. Es la única lectura de la semana: absorbió
// las barras de 7 días de la vieja tarjeta del cerebro y su guía de primeros
// pasos. Cuatro estados, en este orden de prioridad:
//
//   nueva      menos de 3 momentos en total → la guía de primeros pasos
//   lista      ya hay análisis de esta semana → barras + Mejoró, y al abrir
//              Mirar, Un paso, sus momentos en números, el análisis completo
//              y el pie
//   generando  3+ momentos esta semana y el análisis se está escribiendo
//   sin        lo demás → barras, y si faltan momentos en la semana, una línea
//
// Las tres líneas las genera y guarda HuellaContext al abrir el Home, una vez
// por semana, y las ve todo el mundo. Lo largo NO viene hecho: se pide la
// primera vez que un papá Pro abre el plegable (onPedirCompleto) y queda
// guardado para la próxima. En Free abrir el plegable muestra el candado y
// no llama a nada.
//
// El descargo y "Marco aplicado" los escribe el modelo al final (lo exige el
// system prompt del servidor), pero no van en el cuerpo: el marco ya viene
// guardado aparte y lo pinta el pie.

// Título en el texto → rótulo en la card. "Qué mirar" se llama así en el texto
// para no confundirse con un párrafo; en la card basta "Mirar".
const FILAS = [
  { titulo: 'Mejoró',    rotulo: 'Mejoró',  punto: styles.puntoMejoro },
  { titulo: 'Qué mirar', rotulo: 'Mirar',   punto: styles.puntoMirar  },
  { titulo: 'Un paso',   rotulo: 'Un paso', punto: styles.puntoPaso   },
]

const SECCIONES_LARGAS = ['Lo que merece atención', 'Posibles causas', 'Próximos pasos sugeridos']

function partirEnSecciones(texto) {
  const secciones = {}
  let actual = null
  for (const linea of (texto || '').split('\n')) {
    if (esTituloSeccion(linea)) {
      actual = tituloSeccionLimpio(linea)
      secciones[actual] = []
      continue
    }
    if (!actual || !linea.trim() || esLetraChicaDelModelo(linea)) continue
    secciones[actual].push(linea.trim())
  }
  return secciones
}

function Cabecera() {
  return (
    <span className={styles.cabecera}>
      <Escarabajo className={styles.bicho} />
      <span className={styles.eyebrow}>Huella · Esta semana</span>
    </span>
  )
}

export default function AnalisisSemanalCard({
  analisis,
  generando,
  episodios,
  hitos,
  nombreHijo,
  bloqueado,
  onUpgrade,
  onVerEstrategias,
  onPedirCompleto,
  abiertaAlInicio = false,
}) {
  const totalMomentos = (episodios?.length ?? 0) + (hitos?.length ?? 0)
  const semana = momentosDeLaSemana({ episodios, hitos })
  const momentosSemana = semana.episodios.length + semana.hitos.length
  const barras = contarMomentosPorDia(episodios, hitos)

  if (totalMomentos < MIN_MOMENTOS_ANALISIS) {
    return (
      <section className={styles.simple}>
        <Cabecera />
        <GuiaPrimerosPasos nombreHijo={nombreHijo} totalMomentos={totalMomentos} />
      </section>
    )
  }

  if (analisis) {
    return (
      <CardConAnalisis
        analisis={analisis}
        barras={barras}
        bloqueado={bloqueado}
        onUpgrade={onUpgrade}
        onVerEstrategias={onVerEstrategias}
        onPedirCompleto={onPedirCompleto}
        abiertaAlInicio={abiertaAlInicio}
      />
    )
  }

  const faltanEnLaSemana = momentosSemana < MIN_MOMENTOS_ANALISIS
  return (
    <section className={styles.simple}>
      <Cabecera />
      {generando && !faltanEnLaSemana ? (
        <p className={`${styles.cargando} ${styles.despuesCabecera}`}>Huella está leyendo la semana…</p>
      ) : (
        <div className={styles.despuesCabecera}>
          <BarrasSemana data={barras} />
          {faltanEnLaSemana && (
            <p className={styles.lineaSin}>Cuando haya tres momentos en la semana, Huella la lee.</p>
          )}
        </div>
      )}
    </section>
  )
}

// `abiertaAlInicio`: solo cuando el papá entra desde el aviso del domingo. Es
// el valor inicial y nada más; después la card se abre y cierra como siempre.
function CardConAnalisis({ analisis, barras, bloqueado, onUpgrade, onVerEstrategias, onPedirCompleto, abiertaAlInicio = false }) {
  const [cardAbierta, setCardAbierta] = useState(abiertaAlInicio)
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)
  // Lo largo recién generado, por si el UPDATE no lo guardó: el papá lo lee
  // igual y el reintento solo vuelve a guardar, sin pagar otra llamada.
  const [local, setLocal] = useState(null)
  const [sinGuardar, setSinGuardar] = useState(false)

  const secciones = partirEnSecciones(analisis?.texto)
  const filas = FILAS.filter((f) => secciones[f.titulo]?.length)

  const textoCompleto = analisis?.texto_completo || local?.texto || ''
  const completo = partirEnSecciones(textoCompleto)
  const largas = SECCIONES_LARGAS.filter((t) => completo[t]?.length)
  const marco = analisis?.marco || local?.marco || null

  async function pedirCompleto(textoYaGenerado = null) {
    setCargando(true)
    setError(false)
    try {
      const r = await onPedirCompleto(analisis, textoYaGenerado)
      // Una respuesta sin ninguna de las tres secciones dejaría el plegable
      // vacío: se trata como error y se ofrece reintentar.
      const partes = partirEnSecciones(r.texto)
      if (!SECCIONES_LARGAS.some((t) => partes[t]?.length)) throw new Error('respuesta sin secciones')
      setLocal({ texto: r.texto, marco: r.marco })
      setSinGuardar(!r.guardado)
    } catch (err) {
      console.warn('[analisis] completo fallo:', err)
      setError(true)
    } finally {
      setCargando(false)
    }
  }

  // Se genera la PRIMERA vez que un papá Pro abre el plegable. En Free abrir
  // solo muestra el candado: no se llama a nada.
  function alternar() {
    const abrir = !abierto
    setAbierto(abrir)
    if (abrir && !bloqueado && !textoCompleto && !cargando) pedirCompleto()
  }

  const [mejoro, ...resto] = FILAS
  const fila = (f) => secciones[f.titulo]?.length ? (
    <div key={f.titulo} className={styles.fila}>
      <div className={styles.filaCabeza}>
        <span className={`${styles.punto} ${f.punto}`} aria-hidden="true" />
        <span className={styles.rotulo}>{f.rotulo}</span>
      </div>
      <p className={styles.textoFila}>{secciones[f.titulo].join(' ')}</p>
    </div>
  ) : null

  // Cerrada por defecto y sin recordar: en el Home se ven la cabecera, las
  // barras y "Mejoró", nada más. Lo demás espera a que el papá lo pida.
  return (
    <CardPlegable
      className={styles.card}
      cabecera={<Cabecera />}
      resumen={
        <div className={`${styles.bloque} ${styles.resumen}`}>
          <BarrasSemana data={barras} />
          {fila(mejoro)}
        </div>
      }
      abierto={cardAbierta}
      onToggle={() => setCardAbierta((v) => !v)}
    >
      <div className={styles.bloque}>{resto.map(fila)}</div>

      <MomentosEnNumeros className={styles.plegable} />

      {filas.length > 0 && (
        <CardPlegable
          titulo="Leer el análisis completo"
          icono={bloqueado ? <Lock size={13} /> : undefined}
          className={styles.plegable}
          abierto={abierto}
          onToggle={alternar}
        >
          {bloqueado ? (
            <div className={styles.locked}>
              {['Lo que merece atención', 'Posibles causas', 'Próximos pasos'].map((s) => (
                <div key={s} className={styles.lockedRow}>
                  <Lock size={14} className={styles.lockIcon} />
                  <span>{s}</span>
                </div>
              ))}
              <button className={`${styles.btn} ${styles.primary}`} onClick={onUpgrade}>
                Ver el cuadro completo con Pro
              </button>
            </div>
          ) : cargando ? (
            <div className={styles.cuerpo}>
              <p className={styles.cargando}>Huella está leyendo la semana…</p>
            </div>
          ) : error ? (
            <div className={styles.cuerpo}>
              <p className={styles.aviso}>No pudimos leer la semana esta vez.</p>
              <button className={`${styles.btn} ${styles.primary}`} onClick={() => pedirCompleto()}>
                Reintentar
              </button>
            </div>
          ) : largas.length > 0 ? (
            <div className={styles.cuerpo}>
              {largas.map((t) => (
                <section key={t}>
                  <p className={styles.sectionTitle}>{t}</p>
                  {completo[t].map((linea, i) => (
                    <p key={i} className={styles.bodyLine}>{linea}</p>
                  ))}
                </section>
              ))}
              {sinGuardar && (
                <p className={styles.aviso}>
                  No quedó guardado.{' '}
                  <button className={styles.enlace} onClick={() => pedirCompleto(local?.texto)}>
                    Reintentar
                  </button>
                </p>
              )}
              <button className={`${styles.btn} ${styles.primary}`} onClick={onVerEstrategias}>
                Ver estrategias
              </button>
            </div>
          ) : null}
        </CardPlegable>
      )}

      <div className={styles.pieBloque}>
        <PieCientifico marco={marco} etiqueta="Marco" />
      </div>
    </CardPlegable>
  )
}
