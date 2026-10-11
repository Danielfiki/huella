import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { iniciarSuscripcion } from '../../services/pago'
import ErrorPago from './ErrorPago'
import LineaRetracto from './LineaRetracto'
import { textosWeb } from '../../services/preciosWeb'
import { estaEnAppAndroid } from '../../pages/portada/destinoRaiz'
import { useHuella } from '../../context/HuellaContext'
import { usePlayBilling, ofrecerCompraPlay, textosPlay, comprarConPlay, MENSAJE_PENDIENTE, mensajeErrorPlay } from '../../services/playBilling'
import styles from './UpgradeModal.module.css'

const FEATURES = [
  'Estrategias de 4 semanas con tareas concretas',
  'Exportar informes PDF del historial',
  'Registro ilimitado de episodios',
  'Seguimiento post-episodio (check-in)',
]

export default function UpgradeModal({ onClose, tituloCustom, mensajeCustom, tituloAndroid, mensajeAndroid }) {
  const navigate = useNavigate()
  const [ciclo, setCiclo] = useState('mensual')   // 'mensual' | 'anual' — mensual por defecto
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  // Código HP-XXXXXX que devuelve el endpoint cuando el intento falla. Puede
  // quedar en null si el registro no alcanzó a escribir.
  const [referenciaPago, setReferenciaPago] = useState(null)
  const { isPro, reloadData } = useHuella()
  const play = usePlayBilling()
  // App de Android con Google Play disponible: mismo modal que la web, con los
  // precios de Google y la compra por Google Play. Sin Google Play, el aviso
  // neutro de siempre (más abajo).
  const conPlay = estaEnAppAndroid() && ofrecerCompraPlay(play, isPro())
  const [avisoPlay, setAvisoPlay] = useState('')

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

  async function comprarPlay() {
    setCargando(true)
    setError('')
    setAvisoPlay('')
    try {
      const r = await comprarConPlay(ciclo)
      if (r.estado === 'activo') { await reloadData(); onClose(); return }
      if (r.error) setError(r.error)
      else if (r.estado === 'pendiente') setAvisoPlay(MENSAJE_PENDIENTE)
    } catch (err) {
      console.error('UpgradeModal comprarPlay error:', err)
      setError(mensajeErrorPlay(err))
    }
    setCargando(false)
  }

  function handleActivar() {
    if (cargando) return
    if (conPlay) comprarPlay()
    else dispararPago()
  }

  // Enlace secundario discreto: lleva al detalle completo en CuentaPage.
  function verTodoPro() {
    onClose()
    navigate('/cuenta')
  }

  // App de Android (Google Play): sin precios, sin CTA de pago y sin enlace a
  // /cuenta. Solo avisa que no viene en el plan gratuito y se cierra.
  // `mensajeAndroid` vacio ('') no muestra bajada. Si se acaba de comprar con
  // Google en este modal y el servidor no activó Pro, la oferta desaparece y
  // cae acá: se muestra lo que pasó con la compra en vez de la bajada.
  if (estaEnAppAndroid() && !conPlay) {
    const bajada = avisoPlay || (mensajeAndroid ?? 'Esto no viene en el plan gratuito.')
    return createPortal(
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.titulo}>{tituloAndroid || tituloCustom || 'Plan gratuito'}</h2>
            {error
              ? <p className={styles.error}>{error}</p>
              : bajada && <p className={styles.bajada}>{bajada}</p>}
          </div>
          <button className={styles.cta} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // Textos con los precios de Google (solo en la app de Android con Google Play).
  const tp = conPlay ? textosPlay(play, ciclo) : null
  // Web (Mercado Pago): precios fijos, sin prueba gratis.
  const tw = textosWeb(ciclo)

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
            <span className={styles.cicloMonto}>{tp ? tp.precioMensual : tw.precioMensual}</span>
            <span className={styles.cicloPeriodo}>/mes</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={ciclo === 'anual'}
            className={`${styles.cicloOption} ${ciclo === 'anual' ? styles.cicloOptionActive : ''}`}
            onClick={() => setCiclo('anual')}
          >
            <span className={styles.cicloMonto}>{tp ? tp.precioAnual : tw.precioAnual}</span>
            <span className={styles.cicloPeriodo}>/año</span>
            {(tp ? tp.ahorro : tw.ahorro) && (
              <span className={styles.ahorroBadge}>{tp ? tp.ahorro : tw.ahorro}</span>
            )}
          </button>
        </div>

        <p className={styles.bajada}>{tp ? (avisoPlay || tp.aviso) : tw.aviso}</p>
        <LineaRetracto className={`${styles.bajada} ${styles.retracto}`} />

        {error && (conPlay
          ? <p className={styles.error}>{error}</p>
          : <ErrorPago
              referencia={referenciaPago}
              onReintentar={dispararPago}
              cargando={cargando}
            />
        )}

        <button className={styles.cta} onClick={handleActivar} disabled={cargando}>
          {conPlay
            ? (cargando ? 'Abriendo Google Play…' : tp.cta)
            : (cargando ? 'Redirigiéndote al pago…' : 'Activar Huella Pro')}
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
