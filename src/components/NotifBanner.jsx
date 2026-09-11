import React, { useState } from 'react'
import { useHuella } from '../context/HuellaContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import Logo from './ui/Logo'
import styles from './NotifBanner.module.css'

const STORAGE_KEY = 'huella_notif_banner_dismissed'

// Cada cuantos dias se vuelve a ofrecer, y cuantas veces como maximo.
const DIAS_ESPERA = 7
const MAX_VECES = 3
const MS_POR_DIA = 24 * 60 * 60 * 1000

// Invitacion a activar el aviso diario (pieza 7 · handoff de Design, 9 sep).
//
// Reemplaza el banner celeste, que estaba en un azul ajeno a la paleta. El
// copy tambien cambio: antes decia "Activa recordatorios para no perder el
// hilo con {nombre}" —"no perder el hilo" le cuelga al padre la idea de que
// ya lo esta perdiendo—. Ahora pregunta y ofrece, y dice de entrada las dos
// cosas que al padre le importan antes de dar un permiso: que es UNA vez al
// dia, y que la hora la elige el.
//
// El descarte NO es para siempre. Antes se guardaba un '1' que no caducaba
// nunca, asi que el papa que dijo "ahora no" la primera vez se quedaba sin
// avisos de por vida: 12 de 24 testers quedaron ahi. Ahora se guarda cuando
// fue y cuantas veces, y a los 7 dias se vuelve a ofrecer, hasta 3 veces.
// El descarte vive en localStorage, o sea que es por dispositivo.

// Lee el descarte guardado; null si nunca se descarto.
//
// Migra el formato viejo ('1', que no traia fecha) tomandolo como un descarte
// hecho recien, y lo REESCRIBE ya migrado. La reescritura es la parte que
// importa: sin ella cada carga de la app volveria a fijar la fecha en ahora,
// los 7 dias no se cumplirian jamas y el banner nunca reapareceria.
function leerDescarte() {
  let crudo = null
  try {
    crudo = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!crudo) return null

  if (crudo === '1') {
    const migrado = { fecha: new Date().toISOString(), veces: 1 }
    guardarDescarte(migrado)
    return migrado
  }

  try {
    const dato = JSON.parse(crudo)
    if (!dato || typeof dato.fecha !== 'string') return null
    return { fecha: dato.fecha, veces: Number(dato.veces) || 0 }
  } catch {
    // Valor corrupto: se trata como si nunca se hubiera descartado. Peor caso,
    // el papa ve el banner una vez de mas.
    return null
  }
}

function guardarDescarte(dato) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dato))
  } catch { /* sin storage (modo privado): el banner reaparece y ya */ }
}

// Se vuelve a ofrecer si pasaron los 7 dias y todavia quedan turnos.
function tocaOfrecer(descarte) {
  if (!descarte) return true
  if (descarte.veces >= MAX_VECES) return false
  const cuando = Date.parse(descarte.fecha)
  if (Number.isNaN(cuando)) return true
  return Date.now() - cuando >= DIAS_ESPERA * MS_POR_DIA
}

export default function NotifBanner() {
  const { state } = useHuella()
  const { permission, isSupported, requestPermission } = usePushNotifications()
  const [descarte, setDescarte] = useState(leerDescarte)
  const [loading, setLoading] = useState(false)

  if (!isSupported) return null
  // Ya lo tiene: no hay nada que ofrecer.
  if (permission === 'granted') return null
  // Lo nego en el navegador, y eso va aparte del "ahora no": el navegador no
  // vuelve a preguntar, asi que insistir con el banner no lleva a ninguna
  // parte. Ese camino se retoma desde los ajustes del telefono, que es lo que
  // explica el bloque de Notificaciones en Cuenta.
  if (permission === 'denied') return null
  if (!tocaOfrecer(descarte)) return null

  const nombreHijo = state.hijo?.nombre || 'tu hijo/a'

  function dismiss() {
    const nuevo = {
      fecha: new Date().toISOString(),
      veces: (descarte?.veces ?? 0) + 1,
    }
    guardarDescarte(nuevo)
    setDescarte(nuevo)
  }

  async function handleActivar() {
    setLoading(true)
    const result = await requestPermission()
    setLoading(false)
    // 'denied' no cuenta como descarte: gastaria un turno que ya no sirve de
    // nada. 'default' es que cerro el dialogo sin elegir, y ahi el banner se
    // queda donde esta.
    if (result === 'granted') dismiss()
  }

  return (
    <div className={styles.banner}>
      <span className={styles.icono} aria-hidden="true">
        <Logo soloSimbolo className={styles.iconoSvg} />
      </span>

      <div>
        <h2 className={styles.titulo}>¿Te aviso una vez al día?</h2>
        <p className={styles.texto}>
          Una pregunta corta sobre {nombreHijo}, a la hora que tú elijas.
        </p>

        <div className={styles.btns}>
          <button
            type="button"
            className={styles.btnActivar}
            onClick={handleActivar}
            disabled={loading}
          >
            {loading ? '…' : 'Activar'}
          </button>
          <button type="button" className={styles.btnDismiss} onClick={dismiss}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
