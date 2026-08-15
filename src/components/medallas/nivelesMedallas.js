// Catalogo de medallas de Huella — 33 medallas repartidas en niveles.
//
// Vivia dentro de HitosPage.jsx. En B3 las medallas se mudaron a Perfil
// ("Tus medallas") porque son logros DEL PADRE, no del niño: las gana quien
// registra, observa y sostiene un plan. La pagina /hitos dejo de existir, asi
// que el catalogo se extrajo tal cual a este modulo para que no se perdiera ni
// quedara duplicado.
//
// Nada de esto se reescribio: los ids, los checks y las frases son los mismos
// que ya estaban en produccion. Los ids viajan a localStorage
// (`huella_badges_vistos_*`) para saber cuales ya vio el padre, asi que
// CAMBIAR UN ID equivale a re-desbloquear esa medalla para todo el mundo.

// ── Helpers de medallas ───────────────────────────────────────────────────

function diasActivo({ episodios, hitos }) {
  const fechas = [...episodios.map((e) => e.fecha), ...hitos.map((h) => h.fecha)]
  if (!fechas.length) return 0
  const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
  return Math.floor((Date.now() - oldest) / (24 * 60 * 60 * 1000))
}

function fechaAlDia(data, dias) {
  const fechas = [...data.episodios.map((e) => e.fecha), ...data.hitos.map((h) => h.fecha)]
  if (!fechas.length) return null
  const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
  if (Date.now() - oldest < dias * 24 * 60 * 60 * 1000) return null
  return new Date(oldest + dias * 24 * 60 * 60 * 1000).toISOString()
}

function fechaNEpisodio(episodios, n) {
  if (episodios.length < n) return null
  return episodios[episodios.length - n].fecha
}

function tieneVentana(episodios, count, dias) {
  if (episodios.length < count) return null
  const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  const ventanaMs = dias * 24 * 60 * 60 * 1000
  for (let i = count - 1; i < sorted.length; i++) {
    const base = new Date(sorted[i].fecha).getTime()
    const inWindow = sorted.filter(
      (e) => new Date(e.fecha).getTime() >= base - ventanaMs && new Date(e.fecha).getTime() <= base
    )
    if (inWindow.length >= count) return sorted[i].fecha
  }
  return null
}

function sieteDiasConsecutivos(episodios) {
  if (episodios.length < 7) return null
  const dias = [...new Set(episodios.map((e) => e.fecha.slice(0, 10)))].sort()
  let streak = 1
  for (let i = 1; i < dias.length; i++) {
    const diff = (new Date(dias[i]) - new Date(dias[i - 1])) / 864e5
    if (diff === 1) {
      streak++
      if (streak >= 7) return dias[i]
    } else {
      streak = 1
    }
  }
  return null
}

// ── Definición de niveles ─────────────────────────────────────────────────
// Mantiene las 33 medallas actuales con su lógica de check/fechaLogro intacta.
// Se sustituye el campo `color` hex por `tono` semántico (5 paletas en index.css).

