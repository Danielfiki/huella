import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella, calcularEdadDecimal } from '../../context/HuellaContext'
import ConsejoDelDiaModal from '../../components/ui/ConsejoDelDiaModal'
import UpgradeModal from '../../components/ui/UpgradeModal'
import { useConsejoDiario } from '../../components/ui/useConsejoDiario'
import { CabeceraHijo } from '../../components/panel/CabeceraHijo'
import PropuestaRasgo from '../../components/hijo/PropuestaRasgo'
import { BotonRegistrar } from '../../components/panel/BotonRegistrar'
import { PuertaHuella, PuertaCerebro, PuertaMomentos, PuertaAcompanando } from '../../components/panel/Puertas'
import AnalisisSemanalCard from '../../components/panel/AnalisisSemanalCard'
import { TarjetaEntrada } from '../../components/motion/MotionPrimitives'
import { MAX_EPISODIOS_FREE } from '../estrategias/helpers'
import { esFamiliaPositiva } from '../../utils/umbralRasgos'
import { AHORA, porTope } from '../cerebro/contenidoCerebro'
import styles from './PanelPage.module.css'

// UNO POR VISITA. Cuando el papa responde la propuesta de rasgo, la card se
// va y el siguiente candidato espera a que vuelva a abrir la app. Encadenar
// tres seguidas se siente a examen, y esta es la unica pregunta que Huella le
// hace: si cansa, deja de responderla.
//
// Vive en el modulo y no en el componente a proposito. En el componente se
// perderia al navegar, porque cada cambio de ruta desmonta el Home, y el papa
// veria la siguiente card solo por haber ido a registrar y vuelto. Aca
// sobrevive a la navegacion y se limpia sola cuando la app se carga de nuevo.
//
// Guarda hijoId y no rasgoId: si el papa cambia de hijo, la card del otro si
// se muestra.
//
// No es estado de React y no dispara render por si solo, y no hace falta:
// cambiarEstadoRasgo despacha el estado nuevo de forma optimista, o sea
// sincronica, asi que el render que viene detras ya lee este Set lleno.
const hijosRespondidosEstaVisita = new Set()

// ── Home · Bloque B2 del rediseño ────────────────────────────────────────────
//
// El Home dejó de ser un dashboard de secciones: ahora es LA PÁGINA DEL HIJO.
// Tres bloques, de arriba a abajo: (A) su cara, la propuesta de rasgo si hay
// y UNA acción; (B) la card "Esta semana", única lectura de la semana; (C)
// cuatro puertas compactas: Su huella, Su cerebro, Momentos, Acompañando.
//
// Regla de texto (dura): ningún párrafo visible de entrada. Los gráficos se
// mudaron al final de la pantalla del cerebro ("Sus momentos en números").
//
// Lo que se fue de acá: Hero de doble avatar, CTAPrimary con subtexto,
// CTAAskHuella suelto, SectionEyebrows, ResumenSemanal como tarjeta aparte,
// EstadoVacio, AnticipoRetratoCard, GuiaPrimerosPasos como banner, la card de
// último avance y la de estrategia activa (su dato vive en las puertas), y
// CanjeCodigoBeta, que se mudó a Perfil.

// Cuántas fotos entran en la rotación de la cabecera y cuántos momentos
// dibujan la mini-timeline de la puerta "Momentos".
const MAX_FOTOS_CABECERA = 5
const DIAS_PATRON_NUEVO = 3
const CUPO_AVISO_DESDE = 3   // quedan 3 o menos → aparece el chip

// ── Página principal ──────────────────────────────────────────────────────────

