import React from 'react'
import styles from './delta.module.css'

export function Delta({ direction, positiveDirection, children }) {
  const isPositive = direction === positiveDirection
  return (
    <span className={`${styles.delta} ${isPositive ? styles.good : styles.bad}`}>
      {children}
    </span>
  )
}
