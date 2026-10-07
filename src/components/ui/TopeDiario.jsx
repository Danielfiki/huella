import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import styles from './TopeDiario.module.css'

// ──────────────────────────────────────────────────────────────────────
// Tope diario de IA — el aviso que reemplaza al mensaje genérico ("problema
// temporal… intenta en un rato") cuando lo que pasó es que se acabaron las
// consultas del día. Ese mensaje engañaba: decía "en un rato" y el límite no
// cambia hasta el día siguiente.
//
// El servidor cuenta las consultas por día en UTC (api/anthropic.js arma la
// fecha con toISOString), así que la cuota vuelve a la medianoche UTC. Acá se
// dice esa hora en el reloj del teléfono: en Chile son las 21:00, "hoy" si
// todavía no pasa y "mañana" si ya pasó.
// ──────────────────────────────────────────────────────────────────────

// El error viene de llamarAPI con code = 'limite_diario' o 'limite_mensual'
// (429 propios). Las pantallas llaman a esto antes de mostrar el aviso, así que
// acá mismo queda anotado cuál de los dos topes fue, y el aviso dice el texto
// que corresponde sin que cada pantalla tenga que saberlo.
let topeMensual = false
export function esLimiteDiario(err) {
  if (err?.code === 'limite_mensual') topeMensual = true
  else if (err?.code === 'limite_diario') topeMensual = false
  return err?.code === 'limite_diario' || err?.code === 'limite_mensual'
}

const TEXTO_MENSUAL = 'Este mes ya usaste todas las respuestas de Huella. Se renuevan el día 1.'

// "hoy a las 21:00" o "mañana a las 21:00", en la hora local del teléfono.
export function cuandoVuelve(ahora = new Date()) {
  const reinicio = new Date(ahora)
  reinicio.setUTCHours(24, 0, 0, 0)
  const hora = reinicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
  const mismoDia = reinicio.toDateString() === ahora.toDateString()
  return `${mismoDia ? 'hoy' : 'mañana'} a las ${hora}`
}

// La misma idea en una línea, para los lugares donde el error ya se muestra
// como texto corrido debajo de un botón.
export function mensajeTopeDiario(ahora = new Date()) {
  if (topeMensual) return TEXTO_MENSUAL
  return `Llegaste al límite de hoy. Huella vuelve a responder ${cuandoVuelve(ahora)}.`
}

export default function TopeDiario({ nombreHijo, conBoton = true }) {
  const navigate = useNavigate()
  return (
    <section className={styles.tope} role="status">
      <div className={styles.cabeza}>
        <span className={styles.icono} aria-hidden="true">
          <Clock size={20} />
        </span>
        <h2 className={styles.titulo}>{topeMensual ? 'Ya usaste las respuestas de este mes' : 'Llegaste al límite de hoy'}</h2>
      </div>
      <p className={styles.texto}>
        {topeMensual ? 'Se renuevan el día 1.' : `Huella vuelve a responder ${cuandoVuelve()}.`} Lo que registres igual queda guardado.
      </p>
      {conBoton && (
        <button type="button" className={styles.boton} onClick={() => navigate('/historial')}>
          {nombreHijo ? `Ver los momentos de ${nombreHijo}` : 'Ver los momentos'}
        </button>
      )}
    </section>
  )
}
