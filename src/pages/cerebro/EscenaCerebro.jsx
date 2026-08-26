import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import styles from './EscenaCerebro.module.css'

// ÚNICO archivo que importa three. Se carga por lazy import desde CerebroPage,
// así que todo three vive en su propio chunk y no toca el bundle inicial.
//
// PASO 4 · BLOQUE A — la baseline visual.
// Todo lo de acá está portado 1:1 del prototipo congelado cerebro-fase-b.html
// (fuente legible: plantilla-fase-b.html, idéntica salvo el GLB inline). El
// GLB del repo es byte a byte el mismo que el del prototipo, así que cualquier
// diferencia visual es de este archivo, nunca del modelo.
//
// Lo que ENTRA en el bloque A: las seis luces, los materiales completos, la
// silueta del vidrio, la sombra de contacto, el encuadre medido y la escena
// congelada en los valores de 4 años.
// Lo que NO entra todavía (bloque B, después del QA visual de Daniel): slider
// de edad, tarjetas de zona, chips, franja "Ahora", latido de la amígdala y
// haces director↔alarma.

const MODELO = '/modelos/cerebro.glb'

// Colores de las zonas, tomados del prototipo aprobado. Viven acá y no en
// index.css porque son valores de materiales WebGL, no estilos de la UI:
// nunca se pintan como CSS.
// OJO con el índigo: tiene que ser el MISMO valor que el token --cerebro-indigo
// que llega en el bloque B, porque el slider y los haces se leen del mismo
// color que la zona. Si cambia uno, cambian los dos.
const COLOR_ZONA = {
  amigdala:  '#E5743D',
  hipocampo: '#8FA840',
  cerebelo:  '#E8B33C',
  tronco:    '#E04F5F',
  frontal:   '#4A63E7',
  corteza:   '#DDD6CD',
}

// El vidrio: neutro cálido MUY claro. El gris malva que se probó antes
// (#B3ADB4) se veía plomizo y ensuciaba el interior. Este apenas tiñe: el
// vidrio es envoltorio casi invisible con borde sugerido, y el protagonismo
// es de las zonas de adentro.
const VIDRIO_TINTE = '#DDD6CD'

// El gris de obra gruesa de la corteza prefrontal y el índigo al que llega.
// La construcción por edad se cuenta con color, brillo y material — nunca con
// transparencia, que la dejaba acuosa al lado de las zonas opacas.
const GRIS_OBRA = new THREE.Color('#8E8D95')
const INDIGO = new THREE.Color('#4A63E7')

const MARGEN = 1.15 // aire alrededor del cerebro al encuadrar

// ── La escena congelada a los 4 años ────────────────────────────────────────
// El bloque B reemplaza estas dos constantes por el estado que mueve el
// slider. Hasta entonces se calculan igual que en el prototipo, pero una sola
// vez, para poder comparar contra él sin tener todavía la UI de edad.
//
// pfn es el recorrido de la prefrontal normalizado a 0..1: sale de
// interp(curva de la frontal, edad) contra PF_MIN = 3 y PF_MAX = 75. La curva
// es [[0,3],[2,10],[5,22],[8,35],[11,48],[14,62],[17,75]], y a los 4 años cae
// entre [2,10] y [5,22]: 10 + 12 * (2/3) = 18.
const P_BASE = (18 - 3) / (75 - 3)

// El cerebro además CRECE con la edad. CRECE es
// [[0,.78],[1,.87],[3,.93],[6,.96],[12,.99],[18,1]] y a los 4 años cae entre
// [3,.93] y [6,.96]: .93 + .03 * (1/3). Sin esto el cerebro se ve ~6% más
// grande que en el prototipo y el screenshot lado a lado no calza.
const ESCALA_BASE = 0.93 + 0.03 * (1 / 3)

