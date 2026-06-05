# Brief para Claude Design — Flujo de REGISTRAR

> Documento de referencia para una pasada **estética** sobre el flujo de Registrar de Huella.
> Generado a partir de una auditoría de lectura del código real. La estructura, el copy y el flujo descritos aquí son los REALES en producción.

---

## Contexto de la app

**Huella** es una app de crianza con IA en español latinoamericano (tuteo chileno neutro) que ayuda a padres a registrar y entender los episodios conductuales de sus hijos. Paleta de marca **"Mocha Mix"**: fondos crema/vainilla, header mocha, acentos cálidos **tangerine** (primario), **pistachio** y **strawberry**. Tipografía: **Fraunces** para headings, **Plus Jakarta Sans** para cuerpo. La fuente única de verdad de los tokens es `src/index.css`.

---

## DECISIÓN ESTRUCTURAL (no negociable)

**Mantener las DOS pantallas actuales. NO unificar.**

- `NuevoPage` → pantalla "¿Qué quieres registrar?" (elegir) + flujo de **avance**.
- `RegistroPage` → flujo de **episodio difícil** (elegir modo → formulario → resultado).

Design trabaja **estético sobre la estructura existente**. La idea de unificar ambas pantallas en un solo flujo queda como nota futura (ver sección final), hoy NO se hace.

---

## OBJETIVO

Elevar la calidad visual del flujo de Registrar a **nivel premium**, coherente con Home y la marca Huella (crema/mocha + tangerine/pistachio/strawberry). Que registrar se sienta **simple, cálido y contenedor** — no un formulario clínico.

---

## SCOPE (estético — mantener estructura, copy y flujo)

- **NuevoPage:** pantalla "¿Qué quieres registrar?" (las 2 cards) + formulario de avance + pantalla de resultado de avance.
- **RegistroPage:** elegir modo (rápido/detallado), formulario rápido, formulario detallado, pantalla de resultado de episodio.
- **Coherencia visual** entre todas las vistas.

---

# Estructura REAL del flujo (referencia para no inventar)

## Arquitectura: el "+" son DOS páginas

El botón "+" del nav **no es una sola pantalla**. Es un flujo repartido en dos páginas con un desvío de ruta en medio:

- **`NuevoPage`** (`/nuevo`) → "¿Qué quieres registrar?". La opción **avance** se queda en esta misma página (vista interna); la opción **episodio difícil** hace `navigate('/registro')`.
- **`RegistroPage`** (`/registro`) → todo el flujo de episodio difícil.

Las vistas **se reemplazan** (máquina de estados por variable `vista`), con animación de entrada `vistaSlideUp` (400 ms). No hay barra de pasos / wizard.

## Archivos del flujo

| Rol | Archivo |
|---|---|
| Página raíz del "+" (elegir + avance) | `src/pages/nuevo/NuevoPage.jsx` + `NuevoPage.module.css` |
| Página del episodio difícil | `src/pages/registro/RegistroPage.jsx` + `RegistroPage.module.css` |
| Input de texto con dictado por voz ("¿Qué pasó?") | `src/components/ui/VoiceTextarea.jsx` + `.module.css` |
| Bloque "Acción rápida" (se reusa en Historial) | `src/components/historial/AccionRapida.jsx` + `.module.css` |
| Primitivas reusadas | `Card.jsx`, `Button.jsx`, `RespuestaIA.jsx`, `TooltipAyuda.jsx` |

---

## Estructura visual de arriba a abajo (todas las vistas)

### NuevoPage — vista `elegir` ("¿Qué quieres registrar?")
1. Título con tooltip de ayuda.
2. Card grande **"Un episodio difícil"** (🌊) → va a `/registro`.
3. Card grande **"Un avance"** (⭐) → cambia a vista `hito` interna.

### NuevoPage — vista `hito` (formulario de AVANCE)
1. Header "← Volver".
2. Título "¿Qué avanzó?".
3. Card: textarea **"Cuéntame qué pasó"**.
4. Card: grid de **Categoría (opcional)** — 6 botones (2 columnas).
5. Sección **Foto (opcional)** — botón cámara / preview con botón quitar.
6. Botón primario **"Guardar avance"**.

### NuevoPage — vista `guardado` (resultado de AVANCE)
1. ⭐ **"¡Avance registrado!"** + subtítulo.
2. (Solo si NO subió foto en el form) Bloque **"Enmarca este momento"** (📸) para agregar foto al álbum.
3. Botón **"Volver al inicio"** + link **"Ver todos los avances →"**.