export default function PanelPage() {
  const { user } = useAuth()
  const { state, setHijoActivo, isPro, confirmarRasgo, descartarRasgo, completarAnalisisSemanal } = useHuella()
  const navigate = useNavigate()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeCopy, setUpgradeCopy] = useState(null)

  const { hijo, hijos, episodios, hitos, estrategias, rasgos, padreNombre } = state
  const nombreHijo = hijo?.nombre || 'tu hijo/a'

  // Motor de rasgos · el candidato que se le propone al papa.
  //
  // DERIVADO DEL ESTADO, NUNCA FIJADO EN UN EFECTO. La version anterior vivia
  // en HijoPage y guardaba el candidato en un useState que un efecto llenaba.
  // Eran dos efectos que se pisaban —uno fijaba, otro reiniciaba a null en el
  // mismo commit— y el valor neto iba de null a null, asi que React no volvia
  // a renderizar y la card NO SE MOSTRO NUNCA, a nadie. Derivarlo en el render
  // hace esa carrera imposible: no hay estado intermedio que sincronizar.
  //
  // Se propone el mas antiguo en estado candidato del hijo activo. Al
  // resolverlo la card desaparece y el siguiente NO entra en esta visita: lo
  // frena hijosRespondidosEstaVisita, arriba.
  //
  // Si lo ultimo que respondio el papa fue un "cuesta", va primero un positivo.
  // El 16 sep lo positivo no llegaba a candidato y la card solo preguntaba lo dificil.
  const candidato = useMemo(() => {
    const delHijo = (rasgos || []).filter((r) => r.hijoId === hijo?.id)
    const porFecha = (campo) => (a, b) => String(a[campo] ?? '').localeCompare(String(b[campo] ?? ''))

    const suyos = delHijo.filter((r) => r.estado === 'candidato')
    suyos.sort(porFecha('createdAt'))

    const respondidos = delHijo.filter((r) => r.estado === 'confirmado' || r.estado === 'descartado')
    respondidos.sort(porFecha('updatedAt'))
    const ultimo = respondidos[respondidos.length - 1]

    if (ultimo?.familia === 'cuesta') {
      const positivo = suyos.find((r) => esFamiliaPositiva(r.familia))
      if (positivo) return positivo
    }
    return suyos[0] ?? null
  }, [rasgos, hijo?.id])

  // El badge "Algo nuevo" de la puerta se enciende SOLO con candidato. Antes
  // tambien lo prendia un emergente, que es un rasgo que el papa no puede
  // responder: con 61 emergentes contra 9 candidatos en la base, el badge
  // estaba encendido casi siempre por algo que no se podia accionar.
  const rasgoCandidato = !!candidato

  // El badge de la puerta sigue encendido aunque el papa ya haya respondido
  // hoy: ahi adentro TODAVIA hay algo nuevo. Lo que se guarda para la proxima
  // visita es la pregunta, no el aviso.
  const candidatoVisible =
    hijo && hijosRespondidosEstaVisita.has(hijo.id) ? null : candidato

  // Marca el hijo como respondido ANTES de disparar la accion. Si la escritura
  // falla, cambiarEstadoRasgo revierte el rasgo a candidato y vuelve a salir
  // la proxima vez que abra.
  function responderCandidato(accion, rasgoId) {
    if (hijo) hijosRespondidosEstaVisita.add(hijo.id)
    return accion(rasgoId)
  }

  const rasgosConfirmadosCount = (rasgos || []).filter(
    (r) => r.estado === 'confirmado' && r.hijoId === hijo?.id
  ).length
  const userName = padreNombre || user?.email?.split('@')[0] || 'tú'

  // Consejo del día: vive en la campana de la cabecera. Visible solo si hay
  // datos suficientes. Puntito terracota mientras no se vea.
  const consejo = useConsejoDiario({ user, hijo, episodios, hitos, estrategias })
  const [consejoAbierto, setConsejoAbierto] = useState(false)
  function abrirConsejo() {
    setConsejoAbierto(true)
    consejo.marcarVisto()
  }

  const estrategiaActiva = useMemo(
    () => (estrategias || []).find(e => e.semanaActual <= 4 && !e.completado_at),
    [estrategias]
  )

  // Fotos de la cabecera: el avatar del hijo primero y después las fotos de
  // hitos más recientes. Sin ninguna, la cabecera dibuja el placeholder.
  const fotosCabecera = useMemo(() => {
    const lista = [hijo?.avatarUrl, ...hitos.filter(h => h.foto_url).map(h => h.foto_url)]
    return [...new Set(lista.filter(Boolean))].slice(0, MAX_FOTOS_CABECERA)
  }, [hijo?.avatarUrl, hitos])

  const fotoUltimoAvance = useMemo(
    () => hitos.find(h => h.foto_url)?.foto_url ?? null,
    [hitos]
  )

  // Patrones abiertos del hijo activo, del más reciente al más viejo por
  // created_at (NUNCA por gravedad ni clasificación).
  const patronesAbiertos = useMemo(
    () => (state.patrones || [])
      .filter(p => p.estado === 'abierto' && p.hijo_id === hijo?.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [state.patrones, hijo?.id]
  )

  const hayPatronNuevo = useMemo(
    () => patronesAbiertos.some(
      p => Date.now() - new Date(p.created_at).getTime() < DIAS_PATRON_NUEVO * 864e5
    ),
    [patronesAbiertos]
  )

  // Un momento es un episodio o un avance, igual que en el Historial. Lo usan
  // la puerta Momentos y la card "Esta semana"; el cupo free sigue contando
  // solo episodios.
  const totalMomentos = episodios.length + hitos.length

  // Análisis semanal guardado (lo genera HuellaContext al cargar). Se compara
  // el hijo porque el guardado puede ser de otro hijo si el papá cambió
  // mientras se generaba.
  const analisisSemanal =
    state.analisisSemanal?.hijo_id === hijo?.id ? state.analisisSemanal : null

  // Dato de la puerta "Su cerebro": la frase "Ahora mismo" de su edad, la
  // misma de la pantalla del cerebro. Sin fecha ni edad guardada no se inventa
  // una edad: va la invitación que tenía el viejo CTA.
  const edadCerebro = calcularEdadDecimal(hijo?.fechaNacimiento) ?? (typeof hijo?.edad === 'number' ? hijo.edad : null)
  const fraseCerebro = edadCerebro != null
    ? porTope(AHORA, edadCerebro)
    : 'Tócalo, gíralo, velo crecer'

  // Chip de cupo del plan free: solo cuando de verdad queda poco.
  const cupoRestante = MAX_EPISODIOS_FREE - episodios.length
  const avisoCupo = !isPro() && cupoRestante <= CUPO_AVISO_DESDE
    ? (cupoRestante > 0
        ? `Te quedan ${cupoRestante} momento${cupoRestante === 1 ? '' : 's'} del plan gratuito`
        : `Llegaste a los ${MAX_EPISODIOS_FREE} momentos del plan gratuito`)
    : null

  // Abre el UpgradeModal con el copy del gate de análisis de patrones.
  function abrirUpgradeAnalisis() {
    setUpgradeCopy({
      titulo: 'Huella ve el cuadro completo',
      mensaje: 'Con Huella Pro desbloqueas qué merece atención en tu hijo, por qué ocurre y los próximos pasos concretos.',
    })
    setShowUpgrade(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.cabeceraBleed}>
        <CabeceraHijo
          nombreHijo={nombreHijo}
          fotos={fotosCabecera}
          padreNombre={userName}
          padreAvatarUrl={state.padreAvatarUrl}
          onFotoClick={() => navigate('/hijo')}
          onPadreClick={() => navigate('/perfil')}
          bellActive={consejo.visible}
          bellHasNew={consejo.tieneConsejoNuevo}
          onBellClick={abrirConsejo}
        />
      </div>

      {consejoAbierto && (
        <ConsejoDelDiaModal
          frase={consejo.frase}
          loading={consejo.loading}
          onClose={() => setConsejoAbierto(false)}
        />
      )}

      {/* ── Selector de hijo (solo si hay más de uno) ── */}
      {hijos.length > 1 && (
        <div className={styles.selectorHijos}>
          {hijos.map(h => (
            <button
              key={h.id}
              type="button"
              className={`${styles.selectorChip} ${h.id === state.hijoActivoId ? styles.selectorChipActivo : ''}`}
              onClick={() => setHijoActivo(h.id)}
            >
              {h.nombre}
            </button>
          ))}
          <button
            type="button"
            className={styles.selectorAddBtn}
            onClick={() => {
              // Gate 2do hijo: free limitado a 1; Pro/Admin, ilimitados.
              if (!isPro() && hijos.length >= 1) {
                setUpgradeCopy({
                  titulo: 'Cada hijo tiene su huella',
                  mensaje: 'Con Huella Pro registras a todos tus hijos y acompañas la huella única de cada uno.',
                })
                setShowUpgrade(true)
                return
              }
              navigate('/hijo?nuevo=true')
            }}
            aria-label="Agregar hijo"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* ── Lo unico que Huella le pide al papa ──
           Va arriba de la tarjeta central a proposito: es la unica pregunta
           de la app y tiene que verse al abrir, sin bajar ni entrar a nada.
           Antes vivia en una pestana de HijoPage y casi nadie la respondia. ── */}
      {candidatoVisible && (
        <PropuestaRasgo
          rasgo={candidatoVisible}
          nombreHijo={nombreHijo}
          hijo={hijo}
          onConfirmar={(id) => responderCandidato(confirmarRasgo, id)}
          onDescartar={(id) => responderCandidato(descartarRasgo, id)}
        />
      )}

      {/* ── La única acción ── */}
      <BotonRegistrar onClick={() => navigate('/nuevo')} avisoCupo={avisoCupo} />

      {/* ── Esta semana: la única lectura de la semana. Guía si la cuenta es
           nueva, barras siempre, y el análisis cuando lo hay. ── */}
      {hijo && (
        <AnalisisSemanalCard
          key={analisisSemanal?.id ?? 'sin-analisis'}
          analisis={analisisSemanal}
          generando={state.analisisGenerando === hijo.id}
          episodios={episodios}
          hitos={hitos}
          nombreHijo={nombreHijo}
          bloqueado={!isPro()}
          onUpgrade={abrirUpgradeAnalisis}
          onVerEstrategias={() => navigate('/estrategias')}
          onPedirCompleto={completarAnalisisSemanal}
        />
      )}

      {/* ── Puertas ── */}
      <div className={styles.puertas}>
        <TarjetaEntrada delay={0}>
          <PuertaHuella
            nombreHijo={nombreHijo}
            fotoHijo={hijo?.avatarUrl ?? null}
            confirmados={rasgosConfirmadosCount}
            hayNovedad={rasgoCandidato}
            onClick={() => navigate('/hijo')}
          />
        </TarjetaEntrada>
        <TarjetaEntrada delay={0.06}>
          <PuertaCerebro
            ahora={fraseCerebro}
            onClick={() => navigate('/cerebro')}
          />
        </TarjetaEntrada>

        <TarjetaEntrada delay={0.12}>
          <PuertaMomentos
            total={totalMomentos}
            ultimos={episodios}
            fotoAvance={fotoUltimoAvance}
            onClick={() => navigate('/historial')}
          />
        </TarjetaEntrada>

        {/* B3 · esta puerta ya no se condiciona a tener plan o patrones: con
            Estrategias fuera de la tab bar, es la única entrada a /estrategias.
            Sin nada que acompañar se muestra en modo "explorar".

            Tres destinos, porque la puerta junta dos cosas distintas: el plan
            vive en /estrategias, pero los patrones NUNCA estuvieron ahí (pared
            dura: patrones, estrategias y motor de rasgos son cosas separadas).
            Cada chip abre la lectura de SU patrón y el "+N" abre Momentos
            filtrado, que es donde se ven todos. */}
        <TarjetaEntrada delay={0.18}>
          <PuertaAcompanando
            nombreHijo={nombreHijo}
            plan={estrategiaActiva ?? null}
            patrones={patronesAbiertos}
            hayPatronNuevo={hayPatronNuevo}
            onClick={() => navigate('/estrategias')}
            onPatronClick={(id) => navigate(`/patron/${id}`)}
            onVerTodos={() => navigate('/historial', { state: { filtro: 'patrones' } })}
          />
        </TarjetaEntrada>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          tituloCustom={upgradeCopy?.titulo}
          mensajeCustom={upgradeCopy?.mensaje}
        />
      )}
    </div>
  )
}
