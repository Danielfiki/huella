import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { palabrasGenero } from '../../utils/genero'
import Escarabajo, { ESTADOS_PERSONAJE, useMovimientoReducido } from '../../components/personaje/Escarabajo'
import Button from '../../components/ui/Button'
import styles from './PersonajePage.module.css'

// Vitrina privada del personaje (ruta /personaje, solo Daniel; el filtro vive
// en RutaPersonaje). No esta enlazada desde ningun menu y no escribe nada en
// la base: la escena del rasgo solo LEE el confirmado mas reciente de La brava.

// El momento de la app donde vive cada estado, en el mismo orden.
const MOMENTOS = {
  saludando:   'Bienvenida',
  escuchando:  'Mientras escribe',
  pensando:    'La IA prepara',
  acompanando: 'Momento difícil',
  en_calma:    'Calmarse juntos',
  curioso:     'Card candidato',
  orgulloso:   'Avance o rasgo',
  celebrando:  'Hitos grandes',
  dormido:     'Vacío y 21:30',
  buscando:    'Sin datos o error',
}

const RASGO_RESPALDO = 'Después de caerse o frustrarse, se repone y quiere volver a intentarlo'
const HUELLAS = 6

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

function EscenaRasgo() {
  const reducido = useMovimientoReducido()
  const { hijo, rasgo } = useRasgoDeLaBrava()
  const [vuelta, setVuelta] = useState(0)
  const [fase, setFase] = useState(reducido ? 'listo' : 'caminando')

  useEffect(() => {
    if (reducido) {
      setFase('listo')
      return undefined
    }
    setFase('caminando')
    const caminata = duracionMs('--personaje-caminata')
    const giro = duracionMs('--motion-media')
    const t1 = setTimeout(() => setFase('girando'), caminata)
    const t2 = setTimeout(() => setFase('listo'), caminata + giro)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [vuelta, reducido])

  // El genero sale del perfil del hijo; el nombre solo se muestra.
  const nombre = hijo?.nombre || `tu ${palabrasGenero(hijo).sustantivo}`
  const titulo = rasgo?.titulo || RASGO_RESPALDO
  const listo = fase === 'listo'

  return (
    <section className={styles.seccion}>
      <h2 className={styles.rotulo}>Escena: rasgo confirmado</h2>

      <div className={styles.escenario} key={vuelta}>
        {Array.from({ length: HUELLAS }, (_, i) => (
          <span
            key={i}
            className={`${styles.huella} ${i % 2 ? styles.huellaAbajo : styles.huellaArriba}`}
            style={{
              left: `${8 + i * 6}%`,
              animationDelay: `calc(var(--personaje-caminata) * ${(i / HUELLAS).toFixed(3)})`,
            }}
            aria-hidden="true"
          />
        ))}
        <div className={`${styles.caminante} ${fase === 'caminando' ? styles.entrando : ''}`}>
          <div className={`${styles.giro} ${fase === 'caminando' ? styles.deLado : ''}`}>
            <Escarabajo
              estado={listo ? 'orgulloso' : 'curioso'}
              tamano={150}
              caminando={fase === 'caminando'}
            />
          </div>
        </div>
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
            // La fase cambia en el mismo render que la vuelta: sin esto el
            // escenario nuevo se pintaba un cuadro con el escarabajo ya quieto.
            if (!reducido) setFase('caminando')
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
  const [estado, setEstado] = useState('saludando')

  return (
    <main className={styles.pagina}>
      <section className={styles.seccion}>
        <h2 className={styles.rotulo}>Estados</h2>
        <div className={styles.grande}>
          <Escarabajo estado={estado} tamano={220} />
        </div>
        <div className={styles.chips}>
          {ESTADOS_PERSONAJE.map((e) => (
            <button
              key={e.clave}
              type="button"
              className={`${styles.chip} ${estado === e.clave ? styles.chipActivo : ''}`}
              aria-pressed={estado === e.clave}
              onClick={() => setEstado(e.clave)}
            >
              {e.nombre}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.rotulo}>En la app</h2>
        <div className={styles.grilla}>
          {ESTADOS_PERSONAJE.map((e) => (
            <figure key={e.clave} className={styles.celda}>
              <Escarabajo estado={e.clave} tamano={110} />
              <figcaption className={styles.pie}>
                <span className={styles.pieNombre}>{e.nombre}</span>
                <span className={styles.pieMomento}>{MOMENTOS[e.clave]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <EscenaRasgo />
    </main>
  )
}
