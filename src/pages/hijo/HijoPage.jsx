import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import PropuestaRasgo, { COLOR_FAMILIA } from '../../components/hijo/PropuestaRasgo'
import RetratoSendero from '../../components/hijo/RetratoSendero'
import SelectorFechaNacimiento from '../../components/ui/SelectorFechaNacimiento'
import s from './HijoPage.module.css'
import RutinaDiaria from './RutinaDiaria'
import CerebroContenido from '../cerebro/CerebroContenido'

// La fecha de nacimiento la maneja SelectorFechaNacimiento (tres selects),
// que habla directo en 'YYYY-MM-DD'. Con eso se fueron isoToDisplay y
// displayToIso, que vivian duplicados aca y en PerfilPage.

// Las 4 familias del retrato (motor de rasgos · 4C), en orden fijo. `titulo`
// es el nombre cálido (no el id técnico); `verbo` arma el mensaje anticipatorio
// cuando la familia aún no tiene rasgos confirmados. El color sale de
// COLOR_FAMILIA (mismo mapa que la card de propuesta, 4A).
const FAMILIAS = [
  { id: 'mueve',      titulo: 'Lo que lo mueve',  verbo: 'lo mueve' },
  { id: 'fortalezas', titulo: 'Sus fortalezas',   verbo: 'lo fortalece' },
  { id: 'cuesta',     titulo: 'Lo que le cuesta', verbo: 'le cuesta' },
  { id: 'calma',      titulo: 'Lo que lo calma',  verbo: 'lo calma' },
]

// ── Componente ────────────────────────────────────────────────────────────

