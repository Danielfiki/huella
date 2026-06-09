import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Zap, Camera, Users, Check } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { supabase } from '../../lib/supabase'
import styles from './CuentaPage.module.css'

// Los 4 beneficios principales de la vitrina (sin emoji, con ícono minimalista).
const BENEFICIOS = [
  {
    icon: Lightbulb,
    titulo: 'Entiende el porqué',
    desc: 'Orientación de IA por episodio y análisis de patrones que conectan el comportamiento de tu hijo en el tiempo.',
  },
  {
    icon: Zap,
    titulo: 'Ten claro qué hacer, incluso en plena crisis',
    desc: 'Acción inmediata para los próximos minutos, consejo diario y estrategias de 4 semanas con tareas concretas.',
  },
  {
    icon: Camera,
    titulo: 'Registra cada avance',
    desc: 'Informe PDF para tu especialista, álbum de fotos y 34 medallas de progreso parental.',
  },
  {
    icon: Users,
    titulo: 'Acompáñalo en familia, sin límites',
    desc: 'Conecta con tu pareja, registra todos los episodios y suma a todos tus hijos sin restricción.',
  },
]

// Lista completa que se despliega en el acordeón "Ver todo lo que incluye Pro".
const TODO_PRO = [
  'Episodios ilimitados',
  'Hijos ilimitados',
  'Orientación IA personalizada por episodio (calibrada a edad y perfil)',
  'Acción inmediata IA — qué hacer en los próximos minutos',
  'Consejo diario personalizado basado en tus datos reales',
  'Análisis de patrones con IA — conexiones entre episodios en el tiempo',
  'Estrategias de 4 semanas con tareas concretas por habilidad',
  'Check-in emocional al día siguiente — seguimiento real de cada episodio',
  'Informe PDF exportable para psicólogo o especialista',
  'Rutina diaria del hijo con marcadores de momentos de riesgo',
  'Notificaciones inteligentes — recordatorios y check-ins automáticos',
  'Álbum de avances con fotos',
  'Medallas y logros — 34 badges de progreso parental',
  'Modo familia — conecta con tu pareja',
]

export default function CuentaPage() {
  const { isPro, isAdmin } = useHuella()
  const navigate = useNavigate()
  const [verTodo, setVerTodo] = useState(false)
  const [ciclo, setCiclo] = useState('mensual')   // 'mensual' | 'anual' — mensual por defecto
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const pro = isPro()
  const admin = isAdmin()
  const planLabel = admin ? 'Admin' : pro ? 'Pro' : 'Gratuito'

  // Crea la suscripción en Mercado Pago para el ciclo elegido y redirige al
  // checkout alojado (init_point). El usuario ingresa la tarjeta en la página
  // de MP; nosotros no manejamos datos de tarjeta.
  async function handleActivar() {
    if (cargando) return
    setCargando(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/mp-crear-suscripcion', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ ciclo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.init_point) {
        console.error('No se pudo iniciar la suscripción:', data)
        setError('No pudimos abrir el pago. Intenta de nuevo en un momento.')
        setCargando(false)
        return
      }
      window.location.href = data.init_point
    } catch (err) {
      console.error('handleActivar error:', err)
      setError('No pudimos abrir el pago. Intenta de nuevo en un momento.')
      setCargando(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.volver} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <span className={`${styles.planChip} ${pro ? styles.planChipPro : styles.planChipFree}`}>
          Plan actual: Huella {planLabel}
        </span>
        <h1 className={styles.promesa}>
          Entiende por qué tu hijo actúa así y acompáñalo mejor
        </h1>

        {pro ? (
          <p className={styles.activoMsg}>
            Tienes acceso completo a todas las funcionalidades de Huella.
          </p>
        ) : (
          <div className={styles.cicloToggle} role="radiogroup" aria-label="Elige tu ciclo de pago">
            <button
              type="button"
              role="radio"
              aria-checked={ciclo === 'mensual'}
              className={`${styles.cicloOption} ${ciclo === 'mensual' ? styles.cicloOptionActive : ''}`}
              onClick={() => setCiclo('mensual')}
            >
              <span className={styles.cicloMonto}>CLP 9.990</span>
              <span className={styles.cicloPeriodo}>/mes</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={ciclo === 'anual'}
              className={`${styles.cicloOption} ${ciclo === 'anual' ? styles.cicloOptionActive : ''}`}
              onClick={() => setCiclo('anual')}
            >
              <span className={styles.cicloMonto}>CLP 99.900</span>
              <span className={styles.cicloPeriodo}>/año</span>
              <span className={styles.ahorroBadge}>2 meses gratis</span>
            </button>
          </div>
        )}
      </section>

      {/* ── Cuatro beneficios principales ── */}
      <section className={styles.beneficios}>
        {BENEFICIOS.map(({ icon: Icon, titulo, desc }) => (
          <div key={titulo} className={styles.beneficioCard}>
            <div className={styles.beneficioIcon}>
              <Icon size={20} />
            </div>
            <div>
              <h2 className={styles.beneficioTitulo}>{titulo}</h2>
              <p className={styles.beneficioDesc}>{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Acordeón: todo lo que incluye Pro ── */}
      <div className={styles.acordeon}>
        <button
          className={styles.acordeonTrigger}
          onClick={() => setVerTodo((v) => !v)}
          aria-expanded={verTodo}
        >
          {verTodo ? '− Ver todo lo que incluye Pro' : '+ Ver todo lo que incluye Pro'}
        </button>
        {verTodo && (
          <ul className={styles.acordeonLista}>
            {TODO_PRO.map((item) => (
              <li key={item} className={styles.acordeonItem}>
                <Check size={16} className={styles.acordeonCheck} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── CTA — dispara la suscripción del ciclo elegido en Mercado Pago ── */}
      {!pro && (
        <>
          <button className={styles.cta} onClick={handleActivar} disabled={cargando}>
            {cargando ? 'Redirigiéndote al pago…' : 'Activar Huella Pro'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </>
      )}
    </div>
  )
}
