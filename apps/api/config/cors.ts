import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

function parseAllowedOrigins(): string[] {
  const raw = env.get('CORS_ALLOWED_ORIGINS')
  if (!raw?.trim()) {
    return []
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const allowedList = parseAllowedOrigins()

/**
 * With `CORS_ALLOWED_ORIGINS` set, only those Origins get credentialed CORS.
 * Requests without an `Origin` header (non-browser clients, tests) stay allowed.
 */
const corsConfig = defineConfig({
  enabled: true,
  origin:
    allowedList.length > 0
      ? (origin) => {
          if (!origin) {
            return true
          }
          return allowedList.includes(origin)
        }
      : true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
