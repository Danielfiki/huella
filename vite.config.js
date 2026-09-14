import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY

  const { default: anthropicHandler } = await import('./api/anthropic.js')

  return {
    plugins: [
      react(),
      {
        name: 'dev-api',
        configureServer(server) {
          server.middlewares.use('/api/anthropic', async (req, res) => {
            const raw = await new Promise((resolve, reject) => {
              const chunks = []
              req.on('data', (c) => chunks.push(c))
              req.on('end', () => resolve(Buffer.concat(chunks).toString()))
              req.on('error', reject)
            })
            const body = JSON.parse(raw || '{}')
            const mockReq = { method: req.method, headers: req.headers, body }
            // El handler de api/anthropic.js usa CINCO metodos de res, no dos:
            // status y json en la rama normal, y setHeader, flushHeaders, write
            // y end en la de streaming. Con solo status y json, cualquier
            // llamada con stream:true tiraba "res.setHeader is not a function"
            // dentro de un middleware async sin try/catch, o sea un rechazo no
            // capturado, y Node mataba el dev server entero.
            //
            // Al caerse el proceso, las OTRAS llamadas en vuelo se cortaban con
            // ERR_CONNECTION_RESET. Por eso registrar un momento en localhost
            // rompia tres cosas a la vez: la orientacion (que es la que
            // streamea), la accion inmediata y el motor de rasgos.
            //
            // Este mock delega en el res real de Node, que ya sabe hacer todo
            // esto. Solo existe en desarrollo: en produccion Vercel entrega el
            // request y el response de verdad.
            let cabecerasEnviadas = false
            const mockRes = {
              _status: 200,
              status(code) { this._status = code; return this },
              json(data) {
                res.writeHead(this._status, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(data))
              },
              setHeader(nombre, valor) { res.setHeader(nombre, valor); return this },
              flushHeaders() {
                if (!cabecerasEnviadas) { cabecerasEnviadas = true; res.flushHeaders() }
              },
              write(chunk) {
                // El streaming escribe sin pasar por flushHeaders si el handler
                // no lo llamo: writeHead implicito con el status acumulado.
                if (!cabecerasEnviadas) { cabecerasEnviadas = true; res.writeHead(this._status) }
                return res.write(chunk)
              },
              end(data) { return res.end(data) },
            }

            // Red de seguridad: pase lo que pase adentro del handler, el dev
            // server NO se cae. Antes una excepcion aca era un rechazo sin
            // capturar y se llevaba el proceso.
            try {
              await anthropicHandler(mockReq, mockRes)
            } catch (err) {
              console.error('[dev-api] el handler de anthropic tiro:', err?.message ?? err)
              if (!res.writableEnded) {
                if (!cabecerasEnviadas) res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'dev-api: el handler fallo' }))
              }
            }
          })
        },
      },
    ],
    server: { port: 3000 },
  }
})
