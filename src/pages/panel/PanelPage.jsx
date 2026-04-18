import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, AlertCircle } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { interpretarPatrones } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import ResumenSemanal from '../../modules/panel/ResumenSemanal'
import GraficoEpisodios from '../../modules/panel/GraficoEpisodios'
import styles from './PanelPage.module.css'

export default function PanelPage() {
  const { state } = useHuella()
  const navigate = useNavigate()
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)

  const { hijo, episodios } = state
  const nombre = hijo?.nombre || 'tu hijo'

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
        <h1>Hola</h1>
        <p>Esto es lo que está pasando con {nombre}.</p>
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

      <ResumenSemanal episodios={episodios} />

      {episodios.length >= 5 && (
        <Card className={styles.graficoCard}>
          <h3 className={styles.cardTitle}>Frecuencia de episodios</h3>
          <GraficoEpisodios episodios={episodios} />
        </Card>
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
          <RespuestaIA texto={analisis} loading={loadingAnalisis} />
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
