import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { html } from 'hono/html'

import api from './routes/api.js'

type Bindings = {
  API_BASE_URL?: string
}

const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.use('*', cors())

app.onError((err, c) => {
  console.error('Request error:', err.stack ?? err.message)
  return c.json({ error: err.message }, 500)
})

// Mount API routes
app.route('/', api)

// OpenAPI spec — dynamic, reads server URL from env bindings
app.doc31('/openapi.json', (c) => ({
  openapi: '3.1.0',
  info: {
    title: 'Transparenta.eu Public Budget API',
    version: '3.0.0',
    description: `REST API for querying Romanian public budget data from Transparenta.eu.

**Endpoints:**
1. **GET /search** — Find public entities by name or type. Returns CUI identifiers.
2. **GET /entities/{cui}** — Get comprehensive budget data for an entity: financials, trends, line items, reports, commitments, and more.
3. **GET /heatmap** — Get per-capita spending data for all UATs (municipalities/communes) across Romania.
4. **GET /heatmap/counties** — Get per-capita spending data aggregated by county.
5. **GET /rankings** — Rank entities by budget spending or income with filtering.
6. **GET /aggregated** — Budget data aggregated by functional/economic classification.
7. **GET /line-items** — Search individual budget execution line items.
8. **GET /commitments/line-items** — Detailed commitment line items for entities.
9. **GET /classifications** — Reference data: functional, economic, budget sectors, funding sources.
10. **GET /ins/contexts** — Browse INS (National Statistics Institute) context hierarchy.
11. **GET /ins/datasets** — Search INS statistical datasets.
12. **GET /ins/datasets/{code}** — Get dataset details with dimensions.
13. **GET /ins/observations/{datasetCode}** — Query INS statistical observations.
14. **GET /ins/datasets/{code}/dimensions/{index}/values** — Get available dimension values.

All amounts are in RON unless you specify currency=EUR or normalization=per_capita. Data is sourced from official public budget execution reports submitted by Romanian public entities.`,
  },
  servers: [
    { url: c.env?.API_BASE_URL ?? new URL('/', c.req.url).origin.replace(/^http:/, 'https:') },
  ],
}))

// Swagger UI
app.get('/swagger', swaggerUI({ url: '/openapi.json' }))

// Homepage
app.get('/', (c) => {
  return c.html(html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Transparenta.eu – API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { max-width: 540px; width: 100%; padding: 3rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; color: #fff; }
    p { color: #a3a3a3; line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem; }
    .links { display: flex; flex-direction: column; gap: 0.75rem; }
    a { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border: 1px solid #262626; border-radius: 0.75rem; color: #e5e5e5; text-decoration: none; transition: border-color 0.15s, background 0.15s; }
    a:hover { border-color: #525252; background: #171717; }
    .label { font-weight: 500; }
    .desc { font-size: 0.8rem; color: #737373; }
    .arrow { color: #525252; font-size: 1.2rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Transparenta.eu API</h1>
    <p>Public budget data for Romania. Search entities, get budget data by CUI, or view per-capita spending heatmap.</p>
    <div class="links">
      <a href="https://chatgpt.com/g/g-699515b886e8819191316652a3a774b9-transparenta-eu" target="_blank">
        <div>
          <div class="label">Custom GPT</div>
          <div class="desc">Ask questions about Romanian public budget data</div>
        </div>
        <span class="arrow">&rarr;</span>
      </a>
      <a href="/swagger" target="_blank">
        <div>
          <div class="label">Swagger UI</div>
          <div class="desc">Interactive REST API documentation (OpenAPI 3.1)</div>
        </div>
        <span class="arrow">&rarr;</span>
      </a>
      <a href="/openapi.json" target="_blank">
        <div>
          <div class="label">OpenAPI Spec</div>
          <div class="desc">Raw JSON schema for Custom GPT / tool integrations</div>
        </div>
        <span class="arrow">&rarr;</span>
      </a>
    </div>
  </div>
</body>
</html>`)
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
