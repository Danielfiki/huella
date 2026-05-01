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

function marcoEdad(edad) {
  const n = parseInt(edad, 10)
  if (isNaN(n)) return marcoEdad(4)

  if (n <= 2) {
    return `MARCO CIENTÍFICO (0-2 años):
El cerebro del bebé depende por completo del adulto como regulador externo — la corteza prefrontal es funcionalmente inexistente (Bowlby/Ainsworth, teoría del apego). Las respuestas de lucha, huida o congelamiento son reflejos subcorticales automáticos, nunca conductas intencionales. El sistema nervioso autónomo está en desarrollo (Porges, teoría polivagal): el niño no puede calmarse solo; solo puede calmarse a través de la corregulación del adulto. El experimento Still Face de Tronick muestra que incluso segundos de no-respuesta del cuidador desregulan el sistema nervioso del bebé. El único mecanismo efectivo a esta edad es la corregulación: presencia física segura, tono de voz suave, contacto piel con piel, ritmo calmado. Las consecuencias, el razonamiento verbal y los límites explicados no tienen base neurológica a esta edad.
INSTRUCCIÓN: Orienta exclusivamente desde la corregulación. Ninguna técnica cognitiva, ninguna consecuencia, ningún "hablar sobre lo que pasó". Solo presencia, cuerpo, voz, contacto.`
  }

  if (n <= 5) {
    return `MARCO CIENTÍFICO (2-6 años):
La corteza prefrontal — sede del autocontrol, la planificación y la regulación emocional — está en construcción y no madura hasta los 25 años (Siegel & Bryson, "The Whole-Brain Child"). A esta edad el cerebro límbico domina: las emociones son inmediatas, intensas y sin filtro racional. Los episodios de conducta desafiante son desbordamiento emocional genuino, no manipulación (Shanker, Self-Reg: el niño actúa desde el estrés acumulado, no desde la maldad). El niño no puede "portarse bien" cuando está en zona roja de activación — la capacidad de razonar desaparece fisiológicamente. La secuencia efectiva es: regular → conectar → redirigir (Siegel & Bryson, "No-Drama Discipline"). La corregulación del adulto (calma corporal, voz baja, proximidad segura) activa el freno parasimpático del niño (Porges). Ross Greene ("El niño explosivo"): los niños se portan bien cuando pueden; si no pueden, falta una habilidad, no voluntad. Las consecuencias durante el episodio no producen aprendizaje; el aprendizaje ocurre en la calma posterior.
INSTRUCCIÓN: Corregulación primero siempre. Conexión antes que corrección. Redirigir solo cuando el sistema nervioso ya está calmado. Lenguaje concreto, sensorial, simple.`
  }

  if (n <= 11) {
    return `MARCO CIENTÍFICO (6-12 años):
La corteza prefrontal está en maduración activa pero incompleta: emergen las funciones ejecutivas (planificación, inhibición de impulsos, flexibilidad cognitiva) pero todavía son frágiles bajo estrés (Adele Diamond, investigación en funciones ejecutivas). Los enfoques cognitivo-conductuales empiezan a ser eficaces porque el niño puede reflexionar sobre su conducta en calma. El modelo de Ross Greene (Collaborative & Proactive Solutions) es central: identificar la habilidad específica que le falta al niño para resolver el problema de otro modo — no es un problema de motivación sino de habilidad. Alan Kazdin (Parent Management Training): el refuerzo positivo sistemático y la práctica deliberada de conductas alternativas son más eficaces que las consecuencias punitivas. La regulación emocional puede enseñarse explícitamente (nombrar, identificar, tolerar, recuperarse). El contexto social — pares, escuela, estatus — comienza a ser factor clave de estrés. La resolución de problemas colaborativa funciona bien cuando el sistema nervioso está regulado.
INSTRUCCIÓN: Identifica la habilidad rezagada detrás de la conducta. Enseña en calma. Refuerza lo positivo con especificidad. Usa resolución colaborativa de problemas. Intervén en el contexto, no solo en el episodio.`
  }

  return `MARCO CIENTÍFICO (12-18 años):
El cerebro adolescente atraviesa una segunda poda sináptica masiva (Siegel, "Brainstorm"): el sistema límbico (recompensa, intensidad emocional, sensibilidad social) está hiperactivo mientras la corteza prefrontal aún remodelan — esto explica la impulsividad, la búsqueda de riesgo y la reactividad emocional (Steinberg, adolescent brain research). La necesidad de autonomía e identidad propia son necesidades de desarrollo genuinas y sanas, no rebeldía (Erikson, etapas del desarrollo). La influencia de pares alcanza su máximo; el rechazo social duele igual que el dolor físico (neuroimagen). Las estrategias de control coercitivo erosionan el vínculo y aumentan la resistencia; la conexión auténtica con respeto a la autonomía es más eficaz (Damour, "Untangled"). El adolescente necesita sentir que tiene voz real y que el adulto lo respeta. La ventana de intervención es la calma — no durante el pico del conflicto. El modelo Greene sigue siendo útil: encontrar el problema subyacente y resolverlo juntos.
INSTRUCCIÓN: Respeta la autonomía como necesidad legítima. Evita el control, la humillación y la comparación. Busca el problema subyacente. Intervén en calma, no en el pico. Mantén el vínculo por encima de ganar la discusión.`
}

