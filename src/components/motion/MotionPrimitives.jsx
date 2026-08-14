// MotionPrimitives.jsx
// Base del sistema de movimiento de Huella. Estas tres piezas son las que
// reusara el Home nuevo; el laboratorio de /mockups solo las muestra.
//
// Regla que ordena el archivo: LOS VALORES VIVEN EN index.css.
// framer-motion necesita numeros (no puede recibir `var(--motion-media)`),
// asi que en vez de escribir 300 a mano se leen los tokens del :root una vez
// y se cachean. Si Daniel cambia una duracion en index.css, esto la sigue.

import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

// ── Lectura de tokens ──────────────────────────────────────────────────────

// Valores de respaldo, identicos a los de index.css. Solo se usan si el CSS
// todavia no se aplico (primer render en SSR o test sin estilos).
const FALLBACK = {
  rapida: 0.15,
  media:  0.30,
  lenta:  0.50,
  easeEstandar: [0.4, 0, 0.2, 1],
  easeEntrada:  [0.22, 0.61, 0.36, 1],
  easeSalida:   [0.4, 0, 1, 1],
  desplazamiento: 12,
}

let cache = null

// '300ms' | '0.3s' → 0.3 (framer trabaja en segundos)
function aSegundos(raw, porDefecto) {
  const v = String(raw || '').trim()
  if (v.endsWith('ms')) {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n / 1000 : porDefecto
  }
  if (v.endsWith('s')) {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : porDefecto
  }
  return porDefecto
}

// 'cubic-bezier(0.4, 0, 0.2, 1)' → [0.4, 0, 0.2, 1]
function aBezier(raw, porDefecto) {
  const m = String(raw || '').match(/cubic-bezier\(([^)]+)\)/)
  if (!m) return porDefecto
  const nums = m[1].split(',').map((n) => parseFloat(n.trim()))
  return nums.length === 4 && nums.every(Number.isFinite) ? nums : porDefecto
}

export function tokensMovimiento() {
  if (cache) return cache
  if (typeof window === 'undefined') return FALLBACK
  const cs = getComputedStyle(document.documentElement)
  const leer = (n) => cs.getPropertyValue(n)
  cache = {
    rapida: aSegundos(leer('--motion-rapida'), FALLBACK.rapida),
    media:  aSegundos(leer('--motion-media'),  FALLBACK.media),
    lenta:  aSegundos(leer('--motion-lenta'),  FALLBACK.lenta),
    easeEstandar: aBezier(leer('--motion-ease-estandar'), FALLBACK.easeEstandar),
    easeEntrada:  aBezier(leer('--motion-ease-entrada'),  FALLBACK.easeEntrada),
    easeSalida:   aBezier(leer('--motion-ease-salida'),   FALLBACK.easeSalida),
    desplazamiento: parseFloat(leer('--motion-desplazamiento')) || FALLBACK.desplazamiento,
  }
  return cache
}

// Los tokens se leen una vez y se cachean, pero `prefers-reduced-motion` puede
// cambiar en caliente (el usuario lo activa con la app abierta). Esto invalida
// el cache para que la proxima lectura traiga el 1ms.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener?.('change', () => { cache = null })
}

// Envoltorio del hook de framer: devuelve booleano siempre (framer puede
// devolver null antes de resolver la media query).
export function useMovimientoReducido() {
  return useReducedMotion() === true
}

// ── 1. Entrada de tarjeta ──────────────────────────────────────────────────
// Aparece cuando entra al viewport, una sola vez. Con movimiento reducido no
// se desplaza ni tarda: aparece y ya.

export function TarjetaEntrada({ children, delay = 0, className, as = 'div' }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, margin: '-40px' })
  const Etiqueta = motion[as] ?? motion.div

  return (
    <Etiqueta
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: reducido ? 0 : t.desplazamiento }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{
        duration: reducido ? 0 : t.media,
        ease: t.easeEntrada,
        delay: reducido ? 0 : delay,
      }}
    >
      {children}
    </Etiqueta>
  )
}

// ── 2. Barra que crece ─────────────────────────────────────────────────────
// `valor` y `max` son los mismos numeros que ya calcula la app (medallas
// desbloqueadas, semanas del plan, rasgos confirmados). El ancho se anima de
// 0 al porcentaje real cuando la barra entra en pantalla.

export function BarraProgreso({
  valor = 0,
  max = 100,
  className,
  color = 'var(--color-primary)',
  etiqueta,
}) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, margin: '-40px' })

  const pct = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0

  return (
    <div
      ref={ref}
      className={className}
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={etiqueta}
      style={{
        width: '100%',
        height: 8,
        borderRadius: 999,
        background: 'var(--color-surface-alt)',
        overflow: 'hidden',
      }}
    >
      <motion.i
        initial={{ width: '0%' }}
        animate={visible ? { width: `${pct}%` } : undefined}
        transition={{ duration: reducido ? 0 : t.lenta, ease: t.easeEntrada }}
        style={{ display: 'block', height: '100%', borderRadius: 999, background: color }}
      />
    </div>
  )
}

// ── 3. Numero que cuenta ───────────────────────────────────────────────────
// Sube de 0 al valor real con la misma curva de entrada. Se hace con rAF y no
// con `animate()` de framer porque lo que se anima es texto, no una propiedad
// de estilo: asi el nodo pintado es un string normal y hereda la tipografia
// sin trucos.

function bezierY(p1x, p1y, p2x, p2y, t) {
  // Aproximacion suficiente para un contador: se evalua la bezier por su
  // parametro, no por x. La diferencia no se percibe a estas duraciones.
  const u = 1 - t
  return 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t
}

export function NumeroQueCuenta({ valor = 0, decimales = 0, className, sufijo = '' }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, margin: '-40px' })
  const [mostrado, setMostrado] = useState(reducido ? valor : 0)

  useEffect(() => {
    if (!visible) return undefined
    if (reducido) { setMostrado(valor); return undefined }

    const duracionMs = t.lenta * 1000
    const [p1x, p1y, p2x, p2y] = t.easeEntrada
    const inicio = performance.now()
    let raf

    const paso = (ahora) => {
      const avance = Math.min(1, (ahora - inicio) / duracionMs)
      const eased = bezierY(p1x, p1y, p2x, p2y, avance)
      setMostrado(valor * eased)
      if (avance < 1) raf = requestAnimationFrame(paso)
      else setMostrado(valor)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [visible, valor, reducido, t])

  return (
    <span ref={ref} className={className}>
      {mostrado.toFixed(decimales)}{sufijo}
    </span>
  )
}
