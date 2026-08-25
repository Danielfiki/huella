import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import styles from './EscenaCerebro.module.css'

// ÚNICO archivo que importa three. Se carga por lazy import desde CerebroPage,
// así que todo three vive en su propio chunk y no toca el bundle inicial.
//
// PASO 1 de la integración: el modelo se carga, se ve y se puede girar.
// Deliberadamente NO están todavía la coreografía por edad, el latido, los
// haces, la sombra de contacto ni las tarjetas de zona. Todo eso está resuelto
// y verificado en el prototipo congelado (cerebro-fase-b.html) y se porta en
// el paso siguiente.

const MODELO = '/modelos/cerebro.glb'

// Colores de las zonas, tomados del prototipo aprobado. Viven acá y no en
// index.css porque son valores de materiales WebGL, no estilos de la UI:
// nunca se pintan como CSS. Al portar la escena completa conviene decidir si
// se derivan de los tokens con getComputedStyle.
const COLOR_ZONA = {
  amigdala:  '#E5743D',
  hipocampo: '#8FA840',
  cerebelo:  '#E8B33C',
  tronco:    '#E04F5F',
  frontal:   '#4A63E7',
  corteza:   '#DDD6CD',
}

const MARGEN = 1.15 // aire alrededor del cerebro al encuadrar

export default function EscenaCerebro() {
  const contRef = useRef(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const cont = contRef.current
    if (!cont) return

    let vivo = true
    let animId = null

    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    ren.setSize(cont.clientWidth, cont.clientHeight)
    cont.appendChild(ren.domElement)

    const esc = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, cont.clientWidth / cont.clientHeight, 0.01, 50)
    cam.position.set(0.15, 0.22, 1.75)

    const ctr = new OrbitControls(cam, ren.domElement)
    ctr.enableDamping = true
    ctr.dampingFactor = 0.07
    ctr.enablePan = false
    ctr.rotateSpeed = 0.85
    ctr.zoomSpeed = 0.9
    ctr.autoRotate = true
    ctr.autoRotateSpeed = 0.45

    // Iluminación congelada del prototipo (vitrina clara, valor 15).
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

    let grupo = null

    function encuadrar() {
      if (!grupo) return
      const caja = new THREE.Box3().setFromObject(grupo)
      const centro = caja.getCenter(new THREE.Vector3())
      const radio = caja.getSize(new THREE.Vector3()).length() / 2
      const fov = (cam.fov * Math.PI) / 180
      const distAlto = radio / Math.tan(fov / 2)
      const d = Math.max(distAlto, distAlto / cam.aspect) * MARGEN

      const dir = new THREE.Vector3().subVectors(cam.position, ctr.target)
      if (dir.lengthSq() < 1e-6) dir.set(0.09, 0.13, 1)
      dir.normalize()

      ctr.target.copy(centro)
      cam.position.copy(centro).addScaledVector(dir, d)
      ctr.minDistance = d * 0.5
      ctr.maxDistance = d * 2
      cam.updateProjectionMatrix()
      ctr.update()
    }

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
          const color = COLOR_ZONA[slug]
          if (!color) return
          const vidrio = slug === 'corteza'
          o.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: vidrio ? 0.14 : 0.36,
            metalness: 0,
            transparent: vidrio,
            opacity: vidrio ? 0.1 : 1,
            depthWrite: !vidrio,
            side: vidrio ? THREE.DoubleSide : THREE.FrontSide,
          })
          o.renderOrder = vidrio ? 2 : 1
        })
        esc.add(grupo)
        encuadrar()
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
      ren.domElement.removeEventListener('pointerdown', despertar)
      ren.domElement.removeEventListener('pointermove', despertar)
      ctr.dispose()
      esc.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose()
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
          else o.material?.dispose()
        }
      })
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
