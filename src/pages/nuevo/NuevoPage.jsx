import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import TooltipAyuda from '../../components/ui/TooltipAyuda'
import styles from './NuevoPage.module.css'

async function compressImage(file, maxSize = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

const CATEGORIAS = [
  { id: 'autorregulacion', label: 'Se calmó solo',   emoji: '🌱' },
  { id: 'empatia',         label: 'Mostró empatía',  emoji: '💛' },
  { id: 'disculpa',        label: 'Pidió disculpas', emoji: '🤝' },
  { id: 'frustration',     label: 'Toleró un "no"',  emoji: '💪' },
  { id: 'social',          label: 'Avance social',   emoji: '👫' },
  { id: 'otro',            label: 'Otro avance',     emoji: '⭐' },
]

export default function NuevoPage() {
  const navigate = useNavigate()
  const { state, addHito, updateHitoFoto } = useHuella()
  const { user } = useAuth()
  const [vista, setVista] = useState('elegir')

  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fotoInputRef = useRef(null)

  // Estados del bloque "Enmarca este momento" (vista 'guardado' sin foto).
  // El bloque solo se muestra si el papá no subió foto en el form principal.
  const [hitoGuardadoId, setHitoGuardadoId] = useState(null)
  const [hitoGuardadoSinFoto, setHitoGuardadoSinFoto] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFotoEnmarca, setErrorFotoEnmarca] = useState('')
  const [fotoEnmarcaUrl, setFotoEnmarcaUrl] = useState(null)
  const enmarcaInputRef = useRef(null)

  function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl)
    setFotoFile(file)
    setFotoPreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }

  function removeFoto() {
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl)
    setFotoFile(null)
    setFotoPreviewUrl('')
  }

  async function handleGuardar() {
    if (!descripcion.trim()) return
    setLoading(true)
    setError('')
    try {
      const hito = {
        id: Date.now().toString(),
        categoria: categoria || 'otro',
        descripcion: descripcion.trim(),
        fecha: new Date().toISOString(),
      }
      const inserted = await addHito(hito)
      const huboFotoEnSubmit = Boolean(fotoFile)
      if (fotoFile && inserted?.id && user) {
        try {
          const blob = await compressImage(fotoFile)
          const path = `${user.id}/${inserted.id}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('momentos')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          if (!uploadError) {
            const { data } = supabase.storage.from('momentos').getPublicUrl(path)
            await updateHitoFoto(inserted.id, `${data.publicUrl}?t=${Date.now()}`)
          }
        } catch { /* foto is non-fatal */ }
      }
      // El bloque "Enmarca este momento" en la vista 'guardado' solo
      // se muestra si el papá NO subió foto en el form principal.
      setHitoGuardadoId(inserted?.id ?? null)
      setHitoGuardadoSinFoto(!huboFotoEnSubmit && Boolean(inserted?.id))
      setFotoEnmarcaUrl(null)
      setErrorFotoEnmarca('')
      setVista('guardado')
    } catch (e) {
      setError('No se pudo guardar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubirFotoEnmarca(e) {
    const file = e.target.files?.[0]
    if (!file || !hitoGuardadoId || !user) return
    setSubiendoFoto(true)
    setErrorFotoEnmarca('')
    try {
      const blob = await compressImage(file)
      const path = `${user.id}/${hitoGuardadoId}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('momentos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data } = supabase.storage.from('momentos').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await updateHitoFoto(hitoGuardadoId, url)
      setFotoEnmarcaUrl(url)
    } catch (err) {
      console.error('Error subiendo foto desde Enmarca:', err)
      setErrorFotoEnmarca('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setSubiendoFoto(false)
      if (enmarcaInputRef.current) enmarcaInputRef.current.value = ''
    }
  }

  // ── ELEGIR ───────────────────────────────────────────────────────────────
  if (vista === 'elegir') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>¿Qué quieres registrar?<TooltipAyuda texto="Mientras más detalles aportes, más precisa será la orientación de Huella." /></h2>
        </div>

        <button
          className={`${styles.opcionCard} ${styles.opcionEpisodio}`}
          onClick={() => navigate('/registro')}
        >
          <span className={styles.opcionEmoji}>🌊</span>
          <div className={styles.opcionTexto}>
            <p className={styles.opcionTitulo}>Un episodio difícil</p>
            <p className={styles.opcionDesc}>Rabieta, llanto, agresividad u otro momento complicado</p>
          </div>
        </button>

        <button
          className={`${styles.opcionCard} ${styles.opcionAvance}`}
          onClick={() => setVista('hito')}
        >
          <span className={styles.opcionEmoji}>⭐</span>
          <div className={styles.opcionTexto}>
            <p className={styles.opcionTitulo}>Un avance</p>
            <p className={styles.opcionDesc}>Se calmó solo, pidió disculpas, toleró un "no" u otro logro</p>
          </div>
        </button>
      </div>
    )
  }

  // ── GUARDADO ─────────────────────────────────────────────────────────────
  if (vista === 'guardado') {
    const nombreHijo = state?.hijo?.nombre || 'tu hijo/a'
    return (
      <div className={styles.page}>
        <div className={styles.guardadoWrap}>
          <p className={styles.guardadoEmoji}>⭐</p>
          <h3 className={styles.guardadoTitulo}>¡Avance registrado!</h3>
          <p className={styles.guardadoSub}>
            Cada logro pequeño cuenta. Lo tienes guardado en tu historial de avances.
          </p>

          {/* Bloque "Enmarca este momento": solo si NO se subió foto
              en el form principal. Permite agregar una foto al hito
              recién creado sin volver a registrar. */}
          {hitoGuardadoSinFoto && (
            <div className={styles.enmarcarCard}>
              <input
                ref={enmarcaInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleSubirFotoEnmarca}
              />
              {fotoEnmarcaUrl ? (
                <div className={styles.enmarcarFotoWrap}>
                  <img src={fotoEnmarcaUrl} alt="Momento" className={styles.enmarcarFoto} />
                  <p className={styles.enmarcarExito}>
                    📸 ¡Momento guardado en el álbum de {nombreHijo}!
                  </p>
                  <button
                    className={styles.enmarcarLinkBtn}
                    type="button"
                    onClick={() => setHitoGuardadoSinFoto(false)}
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.enmarcarEmoji}>📸</span>
                  <p className={styles.enmarcarTitulo}>Enmarca este momento</p>
                  <p className={styles.enmarcarSub}>
                    Agrega una foto de este avance. Quedará en el álbum de crecimiento de {nombreHijo}.
                  </p>
                  {errorFotoEnmarca && (
                    <p className={styles.enmarcarError}>{errorFotoEnmarca}</p>
                  )}
                  <button
                    className={styles.enmarcarBtn}
                    type="button"
                    onClick={() => enmarcaInputRef.current?.click()}
                    disabled={subiendoFoto}
                  >
                    <Camera size={16} />
                    {subiendoFoto ? 'Subiendo...' : 'Agregar foto'}
                  </button>
                </>
              )}
            </div>
          )}

          <Button variant="primary" fullWidth onClick={() => navigate('/panel')}>
            Volver al inicio
          </Button>
          <button className={styles.verHitosBtn} onClick={() => navigate('/hitos')}>
            Ver todos los avances →
          </button>
        </div>
      </div>
    )
  }

  // ── FORMULARIO HITO ───────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.vistaHeader}>
        <button className={styles.backBtn} onClick={() => setVista('elegir')}>← Volver</button>
      </div>
      <h2 className={styles.titulo}>¿Qué avanzó?</h2>

      <Card>
        <p className={styles.label}>Cuéntame qué pasó</p>
        <textarea
          className={styles.textarea}
          placeholder="Ej: Esta tarde se calmó solo sin que yo interviniera…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          autoFocus
        />
      </Card>

      <Card>
        <p className={styles.label}>
          Categoría <span className={styles.labelOpcional}>(opcional)</span>
        </p>
        <div className={styles.categoriasGrid}>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              className={`${styles.catBtn} ${categoria === c.id ? styles.catSelected : ''}`}
              onClick={() => setCategoria((prev) => (prev === c.id ? '' : c.id))}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className={styles.fotoSection}>
        <p className={styles.label}>
          Foto <span className={styles.labelOpcional}>(opcional)</span>
        </p>
        {fotoPreviewUrl ? (
          <div className={styles.fotoPreview}>
            <img src={fotoPreviewUrl} alt="" className={styles.fotoPreviewImg} />
            <button className={styles.fotoRemoveBtn} onClick={removeFoto} type="button" aria-label="Quitar foto">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            className={styles.fotoCameraBtn}
            type="button"
            onClick={() => fotoInputRef.current?.click()}
          >
            <Camera size={15} />
            <span>Agregar foto</span>
          </button>
        )}
        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFotoChange}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleGuardar}
        disabled={!descripcion.trim()}
        loading={loading}
      >
        Guardar avance
      </Button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
