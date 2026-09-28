import React, { useState, useEffect, lazy, Suspense } from 'react'
import styles from './EscarabajoAvance.module.css'

// El escarabajo grande de la pantalla de avance registrado: capa absoluta a la
// derecha del circulo con la foto, pies al borde inferior del circulo. No
// empuja nada. Mientras Huella lee va el pensando (`cargando`); cuando llega la
// respuesta (`respuesta`) pasa a orgulloso, que se reproduce una vez y se va.
// - Nada se ve hasta el primer cuadro pintado; fundidos de 150 ms.
// - Si pensando no pinta en 2,5 s, no aparece nada. Si orgulloso no pinta en
//   2,5 s, se va el pensando y listo. Nunca un escarabajo quieto.
// - `alCubrir(true/false)`: hay un escarabajo grande a la vista; el chico de la
//   esquina de la foto se desvanece mientras tanto.
const PensandoEscarabajo = lazy(() => import('./PensandoEscarabajo'))
const TOPE_CUADRO = 2500

export default function EscarabajoAvance({ pensando, orgulloso, cargando, respuesta, alCubrir, alMostrarPensando, alMostrarOrgulloso }) {
  const [p, setP] = useState({ dibujado: false, fuera: !pensando })
  const [o, setO] = useState({ dibujado: false, fuera: !orgulloso, visible: true })
  const oMontado = !!respuesta && !o.fuera
  const esperandoOrgulloso = oMontado && !o.dibujado
  const pVisible = cargando || esperandoOrgulloso
  const cubierto = (p.dibujado && !p.fuera && pVisible) || (o.dibujado && !o.fuera && o.visible)

  useEffect(() => { alCubrir?.(cubierto) }, [cubierto]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (p.dibujado) alMostrarPensando?.() }, [p.dibujado]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (o.dibujado) alMostrarOrgulloso?.() }, [o.dibujado]) // eslint-disable-line react-hooks/exhaustive-deps

  // topes: sin primer cuadro en 2,5 s, esa capa sale
  useEffect(() => {
    if (p.fuera || p.dibujado) return undefined
    const id = setTimeout(() => setP((s) => ({ ...s, fuera: true })), TOPE_CUADRO)
    return () => clearTimeout(id)
  }, [p.fuera, p.dibujado])
  useEffect(() => {
    if (!oMontado || o.dibujado) return undefined
    const id = setTimeout(() => setO((s) => ({ ...s, fuera: true })), TOPE_CUADRO)
    return () => clearTimeout(id)
  }, [oMontado, o.dibujado])

  return (
    <div className={styles.capa} aria-hidden="true">
      <Suspense fallback={null}>
        {!p.fuera && (
          <PensandoEscarabajo
            variante={pensando}
            visible={pVisible}
            className={styles.enCaja}
            alDibujar={() => setP((s) => ({ ...s, dibujado: true }))}
            alFallar={() => setP((s) => ({ ...s, fuera: true }))}
            alTerminar={() => setP((s) => ({ ...s, fuera: true }))}
          />
        )}
        {oMontado && (
          <PensandoEscarabajo
            variante={orgulloso}
            visible={o.visible}
            unaVez
            className={styles.enCaja}
            alDibujar={() => setO((s) => ({ ...s, dibujado: true }))}
            alFallar={() => setO((s) => ({ ...s, fuera: true }))}
            alAcabar={() => setO((s) => ({ ...s, visible: false }))}
            alTerminar={() => setO((s) => ({ ...s, fuera: true }))}
          />
        )}
      </Suspense>
    </div>
  )
}
