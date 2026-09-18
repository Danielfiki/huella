import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import VoiceTextarea from '../../components/ui/VoiceTextarea'
import { generarRespuestaHito } from '../../services/anthropic'
import styles from './NuevoPage.module.css'
// Solo para el ESTADO DE CARGA de la micro-respuesta, que es el mismo que en
// EpisodioCard ("Huella está leyendo lo que escribiste…"). Se importa el módulo
// en vez de copiar la regla: dos copias se separan con el tiempo y terminan
// siendo dos estilos para la misma cosa. El CSS ya viaja en el bundle
// principal, así que importarlo acá no agrega peso.
// La RESPUESTA ya no usa este módulo: va con `celebracionSub`, la clase del
// subtítulo de su propia card, porque en itálica de 11,5px no se leía.
import epStyles from '../../components/historial/EpisodioCard.module.css'

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
  const { state, addHito, updateHitoFoto, updateHitoRespuesta } = useHuella()
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

  // Micro-respuesta de Huella al avance (ítem 8). El candado guarda el ID del
  // hito al que YA se le pidió: un solo disparo por hito, aunque el componente
  // se vuelva a renderizar. Mismo criterio que `respuestaPedida` en
  // EpisodioCard, pero con el id en vez de un booleano, porque acá se pueden
  // registrar varios avances seguidos sin salir de la pantalla.
  const [respuestaHito, setRespuestaHito] = useState(null)
  const [cargandoRespuesta, setCargandoRespuesta] = useState(false)
  const respuestaPedidaRef = useRef(null)

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

  // Pide la micro-respuesta y la guarda. NUNCA se espera con await desde
  // handleGuardar: el avance ya está en la base cuando esto arranca, así que
  // si la IA tarda o falla, el guardado y los dos botones siguen intactos.
  async function pedirRespuestaHito(inserted) {
    setCargandoRespuesta(true)
    try {
      // Solo los rasgos CONFIRMADOS del hijo activo, máximo 5. Los candidatos
      // no entran: el papá todavía no dijo que los ve, y la respuesta no puede
      // darlos por ciertos.
      const rasgosConfirmados = (state.rasgos || [])
        .filter((r) => r.hijoId === state.hijoActivoId && r.estado === 'confirmado')
        .slice(0, 5)

      const texto = await generarRespuestaHito({
        hijo: state.hijo,
        hito: { categoria: inserted.categoria, descripcion: inserted.descripcion },
        rasgosConfirmados,
      })
      if (!texto) return

      // Se muestra primero y se guarda después, a propósito: si la escritura
      // falla, el papá igual recibe lo que la IA ya respondió. Lo que se pierde
      // es que quede en el álbum, no la respuesta de ahora.
      setRespuestaHito(texto)
      await updateHitoRespuesta(inserted.id, texto)
    } catch (e) {
      // No se muestra nada. El avance ya quedó guardado, que es lo que importa.
      console.warn('[NuevoPage] la respuesta al avance no se pudo generar o guardar:', e?.message ?? e)
    } finally {
      setCargandoRespuesta(false)
    }
  }

  async function handleGuardar() {
    if (!descripcion.trim()) return
    setLoading(true)
    setError('')
    // Limpia lo del avance anterior: se pueden registrar varios seguidos.
    setRespuestaHito(null)
    setCargandoRespuesta(false)
    try {
      const hito = {
        id: Date.now().toString(),
        categoria: categoria || 'otro',
        descripcion: descripcion.trim(),
        fecha: new Date().toISOString(),
      }
      const inserted = await addHito(hito)

      // Arranca acá, ANTES de la foto y sin await: las dos cosas corren en
      // paralelo y ninguna espera a la otra. El candado es el id del hito.
      if (inserted?.id && respuestaPedidaRef.current !== inserted.id) {
        respuestaPedidaRef.current = inserted.id
        pedirRespuestaHito(inserted)
      }

      const huboFotoEnSubmit = Boolean(fotoFile)
      let fotoFallo = false
      if (fotoFile && inserted?.id && user) {
        try {
          const blob = await compressImage(fotoFile)
          const path = `${user.id}/${inserted.id}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('momentos')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          if (uploadError) throw new Error(uploadError.message)
          // Bucket privado: se guarda el PATH; el contexto firma para mostrar.
          await updateHitoFoto(inserted.id, path)
        } catch {
          // El avance quedo guardado; la foto no. No se corta el flujo: la vista
          // 'guardado' muestra "Enmarca este momento" con el error de siempre,
          // y ahi mismo se puede volver a subir.
          fotoFallo = true
        }
      }
      // El bloque "Enmarca este momento" en la vista 'guardado' se muestra si
      // el papá NO subió foto en el form principal, o si la subió y falló.
      setHitoGuardadoId(inserted?.id ?? null)
      setHitoGuardadoSinFoto((!huboFotoEnSubmit || fotoFallo) && Boolean(inserted?.id))
      setFotoEnmarcaUrl(null)
      setErrorFotoEnmarca(fotoFallo ? 'No se pudo subir la foto. Intenta de nuevo.' : '')
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

        {/* Tercera entrada: patrones ("Algo que aún no cambia"). NO alimenta el
            motor de rasgos.

            Con 3 abiertos la card NO se apaga: CAMBIA DE DESTINO. Antes quedaba
            `disabled` diciendo "cierra uno para agregar otro", pero no llevaba a
            ninguna parte — el padre leia la instruccion y no tenia como
            cumplirla. Ahora abre la lista de patrones, que es donde se cierran.

            El filtro no es nuevo: HistorialPage ya lee `location.state.filtro` y
            el Home navega igual desde la puerta "Acompanando". */}
        <button
          className={`${styles.choiceCard} ${styles.choicePatron}${patronBloqueado ? ' ' + styles.choicePatronLleno : ''}`}
          onClick={() => patronBloqueado
            ? navigate('/historial', { state: { filtro: 'patrones' } })
            : navigate('/patron')}
        >
          <span className={`${styles.choiceIcono} ${styles.choiceIconoPatron}`}>🌀</span>
          <div className={styles.choiceTexto}>
            <p className={styles.choiceTitulo}>Algo que aún no cambia</p>
            <p className={styles.choiceDesc}>
              {patronBloqueado
                ? 'Ya tienes 3 abiertos. Míralos y cierra el que ya haya cambiado.'
                : 'El chupete, el pañal, dormir en tu cama, comer poco'}
            </p>
          </div>
          <span className={styles.choiceChevron}>›</span>
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

            {/* La micro-respuesta de Huella al avance. Va DENTRO de esta card y
                no en una propia: es acompañamiento, no una tarjeta más.
                La carga reusa la clase de EpisodioCard; la respuesta usa
                `celebracionSub`, la misma del subtítulo de arriba. Ninguna de
                las dos define un estilo nuevo. */}
            {cargandoRespuesta && (
              <p className={epStyles.reflexionRespuestaCargando}>
                Huella está leyendo lo que escribiste…
              </p>
            )}
            {!cargandoRespuesta && respuestaHito && (
              <p className={styles.celebracionSub}>{respuestaHito}</p>
            )}
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
          <button className={styles.verHitosBtn} onClick={() => navigate('/historial', { state: { filtro: 'logros' } })}>
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
