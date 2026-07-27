import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { Loader } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import HistorialHeader from '../../components/historial/HistorialHeader'
import FiltroChips from '../../components/historial/FiltroChips'
import DaySeparator from '../../components/historial/DaySeparator'
import EpisodioCard from '../../components/historial/EpisodioCard'
import PatronCard from '../../components/patron/PatronCard'
import { groupEpisodios } from '../../components/historial/helpers'
import { getAuthorDisplay } from '../../utils/authorDisplay'
import UpgradeModal from '../../components/ui/UpgradeModal'
import styles from './HistorialPage.module.css'

const PDFSection = lazy(() => import('../../modules/pdf/PDFSection'))

const TIPOS = {
  rabieta:     { label: 'Rabieta / explosión',              emoji: '💥' },
  llanto:      { label: 'Llanto intenso',                   emoji: '😭' },
  agresividad: { label: 'Golpes / agresividad',             emoji: '👊' },
  miedo:       { label: 'Miedo / angustia',                 emoji: '🫣' },
  sueño:       { label: 'No quiere dormir',                 emoji: '🛏️' },
  social:      { label: 'Se aisló / no quiso relacionarse', emoji: '🫥' },
  desconexion: { label: 'Se cerró / no respondía',          emoji: '🔇' },
  oposicion:   { label: 'Oposición / no coopera',           emoji: '🚫' },
  otro:        { label: 'Otro',                             emoji: '📝' },
}

const CATEGORIAS_HITO = {
  autorregulacion: { label: 'Se calmó solo',   emoji: '🌱' },
  empatia:         { label: 'Mostró empatía',  emoji: '💛' },
  disculpa:        { label: 'Pidió disculpas', emoji: '🤝' },
  frustration:     { label: 'Toleró un "no"',  emoji: '💪' },
  social:          { label: 'Avance social',   emoji: '👫' },
  otro:            { label: 'Otro avance',     emoji: '⭐' },
}

const SECTION_TITLES = new Set([
  'Qué está pasando', 'Qué hacer ahora', 'Qué evitar',
  'Lo que está mejorando', 'Lo que merece atención',
  'Posibles causas', 'Próximos pasos sugeridos',
])

