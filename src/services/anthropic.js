async function llamarAPI(prompt, max_tokens) {
  const response = await fetch('/api/anthropic', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al conectar con la IA')
  }

  const data = await response.json()
  return data.text
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
- Intensidad: ${episodio.intensidad}/5
- Contexto: ${episodio.contexto || 'no especificado'}
- Gatillantes posibles: ${episodio.gatillantes?.join(', ') || 'no especificados'}${contexto}

Responde con este formato exacto:

**Qué está pasando** (1-2 oraciones sobre lo que ocurre neurológicamente)

**Qué hacer ahora**
1. [paso concreto]
2. [paso concreto]
3. [paso concreto]

**Qué evitar**
- [cosa a evitar y por qué en 1 línea]

Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.`

  return llamarAPI(prompt, 600)
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

  return llamarAPI(prompt, 700)
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

  return llamarAPI(prompt, 800)
}
