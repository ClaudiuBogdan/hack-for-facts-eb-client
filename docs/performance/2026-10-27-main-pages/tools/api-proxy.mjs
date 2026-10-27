#!/usr/bin/env node
// Local stand-in for the API's CORS layer, used by the local production build only.
//
// The dev-chronos API answers CORS only for https://dev-chronos.transparenta.eu, so a build served
// from 127.0.0.1 cannot call it from the browser. This proxy forwards every request to the
// dev-chronos API over a keep-alive pool, answers preflights the way the real API does (same
// headers, no Access-Control-Max-Age), and logs one JSON line per request (browser or server, by
// user agent), so the audit also sees the server-side (SSR) API calls. No app code changes.
//
// Listens on TLS_PORT (3014, HTTPS + HTTP/2, for the browser; the page is served over HTTPS) and on
// HTTP_PORT (3016, plain HTTP, for the Nitro server's SSR calls).
// Env: TLS_KEY, TLS_CERT, LOG_FILE (required); UPSTREAM (https://dev-chronos-api.transparenta.eu),
//      UPSTREAM_ORIGIN (https://dev-chronos.transparenta.eu), TLS_PORT, HTTP_PORT.
import fs from 'node:fs'
import http from 'node:http'
import http2 from 'node:http2'
import https from 'node:https'

const TLS_PORT = Number(process.env.TLS_PORT ?? 3014)
const HTTP_PORT = Number(process.env.HTTP_PORT ?? 3016)
const UPSTREAM = new URL(process.env.UPSTREAM ?? 'https://dev-chronos-api.transparenta.eu')
const UPSTREAM_ORIGIN = process.env.UPSTREAM_ORIGIN ?? 'https://dev-chronos.transparenta.eu'
const LOG_FILE = process.env.LOG_FILE
if (!LOG_FILE) throw new Error('LOG_FILE is required')
const log = fs.createWriteStream(LOG_FILE, { flags: 'a' })
const agent = new https.Agent({ keepAlive: true, maxSockets: 64 })

const ALLOW_HEADERS = 'content-type, authorization, x-api-key, accept, mcp-session-id, last-event-id'
const ALLOW_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const EXPOSE_HEADERS = 'content-type, mcp-session-id, Mcp-Session-Id'
const HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'http2-settings', 'te', 'host'])

function operationOf(body, url) {
  const pick = (payload) => {
    if (!payload || typeof payload !== 'object') return null
    if (payload.operationName) return payload.operationName
    const match = typeof payload.query === 'string' ? payload.query.match(/\b(query|mutation|subscription)\s+([A-Za-z0-9_]+)/) : null
    return match ? match[2] : typeof payload.query === 'string' ? '(anonymous)' : null
  }
  try {
    if (body.length > 0) {
      const parsed = JSON.parse(body.toString('utf8'))
      if (Array.isArray(parsed)) return parsed.map(pick).join('+')
      return pick(parsed)
    }
    const search = new URL(url, 'http://x').searchParams
    if (search.get('operationName')) return search.get('operationName')
    if (search.get('query')) return pick({ query: search.get('query') })
  } catch {
    return null
  }
  return null
}

function handler(req, res) {
  const wallStart = Date.now()
  const t0 = performance.now()
  const ua = req.headers['user-agent'] ?? ''
  const source = /Mozilla/.test(ua) ? 'browser' : 'server'
  const origin = req.headers.origin
  const cors = origin
    ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-expose-headers': EXPOSE_HEADERS, vary: 'Origin' }
    : {}

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'access-control-allow-headers': ALLOW_HEADERS, 'access-control-allow-methods': ALLOW_METHODS })
    res.end()
    log.write(JSON.stringify({ wallStart, source, kind: 'preflight', method: 'OPTIONS', path: req.url, durMs: +(performance.now() - t0).toFixed(1) }) + '\n')
    return
  }

  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const headers = {}
    for (const [key, value] of Object.entries(req.headers)) if (!key.startsWith(':') && !HOP.has(key)) headers[key] = value
    headers.host = UPSTREAM.host
    if (headers.origin) headers.origin = UPSTREAM_ORIGIN
    if (headers.referer) headers.referer = `${UPSTREAM_ORIGIN}/`
    const operation = operationOf(body, req.url)
    const upstream = https.request(
      { protocol: UPSTREAM.protocol, hostname: UPSTREAM.hostname, port: UPSTREAM.port || 443, path: req.url, method: req.method, headers, agent },
      (upRes) => {
        const tHeaders = performance.now()
        const outHeaders = {}
        for (const [key, value] of Object.entries(upRes.headers)) if (!HOP.has(key) && !key.startsWith('access-control-')) outHeaders[key] = value
        res.writeHead(upRes.statusCode ?? 502, { ...outHeaders, ...cors })
        let bytes = 0
        upRes.on('data', (chunk) => {
          bytes += chunk.length
          res.write(chunk)
        })
        upRes.on('end', () => {
          res.end()
          log.write(
            JSON.stringify({
              wallStart,
              source,
              kind: 'request',
              method: req.method,
              path: req.url,
              operation,
              reqBytes: body.length,
              status: upRes.statusCode,
              encoding: upRes.headers['content-encoding'] ?? null,
              respBytes: bytes,
              ttfbMs: +(tHeaders - t0).toFixed(1),
              durMs: +(performance.now() - t0).toFixed(1),
            }) + '\n',
          )
        })
      },
    )
    upstream.on('error', (error) => {
      if (!res.headersSent) res.writeHead(502, cors)
      res.end()
      log.write(JSON.stringify({ wallStart, source, kind: 'error', method: req.method, path: req.url, operation, error: error.message }) + '\n')
    })
    upstream.end(body)
  })
}

const tls = { key: fs.readFileSync(process.env.TLS_KEY), cert: fs.readFileSync(process.env.TLS_CERT), allowHTTP1: true }
http2.createSecureServer(tls, handler).listen(TLS_PORT, '127.0.0.1', () => console.log(`api-proxy https://127.0.0.1:${TLS_PORT} (h2) -> ${UPSTREAM.origin}`))
http.createServer(handler).listen(HTTP_PORT, '127.0.0.1', () => console.log(`api-proxy http://127.0.0.1:${HTTP_PORT} (SSR) -> ${UPSTREAM.origin}`))
