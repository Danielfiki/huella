# Verificación automatizada

Dos redes de seguridad, un solo bundle:

1. **El arranque de la app** — la cadena que decide si entras, si te manda a
   `/login`, o si te deja mirando el splash.
2. **El dictado por voz** — que lo que se dicta sea lo que se guarda.

**Corre la del arranque si tocas `src/context/AuthContext.jsx` o
`src/components/ui/SplashArranque.jsx`.**

**Corre la de voz si tocas `src/components/ui/VoiceTextarea.jsx`.**

## Cómo se corre

Se compila una vez y se corren las suites que hagan falta:

```bash
npx vite build --config verificacion/vite.config.mjs

node verificacion/correr.mjs              # arranque -> 24 OK, 0 fallas
node verificacion/correr-voz.mjs despues  # voz      -> 10 OK, 0 fallas
node verificacion/correr-voz.mjs antes    # voz      ->  4 OK, 6 fallas (así debe ser)
```

⚠️ El primer comando es **obligatorio**: genera `verificacion/dist/`, que está
en `.gitignore` y por lo tanto no viene con el repo.

La suite de voz recibe un argumento: `despues` corre el código de hoy y **tiene
que dar 0 fallas**; `antes` corre la versión con el bug rescatada de git y
**tiene que fallar**. Si `antes` pasa entera, la suite dejó de probar algo.

## Qué prueba — arranque

De dónde salió: el **30 ago 2026**, dos testers antiguos reportaron que la app
se quedaba pegada en el splash. `getSession()` no tenía `.catch()` ni timeout,
así que una sesión vieja + red mala dejaba `loading` en `true` para siempre.
Ver el bloque del 30 ago en `ESTADO.md`.

| Bloque | Qué cubre |
|---|---|
| A | Flujo normal: con sesión entra, sin sesión va a `/login` |
| B | El bug: `getSession()` colgada |
| C | `getSession()` que rechaza |
| D | Recuperación con gracia: la sesión que llega tarde |
| E | Higiene: desmontaje y timers |
| F | Failsafe visual del splash a los 12s |

## Qué prueba — voz

De dónde salió: el **1 sep 2026** una tester en Android reportó que el dictado
"se cortaba" y que Momentos mostraba "un texto larguísimo". La query dio un
relato de **77.685 caracteres**, sin saltos de línea, con esta forma:

```
momento momento momento de momento de ir momento de ir a momento de ir a bañarse...
```

Eso es **la escalera**: el motor entrega prefijos que crecen y el componente los
**sumaba** con `+=` en vez de reemplazarlos. Ver el bloque del 1 sep en
`ESTADO.md`.

| Bloque | Qué cubre |
|---|---|
| A | La escalera: el relato no puede crecer de forma cuadrática |
| B | Android: el motor cierra tras cada frase y aun así no se pierde nada |
| C | Safari: corta por silencio con el provisorio en el aire |
| D | Motor roto: el techo corta, y sin regalar 8s de "Procesando…" |
| E | Cinturón de seguridad: tope duro de largo antes de la IA |
| F | Lo que se revisa en pantalla es lo que se guarda |

### Las cintas

Un motor de voz no entrega "el texto": entrega una **secuencia de eventos**, y
cada navegador la entrega distinto. El bug no fue del motor — fue que el
componente asumía **una** forma de esa secuencia. Por eso acá la secuencia es un
dato de entrada (una **cinta**) y cada cinta es un navegador:

| Cinta | Qué modela |
|---|---|
| `cintaEscalera` | Prefijos que crecen, todos marcados como finales. Es la que reproduce los 77.685 caracteres |
| `cintaAndroid` | `continuous = true` ignorado (cierra tras **cada** frase) **+ decenas de parciales por frase** |
| `cintaSafari` | Corta por silencio con el provisorio en vuelo, sin final |
| `cintaMotorRoto` | Rebota para siempre sin capturar nada |

⚠️ **La cinta de Android tiene que traer muchos parciales por frase.** El dato de
producción mostró que entre el 12 y el 30 de agosto ningún relato se desbocó: la
acumulación existía desde el 12, pero con pocos parciales el dedupe alcanzaba a
taparla. Lo que la hace estallar es el **volumen** de parciales de Chrome
Android. Una cinta con un solo final por frase se ve sana y no prueba nada.

## Cómo está armado

No hay framework de tests en el repo y **no se agregó ninguna dependencia**.
En vez de eso:

- **`vite.config.mjs`** compila el `AuthContext.jsx` y el `VoiceTextarea.jsx`
  **reales**, pero reemplaza `react`, `src/lib/supabase.js`, los CSS modules y
  `lucide-react` por shims y stubs.
- **`shim/react.js`** es un React mínimo pero fiel en lo que importa: hooks con
  orden estable, `useEffect` que respeta los `deps` y `useRef` que **sobrevive a
  los re-renders** (sin eso el `VoiceTextarea` es imposible de probar: toda su
  maquinaria vive en refs).
- **`shim/supabase.js`** deja armar cualquier escenario de red, incluida una
  promesa que nunca resuelve — que es el corazón del bug del arranque.
- **`shim/speech.js`** es un `SpeechRecognition` falso manejado por cintas.
  Respeta las dos crueldades del de verdad: `start()` sobre un motor corriendo
  **tira** `InvalidStateError`, y `stop()` sobre un motor ya muerto **no**
  vuelve a disparar `onend`.
- **`correr.mjs`** y **`correr-voz.mjs`** usan un **reloj virtual**: los "8
  segundos" se avanzan, no se esperan. Cada suite corre en menos de un segundo.
- **`AuthContext.ANTES.jsx`** y **`VoiceTextarea.ANTES.jsx`** son las versiones
  anteriores al fix, sacadas de git. **No son simulaciones del bug: son el
  código que lo tenía.** Por eso las suites demuestran el defecto, además de
  demostrar el arreglo — y eso es lo que prueba que no aprueban solas.

## Tres trampas ya pisadas, para no repetirlas

1. **El plugin que intercepta supabase necesita `enforce: 'pre'`.** Sin eso
   corre después del resolver de vite, se bundlea el cliente real, y como no
   hay variables de entorno el efecto sale por el early-return: **todo pasa en
   verde sin haber probado nada**.
2. **La ruta del plugin va normalizada a barras.** En Windows `path.resolve`
   devuelve backslashes y vite normaliza con `/`; sin normalizar, el mismo
   archivo entra dos veces al bundle y el shim que controla el test no es el
   que usa el código bajo prueba.
3. **`e.results` del motor falso es la lista ACUMULADA de la sesión, no lo del
   evento.** El componente recorre desde `resultIndex` hasta el final de esa
   lista; si el falso entrega solo el resultado del evento, un `resultIndex`
   mayor que cero deja el bucle **sin recorrer nada** y la prueba pasa por no
   mirar.

Las tres daban falsos verdes. Si alguna vez una suite pasa sospechosamente
rápido y sin esfuerzo, revisa primero que el bundle no tenga `createClient`:

```bash
grep -c createClient verificacion/dist/entrada.mjs   # debe dar 0
```

Y que la versión `antes` de voz siga fallando:

```bash
node verificacion/correr-voz.mjs antes   # debe dar 6 fallas, no 0
```
