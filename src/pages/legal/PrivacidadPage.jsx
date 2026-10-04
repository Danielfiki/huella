import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/ui/Logo'
import styles from './TerminosPage.module.css'
import PoliticaPrivacidad, { CONTACTO, FECHA } from './PoliticaPrivacidad'

// Politica de privacidad en su propia pagina (publica): la que se enlaza en la
// pantalla de Google y en Play. El texto es el mismo de /terminos (Parte 2).
export default function PrivacidadPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>

        <div className={styles.header}>
          <Link to="/login" className={styles.back}>← Volver</Link>
          <Logo className={styles.logo} height={36} />
          <h1 className={styles.pageTitle}>Política de privacidad</h1>
          <p className={styles.updated}>Última actualización: {FECHA}</p>
          <p className={styles.intro}>
            Sabemos que leer estas cosas es tedioso. Por eso lo escribimos en lenguaje humano, sin letra chica ni trucos. Si tienes preguntas, escríbenos a{' '}
            <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a>.
          </p>
        </div>

        <PoliticaPrivacidad />

        <div className={styles.footer}>
          <Link to="/terminos" className={styles.footerLink}>Términos de uso</Link>
          <Link to="/login" className={styles.footerLink}>Iniciar sesión →</Link>
        </div>

      </div>
    </div>
  )
}
