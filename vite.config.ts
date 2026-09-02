import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from './api/states'

/**
 * OpenSky replies with `Access-Control-Allow-Origin: https://opensky-network.org`, so the browser
 * can never call it directly. In production `api/states.ts` is a serverless function that stands
 * in the way; here it runs as middleware instead.
 *
 * It is deliberately the same module rather than a plain HTTP proxy. A proxy cannot hold an OAuth2
 * token, clamp the bounding box or share the cache, so development would have been quietly
 * anonymous -- and the credentials in `.env` would only ever have worked once deployed.
 */
function openSkyEndpoint(): Plugin {
  const respond = async (
    request: IncomingMessage & { originalUrl?: string },
    response: ServerResponse,
  ) => {
    try {
      // The middleware path is stripped from `url`; `originalUrl` still carries the query.
      const url = new URL(request.originalUrl ?? request.url ?? '', 'http://localhost')
      const result = await handler(new Request(url))

      response.statusCode = result.status
      result.headers.forEach((value, key) => response.setHeader(key, value))
      response.end(await result.text())
    } catch (error) {
      response.statusCode = 500
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ error: (error as Error).message }))
    }
  }

  const attach = (middlewares: Connect.Server) => {
    middlewares.use('/api/states', respond)
  }

  return {
    name: 'overhead-opensky-endpoint',
    configureServer: (server) => attach(server.middlewares),
    // `npm run preview` serves the real build; without this it would serve a bundle with no sky.
    configurePreviewServer: (server) => attach(server.middlewares),
  }
}

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_-prefixed variables. These two are read by the endpoint above, which
  // runs in Node, so they are lifted into the process environment instead of the bundle.
  const env = loadEnv(mode, process.cwd(), '')
  process.env.OPENSKY_CLIENT_ID ??= env.OPENSKY_CLIENT_ID
  process.env.OPENSKY_CLIENT_SECRET ??= env.OPENSKY_CLIENT_SECRET

  return {
    plugins: [react(), openSkyEndpoint()],
    // MapLibre parses tiles in a Web Worker. Vite's dependency pre-bundling rewrites the module
    // but does not serve the worker alongside it, so in development the worker 404s and the map
    // silently never loads a single tile. Leaving it unbundled lets the worker resolve.
    optimizeDeps: { exclude: ['maplibre-gl'] },
  }
})
