import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { canModify } from '../../utils/authorDisplay'
import CerrarPatronModal from '../../components/patron/CerrarPatronModal'
import PieCientifico from '../../components/patron/PieCientifico'
import shared from './PatronPage.module.css'   // reusa header/bloques/cierre de Fase B
import styles from './PatronLecturaPage.module.css'

// Header mocha idéntico al del formulario / salidas de Fase B.
function Header({ onBack }) {
  return (
    <header className={shared.header}>
      {onBack && (
        <button className={shared.headerBack} onClick={onBack} aria-label="Atrás" type="button">←</button>
      )}
      <h1 className={shared.headerTitulo}>Algo que aún no cambia</h1>
    </header>
  )
}

function Bloque({ variante, titulo, children }) {
  return (
    <div className={`${shared.bloque} ${shared['bloque_' + variante]}`}>
      <h3 className={shared.bloqueTitulo}>{titulo}</h3>
      <p className={shared.bloqueCuerpo}>{children}</p>
    </div>
  )
}

// Modo lectura de un patrón ya analizado. Repinta los tres bloques guardados en
// orientacion_ia. Si es 'derivar', conserva el cierre médico (es la única
// información que importa en ese caso). Deja cerrar el patrón, salvo que ya
// esté cerrado.
export default function PatronLecturaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dataLoaded, cerrarPatron } = useHuella()
  const { user } = useAuth()
  const [showCerrar, setShowCerrar] = useState(false)

  const patron = (state.patrones || []).find((p) => p.id === id)

  // Guard: si no existe (deep-link a un id ajeno o inexistente), a Home.
  useEffect(() => {
    if (dataLoaded && !patron) navigate('/panel', { replace: true })
  }, [dataLoaded, patron, navigate])

  if (!patron) return null

  const o = patron.orientacion_ia || {}
  const estrategiaId = patron.estrategia_id
  const esDerivar = patron.clasificacion === 'derivar'
  const cerrado = patron.estado === 'cerrado'
  // "Cerrar esto" solo para el autor (misma convención que editar/borrar en la
  // app). Si lo anotó la pareja, el botón no aparece — ni deshabilitado ni con
  // mensaje. El try/catch del cierre queda igual como red de seguridad.
  const esMio = canModify(patron.user_id, user?.id)

  async function handleCerrar(motivo) {
    try {
      await cerrarPatron(patron.id, motivo)
      navigate('/panel')
    } catch (e) {
      // Caso raro (solo el creador puede cerrar). No dejamos la promesa colgada.
      console.warn('cerrar patron falló', e)
      setShowCerrar(false)
    }
  }

  return (
    <div className={shared.page}>
      <Header onBack={() => navigate(-1)} />
      <div className={shared.body}>
        <div className={shared.bloques}>
          <Bloque variante="pasando" titulo="Qué está pasando">{o.que_esta_pasando}</Bloque>
          <Bloque variante="ayuda"   titulo="Qué ayuda">{o.que_ayuda}</Bloque>
          <Bloque variante="empeora" titulo="Qué lo empeora">{o.que_lo_empeora}</Bloque>
        </div>

        {esDerivar && (
          <div className={shared.cierreDerivar}>
            <h3 className={shared.cierreTitulo}>Esto conviene verlo con alguien</h3>
            <p className={shared.cierreCuerpo}>
              Huella no diagnostica. Esto se sale de lo que yo puedo acompañar, y conversarlo con el pediatra es lo que más ayuda.
            </p>
          </div>
        )}

        {/* En 'derivar' el cierre médico de arriba ya dice que Huella no
            diagnostica: el descargo sobra y le resta peso. */}
        <PieCientifico marco={o.marco_aplicado} sinDescargo={esDerivar} />

        <div className={styles.footer}>
          {estrategiaId && (
            <button
              type="button"
              className={styles.verPlan}
              onClick={() => navigate(`/estrategias/${estrategiaId}`)}
            >
              Ver el plan
            </button>
          )}
          {!cerrado && esMio && (
            <button type="button" className={shared.btnSecundario} onClick={() => setShowCerrar(true)}>
              Cerrar esto
            </button>
          )}
        </div>
      </div>

      {showCerrar && (
        <CerrarPatronModal
          onClose={() => setShowCerrar(false)}
          onConfirm={handleCerrar}
        />
      )}
    </div>
  )
}
