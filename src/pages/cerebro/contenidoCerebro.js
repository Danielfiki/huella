// Contenido del Cerebro Huella — portado LITERAL del prototipo congelado
// cerebro-fase-b.html (Fase B). El copy viene VALIDADO de la Fase A: nombres,
// apodos, curvas de madurez, textos base, notas por edad, consejos y la franja
// AHORA. No se reescribe ni se "mejora" desde acá.
//
// Vive separado de EscenaCerebro.jsx porque es copy puro, sin dependencias:
// la escena 3D lo lee para los materiales y las curvas, y CerebroPage.jsx lo
// lee para la franja, los chips y la tarjeta de zona.
//
// Las notas usan topes de edad: se toma la primera cuyo tope alcance la edad.
//
// OJO con los colores: ZONAS[slug].color es la fuente de verdad y lo usan las
// DOS capas — el material WebGL de la zona y el punto del chip. Los tokens
// --cerebro-zona-* de index.css repiten estos mismos valores para el lado CSS,
// asi que si cambia uno acá, cambia el token gemelo. La única excepción es la
// corteza: en 3D se dibuja con el tinte del vidrio, no con este color.

export const ZONAS = {
  amigdala:{
    nombre:'La amígdala', apodo:'La alarma de incendios', color:'#E5743D',
    curva:[[0,90],[2,95],[10,95],[12,100],[17,100]],
    base:'Nace casi lista. Es la alarma que grita «¡peligro!» ante frustraciones, cambios o amenazas. Cuando se enciende fuerte, toma el control de todo el cerebro.',
    notas:[
      [2,'la alarma manda casi sin contrapeso — el director de orquesta apenas existe. Las rabietas no son manipulación: son un incendio real sin bombero interno.'],
      [5,'la alarma sigue fuerte, pero ya empieza a dialogar con las zonas de pensamiento. Nombrar la emoción («estás frustrado») ayuda a apagarla antes.'],
      [11,'años más tranquilos — la alarma está más regulada y tu hijo puede contarte qué la enciende. Aprovecha esta ventana para conversar de emociones.'],
      [18,'la pubertad re-sensibiliza la alarma: reacciona más fuerte a lo social (vergüenza, rechazo, injusticia). No es drama — es biología en obra.']
    ],
    consejo:'Cuando la alarma suena, las palabras no llegan. Primero calma, después conversa. Conexión antes que corrección.'
  },
  frontal:{
    nombre:'La corteza prefrontal', apodo:'El director de orquesta (en formación)', color:'#4A63E7',
    curva:[[0,3],[2,10],[5,22],[8,35],[11,48],[14,62],[17,75]],
    base:'La zona del autocontrol, la planificación y el «piénsalo antes de hacerlo». Es la última en madurar de todo el cerebro: termina cerca de los 25 años.',
    notas:[
      [2,'prácticamente no existe todavía. Esperar turnos, controlar impulsos o «portarse bien» cuando está cansado es fisiológicamente imposible — no es desobediencia.'],
      [5,'está brotando: ya puede esperar un poquito, seguir reglas simples y jugar a «congelarse». Cada juego de turnos es un entrenamiento del director.'],
      [8,'ya planifica, negocia y se frustra menos — pero bajo estrés o cansancio el director se cae del podio y vuelve la alarma. Es normal retroceder.'],
      [13,'paradoja adolescente: el director está en plena remodelación mientras la alarma está hipersensible. Por eso un adolescente brillante puede tomar decisiones impulsivas.'],
      [18,'ya razona casi como adulto en frío — pero en caliente (emociones, amigos mirando) el director aún pierde contra la alarma. Le faltan años de obra.']
    ],
    consejo:'Tú eres su corteza prefrontal prestada. Tu calma en los momentos difíciles es literalmente el molde de la suya.'
  },
  hipocampo:{
    nombre:'El hipocampo', apodo:'El bibliotecario de recuerdos', color:'#8FA840',
    curva:[[0,15],[3,40],[6,60],[10,75],[14,85],[17,90]],
    base:'Archiva los recuerdos y les pone contexto: qué pasó, dónde, con quién. Trabaja mano a mano con la amígdala, que le pone la etiqueta emocional a cada archivo.',
    notas:[
      [3,'la biblioteca recién abre — por eso casi nadie recuerda nada de antes de los 3. Pero las sensaciones (seguridad, cariño) sí se están grabando, a su manera.'],
      [6,'los recuerdos ya se ordenan como historias. Contar juntos «qué pasó hoy» fortalece el archivo y le enseña a darle sentido a lo que vive.'],
      [11,'memoria a toda máquina — ideal para aprender idiomas, música, todo. Lo que se vive con emoción positiva se archiva el doble de profundo.'],
      [18,'el bibliotecario es casi experto, pero el estrés le desordena los estantes: la ansiedad de una prueba puede «borrar» lo estudiado. Dormir bien lo repara todo.']
    ],
    consejo:'No importa tanto que recuerde el paseo — importa que recuerde la sensación de estar seguro contigo. Eso queda grabado siempre.'
  },
  cerebelo:{
    nombre:'El cerebelo', apodo:'El coreógrafo', color:'#E8B33C',
    curva:[[0,25],[2,45],[5,62],[8,74],[12,85],[17,92]],
    base:'Coordina el movimiento, el equilibrio y — se descubrió hace poco — también ayuda a afinar el pensamiento y las emociones. Es de las zonas con más neuronas de todo el cerebro.',
    notas:[
      [2,'caminar, trepar, meterse a todos lados: cada caída es una lección del coreógrafo. Necesita moverse tanto como necesita comer.'],
      [5,'saltar en un pie, pedalear, bailar — el coreógrafo está montando sus primeras obras completas. El movimiento libre vale más que cualquier pantalla.'],
      [10,'precisión fina: deportes, instrumentos, dibujo detallado. Y ojo — el cerebelo entrenado con movimiento también afina la concentración en clases.'],
      [18,'el estirón lo descoordina temporalmente (brazos nuevos, torpeza repentina). Es recalibración, no regresión. El deporte lo reordena rápido.']
    ],
    consejo:'El movimiento no es enemigo de la calma: es el camino hacia ella. Un niño que se movió bien de día se regula mejor de noche.'
  },
  tronco:{
    nombre:'El tronco cerebral', apodo:'La sala de máquinas', color:'#E04F5F',
    curva:[[0,85],[2,92],[6,95],[17,98]],
    base:'Controla lo básico: respirar, dormir, el hambre, la alerta. Funciona desde el nacimiento y tiene prioridad sobre todo lo demás — sin lo básico cubierto, nada de arriba funciona.',
    notas:[
      [2,'el sueño y el hambre mandan la conducta más que cualquier otra cosa. La mitad de las rabietas son la sala de máquinas pidiendo mantención.'],
      [7,'ya avisa con palabras que tiene hambre o sueño — pero el efecto sigue igual de fuerte: un niño agotado no puede autorregularse, por más que quiera.'],
      [13,'la pubertad corre el reloj biológico: de verdad le da sueño más tarde. No es flojera — es la sala de máquinas cambiando de turno. Igual necesita 9 horas.'],
      [18,'sigue siendo la base de todo: sueño, comida y movimiento explican más del ánimo adolescente que cualquier conversación profunda.']
    ],
    consejo:'Antes de interpretar una conducta difícil, revisa lo básico: ¿durmió? ¿comió? ¿se movió? Empieza siempre por la sala de máquinas.'
  },
  corteza:{
    nombre:'La corteza cerebral', apodo:'El manto que se está tejiendo', color:'#B9A894',
    curva:[[0,25],[1,40],[3,55],[6,66],[9,74],[12,81],[15,87],[18,92]],
    base:'El manto de afuera, donde viven el lenguaje, los sentidos y el pensamiento. Se teje por capas durante toda la infancia, y lo que se usa se refuerza.',
    notas:[
      [1,'se están formando conexiones a una velocidad que no se va a repetir nunca más.'],
      [3,'explota el lenguaje. Entiende mucho más de lo que logra decir, y eso solo ya frustra.'],
      [6,'juego simbólico a full: el manto está tejiendo la capacidad de imaginar lo que no está.'],
      [9,'lectura, cálculo, reglas. Aprende rápido cuando lo que aprende tiene sentido para él.'],
      [12,'empieza el pensamiento abstracto. Puede discutirte una idea, no solo un permiso.'],
      [15,'poda lo que no usa y refuerza lo que sí. Sus intereses de ahora dejan huella.'],
      [18,'afinando. Piensa en hipótesis y sostiene puntos de vista distintos al mismo tiempo.']
    ],
    consejo:'Lo que se repite, se teje. No hace falta una actividad extraordinaria: la conversación de todos los días es el hilo principal.'
  }
};

