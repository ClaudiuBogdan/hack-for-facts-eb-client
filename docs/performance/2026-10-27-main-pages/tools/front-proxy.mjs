#!/usr/bin/env node
// Gives the local production build the network shape of dev-chronos's CDN: HTTPS with HTTP/2
// (Chrome only speaks h2 over TLS) and zstd compression, which Cloudflare applies to the deployed
// HTML and assets. Nitro alone serves uncompressed files over HTTP/1.1, which on a throttled
// profile would measure the lab, not the app.
//
// https://127.0.0.1:3013 (h2, self-signed; the harness ignores certificate errors) -> http://127.0.0.1:3015 (Nitro).
// Compressible responses are zstd level 3 (assets compressed once and kept in memory, HTML
// streamed and flushed chunk by chunk, so SSR streaming is preserved).
// Env: TLS_KEY, TLS_CERT (required); PORT (3013), UPSTREAM_PORT (3015).
import fs from 'node:fs'
import http from 'node:http'
import http2 from 'node:http2'
import zlib from 'node:zlib'

const PORT = Number(process.env.PORT ?? 3013)
const UPSTREAM_PORT = Number(process.env.UPSTREAM_PORT ?? 3015)
const agent = new http.Agent({ keepAlive: true, maxSockets: 256 })
const HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'http2-settings', 'te', 'host'])
const COMPRESSIBLE = /text\/html|javascript|css|json|svg|xml|text\/plain|wasm/
const ZSTD = { params: { [zlib.constants.ZSTD_c_compressionLevel]: 3 } }
const assetCache = new Map()

const wantsZstd = (req) => /\bzstd\b/.test(req.headers['accept-encoding'] ?? '')

function handler(req, res) {
  const path = req.url
  const zstd = wantsZstd(req)
  const cacheKey = `${zstd ? 'zstd' : 'identity'} ${path}`
  if (req.method === 'GET' && path.startsWith('/assets/') && assetCache.has(cacheKey)) {
    const cached = assetCache.get(cacheKey)
    res.writeHead(200, cached.headers)
    res.end(cached.body)
    return
  }
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) if (!key.startsWith(':') && !HOP.has(key)) headers[key] = value
  headers.host = `127.0.0.1:${PORT}`
  headers['x-forwarded-proto'] = 'https'
  headers['x-forwarded-host'] = `127.0.0.1:${PORT}`
  delete headers['accept-encoding']
  const upstream = http.request({ host: '127.0.0.1', port: UPSTREAM_PORT, path, method: req.method, headers, agent }, (upRes) => {
    const out = {}
    for (const [key, value] of Object.entries(upRes.headers)) if (!HOP.has(key)) out[key] = value
    const compress = zstd && !upRes.headers['content-encoding'] && COMPRESSIBLE.test(upRes.headers['content-type'] ?? '') && ![204, 304].includes(upRes.statusCode) && req.method !== 'HEAD'
    if (!compress) {
      res.writeHead(upRes.statusCode ?? 502, out)
      upRes.pipe(res)
      return
    }
    delete out['content-length']
    out['content-encoding'] = 'zstd'
    out.vary = out.vary ? `${out.vary}, Accept-Encoding` : 'Accept-Encoding'
    if (path.startsWith('/assets/') && upRes.statusCode === 200 && req.method === 'GET') {
      const chunks = []
      upRes.on('data', (chunk) => chunks.push(chunk))
      upRes.on('end', () => {
        const body = zlib.zstdCompressSync(Buffer.concat(chunks), ZSTD)
        out['content-length'] = String(body.length)
        assetCache.set(cacheKey, { headers: out, body })
        res.writeHead(200, out)
        res.end(body)
      })
      return
    }
    res.writeHead(upRes.statusCode ?? 502, out)
    const z = zlib.createZstdCompress(ZSTD)
    z.pipe(res)
    upRes.on('data', (chunk) => {
      z.write(chunk)
      z.flush()
    })
    upRes.on('end', () => z.end())
  })
  upstream.on('error', (error) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
    res.end(`front-proxy: ${error.message}`)
  })
  req.pipe(upstream)
}

const tls = { key: fs.readFileSync(process.env.TLS_KEY), cert: fs.readFileSync(process.env.TLS_CERT), allowHTTP1: true }
http2.createSecureServer(tls, handler).listen(PORT, '127.0.0.1', () => console.log(`front-proxy https://127.0.0.1:${PORT} (h2, zstd) -> http://127.0.0.1:${UPSTREAM_PORT}`))