export default function HijoPage() {
  const { state, setHijo, confirmarRasgo, descartarRasgo } = useHuella()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hijo, episodios, hitos, rasgos } = state

  const esNuevo = searchParams.get('nuevo') === 'true'

  // Estados del formulario de creación (siempre declarados — regla de hooks)
  const [nombre, setNombre]               = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [genero, setGenero]               = useState('')
  const [loadingCrear, setLoadingCrear]   = useState(false)
  const [errorCrear, setErrorCrear]       = useState('')

  // Card de propuesta de rasgo (motor de rasgos · 4A) — "uno por sesion".
  // Se fija UN candidato al entrar a la pantalla y NO se reemplaza aunque el
  // papa lo resuelva: al confirmar/descartar la card desaparece y el resto de
  // los candidatos espera a la proxima visita (no se siente a "examen").
  const [rasgoPropuesto, setRasgoPropuesto] = useState(null)

  // Fija el candidato UNA sola vez (cuando los rasgos terminan de cargar). La
  // guarda "solo si esta en null" evita que salte al siguiente tras resolver.
  useEffect(() => {
    if (rasgoPropuesto !== null) return
    if (!hijo) return
    const candidato = (rasgos || []).find(
      (r) => r.estado === 'candidato' && r.hijoId === hijo.id
    )
    if (candidato) setRasgoPropuesto(candidato)
  }, [rasgos, hijo?.id, rasgoPropuesto])

  // Al cambiar de hijo activo, reinicia para que la nueva pantalla fije su
  // propio candidato.
  useEffect(() => {
    setRasgoPropuesto(null)
  }, [hijo?.id])

  async function handleCrear(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoadingCrear(true)
    setErrorCrear('')
    try {
      await setHijo({
        nombre:          nombre.trim(),
        avatarUrl:       null,
        fechaNacimiento: fechaNacimiento || null,
        genero:          genero || null,
      }, null)
      navigate('/hijo')
    } catch {
      setErrorCrear('No se pudo crear. Intenta de nuevo.')
    } finally {
      setLoadingCrear(false)
    }
  }

  // ── Modo creación ─────────────────────────────────────────────────────────
  if (esNuevo) {
    return (
      <div className={s.page}>
        <div className={s.formHeader}>
          <button
            type="button"
            className={s.backBtn}
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className={s.formTitulo}>Nuevo hijo/a</h2>
        </div>

        <Card>
          <form onSubmit={handleCrear} className={s.form}>
            <div className={s.campo}>
              <label className={s.campoLabel}>
                Nombre <span className={s.required}>*</span>
              </label>
              <input
                className={s.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del niño/a"
                autoFocus
              />
            </div>

            <div className={s.campo}>
              <label className={s.campoLabel}>Fecha de nacimiento</label>
              <SelectorFechaNacimiento
                idPrefix="hijo-nuevo"
                value={fechaNacimiento}
                onChange={setFechaNacimiento}
              />
            </div>

            <div className={s.campo}>
              <label className={s.campoLabel}>Género</label>
              <div className={s.generoRow}>
                {[['m', 'Niño'], ['f', 'Niña'], ['nb', 'Otro']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`${s.generoBtn} ${genero === val ? s.generoBtnActivo : ''}`}
                    onClick={() => setGenero((g) => g === val ? '' : val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {errorCrear && <p className={s.formError}>{errorCrear}</p>}

            <button
              type="submit"
              className={s.guardarBtn}
              disabled={!nombre.trim() || loadingCrear}
            >
              {loadingCrear ? 'Guardando…' : 'Crear hijo/a'}
            </button>
          </form>
        </Card>
      </div>
    )
  }

  // ── Modo vista vacía ──────────────────────────────────────────────────────
  if (!hijo) {
    return (
      <div className={s.page}>
        <div className={s.vacio}>
          <span style={{ fontSize: 48 }}>👶</span>
          <p>Configura el perfil de tu hijo/a para ver esta página.</p>
          <button className={s.editarBtn} onClick={() => navigate('/perfil')}>
            Ir al perfil →
          </button>
        </div>
      </div>
    )
  }

  // ── Modo retrato (Refugio) ────────────────────────────────────────────────
  const tabActiva = searchParams.get('tab') ?? 'perfil'

  // El candidato fijado para esta visita se busca en el estado vivo. La card
  // solo se muestra mientras ese rasgo siga siendo 'candidato'; al resolverlo
  // (confirmado/descartado) se oculta y NO aparece otro en esta visita.
  const rasgoVivo = rasgoPropuesto
    ? (rasgos || []).find((r) => r.id === rasgoPropuesto.id)
    : null
  const mostrarPropuesta = !!rasgoVivo && rasgoVivo.estado === 'candidato'

  // Rasgos confirmados del hijo activo: alimentan el retrato (conteo) y la
  // ficha de las 4 familias.
  const confirmados = (rasgos || []).filter(
    (r) => r.estado === 'confirmado' && r.hijoId === hijo.id
  )
  const rasgosConfirmados = confirmados.length

  return (
    <div className={s.page}>
      <RetratoSendero
        nombre={hijo.nombre}
        avatarUrl={hijo.avatarUrl}
        rasgosConfirmados={rasgosConfirmados}
        rasgosTotales={12}
        onAjustes={() => navigate('/perfil')}
      />

      <div className={s.tabs} role="tablist">
        <button
          role="tab"
          className={[s.tab, tabActiva === 'perfil' && s.on].filter(Boolean).join(' ')}
          onClick={() => setSearchParams({})}
        >
          Perfil
        </button>
        <button
          role="tab"
          className={[s.tab, tabActiva === 'rutina' && s.on].filter(Boolean).join(' ')}
          onClick={() => setSearchParams({ tab: 'rutina' })}
        >
          Rutina diaria
        </button>
        <button
          role="tab"
          className={[s.tab, tabActiva === 'cerebro' && s.on].filter(Boolean).join(' ')}
          onClick={() => setSearchParams({ tab: 'cerebro' })}
        >
          Su cerebro
        </button>
      </div>

      {tabActiva === 'perfil' && (
        <div className={s.body}>
          {mostrarPropuesta && (
            <PropuestaRasgo
              rasgo={rasgoVivo}
              nombreHijo={hijo.nombre}
              onConfirmar={confirmarRasgo}
              onDescartar={descartarRasgo}
            />
          )}
          {FAMILIAS.map((fam) => {
            const items = confirmados.filter((r) => r.familia === fam.id)
            return (
              <article key={fam.id} className={s.card}>
                <div className={s.cardHd}>
                  <h2 className={s.cardTtl}>
                    <span
                      className={s.famDot}
                      style={{ background: COLOR_FAMILIA[fam.id] }}
                      aria-hidden="true"
                    />
                    {fam.titulo}
                  </h2>
                  {items.length > 0 && <span className={s.cardSub}>{items.length}</span>}
                </div>

                {items.length === 0 ? (
                  <p className={s.famVacio}>
                    Aún por descubrir. Sigue registrando y Huella irá conociendo qué {fam.verbo} a {hijo.nombre}.
                  </p>
                ) : (
                  <ul className={s.rasgoLista}>
                    {items.map((r) => (
                      <li key={r.id} className={s.rasgoItem}>
                        <p className={s.rasgoTitulo}>{r.titulo}</p>
                        <span className={s.rasgoEvidencia}>
                          Notado {r.evidenciaCount} {r.evidenciaCount === 1 ? 'vez' : 'veces'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>
      )}

      {tabActiva === 'rutina' && <RutinaDiaria />}

      {/* El hogar canonico del Cerebro Huella. Va `compacto` porque aca arriba
          ya viven el retrato y la fila de tabs. */}
      {tabActiva === 'cerebro' && <CerebroContenido compacto />}
    </div>
  )
}
