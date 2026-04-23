import { supabase } from '../lib/supabase.js'

async function llamarAPI(prompt, max_tokens) {
  const headers = { 'content-type': 'application/json' }

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  }

  const response = await fetch('/api/anthropic', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, max_tokens }),
  })

  if (response.status === 429) {
    const err = await response.json()
    throw new Error(err.error || 'Límite diario de consultas alcanzado. Vuelve mañana.')
  }

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al conectar con la IA')
  }

  const data = await response.json()
  return data.text
}

export async function generarAccionInmediata({ hijo, episodio }) {
  const prompt = `Niño/a: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años.
Acaba de tener: ${episodio.tipo} (intensidad ${episodio.intensidad}/5).${episodio.emocion ? `\nEmoción del niño: ${episodio.emocion}` : ''}${episodio.contexto ? `\nContexto: ${episodio.contexto}` : ''}${episodio.gatillantes?.length ? `\nGatillantes: ${episodio.gatillantes.join(', ')}` : ''}${episodio.descripcionLibre ? `\nRelato del padre/madre: ${episodio.descripcionLibre}` : ''}

Escribe UNA sola acción concreta que el padre/madre puede hacer AHORA MISMO en los próximos 2 minutos. Máximo 3 líneas. Sin listas, sin títulos, sin markdown. Lenguaje simple y cálido. Empieza con "Ahora mismo:" y describe el gesto o acción física específica, incluyendo palabras exactas si aplica. Que sea algo que cualquier padre/madre pueda hacer en casa ahora, sin preparación.`

  return llamarAPI(prompt, 120)
}

export async function analizarEpisodio({ hijo, episodio, historialReciente = [] }) {
  const contexto = historialReciente.length > 0
    ? `\n\nÚltimos episodios registrados:\n${historialReciente
        .slice(0, 5)
        .map(e => `- ${e.tipo} (intensidad ${e.intensidad}/5) el ${new Date(e.fecha).toLocaleDateString('es-CL')}`)
        .join('\n')}`
    : ''

  const prompt = `Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

Episodio registrado:
- Tipo: ${episodio.tipo}
- Intensidad: ${episodio.intensidad}/5${episodio.emocion ? `\n- Emoción del niño: ${episodio.emocion}` : ''}
- Contexto: ${episodio.contexto || 'no especificado'}
- Gatillantes posibles: ${episodio.gatillantes?.join(', ') || 'no especificados'}${episodio.descripcionLibre ? `\n- Relato del padre/madre: ${episodio.descripcionLibre}` : ''}${contexto}

Responde con este formato exacto:

**Qué está pasando** (1-2 oraciones sobre lo que ocurre neurológicamente)

**Qué hacer ahora**
1. [paso concreto]
2. [paso concreto]
3. [paso concreto]

**Qué evitar**
- [cosa a evitar y por qué en 1 línea]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 900)
}

export async function interpretarPatrones({ hijo, episodios }) {
  if (episodios.length < 3) {
    return 'Registra al menos 3 episodios para que pueda identificar patrones en el comportamiento de tu hijo.'
  }

  const resumen = episodios.slice(0, 20).map(e =>
    `${new Date(e.fecha).toLocaleDateString('es-CL')}: ${e.tipo} (intensidad ${e.intensidad}/5, gatillantes: ${e.gatillantes?.join(', ') || 'ninguno'})`
  ).join('\n')

  const prompt = `Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

Historial de episodios (más recientes primero):
${resumen}

Analiza estos patrones y responde con:

**Lo que está mejorando**
[observación positiva basada en datos]

**Lo que merece atención**
[patrón preocupante si existe, o "Sin patrones de alerta por ahora"]

**Posibles causas**
[hipótesis basadas en los datos]

**Próximos pasos sugeridos**
[1-2 acciones concretas para los próximos días]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 1800)
}

export async function celebrarHito({ hijo, hito }) {
  const prompt = `Niño/a: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años.

El padre/madre acaba de registrar este avance positivo:
- Tipo: ${hito.categoria}
- Descripción: ${hito.descripcion || '(sin descripción)'}

Responde con exactamente 2 oraciones cálidas y concretas. Valida el significado de este momento para el desarrollo del niño y explica brevemente por qué este tipo de avance importa. Habla en segunda persona al padre/madre. No uses listas ni títulos. No incluyas disclaimer ni marco aplicado.`

  return llamarAPI(prompt, 180)
}