export async function generarAccionInmediata({ hijo, episodio }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años.
Acaba de tener: ${episodio.tipo} (intensidad ${episodio.intensidad}/5).${episodio.emocion ? `\nEmoción del niño: ${episodio.emocion}` : ''}${episodio.contexto ? `\nContexto: ${episodio.contexto}` : ''}${episodio.gatillantes?.length ? `\nGatillantes: ${episodio.gatillantes.join(', ')}` : ''}${episodio.descripcionLibre ? `\nRelato del padre/madre: ${episodio.descripcionLibre}` : ''}

Escribe UNA sola acción concreta que el padre/madre puede hacer AHORA MISMO en los próximos 2 minutos. Máximo 3 líneas. Sin listas, sin títulos, sin markdown. Lenguaje simple y cálido, calibrado estrictamente para la edad indicada según el marco científico anterior. Empieza con "Ahora mismo:" y describe el gesto o acción física específica, incluyendo palabras exactas si aplica. Que sea algo que cualquier padre/madre pueda hacer en casa ahora, sin preparación.`

  return llamarAPI(prompt, 120)
}

export async function analizarEpisodio({ hijo, episodio, historialReciente = [], bloqueRutina = null }) {
  const marco = marcoEdad(hijo?.edad)

  const contexto = historialReciente.length > 0
    ? `\n\nÚltimos episodios registrados:\n${historialReciente
        .slice(0, 5)
        .map(e => `- ${e.tipo} (intensidad ${e.intensidad}/5) el ${new Date(e.fecha).toLocaleDateString('es-CL')}`)
        .join('\n')}`
    : ''

  const bloqueCtx = bloqueRutina
    ? `\n- Momento de la rutina diaria: "${bloqueRutina.nombre}" (${bloqueRutina.hora})${bloqueRutina.esMomentoRiesgo ? ' — marcado por los padres como momento de riesgo' : ''}${bloqueRutina.nota ? `. Nota: ${bloqueRutina.nota}` : ''}`
    : ''

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

Episodio registrado:
- Tipo: ${episodio.tipo}
- Intensidad: ${episodio.intensidad}/5${episodio.emocion ? `\n- Emoción del niño: ${episodio.emocion}` : ''}
- Contexto: ${episodio.contexto || 'no especificado'}
- Gatillantes posibles: ${episodio.gatillantes?.join(', ') || 'no especificados'}${episodio.descripcionLibre ? `\n- Relato del padre/madre: ${episodio.descripcionLibre}` : ''}${bloqueCtx}${contexto}

Responde con este formato exacto, calibrando cada sección al marco científico de la edad indicada:

**Qué está pasando** (1-2 oraciones explicando el mecanismo neurológico o de desarrollo específico para esta edad)

**Qué hacer ahora**
1. [paso concreto, apropiado para la edad]
2. [paso concreto, apropiado para la edad]
3. [paso concreto, apropiado para la edad]

**Qué evitar**
- [cosa a evitar y por qué en 1 línea, específica para la edad]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 900)
}

export async function interpretarPatrones({ hijo, episodios }) {
  if (episodios.length < 3) {
    return 'Registra al menos 3 episodios para que pueda identificar patrones en el comportamiento de tu hijo.'
  }

  const marco = marcoEdad(hijo?.edad)

  const resumen = episodios.slice(0, 20).map(e =>
    `${new Date(e.fecha).toLocaleDateString('es-CL')}: ${e.tipo} (intensidad ${e.intensidad}/5, gatillantes: ${e.gatillantes?.join(', ') || 'ninguno'})`
  ).join('\n')

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.

Historial de episodios (más recientes primero):
${resumen}

Analiza estos patrones desde el marco científico de la edad indicada y responde con:

**Lo que está mejorando**
[observación positiva basada en los datos, interpretada a la luz del desarrollo esperado para la edad]

**Lo que merece atención**
[patrón preocupante si existe, o "Sin patrones de alerta por ahora"; si hay patrón, explica brevemente por qué importa para esta etapa]

**Posibles causas**
[hipótesis basadas en los datos y en el marco de desarrollo para esta edad]

**Próximos pasos sugeridos**
[1-2 acciones concretas, calibradas a la edad, para los próximos días]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 1800)
}

export async function celebrarHito({ hijo, hito }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'tu hijo/a'}, ${hijo?.edad || '?'} años.

El padre/madre acaba de registrar este avance positivo:
- Tipo: ${hito.categoria}
- Descripción: ${hito.descripcion || '(sin descripción)'}

Responde con exactamente 2 oraciones cálidas y concretas. Valida el significado de este momento para el desarrollo del niño en esta etapa específica, explicando brevemente por qué este tipo de avance importa neurológicamente o conductualmente a esta edad según el marco científico anterior. Habla en segunda persona al padre/madre. No uses listas ni títulos. No incluyas disclaimer ni marco aplicado.`

  return llamarAPI(prompt, 180)
}

