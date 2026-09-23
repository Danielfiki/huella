import React, { useEffect, useId, useRef, useState } from 'react'
import styles from './Escarabajo.module.css'

// Personaje escarabajo de Huella — direccion "editorial cuaderno".
//
// Un solo SVG de 200x200 con la geometria del prototipo aprobado. Cada estado
// es un juego de numeros (giro de cabeza y antenas, salto, estiramiento,
// parpado y mirada) mas unos "extras" dibujados alrededor. Al cambiar de
// estado los numeros se interpolan en --motion-lenta con --motion-ease-entrada
// y los extras entran y salen con fade.
//
// Tres movimientos continuos: respiracion (CSS), parpadeo de los extras (CSS)
// y la linea que "hierve" (feTurbulence con seed cambiante). Con movimiento
// reducido no hay ninguno de los tres y el cambio de estado es directo.

export const ESTADOS_PERSONAJE = [
  { clave: 'saludando',   nombre: 'Saludando' },
  { clave: 'escuchando',  nombre: 'Escuchando' },
  { clave: 'pensando',    nombre: 'Pensando' },
  { clave: 'acompanando', nombre: 'Acompañando' },
  { clave: 'en_calma',    nombre: 'En calma' },
  { clave: 'curioso',     nombre: 'Curioso' },
  { clave: 'orgulloso',   nombre: 'Orgulloso' },
  { clave: 'celebrando',  nombre: 'Celebrando' },
  { clave: 'dormido',     nombre: 'Dormido' },
  { clave: 'buscando',    nombre: 'Buscando' },
]

// h: giro de cabeza · al/ar: antenas · y: salto · s: estiramiento vertical
// lid: parpado (0 abierto, 1 cerrado) · lx/ly: mirada · extras: dibujos
const POSES = {
  saludando:   { h: -4,  al: 12,  ar: -2,  y: -2,  s: 1.01, lid: 0,    lx: 1,    ly: 0,    extras: ['saludo'] },
  escuchando:  { h: 8,   al: 18,  ar: -18, y: 0,   s: 1,    lid: 0.1,  lx: 1.5,  ly: 0.5,  extras: [] },
  pensando:    { h: -6,  al: 4,   ar: 10,  y: 0,   s: 1,    lid: 0.2,  lx: -1.8, ly: -2,   extras: ['puntos'] },
  acompanando: { h: 6,   al: -18, ar: 18,  y: 4,   s: 0.97, lid: 0.55, lx: -1,   ly: 1.6,  extras: [] },
  en_calma:    { h: 0,   al: -6,  ar: 6,   y: 2,   s: 0.99, lid: 0.72, lx: 0,    ly: 1,    extras: [] },
  curioso:     { h: -10, al: 14,  ar: -4,  y: -2,  s: 1.01, lid: 0,    lx: 1.6,  ly: -1.6, extras: [] },
  orgulloso:   { h: 0,   al: 10,  ar: -10, y: -5,  s: 1.03, lid: 0.15, lx: 0,    ly: -1.2, extras: ['orgullo'] },
  celebrando:  { h: 0,   al: 24,  ar: -24, y: -12, s: 1.04, lid: 0,    lx: 0,    ly: -1.6, extras: ['orgullo', 'celebra'] },
  dormido:     { h: 4,   al: -24, ar: 24,  y: 4,   s: 0.96, lid: 1,    lx: 0,    ly: 0,    extras: ['zetas'] },
  buscando:    { h: -14, al: 20,  ar: 6,   y: 0,   s: 1,    lid: 0,    lx: -2.2, ly: 1,    extras: ['rastro'] },
}

const NUMEROS = ['h', 'al', 'ar', 'y', 's', 'lid', 'lx', 'ly']

