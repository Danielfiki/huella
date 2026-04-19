import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './TerminosPage.module.css'

const CONTACTO = 'danielundurraga.r@gmail.com'
const FECHA = '19 de abril de 2026'

function Section({ id, title, children }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

function Sub({ title, children }) {
  return (
    <div className={styles.sub}>
      <h3 className={styles.subTitle}>{title}</h3>
      {children}
    </div>
  )
}

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
          <div className={styles.logo}>huella</div>
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

        <Section id="que-recopilamos" title="Qué datos recopilamos">
          <Sub title="Datos de tu cuenta">
            <ul className={styles.list}>
              <li><strong>Email y contraseña</strong> — para crear y proteger tu cuenta. La contraseña se guarda encriptada; nosotros no la vemos.</li>
            </ul>
          </Sub>
          <Sub title="Datos que tú ingresas">
            <ul className={styles.list}>
              <li><strong>Perfil del hijo/a</strong>: nombre y edad.</li>
              <li><strong>Episodios</strong>: tipo, intensidad, contexto, gatillantes posibles, estado emocional del padre o madre al momento del episodio.</li>
              <li><strong>Hitos positivos</strong>: categoría y descripción libre.</li>
              <li><strong>Estrategias</strong>: habilidad a trabajar, descripción y plan generado.</li>
            </ul>
          </Sub>
          <Sub title="Datos técnicos mínimos">
            <ul className={styles.list}>
              <li>Fecha y hora de cada registro.</li>
              <li>Contador de llamadas diarias a la IA (para proteger el servicio de uso abusivo).</li>
            </ul>
          </Sub>
          <p className={styles.note}>
            No recopilamos datos de geolocalización, contactos, ni accedemos a ningún sensor de tu dispositivo. No usamos cookies de seguimiento publicitario.
          </p>
        </Section>

        <Section id="como-usamos" title="Cómo usamos tus datos">
          <ul className={styles.list}>
            <li><strong>Para darte el servicio</strong>: guardar tus registros, generar orientación personalizada de IA, mostrarte tu historial y gráficos de evolución.</li>
            <li><strong>Para mejorar Huella</strong>: análisis agregado y anónimo de uso general (cuántos episodios se registran por día, qué módulos se usan más). Nunca vinculamos este análisis a tu identidad.</li>
            <li><strong>Para comunicarnos contigo</strong>: solo si nos escribes directamente o si hay cambios importantes en el servicio.</li>
          </ul>
          <p>
            <strong>No vendemos ni compartimos tus datos con terceros para publicidad.</strong> Nunca lo haremos.
          </p>
        </Section>

        <Section id="datos-menores" title="Datos de tus hijos">
          <div className={styles.alertBox}>
            Los datos sobre menores de edad son especialmente sensibles. Los tratamos con el mayor cuidado.
          </div>
          <p>
            En Huella, los datos sobre tu hijo o hija los ingresas <strong>tú</strong>, como padre, madre o cuidador adulto. Los menores no crean cuentas ni interactúan directamente con la plataforma.
          </p>
          <p>
            Los datos del menor (nombre, edad, episodios, hitos) están asociados exclusivamente a tu cuenta y solo tú puedes verlos. Nadie más —ni nosotros— accede a esa información de forma rutinaria.
          </p>
          <ul className={styles.list}>
            <li>No compartimos datos de menores con terceros, salvo requerimiento legal expreso.</li>
            <li>No usamos los datos de tu hijo o hija para entrenar modelos de inteligencia artificial.</li>
            <li>Si eliminas tu cuenta, los datos del menor se eliminan junto con ella.</li>
          </ul>
          <p>
            Aplicamos los principios de <strong>minimización de datos</strong> (recopilamos solo lo necesario) y <strong>limitación de finalidad</strong> (los datos se usan solo para lo que declaramos aquí), en cumplimiento de la Ley N° 19.628 sobre Protección de la Vida Privada de Chile.
          </p>
        </Section>

        <Section id="terceros" title="Quién más accede a tus datos">
          <Sub title="Supabase (base de datos y autenticación)">
            <p>
              Guardamos tus datos en <strong>Supabase</strong>, una plataforma de base de datos con sede en San Francisco, EE. UU. Tus datos están protegidos con cifrado en tránsito (TLS) y en reposo, y con políticas de seguridad por fila que garantizan que solo tú puedes leer tus registros. Puedes revisar su política de privacidad en <span className={styles.externalRef}>supabase.com/privacy</span>.
            </p>
          </Sub>
          <Sub title="Anthropic (inteligencia artificial)">
            <p>
              La orientación que genera Huella usa la API de <strong>Anthropic</strong> (creadores de Claude). Cuando pides orientación, el contenido de tu registro (tipo de episodio, intensidad, contexto y gatillantes) se envía a los servidores de Anthropic para generar la respuesta. Anthropic no asocia este contenido con tu identidad.
            </p>
            <p>
              Según la política de uso de la API de Anthropic, los datos enviados a través de la API no se usan para entrenar sus modelos. Puedes revisar su política en <span className={styles.externalRef}>anthropic.com/privacy</span>.
            </p>
          </Sub>
          <Sub title="Vercel (alojamiento web)">
            <p>
              La aplicación está alojada en <strong>Vercel</strong>. Vercel puede registrar metadatos técnicos de cada solicitud (como la dirección IP), pero no accede al contenido de tus datos.
            </p>
          </Sub>
          <p className={styles.note}>
            No usamos ningún otro proveedor de terceros con acceso a datos personales.
          </p>
        </Section>

        <Section id="retencion" title="Cuánto tiempo guardamos tus datos">
          <ul className={styles.list}>
            <li>Tus datos se mantienen mientras tu cuenta esté activa.</li>
            <li>Si eliminas tu cuenta, borramos todos tus datos personales en un plazo de 30 días.</li>
            <li>Podemos conservar registros técnicos mínimos (sin datos personales identificables) por hasta 90 días para seguridad del sistema.</li>
          </ul>
        </Section>

        <Section id="seguridad" title="Cómo protegemos tus datos">
          <ul className={styles.list}>
            <li>Todas las comunicaciones usan cifrado TLS (el candado del navegador).</li>
            <li>Las contraseñas se almacenan con hash seguro; nadie puede verlas en texto plano.</li>
            <li>Cada usuario solo puede acceder a sus propios datos (Row Level Security en Supabase).</li>
            <li>Limitamos el acceso a la API de IA a 20 llamadas por día por usuario para prevenir uso abusivo.</li>
          </ul>
          <p>
            Ningún sistema es 100% infalible. Si detectamos una brecha de seguridad que afecte tus datos, te notificaremos por email en el menor tiempo posible.
          </p>
        </Section>

        <Section id="tus-derechos" title="Tus derechos">
          <p>
            Como usuario de Huella y titular de los datos, tienes derecho a:
          </p>
          <ul className={styles.list}>
            <li><strong>Acceder</strong> a todos los datos que tenemos sobre ti (puedes verlos directamente en la app).</li>
            <li><strong>Rectificar</strong> datos incorrectos (puedes editarlos directamente en la app).</li>
            <li><strong>Eliminar</strong> tu cuenta y todos tus datos — escríbenos a <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a> y lo hacemos en menos de 72 horas.</li>
            <li><strong>Exportar</strong> tus datos en formato PDF desde la sección de Historial.</li>
            <li><strong>Oponerte</strong> al tratamiento de tus datos en cualquier momento.</li>
          </ul>
          <p>
            Estos derechos están reconocidos en la Ley N° 19.628 (Chile). Para ejercerlos, escríbenos a <a href={`mailto:${CONTACTO}`} className={styles.link}>{CONTACTO}</a>.
          </p>
        </Section>

        <Section id="almacenamiento-local" title="Almacenamiento local (localStorage)">
          <p>
            Huella guarda en tu dispositivo una sola preferencia local: si ya viste el onboarding de bienvenida. No guardamos cookies de seguimiento ni datos personales en tu dispositivo.
          </p>
        </Section>

        <Section id="cambios" title="Cambios a esta política">
          <p>
            Si hacemos cambios importantes, te avisaremos por email o con un aviso dentro de la app antes de que entren en vigencia. La fecha de "última actualización" al inicio de esta página siempre reflejará la versión vigente.
          </p>
        </Section>

        <Section id="contacto" title="Contacto">
          <p>
            Si tienes preguntas, dudas o quieres ejercer alguno de tus derechos, escríbenos:
          </p>
          <div className={styles.contactBox}>
            <p><strong>Daniel Undurraga R.</strong></p>
            <p>Responsable de Huella</p>
            <a href={`mailto:${CONTACTO}`} className={styles.contactEmail}>{CONTACTO}</a>
          </div>
          <p>
            Respondemos en menos de 5 días hábiles.
          </p>
        </Section>

        <div className={styles.footer}>
          <Link to="/signup" className={styles.footerLink}>← Volver al registro</Link>
          <Link to="/login" className={styles.footerLink}>Iniciar sesión →</Link>
        </div>

      </div>
    </div>
  )
}
