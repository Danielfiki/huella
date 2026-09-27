import React, { useState, useRef, useEffect } from 'react'
import styles from './AlivioHuella.module.css'

// ──────────────────────────────────────────────────────────────────────
// EL ALIVIO — lo primero que el padre lee después de guardar.
//
// Lo que sigue después de contar algo difícil no es un recibo del sistema, es
// la respuesta de alguien que escuchó. Por eso desapareció el "Episodio
// registrado": que Huella conteste ya prueba que se guardó.
//
// Ya NO va en una burbuja: se escribe directo sobre el crema, en Fraunces, como
// la voz de la pantalla. Quién habla lo dice el sello de arriba (el disco del
// escarabajo + "huella te lee"), así que el avatar de esta fila sobraba.
//
// Las comillas dobles marcan las palabras textuales del padre —así lo pide el
// prompt, porque en la respuesta está prohibido el markdown— y acá se pintan en
// cursiva mocha, con comillas tipográficas. Si el modelo no citó nada, el texto
// se muestra igual.
// ──────────────────────────────────────────────────────────────────────

// Desacopla lo que se ve de lo que va llegando.
//
// El stream entrega bloques grandes —el QA los vio caer en cuatro saltos— y
// pintarlos directo se lee como cuatro golpes de texto. Esto avanza siempre a
// ritmo parejo hacia lo último recibido, así que el tamaño de los chunks deja
// de notarse y el crecimiento carácter a carácter no da saltos de layout.
//
// El paso es proporcional a lo que falta: si entra un bloque gordo, acelera
// para no quedarse atrás, y desacelera al alcanzarlo.
//
// 18ms y no 28: el alivio pasó a Fraunces 18px, y a ese tamaño el tick lento se
// notaba como una máquina de escribir. Acá tiene que leerse como alguien
// hablando, no como texto apareciendo.
const MS_TICK = 18

function useRevelado(texto) {
  const [visible, setVisible] = useState('')
  const metaRef = useRef(texto)
  metaRef.current = texto

  // Sin animación para quien la pidió apagada: el texto aparece y ya.
  const sinMovimiento = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (sinMovimiento) return
    const id = setInterval(() => {
      setVisible((v) => {
        const meta = metaRef.current
        // Cambió la raíz del texto (un reintento, otro episodio): no se anima
        // un texto que ya no existe.
        if (!meta.startsWith(v)) return meta
        if (v.length >= meta.length) return v
        const paso = Math.max(2, Math.ceil((meta.length - v.length) / 12))
        return meta.slice(0, v.length + paso)
      })
    }, MS_TICK)
    return () => clearInterval(id)
  }, [sinMovimiento])

  return sinMovimiento ? texto : visible
}

// Parte el texto en trozos, separando lo que va entre comillas dobles. Las
// comillas rectas del modelo se devuelven como comillas tipográficas: es texto
// editorial en Fraunces, y ahí las rectas se ven como código.
function conCitas(texto) {
  return texto.split(/"([^"]+)"/g).map((trozo, i) =>
    // Los impares son lo que estaba entre comillas: es la voz del padre.
    i % 2 === 1
      ? <em key={i} className={styles.cita}>{`“${trozo}”`}</em>
      : <React.Fragment key={i}>{trozo}</React.Fragment>
  )
}

export default function AlivioHuella({ texto, cargando = false }) {
  const revelado = useRevelado(texto || '')

  // El hook va antes del corte porque los hooks no pueden ser condicionales.
  if (!cargando && !texto) return null
  // Ya llegó texto pero el revelado todavía no lo alcanza: se siguen mostrando
  // los puntos en vez de una burbuja vacía por un instante.
  const mostrarPuntos = cargando && !revelado

  return (
    <div className={styles.alivio}>
      {mostrarPuntos ? (
        <span className={styles.puntos} role="status" aria-label="Huella está leyendo">
          <i /><i /><i />
        </span>
      ) : (
        revelado.split('\n').filter((l) => l.trim()).map((linea, i) => (
          <p key={i} className={styles.parrafo}>{conCitas(linea)}</p>
        ))
      )}
    </div>
  )
}
