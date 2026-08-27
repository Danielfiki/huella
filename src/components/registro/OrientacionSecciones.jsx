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

// Letra chica que a veces escribe el MODELO al final de la orientación, y que
// esta pantalla ya pone por su cuenta (el `.disclaimer` de más abajo). Sin este
// filtro el mismo descargo se lee dos veces seguidas: una dentro del texto y
// otra fuera. Está documentado en `PieCientifico.jsx` — "en los episodios esta
// misma frase la escribe el modelo (va pedida en el prompt)".
//
// El prompt ya dejó de pedirla, así que esto cubre dos casos que el prompt no
// alcanza: los episodios generados antes del arreglo, y que el modelo la
// escriba igual por inercia del marco científico.
//
// También descarta la línea de "Marco aplicado": en episodios no se pide (es un
// campo de patrones), pero si el modelo la agrega sola es letra chica académica
// que debe quedar DESPUÉS del enlace, no empujarlo hacia abajo.
function esLetraChicaDelModelo(linea) {
  const l = (linea || '').normalize('NFC').trim().toLowerCase()
  if (!l) return false

  if (l.startsWith('marco aplicado')) return true

  // Las DOS condiciones juntas, nunca una sola: "no es un diagnóstico" a secas
  // podría ser una frase legítima del cuerpo, y "evidencia" también. Es la
  // combinación la que identifica al descargo.
  const niegaDiagnostico = l.includes('no constituye un diagn') || l.includes('no es un diagn')
  const hablaDelRespaldo = l.includes('evidencia') || l.includes('orientacion') || l.includes('orientación')
  return niegaDiagnostico && hablaDelRespaldo
}

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
    if (esLetraChicaDelModelo(linea)) continue
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

      {/* El enlace va ANTES de toda la letra chica — el descargo de acá abajo, y
          cualquier cierre académico que el modelo haya escrito y que
          `esLetraChicaDelModelo` ya sacó de las secciones. Las referencias
          quedan al final, después del enlace: es lo que el QA de Daniel pidió
          cuando el enlace aparecía camuflado debajo de ellas. */}
      {zona && <EnlaceZona zona={zona} />}

      <p className={styles.disclaimer}>
        Esto se apoya en evidencia del desarrollo infantil. No es un diagnóstico.
      </p>
    </div>
  )
}