function parseOrientacionIA(text) {
  if (!text) return null
  const lines = text.trim().split('\n').filter((l) => l.trim())
  const rawFirst = lines[0]?.replace(/^[*#\s]+/, '').trim() || ''
  const titulo = SECTION_TITLES.has(rawFirst) ? 'Orientación de Huella' : rawFirst || 'Orientación de Huella'
  const bodyLines = lines.slice(1)
  const resumen = bodyLines.slice(0, 4).join(' ').replace(/\s+/g, ' ').trim()
  return { titulo, resumen, completa: text }
}

export default function HistorialPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, deleteEpisodio, updateEpisodio, deleteHito, getCheckinsHechos, isPro, profilesByUserId } = useHuella()
  const { user } = useAuth()
  const { episodios, hitos, hijo, estrategias } = state

  // Filtro inicial:
  //  1. Si la navegación trae un filtro explícito (p. ej. el "y N más" del Home), manda.
  //  2. Si el hijo activo no tiene episodios ni hitos pero sí patrones, abre en
  //     'patrones' — es el caso de origen (chupete registrado en el primer minuto):
  //     no puede caer en "Sin registros" con el patrón escondido tras un chip.
  //  3. Si hay historial, 'todos' como hasta ahora.
  const [filtro, setFiltro] = useState(() => {
    if (location.state?.filtro) return location.state.filtro
    const sinHistorial = episodios.length === 0 && hitos.length === 0
    const hayPatrones = (state.patrones || []).some((p) => p.hijo_id === hijo?.id)
    return sinHistorial && hayPatrones ? 'patrones' : 'todos'
  })
  const [showSearch, setShowSearch] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [checkinsHechos, setCheckinsHechos] = useState(new Set())
  const [pdfActivado, setPdfActivado] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    getCheckinsHechos().then(setCheckinsHechos)
  }, [])

  const episodiosNorm = useMemo(
    () =>
      episodios.map((ep) => ({
        id: ep.id,
        fecha: ep.fecha,
        emoji: TIPOS[ep.tipo]?.emoji ?? '📝',
        titulo: TIPOS[ep.tipo]?.label ?? ep.tipo,
        descripcion: ep.contexto || null,
        tipo: ep.tipo,
        nivel: ep.intensidad,
        gatillantes: ep.gatillantes ?? [],
        orientacionIA: parseOrientacionIA(ep.orientacionIA),
        estadoPadre: ep.estadoPadre ?? null,
        emocion: ep.emocion ?? null,
        descripcionLibre: ep.descripcionLibre ?? null,
        reflexion: ep.reflexion ?? null,
        fotoUrl: ep.fotoUrl ?? null,
        userId: ep.userId ?? null,
        accionRapida: ep.accionRapida ?? null,
        _source: 'episodio',
      })),
    [episodios]
  )

  const hitosNorm = useMemo(
    () =>
      hitos.map((h) => {
        const cat = CATEGORIAS_HITO[h.categoria] || { label: h.categoria || 'Avance', emoji: '⭐' }
        return {
          id: h.id,
          fecha: h.fecha,
          emoji: cat.emoji,
          titulo: cat.label,
          descripcion: h.descripcion || null,
          tipo: 'logro',
          nivel: null,
          gatillantes: [],
          orientacionIA: null,
          estadoPadre: null,
          emocion: null,
          descripcionLibre: null,
          reflexion: null,
          fotoUrl: h.foto_url ?? null,
          userId: h.user_id ?? null,
          accionRapida: null,
          _source: 'hito',
        }
      }),
    [hitos]
  )

  const todosUnificados = useMemo(
    () =>
      [...episodiosNorm, ...hitosNorm].sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      ),
    [episodiosNorm, hitosNorm]
  )

  const filtered = useMemo(() => {
    let result
    if (filtro === 'dificiles') result = episodiosNorm.filter((e) => e.nivel >= 3)
    else if (filtro === 'logros') result = hitosNorm
    else result = todosUnificados

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter((ep) => {
        const enDescripcion = (ep.descripcion || '').toLowerCase().includes(q)
        const enDescLibre = (ep.descripcionLibre || '').toLowerCase().includes(q)
        const enGatillantes = (ep.gatillantes || []).some(
          (g) => (g.nombre || g).toString().toLowerCase().includes(q)
        )
        return enDescripcion || enDescLibre || enGatillantes
      })
    }
    return result
  }, [filtro, todosUnificados, episodiosNorm, hitosNorm, busqueda])

  const grupos = useMemo(() => groupEpisodios(filtered), [filtered])

  const promedio = useMemo(() => {
    const vals = episodiosNorm.map((e) => e.nivel).filter((n) => n != null)
    if (!vals.length) return 0
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }, [episodiosNorm])

  const rango = useMemo(() => {
    if (!todosUnificados.length) return ''
    const oldest = new Date(todosUnificados[todosUnificados.length - 1].fecha)
    const days = Math.ceil((new Date() - oldest) / 86400000)
    if (days <= 1) return 'Hoy'
    if (days <= 30) return `Últ. ${days} días`
    return `Últ. ${Math.ceil(days / 30)} meses`
  }, [todosUnificados])

  // Patrones del hijo activo (abiertos y cerrados), del más reciente al más
  // viejo por created_at. Array propio: NUNCA entra al pipeline de episodios/hitos.
  const patronesLista = useMemo(
    () => (state.patrones || [])
      .filter((p) => p.hijo_id === hijo?.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [state.patrones, hijo?.id]
  )

  const counts = useMemo(
    () => ({
      todos: todosUnificados.length,
      dificiles: episodiosNorm.filter((e) => e.nivel >= 3).length,
      logros: hitosNorm.length,
      patrones: patronesLista.length,
    }),
    [todosUnificados, episodiosNorm, hitosNorm, patronesLista]
  )

  const totalRegistros = episodios.length + hitos.length
  const esPro = isPro()
  const hayEpisodios = episodios.length > 0

  function handleDelete(id, source) {
    return source === 'hito' ? deleteHito(id) : deleteEpisodio(id)
  }

  // El estado vacío solo aplica si NO hay absolutamente nada. Con patrones (aunque
  // sin episodios ni hitos) la página se muestra: filtros + filtro de patrones.
  if (totalRegistros === 0 && patronesLista.length === 0) {
    return (
      <div className={styles.page}>
        <HistorialHeader count={0} promedio={0} onBack={() => navigate(-1)} onSearch={() => setShowSearch((s) => !s)} />
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            Sin registros aún — cuando empieces a registrar, aquí aparecerá todo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <HistorialHeader
        count={totalRegistros}
        promedio={promedio}
        rango={rango}
        onBack={() => navigate(-1)}
        onSearch={() => { setShowSearch((s) => !s); setBusqueda('') }}
        onExportPDF={
          hayEpisodios
            ? (esPro ? () => setPdfActivado(true) : () => setShowUpgrade(true))
            : undefined
        }
        hasNewExport={esPro && hayEpisodios && !pdfActivado}
        exportBloqueado={!esPro && hayEpisodios}
      />
      <FiltroChips
        active={filtro}
        onChange={setFiltro}
        counts={counts}
        hijo={hijo?.nombre}
        rango={rango}
      />
      {showSearch && (
        <div className={styles.busquedaWrap}>
          <input
            className={styles.busquedaInput}
            type="text"
            autoFocus
            placeholder="Buscar por contexto o gatillante…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className={styles.busquedaClear} onClick={() => setBusqueda('')}>
              ✕
            </button>
          )}
        </div>
      )}

      <div className={styles.body}>
        {pdfActivado && (
          <Suspense
            fallback={
              <button className={styles.pdfLoadingBtn} disabled>
                <Loader size={15} className={styles.pdfSpin} />
                Preparando informe…
              </button>
            }
          >
            <PDFSection
              hijo={hijo}
              episodios={episodios}
              estrategias={estrategias}
              hitos={hitos}
            />
          </Suspense>
        )}

        {filtro === 'patrones' ? (
          /* ── Rama de patrones: tarjeta propia, fuera del pipeline de episodios/hitos ── */
          patronesLista.length === 0 ? (
            <p className={styles.emptyFilter}>Sin patrones registrados aún.</p>
          ) : (
            <div className={styles.patronesLista}>
              {patronesLista.map((p) => (
                <PatronCard
                  key={p.id}
                  patron={p}
                  authorName={getAuthorDisplay(p.user_id, profilesByUserId, user?.id)}
                  onClick={() => navigate(`/patron/${p.id}`)}
                />
              ))}
            </div>
          )
        ) : (
          <>
            {grupos.length === 0 && (
              <p className={styles.emptyFilter}>
                {filtro === 'dificiles'
                  ? 'Sin episodios difíciles registrados.'
                  : filtro === 'logros'
                  ? 'Sin avances registrados aún.'
                  : 'Sin momentos registrados aún.'}
              </p>
            )}

            {grupos.map((g, i) => (
              <React.Fragment key={i}>
                <DaySeparator label={g.label} meta={g.meta} isToday={g.isToday} />
                {g.episodios.map((ep) => (
                  <EpisodioCard
                    key={ep.id}
                    episodio={ep}
                    onDelete={(id) => handleDelete(id, ep._source)}
                    onUpdate={ep._source === 'episodio' ? updateEpisodio : undefined}
                    tieneCheckin={checkinsHechos.has(ep.id)}
                    onNavigate={navigate}
                    authorName={getAuthorDisplay(ep.userId, profilesByUserId, user?.id)}
                  />
                ))}
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          tituloCustom="Comparte la huella de tu hijo"
          mensajeCustom="Con Huella Pro exportas un informe en PDF con el historial y los patrones de tu hijo, listo para su psicólogo o pediatra."
        />
      )}
    </div>
  )
}
