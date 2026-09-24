import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { palabrasGenero } from '../../utils/genero'
import Button from '../../components/ui/Button'
import styles from './PersonajePage.module.css'

// Vitrina privada del personaje (ruta /personaje, solo Daniel; el filtro vive
// en RutaPersonaje). No esta enlazada desde ningun menu y no escribe nada en
// la base: la escena del rasgo solo LEE el confirmado mas reciente de La brava.
//
// Usa las 10 ilustraciones 3D de public/personaje (referencia de color:
// 02-orgulloso). El personaje dibujado en SVG (components/personaje/
// Escarabajo.jsx) queda en el repo, sin uso.

const ESTADOS = [
  { archivo: '01-saludando',   nombre: 'Saludando',   momento: 'Bienvenida' },
  { archivo: '02-orgulloso',   nombre: 'Orgulloso',   momento: 'Avance o rasgo' },
  { archivo: '03-acompanando', nombre: 'Acompañando', momento: 'Momento difícil' },
  { archivo: '04-escuchando',  nombre: 'Escuchando',  momento: 'Mientras escribe' },
  { archivo: '05-pensando',    nombre: 'Pensando',    momento: 'La IA prepara' },
  { archivo: '06-en-calma',    nombre: 'En calma',    momento: 'Calmarse juntos' },
  { archivo: '07-curioso',     nombre: 'Curioso',     momento: 'Card candidato' },
  { archivo: '08-celebrando',  nombre: 'Celebrando',  momento: 'Hitos grandes' },
  { archivo: '09-dormido',     nombre: 'Dormido',     momento: 'Vacío y 21:30' },
  { archivo: '10-buscando',    nombre: 'Buscando',    momento: 'Sin datos o error' },
]

const ruta = (archivo) => `/personaje/${archivo}.webp`

const RASGO_RESPALDO = 'Después de caerse o frustrarse, se repone y quiere volver a intentarlo'

function useMovimientoReducido() {
  const consulta = '(prefers-reduced-motion: reduce)'
  const [reducido, setReducido] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const alCambiar = () => setReducido(mq.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])
  return reducido
}

function duracionMs(nombre) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return 0
  return valor.endsWith('ms') ? n : n * 1000
}

// Lee La brava y su rasgo confirmado mas reciente. Solo SELECT.
function useRasgoDeLaBrava() {
  const [datos, setDatos] = useState({ hijo: null, rasgo: null })
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data: hijo } = await supabase
        .from('hijos')
        .select('id, nombre, genero')
        .ilike('nombre', '%brava%')
        .limit(1)
        .maybeSingle()
      let rasgo = null
      if (hijo) {
        const { data } = await supabase
          .from('rasgos')
          .select('titulo, evidencia_count, updated_at')
          .eq('hijo_id', hijo.id)
          .eq('estado', 'confirmado')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        rasgo = data ?? null
      }
      if (vivo) setDatos({ hijo: hijo ?? null, rasgo })
    })()
    return () => { vivo = false }
  }, [])
  return datos
}

// ── b) Visor grande ─────────────────────────────────────────────────────
function Visor({ estado, alCerrar }) {
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') alCerrar() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  return (
    <div
      className={styles.visor}
      role="dialog"
      aria-modal="true"
      aria-label={`Escarabajo ${estado.nombre.toLowerCase()}`}
      onClick={alCerrar}
    >
      <figure className={styles.visorFigura} key={estado.archivo}>
        <div className={styles.visorEntrada}>
          <img
            className={styles.visorImagen}
            src={ruta(estado.archivo)}
            alt={`Escarabajo ${estado.nombre.toLowerCase()}`}
          />
        </div>
        <figcaption className={styles.pie}>
          <span className={styles.pieNombre}>{estado.nombre}</span>
          <span className={styles.pieMomento}>{estado.momento}</span>
        </figcaption>
      </figure>
      <p className={styles.visorCerrar}>Toca para cerrar</p>
    </div>
  )
}

// ── c) Escena del rasgo confirmado ──────────────────────────────────────
function EscenaRasgo() {
  const reducido = useMovimientoReducido()
  const { hijo, rasgo } = useRasgoDeLaBrava()
  const [vuelta, setVuelta] = useState(0)
  const [listo, setListo] = useState(reducido)

  useEffect(() => {
    if (reducido) {
      setListo(true)
      return undefined
    }
    setListo(false)
    const t = setTimeout(() => setListo(true), duracionMs('--motion-lenta'))
    return () => clearTimeout(t)
  }, [vuelta, reducido])

  // El genero sale del perfil del hijo; el nombre solo se muestra.
  const nombre = hijo?.nombre || `tu ${palabrasGenero(hijo).sustantivo}`
  const titulo = rasgo?.titulo || RASGO_RESPALDO

  return (
    <section className={styles.seccion}>
      <h2 className={styles.rotulo}>Escena: rasgo confirmado</h2>

      <div className={styles.escenario} key={vuelta}>
        <img
          className={`${styles.escenaImagen} ${reducido ? '' : styles.rebote}`}
          src={ruta('02-orgulloso')}
          alt="Escarabajo orgulloso"
        />
      </div>

      {listo && (
        <div className={styles.revelado} key={`texto-${vuelta}`}>
          <p className={`${styles.volanta} ${styles.cascada}`} style={{ '--orden': 0 }}>
            Algo que descubrimos de {nombre}
          </p>
          <h3 className={`${styles.tituloRasgo} ${styles.cascada}`} style={{ '--orden': 1 }}>
            {titulo}
          </h3>
          {rasgo && (
            <p className={`${styles.linea} ${styles.cascada}`} style={{ '--orden': 2 }}>
              Apareció en {rasgo.evidencia_count} momentos que registraste.
            </p>
          )}
          <div className={styles.cascada} style={{ '--orden': 3 }}>
            <Button fullWidth onClick={() => {}}>Ver su huella</Button>
          </div>
        </div>
      )}

      <div className={styles.repetir}>
        <Button
          variant="ghost"
          onClick={() => {
            // Se esconde el texto en el mismo render que la vuelta, para que
            // la escena nueva no pinte un cuadro con el texto ya puesto.
            if (!reducido) setListo(false)
            setVuelta((v) => v + 1)
          }}
        >
          Repetir
        </Button>
      </div>
    </section>
  )
}

export default function PersonajePage() {
  const [abierto, setAbierto] = useState(null)
  const cerrar = React.useCallback(() => setAbierto(null), [])

  return (
    <main className={styles.pagina}>
      <section className={styles.seccion}>
        <h2 className={styles.rotulo}>Los 10 estados</h2>
        <div className={styles.grilla}>
          {ESTADOS.map((e) => (
            <button
              key={e.archivo}
              type="button"
              className={styles.celda}
              onClick={() => setAbierto(e)}
              aria-label={`Ver en grande: ${e.nombre}`}
            >
              <span className={styles.marco}>
                <img className={styles.miniatura} src={ruta(e.archivo)} alt="" />
              </span>
              <span className={styles.pie}>
                <span className={styles.pieNombre}>{e.nombre}</span>
                <span className={styles.pieMomento}>{e.momento}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <EscenaRasgo />

      {abierto && <Visor estado={abierto} alCerrar={cerrar} />}
    </main>
  )
}
