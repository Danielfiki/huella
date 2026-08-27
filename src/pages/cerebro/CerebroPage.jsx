import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import CerebroContenido from './CerebroContenido'
import styles from './CerebroPage.module.css'

// La ruta /cerebro. Desde el paso 6 es una cáscara: la barra mocha con el
// nombre del hijo, y adentro el mismo CerebroContenido que monta el tab "Su
// cerebro" de HijoPage.
//
// La ruta NO desaparece aunque el tab sea ahora el hogar canónico de la
// pieza: el paso 8 (los enlaces desde la orientación de un episodio hacia la
// zona relevante del cerebro) necesita una URL a la que apuntar.
export default function CerebroPage() {
  const navigate = useNavigate()
  const { state } = useHuella()
  const hijo = state.hijo

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.titulo}>
          {hijo?.nombre ? `El cerebro de ${hijo.nombre}` : 'El cerebro de tu hijo'}
        </h1>
      </div>

      <CerebroContenido />
    </div>
  )
}
