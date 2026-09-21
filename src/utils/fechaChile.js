// Fechas en hora de Chile — fuente única.
//
// Con Intl y no restando horas a mano, por el cambio de huso: mismo criterio
// que api/push-remind.js. En UTC un momento de las 22:30 caería en el día
// siguiente.

const formatoDiaChile = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Día calendario en Chile ('2026-09-21'), o null si la fecha no sirve.
export function diaChile(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return formatoDiaChile.format(d)
}

// Lunes de la semana de `fecha` en Chile ('2026-09-21'). Es la clave de
// analisis_semanal: un análisis por hijo y semana.
export function lunesSemanaChile(fecha = new Date()) {
  const dia = diaChile(fecha)
  if (!dia) return null
  const [y, m, d] = dia.split('-').map(Number)
  // Aritmética sobre el día ya resuelto en Chile; UTC acá es solo un
  // calendario neutro para restar días, no una hora.
  const base = new Date(Date.UTC(y, m - 1, d))
  const desdeLunes = (base.getUTCDay() + 6) % 7
  base.setUTCDate(base.getUTCDate() - desdeLunes)
  return base.toISOString().slice(0, 10)
}

const DIAS_CORTOS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

// Los últimos `n` días calendario en Chile, del más antiguo a hoy:
// [{ fecha: '2026-09-15', dia: 'Ma' }, …]. Mismo calendario neutro que
// lunesSemanaChile para restar días sin que el huso se meta.
export function ultimosDiasChile(n = 7, ahora = new Date()) {
  const hoy = diaChile(ahora)
  if (!hoy) return []
  const [y, m, d] = hoy.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(Date.UTC(y, m - 1, d - (n - 1 - i)))
    return { fecha: x.toISOString().slice(0, 10), dia: DIAS_CORTOS[x.getUTCDay()] }
  })
}
