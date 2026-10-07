import { useEffect, useState } from 'react'
import { generarConsejoDiario } from '../../services/anthropic'

// Encapsula la lógica del "consejo del día" que antes vivía en
// ConsejoBubble: una llamada IA cacheada en localStorage por día por
// usuario + tracking de "visto" para mostrar puntito de notificación
// en la campana del Hero del Home.
//
// Reglas:
// - Visibilidad: solo si hay datos suficientes (>=2 episodios o >=1
//   hito). Sin datos no se llama a la IA.
// - Generación: como mucho 1 llamada por usuario por día, y solo si hay
//   momentos o avances nuevos desde el último consejo (7 oct 2026). Si no hay
//   nada nuevo, se muestra el último. Si la IA falla, también: el Home no
//   queda vacío.
// - Visto: bandera local por día. Al marcar visto, desaparece el
//   puntito hasta el día siguiente.

// Huella de lo registrado: cambia si entra (o sale) un momento o un avance, o
// si cambia el hijo. Hash corto para no guardar la lista entera de ids.
function firmaDe(hijo, episodios, hitos) {
  const ids = [...episodios.map((e) => e.id), ...hitos.map((h) => h.id)].sort().join(',')
  let h = 5381
  for (let i = 0; i < ids.length; i++) h = ((h * 33) ^ ids.charCodeAt(i)) >>> 0
  return `${hijo?.id ?? ''}|${episodios.length}|${hitos.length}|${h.toString(36)}`
}

export function useConsejoDiario({ user, hijo, episodios, hitos, estrategias }) {
  const [frase, setFrase] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visto, setVisto] = useState(true) // default: nada que mostrar

  const today = new Date().toISOString().split('T')[0]
  const visible = Boolean(user?.id) && (episodios.length >= 2 || hitos.length >= 1)

  useEffect(() => {
    if (!visible) {
      setFrase(null)
      setVisto(true)
      return
    }

    const fraseKey = `huella_consejo_v7_${user.id}_${today}`
    const vistoKey = `huella_consejo_visto_${user.id}_${today}`
    const ultimoKey = `huella_consejo_ultimo_${user.id}`

    let cached = null
    try { cached = localStorage.getItem(fraseKey) } catch {}
    try { setVisto(localStorage.getItem(vistoKey) === '1') } catch { setVisto(false) }

    if (cached) {
      setFrase(cached)
      return
    }

    let ultimo = null
    try { ultimo = JSON.parse(localStorage.getItem(ultimoKey)) } catch {}
    const firma = firmaDe(hijo, episodios, hitos)

    // Nada nuevo desde el último consejo: se repite ese, sin llamar a la IA y
    // sin puntito en la campana (no es nuevo).
    if (ultimo?.texto && ultimo.firma === firma) {
      setFrase(ultimo.texto)
      try { localStorage.setItem(fraseKey, ultimo.texto) } catch {}
      try { localStorage.setItem(vistoKey, '1') } catch {}
      setVisto(true)
      return
    }

    setLoading(true)
    generarConsejoDiario({ hijo, episodios, hitos, estrategias })
      .then((text) => {
        setFrase(text)
        try { localStorage.setItem(fraseKey, text) } catch {}
        try { localStorage.setItem(ultimoKey, JSON.stringify({ texto: text, firma })) } catch {}
        // Consejo nuevo del día: por defecto NO visto.
        try { setVisto(localStorage.getItem(vistoKey) === '1') } catch {}
      })
      .catch(() => {
        if (ultimo?.texto) setFrase(ultimo.texto)
      })
      .finally(() => setLoading(false))
  // Recargamos cuando cambia el día o el usuario; los demás cambian
  // demasiado y harían refetch innecesario.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, today, visible])

  function marcarVisto() {
    if (!user?.id) return
    const vistoKey = `huella_consejo_visto_${user.id}_${today}`
    try { localStorage.setItem(vistoKey, '1') } catch {}
    setVisto(true)
  }

  const tieneConsejoNuevo = visible && Boolean(frase) && !visto

  return { frase, loading, visible, tieneConsejoNuevo, marcarVisto }
}
