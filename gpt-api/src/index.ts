import { serve } from '@hono/node-server'
import app from './app.js'

const port = Number(process.env.PORT ?? 3100)
const serverUrl = process.env.API_BASE_URL ?? `http://localhost:${port}`

console.log(`Transparenta GPT API listening on http://localhost:${port}`)
console.log(`  Swagger UI:  http://localhost:${port}/swagger`)
console.log(`  OpenAPI:     http://localhost:${port}/openapi.json`)
console.log(`  Server URL:  ${serverUrl}`)

serve({ fetch: app.fetch, port })
