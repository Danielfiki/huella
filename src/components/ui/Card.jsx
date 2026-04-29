import React, { useState, useEffect } from 'react'
import styles from './Card.module.css'

export default function Card({ children, className = '', onClick }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className={`${styles.card} ${visible ? styles.cardVisible : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
