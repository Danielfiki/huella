import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import VoiceTextarea from '../../components/ui/VoiceTextarea'
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
  const location = useLocation()
  const { state, addHito, updateHitoFoto } = useHuella()
  const { user } = useAuth()
  // Permite saltar la vista 'elegir' cuando el caller ya sabe qué
  // quiere registrar. Hoy lo usa el botón "+ Registrar" del header de
  // Logros, que entra directo al form de avance.
  const [vista, setVista] = useState(
    location.state?.vistaInicial === 'hito' ? 'hito' : 'elegir'
  )

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
            // Bucket privado: se guarda el PATH; el contexto firma para mostrar.
            await updateHitoFoto(inserted.id, path)
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
      // Bucket privado: a la BD va el PATH; para el preview local se firma aparte.
      await updateHitoFoto(hitoGuardadoId, path)
      const { data: firmada } = await supabase.storage.from('momentos').createSignedUrl(path, 7200)
      setFotoEnmarcaUrl(firmada?.signedUrl ?? null)
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
    // Tope de producto: máximo 3 patrones abiertos por hijo. El array de
    // patrones del contexto ya viene filtrado al hijo activo; contamos los
    // 'abierto' para bloquear la tercera card cuando ya hay 3.
    const patronesAbiertos = (state.patrones || []).filter(
      (p) => p.estado === 'abierto' && p.hijo_id === state.hijoActivoId
    ).length
    const patronBloqueado = patronesAbiertos >= 3
    return (
      <div className={styles.flujoRefugio}>
        <div className={styles.topRefugio}>
          <h2 className={styles.tituloRefugio}>¿Qué quieres registrar?</h2>
        </div>

        <button
          className={`${styles.choiceCard} ${styles.choiceEpisodio}`}
          onClick={() => navigate('/registro')}
        >
          <span className={`${styles.choiceIcono} ${styles.choiceIconoEpisodio}`}>🌊</span>
          <div className={styles.choiceTexto}>
            <p className={styles.choiceTitulo}>Un episodio difícil</p>
            <p className={styles.choiceDesc}>Rabieta, llanto, agresividad u otro momento complicado</p>
          </div>
          <span className={styles.choiceChevron}>›</span>
        </button>

        <button
          className={`${styles.choiceCard} ${styles.choiceAvance}`}
          onClick={() => setVista('hito')}
        >
          <span className={`${styles.choiceIcono} ${styles.choiceIconoAvance}`}>⭐</span>
          <div className={styles.choiceTexto}>
            <p className={styles.choiceTitulo}>Un avance</p>
            <p className={styles.choiceDesc}>Se calmó solo, pidió disculpas, toleró un "no" u otro logro</p>
          </div>
          <span className={styles.choiceChevron}>›</span>
        </button>

        {/* Tercera entrada: patrones ("Algo que aún no cambia"). Se bloquea
            con 3 patrones abiertos del hijo activo — sin candado ni alerta,
            solo apagada. NO alimenta el motor de rasgos. */}
        <button
          className={`${styles.choiceCard} ${styles.choicePatron}${patronBloqueado ? ' ' + styles.choicePatronLocked : ''}`}
          onClick={patronBloqueado ? undefined : () => navigate('/patron')}
          disabled={patronBloqueado}
          aria-disabled={patronBloqueado}
        >
          <span className={`${styles.choiceIcono} ${styles.choiceIconoPatron}`}>🌀</span>
          <div className={styles.choiceTexto}>
            <p className={styles.choiceTitulo}>Algo que aún no cambia</p>
            <p className={styles.choiceDesc}>
              {patronBloqueado
                ? 'Ya tienes 3 abiertos. Cierra uno para agregar otro.'
                : 'El chupete, el pañal, dormir en tu cama, comer poco'}
            </p>
          </div>
          {!patronBloqueado && <span className={styles.choiceChevron}>›</span>}
        </button>
      </div>
    )
  }

  // ── GUARDADO ─────────────────────────────────────────────────────────────
  if (vista === 'guardado') {
    const nombreHijo = state?.hijo?.nombre || 'tu hijo/a'
    return (
      <div className={styles.flujoRefugio}>
        <div className={styles.guardadoContainer}>
          <div className={styles.celebracionCard}>
            <p className={styles.celebracionEstrella}>⭐</p>
            <h3 className={styles.celebracionTitulo}>¡Avance registrado!</h3>
            <p className={styles.celebracionSub}>
              Cada logro pequeño cuenta. Lo tienes guardado en tu historial de avances.
            </p>
          </div>

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

          <Button variant="primary" size="lg" fullWidth className={styles.guardarPill} onClick={() => navigate('/panel')}>
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
    <div className={styles.flujoRefugio}>
      <div className={styles.topRefugio}>
        <button className={styles.backDisco} onClick={() => setVista('elegir')} aria-label="Volver">←</button>
        <h2 className={styles.tituloRefugio}>¿Qué avanzó?</h2>
      </div>

      <div className={styles.escrituraCard}>
        <p className={styles.escrituraLabel}>Cuéntame qué pasó</p>
        <VoiceTextarea
          value={descripcion}
          onChange={setDescripcion}
          onVoiceResult={setDescripcion}
          placeholder="Ej: Esta tarde se calmó solo sin que yo interviniera…"
        />
      </div>

      <div className={styles.catSeccion}>
        <p className={styles.label}>
          Categoría <span className={styles.labelOpcional}>(opcional)</span>
        </p>
        <div className={styles.catChips}>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              className={`${styles.catChip} ${categoria === c.id ? styles.catChipActiva : ''}`}
              onClick={() => setCategoria((prev) => (prev === c.id ? '' : c.id))}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

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
        className={styles.guardarPill}
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
