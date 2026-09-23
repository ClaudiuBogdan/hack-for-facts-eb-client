#!/usr/bin/env node
/**
 * Delaying GraphQL proxy for slow-API tests of server-rendered pages.
 *
 * Sits between the app and the API so a single operation can be made slow on
 * demand, which is the only way to exercise the SSR deadline without touching
 * the API's cache. Nothing is cached here; every request is forwarded. A
 * request the app abandons (the SSR deadline aborting its fetch) is dropped
 * before it reaches the upstream and logged as `aborted`.
 *
 *   node scripts/delay-graphql-proxy.mjs
 *   PORT=3001 TARGET=https://dev-chronos-api.transparenta.eu node scripts/delay-graphql-proxy.mjs
 *
 * Control endpoints (GET):
 *   /__delay?op=GetEntityMetadata&ms=4000   delay one operation (op=* for all)
 *   /__delay?op=GetEntityMetadata&ms=0      clear it (blank or invalid also clears)
 *   /__delay                                current delays
 *   /__log                                  drain the request log
 *
 * Wiring the built app to it: server-side fetches follow
 * `INTERNAL_API_URL=http://127.0.0.1:3001` at runtime; the browser's calls go
 * through the app's own `/api/v1/graphql` server route, whose target is
 * inlined at build time, so build with `VITE_API_PROXY_TARGET=http://127.0.0.1:3001`.
 */
import http from 'node:http'

const MAX_DELAY_MS = 2_147_483_647
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 3001
const TARGET = process.env.TARGET ?? 'https://dev-chronos-api.transparenta.eu'
const HOP_BY_HOP_HEADERS = [
  'connection',
  'content-length',
  'accept-encoding',
  'expect',
  'keep-alive',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]
const delays = new Map()
const log = []

const operationName = (body) =>
  /\b(?:query|mutation)\s+(\w+)/.exec(body)?.[1] ?? 'anonymous'

const parseDelay = (raw) => {
  if (raw === null || !/^\d+$/u.test(raw)) return 0
  return Math.min(Number(raw), MAX_DELAY_MS)
}

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })

const record = (entry) => {
  log.push(entry)
  if (log.length > 500) log.shift()
  process.stdout.write(`${JSON.stringify(entry)}\n`)
}

const handleControl = (url, res) => {
  if (url.pathname === '/__delay') {
    const op = url.searchParams.get('op')
    if (op) {
      const ms = parseDelay(url.searchParams.get('ms'))
      if (ms === 0) delays.delete(op)
      else delays.set(op, ms)
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(Object.fromEntries(delays)))
    return true
  }
  if (url.pathname === '/__log') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(log.splice(0)))
    return true
  }
  return false
}

const readBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

const proxy = async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  if (handleControl(url, res)) return

  const abort = new AbortController()
  res.on('close', () => {
    if (!res.writableFinished) abort.abort()
  })

  const body = await readBody(req)
  const op = req.method === 'POST' ? operationName(body.toString('utf8')) : req.method
  const delay = delays.get(op) ?? delays.get('*') ?? 0
  const started = Date.now()
  if (delay > 0) await sleep(delay, abort.signal)
  if (abort.signal.aborted) {
    record({ op, delay, aborted: true, waitedMs: Date.now() - started, at: new Date(started).toISOString() })
    return
  }

  const headers = { ...req.headers, host: new URL(TARGET).host }
  for (const name of HOP_BY_HOP_HEADERS) delete headers[name]

  try {
    const upstream = await fetch(TARGET + url.pathname + url.search, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60_000)]),
    })
    const text = await upstream.text()
    record({
      op,
      delay,
      upstreamMs: Date.now() - started - delay,
      status: upstream.status,
      at: new Date(started).toISOString(),
    })
    const outHeaders = {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    }
    for (const name of ['cache-control', 'etag']) {
      const value = upstream.headers.get(name)
      if (value) outHeaders[name] = value
    }
    res.writeHead(upstream.status, outHeaders)
    res.end(text)
  } catch (error) {
    if (abort.signal.aborted) {
      record({ op, delay, aborted: true, waitedMs: Date.now() - started, at: new Date(started).toISOString() })
      return
    }
    record({ op, error: String(error) })
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        data: null,
        errors: [{ message: `proxy: ${String(error)}`, extensions: { code: 'UPSTREAM_UNAVAILABLE' } }],
      }),
    )
  }
}

const server = http.createServer((req, res) => {
  proxy(req, res).catch((error) => {
    record({ op: req.method, error: String(error) })
    if (!res.headersSent) res.writeHead(400, { 'content-type': 'application/json' })
    if (!res.writableEnded) res.end(JSON.stringify({ data: null, errors: [{ message: `proxy: ${String(error)}` }] }))
  })
})

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`delay-graphql-proxy on http://127.0.0.1:${PORT} -> ${TARGET}\n`)
})