export default function EscenaCerebro({ onDiag }) {
  const contRef = useRef(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  // El callback de diagnóstico vive en un ref para que no reinicie la escena
  // cuando cambia la identidad de la función.
  const diagRef = useRef(onDiag)
  diagRef.current = onDiag

  useEffect(() => {
    const cont = contRef.current
    if (!cont) return

    let vivo = true
    let animId = null

    // ── Diagnóstico (?diag=1) ────────────────────────────────────────────
    // Solo recolecta y publica; no cambia nada del render.
    const diag = {
      pantalla: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      canvasCss: '—',
      canvasBuffer: '—',
      gl: '—',
      gpu: '—',
      maxTextura: '—',
      modelo: 'cargando…',
      mallas: 0,
      contextoPerdido: false,
      fallo: '',
    }
    const publicar = () => { if (diagRef.current) diagRef.current({ ...diag }) }
    publicar()

    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    ren.setSize(cont.clientWidth, cont.clientHeight)
    cont.appendChild(ren.domElement)

    // Lo que el dispositivo dice de sí mismo, para el panel de ?diag=1.
    try {
      const gl = ren.getContext()
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      diag.gl = ren.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1'
      diag.gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '(oculto)'
      diag.maxTextura = String(gl.getParameter(gl.MAX_TEXTURE_SIZE))
      diag.canvasCss = `${cont.clientWidth}x${cont.clientHeight}`
      diag.canvasBuffer = `${ren.domElement.width}x${ren.domElement.height}`
    } catch (e) {
      diag.fallo = 'contexto: ' + (e?.message ?? String(e))
    }
    // Si el navegador tira el contexto, el canvas queda en blanco SIN error:
    // es justo el sintoma que estamos cazando, asi que se registra aparte.
    const onCtxLost = (e) => {
      e.preventDefault()
      diag.contextoPerdido = true
      publicar()
      console.error('[cerebro] contexto WebGL perdido')
    }
    ren.domElement.addEventListener('webglcontextlost', onCtxLost)
    publicar()

    const esc = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, cont.clientWidth / cont.clientHeight, 0.01, 50)
    cam.position.set(0.15, 0.22, 1.75)

    const ctr = new OrbitControls(cam, ren.domElement)
    ctr.enableDamping = true
    ctr.dampingFactor = 0.07
    ctr.enablePan = false
    ctr.minDistance = 0.9
    ctr.maxDistance = 3.2
    ctr.rotateSpeed = 0.85
    ctr.zoomSpeed = 0.9
    ctr.autoRotate = true
    ctr.autoRotateSpeed = 0.45

    // ── Luces ────────────────────────────────────────────────────────────
    // Iluminación para vitrina CLARA: contra fondo claro el volumen no lo
    // dibuja el contorno sino la luz direccional dura (zonas iluminadas contra
    // zonas en sombra propia). Ambiente más bajo que en una versión oscura,
    // key más fuerte y contraluz apenas de apoyo. Son SEIS: en el prototipo
    // estos valores quedaron congelados en el punto 15 de la perilla de fondo,
    // que era instrumentación y no sobrevivió al congelado.
    esc.add(new THREE.HemisphereLight(0xfff6ec, 0x8a7260, 1.483))
    const key = new THREE.DirectionalLight(0xfffdf9, 2.431)
    key.position.set(2.2, 3.2, 2.2)
    esc.add(key)
    const modelado = new THREE.DirectionalLight(0xffe7ce, 0.85)
    modelado.position.set(-2.6, 0.8, 1.4)
    esc.add(modelado)
    const relleno = new THREE.DirectionalLight(0xe9d9c8, 0.3)
    relleno.position.set(-1.6, -1.8, -0.8)
    esc.add(relleno)
    const contorno = new THREE.DirectionalLight(0xfaf6f1, 0.423)
    contorno.position.set(-0.6, 2.2, -3)
    esc.add(contorno)
    const contorno2 = new THREE.DirectionalLight(0xfaf6f1, 0.248)
    contorno2.position.set(1.4, 0.6, -2.6)
    esc.add(contorno2)

    const mallas = {}
    let grupo = null
    let silueta = null
    let sombra = null
    let texSombra = null

    // ── Encuadre ─────────────────────────────────────────────────────────
    // La distancia de cámara se calcula desde el tamaño real del modelo y el
    // aspecto del viewport, en vez de estar fija: sirve igual en 390px que en
    // desktop. El modelo se mide UNA vez y solo con las mallas de zona — si se
    // midiera el grupo entero, el plano de la sombra (1.85x de ancho) agranda
    // la caja y el encuadre se aleja.
    let radioModelo = 0
    const centroModelo = new THREE.Vector3()

    function medirModelo() {
      const caja = new THREE.Box3()
      for (const m of Object.values(mallas)) caja.expandByObject(m)
      caja.getCenter(centroModelo)
      radioModelo = caja.getSize(new THREE.Vector3()).length() / 2
    }

    function encuadrar() {
      if (!radioModelo) return
      const fov = (cam.fov * Math.PI) / 180
      const distAlto = radioModelo / Math.tan(fov / 2)
      const distAncho = distAlto / cam.aspect
      const d = Math.max(distAlto, distAncho) * MARGEN

      const dir = new THREE.Vector3().subVectors(cam.position, ctr.target)
      if (dir.lengthSq() < 1e-6) dir.set(0.09, 0.13, 1)
      dir.normalize()

      ctr.target.copy(centroModelo)
      cam.position.copy(centroModelo).addScaledVector(dir, d)
      ctr.minDistance = d * 0.5
      ctr.maxDistance = d * 2
      cam.updateProjectionMatrix()
      ctr.update()
    }

    // ── Silueta del vidrio ───────────────────────────────────────────────
    // El problema central de la vitrina clara. Fresnel barato: una copia de la
    // corteza escalada apenas, dibujada por su cara interna (BackSide). Solo
    // asoma en los ángulos rasantes, o sea justo en el borde, así que el
    // contorno del cerebro se lee contra la vainilla sin ensuciar el centro ni
    // tapar las zonas de adentro.
    function armarSilueta() {
      const mc = mallas.corteza
      if (!mc) return
      const geo = mc.geometry
      if (!geo.boundingBox) geo.computeBoundingBox()
      const centroGeo = geo.boundingBox.getCenter(new THREE.Vector3())
      const s = 1.012
      silueta = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#9C9086'),
          transparent: true,
          opacity: 0.101,
          side: THREE.BackSide,
          depthWrite: false,
        })
      )
      // Hija de la corteza y escalada en torno al centro de su propia
      // geometría, para que el borde salga parejo y no corrido.
      silueta.scale.setScalar(s)
      silueta.position.copy(centroGeo).multiplyScalar(1 - s)
      silueta.renderOrder = 0
      mc.add(silueta)
    }

    // ── Sombra de contacto ───────────────────────────────────────────────
    // Le da peso físico: sin esto el cerebro flota.
    function armarSombra() {
      const caja = new THREE.Box3().setFromObject(grupo)
      const tam = caja.getSize(new THREE.Vector3())
      const centro = caja.getCenter(new THREE.Vector3())

      const cv = document.createElement('canvas')
      cv.width = 256
      cv.height = 256
      const g2 = cv.getContext('2d')
      const rad = g2.createRadialGradient(128, 128, 0, 128, 128, 128)
      rad.addColorStop(0, 'rgba(74,52,38,.62)')
      rad.addColorStop(0.42, 'rgba(74,52,38,.34)')
      rad.addColorStop(0.72, 'rgba(74,52,38,.10)')
      rad.addColorStop(1, 'rgba(74,52,38,0)')
      g2.fillStyle = rad
      g2.fillRect(0, 0, 256, 256)

      texSombra = new THREE.CanvasTexture(cv)
      sombra = new THREE.Mesh(
        new THREE.PlaneGeometry(tam.x * 1.85, tam.z * 1.75),
        new THREE.MeshBasicMaterial({
          map: texSombra,
          transparent: true,
          opacity: 0.499,
          depthWrite: false,
        })
      )
      sombra.rotation.x = -Math.PI / 2
      sombra.position.set(centro.x, caja.min.y - tam.y * 0.1, centro.z)
      grupo.worldToLocal(sombra.position)
      sombra.renderOrder = -1
      grupo.add(sombra)
    }

    // ── La escena a los 4 años ───────────────────────────────────────────
    // En el prototipo estos valores los escribe el loop de animación cuadro a
    // cuadro, a partir de la edad del slider. Acá se aplican UNA vez con la
    // edad congelada en 4. El bloque B los devuelve al loop tal cual están.
    function congelarEdad4() {
      const p = P_BASE

      if (grupo) grupo.scale.setScalar(ESCALA_BASE)

      // La prefrontal: SIEMPRE sólida, como las demás zonas.
      //   color:     gris de obra → índigo, con arranque lento
      //   emissive:  0 → .55, tardío, para que el encendido se sienta ganado
      //   roughness: mate de niño → satinada de adolescente
      // A los 4 años esto da un gris con apenas 12% de índigo: el director de
      // orquesta todavía casi no existe, y ese es el punto de la pieza.
      const mf = mallas.frontal
      if (mf) {
        mf.material.opacity = 1
        mf.material.color.copy(GRIS_OBRA).lerp(INDIGO, Math.pow(p, 1.35))
        mf.material.emissive.copy(INDIGO)
        mf.material.emissiveIntensity = 0.55 * Math.pow(p, 1.8)
        mf.material.roughness = 0.88 - 0.62 * Math.pow(p, 1.1)
      }

      // La corteza de vidrio se densifica apenas con la edad. La silueta la
      // pone el casco BackSide, no la opacidad.
      const mc = mallas.corteza
      if (mc) {
        mc.material.opacity = 0.0958 + 0.025 * p
        mc.material.emissiveIntensity = 0.03 + 0.02 * p
      }

      // La alarma: en el prototipo LATE (urgente cuando no hay director,
      // serena cuando ya lo hay). Acá queda congelada en el punto medio de esa
      // oscilación —onda = 0—, que es su escala base y su brillo promedio. El
      // bloque B le devuelve el latido alrededor de exactamente este punto.
      const ma = mallas.amigdala
      if (ma) {
        ma.scale.copy(ma.userData.escalaBase)
        ma.material.emissiveIntensity = 0.12 + 0.55 * (1 - p) * 0.5
      }
    }

    const t0 = performance.now()
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(
      MODELO,
      (gltf) => {
        if (!vivo) return
        grupo = gltf.scene
        let conMaterial = 0
        grupo.traverse((o) => {
          if (!o.isMesh) return
          diag.mallas++
          const slug = o.name || (o.parent && o.parent.name) || ''
          const color = COLOR_ZONA[slug]
          if (!color) return
          conMaterial++
          const vidrio = slug === 'corteza'
          // Contra fondo claro las zonas internas necesitan más cuerpo: color
          // un punto más saturado, roughness baja para que capten la key, y un
          // piso de emissive para que ninguna quede apagada en su cara en
          // sombra. El vidrio no se satura: ya viene vivo.
          const col = new THREE.Color(color)
          if (!vidrio) col.offsetHSL(0, 0.05, 0)
          o.material = new THREE.MeshStandardMaterial({
            color: vidrio ? new THREE.Color(VIDRIO_TINTE) : col,
            roughness: vidrio ? 0.14 : 0.36,
            metalness: 0,
            transparent: vidrio,
            opacity: vidrio ? 0.09 : 1,
            depthWrite: !vidrio,
            side: vidrio ? THREE.DoubleSide : THREE.FrontSide,
            emissive: new THREE.Color(vidrio ? VIDRIO_TINTE : col.getHex()),
            emissiveIntensity: vidrio ? 0.03 : 0.09,
          })
          o.renderOrder = vidrio ? 2 : 1
          o.userData.slug = slug
          o.userData.escalaBase = o.scale.clone()
          mallas[slug] = o
        })
        esc.add(grupo)
        // El orden importa: medir ANTES de agregar silueta y sombra, porque
        // las dos agrandan la caja del grupo y correrían el encuadre.
        medirModelo()
        armarSilueta()
        armarSombra()
        encuadrar()
        congelarEdad4()
        setCargando(false)
        diag.modelo = `OK en ${Math.round(performance.now() - t0)}ms`
        diag.mallas = `${diag.mallas} (${conMaterial} con color)`
        diag.canvasCss = `${cont.clientWidth}x${cont.clientHeight}`
        diag.canvasBuffer = `${ren.domElement.width}x${ren.domElement.height}`
        publicar()
      },
      undefined,
      (err) => {
        if (!vivo) return
        console.error('[cerebro] no se pudo cargar el modelo', err)
        setError(true)
        setCargando(false)
        diag.modelo = 'FALLO'
        diag.fallo = String(err?.message ?? err)
        publicar()
      }
    )

    // La deriva se detiene mientras tocas y vuelve sola.
    let quieto = null
    const despertar = () => {
      ctr.autoRotate = false
      clearTimeout(quieto)
      quieto = setTimeout(() => {
        ctr.autoRotate = true
      }, 3200)
    }
    ren.domElement.addEventListener('pointerdown', despertar)
    ren.domElement.addEventListener('pointermove', despertar)

    function onResize() {
      if (!cont.clientWidth || !cont.clientHeight) return
      cam.aspect = cont.clientWidth / cont.clientHeight
      cam.updateProjectionMatrix()
      ren.setSize(cont.clientWidth, cont.clientHeight)
      encuadrar()
    }
    window.addEventListener('resize', onResize)

    function anim() {
      animId = requestAnimationFrame(anim)
      ctr.update()
      ren.render(esc, cam)
    }
    anim()

    // Limpieza: sin esto, entrar y salir de la ruta filtra contextos WebGL
    // y el navegador termina matando el más viejo.
    return () => {
      vivo = false
      cancelAnimationFrame(animId)
      clearTimeout(quieto)
      window.removeEventListener('resize', onResize)
      ren.domElement.removeEventListener('webglcontextlost', onCtxLost)
      ren.domElement.removeEventListener('pointerdown', despertar)
      ren.domElement.removeEventListener('pointermove', despertar)
      ctr.dispose()
      // La silueta COMPARTE la geometría de la corteza, así que hay que llevar
      // la cuenta de lo ya liberado: dispose() dos veces sobre la misma
      // geometría descuadra el contador de memoria de three.
      const liberadas = new Set()
      esc.traverse((o) => {
        if (!o.isMesh) return
        if (o.geometry && !liberadas.has(o.geometry)) {
          liberadas.add(o.geometry)
          o.geometry.dispose()
        }
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
        else o.material?.dispose()
      })
      // La textura de la sombra se genera acá (CanvasTexture), y
      // material.dispose() NO libera las texturas: hay que hacerlo aparte.
      texSombra?.dispose()
      ren.dispose()
      if (ren.domElement.parentNode) ren.domElement.parentNode.removeChild(ren.domElement)
    }
  }, [])

  return (
    <div className={styles.lienzo} ref={contRef}>
      {cargando && !error && <p className={styles.estado}>Armando el cerebro…</p>}
      {error && (
        <p className={styles.estado}>
          No se pudo cargar el modelo. Revisa tu conexión y vuelve a entrar.
        </p>
      )}
    </div>
  )
}