export async function generarTareas({ hijo, habilidad, descripcion }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.
Habilidad a trabajar: ${habilidad}
Contexto: ${descripcion || 'ninguno'}

Genera exactamente 4 semanas de tareas concretas para el padre/madre, calibradas estrictamente a la edad y al marco científico anterior. Devuelve ÚNICAMENTE JSON válido sin texto adicional, sin markdown, sin explicaciones:

{"1":[{"id":"s1t1","texto":"..."},{"id":"s1t2","texto":"..."},{"id":"s1t3","texto":"..."}],"2":[{"id":"s2t1","texto":"..."},{"id":"s2t2","texto":"..."},{"id":"s2t3","texto":"..."}],"3":[{"id":"s3t1","texto":"..."},{"id":"s3t2","texto":"..."},{"id":"s3t3","texto":"..."}],"4":[{"id":"s4t1","texto":"..."},{"id":"s4t2","texto":"..."},{"id":"s4t3","texto":"..."}]}

Reglas por tarea: máximo 90 caracteres, verbo de acción concreto, realizable en casa sin preparación, en segunda persona al padre/madre. Semana 1: observar y preparar el ambiente. Semana 4: consolidar y generalizar. 3 tareas por semana. Cada tarea debe ser posible para un padre/madre con un niño de la edad indicada.`

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

export async function generarConsejoDiario({ hijo, episodios, hitos, estrategias }) {
  const marco = marcoEdad(hijo?.edad)

  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const semanaEp = episodios.filter((e) => new Date(e.fecha) >= hace7).slice(0, 8)
  const hitosCount = hitos.filter((h) => new Date(h.fecha) >= hace7).length
  const estrategiaActiva = (estrategias || []).find((e) => e.semanaActual < 4)

  const resumenEp = semanaEp.length > 0
    ? semanaEp.map((e) => {
        let line = `- ${e.tipo}, intensidad ${e.intensidad}/5`
        if (e.gatillantes?.length) line += `, gatillantes: ${e.gatillantes.join(', ')}`
        if (e.emocion) line += `, emoción del niño: ${e.emocion}`
        if (e.estadoPadre) line += `, estado del padre/madre: ${e.estadoPadre}`
        if (e.contexto) line += ` | contexto: ${e.contexto.slice(0, 80)}`
        return line
      }).join('\n')
    : 'Sin episodios esta semana.'

  const gatillanteCounts = {}
  for (const e of semanaEp) for (const g of e.gatillantes || []) gatillanteCounts[g] = (gatillanteCounts[g] || 0) + 1
  const topGatillante = Object.entries(gatillanteCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const avgIntensidad = semanaEp.length > 0
    ? (semanaEp.reduce((s, e) => s + (e.intensidad || 0), 0) / semanaEp.length).toFixed(1)
    : null

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'hijo/a'}, ${hijo?.edad || '?'} años.

Episodios esta semana (${semanaEp.length}):
${resumenEp}
${avgIntensidad ? `Intensidad promedio: ${avgIntensidad}/5.` : ''}${topGatillante ? ` Gatillante más frecuente: "${topGatillante}".` : ''}${hitosCount > 0 ? ` Avances positivos esta semana: ${hitosCount}.` : ''}${estrategiaActiva ? ` Estrategia activa: "${estrategiaActiva.habilidad}" (semana ${Math.min(estrategiaActiva.semanaActual, 4)}/4).` : ''}

INSTRUCCIÓN: Escribe 2-3 oraciones como consejo para hoy, fundamentado en el marco científico de la edad indicada. Menciona algo específico de los datos anteriores (un gatillante concreto, un patrón de intensidad, una emoción específica). Nada genérico. Si hay un patrón claro, nómbralo y da una acción concreta apropiada para la edad. Tono cálido, segunda persona, sin markdown, sin listas, sin disclaimer.`

  return llamarAPI(prompt, 150)
}

