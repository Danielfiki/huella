import React from 'react'
import { Bell } from 'lucide-react'
import styles from './hero.module.css'

function getGreeting(date, userName, childName) {
  const h = date.getHours()
  const period =
    h < 6  ? 'madrugada' :
    h < 12 ? 'mañana'    :
    h < 19 ? 'tarde'     : 'noche'

  const titles = {
    madrugada: `Hola, ${userName}.`,
    mañana:    `Buenos días, ${userName}.`,
    tarde:     `Buenas tardes, ${userName}.`,
    noche:     `Buenas noches, ${userName}.`,
  }
  const subs = {
    madrugada: `Estás temprano. ¿Qué quieres registrar?`,
    mañana:    `${childName} está empezando el día. ¿Qué quieres hacer ahora?`,
    tarde:     `¿Cómo va la tarde con ${childName}?`,
    noche:     `Cierre del día. ¿Algo que quieras anotar?`,
  }
  return { title: titles[period], sub: subs[period] }
}

function formatHumanDate(d) {
  const parts = new Intl.DateTimeFormat('es', {
    weekday: 'long', day: 'numeric', month: 'short',
  }).formatToParts(d)
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  const day     = parts.find(p => p.type === 'day')?.value     ?? ''
  const month   = parts.find(p => p.type === 'month')?.value.replace('.', '') ?? ''
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} ${month}`
}

export function Hero({ userName, childName, date, onProfileClick }) {
  const { title, sub } = getGreeting(date, userName, childName)
  const initial = userName ? userName.charAt(0).toUpperCase() : 'H'

  return (
    <header className={styles.hero}>
      <div className={styles.row}>
        <button className={styles.profile} onClick={onProfileClick} aria-label="Perfil">
          {initial}
        </button>
        <div className={styles.nameWrap}>
          <div className={styles.dateLabel}>{formatHumanDate(date)}</div>
          <div className={styles.wordmark}>huella</div>
        </div>
        <div className={styles.bell} aria-hidden="true">
          <Bell size={20} />
        </div>
      </div>
      <h1 className={styles.greet}>{title}</h1>
      <p className={styles.greetSub}>{sub}</p>
    </header>
  )
}
