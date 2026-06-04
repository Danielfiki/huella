import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Zap, Camera, Users, Check } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import UpgradeModal from '../../components/ui/UpgradeModal'
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
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [verTodo, setVerTodo] = useState(false)

  const pro = isPro()
  const admin = isAdmin()
  const planLabel = admin ? 'Admin' : pro ? 'Pro' : 'Gratuito'

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
          <div className={styles.precioWrap}>
            <div className={styles.precioMes}>
              <span className={styles.precioMonto}>CLP 9.990</span>
              <span className={styles.precioPeriodo}> /mes</span>
            </div>
            <div className={styles.precioAnual}>
              <span className={styles.precioAnualMonto}>CLP 99.900 /año</span>
              <span className={styles.ahorroBadge}>20% de ahorro</span>
            </div>
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

      {/* ── CTA — mantiene el handler de upgrade del botón original ── */}
      {!pro && (
        <button className={styles.cta} onClick={() => setShowUpgrade(true)}>
          Activar Huella Pro
        </button>
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