export async function generarEstrategia({ hijo, habilidad, descripcion }) {
  const marco = marcoEdad(hijo?.edad)

  const prompt = `${marco}

Niño/a: ${hijo?.nombre || 'sin nombre'}, ${hijo?.edad || '?'} años.
Habilidad a fortalecer: ${habilidad}
Contexto adicional: ${descripcion || 'ninguno'}

Devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional, sin markdown, sin bloque de código. La estrategia debe estar calibrada estrictamente a la edad y al marco científico anterior. Estructura exacta:
{"porQueImporta":"2-3 frases sobre por qué esta habilidad importa en esta etapa del desarrollo para un niño de esta edad específica, sin markdown","semanas":[{"numero":1,"titulo":"Observar y preparar","accion":"Acción concreta para esta semana, máximo 2 frases, en segunda persona al padre/madre, apropiada para la edad","indicador":"Cómo saber si está funcionando, 1 frase","tareas":["tarea 1 en segunda persona, max 90 caracteres, apropiada para la edad","tarea 2","tarea 3"]},{"numero":2,"titulo":"Introducir","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":3,"titulo":"Practicar","accion":"...","indicador":"...","tareas":["...","...","..."]},{"numero":4,"titulo":"Consolidar","accion":"...","indicador":"...","tareas":["...","...","..."]}]}`

  const raw = await llamarAPI(prompt, 1200)
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return raw
  }
}
