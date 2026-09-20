// ──────────────────────────────────────────────────────────────────────
// CATÁLOGO DEL AVANCE — fuente única de las lentes
//
// Hasta el 18 sep 2026 este vocabulario vivía TRES veces sin hablarse: la
// lista de chips de NuevoPage, el mapa de lectura de HistorialPage, y en
// prosa dentro del prompt del motor de rasgos. Tres copias que ya se
// habían separado solas: `frustration` había quedado en inglés.
//
// Cada lente declara la FAMILIA del retrato a la que pertenece. La chip que
// elige el padre es la señal más limpia que existe de qué familia está
// mirando él, y por eso viaja al motor.
//
// NO HAY LENTE "OTRO", y es a propósito (19 sep 2026). Antes existía, y una
// chip que no dice nada compite con las que sí dicen algo. Si el padre no
// elige ninguna, `hitos.categoria` queda en NULL: eso ya significa "no
// eligió", y no hace falta una chip para decirlo.
//
// Los `id` son los que viajan a la base. Los valores viejos
// (autorregulacion, empatia, disculpa, frustration, social) se migraron con
// la migración 022, y `otro` pasó a NULL ahí mismo. No se renombra un id sin
// una migración nueva.
//
// SIN EMOJIS, a propósito: la agrupación visual de las chips la define
// Design, y un emoji acá la daría por decidida.
// ──────────────────────────────────────────────────────────────────────

// El orden es el de las chips en pantalla: las 4 de `mueve`, las 4 de
// `fortalezas`, las 4 de `calma`. Quien renderice, que recorra este array
// tal cual. `cuesta` no aparece: un avance nunca es algo que le cuesta.
export const LENTES_AVANCE = [
  { id: 'se_intereso',    label: 'Se interesó por algo',       familia: 'mueve' },
  { id: 'se_atrevio',     label: 'Se atrevió a algo nuevo',    familia: 'mueve' },
  { id: 'creo_algo',      label: 'Creó o inventó algo',        familia: 'mueve' },
  { id: 'logro_cuerpo',   label: 'Logró algo con el cuerpo',   familia: 'mueve' },

  { id: 'cuido',          label: 'Cuidó a alguien',            familia: 'fortalezas' },
  { id: 'lo_hizo_solo',   label: 'Lo hizo solo',               familia: 'fortalezas' },
  { id: 'jugo_con_otros', label: 'Jugó con otros',             familia: 'fortalezas' },
  { id: 'dijo_algo',      label: 'Dijo algo que te sorprendió', familia: 'fortalezas' },

  { id: 'se_calmo',       label: 'Se calmó solo',              familia: 'calma' },
  { id: 'acepto_un_no',   label: 'Esperó o aceptó un no',      familia: 'calma' },
  { id: 'pidio_ayuda',    label: 'Pidió ayuda',                familia: 'calma' },
  { id: 'humor',          label: 'Se lo tomó con humor',       familia: 'calma' },
]

// Lectura por id, para no repetir el find en cada pantalla.
export const LENTE_POR_ID = Object.fromEntries(
  LENTES_AVANCE.map((lente) => [lente.id, lente])
)

export const labelAvance   = (id) => LENTE_POR_ID[id]?.label ?? null
export const familiaAvance = (id) => LENTE_POR_ID[id]?.familia ?? null

// Los 3 grupos con que se muestran las chips. El titulo de cada familia es el
// mismo que usa el tab Perfil de HijoPage: es como la app ya nombra las
// familias, y una cuarta copia del vocabulario es justo lo que este archivo
// existe para evitar. `cuesta` no aparece: un avance nunca es algo que le
// cuesta. Las lentes de cada grupo salen filtrando LENTES_AVANCE, asi que el
// orden de las chips sigue siendo el del catalogo y no se puede desincronizar.
export const GRUPOS_AVANCE = [
  { familia: 'mueve',      titulo: 'Lo que lo mueve' },
  { familia: 'fortalezas', titulo: 'Sus fortalezas' },
  { familia: 'calma',      titulo: 'Lo que lo calma' },
].map((grupo) => ({
  ...grupo,
  lentes: LENTES_AVANCE.filter((lente) => lente.familia === grupo.familia),
}))

// Ejemplos para el campo de relato. Rotan al abrir la pantalla, para que el
// padre vea el TAMAÑO de lo que se espera: una cosa chica y concreta que pasó
// hoy, no un hito de manual. Los tres son de dominios distintos a propósito
// —atención, humor, juego— así ninguno se lee como la única respuesta válida.
//
// Todavía NO están cableados a la UI: el campo los toma cuando Design cierre
// las dos pantallas del avance.
export const PLACEHOLDERS_AVANCE = [
  'Ej: Hoy se quedó media hora mirando hormigas en el patio',
  'Ej: Se rió de sí mismo cuando se le cayó el helado',
  'Ej: Armó una casa con las cajas del supermercado',
]
