import React from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Escarabajo from '../ui/Escarabajo'
import {
  NumeroQueCuenta,
  tokensMovimiento,
  useMovimientoReducido,
} from '../motion/MotionPrimitives'
import { contenidoEducativo } from './bancoEducativo'
import styles from './tarjetaCerebro.module.css'

// Tarjeta central del Home: "Esta semana en el cerebro de {hijo}".
//
// Es la única pieza que interpreta. Cuatro estados excluyentes, decididos por
// el caller (calcularEstadoCerebro):
//   cero      cuenta sin ningún registro → invitación cálida
//   primeros  menos de 3 registros → guía de primeros pasos (absorbe el
//             banner GuiaPrimerosPasos, que dejó de existir en el Home)
//   rica      hay registros esta semana → una frase-hallazgo + la semana
//   pobre     cuenta activa pero semana vacía → contenido educativo por edad
//
// Al tocarla se despliega el detalle (gráficos + análisis IA), que llega como
// children. Nada de eso se borró del producto: se reubicó acá dentro,
// colapsado por defecto.
//
// LA VOZ de esta tarjeta (regla dura, aplica a los cuatro estados y también al
// banco educativo y a las narrativas que llegan por `frase`):
//   · Se habla del niño POR NOMBRE — "Los martes le están costando a Pascual".
//     Nunca en lenguaje estadístico: nada de promedios, porcentajes, "más
//     intensa que tu promedio" ni comparaciones con uno mismo en cifras.
//   · Máximo ~12 palabras por frase. Sin cifras dentro de la frase (los
//     números grandes y las barras ya son el dato; la frase es la lectura).
//   · Tono sereno, de alguien que conoce al niño. Tuteo neutro/chileno.

const PASOS = [
  { texto: () => 'Registra lo que pasó',   hecho: (n) => n >= 1 },
  { texto: () => 'Registra dos momentos más', hecho: (n) => n >= 3 },
  { texto: (nombre) => `Huella te muestra los patrones de ${nombre}`, hecho: () => false },
]

export function calcularEstadoCerebro({ totalEpisodios, episodiosSemana }) {
  if (totalEpisodios === 0) return 'cero'
  if (totalEpisodios < 3)   return 'primeros'
  if (episodiosSemana > 0)  return 'rica'
  return 'pobre'
}

// Barra de N segmentos que se encienden en cascada al entrar. Se usa para el
// progreso de primeros pasos (3 segmentos).
function Segmentos({ total, encendidos }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  return (
    <div className={styles.segmentos} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className={`${styles.segmento} ${i < encendidos ? styles.segmentoOn : ''}`}
          initial={{ opacity: reducido ? 1 : 0.25, scaleX: reducido ? 1 : 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: reducido ? 0 : t.media,
            ease: t.easeEntrada,
            delay: reducido ? 0 : i * 0.06,
          }}
        />
      ))}
    </div>
  )
}

// Semana en 7 columnas. Las barras crecen desde abajo al montar; los días sin
// registro quedan como una marca mínima para que la semana se lea completa.
//
// Color: la semana normal se lee en pistacho y SOLO el día alto sale en
// terracota. Así el naranjo deja de ser el único color de la vista y pasa a
// significar algo — "acá pasó lo fuerte" — en vez de ser el relleno por
// defecto. Un día se considera alto si empata con el máximo de la semana Y ese
// máximo es de al menos 2: una semana plana de un registro por día no tiene
// día alto, y marcarla entera de naranjo sería mentir.
const MIN_DIA_ALTO = 2

function BarrasSemana({ data }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className={styles.semana}>
      <div className={styles.barras}>
        {data.map((d, i) => {
          const alto = d.count === 0 ? 4 : 8 + (d.count / max) * 40
          const esAlto = d.count === max && max >= MIN_DIA_ALTO
          const tono = d.count === 0
            ? styles.barraVacia
            : esAlto ? styles.barraAlta : ''
          return (
            <span key={i} className={styles.columna}>
              <motion.i
                className={`${styles.barra} ${tono}`}
                initial={{ height: reducido ? alto : 0 }}
                animate={{ height: alto }}
                transition={{
                  duration: reducido ? 0 : t.lenta,
                  ease: t.easeEntrada,
                  delay: reducido ? 0 : i * 0.045,
                }}
              />
            </span>
          )
        })}
      </div>
      <div className={styles.dias} aria-hidden="true">
        {data.map((d, i) => <span key={i}>{d.day}</span>)}
      </div>
    </div>
  )
}

