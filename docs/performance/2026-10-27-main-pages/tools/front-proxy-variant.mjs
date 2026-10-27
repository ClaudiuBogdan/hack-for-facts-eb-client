#!/usr/bin/env node
// What-if variant of front-proxy.mjs for the lead's re-measurement: the same h2 + zstd front for the local
// Nitro server, plus a rewrite of the HTML <head>, so a proposed fix can be timed without changing app code.
//
// https://127.0.0.1:3017 (h2, self-signed) -> http://127.0.0.1:3015 (the same Nitro as :3013).
// Env: TLS_KEY, TLS_CERT (required); PORT (3017), UPSTREAM_PORT (3015);
//      EXTRA_PRELOADS  JSON file { "<pathname>": ["/assets/x.js", ...] }: adds <link rel="modulepreload"> for
//                      those chunks right after the head's existing modulepreloads (same priority as theirs).
//      STRIP_PRELOADS  "1": drops every head modulepreload except the entry's (FCP bound with no competing JS).
// Everything else (asset cache, zstd level 3, streaming after the head) is as in front-proxy.mjs.
import fs from 'node:fs'
import http from 'node:http'
import http2 from 'node:http2'
import zlib from 'node:zlib'

const PORT = Number(process.env.PORT ?? 3017)
const UPSTREAM_PORT = Number(process.env.UPSTREAM_PORT ?? 3015)
const EXTRA = process.env.EXTRA_PRELOADS ? JSON.parse(fs.readFileSync(process.env.EXTRA_PRELOADS, 'utf8')) : {}
const STRIP = process.env.STRIP_PRELOADS === '1'
const agent = new http.Agent({ keepAlive: true, maxSockets: 256 })
const HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'http2-settings', 'te', 'host'])
const COMPRESSIBLE = /text\/html|javascript|css|json|svg|xml|text\/plain|wasm/
const ZSTD = { params: { [zlib.constants.ZSTD_c_compressionLevel]: 3 } }
const assetCache = new Map()

const wantsZstd = (req) => /\bzstd\b/.test(req.headers['accept-encoding'] ?? '')

function rewriteHead(head, pathname) {
  const links = [...head.matchAll(/<link rel="modulepreload" href="([^"]+)"\/>/g)]
  if (links.length === 0) return head
  const entry = head.match(/<script type="module" async="" src="([^"]+)"/)?.[1] ?? links[0][1]
  let out = head
  if (STRIP) out = out.replace(/<link rel="modulepreload" href="([^"]+)"\/>/g, (tag, href) => (href === entry ? tag : ''))
  const extra = (EXTRA[pathname] ?? []).filter((href) => !links.some((l) => l[1] === href))
  if (extra.length) {
    const last = out.lastIndexOf('rel="modulepreload"')
    const at = out.indexOf('/>', last) + 2
    out = out.slice(0, at) + extra.map((href) => `<link rel="modulepreload" href="${href}"/>`).join('') + out.slice(at)
  }
  return out
}

function handler(req, res) {
  const path = req.url
  const pathname = new URL(path, 'https://x').pathname
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
    const isHtml = /text\/html/.test(upRes.headers['content-type'] ?? '') && !upRes.headers['content-encoding']
    const compress = zstd && !upRes.headers['content-encoding'] && COMPRESSIBLE.test(upRes.headers['content-type'] ?? '') && ![204, 304].includes(upRes.statusCode) && req.method !== 'HEAD'
    if (isHtml) delete out['content-length']
    if (!compress && !isHtml) {
      res.writeHead(upRes.statusCode ?? 502, out)
      upRes.pipe(res)
      return
    }
    if (compress) {
      delete out['content-length']
      out['content-encoding'] = 'zstd'
      out.vary = out.vary ? `${out.vary}, Accept-Encoding` : 'Accept-Encoding'
    }
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
    let sink = res
    let z = null
    if (compress) {
      z = zlib.createZstdCompress(ZSTD)
      z.pipe(res)
      sink = z
    }
    const write = (buf) => {
      sink.write(buf)
      z?.flush()
    }
    // Buffer raw bytes until the head is complete and decode them once, so a multi-byte UTF-8 character split
    // across two chunks is not corrupted; everything after the head passes through untouched.
    let pending = isHtml ? [] : null
    const HEAD_END = Buffer.from('</head>')
    upRes.on('data', (chunk) => {
      if (pending === null) return write(chunk)
      pending.push(chunk)
      const bytes = Buffer.concat(pending)
      const end = bytes.indexOf(HEAD_END)
      if (end === -1) return
      write(Buffer.concat([Buffer.from(rewriteHead(bytes.subarray(0, end).toString('utf8'), pathname)), bytes.subarray(end)]))
      pending = null
    })
    upRes.on('end', () => {
      if (pending) write(Buffer.concat(pending))
      sink.end()
    })
  })
  upstream.on('error', (error) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
    res.end(`front-proxy-variant: ${error.message}`)
  })
  req.pipe(upstream)
}

const tls = { key: fs.readFileSync(process.env.TLS_KEY), cert: fs.readFileSync(process.env.TLS_CERT), allowHTTP1: true }
http2
  .createSecureServer(tls, handler)
  .listen(PORT, '127.0.0.1', () => console.log(`front-proxy-variant https://127.0.0.1:${PORT} -> :${UPSTREAM_PORT} (extra preloads for ${Object.keys(EXTRA).length} paths${STRIP ? ', strip' : ''})`))
