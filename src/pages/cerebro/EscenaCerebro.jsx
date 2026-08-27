import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { ZONAS, interp, pfNorm, CRECE } from './contenidoCerebro'
import styles from './EscenaCerebro.module.css'

// ÚNICO archivo que importa three. Se carga por lazy import desde CerebroPage,
// así que todo three vive en su propio chunk y no toca el bundle inicial.
//
// PASO 4 — la escena completa, portada 1:1 del prototipo congelado
// cerebro-fase-b.html (fuente legible: plantilla-fase-b.html, idéntica salvo
// el GLB inline). El GLB del repo es byte a byte el mismo que el del
// prototipo, así que cualquier diferencia visual es de este archivo.
//
// ── El puente con React ────────────────────────────────────────────────────
// La escena se monta UNA vez y nunca se reinicia: todo lo que cambia entra por
// refs que el loop lee cuadro a cuadro.
//   · edad          → prop, la mueve el slider de CerebroPage
//   · zonaAbierta   → prop, para saber si hay que alimentar la ficha
//   · onTapZona     → sube el slug que el raycast encontró
//   · medidores     → refs a los <em> de los chips y a la barra de la tarjeta.
//                     Los porcentajes los ESCRIBE el loop directo en el DOM.
//                     Pasarlos por setState serían 60 renders por segundo de
//                     toda la página para mover dos dígitos.

const MODELO = '/modelos/cerebro.glb'

// El vidrio: neutro cálido MUY claro. El gris malva que se probó antes
// (#B3ADB4) se veía plomizo y ensuciaba el interior. Este apenas tiñe: el
// vidrio es envoltorio casi invisible con borde sugerido, y el protagonismo
// es de las zonas de adentro.
const VIDRIO_TINTE = '#DDD6CD'

// El gris de obra gruesa de la corteza prefrontal y el índigo al que llega.
// La construcción por edad se cuenta con color, brillo y material — nunca con
// transparencia, que la dejaba acuosa al lado de las zonas opacas.
const GRIS_OBRA = new THREE.Color('#8E8D95')
const INDIGO = new THREE.Color(ZONAS.frontal.color)
// El extremo cálido del degradado de los haces: el color de la alarma.
const ALARMA = new THREE.Color(ZONAS.amigdala.color)

// Aire alrededor del cerebro al encuadrar. Bajó de 1.15 a 0.95 el 26 ago 2026:
// `radioModelo` es la media diagonal de la CAJA del modelo, o sea el radio de
// una esfera que el cerebro nunca llena —su ancho es el 87,7% de ese diámetro
// y su alto apenas el 48%—, así que 1.15 encima de eso acumulaba dos holguras
// y dejaba el cerebro chico justo en las edades tempranas, que es donde están
// casi todos los hijos de los usuarios. Con 0.95 el cerebro pasa a ocupar el
// 87% del ancho de la vitrina a los 4 años (antes 72%) y el 92% a los 18, en
// el ángulo de giro MÁS desfavorable (`hypot(X, Z)`, que la deriva sí alcanza
// porque da la vuelta completa). O sea: no se corta, y queda 8% de aire.
//
// Esto NO toca la curva CRECE: MARGEN mueve la distancia de la cámara y CRECE
// escala el modelo, son multiplicadores independientes. La proporción se
// conserva —a los 0 años el cerebro sigue siendo el 78% del de los 18— y todo
// el rango crece parejo, que era la condición del ajuste.
const MARGEN = 0.95

