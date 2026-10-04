import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '../../components/ui/Logo'
import styles from './TerminosPage.module.css'
import PoliticaPrivacidad, { Section, CONTACTO, FECHA } from './PoliticaPrivacidad'

export default function TerminosPage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [hash])

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>

        {/* Header */}
        <div className={styles.header}>
          <Link to="/signup" className={styles.back}>← Volver</Link>
          <Logo className={styles.logo} height={36} />
          <h1 className={styles.pageTitle}>Términos y Privacidad</h1>
          <p className={styles.updated}>Última actualización: {FECHA}</p>
          <p className={styles.intro}>
            Sabemos que leer estas cosas es tedioso. Por eso lo escribimos en lenguaje humano, sin letra chica ni trucos. Si tienes preguntas, escríbenos a{' '}
            <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a>.
          </p>
        </div>

        {/* Índice */}
        <nav className={styles.toc}>
          <p className={styles.tocTitle}>En esta página</p>
          <ul className={styles.tocList}>
            <li><a href="#terminos" className={styles.tocLink}>Términos de uso</a></li>
            <li><a href="#que-es" className={styles.tocLink}>Qué es Huella</a></li>
            <li><a href="#no-es" className={styles.tocLink}>Lo que Huella no es</a></li>
            <li><a href="#privacidad" className={styles.tocLink}>Política de privacidad</a></li>
            <li><a href="#datos-menores" className={styles.tocLink}>Datos de tus hijos</a></li>
            <li><a href="#tus-derechos" className={styles.tocLink}>Tus derechos</a></li>
            <li><a href="#contacto" className={styles.tocLink}>Contacto</a></li>
          </ul>
        </nav>

        {/* ─── TÉRMINOS DE USO ─── */}
        <div className={styles.partHeader} id="terminos">
          <span className={styles.partBadge}>Parte 1</span>
          <h2 className={styles.partTitle}>Términos de uso</h2>
        </div>

        <Section id="que-es" title="Qué es Huella">
          <p>
            Huella es una herramienta digital de apoyo a la crianza. Te ayuda a registrar episodios difíciles con tu hijo o hija, identificar patrones en su comportamiento y recibir orientación basada en evidencia del desarrollo infantil, la neurociencia y la teoría del apego.
          </p>
          <p>
            Huella está dirigida a <strong>padres, madres y cuidadores adultos</strong>. No está diseñada para ser usada directamente por niños o adolescentes menores de 18 años.
          </p>
          <p>
            El responsable de la plataforma es <strong>Daniel Undurraga R.</strong>, con domicilio en Chile. Puedes contactarnos en <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a>.
          </p>
        </Section>

        <Section id="no-es" title="Lo que Huella no es">
          <div className={styles.alertBox}>
            <strong>Huella no es un servicio de salud ni reemplaza a ningún profesional.</strong>
          </div>
          <p>
            La orientación que entrega Huella está basada en marcos del desarrollo infantil ampliamente reconocidos. Sin embargo:
          </p>
          <ul className={styles.list}>
            <li>No constituye un diagnóstico clínico, psicológico ni médico.</li>
            <li>No reemplaza la consulta con psicólogos, pediatras, psicopedagogos ni otros especialistas.</li>
            <li>No es un servicio de emergencias. Si tu hijo o hija está en peligro inmediato, llama al 131 (SAMU) o al 147 (OPD).</li>
          </ul>
          <p>
            Siempre que la situación lo requiera, Huella te sugerirá buscar apoyo profesional.
          </p>
        </Section>

        <Section id="uso-correcto" title="Uso correcto de la plataforma">
          <p>Al usar Huella, aceptas que:</p>
          <ul className={styles.list}>
            <li>Eres mayor de 18 años.</li>
            <li>Usarás la plataforma solo para fines de apoyo a la crianza.</li>
            <li>No ingresarás información falsa, de terceros sin su consentimiento, ni contenido que infrinja derechos de otras personas.</li>
            <li>Eres responsable de mantener la seguridad de tu cuenta y contraseña.</li>
          </ul>
        </Section>

        <Section id="disponibilidad" title="Disponibilidad del servicio">
          <p>
            Huella se entrega "tal como está". Hacemos todo lo posible por mantenerla funcionando, pero no garantizamos disponibilidad ininterrumpida. Podemos suspender, modificar o discontinuar el servicio con previo aviso cuando sea posible.
          </p>
          <p>
            No somos responsables de daños directos o indirectos derivados del uso o la imposibilidad de usar la plataforma, siempre que cumplamos con los estándares de cuidado razonables.
          </p>
        </Section>

        {/* ─── POLÍTICA DE PRIVACIDAD ─── */}
        <div className={styles.partHeader} id="privacidad">
          <span className={styles.partBadge}>Parte 2</span>
          <h2 className={styles.partTitle}>Política de privacidad</h2>
        </div>

        <PoliticaPrivacidad />

        <div className={styles.footer}>
          <Link to="/signup" className={styles.footerLink}>← Volver al registro</Link>
          <Link to="/privacidad" className={styles.footerLink}>Política de privacidad</Link>
          <Link to="/login" className={styles.footerLink}>Iniciar sesión →</Link>
        </div>

      </div>
    </div>
  )
}