### RegistroPage — vista `elegir` ("¿Cómo registrar?")
1. Header + subtítulo "Más contexto = análisis más preciso para {nombre}".
2. Card **"Registro rápido"** (⚡, badge "orientación inmediata").
3. Card destacada **"Registro detallado"** (📊, badge "análisis completo 🎯").
4. (Condicional) Aviso de cercanía al límite free + link "Conocer Pro".

### RegistroPage — vista `rapido` (formulario corto)
1. Header "← Volver" + badge "orientación inmediata".
2. Título "¿Qué pasó?".
3. **VoiceTextarea** (texto libre + micrófono).
4. Card: **Tipo de episodio** (grid 3 col, emojis grandes).
5. Card: **¿Qué tan intenso fue?** (5 emojis grandes).
6. Card: **¿Cuándo pasó?** (chips; si "Otro momento…" → calendario + spinner de hora).
7. Botón **"Guardar"**.
8. Link **"¿Quieres agregar más detalle? → Registro detallado"**.

### RegistroPage — vista `detallado` (formulario largo)
1. Header "← Volver" + badge "análisis completo 🎯".
2. Título "¿Qué pasó?".
3. **VoiceTextarea**.
4. Card: **Tipo de episodio** (grid 3 col, emoji normal).
5. Card: **¿Qué emoción crees que estaba detrás…? (opcional)** → selector de 2 niveles (categoría → emoción específica).
6. Card: **¿Qué tan intenso fue?** (5 emojis).
7. Card: **¿Cuándo pasó?** (chips + calendario).
8. Card: **¿Qué estaba pasando antes?** (textarea de contexto).
9. Card: **Posibles gatillantes** (chips multi-selección).
10. Card: **¿Cómo estabas tú en ese momento?** (chips de estado del adulto; "No lo vi yo" → input "¿Quién estuvo presente?"; otro estado → textarea extra).
11. Botón **"Guardar y obtener orientación"**.

### RegistroPage — vista `guardado` (resultado de EPISODIO)
1. Card ✅ **"Episodio registrado"** + subtítulo "{emoji} {tipo} — Intensidad N/5".
2. Bloque **Acción rápida** (skeleton → resultado).
3. **Orientación completa** (`RespuestaIA`) o card de error con reintento.
4. Mantra en cursiva.
5. Sección **Reflexión personal** (textarea + botón guardar).
6. (Condicional) CTA **"Crear estrategia desde esto"**.
7. Botón **"Volver al inicio"**.

---

## Copy real (textual — NO inventar, NO cambiar)

### NuevoPage — elegir
- Título: **"¿Qué quieres registrar?"** + tooltip: *"Mientras más detalles aportes, más precisa será la orientación de Huella."*
- Opción 1: **"Un episodio difícil"** — *"Rabieta, llanto, agresividad u otro momento complicado"*
- Opción 2: **"Un avance"** — *"Se calmó solo, pidió disculpas, toleró un \"no\" u otro logro"*

### NuevoPage — formulario avance
- Título: **"¿Qué avanzó?"**
- Label: **"Cuéntame qué pasó"** — placeholder: *"Ej: Esta tarde se calmó solo sin que yo interviniera…"*
- Label: **"Categoría (opcional)"**
- Categorías: Se calmó solo 🌱 · Mostró empatía 💛 · Pidió disculpas 🤝 · Toleró un "no" 💪 · Avance social 👫 · Otro avance ⭐
- Label: **"Foto (opcional)"** — botón **"Agregar foto"**
- Botón: **"Guardar avance"**

### NuevoPage — resultado avance
- **"¡Avance registrado!"** + *"Cada logro pequeño cuenta. Lo tienes guardado en tu historial de avances."*
- Bloque foto: **"Enmarca este momento"** — *"Agrega una foto de este avance. Quedará en el álbum de crecimiento de {nombre}."* — botón **"Agregar foto"** → tras subir: *"📸 ¡Momento guardado en el álbum de {nombre}!"* + botón **"Listo"**
- **"Volver al inicio"** + **"Ver todos los avances →"**

### RegistroPage — elegir modo
- Título: **"¿Cómo registrar?"** — sub: **"Más contexto = análisis más preciso para {nombreHijo}"** (default "tu hijo/a")
- Card rápido: badge **"orientación inmediata"**, título **"Registro rápido"**, desc **"Solo tipo e intensidad. Máximo 3 taps y listo."**
- Card detallado: badge **"análisis completo 🎯"**, título **"Registro detallado"**, desc **"Agrega contexto, gatillantes y cómo estabas. La IA identifica patrones con más precisión."**
- Aviso límite: *"Te queda 1 registro en tu plan gratuito."* / *"Te quedan N registros en tu plan gratuito."* + link **"Conocer Pro"**

