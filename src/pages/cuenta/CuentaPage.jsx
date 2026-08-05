import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Zap, Camera, Users, Check, Bell } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { supabase } from '../../lib/supabase'
import { iniciarSuscripcion } from '../../services/pago'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import CanjeCodigoBeta from '../../components/CanjeCodigoBeta'
import ErrorPago from '../../components/ui/ErrorPago'
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
  const { isPro, isAdmin, reloadData } = useHuella()
  const navigate = useNavigate()
  const [verTodo, setVerTodo] = useState(false)
  const [ciclo, setCiclo] = useState('mensual')   // 'mensual' | 'anual' — mensual por defecto
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  // Código HP-XXXXXX que devuelve el endpoint cuando el intento falla. Puede
  // quedar en null si el registro no alcanzó a escribir; el bloque de error
  // se ve bien igual.
  const [referenciaPago, setReferenciaPago] = useState(null)
  // Microestado de la verificación al volver del checkout (?suscripcion=ok).
  const [verificando, setVerificando] = useState(false)
  const [avisoPago, setAvisoPago] = useState('')

  // Control permanente de notificaciones push. Reutiliza el MISMO hook que el
  // NotifBanner (permission/isSupported/requestPermission); no duplica la lógica
  // de suscripción. Da un camino a activar push aunque el banner se haya
  // descartado (su X es permanente).
  const {
    permission: notifPermission,
    isSupported: notifSoportado,
    requestPermission: pedirNotif,
  } = usePushNotifications()
  const [notifCargando, setNotifCargando] = useState(false)

  const pro = isPro()
  const admin = isAdmin()
  const planLabel = admin ? 'Admin' : pro ? 'Pro' : 'Gratuito'

  // ── Red de seguridad del pago (Paso 3) — RESPALDO del webhook ──
  // Al volver del checkout a /cuenta?suscripcion=ok, consultamos a MP el estado
  // real de la suscripción hasta 3 veces (inmediato, +2s, +4s). En cuanto una
  // respuesta traiga una suscripción authorized del usuario, activamos el plan
  // por backend, refrescamos isPro() con reloadData() y cortamos los reintentos.
  // Si tras los 3 intentos sigue sin confirmar, NO mostramos error duro:
  // confiamos en que el webhook complete.
  //
  // Robustez: reloadData va por ref (no como dependencia) para que un re-render
  // del provider durante los ~6s de reintentos NO re-dispare ni aborte la
  // verificación en curso. El efecto corre UNA sola vez al montar (deps []); el
  // cleanup solo cancela al desmontar (salir de la página). El param se lee de
  // window.location al montar para no depender del router en este efecto.
  const reloadDataRef = useRef(reloadData)
  reloadDataRef.current = reloadData

  const yaVerificado = useRef(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('suscripcion') !== 'ok') return
    if (yaVerificado.current) return
    yaVerificado.current = true

    let cancelado = false
    const DELAYS = [0, 2000, 4000]
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    async function verificar() {
      setVerificando(true)
      setAvisoPago('')
      let confirmado = false

      for (let intento = 0; intento < DELAYS.length && !cancelado; intento++) {
        if (DELAYS[intento] > 0) await sleep(DELAYS[intento])
        if (cancelado) break
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('/api/mp-verificar-suscripcion', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${session?.access_token}`,
            },
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok && data.pro) {
            confirmado = true
            break
          }
        } catch (err) {
          console.error('Verificación de suscripción falló (intento ' + intento + '):', err)
        }
      }

      if (cancelado) return

      if (confirmado) {
        reloadDataRef.current()      // refresca state.plan → isPro() pasa a true sin recargar
      } else {
        setAvisoPago('Estamos confirmando tu pago, puede tardar unos minutos.')
      }
      setVerificando(false)

      // Limpiamos el query param SIN pasar por el router: replaceState no
      // re-monta ni resetea CuentaPage, así avisoPago recién seteado sobrevive.
      // Un refresh ya no re-dispara la verificación (no queda ?suscripcion=ok).
      window.history.replaceState(null, '', '/cuenta')
    }

    verificar()
    return () => { cancelado = true }
    // Corre una sola vez al montar a propósito: navigate/reloadData van por ref
    // (arriba) para no re-disparar ni abortar la verificación en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si el usuario vuelve atrás desde el checkout de MP, el navegador puede
  // restaurar esta página desde el bfcache con `cargando` todavía en true: el
  // botón queda pegado en "Redirigiéndote al pago…" y deshabilitado, sin error
  // ni redirect. `pageshow` con event.persisted es la señal de esa restauración;
  // reponemos el estado para que el botón vuelva a responder.
  useEffect(() => {
    function alRestaurar(e) {
      if (e.persisted) setCargando(false)
    }
    window.addEventListener('pageshow', alRestaurar)
    return () => window.removeEventListener('pageshow', alRestaurar)
  }, [])

  // Crea la suscripción en Mercado Pago para el ciclo elegido y redirige al
  // checkout alojado (init_point). El usuario ingresa la tarjeta en la página
  // de MP; nosotros no manejamos datos de tarjeta.
  //
  // SIN guard de `cargando` a propósito: es el cuerpo compartido entre el CTA
  // normal y el botón de reintentar. El guard vive en handleActivar; reintentar
  // NO pasa por él, así que aunque el estado de carga quedara pegado, ese botón
  // siempre puede disparar un intento nuevo.
  async function dispararPago() {
    setCargando(true)
    setError('')
    setReferenciaPago(null)
    try {
      const initPoint = await iniciarSuscripcion(ciclo)
      window.location.href = initPoint
    } catch (err) {
      console.error('handleActivar error:', err, err?.detail)
      setError('No pudimos abrir el pago. Intenta de nuevo en un momento.')
      // El endpoint devuelve la referencia dentro del cuerpo del error.
      setReferenciaPago(err?.detail?.referencia ?? null)
      setCargando(false)
    }
  }

  function handleActivar() {
    if (cargando) return
    dispararPago()
  }

  // Pide el permiso de notificaciones vía el hook. Al resolverse, el hook
  // actualiza `permission` y esta pantalla re-renderiza al estado correcto.
  async function handleActivarNotif() {
    if (notifCargando) return
    setNotifCargando(true)
    try {
      await pedirNotif()
    } finally {
      setNotifCargando(false)
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

        {verificando && (
          <p className={styles.activoMsg}>Confirmando tu suscripción…</p>
        )}
        {avisoPago && (
          <p className={styles.activoMsg}>{avisoPago}</p>
        )}

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
          {error && (
            <ErrorPago
              referencia={referenciaPago}
              onReintentar={dispararPago}
              cargando={cargando}
            />
          )}
        </>
      )}

      {/* ── Canje de codigo de beta — alternativa al pago. Va FUERA del {!pro}
           de arriba a proposito: se auto-esconde si ya es Pro, pero cuando el
           canje sale OK conserva visible la confirmacion en verde en el mismo
           instante en que isPro() pasa a true. ── */}
      <div style={{ marginTop: '16px' }}>
        <CanjeCodigoBeta />
      </div>

      {/* ── Notificaciones — control permanente de push, independiente del
           NotifBanner efímero. Visible para todos (Pro y gratuito). ── */}
      <section className={styles.beneficios}>
        <div className={styles.beneficioCard}>
          <div className={styles.beneficioIcon}>
            <Bell size={20} />
          </div>
          <div>
            <h2 className={styles.beneficioTitulo}>Notificaciones</h2>
            {!notifSoportado ? (
              <p className={styles.beneficioDesc}>
                Este dispositivo no admite notificaciones aquí. En iPhone, agrega Huella a la pantalla
                de inicio y ábrela desde el ícono.
              </p>
            ) : notifPermission === 'granted' ? (
              <>
                <p className={styles.beneficioDesc}>
                  Recibirás los recordatorios y check-ins de Huella en este dispositivo.
                </p>
                <p className={styles.notifActivo}>
                  <Check size={16} />
                  Notificaciones activadas
                </p>
              </>
            ) : notifPermission === 'denied' ? (
              <p className={styles.beneficioDesc}>
                Bloqueaste las notificaciones. Para volver a activarlas, permítelas desde los ajustes
                de tu teléfono o navegador.
              </p>
            ) : (
              <>
                <p className={styles.beneficioDesc}>
                  Activa recordatorios y check-ins suaves para no perder el hilo con tu hijo.
                </p>
                <button
                  className={styles.notifBtn}
                  onClick={handleActivarNotif}
                  disabled={notifCargando}
                >
                  {notifCargando ? 'Activando…' : 'Activar notificaciones'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
