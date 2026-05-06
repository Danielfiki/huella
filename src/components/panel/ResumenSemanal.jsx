import React from 'react'
import styles from './resumenSemanal.module.css'
import { Delta } from './Delta'

function formatRange(a, b) {
  const fmt = (d) =>
    new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
      .format(d)
      .replace('.', '')
  return `${fmt(a)} → ${fmt(b)}`
}

function formatPct(p) {
  const sign = p < 0 ? '↓' : '↑'
  return `${sign} ${Math.abs(Math.round(p * 100))}%`
}

function formatSigned(n, digits) {
  const sign = n < 0 ? '↓' : '↑'
  return `${sign} ${Math.abs(n).toFixed(digits)}`
}

export function ResumenSemanal({ data }) {
  const {
    rangeStart, rangeEnd,
    episodes, episodesDelta, episodesDeltaPct,
    intensityAvg, intensityDelta,
    topTriggerEmoji, topTriggerLabel,
    showDeltas,
  } = data

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h4>Resumen semanal</h4>
        <span className={styles.range}>{formatRange(rangeStart, rangeEnd)}</span>
      </header>
      <div className={styles.grid}>
        <div className={styles.cell}>
          {episodes === 0
            ? <div className={styles.dash}>—</div>
            : <div className={styles.num}>{episodes}</div>
          }
          <div className={styles.lbl}>Episodios</div>
          {showDeltas && episodesDelta !== 0 && (
            <Delta direction={episodesDelta < 0 ? 'down' : 'up'} positiveDirection="down">
              {formatPct(episodesDeltaPct)}
            </Delta>
          )}
        </div>
        <div className={styles.cell}>
          {intensityAvg === 0
            ? <div className={styles.dash}>—</div>
            : <div className={`${styles.num} ${styles.numTang}`}>{intensityAvg.toFixed(1)}</div>
          }
          <div className={styles.lbl}>Intensidad media</div>
          {showDeltas && intensityDelta !== 0 && intensityAvg > 0 && (
            <Delta direction={intensityDelta < 0 ? 'down' : 'up'} positiveDirection="down">
              {formatSigned(intensityDelta, 1)}
            </Delta>
          )}
        </div>
        <div className={styles.cell}>
          {topTriggerEmoji
            ? <div className={styles.emo} aria-label={topTriggerLabel}>{topTriggerEmoji}</div>
            : <div className={styles.dash}>—</div>
          }
          <div className={styles.lbl}>Top gatillo</div>
        </div>
      </div>
    </section>
  )
}
