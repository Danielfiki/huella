import React from 'react'
import { ChevronRight, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import Escarabajo from '../ui/Escarabajo'
import { emoTileClass } from '../historial/helpers'
import {
  NumeroQueCuenta,
  tokensMovimiento,
  useMovimientoReducido,
} from '../motion/MotionPrimitives'
import styles from './puertas.module.css'

// Las tres puertas del Home. Tarjetas compactas: dato visual y cero párrafos.
// Cada una lleva a una sección y muestra lo justo para dar ganas de entrar.
//
// "Su huella" absorbe el rol de AnticipoRetratoCard (incluido el aviso de
// rasgo emergente, ahora como badge). "Momentos" navega hoy a /historial; la
// fusión con Logros es B3. "Acompañando" solo se monta si hay algo que
// acompañar — nunca una tarjeta vacía.

// Los puntos de la mini-timeline usan el MISMO mapeo de color que las fichas
// del Historial (emoTileClass), para que un momento se vea igual en los dos
// lugares.
const COLOR_PUNTO = {
  tangerine: 'var(--color-primary)',
  lavender:  'var(--color-accent-lavender)',
  blue:      'var(--color-accent-blue)',
  gold:      'var(--color-accent-yellow)',
  green:     'var(--color-accent-green)',
}

const MAX_PUNTOS = 8

// Barra de N segmentos que se encienden en cascada al montar.
//
// `tono` marca la jerarquía de color del Home: pistacho para lo que el niño ya
// tiene (los rasgos descubiertos, que son un logro acumulado y no una acción
// pendiente) y terracota para lo que está en curso y pide seguimiento (las
// semanas del plan). El naranjo se reserva para lo accionable.
function BarraSegmentos({ total, encendidos, ariaLabel, tono = 'terracota' }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const claseOn = tono === 'pistacho' ? styles.segmentoOnVerde : styles.segmentoOn
  // <span> y no <div>: esto vive dentro de un <button>.
  return (
    <span
      className={styles.segmentos}
      role="progressbar"
      aria-valuenow={encendidos}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={ariaLabel}
    >
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className={`${styles.segmento} ${i < encendidos ? claseOn : ''}`}
          initial={{ opacity: reducido ? 1 : 0.2, scaleX: reducido ? 1 : 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: reducido ? 0 : t.media,
            ease: t.easeEntrada,
            delay: reducido ? 0 : i * 0.035,
          }}
        />
      ))}
    </span>
  )
}

function Puerta({ children, onClick, ariaLabel }) {
  return (
    <button type="button" className={styles.puerta} onClick={onClick} aria-label={ariaLabel}>
      {children}
      <span className={styles.chevron} aria-hidden="true"><ChevronRight size={18} /></span>
    </button>
  )
}

// ── Su huella ──────────────────────────────────────────────────────────────

export function PuertaHuella({ nombreHijo, fotoHijo, confirmados, hayNovedad, onClick }) {
  return (
    <Puerta onClick={onClick} ariaLabel={`Su huella — ${confirmados} de 12 rasgos`}>
      <span className={styles.avatar}>
        {fotoHijo
          ? <img src={fotoHijo} alt="" className={styles.avatarImg} />
          : <Escarabajo className={styles.avatarIcon} />}
      </span>
      <span className={styles.centro}>
        <span className={styles.etiquetaFila}>
          <span className={styles.etiqueta}>Su huella</span>
          {hayNovedad && (
            <span className={`${styles.badge} ${styles.badgeVerde}`}>Algo nuevo</span>
          )}
        </span>
        <span className={styles.dato}>
          <NumeroQueCuenta valor={confirmados} className={styles.datoNum} />
          <span className={styles.datoDe}>/12 rasgos</span>
        </span>
        <BarraSegmentos
          total={12}
          encendidos={confirmados}
          ariaLabel={`Rasgos descubiertos de ${nombreHijo}`}
          tono="pistacho"
        />
      </span>
    </Puerta>
  )
}

// ── Momentos ───────────────────────────────────────────────────────────────

export function PuertaMomentos({ total, ultimos, fotoAvance, onClick }) {
  const puntos = ultimos.slice(0, MAX_PUNTOS)
  return (
    <Puerta onClick={onClick} ariaLabel={`Momentos — ${total} registrados`}>
      <span className={styles.avatarCuadrado}>
        {fotoAvance
          ? <img src={fotoAvance} alt="" className={styles.avatarImg} />
          : <BookOpen size={20} className={styles.avatarIcon} />}
      </span>
      <span className={styles.centro}>
        <span className={styles.etiqueta}>Momentos</span>
        <span className={styles.dato}>
          <NumeroQueCuenta valor={total} className={styles.datoNum} />
          <span className={styles.datoDe}>{total === 1 ? 'registrado' : 'registrados'}</span>
        </span>
        {puntos.length > 0 && (
          <span className={styles.timeline} aria-hidden="true">
            {puntos.map((ep) => (
              <span
                key={ep.id}
                className={styles.punto}
                style={{ background: COLOR_PUNTO[emoTileClass(ep.tipo)] || COLOR_PUNTO.tangerine }}
              />
            ))}
          </span>
        )}
      </span>
    </Puerta>
  )
}

// ── Acompañando ────────────────────────────────────────────────────────────

export function PuertaAcompanando({ nombreHijo, plan, patrones, hayPatronNuevo, onClick }) {
  const semana = plan ? Math.min(Math.max(plan.semanaActual, 1), 4) : 0
  const chips = patrones.slice(0, 2)
  const resto = patrones.length - chips.length

  // B3 · sin plan ni patrones la puerta ya NO se esconde. Con Estrategias fuera
  // de la barra, esta es la única entrada a /estrategias: si desapareciera,
  // quien todavía no tiene un plan no tendría cómo llegar a crearlo. En ese
  // caso se muestra en modo "explorar": discreta, sin dato ni badge, pero
  // presente y con destino claro.
  const vacia = !plan && patrones.length === 0

  return (
    <Puerta onClick={onClick} ariaLabel="Lo que estás acompañando">
      <span className={`${styles.centro} ${vacia ? styles.centroExplorar : ''}`}>
        <span className={styles.etiquetaFila}>
          <span className={styles.etiqueta}>Acompañando</span>
          {hayPatronNuevo && <span className={styles.badge}>Patrón nuevo</span>}
        </span>

        {vacia && (
          <span className={styles.explorar}>Ver estrategias para {nombreHijo}</span>
        )}

        {plan && (
          <>
            <span className={styles.dato}>
              <span className={styles.datoNum}>Semana {semana}</span>
              <span className={styles.datoDe}>/4 del plan</span>
            </span>
            <BarraSegmentos total={4} encendidos={semana} ariaLabel="Avance del plan" />
          </>
        )}

        {chips.length > 0 && (
          <span className={styles.chips}>
            {chips.map((p) => (
              <span key={p.id} className={styles.chip}>{p.descripcion}</span>
            ))}
            {resto > 0 && <span className={styles.chipResto}>+{resto}</span>}
          </span>
        )}
      </span>
    </Puerta>
  )
}