export const AHORA = [
  [1,'Se están creando un millón de conexiones neuronales por segundo. Tu voz, tu cara y tus brazos son el estímulo más potente que existe — más que cualquier juguete.'],
  [2,'Explosión del lenguaje: entiende mucho más de lo que puede decir, y esa brecha frustra. Muchas rabietas son palabras que aún no encuentran salida.'],
  [4,'Nace la imaginación y con ella los miedos (monstruos, oscuridad). Su cerebro aún no separa del todo fantasía y realidad — el miedo es real aunque el monstruo no.'],
  [6,'Las zonas del lenguaje y el pensamiento se están cableando entre sí: por eso las preguntas infinitas. Cada «¿por qué?» es una conexión nueva instalándose.'],
  [8,'El pensamiento lógico despega: ya entiende reglas, justicia y consecuencias. Es la edad de oro para acordar límites conversados en vez de impuestos.'],
  [11,'Años de calma relativa antes de la tormenta: el cerebro consolida todo lo aprendido. Es el mejor momento para afianzar la confianza — pronto la va a necesitar.'],
  [14,'Remodelación mayor: el cerebro poda conexiones que no usa y refuerza las que sí. Su cerebro social está hipersensible — la opinión de los amigos pesa a nivel neuronal, no por capricho.'],
  [18,'El director de orquesta acelera su maduración, pero las emociones aún ganan en caliente. Necesita autonomía con red: decisiones propias, contigo cerca por si acaso.']
];

export const porTope = (pares, edad) => {
  for (const [tope, txt] of pares) if (edad <= tope) return txt;
  return pares[pares.length-1][1];
};
export const interp = (curva,e) => {
  for (let i=0;i<curva.length-1;i++){
    const a=curva[i], b=curva[i+1];
    if(e>=a[0] && e<=b[0]) return a[1]+(b[1]-a[1])*((e-a[0])/(b[0]-a[0]));
  }
  return curva[curva.length-1][1];
};
/* la prefrontal define la dramaturgia: 3% al nacer, 75% a los 17.
   pfn normaliza ese recorrido a 0..1 para que el slider se lea entero. */
const PF_MIN = 3, PF_MAX = 75;
export const pfNorm = e => Math.max(0, Math.min(1, (interp(ZONAS.frontal.curva,e) - PF_MIN) / (PF_MAX - PF_MIN)));
export const CRECE = [[0,.78],[1,.87],[3,.93],[6,.96],[12,.99],[18,1]];
