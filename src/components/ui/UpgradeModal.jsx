import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { iniciarSuscripcion } from '../../services/pago'
import ErrorPago from './ErrorPago'
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
  // Código HP-XXXXXX que devuelve el endpoint cuando el intento falla. Puede
  // quedar en null si el registro no alcanzó a escribir.
  const [referenciaPago, setReferenciaPago] = useState(null)

  // Si el usuario vuelve atrás desde el checkout de MP, el navegador puede
  // restaurar la página desde el bfcache con el modal abierto y `cargando`
  // todavía en true: el CTA queda pegado y deshabilitado, sin error ni
  // redirect. `pageshow` con event.persisted es la señal de esa restauración.
  useEffect(() => {
    function alRestaurar(e) {
      if (e.persisted) setCargando(false)
    }
    window.addEventListener('pageshow', alRestaurar)
    return () => window.removeEventListener('pageshow', alRestaurar)
  }, [])

  // CTA principal: inicia el pago directo desde el modal (mismo flujo que
  // CuentaPage, vía el helper compartido). El error NO cierra el modal.
  //
  // SIN guard de `cargando` a propósito: es el cuerpo compartido entre el CTA
  // normal y el botón de reintentar. El guard vive en handleActivar; reintentar
  // NO pasa por él, así que aunque el estado de carga quedara pegado, ese botón
  // siempre puede disparar un intento nuevo.
  async function dispararPago() {
    setCargando(true)
    setError('')
    setReferenciaPago(null)
    try {
      const initPoint = await iniciarSuscripcion(ciclo)
      window.location.href = initPoint
    } catch (err) {
      console.error('UpgradeModal handleActivar error:', err, err?.detail)
      setError('No pudimos abrir el pago. Intenta de nuevo en un momento.')
      // El endpoint devuelve la referencia dentro del cuerpo del error.
      setReferenciaPago(err?.detail?.referencia ?? null)
      setCargando(false)
    }
  }

  function handleActivar() {
    if (cargando) return
    dispararPago()
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

        {error && (
          <ErrorPago
            referencia={referenciaPago}
            onReintentar={dispararPago}
            cargando={cargando}
          />
        )}

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
