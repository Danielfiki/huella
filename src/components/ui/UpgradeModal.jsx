import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { iniciarSuscripcion } from '../../services/pago'
import styles from './UpgradeModal.module.css'

const FEATURES = [
  'Estrategias de 4 semanas con tareas concretas',
  'Exportar informes PDF del historial',
  'Registro ilimitado de episodios',
  'Seguimiento post-episodio (check-in)',
]

export default function UpgradeModal({ onClose, tituloCustom, mensajeCustom }) {
  const navigate = useNavigate()
  const [ciclo, setCiclo] = useState('mensual')   // 'mensual' | 'anual' — mensual por defecto
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // CTA principal: inicia el pago directo desde el modal (mismo flujo que
  // CuentaPage, vía el helper compartido). El error NO cierra el modal.
  async function handleActivar() {
    if (cargando) return
    setCargando(true)
    setError('')
    try {
      const initPoint = await iniciarSuscripcion(ciclo)
      window.location.href = initPoint
    } catch (err) {
      console.error('UpgradeModal handleActivar error:', err, err?.detail)
      setError('No pudimos abrir el pago. Intenta de nuevo en un momento.')
      setCargando(false)
    }
  }

  // Enlace secundario discreto: lleva al detalle completo en CuentaPage.
  function verTodoPro() {
    onClose()
    navigate('/cuenta')
  }

  // Portal a document.body: el modal vive fuera de .pageWrap (que queda con
  // transform tras la animación de página y captura el position:fixed). Así
  // el overlay se ancla al viewport y queda centrado, sin importar el scroll.
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>{tituloCustom || 'Huella Pro'}</h2>
          <p className={styles.bajada}>
            {mensajeCustom || 'Conoce la huella única de tus hijos.'}
          </p>
        </div>

        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f} className={styles.feature}>
              <Check size={16} className={styles.featureCheck} />
              {f}
            </li>
          ))}
        </ul>

        {/* Toggle mensual/anual — mismo lenguaje que CuentaPage */}
        <div className={styles.cicloToggle} role="radiogroup" aria-label="Elige tu ciclo de pago">
          <button
            type="button"
            role="radio"
            aria-checked={ciclo === 'mensual'}
            className={`${styles.cicloOption} ${ciclo === 'mensual' ? styles.cicloOptionActive : ''}`}
            onClick={() => setCiclo('mensual')}
          >
            <span className={styles.cicloMonto}>CLP 9.990</span>
            <span className={styles.cicloPeriodo}>/mes</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={ciclo === 'anual'}
            className={`${styles.cicloOption} ${ciclo === 'anual' ? styles.cicloOptionActive : ''}`}
            onClick={() => setCiclo('anual')}
          >
            <span className={styles.cicloMonto}>CLP 99.900</span>
            <span className={styles.cicloPeriodo}>/año</span>
            <span className={styles.ahorroBadge}>2 meses gratis</span>
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.cta} onClick={handleActivar} disabled={cargando}>
          {cargando ? 'Redirigiéndote al pago…' : 'Activar Huella Pro'}
        </button>
        <button className={styles.verTodo} onClick={verTodoPro}>
          Ver todo lo que incluye Pro
        </button>
        <button className={styles.ahoraNo} onClick={onClose}>
          Ahora no
        </button>
      </div>
    </div>,
    document.body
  )
}