export default function EscenaCerebro({ edad, zonaAbierta, onTapZona, medidores }) {
  const contRef = useRef(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  // Todo lo que cambia entra por refs, para que el efecto de abajo corra una
  // sola vez y la escena no se reinicie al mover el slider.
  const edadRef = useRef(edad)
  edadRef.current = edad
  const zonaRef = useRef(zonaAbierta)
  zonaRef.current = zonaAbierta
  const onTapRef = useRef(onTapZona)
  onTapRef.current = onTapZona
  const medidoresRef = useRef(medidores)
  medidoresRef.current = medidores

  useEffect(() => {
    const cont = contRef.current
    if (!cont) return

    let vivo = true
    let animId = null

    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    ren.setSize(cont.clientWidth, cont.clientHeight)
    cont.appendChild(ren.domElement)

    // Si el navegador tira el contexto, el canvas queda en blanco SIN ningún
    // error: es un fallo que no se nota, así que se deja registrado. El
    // preventDefault es lo que permite que el contexto se pueda restaurar.
    const onCtxLost = (e) => {
      e.preventDefault()
      console.error('[cerebro] contexto WebGL perdido')
    }
    ren.domElement.addEventListener('webglcontextlost', onCtxLost)

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
    const conexiones = []
    let grupo = null
    let grupoConex = null
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

    // ── Haces director ↔ alarma ──────────────────────────────────────────
    // La conversación entre la prefrontal y la amígdala, que se va
    // construyendo con los años: aparecen y se aceleran con la edad.
    function armarConexiones() {
      const mf = mallas.frontal
      const ma = mallas.amigdala
      if (!mf || !ma) return
      const cajaF = new THREE.Box3().setFromObject(mf)
      const cajaA = new THREE.Box3().setFromObject(ma)
      grupoConex = new THREE.Group()
      grupo.add(grupoConex)

      const centroF = cajaF.getCenter(new THREE.Vector3())
      const centroA = cajaA.getCenter(new THREE.Vector3())
      const anchoF = (cajaF.max.x - cajaF.min.x) * 0.28
      const anchoA = (cajaA.max.x - cajaA.min.x) * 0.3

      for (const lado of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const desvio = (k - 1) * 0.012
          const a = new THREE.Vector3(centroF.x + lado * anchoF, centroF.y + desvio * 2, centroF.z * 0.85)
          const b = new THREE.Vector3(centroA.x + lado * anchoA, centroA.y + desvio, centroA.z)
          const medio = a.clone().lerp(b, 0.5)
          medio.y += 0.07 + k * 0.018
          medio.z += 0.03
          const curva3 = new THREE.QuadraticBezierCurve3(
            grupo.worldToLocal(a.clone()),
            grupo.worldToLocal(medio.clone()),
            grupo.worldToLocal(b.clone())
          )
          const pts = curva3.getPoints(38)
          const geo = new THREE.BufferGeometry().setFromPoints(pts)
          const cols = []
          for (let i = 0; i < pts.length; i++) {
            const c = INDIGO.clone().lerp(ALARMA, i / (pts.length - 1))
            cols.push(c.r, c.g, c.b)
          }
          geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
          const linea = new THREE.Line(
            geo,
            new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false })
          )
          linea.renderOrder = 3
          grupoConex.add(linea)

          // Halo: una segunda pasada apenas desplazada engrosa ópticamente el
          // haz (linewidth no existe en WebGL) para que aguante contra el
          // fondo claro.
          const halo = new THREE.Line(
            geo.clone(),
            new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false })
          )
          halo.scale.setScalar(1.004)
          halo.renderOrder = 2
          grupoConex.add(halo)

          // Contra vainilla un punto blanco no existe: va índigo profundo, que
          // es el extremo oscuro del mismo degradado del haz.
          const punto = new THREE.Mesh(
            new THREE.SphereGeometry(0.011, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0x2e3f9e, transparent: true, opacity: 0, depthWrite: false })
          )
          punto.renderOrder = 4
          grupoConex.add(punto)

          conexiones.push({ linea, halo, punto, curva3, fase: (k * 0.33 + (lado > 0 ? 0.5 : 0)) % 1 })
        }
      }
    }

    // ── Estado ───────────────────────────────────────────────────────────
    // Todo lo visual se interpola: la edad mueve un OBJETIVO y cada cuadro el
    // estado visible corre hacia él. Así el cambio se ve como coreografía y no
    // como un salto.
    const edadInicial = edadRef.current
    const obj = { pfn: pfNorm(edadInicial), escala: interp(CRECE, edadInicial), chips: {}, ficha: 0 }
    const vis = { pfn: obj.pfn, escala: obj.escala, chips: {}, ficha: 0 }
    Object.keys(ZONAS).forEach((s) => {
      obj.chips[s] = interp(ZONAS[s].curva, edadInicial)
      vis.chips[s] = obj.chips[s]
    })

    function aplicarEdad(e, deGolpe) {
      obj.pfn = pfNorm(e)
      obj.escala = interp(CRECE, e)
      Object.keys(ZONAS).forEach((s) => { obj.chips[s] = interp(ZONAS[s].curva, e) })
      const z = zonaRef.current
      if (z && ZONAS[z]) obj.ficha = interp(ZONAS[z].curva, e)

      if (deGolpe) {
        vis.pfn = obj.pfn
        vis.escala = obj.escala
        vis.ficha = obj.ficha
        Object.keys(ZONAS).forEach((s) => { vis.chips[s] = obj.chips[s] })
      }
    }

    // Espejo de lo que ya se leyó de los props: el loop compara contra esto
    // para saber cuándo cambió la edad o la zona abierta.
    let edadVista = edadInicial
    let zonaLeida = zonaRef.current

    function sincronizarProps() {
      const e = edadRef.current
      if (e !== edadVista) {
        edadVista = e
        aplicarEdad(e)
      }
      const z = zonaRef.current
      if (z !== zonaLeida) {
        zonaLeida = z
        // Al abrir una zona la ficha NO se anima desde cero: parte ya en su
        // valor, como en el prototipo. Lo que se anima es el cambio de edad
        // con la tarjeta abierta.
        if (z && ZONAS[z]) {
          obj.ficha = interp(ZONAS[z].curva, edadVista)
          vis.ficha = obj.ficha
        }
      }
    }

    // ── Tap con raycast ──────────────────────────────────────────────────
    // La deriva se detiene al tocar y vuelve sola. El umbral de 9 px separa un
    // tap de un arrastre: sin él, girar el cerebro abriría una tarjeta.
    const ray = new THREE.Raycaster()
    const pt = new THREE.Vector2()
    let quieto = null
    let movio = false
    let x0 = 0
    let y0 = 0

    const despertar = () => {
      ctr.autoRotate = false
      clearTimeout(quieto)
      quieto = setTimeout(() => { ctr.autoRotate = true }, 3200)
    }
    const onDown = (e) => {
      movio = false
      x0 = e.clientX
      y0 = e.clientY
      despertar()
    }
    const onMove = (e) => {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 9) movio = true
      despertar()
    }
    const onUp = (e) => {
      despertar()
      if (movio) return
      const r = ren.domElement.getBoundingClientRect()
      pt.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pt.y = -((e.clientY - r.top) / r.height) * 2 + 1
      ray.setFromCamera(pt, cam)
      const hit = ray
        .intersectObjects(esc.children, true)
        .filter((h) => h.object.isMesh && h.object.userData.slug)
      if (hit.length && onTapRef.current) onTapRef.current(hit[0].object.userData.slug)
    }
    ren.domElement.addEventListener('pointerdown', onDown)
    ren.domElement.addEventListener('pointermove', onMove)
    ren.domElement.addEventListener('pointerup', onUp)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(
      MODELO,
      (gltf) => {
        if (!vivo) return
        grupo = gltf.scene
        grupo.traverse((o) => {
          if (!o.isMesh) return
          const slug = o.name || (o.parent && o.parent.name) || ''
          const z = ZONAS[slug]
          if (!z) return
          const vidrio = slug === 'corteza'
          // Contra fondo claro las zonas internas necesitan más cuerpo: color
          // un punto más saturado, roughness baja para que capten la key, y un
          // piso de emissive para que ninguna quede apagada en su cara en
          // sombra. El vidrio no se satura: ya viene vivo.
          const col = new THREE.Color(z.color)
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
        // El orden importa: medir ANTES de agregar silueta, sombra y haces,
        // porque los tres agrandan la caja del grupo y correrían el encuadre.
        medirModelo()
        armarSilueta()
        armarSombra()
        armarConexiones()
        encuadrar()
        aplicarEdad(edadRef.current, true)
        setCargando(false)
      },
      undefined,
      (err) => {
        if (!vivo) return
        console.error('[cerebro] no se pudo cargar el modelo', err)
        setError(true)
        setCargando(false)
      }
    )

    function onResize() {
      if (!cont.clientWidth || !cont.clientHeight) return
      cam.aspect = cont.clientWidth / cont.clientHeight
      cam.updateProjectionMatrix()
      ren.setSize(cont.clientWidth, cont.clientHeight)
      encuadrar()
    }
    window.addEventListener('resize', onResize)

    // ── Loop ─────────────────────────────────────────────────────────────
    const reloj = new THREE.Clock()

    function anim() {
      animId = requestAnimationFrame(anim)
      sincronizarProps()

      const dt = Math.min(reloj.getDelta(), 0.05)
      const t = reloj.elapsedTime
      const k = 1 - Math.exp(-dt * 5.5) // suavizado

      vis.pfn += (obj.pfn - vis.pfn) * k
      vis.escala += (obj.escala - vis.escala) * k
      vis.ficha += (obj.ficha - vis.ficha) * k
      const p = vis.pfn

      if (grupo) grupo.scale.setScalar(vis.escala)

      // La prefrontal: SIEMPRE sólida, como las demás zonas.
      //   color:     gris de obra → índigo, con arranque lento
      //   emissive:  0 → .55, tardío, para que el encendido se sienta ganado
      //   roughness: mate de niño → satinada de adolescente
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

      // La alarma: urgente cuando no hay director, serena cuando ya lo hay.
      const ma = mallas.amigdala
      if (ma) {
        const amp = 0.03 + 0.15 * Math.pow(1 - p, 1.25)
        const vel = 1.5 + 3.0 * (1 - p)
        const onda = Math.sin(t * vel)
        ma.scale.copy(ma.userData.escalaBase).multiplyScalar(1 + onda * amp)
        ma.material.emissiveIntensity = 0.12 + 0.55 * (1 - p) * (0.5 + 0.5 * onda)
      }

      // Los haces director ↔ alarma: aparecen y se aceleran con la edad.
      if (conexiones.length) {
        const vista = Math.pow(p, 1.2)
        for (const c of conexiones) {
          c.linea.material.opacity = 0.95 * vista
          c.halo.material.opacity = 0.34 * vista
          c.punto.material.opacity = 1.0 * vista
          const u = (t * (0.14 + 0.3 * p) + c.fase) % 1
          c.curva3.getPoint(u, c.punto.position)
          const s = 0.7 + 0.6 * Math.sin(u * Math.PI)
          c.punto.scale.setScalar(s)
        }
      }

      // Los números que corren con el slider. Se escriben directo en el DOM:
      // esto pasa 60 veces por segundo y no puede ser estado de React.
      const med = medidoresRef.current
      if (med) {
        for (const s in vis.chips) {
          vis.chips[s] += (obj.chips[s] - vis.chips[s]) * k
          const el = med.chips?.current?.[s]
          if (!el) continue
          const n = Math.round(vis.chips[s])
          if (el.textContent !== n + '%') el.textContent = n + '%'
        }
        if (zonaLeida) {
          const pctEl = med.fichaPct?.current
          const barEl = med.fichaBar?.current
          const n = Math.round(vis.ficha)
          if (pctEl && pctEl.textContent !== n + '%') {
            pctEl.textContent = n + '%'
            if (barEl) barEl.style.width = n + '%'
          }
        }
      }

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
      ren.domElement.removeEventListener('pointerdown', onDown)
      ren.domElement.removeEventListener('pointermove', onMove)
      ren.domElement.removeEventListener('pointerup', onUp)
      ctr.dispose()
      // La silueta COMPARTE la geometría de la corteza, así que hay que llevar
      // la cuenta de lo ya liberado: dispose() dos veces sobre la misma
      // geometría descuadra el contador de memoria de three.
      const liberadas = new Set()
      esc.traverse((o) => {
        if (!o.isMesh && !o.isLine) return
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
