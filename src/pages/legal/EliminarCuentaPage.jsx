import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/ui/Logo'
// Reutilizamos el CSS module de la página legal para heredar exactamente el
// mismo header, contenedor y tipografía (Fraunces + Plus Jakarta Sans vía los
// tokens de src/index.css). No se modifica TerminosPage ni su CSS.
import styles from './TerminosPage.module.css'

const CONTACTO = 'contacto@huella.lat'
const FECHA = '15 de julio de 2026'

function Section({ id, title, children }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export default function EliminarCuentaPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>

        {/* Header */}
        <div className={styles.header}>
          <Link to="/login" className={styles.back}>← Volver</Link>
          <Logo className={styles.logo} height={36} />
          <h1 className={styles.pageTitle}>Eliminar tu cuenta de Huella</h1>
          <p className={styles.updated}>Última actualización: {FECHA}</p>
          <p className={styles.intro}>
            En <strong>Huella</strong> puedes eliminar tu cuenta y todos tus datos cuando quieras. Acá te explicamos cómo hacerlo y qué información se borra. Si tienes dudas, escríbenos a{' '}
            <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a>.
          </p>
        </div>

        {/* ─── Cómo eliminar ─── */}
        <Section id="como-eliminar" title="Cómo eliminar tu cuenta">
          <p>
            Tienes dos formas de eliminar tu cuenta de Huella. Cualquiera de las dos borra tu cuenta y toda tu información asociada.
          </p>

          <div className={styles.sub}>
            <h3 className={styles.subTitle}>Opción 1 — Desde la app</h3>
            <ul className={styles.list}>
              <li>Inicia sesión en Huella y entra a tu <strong>perfil</strong>.</li>
              <li>Toca el botón <strong>“Eliminar cuenta”</strong>.</li>
              <li>Confirma la acción cuando la app te lo pida.</li>
            </ul>
            <p>
              El borrado es <strong>inmediato</strong>: tu cuenta y tus datos se eliminan en el momento.
            </p>
          </div>

          <div className={styles.sub}>
            <h3 className={styles.subTitle}>Opción 2 — Por correo</h3>
            <ul className={styles.list}>
              <li>
                Escríbenos a <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a> desde el correo de tu cuenta, pidiendo la eliminación.
              </li>
              <li>Nosotros procesamos la eliminación por ti.</li>
            </ul>
          </div>
        </Section>

        {/* ─── Qué datos se eliminan ─── */}
        <Section id="que-se-elimina" title="Qué datos se eliminan">
          <p>
            Al eliminar tu cuenta se borran <strong>todos tus datos personales</strong>, incluyendo:
          </p>
          <ul className={styles.list}>
            <li>Tu perfil y tus datos de cuenta.</li>
            <li>Los datos de tus hijos (nombre, edad y demás información que hayas registrado).</li>
            <li>Los episodios que registraste.</li>
            <li>Los hitos y logros.</li>
            <li>Las estrategias generadas.</li>
            <li>Las fotos que hayas subido.</li>
            <li>Cualquier otro registro asociado a tu cuenta.</li>
          </ul>
          <div className={styles.alertBox}>
            Los datos de los menores se eliminan junto con la cuenta. No conservamos información identificable de tu hijo o hija.
          </div>
        </Section>

        {/* ─── Plazos de retención ─── */}
        <Section id="retencion" title="Plazos de retención">
          <ul className={styles.list}>
            <li>Tus <strong>datos personales</strong> se eliminan en un plazo máximo de <strong>30 días</strong>.</li>
            <li>Podemos conservar <strong>registros técnicos mínimos</strong>, sin datos personales identificables, por hasta <strong>90 días</strong> por seguridad del sistema.</li>
            <li>Los <strong>datos de los menores</strong> se eliminan junto con la cuenta.</li>
          </ul>
        </Section>

        {/* ─── Contacto ─── */}
        <Section id="contacto" title="Contacto">
          <p>
            Si tienes preguntas sobre la eliminación de tu cuenta o tus datos, escríbenos:
          </p>
          <div className={styles.contactBox}>
            <p><strong>Equipo de Huella</strong></p>
            <a href={`mailto:${CONTACTO}`} className={styles.contactEmail}>{CONTACTO}</a>
          </div>
          <p>
            Respondemos en menos de 5 días hábiles.
          </p>
        </Section>

        <div className={styles.footer}>
          <Link to="/terminos" className={styles.footerLink}>← Términos y Privacidad</Link>
          <Link to="/login" className={styles.footerLink}>Iniciar sesión →</Link>
        </div>

      </div>
    </div>
  )
}
