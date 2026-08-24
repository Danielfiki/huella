# El Cerebro de tu Hijo — Documento de Producto
**Huella · Agosto 2026 · Vision ratificada por Daniel**

## 1. Que es
Cerebro 3D manipulable (girar, zoom, tocar zonas) que traduce la ciencia del desarrollo infantil en experiencia ludica y personal. No es contenido generico: es el cerebro de SU hijo — su nombre, su edad exacta, y (fase C) sus patrones reales iluminando zonas. Tesis: convertir la neurociencia de las orientaciones en un objeto explorable que el padre quiere abrir, entender y compartir. Anti-verguenza hecho organo: "no es manoso — su corteza tiene 18% de madurez".

## 2. Arquitectura (donde vive)
- Card en Home "En el cerebro de {hijo}": puerta de entrada diaria, gancho visible del Home. DECISION TOMADA: el cerebro 3D ABSORBE la TarjetaCerebro existente (src/components/panel/TarjetaCerebro.jsx, PanelPage.jsx:411) — no se duplica. La tarjeta actual es el embrion: pasa a alimentarse de la matriz nueva y al tocarla abre el Lugar 3D. Un solo cerebro en toda la app.
- El Lugar (pagina del hijo, tocar avatar → "Su cerebro"): casa permanente, exploracion libre sin crisis.
- El Momento (orientacion post-episodio): "esto que viviste paso aqui" — la zona encendida al final de la orientacion.
- Push mensual: "El cerebro de {hijo} cumplio X anos Y meses — algo nuevo se esta encendiendo".
- Compartible: "mandale el cerebro de {hijo} a la abuela / al colegio". Crecimiento organico.
- Indice (vision futura): el cerebro como mapa de navegacion — tocar amigdala → tus episodios donde mando. Posible futuro Home.
- Decision abierta: rol futuro de la campanita "consejo de hoy" frente a la card (fusionar o secundaria).

## 3. Matriz de contenido (motor anti-repeticion)
3 ejes: zona x lente x edad.
Zonas (5-6): amigdala, corteza prefrontal, hipocampo, cerebelo, tronco cerebral (+ evaluar cuerpo calloso / sistema de recompensa para adolescencia).
Lentes (6): fisiologico (que pasa quimicamente), psicologico (que siente el por dentro), conductual (como se ve desde afuera), relacional (que puede hacer el padre), curiosidad (el dato del asado), espejo del adulto (la misma zona en el padre).
Edad: filtra y matiza todo. DECISION TOMADA: la matriz cubre 0-18 (calza con los tramos de los prompts actuales); para 19+ (la app no tiene tope al crear hijo, calcularEdad en HuellaContext.jsx:12) el cerebro muestra estado "cerebro adulto joven — obra gruesa terminada", sin romperse.
Resultado: cientos de piezas distintas → la card rota a diario sin repetirse ni mentir.
Rol de la IA: el banco editorial (curado, con fuentes) define hechos y vara; la IA compone la pieza diaria combinando zona + lente + edad exacta + (fase C) patrones del hijo. La IA compone, no inventa ciencia.

## 4. Mecanicas validadas en prototipo (Fase A)
3D manipulable con inercia, pinch zoom, tap con raycast, deriva suave en reposo — validado en telefono. Corteza "de vidrio" semitransparente (decision clave: se ve el interior sin cortar). Amigdalas en par latiendo. Slider de edad → el cerebro crece, la corteza prefrontal se enciende progresivamente, la amigdala late mas fuerte mientras menos director hay. Franja "ahora mismo en su cerebro". Tarjeta por zona: apodo + % madurez a la edad exacta + nota de etapa + consejo anti-verguenza.
Apodos ratificados: la alarma de incendios (amigdala), el director de orquesta en formacion (prefrontal), el bibliotecario de recuerdos (hipocampo), el coreografo (cerebelo), la sala de maquinas (tronco).
Momento estrella: abrir "corteza prefrontal" y barrer el slider 0→17. Protegerlo en el diseno final.

## 5. Fases
Fase A — CERRADA (ago 2026): prototipos HTML fuera del repo validaron mecanica, matriz, tono, estructura.
Fase B — EN CURSO (ago 2026, priorizada por Daniel): Design (direccion visual, coreografia de transiciones por edad — el cerebro se transforma, no solo escala) + Code (modelo anatomico 3D real de licencia abierta con regiones separadas, integracion en la app, hijos reales, absorcion de TarjetaCerebro, el Lugar) + Editorial (banco de la matriz a la vara de las orientaciones, fuentes: Siegel, Perry, Shanker; piso: una nota por ano por zona).
Fase C: conexion con patrones/episodios reales, el Momento en la orientacion, push mensual, compartible.

## 6. Principios no negociables
Tono Huella anti-verguenza, sereno, sin alarmas. Tuteo neutro/chileno en todo copy, nunca voseo. Paleta Mocha Mix con tokens (terracota=amigdala/accion, lavanda=ciencia/prefrontal, pistacho=positivo/hipocampo). Todo % y afirmacion cientifica defendible con fuente antes de produccion.