// Patas con el punto donde se unen al cuerpo (pivote de la caminata).
// Marcha en tripode: A = izq. 1 y 3 + der. 2; B = el resto.
const PATAS = [
  { d: 'M64 112 L48 102 L44 86 L39 81',     o: [64, 112],  tripode: 'A', primera: true },
  { d: 'M60 134 L40 134 L30 146 L25 148',   o: [60, 134],  tripode: 'B' },
  { d: 'M66 156 L52 170 L52 182 L48 186',   o: [66, 156],  tripode: 'A' },
  { d: 'M136 112 L152 102 L156 86 L161 81', o: [136, 112], tripode: 'B' },
  { d: 'M140 134 L160 134 L170 146 L175 148', o: [140, 134], tripode: 'A' },
  { d: 'M134 156 L148 170 L148 182 L152 186', o: [134, 156], tripode: 'B' },
]
const PATA_SALUDANDO = 'M64 112 L50 94 L54 76 L50 70'

// ── Movimiento reducido ─────────────────────────────────────────────────
export function useMovimientoReducido() {
  const consulta = '(prefers-reduced-motion: reduce)'
  const [reducido, setReducido] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const alCambiar = () => setReducido(mq.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])
  return reducido
}

// ── Lectura de los tokens de movimiento ─────────────────────────────────
function leerToken(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
}

function duracionMs(nombre) {
  const valor = leerToken(nombre)
  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return 0
  return valor.endsWith('ms') ? n : n * 1000
}

// cubic-bezier(x1, y1, x2, y2) -> funcion de 0..1, resuelta por biseccion.
function curvaDesdeToken(nombre) {
  const m = leerToken(nombre).match(/cubic-bezier\(([^)]+)\)/)
  if (!m) return (t) => t
  const [x1, y1, x2, y2] = m[1].split(',').map(Number)
  const bez = (a, b, t) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3
  return (x) => {
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2
      if (bez(x1, x2, t) < x) lo = t
      else hi = t
    }
    return bez(y1, y2, t)
  }
}

// Interpola los numeros de la pose cada vez que cambia el estado.
function usePoseAnimada(estado, reducido) {
  const objetivo = POSES[estado] ?? POSES.saludando
  const [pose, setPose] = useState(objetivo)
  const actual = useRef(objetivo)

  useEffect(() => {
    const destino = POSES[estado] ?? POSES.saludando
    const duracion = reducido ? 0 : duracionMs('--motion-lenta')
    if (duracion <= 16) {
      actual.current = destino
      setPose(destino)
      return undefined
    }
    const desde = actual.current
    const curva = curvaDesdeToken('--motion-ease-entrada')
    const inicio = performance.now()
    let raf = 0
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - inicio) / duracion)
      const e = curva(p)
      const siguiente = { extras: destino.extras }
      for (const k of NUMEROS) siguiente[k] = desde[k] + (destino[k] - desde[k]) * e
      actual.current = siguiente
      setPose(siguiente)
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [estado, reducido])

  return pose
}

// ── Linea que hierve: un solo intervalo para todas las instancias ───────
const SEMILLAS = [3, 5, 8]
const turbulencias = new Set()
let intervaloHervor = null
let indiceSemilla = 0

function registrarHervor(el) {
  turbulencias.add(el)
  if (intervaloHervor) return
  intervaloHervor = setInterval(() => {
    indiceSemilla = (indiceSemilla + 1) % SEMILLAS.length
    const semilla = String(SEMILLAS[indiceSemilla])
    turbulencias.forEach((t) => t.setAttribute('seed', semilla))
  }, 130)
}

function soltarHervor(el) {
  turbulencias.delete(el)
  if (turbulencias.size === 0 && intervaloHervor) {
    clearInterval(intervaloHervor)
    intervaloHervor = null
  }
}

// ── Extras ──────────────────────────────────────────────────────────────
function Extra({ activo, reducido, children }) {
  return (
    <g className={styles.extra} style={{ opacity: activo ? 1 : 0 }} aria-hidden="true">
      <g className={activo && !reducido ? styles.parpadeo : undefined}>{children}</g>
    </g>
  )
}