export async function generarTareas({ hijo, habilidad, descripcion }) {
  const prompt = `Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.
Habilidad a trabajar: ${habilidad}
Contexto: ${descripcion || 'ninguno'}

Genera exactamente 4 semanas de tareas concretas para el padre/madre. Devuelve ÚNICAMENTE JSON válido sin texto adicional, sin markdown, sin explicaciones:

{"1":[{"id":"s1t1","texto":"..."},{"id":"s1t2","texto":"..."},{"id":"s1t3","texto":"..."}],"2":[{"id":"s2t1","texto":"..."},{"id":"s2t2","texto":"..."},{"id":"s2t3","texto":"..."}],"3":[{"id":"s3t1","texto":"..."},{"id":"s3t2","texto":"..."},{"id":"s3t3","texto":"..."}],"4":[{"id":"s4t1","texto":"..."},{"id":"s4t2","texto":"..."},{"id":"s4t3","texto":"..."}]}

Reglas por tarea: máximo 90 caracteres, verbo de acción concreto, realizable en casa sin preparación, en segunda persona al padre/madre. Semana 1: observar y preparar. Semana 4: consolidar y generalizar. 3 tareas por semana.`

  const raw = await llamarAPI(prompt, 700)
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)
    const result = {}
    for (const sem of ['1', '2', '3', '4']) {
      result[sem] = (parsed[sem] || []).map((t) => ({ ...t, completada: false }))
    }
    return result
  } catch {
    return null
  }
}

export async function extraerCamposDeVoz({ transcripcion, hijo }) {
  const tiposValidos = ['rabieta', 'llanto', 'agresividad', 'miedo', 'sueño', 'oposicion', 'social', 'desconexion', 'otro']
  const gatillantesValidos = ['Hambre', 'Cansancio', 'Cambio de rutina', 'Pelea con amigos', 'Pantallas', 'Transiciones', 'Enfermedad', 'Tensión en casa', 'Sobreestimulación', 'Dolor o malestar físico']
  const estadosValidos = ['Calmado', 'Frustrado', 'Cansado', 'Ansioso', 'Triste', 'Abrumado']

  const prompt = `Eres un asistente que ayuda a padres a registrar episodios de conducta de sus hijos. El padre/madre describió oralmente lo que pasó con ${hijo?.nombre || 'su hijo/a'}${hijo?.edad ? ` (${hijo.edad} años)` : ''}.

Transcripción: "${transcripcion}"

Extrae los campos y devuelve ÚNICAMENTE JSON válido sin texto adicional ni markdown:
{
  "tipo": "<uno de ${tiposValidos.join('/')} — el más cercano, o null>",
  "intensidad": <número del 1 al 5 o null — 1=muy leve, 5=muy intenso; si mencionan escala 1-10 mapear: 1-2→1, 3-4→2, 5-6→3, 7-8→4, 9-10→5>,
  "contexto": "<resumen del contexto en 1-2 frases, o vacío>",
  "gatillantes": [<solo elementos exactos de esta lista que claramente apliquen: ${gatillantesValidos.join(', ')}>],
  "estadoPadre": "<uno de ${estadosValidos.join('/')} o vacío>"
}`

  const raw = await llamarAPI(prompt, 400)
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return null
  }
}

export async function generarEstrategia({ hijo, habilidad, descripcion }) {
  const prompt = `Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

El padre/madre quiere fortalecer: **${habilidad}**
Contexto adicional: ${descripcion || 'ninguno'}

Genera un plan de 4 semanas con este formato:

**Por qué esta habilidad importa ahora**
[1-2 oraciones sobre el desarrollo en esta etapa]

**Semana 1 — Observar y preparar**
- Estrategia: [acción concreta]
- Indicador: [cómo saber que funcionó]

**Semana 2 — Introducir**
- Estrategia: [acción concreta]
- Indicador: [cómo saber que funcionó]

**Semana 3 — Practicar**
- Estrategia: [acción concreta]
- Indicador: [cómo saber que funcionó]

**Semana 4 — Consolidar**
- Estrategia: [acción concreta]
- Indicador: [cómo saber que funcionó]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 1200)
}
