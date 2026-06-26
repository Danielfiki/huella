import React, { useRef, useState, useLayoutEffect } from 'react'
import { Settings } from 'lucide-react'
import Escarabajo from '../ui/Escarabajo'
import s from './RetratoSendero.module.css'

// Retrato "El Sendero" (motor de rasgos · 4B). Diseño final del handoff de
// Design. Un solo valor `progreso` (rasgos confirmados / totales) controla TODO:
// cuánto del camino se dibuja, el aro del medallón y cuánto color tiene la foto.
//
// El handoff vive en un lienzo de referencia de 394x432; acá NO se hardcodean
// píxeles: el SVG usa ese viewBox y los overlays se posicionan en % del lienzo,
// así el retrato escala al ancho real del header manteniendo las proporciones.
const CANVAS_W = 394
const CANVAS_H = 432

// Molde fijo del camino (spline Catmull-Rom ya resuelta a beziers en el handoff).
const PATH_D = 'M 168 292 C 158.3 296.3, 127.7 326.7, 110 318 C 92.3 309.3, 66.3 261.7, 62 240 C 57.7 218.3, 85.7 206.0, 84 188 C 82.3 170.0, 50.7 149.3, 52 132 C 53.3 114.7, 82.3 97.3, 92 84 C 101.7 70.7, 97.8 56.0, 110 52 C 122.2 48.0, 150.5 57.3, 165 60 C 179.5 62.7, 185.8 68.3, 197 68 C 208.2 67.7, 216.8 60.0, 232 58 C 247.2 56.0, 273.3 49.7, 288 56 C 302.7 62.3, 318.0 80.3, 320 96 C 322.0 111.7, 296.0 133.3, 300 150 C 304.0 166.7, 343.0 181.0, 344 196 C 345.0 211.0, 308.0 224.7, 306 240 C 304.0 255.3, 338.0 276.0, 332 288 C 326.0 300.0, 287.7 311.0, 270 312 C 252.3 313.0, 233.3 297.0, 226 294'

// Waypoints en orden de recorrido (18). Hitos = índices 1,4,7,10,13,16
// (1 hito cada 2 rasgos confirmados).
const WAYPOINTS = [
  [168, 292], [110, 318], [62, 240], [84, 188], [52, 132], [92, 84],
  [110, 52], [165, 60], [197, 68], [232, 58], [288, 56], [320, 96],
  [300, 150], [344, 196], [306, 240], [332, 288], [270, 312], [226, 294],
]
const HITOS = new Set([1, 4, 7, 10, 13, 16])

// Segmentos del path, para medir la longitud acumulada hasta cada waypoint
// (así se sabe qué nodos ya recorrió el escarabajo).
const PATH_PARTS = PATH_D.split(/\s*C\s*/)   // [move, cuerpo1, cuerpo2, ...]
const PATH_MOVE = PATH_PARTS[0]
const PATH_SEGS = PATH_PARTS.slice(1).map((b) => 'C ' + b.trim())

// Circunferencia del aro de progreso (r=103 en el viewBox 222 del medallón).
const ARO_CIRC = 2 * Math.PI * 103

const SVG_NS = 'http://www.w3.org/2000/svg'

