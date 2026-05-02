import React, { useState, useEffect } from 'react'
import styles from './Card.module.css'

export default function Card({ children, className = '', onClick, staggerDelay = 0 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className={`${styles.card} ${visible ? styles.cardVisible : ''} ${onClick ? styles.clickable : ''} ${className}`}
      style={staggerDelay > 0 ? { animationDelay: `${staggerDelay}ms` } : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
