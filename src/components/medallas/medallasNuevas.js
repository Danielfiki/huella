import { useEffect, useMemo, useState } from 'react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { NIVELES } from './nivelesMedallas'

// Fuente única de "hay una medalla que el padre todavía no ve".
//
// Existe porque ese dato se necesita en DOS lugares que no se conocen entre
// sí: la sección "Tus medallas" de Perfil (el puntito en la cabecera de cada
// nivel) y la pestaña "Tú" de la barra baja, que vive en Layout. Antes el
// cálculo estaba metido dentro de TusMedallas y no había forma de mirarlo
// desde afuera.
//
// El almacén es el MISMO localStorage de siempre (`huella_badges_vistos_*`,
// una clave por usuario): quien ya vio sus medallas no se las encuentra
// "nuevas" de golpe. Los ids son los de `nivelesMedallas.js` — cambiar uno
// equivale a re-desbloquear esa medalla para todo el mundo.
//
// CUÁNDO SE MARCA COMO VISTA (cambió en este ajuste): antes bastaba con
// abrir Perfil — un timer de 4s marcaba TODO como visto aunque el padre no
// hubiera desplegado nada. Con los niveles colapsados por defecto eso dejaba
// el punto muerto sin que nadie viera nada, así que ahora se marca al
// DESPLEGAR el nivel que contiene la medalla, que es cuando de verdad se ve.

export function claveVistos(userId) {
  return `huella_badges_vistos_${userId || 'anon'}`
}

function leerVistos(clave) {
  try { return new Set(JSON.parse(localStorage.getItem(clave) || '[]')) }
  catch { return new Set() }
}

// localStorage no avisa de sus propios cambios dentro de la misma pestaña, así
// que el aviso lo damos a mano: Perfil marca, la barra baja se entera.
const suscriptores = new Set()

export function marcarVistos(clave, ids) {
  const vistos = leerVistos(clave)
  const porMarcar = ids.filter((id) => !vistos.has(id))
  if (!porMarcar.length) return
  porMarcar.forEach((id) => vistos.add(id))
  try { localStorage.setItem(clave, JSON.stringify([...vistos])) } catch {}
  suscriptores.forEach((avisar) => avisar())
}

export function useMedallasNuevas() {
  const { state, getCheckinsHechos } = useHuella()
  const { user } = useAuth()
  const clave = claveVistos(user?.id)

  // Los check-ins no viven en el estado global: hay medallas que dependen de
  // ellos, así que se piden aparte. Es un select de una columna.
  const [checkinsCount, setCheckinsCount] = useState(0)
  useEffect(() => {
    let vivo = true
    getCheckinsHechos().then((set) => { if (vivo) setCheckinsCount(set.size) })
    return () => { vivo = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const [vistos, setVistos] = useState(() => leerVistos(clave))
  useEffect(() => {
    const releer = () => setVistos(leerVistos(clave))
    releer()
    suscriptores.add(releer)
    return () => { suscriptores.delete(releer) }
  }, [clave])

  const { episodios = [], hitos = [], estrategias = [] } = state

  // Memoizado a propósito: son 33 checks y algunos recorren los episodios en
  // O(n²). Este hook lo usa Layout, que se vuelve a renderizar en cada
  // navegación; sin memo se recalcularía el catálogo entero cada vez.
  return useMemo(() => {
    const dataBadge = { episodios, hitos, estrategias, checkinsCount }
    const desbloqueados = new Set(
      NIVELES.flatMap((n) => n.badges).filter((b) => b.check(dataBadge)).map((b) => b.id)
    )
    const nuevas = new Set([...desbloqueados].filter((id) => !vistos.has(id)))
    return { clave, dataBadge, desbloqueados, nuevas, hayNuevas: nuevas.size > 0 }
  }, [clave, episodios, hitos, estrategias, checkinsCount, vistos])
}
