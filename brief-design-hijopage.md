# Brief para Claude Design — Perfil del hijo (HijoPage)

## CONTEXTO

Estoy rediseñando visualmente la pantalla "Perfil del hijo" (HijoPage)
de Huella, una app de crianza con IA en español latinoamericano. Es la
segunda pantalla del Bloque 3 de coherencia visual. El referente cerrado
y verificado en producción es la pantalla Logros (HitosPage), con la que
HijoPage tiene que conversar.

## QUÉ MUESTRA LA PANTALLA HOY

1. Hero con avatar grande, nombre del hijo y edad. Botón Settings arriba
   derecha que lleva al perfil del padre.
2. Tabs "Perfil" / "Rutina diaria" (la segunda renderiza otro componente
   que no tocamos en esta pasada).
3. Sección "Racha": número grande de días seguidos registrando, frase
   motivacional según largo de racha, emoji 🔥. Cuando la racha usó un
   "día de gracia" (gap de 1 día absorbido), muestra chip "🌿 Día de
   gracia" debajo.
4. Card "Episodios en [mes]": cifra del mes actual + cifra del mes
   anterior + indicador de tendencia (flecha + porcentaje + color
   semántico). Bajo la card, una frase corta interpretativa.
5. Sección "Logros recientes": chips horizontales scrolleables con los
   últimos 3 badges desbloqueados (emoji + título + fecha).
6. Sección "Avances positivos": últimos 3 hitos como timeline (emoji +
   descripción + fecha) + link "Ver todos en Álbum →" que navega a la
   pantalla Logros tab Álbum.

## REFERENTE — HitosPage (Logros)

- Hero mocha sólido (--color-accent-mocha #9B7B6A) con textura de
  puntos diagonal aplicada con mask, lede emocional ("La huella que
  [nombre] va dejando..."), y stats grid 2-col en el propio Hero
  (cifras grandes en Fraunces sobre el fondo mocha).
- Tabs border-bottom 1px, gap 20px, contador chip dentro de cada tab.
- Cards body con border 1.5px, padding 14px, radius-md, sin shadow
  agresivo. La jerarquía la dan los tonos semánticos, no las sombras.
- Paleta jerárquica de medallas en 5 tonos semánticos (estrella /
  celebración / calma / constancia / base) ya implementada como tokens
  CSS (--color-medalla-estrella, -bg, -border, etc.).
- Tipografía: Fraunces (var(--font-heading)) en cifras grandes y
  títulos. Plus Jakarta Sans en cuerpo.

## DECISIONES DE PRODUCTO YA TOMADAS

- Los chips de "Logros recientes" deben usar la paleta semántica de
  medallas de Logros (--color-medalla-{tono}). Cada chip toma el tono
  del badge real (ya no son chips planos grises).
- La sección "Álbum de momentos" que hoy vive en HijoPage SE ELIMINA.
  Las fotos viven solo en el Álbum de Logros. HijoPage queda como
  resumen ligero del hijo.
- La Rutina diaria sigue siendo un tab. No la tocamos en esta pasada.
- El form "Nuevo hijo/a" (cuando se entra con ?nuevo=true) sigue como
  está. No es parte del rediseño.

## QUÉ NECESITO

Tres conceptos visuales distintos para la pantalla HijoPage modo
"perfil con datos". Cada concepto debe:

1. Adoptar el Hero mocha como lenguaje base (alineado con Logros).
   El avatar del hijo + nombre + edad viven dentro o adyacente al
   Hero. La racha también puede vivir dentro del Hero como dato
   destacado, o quedar como card inmediata pegada al Hero — explorar
   ambas direcciones entre los 3 conceptos.
2. Resolver las tabs con el mismo lenguaje visual que Logros
   (gap 20px, contador chip, border-bottom 1px).
3. Usar Fraunces explícito (font-family: var(--font-heading)) en
   todas las cifras grandes (racha, evolución mensual).
4. Usar la paleta --color-medalla-{tono} en los chips de logros
   recientes según el tono real de cada badge.
5. Cero hex hardcoded. Cero #fff literales. Solo variables CSS.
6. Preservar el chip "🌿 Día de gracia" cuando la racha usó freeze.

## DELTAS VISUALES DE ALCANCE

- Sí toca: estructura Hero + Racha (pueden fusionarse o separarse
  según concepto), tabs, cifras tipográficas, chips de logros, layout
  general.
- No toca: lógica de calcularRacha, calcularEvolucion, frasePorRacha,
  calcularLogrosRecientes (eso se unifica con NIVELES de Logros en
  un paso separado), navegación a /perfil ni a /hitos.

## RESTRICCIONES DURAS

- Solo CSS y JSX. Cero schema, cero queries, cero rutas nuevas.
- Mocha Mix obligatorio: --color-accent-mocha, --color-primary
  (tangerine), --color-bg (cream), --color-accent (pistachio),
  --color-strawberry. Sin colores externos a la paleta.
- Sin tokens nuevos. Si algo no se puede expresar con los tokens
  actuales, anótalo como nota — no inventes tokens.
- Sin componentes nuevos genéricos (no `<HeroProfile>` ni
  `<RachaCard>`). El HitosPage referente usa estilos locales por
  módulo, no abstracciones compartidas.
- NO agregar componentes ni funcionalidades nuevas que no estén en
  los deltas listados.
- NO alterar copy, estructura informacional ni flujo de navegación.
- NO proponer "mejoras extra" — si detectas algo fuera del alcance
  que crees que debería cambiar, anótalo como nota separada al final
  del bundle, no lo implementes.
- Aplicar SOLO los deltas listados en "DELTAS VISUALES DE ALCANCE".

## ENTREGABLES POR CONCEPTO

- Mockup en JSX + CSS module reproducible (no PNG suelto).
- Decisiones tipográficas y de color justificadas en una nota corta.
- 1-2 frases sobre el "mood" del concepto y qué resuelve.
