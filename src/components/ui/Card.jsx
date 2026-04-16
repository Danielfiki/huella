import React from 'react'
import styles from './Card.module.css'

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