export function TarjetaCerebro({
  nombreHijo,
  estado,
  edadHijo,
  totalEpisodios,
  episodiosSemana,
  frecData,
  frase,
  expandible = false,
  abierto = false,
  onToggle,
  children,
}) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const educativo = estado === 'pobre' ? contenidoEducativo(edadHijo, nombreHijo) : null
  const pasosHechos = PASOS.filter((p) => p.hecho(totalEpisodios)).length
  const pasoActual = PASOS.findIndex((p) => !p.hecho(totalEpisodios))

  const encabezado = `Esta semana en el cerebro de ${nombreHijo}`

  return (
    <section className={styles.card}>
      {/* Patrón de "disclosure": el heading CONTIENE al botón que despliega.
          Al revés (un h2 dentro del button) sería HTML inválido. */}
      <h2 className={styles.tituloBloque}>
        {expandible ? (
          <button
            type="button"
            className={styles.cabeza}
            onClick={onToggle}
            aria-expanded={abierto}
          >
            <span className={styles.titulo}>{encabezado}</span>
            <span className={`${styles.chevron} ${abierto ? styles.chevronAbierto : ''}`}>
              <ChevronDown size={18} />
            </span>
          </button>
        ) : (
          <span className={styles.cabeza}>
            <span className={styles.titulo}>{encabezado}</span>
          </span>
        )}
      </h2>

      {estado === 'cero' && (
        <div className={styles.cuerpo}>
          {/* Espacio reservado para la ilustración definitiva. */}
          <div className={styles.ilustracion} aria-hidden="true">
            <Escarabajo className={styles.ilustracionIcon} />
          </div>
          <p className={styles.destacadoTexto}>Aquí va a vivir su semana</p>
          <p className={styles.linea}>
            Anota un momento y Huella empieza a conocer a {nombreHijo}.
          </p>
        </div>
      )}

      {estado === 'primeros' && (
        <div className={styles.cuerpo}>
          <div className={styles.filaDato}>
            <span className={styles.numeroGrande}>
              <NumeroQueCuenta valor={pasosHechos} />
            </span>
            <span className={styles.numeroLabel}>de 3 primeros pasos</span>
          </div>
          <Segmentos total={3} encendidos={pasosHechos} />
          <ul className={styles.pasos}>
            {PASOS.map((paso, i) => {
              const hecho = paso.hecho(totalEpisodios)
              const actual = i === pasoActual
              return (
                <li key={i} className={styles.paso}>
                  {hecho ? (
                    <span className={styles.marcaHecha} aria-hidden="true">✓</span>
                  ) : actual ? (
                    <span className={styles.marcaActual}>
                      <Escarabajo className={styles.marcaActualIcon} />
                    </span>
                  ) : (
                    <span className={styles.marcaPend} aria-hidden="true" />
                  )}
                  <span className={`${styles.pasoTexto} ${hecho ? styles.pasoTextoHecho : ''}`}>
                    {paso.texto(nombreHijo)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {estado === 'rica' && (
        <div className={styles.cuerpo}>
          {frase && <p className={styles.hallazgo}>{frase}</p>}
          <div className={styles.filaSemana}>
            <div className={styles.filaDato}>
              <span className={styles.numeroGrande}>
                <NumeroQueCuenta valor={episodiosSemana} />
              </span>
              <span className={styles.numeroLabel}>
                {episodiosSemana === 1 ? 'momento' : 'momentos'}
              </span>
            </div>
            <BarrasSemana data={frecData} />
          </div>
        </div>
      )}

      {estado === 'pobre' && educativo && (
        <div className={styles.cuerpo}>
          {/* El eyebrow no lleva el nombre: ya lo lleva el encabezado y lo
              vuelve a llevar la frase educativa. Tres veces seguidas cansa. */}
          <p className={styles.eyebrow}>El cerebro por dentro</p>
          <p className={styles.destacadoTexto}>{educativo.titulo}</p>
          <p className={styles.hallazgo}>{educativo.frase}</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {expandible && abierto && (
          <motion.div
            key="detalle"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducido ? 0 : t.media, ease: t.easeEntrada }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.detalle}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
