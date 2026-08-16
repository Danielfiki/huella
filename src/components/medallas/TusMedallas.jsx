import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NIVELES, TOTAL_MEDALLAS, getSubmensaje } from './nivelesMedallas'
import { useMedallasNuevas, marcarVistos } from './medallasNuevas'
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
// La lógica de las medallas es la MISMA que tenía HitosPage: mismos ids,
// mismos checks, misma clave de localStorage. Lo que cambió es el envase.
//
// TODOS LOS NIVELES ARRANCAN COLAPSADOS (ajuste post-QA). Antes el nivel en
// curso llegaba abierto; ahora lo primero que se ve es la lista de niveles con
// su conteo N/M, y el padre despliega el que quiera. La única excepción es el
// `?highlight` (ej. "Ver tu medalla" desde el banner de plan completado), que
// sí abre el nivel de esa medalla: quien llega por ese link viene a ver algo
// puntual.
//
// El puntito terracota de "medalla nueva" vive en la cabecera de cada nivel y
// además en la pestaña "Tú" de la barra baja (ver `medallasNuevas.js`). Se
// apaga al desplegar el nivel que la contiene, que es cuando de verdad se ve.

export default function TusMedallas() {
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight')

  const [medallaAbierta, setMedallaAbierta] = useState(null)
  const [leyendaAbierta, setLeyendaAbierta] = useState(false)
  const [nivelAbierto, setNivelAbierto] = useState(null)

  const {
    clave,
    dataBadge,
    desbloqueados: desbloqueadosActuales,
    nuevas: badgesNuevos,
  } = useMedallasNuevas()

  // El anillo de "recién ganada" se congela al entrar. Si usara `badgesNuevos`
  // en vivo desaparecería en el mismo gesto de desplegar el nivel —
  // justamente cuando el padre acaba de abrirlo para mirarla.
  const nuevasAlEntrarRef = useRef(new Set())
  badgesNuevos.forEach((id) => nuevasAlEntrarRef.current.add(id))
  const medallaReciente = nuevasAlEntrarRef.current.size > 0
    ? { id: [...nuevasAlEntrarRef.current][0] }
    : null

  // Desplegar un nivel = ver sus medallas. Se marcan las que estén
  // desbloqueadas, y con eso se apagan su puntito y el de la pestaña "Tú".
  // También se marca en un nivel bloqueado: ahí el padre igual abrió y recibió
  // la explicación de cuánto le falta, y si no se marcara el punto quedaría
  // encendido para siempre, sin ningún gesto que lo apague.
  function verNivel(nivel) {
    const ids = nivel.badges
      .filter((b) => desbloqueadosActuales.has(b.id))
      .map((b) => b.id)
    if (ids.length) marcarVistos(clave, ids)
  }

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

  // Nivel desplegado: SOLO el que el padre haya tocado. Sin toque no hay nada
  // abierto — la sección arranca entera colapsada. La única excepción es el
  // ?highlight (ej. "Ver tu medalla" desde el banner de plan completado), que
  // abre el nivel de esa medalla porque el link viene a mostrar algo puntual.
  const nivelDelHighlight = highlight
    ? nivelesConEstado.find((n) => n.badges.some((b) => b.id === highlight))?.nivel ?? null
    : null
  const abierto = nivelAbierto ?? nivelDelHighlight

  useEffect(() => {
    if (!highlight) return
    // Llegar por el link también es ver la medalla: se apaga su puntito y el
    // de la pestaña "Tú" sin pedirle al padre que despliegue lo ya abierto.
    const nivel = NIVELES.find((n) => n.badges.some((b) => b.id === highlight))
    if (nivel) verNivel(nivel)
    const timer = setTimeout(() => {
      document.getElementById(highlight)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, desbloqueadosActuales])

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
                onClick={() => {
                  if (desplegado) { setNivelAbierto(-1); return }
                  setNivelAbierto(nivel.nivel)
                  verNivel(nivel)
                }}
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