### RegistroPage — formularios
- Título (ambos modos): **"¿Qué pasó?"**
- Label tipo: **"Tipo de episodio"**
- Tipos: Rabieta / explosión 💥 · Llanto intenso 😭 · Golpes / agresividad 👊 · Miedo / angustia 🫣 · No quiere dormir 🛏️ · Oposición / no coopera 🚫 · Se aisló / no quiso relacionarse 🫥 · Se cerró / no respondía 🔇 · Otro 📝
- Tipo "Otro" → textarea placeholder: *"¿Cómo describirías lo que pasó?"*
- Label emoción (detallado): **"¿Qué emoción crees que estaba detrás de lo que pasó? (opcional)"**
- Label intensidad: **"¿Qué tan intenso fue?"** — Muy leve 😌 · Leve 🙁 · Moderado 😟 · Intenso 😣 · Muy intenso 😱
- Label cuándo: **"¿Cuándo pasó?"** — Ahora · Hace ~1 hora · Esta mañana · Esta tarde · Ayer · Otro momento…
- Label contexto: **"¿Qué estaba pasando antes?"** — placeholder *"Contexto breve del episodio..."*
- Label gatillantes: **"Posibles gatillantes"** — Hambre · Cansancio · Cambio de rutina · Pelea con amigos · Pantallas · Transiciones · Enfermedad · Tensión en casa · Sobreestimulación · Dolor o malestar físico
- Label estado adulto: **"¿Cómo estabas tú en ese momento?"** — Calmado · Frustrado · Cansado · Ansioso · Triste · Abrumado · No lo vi yo
  - "No lo vi yo" → label **"¿Quién estuvo presente?"**, placeholder *"ej: abuela, profe, otro cuidador"*
  - Otro estado → textarea *"Algo más que quieras agregar (opcional)..."*
- Botón guardar rápido: **"Guardar"** · detallado: **"Guardar y obtener orientación"**
- Link cambiar modo: **"¿Quieres agregar más detalle? → Registro detallado"**

### Taxonomía de emociones (selector de 2 niveles, modo detallado)
- 😨 **Miedo / Angustia**: al abandono · a lo desconocido · a fracasar · a hacerse daño · a la oscuridad
- 😠 **Rabia / Frustración**: por injusticia · por no conseguir algo · por ser interrumpido · por perder el control · acumulada
- 😢 **Tristeza / Pena**: por un cambio o pérdida · por sentirse solo · por decepción · añoranza de alguien · sin causa clara
- 🤩 **Alegría / Desborde**: euforia que se desbordó · alegría que terminó en llanto · excitación extrema · emoción por anticipación
- 🤢 **Asco / Rechazo**: a comida o textura · a una actividad · disgusto sensorial · vergüenza
- 😵 **Confusión / Sorpresa**: por cambio de reglas · sorpresa que asustó · no entendió lo que pasó · se sintió ignorado

### RegistroPage — resultado episodio
- Card: **"Episodio registrado"** + "{emoji} {tipo} — Intensidad N/5"
- Acción rápida: header **"ACCIÓN RÁPIDA"** + firma **"— {Autor} · {lente}"**
- Orientación cargando: *"Analizando lo que pasó con tu hijo..."*
- Mantra: *"Cada registro es una conversación contigo mismo sobre cómo quieres criar."*
- Reflexión: label *"¿Cómo te sentiste tú? ¿Qué harías diferente? — opcional"*, placeholder *"¿Qué harías diferente la próxima vez?"*, botón **"Guardar reflexión"** → **"✓ Guardado"**
- CTA: **"Crear estrategia desde esto"** + habilidad sugerida
- Botón **"Volver al inicio"**

---

## Estados especiales (mantener todos)

**Validación (botón Guardar deshabilitado):**
- Episodio: requiere `tipo + intensidad + cuándo`.
- Avance: requiere descripción no vacía.

**Loading:**
- Botón "Guardar" con spinner.
- VoiceTextarea: `idle / grabando` (waveform 20 barras + punto rojo) `/ finalizando` ("Procesando…") `/ revisando` (texto transcrito + ✕/Agregar) `/ error`.
- Acción rápida: skeleton shimmer.
- Orientación: `RespuestaIA` con mensaje de carga.
- Foto (Enmarca): botón **"Subiendo..."**.

