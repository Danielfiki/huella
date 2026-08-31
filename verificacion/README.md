# Verificación del arranque

Red de seguridad automatizada del **arranque de la app** — la cadena que decide
si entras, si te manda a `/login`, o si te deja mirando el splash.

**Corre esto si tocas `src/context/AuthContext.jsx` o
`src/components/ui/SplashArranque.jsx`.**

## Cómo se corre

Dos comandos, desde la raíz del proyecto:

```bash
npx vite build --config verificacion/vite.config.mjs
node verificacion/correr.mjs
```

El primero compila; el segundo corre las pruebas. Si todo está bien: `24 OK,
0 fallas` y sale con código 0. Si algo falla, sale con código 1 y muestra el
detalle.

⚠️ El primer comando es **obligatorio**: genera `verificacion/dist/`, que está
en `.gitignore` y por lo tanto no viene con el repo.

## Qué prueba

De dónde salió: el **31 ago 2026**, dos testers antiguos reportaron que la app
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

## Cómo está armado

No hay framework de tests en el repo y **no se agregó ninguna dependencia**.
En vez de eso:

- **`vite.config.mjs`** compila el `AuthContext.jsx` **real**, pero reemplaza
  `react` y `src/lib/supabase.js` por los shims de `shim/`.
- **`shim/react.js`** es un React mínimo pero fiel en lo que importa: hooks con
  orden estable y `useEffect` que respeta los `deps`.
- **`shim/supabase.js`** deja armar cualquier escenario de red, incluida una
  promesa que nunca resuelve — que es el corazón del bug.
- **`correr.mjs`** usa un **reloj virtual**: los "8 segundos" se avanzan, no se
  esperan. La suite entera corre en menos de un segundo.
- **`AuthContext.ANTES.jsx`** es la versión anterior al fix, sacada de git con
  `git show 222b513^:src/context/AuthContext.jsx`. **No es una simulación del
  bug: es el código que lo tenía.** Por eso la suite demuestra el defecto,
  además de demostrar el arreglo — y eso es lo que prueba que no aprueba sola.

## Dos trampas ya pisadas, para no repetirlas

1. **El plugin que intercepta supabase necesita `enforce: 'pre'`.** Sin eso
   corre después del resolver de vite, se bundlea el cliente real, y como no
   hay variables de entorno el efecto sale por el early-return: **todo pasa en
   verde sin haber probado nada**.
2. **La ruta del plugin va normalizada a barras.** En Windows `path.resolve`
   devuelve backslashes y vite normaliza con `/`; sin normalizar, el mismo
   archivo entra dos veces al bundle y el shim que controla el test no es el
   que usa el código bajo prueba.

Las dos daban falsos verdes. Si alguna vez la suite pasa sospechosamente
rápido y sin esfuerzo, revisa primero que el bundle no tenga `createClient`:

```bash
grep -c createClient verificacion/dist/entrada.mjs   # debe dar 0
```
