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
            const mockReq = { method: req.method, body }
            const mockRes = {
              _status: 200,
              status(code) { this._status = code; return this },
              json(data) {
                res.writeHead(this._status, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(data))
              },
            }
            await anthropicHandler(mockReq, mockRes)
          })
        },
      },
    ],
    server: { port: 3000 },
  }
})