**Error:**
- Guardar falla: *"No se pudo guardar: {mensaje}"* (texto rojo centrado).
- Orientación IA falla: card 📡 **"No pudimos obtener tu orientación esta vez."** + texto tranquilizador + botón **"Reintentar"**.
- Foto Enmarca falla: *"No se pudo subir la foto. Intenta de nuevo."*
- Voz: permiso denegado → mensaje (auto-oculta a los 3.5 s).

**Gate de monetización (free):** al elegir modo en RegistroPage, si llegó al tope free y no es Pro → abre `UpgradeModal` en vez del formulario.

---

## Tokens del sistema en uso (referencia)

Texto/fondo: `--color-text`, `--color-text-muted`, `--color-text-light`, `--color-bg`, `--color-surface`, `--color-surface-alt`, `--color-border`.
Primario: `--color-primary`, `--color-primary-light`, `--color-primary-dark`, `--color-primary-deep`, `--color-primary-bg`.
Acentos: `--color-accent-green`, `--color-accent-blue`, `--color-accent-indigo`, `--color-accent-orange`, `--color-amber`, `--color-amber-medium`.
Semánticos: `--color-danger`, `--color-success`, `--color-success-bg`, `--color-celebration-start`, `--color-white`.
Tipografía: `--font-family`, `--font-heading`. Radios: `--radius-sm`, `--radius-md`, `--radius-lg`. Sombras: `--shadow-sm`.

---

# DELTAS A INCORPORAR (arreglos concretos)

Estos son los **únicos cambios** además de la pasada estética general. Especificar cada uno en el mockup/specs:

### Delta 1 — Placeholder cálido en "¿Qué pasó?"
Hoy el campo principal de texto (VoiceTextarea, en modo rápido y detallado) **sale sin placeholder** (vacío). Definir un placeholder cálido.
Ejemplo de tono: *"Cuéntame qué pasó, con tus palabras…"*. **El copy final se aprueba aparte** — proponer, no fijar.

### Delta 2 — Emparejar el color de la "Acción rápida"
Hoy hay inconsistencia: el estado de **carga** (skeleton) es **ámbar** y el **resultado** es **tangerine** (`--color-primary`). Debe ser **consistente: tangerine en ambos estados** (carga y resultado). Especificar el color del skeleton/shimmer y del borde en tangerine.

### Delta 3 — Tokens para los 6 colores emocionales
Hoy la taxonomía de emociones tiene **12 hex hardcodeados** en `RegistroPage.jsx` (un par color + colorBg por emoción), aplicados como inline styles. Proponer **tokens** para los 6, con nombres tipo:

- `--color-emocion-miedo` (+ `-bg`)
- `--color-emocion-rabia` (+ `-bg`)
- `--color-emocion-tristeza` (+ `-bg`)
- `--color-emocion-alegria` (+ `-bg`)
- `--color-emocion-asco` (+ `-bg`)
- `--color-emocion-confusion` (+ `-bg`)

Cada uno con su **override en dark mode** (`@media (prefers-color-scheme: dark)`). Los colores propuestos deben sentirse parte de la paleta Huella, no fuera de ella. (Valores actuales como referencia de intención cromática — Design puede ajustarlos a la paleta: miedo azul/índigo, rabia terracota, tristeza azul, alegría dorado, asco verde, confusión naranja.)

---

# FORMATO DE ENTREGA (clave — no romper nada)

- Claude Design entrega un **MOCKUP + SPECS** como **REFERENCIA** (tokens, colores, tipografía, tamaños, spacing, radios por elemento). **NO código para pegar.**
- La implementación la hará **Claude Code sobre el código REAL existente**, usando el mockup como guía. Design **no toca lógica, datos ni nombres de componentes/clases**. **No inventa copy.**

---

# RESTRICCIONES ESTRICTAS

- **Solo los deltas visuales listados.** No agregar componentes ni funcionalidades. No alterar estructura, copy ni flujo. No proponer mejoras extra dentro del mockup. Observaciones/ideas van como notas separadas al final, **nunca implementadas**.
- **Usar los tokens del sistema.** No inventar colores fuera de la paleta.

---

# NOTAS SEPARADAS — NO IMPLEMENTAR

> Ideas y observaciones registradas para evaluación futura. **No forman parte de este encargo y no deben aparecer en el mockup.**

- **Unificar las dos pantallas (NuevoPage + RegistroPage) en un solo flujo.** Hoy el "+" salta entre dos páginas con un desvío de ruta. Es una decisión estructural futura — se evalúa aparte. **Hoy NO se hace.**
