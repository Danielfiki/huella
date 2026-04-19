import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import { interpretarPatrones } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import ResumenSemanal from '../../modules/panel/ResumenSemanal'
import GraficoFrecuenciaSemanal from '../../modules/panel/GraficoFrecuenciaSemanal'
import GraficoIntensidad from '../../modules/panel/GraficoIntensidad'
import GraficoGatillantes from '../../modules/panel/GraficoGatillantes'
import styles from './PanelPage.module.css'

function getPadreNombre(userId) {
  try { return localStorage.getItem(`huella_padre_v1_${userId || 'anon'}`) || '' } catch { return '' }
}

function buildGreeting(hora, padreNombre, nombreHijo, episodiosSemana, diasSinRegistrar, tieneHijo) {
  const saludoBase = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const titulo = padreNombre ? `${saludoBase}, ${padreNombre}.` : `${saludoBase}.`

  if (!tieneHijo) {
    return { titulo, subtitulo: 'Empieza configurando el perfil de tu hijo/a en la pestaña Perfil.' }
  }

  if (diasSinRegistrar !== null && diasSinRegistrar >= 5) {
    return { titulo, subtitulo: `Hace ${diasSinRegistrar} días sin registrar. Retomar el hábito ayuda a ver el patrón con ${nombreHijo}.` }
  }

  if (episodiosSemana > 5) {
    return { titulo, subtitulo: `Llevas una semana intensa con ${nombreHijo}. Que lo estés registrando ya es un gran paso.` }
  }

  if (hora < 12) return { titulo, subtitulo: `¿Cómo empezó ${nombreHijo} hoy?` }
  if (hora < 20) return { titulo, subtitulo: `¿Cómo va ${nombreHijo} esta tarde?` }
  return { titulo, subtitulo: `Registrar antes de dormir ayuda a ver el patrón con ${nombreHijo}.` }
}

export default function PanelPage() {
  const { user } = useAuth()
  const { state } = useHuella()
  const navigate = useNavigate()
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)

  const { hijo, episodios, hitos } = state
  const nombre = hijo?.nombre || 'tu hijo/a'

  const padreNombre = getPadreNombre(user?.id)

  const episodiosSemana = useMemo(() => {
    const hace7 = new Date()
    hace7.setDate(hace7.getDate() - 7)
    return episodios.filter((e) => new Date(e.fecha) >= hace7).length
  }, [episodios])

  const diasSinRegistrar = useMemo(() => {
    if (episodios.length === 0) return null
    const ultimo = new Date(episodios[0].fecha)
    const hoy = new Date()
    return Math.floor((hoy - ultimo) / (1000 * 60 * 60 * 24))
  }, [episodios])

  const hora = new Date().getHours()
  const { titulo, subtitulo } = buildGreeting(hora, padreNombre, nombre, episodiosSemana, diasSinRegistrar, !!hijo)

  async function handleAnalizarPatrones() {
    setLoadingAnalisis(true)
    try {
      const texto = await interpretarPatrones({ hijo, episodios })
      setAnalisis(texto)
    } catch (e) {
      setAnalisis('Error al conectar con la IA: ' + e.message)
    } finally {
      setLoadingAnalisis(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h1>{titulo}</h1>
        <p>{subtitulo}</p>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => navigate('/registro')}
        className={styles.registroBtn}
      >
        <Plus size={20} />
        Registrar episodio
      </Button>

      <ResumenSemanal episodios={episodios} hitos={hitos} />

      {episodios.length >= 3 && (
        <>
          <Card className={styles.graficoCard}>
            <h3 className={styles.cardTitle}>Frecuencia semanal</h3>
            <GraficoFrecuenciaSemanal episodios={episodios} />
          </Card>

          <Card className={styles.graficoCard}>
            <h3 className={styles.cardTitle}>Intensidad en el tiempo</h3>
            <GraficoIntensidad episodios={episodios} />
          </Card>

          <Card className={styles.graficoCard}>
            <h3 className={styles.cardTitle}>Gatillantes más frecuentes</h3>
            <GraficoGatillantes episodios={episodios} />
          </Card>
        </>
      )}

      <Card className={styles.patronesCard}>
        <div className={styles.patronesHeader}>
          <TrendingUp size={18} />
          <h3>Análisis de patrones</h3>
        </div>
        <p className={styles.patronesDesc}>
          {episodios.length < 3
            ? `Registra al menos 3 episodios para activar el análisis de patrones.`
            : `Tienes ${episodios.length} episodios registrados. La IA puede identificar patrones.`}
        </p>
        {episodios.length >= 3 && (
          <Button
            variant="secondary"
            fullWidth
            onClick={handleAnalizarPatrones}
            loading={loadingAnalisis}
            className={styles.patronesBtn}
          >
            Ver análisis de patrones
          </Button>
        )}
        {(analisis || loadingAnalisis) && (
          <RespuestaIA
            texto={analisis}
            loading={loadingAnalisis}
            mensajeCarga="Identificando patrones en el historial..."
          />
        )}
      </Card>

      {episodios.length === 0 && (
        <Card className={styles.emptyCard}>
          <AlertCircle size={32} color="var(--color-primary-light)" />
          <h3>Empieza registrando</h3>
          <p>Cada registro que haces construye el mapa de tu hijo. A más datos, mejor orientación.</p>
        </Card>
      )}
    </div>
  )
}
