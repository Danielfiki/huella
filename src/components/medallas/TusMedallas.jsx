import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { NIVELES, TOTAL_MEDALLAS, getSubmensaje } from './nivelesMedallas'
import MedalIcon from './MedalIcon'
import MedallaDetalleModal from './MedallaDetalleModal'
import LeyendaMedallasModal from './LeyendaMedallasModal'
import s from './TusMedallas.module.css'

// "Tus medallas" — sección de PerfilPage.
//
// Las 33 medallas son logros DEL PADRE, no del niño: se ganan registrando,
// observando y sosteniendo un plan. Por eso en B3 dejaron de vivir en una
// pantalla propia ("Logros", que además mezclaba medallas con el álbum del
// hijo) y se mudaron acá, junto al resto de lo que es de él.
//
// La lógica es la MISMA que tenía HitosPage: mismos ids, mismos checks, mismo
// tracking de "no vistas" en localStorage. Lo único que cambió es el envase:
// los niveles vienen colapsados y solo el nivel actual abre por defecto, para
// que la sección no se coma el Perfil entero.

export default function TusMedallas() {
  const { state, getCheckinsHechos } = useHuella()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight')

  const [checkinsCount, setCheckinsCount] = useState(0)
  const [medallaAbierta, setMedallaAbierta] = useState(null)
  const [leyendaAbierta, setLeyendaAbierta] = useState(false)
  const [nivelAbierto, setNivelAbierto] = useState(null)

  useEffect(() => {
    getCheckinsHechos().then((set) => setCheckinsCount(set.size))
  }, [])

  const { episodios, hitos, estrategias } = state
  const dataBadge = { episodios, hitos, estrategias, checkinsCount }

  // Tracking de medallas nuevas (las recién desbloqueadas que el padre no vio).
  // La clave de localStorage es la MISMA que usaba HitosPage: quien ya vio sus
  // medallas antes de B3 no se las encuentra "nuevas" de golpe.
  const storageKey = `huella_badges_vistos_${user?.id || 'anon'}`
  const badgesVistosRef = useRef(null)
  if (badgesVistosRef.current === null) {
    try {
      badgesVistosRef.current = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch { badgesVistosRef.current = new Set() }
  }

  const todosLosBadges = NIVELES.flatMap((n) => n.badges)
  const desbloqueadosActuales = new Set(
    todosLosBadges.filter((b) => b.check(dataBadge)).map((b) => b.id)
  )
  const badgesNuevos = new Set(
    [...desbloqueadosActuales].filter((id) => !badgesVistosRef.current.has(id))
  )
  const medallaReciente = badgesNuevos.size > 0 ? { id: [...badgesNuevos][0] } : null

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify([...desbloqueadosActuales])) }
      catch {}
    }, 4000)
    return () => {
      clearTimeout(timer)
      try { localStorage.setItem(storageKey, JSON.stringify([...desbloqueadosActuales])) }
      catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Un nivel se desbloquea cuando el anterior llegó a su umbral.
  const nivelesConEstado = NIVELES.map((nivel, i) => {
    if (i === 0) return { ...nivel, bloqueado: false }
    const previo = NIVELES[i - 1]
    const desbloqueadosPrevios = previo.badges.filter((b) => b.check(dataBadge)).length
    return {
      ...nivel,
      bloqueado: desbloqueadosPrevios < previo.umbral,
      umbralPrevio: previo.umbral,
      desbloqueadosPrevios,
    }
  })

  const nivelActualIdx = nivelesConEstado.reduce((acc, n, i) => (!n.bloqueado ? i : acc), 0)
  const nivelActualSrc = nivelesConEstado[nivelActualIdx]
  const totalDesbloqueados = desbloqueadosActuales.size
  const esVacio = totalDesbloqueados === 0

  // Nivel desplegado: el que el padre haya tocado; si no tocó nada, el actual.
  // Si viene un ?highlight (ej. "Ver tu hito" desde el banner de plan
  // completado), manda el nivel que contiene esa medalla.
  const nivelDelHighlight = highlight
    ? nivelesConEstado.find((n) => n.badges.some((b) => b.id === highlight))?.nivel ?? null
    : null
  const abierto = nivelAbierto ?? nivelDelHighlight ?? nivelActualSrc.nivel

  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => {
      document.getElementById(highlight)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
    return () => clearTimeout(timer)
  }, [highlight])

  return (
    <section className={s.card}>
      <header className={s.head}>
        <div className={s.tituloWrap}>
          <h3 className={s.titulo}>Tus medallas</h3>
          <button
            type="button"
            className={s.ayuda}
            onClick={() => setLeyendaAbierta(true)}
            aria-label="Cómo se leen tus medallas"
          >
            ?
          </button>
        </div>
        <div className={s.stats}>
          <span className={s.statNum}>
            {totalDesbloqueados}<small>/{TOTAL_MEDALLAS}</small>
          </span>
          <span className={s.statNivel}>
            {esVacio ? 'Empezando' : `Nivel ${nivelActualSrc.nivel} · ${nivelActualSrc.subtitulo}`}
          </span>
        </div>
      </header>

      <div className={s.barra} role="progressbar" aria-valuenow={totalDesbloqueados} aria-valuemax={TOTAL_MEDALLAS}>
        <i style={{ width: `${(totalDesbloqueados / TOTAL_MEDALLAS) * 100}%` }} />
      </div>

      <div className={s.niveles}>
        {nivelesConEstado.map((nivel) => {
          const desbloqueadasCt = nivel.badges.filter((b) => desbloqueadosActuales.has(b.id)).length
          const nivelBloqueado = nivel.bloqueado
          const faltan = nivel.umbralPrevio
            ? Math.max(0, nivel.umbralPrevio - (nivel.desbloqueadosPrevios ?? 0))
            : 0
          const desplegado = abierto === nivel.nivel
          const hayNuevaAca = nivel.badges.some((b) => badgesNuevos.has(b.id))

          return (
            <section
              key={nivel.nivel}
              className={`${s.nivel} ${nivelBloqueado ? s.nivelLocked : ''}`}
            >
              <button
                type="button"
                className={s.nivelHead}
                onClick={() => setNivelAbierto(desplegado ? -1 : nivel.nivel)}
                aria-expanded={desplegado}
              >
                <span className={s.levelBadge}>{nivel.nivel}</span>
                <span className={s.nivelLbl}>
                  <span className={s.nivelName}>{nivel.subtitulo}</span>
                  <span className={s.nivelSub}>
                    {getSubmensaje(nivel, desbloqueadasCt, nivelBloqueado)}
                  </span>
                </span>
                {hayNuevaAca && <span className={s.puntoNuevo} aria-label="Tienes una medalla nueva" />}
                {!nivelBloqueado && (
                  <span className={s.nivelPct}>
                    {desbloqueadasCt}<small>/{nivel.badges.length}</small>
                  </span>
                )}
              </button>

              {desplegado && (
                nivelBloqueado ? (
                  <p className={s.lockMsg}>
                    Llega a este nivel completando{' '}
                    <strong>{faltan === 1 ? '1 medalla más' : `${faltan} medallas más`}</strong>{' '}
                    del nivel {nivel.nivel - 1}.
                  </p>
                ) : (
                  <div className={s.grid} aria-live="polite">
                    {nivel.badges.map((m) => {
                      const desbloqueada = desbloqueadosActuales.has(m.id)
                      const esNueva = m.id === medallaReciente?.id
                      return (
                        <div
                          key={m.id}
                          id={m.id}
                          className={[
                            s.med,
                            desbloqueada ? s[`t${m.tono.charAt(0).toUpperCase()}${m.tono.slice(1)}`] : s.locked,
                            esNueva ? s.nueva : '',
                          ].filter(Boolean).join(' ')}
                          tabIndex={desbloqueada ? 0 : undefined}
                          role={desbloqueada ? 'button' : undefined}
                          aria-label={desbloqueada ? `Ver detalle de ${m.titulo}` : undefined}
                          onClick={desbloqueada ? () => setMedallaAbierta(m) : undefined}
                          onKeyDown={desbloqueada ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setMedallaAbierta(m)
                            }
                          } : undefined}
                        >
                          <span className={s.disc}>
                            <MedalIcon tono={m.tono} abierta={desbloqueada} />
                          </span>
                          <span className={s.medName}>
                            {desbloqueada ? m.titulo : 'Por descubrir'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </section>
          )
        })}
      </div>

      {medallaAbierta && (
        <MedallaDetalleModal
          medalla={medallaAbierta}
          dataBadge={dataBadge}
          onClose={() => setMedallaAbierta(null)}
        />
      )}
      {leyendaAbierta && <LeyendaMedallasModal onClose={() => setLeyendaAbierta(false)} />}
    </section>
  )
}
