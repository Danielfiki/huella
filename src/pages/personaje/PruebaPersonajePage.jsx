import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import BienvenidaEscarabajo from '../../components/personaje/BienvenidaEscarabajo'
import OrgullosoEscarabajo from '../../components/personaje/OrgullosoEscarabajo'
import { VARIANTES } from '../../components/personaje/bienvenida'
import { VARIANTES_ORGULLOSO } from '../../components/personaje/orgulloso'
import styles from './PruebaPersonajePage.module.css'

// Pantalla de prueba de la vitrina, DENTRO del Layout: la barra inferior, el
// header y el <main> que desplaza son los mismos del Home, asi el diagnostico
// del Home que no se desplaza en el iPhone corre en las mismas condiciones.
// Solo la cuenta de Daniel (el filtro vive en RutaPruebaPersonaje).
//   ?tipo=orgulloso&v=pulgar|aplauso|jarras
//   ?tipo=bienvenida&modo=A|B|C  (variante Centro; no marca el dia)
export default function PruebaPersonajePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tipo = params.get('tipo')
  const modo = params.get('modo')
  const variante = tipo === 'orgulloso'
    ? VARIANTES_ORGULLOSO.find((v) => v.id === params.get('v'))
    : VARIANTES.find((v) => v.id === 'centro')
  const [vuelta, setVuelta] = useState(0)
  const [corriendo, setCorriendo] = useState(false)
  const [toques, setToques] = useState(0)

  // La animacion busca la barra al montarse: se monta recien cuando la
  // pagina (y el Layout con su barra) ya estan en el DOM.
  useEffect(() => { if (variante) setCorriendo(true) }, [vuelta]) // eslint-disable-line react-hooks/exhaustive-deps

  const titulo = tipo === 'orgulloso' ? `Orgulloso: ${params.get('v')}` : `Bienvenida ${modo}`

  return (
    <div className={styles.pagina}>
      <p className={styles.titulo}>{titulo}</p>
      <p className={styles.ayuda}>Mientras corre, desliza hacia abajo y toca las filas. Toques: {toques}</p>
      <div className={styles.botones}>
        <Button variant="ghost" size="sm" onClick={() => setVuelta((n) => n + 1)} disabled={corriendo}>Repetir</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/personaje')}>Volver a la vitrina</Button>
      </div>
      {Array.from({ length: 14 }, (_, i) => (
        <button key={i} type="button" className={styles.fila} onClick={() => setToques((n) => n + 1)}>
          Fila de prueba {i + 1}
        </button>
      ))}
      {corriendo && (tipo === 'orgulloso'
        ? <OrgullosoEscarabajo key={vuelta} userId={user.id} variante={variante} alTerminar={() => setCorriendo(false)} />
        : <BienvenidaEscarabajo key={vuelta} userId={user.id} variante={variante} prueba={modo} alPrimerCuadro={() => {}} alTerminar={() => setCorriendo(false)} />)}
    </div>
  )
}