export default function RetratoSendero({ nombre, avatarUrl, rasgosConfirmados, rasgosTotales, onAjustes }) {
  const total = rasgosTotales > 0 ? rasgosTotales : 1
  const progreso = Math.max(0, Math.min(rasgosConfirmados / total, 1))

  const pathRef = useRef(null)
  const [geom, setGeom] = useState(null)

  // Mide el path real (getTotalLength/getPointAtLength) para ubicar el
  // escarabajo en la PUNTA del tramo recorrido (rotado a la tangente) y para
  // saber qué nodos ya se recorrieron. useLayoutEffect: se calcula antes del
  // pintado, sin parpadeo. El tramo del camino y el aro se revelan por CSS.
  useLayoutEffect(() => {
    const path = pathRef.current
    if (!path) return
    const L = path.getTotalLength()
    const recorrido = progreso * L

    const p1 = path.getPointAtLength(recorrido)
    const p0 = path.getPointAtLength(Math.max(0, recorrido - 1))
    // Tangente (dirección de avance) + 90°: orienta el escarabajo "caminando".
    const ang = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI + 90

    const medidor = document.createElementNS(SVG_NS, 'path')
    const nodos = WAYPOINTS.map((_, i) => {
      if (i === 0) return true
      medidor.setAttribute('d', PATH_MOVE + ' ' + PATH_SEGS.slice(0, i).join(' '))
      return medidor.getTotalLength() <= recorrido + 0.5
    })

    setGeom({ tipX: p1.x, tipY: p1.y, ang, nodos })
  }, [progreso])

  // Recorte de la capa B/N: queda en blanco y negro la parte superior aún no
  // "madurada"; el color sube desde abajo según avanza el sendero.
  const corteBN = `${(1 - progreso) * 100}%`

  return (
    <header className={s.hero}>
      <button className={s.ajustes} onClick={onAjustes} aria-label="Ajustes de perfil">
        <Settings size={18} />
      </button>

      {/* Camino + nodos + texto: todo en el SVG del lienzo (escala con el ancho real). */}
      <svg className={s.lienzo} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} aria-hidden="true">
        <defs>
          {/* pathLength=1 normaliza el largo: la mask revela la fracción `progreso`. */}
          <mask id="sendero-rev">
            <path
              d={PATH_D}
              className={s.revPath}
              pathLength="1"
              style={{ strokeDashoffset: 1 - progreso }}
            />
          </mask>
        </defs>

        {/* Path invisible de medición (getTotalLength / getPointAtLength). */}
        <path ref={pathRef} d={PATH_D} fill="none" stroke="none" />

        {/* Línea punteada del camino, recortada al tramo recorrido por la mask. */}
        <path d={PATH_D} className={s.camino} mask="url(#sendero-rev)" />

        {/* Nodos: solo los waypoints ya recorridos. */}
        {geom && WAYPOINTS.map(([cx, cy], i) => (
          geom.nodos[i] ? (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={HITOS.has(i) ? 6.5 : 4.5}
              className={HITOS.has(i) ? s.nodoHito : s.nodoNormal}
            />
          ) : null
        ))}

        {/* Texto abajo-izquierda: etiqueta (Plus Jakarta) + nombre (Fraunces). */}
        <text x="22" y="370" fontSize="11" letterSpacing="2.4" className={s.etiqueta}>
          {rasgosConfirmados} DE {rasgosTotales} RASGOS
        </text>
        <text x="22" y="406" fontSize="36" letterSpacing="-0.72" className={s.nombre}>
          {nombre}
        </text>
      </svg>

      {/* Medallón (foto que madura + aro), overlay HTML posicionado en % del lienzo. */}
      <div className={s.medallon}>
        <div className={s.foto}>
          {avatarUrl ? (
            <>
              <img src={avatarUrl} alt={nombre} className={s.fotoColor} />
              <img
                src={avatarUrl}
                alt=""
                aria-hidden="true"
                className={s.fotoDuo}
                style={{ clipPath: `polygon(0 0, 100% 0, 100% ${corteBN}, 0 ${corteBN})` }}
              />
            </>
          ) : (
            <Escarabajo className={s.fotoPlaceholder} />
          )}
        </div>
        <svg className={s.aro} viewBox="0 0 222 222" aria-hidden="true">
          <circle cx="111" cy="111" r="103" className={s.aroRiel} />
          <circle
            cx="111"
            cy="111"
            r="103"
            className={s.aroActivo}
            style={{ strokeDasharray: ARO_CIRC, strokeDashoffset: ARO_CIRC * (1 - progreso) }}
            transform="rotate(-90 111 111)"
          />
        </svg>
      </div>

      {/* Escarabajo en la punta del tramo recorrido (overlay HTML en % del lienzo). */}
      {geom && (
        <span
          className={s.bicho}
          style={{
            left: `${(geom.tipX / CANVAS_W) * 100}%`,
            top: `${(geom.tipY / CANVAS_H) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${geom.ang}deg)`,
          }}
          aria-hidden="true"
        >
          <Escarabajo className={s.bichoSvg} />
        </span>
      )}
    </header>
  )
}