export const NIVELES = [
  {
    nivel: 1,
    subtitulo: 'Primeros pasos',
    umbral: 7,
    badges: [
      {
        id: 'primer_registro',
        emoji: '🌟',
        titulo: 'Primer paso',
        desc: '1 episodio registrado',
        frase: 'Registrar ya es un acto de amor hacia tu hijo.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 1,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 1),
      },
      {
        id: 'cinco_registros',
        emoji: '📊',
        titulo: 'Observador',
        desc: '5 episodios registrados',
        frase: 'Observar sin juzgar es la primera herramienta de todo buen padre.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 5,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 5),
      },
      {
        id: 'diez_registros',
        emoji: '🔍',
        titulo: 'Analista',
        desc: '10 episodios registrados',
        frase: 'Ya estás viendo patrones que antes eran invisibles.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 10,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 10),
      },
      {
        id: 'primer_hito',
        emoji: '💛',
        titulo: 'Primer avance',
        desc: '1 avance positivo registrado',
        frase: 'Notar los logros pequeños es lo que los hace crecer.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 1,
        fechaLogro: ({ hitos }) => hitos.length >= 1 ? hitos[hitos.length - 1].fecha : null,
      },
      {
        id: 'cinco_hitos',
        emoji: '🏅',
        titulo: 'Coleccionista',
        desc: '5 avances positivos registrados',
        frase: 'Cada avance registrado le dice: te veo, te valoro.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 5,
        fechaLogro: ({ hitos }) => hitos.length >= 5 ? hitos[hitos.length - 5].fecha : null,
      },
      {
        id: 'primera_estrategia',
        emoji: '🎯',
        titulo: 'Estratega',
        desc: '1 estrategia creada',
        frase: 'Tener un plan cambia todo. Lo más difícil ya pasó.',
        tono: 'constancia',
        check: ({ estrategias }) => estrategias.length >= 1,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 1 ? estrategias[estrategias.length - 1].fechaInicio : null,
      },
      {
        id: 'plan_completo',
        emoji: '🏆',
        titulo: '4 semanas',
        desc: 'Completaste un plan de 4 semanas',
        frase: 'Cuatro semanas sostenidas. Eso es transformación real.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.some((e) => e.semanaActual >= 4),
        fechaLogro: ({ estrategias }) => {
          const e = estrategias.find((e) => e.semanaActual >= 4)
          return e ? e.fechaInicio : null
        },
      },
      {
        id: 'mes_activo',
        emoji: '📅',
        titulo: 'Un mes',
        desc: '30 días usando Huella',
        frase: 'Un mes de presencia consciente. Extraordinario.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 30,
        fechaLogro: (data) => fechaAlDia(data, 30),
      },
      {
        id: 'semana_activa',
        emoji: '🔥',
        titulo: 'Semana activa',
        desc: '7 episodios en 7 días',
        frase: 'Registrar en momentos difíciles es valentía pura.',
        tono: 'constancia',
        check: ({ episodios }) => tieneVentana(episodios, 7, 7) !== null,
        fechaLogro: ({ episodios }) => tieneVentana(episodios, 7, 7),
      },
      {
        id: 'tres_estrategias',
        emoji: '🌈',
        titulo: 'Multihabilidad',
        desc: '3 estrategias creadas',
        frase: 'Tres dimensiones distintas. Eso es comprensión profunda.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.length >= 3,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 3 ? estrategias[estrategias.length - 3].fechaInicio : null,
      },
      {
        id: 'ciclo_completo',
        emoji: '🔄',
        titulo: 'Ciclo completo',
        desc: '1 seguimiento post-episodio realizado',
        frase: 'Registraste, reflexionaste y volviste a revisar. Eso es lo que transforma.',
        tono: 'calma',
        check: ({ checkinsCount }) => checkinsCount >= 1,
        fechaLogro: () => null,
      },
      {
        id: 'reflexivo',
        emoji: '🪞',
        titulo: 'Reflexivo',
        desc: '5 seguimientos post-episodio realizados',
        frase: 'Revisar lo que pasó es una de las herramientas más poderosas que tienes.',
        tono: 'calma',
        check: ({ checkinsCount }) => checkinsCount >= 5,
        fechaLogro: () => null,
      },
      {
        id: 'constante_7',
        emoji: '📆',
        titulo: 'Constante',
        desc: '7 días consecutivos con registros',
        frase: 'Siete días seguidos. La constancia ya es parte de quién eres.',
        tono: 'constancia',
        check: ({ episodios }) => sieteDiasConsecutivos(episodios) !== null,
        fechaLogro: ({ episodios }) => sieteDiasConsecutivos(episodios),
      },
      {
        id: 'comprometido_plan',
        emoji: '💼',
        titulo: 'Comprometido',
        desc: 'Semana 2 de una estrategia alcanzada',
        frase: 'Seguiste adelante cuando era difícil. Eso es lo que cambia todo.',
        tono: 'constancia',
        check: ({ estrategias }) => estrategias.some((e) => e.semanaActual >= 2),
        fechaLogro: ({ estrategias }) => {
          const e = estrategias.find((e) => e.semanaActual >= 2)
          return e ? e.fechaInicio : null
        },
      },
    ],
  },
  {
    nivel: 2,
    subtitulo: 'En profundidad',
    umbral: 7,
    badges: [
      {
        id: 'veinticinco_registros',
        emoji: '💎',
        titulo: 'Experto',
        desc: '25 episodios registrados',
        frase: 'Te has convertido en el mayor experto en tu propio hijo.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 25,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 25),
      },
      {
        id: 'cincuenta_registros',
        emoji: '🎓',
        titulo: 'Profundo',
        desc: '50 episodios registrados',
        frase: 'Pocos padres llegan tan lejos. Eres excepcional.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 50,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 50),
      },
      {
        id: 'dos_meses',
        emoji: '🌿',
        titulo: 'Constancia',
        desc: '60 días usando Huella',
        frase: 'La constancia no se improvisa, se construye día a día.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 60,
        fechaLogro: (data) => fechaAlDia(data, 60),
      },
      {
        id: 'diez_hitos',
        emoji: '🤝',
        titulo: 'Mentor',
        desc: '10 avances positivos registrados',
        frase: 'Llevas un registro de amor que tu hijo un día entenderá.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 10,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 10 ? hitos[hitos.length - 10].fecha : null,
      },
      {
        id: 'cinco_estrategias',
        emoji: '⚡',
        titulo: 'Arquitecto',
        desc: '5 estrategias creadas',
        frase: 'Estás construyendo una arquitectura emocional sólida.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.length >= 5,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 5 ? estrategias[estrategias.length - 5].fechaInicio : null,
      },
      {
        id: 'dos_planes',
        emoji: '🎯',
        titulo: 'Doble logro',
        desc: '2 planes de 4 semanas completados',
        frase: 'Sabes que el cambio requiere tiempo y lo estás dando.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.filter((e) => e.semanaActual >= 4).length >= 2,
        fechaLogro: ({ estrategias }) => {
          const c = [...estrategias]
            .filter((e) => e.semanaActual >= 4)
            .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
          return c.length >= 2 ? c[1].fechaInicio : null
        },
      },
      {
        id: 'cinco_tipos',
        emoji: '🧩',
        titulo: 'Diversidad',
        desc: 'Episodios de 5 tipos distintos',
        frase: 'Ves a tu hijo desde 5 ángulos distintos. Eso es comprensión.',
        tono: 'calma',
        check: ({ episodios }) => new Set(episodios.map((e) => e.tipo)).size >= 5,
        fechaLogro: ({ episodios }) => {
          const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          const tipos = new Set()
          for (const ep of sorted) {
            tipos.add(ep.tipo)
            if (tipos.size >= 5) return ep.fecha
          }
          return null
        },
      },
      {
        id: 'catorce_dias',
        emoji: '🗓️',
        titulo: 'Comprometido',
        desc: 'Registros en 14 días distintos',
        frase: 'Tu compromiso es consistente y real.',
        tono: 'constancia',
        check: ({ episodios }) => new Set(episodios.map((e) => e.fecha.slice(0, 10))).size >= 14,
        fechaLogro: ({ episodios }) => {
          const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          const dias = new Set()
          for (const ep of sorted) {
            dias.add(ep.fecha.slice(0, 10))
            if (dias.size >= 14) return ep.fecha
          }
          return null
        },
      },
      {
        id: 'tres_meses',
        emoji: '🏔️',
        titulo: 'Tres meses',
        desc: '90 días usando Huella',
        frase: '90 días. El cambio que buscabas ya es permanente.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 90,
        fechaLogro: (data) => fechaAlDia(data, 90),
      },
    ],
  },
  {
    nivel: 3,
    subtitulo: 'Maestría',
    umbral: 7,
    badges: [
      {
        id: 'cien_registros',
        emoji: '👑',
        titulo: 'Maestro',
        desc: '100 episodios registrados',
        frase: 'Nadie conoce mejor a tu hijo que tú.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 100,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 100),
      },
      {
        id: 'veinte_hitos',
        emoji: '🔮',
        titulo: 'Visionario',
        desc: '20 avances positivos registrados',
        frase: 'Una biblioteca de momentos que valen oro.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 20,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 20 ? hitos[hitos.length - 20].fecha : null,
      },
      {
        id: 'cinco_planes',
        emoji: '🌊',
        titulo: 'Fluidez',
        desc: '5 planes de 4 semanas completados',
        frase: 'Tu disciplina es inspiradora. Cinco planes sostenidos.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.filter((e) => e.semanaActual >= 4).length >= 5,
        fechaLogro: ({ estrategias }) => {
          const c = [...estrategias]
            .filter((e) => e.semanaActual >= 4)
            .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
          return c.length >= 5 ? c[4].fechaInicio : null
        },
      },
      {
        id: 'cuatro_meses',
        emoji: '🦋',
        titulo: 'Transformación',
        desc: '120 días usando Huella',
        frase: 'Lo que cambió no solo es tu hijo, también eres tú.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 120,
        fechaLogro: (data) => fechaAlDia(data, 120),
      },
      {
        id: 'ciento_cincuenta',
        emoji: '🧬',
        titulo: 'Científico',
        desc: '150 episodios registrados',
        frase: 'Eres el científico de tu propia familia.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 150,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 150),
      },
      {
        id: 'seis_meses',
        emoji: '⭐',
        titulo: 'Dedicado',
        desc: '180 días usando Huella',
        frase: 'Estás redefiniendo lo que significa ser padre o madre.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 180,
        fechaLogro: (data) => fechaAlDia(data, 180),
      },
      {
        id: 'siete_tipos',
        emoji: '🎪',
        titulo: 'Explorador',
        desc: 'Episodios de 7 tipos distintos',
        frase: 'Tu hijo no tiene secretos para ti.',
        tono: 'calma',
        check: ({ episodios }) => new Set(episodios.map((e) => e.tipo)).size >= 7,
        fechaLogro: ({ episodios }) => {
          const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          const tipos = new Set()
          for (const ep of sorted) {
            tipos.add(ep.tipo)
            if (tipos.size >= 7) return ep.fecha
          }
          return null
        },
      },
      {
        id: 'diez_estrategias',
        emoji: '💫',
        titulo: 'Decano',
        desc: '10 estrategias creadas',
        frase: 'Eres un guía para toda tu familia.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.length >= 10,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 10 ? estrategias[estrategias.length - 10].fechaInicio : null,
      },
      {
        id: 'veinticinco_hitos',
        emoji: '🌺',
        titulo: 'Florecimiento',
        desc: '25 avances positivos registrados',
        frase: 'Una historia de amor que ningún otro padre documenta así.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 25,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 25 ? hitos[hitos.length - 25].fecha : null,
      },
      {
        id: 'leyenda',
        emoji: '🏅',
        titulo: 'Leyenda',
        desc: '30 avances positivos registrados',
        frase: 'Has llegado al nivel más alto. Eres extraordinario/a.',
        tono: 'estrella',
        heroica: true,
        check: ({ hitos }) => hitos.length >= 30,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 30 ? hitos[hitos.length - 30].fecha : null,
      },
    ],
  },
]

export const TOTAL_MEDALLAS = NIVELES.reduce((acc, n) => acc + n.badges.length, 0)

// Submensaje del header de cada nivel.
export function getSubmensaje(nivel, desbloqueadasCount, nivelBloqueado) {
  if (nivelBloqueado) return 'Por descubrir'
  if (desbloqueadasCount === 0) return 'Empieza aquí'
  if (desbloqueadasCount === nivel.badges.length) return 'Completado'
  return 'En curso'
}

