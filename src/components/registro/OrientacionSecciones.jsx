import React from 'react'
import { esTituloSeccion, tituloSeccionLimpio } from '../../utils/seccionesIA'
import { renderInline } from '../../utils/renderMarkdown'
import EnlaceZona from './EnlaceZona'
import styles from './OrientacionSecciones.module.css'

// La orientación completa, ya desplegada, dentro de la pantalla de guardado.
//
// El texto llega del modelo SIN markdown y con los títulos de sección escritos
// como strings exactos ("Qué está pasando", "Qué hacer ahora", "Qué evitar").
// `seccionesIA.js` sigue siendo la fuente única de esa detección — acá solo se
// parte el texto por esos títulos y se le da forma.
//
// Por qué no se reusa `RespuestaIA`: ese componente pinta su propia cabecera
// ("Orientación de Huella") y su estado de carga con barra de progreso. Acá la
// cabecera ya la puso la tarjeta plegable, y cuando esto se monta el stream ya
// terminó. Quedaba una cabecera repetida y una barra que nunca corre.
//
// El puntito de color ordena la lectura sin numerar: qué pasa (mocha, el color
// de lo que se explica) → qué hacer (pistacho, lo accionable) → qué evitar
// (neutro, que no es una alarma). Nada de rojo en esta pantalla.

const TONOS = [styles.puntoMocha, styles.puntoVerde, styles.puntoNeutro]

function partirEnSecciones(texto) {
  const secciones = []
  let actual = null

  for (const linea of (texto || '').split('\n')) {
    if (esTituloSeccion(linea)) {
      actual = { titulo: tituloSeccionLimpio(linea), lineas: [] }
      secciones.push(actual)
      continue
    }
    if (!linea.trim()) continue
    // Texto suelto antes del primer título: se guarda igual, sin título, para
    // no perder nada de lo que el modelo escribió.
    if (!actual) {
      actual = { titulo: '', lineas: [] }
      secciones.push(actual)
    }
    actual.lineas.push(linea.trim())
  }

  return secciones.filter((s) => s.lineas.length > 0)
}

// `zona` es opcional y puede no venir: episodios anteriores al paso 8, o
// orientaciones donde la IA devolvio "ninguna". Sin zona esto se renderiza
// exactamente igual que antes.
export default function OrientacionSecciones({ texto, zona = null }) {
  const secciones = partirEnSecciones(texto)
  if (!secciones.length) return null

  return (
    <div className={styles.cuerpo}>
      {secciones.map((seccion, i) => (
        <section key={i} className={styles.bloque}>
          {seccion.titulo && (
            <h4 className={styles.titulo}>
              <span className={`${styles.punto} ${TONOS[i % TONOS.length]}`} aria-hidden="true" />
              {seccion.titulo}
            </h4>
          )}
          {seccion.lineas.map((linea, j) => {
            // Los pasos vienen numerados ("1. ..."): se sangran para que se
            // lean como lista sin dibujar viñetas.
            const esPaso = /^\d+\.\s/.test(linea)
            return (
              <p key={j} className={esPaso ? styles.paso : styles.parrafo}>
                {renderInline(linea)}
              </p>
            )
          })}
        </section>
      ))}

      {/* El enlace cierra la orientacion y va ANTES del descargo: el descargo
          es el pie de la pieza entera, no una seccion mas que el enlace pueda
          empujar hacia abajo. */}
      {zona && <EnlaceZona zona={zona} />}

      <p className={styles.disclaimer}>
        Esto se apoya en evidencia del desarrollo infantil. No es un diagnóstico.
      </p>
    </div>
  )
}
