import React from 'react'
import { ArrowLeft, ChevronRight, Plus, ListChecks, Stethoscope } from 'lucide-react'
import styles from './PiezasPregunta.module.css'

// ──────────────────────────────────────────────────────────────────────
// Piezas de "Preguntar a Huella" que se repiten entre la conversación
// (/preguntar) y el detalle guardado en Momentos (/pregunta/:id).
// ──────────────────────────────────────────────────────────────────────

export const PIE_EVIDENCIA = 'Esto se apoya en evidencia del desarrollo infantil. No es un diagnóstico.'

// Volver + el hijo (inicial, nombre y edad). `derecha` es el lugar de
// "Terminar" en la conversación.
export function CabeceraHijo({ hijo, onVolver, derecha = null }) {
  const nombre = hijo?.nombre || ''
  return (
    <div className={styles.cabecera}>
      <button type="button" className={styles.volver} onClick={onVolver} aria-label="Volver">
        <ArrowLeft size={20} />
      </button>
      <div className={styles.hijo}>
        <span className={styles.inicial} aria-hidden="true">{nombre.charAt(0).toUpperCase()}</span>
        <div className={styles.hijoTexto}>
          <span className={styles.hijoNombre}>{nombre}</span>
          {hijo?.edad != null && <span className={styles.hijoEdad}>{hijo.edad} {hijo.edad === 1 ? 'año' : 'años'}</span>}
        </div>
      </div>
      {derecha}
    </div>
  )
}

// Una respuesta de Huella con su pie de evidencia y la lente.
export function TarjetaRespuesta({ respuesta, lente }) {
  return (
    <section className={styles.tarjeta}>
      <p className={styles.respuesta}>{respuesta}</p>
      <div className={styles.divisor} />
      <p className={styles.pie}>{PIE_EVIDENCIA}{lente ? ` Lente: ${lente}` : ''}</p>
    </section>
  )
}

export function TarjetaResumen({ resumen }) {
  return (
    <section className={styles.tarjetaResumen}>
      <span className={styles.eyebrow}>En resumen</span>
      <p className={styles.resumen}>{resumen}</p>
    </section>
  )
}

// El único paso siguiente. "Conversarlo con su pediatra" no lleva a ninguna
// pantalla: es algo que el papá hace afuera, así que va sin chevron.
const PASOS = {
  registrar: { texto: 'Registrar lo que pasó', tono: 'registrar', icono: <Plus size={20} /> },
  algo_que_no_cambia: { texto: 'Abrirlo en Algo que aún no cambia', tono: 'patron', icono: <span className={styles.emoji}>🌀</span> },
  plan: { texto: 'Armar un plan', tono: 'plan', icono: <ListChecks size={20} /> },
  especialista: { texto: 'Conversarlo con su pediatra', tono: 'especialista', icono: <Stethoscope size={20} /> },
}

export function PasoSiguiente({ paso, onIr }) {
  const p = PASOS[paso]
  if (!p) return null
  const contenido = (
    <>
      <span className={`${styles.pasoIcono} ${styles[`icono_${p.tono}`]}`} aria-hidden="true">{p.icono}</span>
      <span className={styles.pasoTexto}>{p.texto}</span>
      {paso !== 'especialista' && <ChevronRight size={18} className={styles.pasoChevron} aria-hidden="true" />}
    </>
  )
  return paso === 'especialista'
    ? <div className={`${styles.paso} ${styles[`paso_${p.tono}`]}`}>{contenido}</div>
    : <button type="button" className={`${styles.paso} ${styles[`paso_${p.tono}`]}`} onClick={() => onIr(paso)}>{contenido}</button>
}

// A dónde lleva cada paso.
export function rutaDelPaso(paso) {
  if (paso === 'registrar') return '/registro'
  if (paso === 'algo_que_no_cambia') return '/patron'
  if (paso === 'plan') return '/estrategias'
  return null
}