export default function Escarabajo({ estado = 'saludando', tamano = 200, caminando = false }) {
  const reducido = useMovimientoReducido()
  const pose = usePoseAnimada(estado, reducido)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const turbRef = useRef(null)

  useEffect(() => {
    const el = turbRef.current
    if (reducido || !el) return undefined
    registrarHervor(el)
    return () => soltarHervor(el)
  }, [reducido])

  const { h, al, ar, y, s, lid, lx, ly } = pose
  const extras = (POSES[estado] ?? POSES.saludando).extras
  const saluda = extras.includes('saludo')
  const nombre = ESTADOS_PERSONAJE.find((e) => e.clave === estado)?.nombre ?? 'Saludando'

  const filtro = reducido ? undefined : `url(#hervor-${id})`
  const cuerpo = `translate(0 ${y}) translate(100 180) scale(1 ${s}) translate(-100 -180)`
  const cabeza = `rotate(${h} 100 92)`
  const corteParpado = 75.5 + 11 * lid

  return (
    <svg
      className={styles.svg}
      width={tamano}
      height={tamano}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Escarabajo ${nombre.toLowerCase()}`}
    >
      <defs>
        <filter id={`hervor-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern
          id={`achurado-${id}`}
          patternUnits="userSpaceOnUse"
          width="5"
          height="5"
          patternTransform="rotate(38)"
        >
          <line x1="0" y1="0" x2="0" y2="5" className={styles.lineaAchurado} />
        </pattern>
        <clipPath id={`parpado-${id}`}>
          <rect x="0" y="0" width="200" height={corteParpado} />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="188" rx="44" ry="5" className={styles.sombra} />

      <g transform={cuerpo}>
        <g className={reducido ? undefined : styles.respira}>
          <g filter={filtro}>
            {/* Patas */}
            {PATAS.map((p) => (
              <path
                key={p.d}
                d={p.d}
                className={[
                  styles.pata,
                  p.primera ? styles.conFade : '',
                  caminando && !reducido ? (p.tripode === 'A' ? styles.pasoA : styles.pasoB) : '',
                ].join(' ')}
                style={{
                  transformOrigin: `${p.o[0]}px ${p.o[1]}px`,
                  opacity: p.primera && saluda ? 0 : 1,
                }}
              />
            ))}
            <path
              d={PATA_SALUDANDO}
              className={`${styles.pata} ${styles.conFade}`}
              style={{ opacity: saluda ? 1 : 0 }}
            />

            {/* Elitros */}
            <path d="M97 104 C68 104 56 124 58 148 C60 170 80 182 97 180Z" className={styles.elitro} />
            <path d="M103 104 C132 104 144 124 142 148 C140 170 120 182 103 180Z" className={styles.elitro} />

            {/* Estrias */}
            <path d="M88 110 C80 130 80 156 88 174" className={styles.estria} />
            <path d="M78 114 C70 132 70 154 76 168" className={styles.estria} />
            <path d="M112 110 C120 130 120 156 112 174" className={styles.estria} />
            <path d="M122 114 C130 132 130 154 124 168" className={styles.estria} />

            {/* Achurado */}
            <path
              d="M142 138 C140 162 124 180 103 180 L103 158 C120 160 136 152 142 138Z"
              fill={`url(#achurado-${id})`}
              opacity="0.5"
            />
            <path
              d="M58 142 C60 162 76 178 97 180 L97 170 C80 170 66 160 58 142Z"
              fill={`url(#achurado-${id})`}
              opacity="0.25"
            />

            {/* Brillo */}
            <path d="M71 120 C67 132 67 144 71 152" className={styles.brillo} />

            {/* Pronoto */}
            <path d="M62 94 Q100 80 138 94 L136 106 Q100 116 64 106Z" className={styles.pronoto} />
            <path d="M72 96 Q100 88 128 96" className={styles.brilloPronoto} />

            {/* Cabeza sin ojos (los ojos van fuera del hervor) */}
            <g transform={cabeza}>
              <g transform={`rotate(${al} 90 72)`}>
                <path d="M90 72 Q78 58 72 46" className={styles.antena} />
                <ellipse cx="70" cy="43" rx="4.2" ry="2.3" transform="rotate(-40 70 43)" className={styles.puntaAntena} />
              </g>
              <g transform={`rotate(${ar} 110 72)`}>
                <path d="M110 72 Q122 58 128 46" className={styles.antena} />
                <ellipse cx="130" cy="43" rx="4.2" ry="2.3" transform="rotate(40 130 43)" className={styles.puntaAntena} />
              </g>
              <path d="M78 88 Q100 56 122 88 Q100 96 78 88Z" className={styles.cabeza} />
              <path d="M95 62 Q90 54 94 48" className={styles.antena} />
              <path d="M105 62 Q110 54 106 48" className={styles.antena} />
            </g>
          </g>

          {/* Ojos, sin hervor */}
          <g transform={cabeza}>
            {[89, 111].map((cx) => (
              <g key={cx}>
                <ellipse cx={cx} cy="81" rx="5.4" ry="5.7" className={styles.ojo} />
                <circle cx={cx + lx} cy={81 + ly} r="2.8" className={styles.pupila} />
                <ellipse
                  cx={cx}
                  cy="81"
                  rx="5.4"
                  ry="5.7"
                  className={styles.parpado}
                  clipPath={`url(#parpado-${id})`}
                />
              </g>
            ))}
            {lid > 0.98 && (
              <>
                <path d="M84.5 83 Q89 86 93.5 83" className={styles.ojoCerrado} />
                <path d="M106.5 83 Q111 86 115.5 83" className={styles.ojoCerrado} />
              </>
            )}
          </g>
        </g>
      </g>

      {/* Extras */}
      <g filter={filtro}>
        <Extra activo={extras.includes('saludo')} reducido={reducido}>
          <path d="M36 70 Q30 62 34 54" className={styles.trazo} />
          <path d="M28 74 Q20 62 26 50" className={styles.trazo} />
        </Extra>
        <Extra activo={extras.includes('puntos')} reducido={reducido}>
          <circle cx="146" cy="56" r="2.2" className={styles.punto} />
          <circle cx="156" cy="46" r="2.8" className={styles.punto} />
          <circle cx="168" cy="34" r="3.4" className={styles.punto} />
        </Extra>
        <Extra activo={extras.includes('orgullo')} reducido={reducido}>
          <path d="M56 46 L48 38" className={styles.trazo} />
          <path d="M100 30 L100 20" className={styles.trazo} />
          <path d="M144 46 L152 38" className={styles.trazo} />
        </Extra>
        <Extra activo={extras.includes('celebra')} reducido={reducido}>
          <path d="M40 70 L34 66" className={`${styles.trazo} ${styles.marcaTerracota}`} />
          <path d="M164 64 L170 58" className={`${styles.trazo} ${styles.marcaPistacho}`} />
          <path d="M30 100 L24 102" className={`${styles.trazo} ${styles.marcaPistacho}`} />
          <path d="M172 98 L178 100" className={`${styles.trazo} ${styles.marcaTerracota}`} />
        </Extra>
        <Extra activo={extras.includes('zetas')} reducido={reducido}>
          {/* Tamanos en unidades del dibujo (viewBox 200): escalan con el SVG. */}
          <text x="138" y="58" fontSize="14" className={styles.zeta}>z</text>
          <text x="150" y="44" fontSize="18" className={styles.zeta}>z</text>
          <text x="164" y="28" fontSize="22" className={styles.zeta}>z</text>
        </Extra>
        <Extra activo={extras.includes('rastro')} reducido={reducido}>
          <path d="M176 176 Q160 160 150 176 Q140 190 124 184" className={styles.rastro} />
        </Extra>
      </g>
    </svg>
  )
}
