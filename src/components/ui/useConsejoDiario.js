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
// - Generación: 1 llamada por usuario por día. Cache local.
// - Visto: bandera local por día. Al marcar visto, desaparece el
//   puntito hasta el día siguiente.
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

    let cached = null
    try { cached = localStorage.getItem(fraseKey) } catch {}
    try { setVisto(localStorage.getItem(vistoKey) === '1') } catch { setVisto(false) }

    if (cached) {
      setFrase(cached)
      return
    }

    setLoading(true)
    generarConsejoDiario({ hijo, episodios, hitos, estrategias })
      .then((text) => {
        setFrase(text)
        try { localStorage.setItem(fraseKey, text) } catch {}
        // Consejo nuevo del día: por defecto NO visto.
        try { setVisto(localStorage.getItem(vistoKey) === '1') } catch {}
      })
      .catch(() => {})
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
