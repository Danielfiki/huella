// ════════════════════════════════════════════════════════════════════
// AGREGAR a src/services/anthropic.js
// Función nueva. NO toca interpretarPatrones() (la usa el Panel para
// el resumen en texto plano).
// ════════════════════════════════════════════════════════════════════

const PROMPT_DETECTAR_PATRONES = `Eres un asistente clínico para una app de crianza basada en evidencia.
Tu tarea: identificar UN solo patrón en los episodios registrados que sugiera trabajar una habilidad concreta.

Habilidades disponibles (usar EXACTAMENTE uno de estos ids como "tipo"):
- berrinches, tristeza, miedos, frustracion, ansiedad, enojo
- socializar, limites, sueno, alimentacion, autonomia

Reglas:
1. Sólo devolver un patrón si hay ≥3 episodios coherentes que lo respalden en los últimos 30 días.
2. "descripcion" debe nombrar el patrón en una frase observacional, sin diagnóstico.
3. "bajada" sugiere brevemente por qué trabajar esa habilidad ayudaría (1-2 frases, lenguaje cálido y no clínico).
4. "episodios_ids" lista 1-5 ids de episodios concretos que evidencian el patrón.
5. "confianza" entre 0 y 1 según fuerza de la evidencia (≥3 episodios y < 21 días = ~0.7; ≥5 episodios concentrados = ~0.85).
6. Si no hay patrón claro: devolver { "patrones": [] }.

Output: JSON válido y sólo JSON, sin texto adicional, con este shape exacto:
{
  "patrones": [
    {
      "tipo": "<id habilidad>",
      "descripcion": "<frase observacional>",
      "bajada": "<por qué trabajar esto ayudaría>",
      "episodios_ids": ["<uuid>", "..."],
      "confianza": 0.0
    }
  ]
}`;

export async function detectarPatronesEstructurado({ hijo_id, hijo_edad, episodios }) {
  // Compactar episodios al mínimo necesario para el prompt.
  // Usamos los campos reales del modelo de Huella: tipo, intensidad, gatillantes, fecha.
  const compactados = episodios.slice(0, 30).map((e) => ({
    id: e.id,
    fecha: e.fecha,
    tipo: e.tipo || '',
    intensidad: e.intensidad,
    gatillantes: e.gatillantes || [],
  }));

  // api/anthropic.js solo acepta { prompt, max_tokens } con system prompt fijo en el servidor.
  // Incorporamos las instrucciones de detección directamente en el user message.
  const prompt = `${PROMPT_DETECTAR_PATRONES}

Datos a analizar:
${JSON.stringify({ contexto: { hijo_id, hijo_edad, total_episodios: episodios.length }, episodios: compactados }, null, 2)}`;

  const raw = await llamarAPI(prompt, 1024);

  // Extraer el primer bloque JSON válido de la respuesta.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { patrones: [] };
  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed || !Array.isArray(parsed.patrones)) return { patrones: [] };
    return parsed;
  } catch {
    return { patrones: [] };
  }
}
