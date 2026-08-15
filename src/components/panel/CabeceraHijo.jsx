import React, { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Escarabajo from '../ui/Escarabajo'
import { tokensMovimiento, useMovimientoReducido } from '../motion/MotionPrimitives'
import styles from './cabeceraHijo.module.css'

// Cabecera viva del Home. Reemplaza al Hero de doble avatar.
//
// El Home es "la página del hijo": lo primero que se ve es su cara, no un
// dashboard. La foto rota entre las últimas disponibles (avatar + fotos de
// hitos) con un crossfade lento; con una sola foto se queda quieta y sin
// timer. Toda la foto es un botón con UN destino: /hijo.
//
// El degradado hacia el crema (--gradient-foto-cabecera) no es decoración:
// es lo que deja el saludo legible sobre cualquier foto y lo que hace que la
// foto termine en el fondo de la página en vez de cortarse con un borde.

const MS_ROTACION = 7000

function saludoPorHora(fecha, nombre) {
  const h = fecha.getHours()
  if (h < 6)  return `Hola, ${nombre}`
  if (h < 12) return `Buenos días, ${nombre}`
  if (h < 19) return `Buenas tardes, ${nombre}`
  return `Buenas noches, ${nombre}`
}

export function CabeceraHijo({
  nombreHijo,
  fotos = [],
  padreNombre,
  padreAvatarUrl,
  fecha = new Date(),
  onFotoClick,
  onPadreClick,
  onBellClick,
  bellActive = false,
  bellHasNew = false,
}) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const [indice, setIndice] = useState(0)

  // Con movimiento reducido no hay rotación: cambiar la foto sola es
  // exactamente el tipo de movimiento no pedido que la preferencia apaga.
  useEffect(() => {
    if (reducido || fotos.length < 2) return undefined
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % fotos.length)
    }, MS_ROTACION)
    return () => clearInterval(id)
  }, [reducido, fotos.length])

  // Si la lista se acorta (se borró un hito con foto) el índice puede quedar
  // apuntando fuera del array.
  const actual = fotos.length > 0 ? fotos[indice % fotos.length] : null
  const saludo = saludoPorHora(fecha, padreNombre)
  const inicialPadre = (padreNombre || '').trim().charAt(0).toUpperCase() || '·'

  return (
    <header className={styles.cabecera}>
      <div className={styles.marco}>
        <button
          type="button"
          className={styles.fotoBtn}
          onClick={onFotoClick}
          aria-label={`Ver la huella de ${nombreHijo}`}
        >
          {actual ? (
            <AnimatePresence initial={false}>
              <motion.img
                key={actual}
                src={actual}
                alt={nombreHijo}
                className={styles.foto}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducido ? 0 : t.lenta, ease: t.easeEstandar }}
              />
            </AnimatePresence>
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              <Escarabajo className={styles.placeholderIcon} />
            </span>
          )}
        </button>

        <div className={styles.velo} aria-hidden="true" />

        <div className={styles.acciones}>
          {bellActive ? (
            <button
              type="button"
              className={styles.campana}
              onClick={onBellClick}
              aria-label={bellHasNew ? 'Tienes un consejo nuevo' : 'Tu consejo del día'}
            >
              <Bell size={18} />
              {bellHasNew && <span className={styles.campanaPunto} aria-hidden="true" />}
            </button>
          ) : (
            <span className={`${styles.campana} ${styles.campanaApagada}`} aria-hidden="true">
              <Bell size={18} />
            </span>
          )}

          <button
            type="button"
            className={styles.padre}
            onClick={onPadreClick}
            aria-label="Tu perfil"
          >
            {padreAvatarUrl
              ? <img src={padreAvatarUrl} alt="" className={styles.padreImg} />
              : <span className={styles.padreInicial}>{inicialPadre}</span>}
          </button>
        </div>

        <h1 className={styles.saludo}>{saludo}</h1>
      </div>
    </header>
  )
}
