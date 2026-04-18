import React, { useState } from 'react'
import { Star, Plus } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import styles from './HitosPage.module.css'

const CATEGORIAS = [
  { id: 'autorregulacion', label: 'Se calmó solo', emoji: '🌱' },
  { id: 'empatia', label: 'Mostró empatía', emoji: '💛' },
  { id: 'disculpa', label: 'Pidió disculpas', emoji: '🤝' },
  { id: 'frustration', label: 'Toleró un "no"', emoji: '💪' },
  { id: 'social', label: 'Avance social', emoji: '👫' },
  { id: 'otro', label: 'Otro avance', emoji: '⭐' },
]

export default function HitosPage() {
  const { state, addHito } = useHuella()
  const [mostrando, setMostrando] = useState(false)
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  async function handleGuardar() {
    if (!categoria || !descripcion) return
    setLoadingGuardar(true)
    setErrorGuardar('')
    try {
      await addHito({
        id: Date.now().toString(),
        categoria,
        descripcion,
        fecha: new Date().toISOString(),
      })
      setCategoria('')
      setDescripcion('')
      setMostrando(false)
    } catch (e) {
      setErrorGuardar('No se pudo guardar el hito: ' + e.message)
    } finally {
      setLoadingGuardar(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Hitos positivos</h2>
        <Button variant="primary" size="sm" onClick={() => setMostrando(!mostrando)}>
          <Plus size={16} /> Registrar
        </Button>
      </div>

      {mostrando && (
        <Card className={styles.formCard}>
          <p className={styles.label}>¿Qué logró?</p>
          <div className={styles.categoriasGrid}>
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                className={`${styles.catBtn} ${categoria === c.id ? styles.catSelected : ''}`}
                onClick={() => setCategoria(c.id)}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            placeholder="Describe el momento con detalle..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
          />
          <Button
            variant="primary"
            fullWidth
            onClick={handleGuardar}
            disabled={!categoria || !descripcion}
            loading={loadingGuardar}
          >
            Guardar hito
          </Button>
          {errorGuardar && <p className={styles.error}>{errorGuardar}</p>}
        </Card>
      )}

      {state.hitos.length === 0 && !mostrando ? (
        <Card className={styles.emptyCard}>
          <Star size={36} color="var(--color-accent-yellow)" style={{ fill: 'var(--color-accent-yellow)' }} />
          <h3>Registra los avances</h3>
          <p>La primera vez que se calmó solo, que toleró un no, que pidió disculpas. Estos momentos importan.</p>
        </Card>
      ) : (
        <div className={styles.hitosList}>
          {state.hitos.map((h) => {
            const cat = CATEGORIAS.find((c) => c.id === h.categoria)
            return (
              <Card key={h.id} className={styles.hitoCard}>
                <div className={styles.hitoHeader}>
                  <span className={styles.hitoEmoji}>{cat?.emoji || '⭐'}</span>
                  <div>
                    <p className={styles.hitoCategoria}>{cat?.label || h.categoria}</p>
                    <p className={styles.hitoFecha}>
                      {new Date(h.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <p className={styles.hitoDesc}>{h.descripcion}</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
