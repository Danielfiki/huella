import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))

// Intercepta el import de '../lib/supabase' que hacen los dos AuthContext y lo
// manda al shim controlable. Va por resolveId para que funcione aunque la ruta
// relativa no exista (el archivo ANTES vive en otra carpeta).
const interceptarSupabase = {
  name: 'interceptar-supabase',
  // 'pre' es imprescindible: sin esto el plugin corre DESPUES del resolver de
  // vite, que ya resolvio '../lib/supabase' al archivo real, y el bundle
  // termina con el cliente de verdad en vez del shim.
  enforce: 'pre',
  resolveId(id) {
    if (/lib[\\/]supabase(\.js)?$/.test(id)) {
      // Normalizar a barras: en Windows path.resolve devuelve backslashes y
      // vite normaliza con '/', asi que sin esto el mismo archivo entra al
      // bundle DOS VECES (dos ids distintos) y el shim que controla el test
      // no es el que usa AuthContext.
      return path.resolve(aqui, 'shim/supabase.js').replace(/\\/g, '/')
    }
    return null
  },
}

export default defineConfig({
  root: aqui,
  logLevel: 'warn',
  esbuild: { jsx: 'automatic', jsxImportSource: 'huella-shim' },
  resolve: {
    alias: {
      'huella-shim/jsx-runtime': path.resolve(aqui, 'shim/jsx-runtime.js'),
      react: path.resolve(aqui, 'shim/react.js'),
    },
  },
  plugins: [interceptarSupabase],
  build: {
    ssr: path.resolve(aqui, 'entrada.js'),
    outDir: path.resolve(aqui, 'dist'),
    target: 'node20',
    minify: false,
    emptyOutDir: true,
    rollupOptions: { output: { format: 'es', entryFileNames: 'entrada.mjs' } },
  },
})
