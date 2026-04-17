import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { analizarEpisodio } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import styles from './RegistroPage.module.css'

const TIPOS = [
  { id: 'rabieta', label: 'Rabieta', emoji: '😤' },
  { id: 'llanto', label: 'Llanto', emoji: '😢' },
  { id: 'agresividad', label: 'Agresividad', emoji: '😠' },
  { id: 'miedo', label: 'Miedo', emoji: '😨' },
  { id: 'sueño', label: 'Dificultad para dormir', emoji: '😴' },
  { id: 'social', label: 'Rechazo social', emoji: '🙈' },
  { id: 'desconexion', label: 'Desconexión', emoji: '😶' },
  { id: 'otro', label: 'Otro', emoji: '📝' },
]

const GATILLANTES = [
  'Hambre', 'Cansancio', 'Cambio de rutina',
  'Conflicto con pares', 'Pantallas', 'Transiciones',
  'Enfermedad', 'Estrés familiar',
]

export default function RegistroPage() {
  const { state, addEpisodio } = useHuella()
  const navigate = useNavigate()

  const [tipo, setTipo] = useState('')
  const [intensidad, setIntensidad] = useState(3)
  const [contexto, setContexto] = useState('')
  const [gatillantesSeleccionados, setGatillantesSeleccionados] = useState([])
  const [estadoPadre, setEstadoPadre] = useState('')
  const [respuestaIA, setRespuestaIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [guardado, setGuardado] = useState(false)

  function toggleGatillante(g) {
    setGatillantesSeleccionados((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  async function handleGuardar() {
    if (!tipo) return

    const episodio = {
      id: Date.now().toString(),
      tipo,
      intensidad,
      contexto,
      gatillantes: gatillantesSeleccionados,
      estadoPadre,
      fecha: new Date().toISOString(),
    }

    addEpisodio(episodio)
    setGuardado(true)

    if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
      setLoadingIA(true)
      try {
        const texto = await analizarEpisodio({
          hijo: state.hijo,
          episodio,
          historialReciente: state.episodios,
        })
        setRespuestaIA(texto)
      } catch (e) {
        setRespuestaIA('No se pudo conectar con la IA: ' + e.message)
      } finally {
        setLoadingIA(false)
      }
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.titulo}>¿Qué pasó?</h2>

      {!guardado ? (
        <>
          <Card>
            <p className={styles.label}>Tipo de episodio</p>
            <div className={styles.tiposGrid}>
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.tipoBtn} ${tipo === t.id ? styles.tipoSelected : ''}`}
                  onClick={() => setTipo(t.id)}
                >
                  <span className={styles.tipoEmoji}>{t.emoji}</span>
                  <span className={styles.tipoLabel}>{t.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className={styles.label}>Intensidad: <strong>{intensidad}/5</strong></p>
            <input
              type="range"
              min={1}
              max={5}
              value={intensidad}
              onChange={(e) => setIntensidad(Number(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>Leve</span>
              <span>Moderado</span>
              <span>Intenso</span>
            </div>
          </Card>

          <Card>
            <p className={styles.label}>¿Qué estaba pasando antes?</p>
            <textarea
              className={styles.textarea}
              placeholder="Contexto breve del episodio..."
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              rows={3}
            />
          </Card>

          <Card>
            <p className={styles.label}>Posibles gatillantes</p>
            <div className={styles.tagsGrid}>
              {GATILLANTES.map((g) => (
                <button
                  key={g}
                  className={`${styles.tag} ${gatillantesSeleccionados.includes(g) ? styles.tagSelected : ''}`}
                  onClick={() => toggleGatillante(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className={styles.label}>¿Cómo estabas tú en ese momento?</p>
            <textarea
              className={styles.textarea}
              placeholder="Tu estado emocional puede haber influido..."
              value={estadoPadre}
              onChange={(e) => setEstadoPadre(e.target.value)}
              rows={2}
            />
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleGuardar}
            disabled={!tipo}
          >
            Guardar y obtener orientación
          </Button>
        </>
      ) : (
        <div className={styles.guardadoContainer}>
          <Card className={styles.guardadoCard}>
            <p className={styles.guardadoIcon}>✅</p>
            <h3>Episodio registrado</h3>
            <p className={styles.guardadoSub}>
              {TIPOS.find((t) => t.id === tipo)?.emoji}{' '}
              {TIPOS.find((t) => t.id === tipo)?.label} — Intensidad {intensidad}/5
            </p>
          </Card>

          <RespuestaIA texto={respuestaIA} loading={loadingIA} />

          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/panel')}
          >
            Volver al inicio
          </Button>
        </div>
      )}
    </div>
  )
}
