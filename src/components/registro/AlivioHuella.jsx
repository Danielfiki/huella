import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import styles from './AlivioHuella.module.css'

// ──────────────────────────────────────────────────────────────────────
// EL ALIVIO — lo primero que el padre lee después de guardar.
//
// Es una burbuja de Huella, igual a las del hilo del registro: lo que sigue
// después de contar algo difícil no es un recibo del sistema, es la respuesta
// de alguien que escuchó. Por eso también desapareció el "Episodio registrado":
// que Huella conteste ya prueba que se guardó.
//
// Las comillas dobles marcan las palabras textuales del padre —así lo pide el
// prompt, porque en la respuesta está prohibido el markdown— y acá se pintan en
// cursiva terracota. Si el modelo no citó nada, el texto se muestra igual.
// ──────────────────────────────────────────────────────────────────────

// Parte el texto en trozos, separando lo que va entre comillas dobles.
function conCitas(texto) {
  return texto.split(/"([^"]+)"/g).map((trozo, i) =>
    // Los impares son lo que estaba entre comillas: es la voz del padre.
    i % 2 === 1
      ? <em key={i} className={styles.cita}>{trozo}</em>
      : <React.Fragment key={i}>{trozo}</React.Fragment>
  )
}

export default function AlivioHuella({ texto, cargando = false }) {
  if (!cargando && !texto) return null

  return (
    <div className={styles.fila}>
      <span className={styles.avatar} aria-hidden="true">
        <Escarabajo className={styles.avatarSvg} />
      </span>
      <div className={styles.burbuja}>
        {cargando ? (
          <span className={styles.puntos} role="status" aria-label="Huella está leyendo">
            <i /><i /><i />
          </span>
        ) : (
          texto.split('\n').filter((l) => l.trim()).map((linea, i) => (
            <p key={i} className={styles.parrafo}>{conCitas(linea)}</p>
          ))
        )}
      </div>
    </div>
  )
}
