import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer, request as httpRequest, ServerResponse, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  crawlGuardOf,
  DISALLOW_ALL_ROBOTS_TXT,
  guardedFetch,
  loggablePathOf,
  noindexNodeResponses,
  uaLogLineOf,
  type FetchHandler,
} from './crawl-guard'

/** sha256 of `public/robots.txt` as served before this change (origin/dev 51f921f1). */
const PUBLIC_ROBOTS_SHA256 =
  '9528fc1d43529f751d66e7bea96c38d8dbd9ea3cecd75bcae8cff98ee528d99a'

const OFF = crawlGuardOf({})
const NOINDEX_ONLY = crawlGuardOf({ ROBOTS_DISALLOW_ALL: 'true' })
const ON = crawlGuardOf({ ROBOTS_DISALLOW_ALL: 'true', REQUEST_UA_LOG: 'true' })

const app: FetchHandler = (request) =>
  new Response(`app ${new URL(request.url).pathname}`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })

const request = (path: string, init?: RequestInit) =>
  new Request(`https://dev-chronos.transparenta.eu${path}`, init)

describe('crawlGuardOf', () => {
  it('is off unless a switch is exactly "true"', () => {
    expect(OFF).toEqual({ disallowAll: false, uaLog: false })
    for (const value of ['1', 'TRUE', 'yes', ' true', '']) {
      expect(
        crawlGuardOf({ ROBOTS_DISALLOW_ALL: value, REQUEST_UA_LOG: value }),
      ).toEqual({ disallowAll: false, uaLog: false })
    }
    expect(ON).toEqual({ disallowAll: true, uaLog: true })
  })
})

describe('switch off (production)', () => {
  it('leaves the public robots.txt as it was, byte for byte', () => {
    const file = readFileSync(resolve(__dirname, '../../../public/robots.txt'))
    expect(createHash('sha256').update(file).digest('hex')).toBe(PUBLIC_ROBOTS_SHA256)
  })

  it('returns the app handler itself, untouched', () => {
    const log = vi.fn()
    expect(guardedFetch(OFF, app, log)).toBe(app)
    expect(log).not.toHaveBeenCalled()
  })
})

describe('switch on', () => {
  it('answers robots.txt with disallow-all and no sitemap, before the app', async () => {
    const handler = vi.fn(app)
    const response = await guardedFetch(NOINDEX_ONLY, handler, vi.fn())(request('/robots.txt?x=1'))
    const body = await response.text()
    expect(body).toBe('User-agent: *\nDisallow: /\n')
    expect(body).toBe(DISALLOW_ALL_ROBOTS_TXT)
    expect(body.toLowerCase()).not.toContain('sitemap')
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(handler).not.toHaveBeenCalled()
  })

  it('answers the aliases Nitro would resolve to the public file too', async () => {
    const handler = vi.fn(app)
    for (const path of ['/robots.txt/', '/robots.txt//', '/%72obots.txt', '/robots%2Etxt']) {
      const response = await guardedFetch(NOINDEX_ONLY, handler, vi.fn())(request(path))
      expect(await response.text()).toBe(DISALLOW_ALL_ROBOTS_TXT)
    }
    expect(handler).not.toHaveBeenCalled()
  })

  it('answers and logs a rejection that escaped the app, tagged, and reports it', async () => {
    const log = vi.fn()
    const onError = vi.fn()
    const failing: FetchHandler = () => Promise.reject(new Error('boom'))
    const response = await guardedFetch(ON, failing, log, undefined, onError)(request('/x'))
    expect(response.status).toBe(500)
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }))
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({ path: '/x', status: 500 })
  })

  it('answers HEAD with the headers and no body', async () => {
    const response = await guardedFetch(NOINDEX_ONLY, app, vi.fn())(request('/robots.txt', { method: 'HEAD' }))
    expect(await response.text()).toBe('')
    expect(response.headers.get('content-length')).toBe(String(DISALLOW_ALL_ROBOTS_TXT.length))
  })

  it('leaves other methods on robots.txt to the app, with the header', async () => {
    const response = await guardedFetch(NOINDEX_ONLY, app, vi.fn())(request('/robots.txt', { method: 'POST' }))
    expect(await response.text()).toBe('app /robots.txt')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('adds the header to every app response, immutable ones included', async () => {
    const immutable: FetchHandler = () => Response.redirect('https://dev-chronos.transparenta.eu/', 301)
    const page = await guardedFetch(NOINDEX_ONLY, app, vi.fn())(request('/achizitii'))
    expect(page.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(await page.text()).toBe('app /achizitii')
    const redirect = await guardedFetch(NOINDEX_ONLY, immutable, vi.fn())(request('/x'))
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe('https://dev-chronos.transparenta.eu/')
    expect(redirect.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('logs one line per response only when the log switch is on', async () => {
    const quiet = vi.fn()
    await guardedFetch(NOINDEX_ONLY, app, quiet)(request('/a'))
    expect(quiet).not.toHaveBeenCalled()

    const log = vi.fn()
    let tick = 0
    await guardedFetch(ON, app, log, () => (tick += 5))(
      request('/achizitii?q=secret', { headers: { 'user-agent': 'ExampleBot/1.0', cookie: 'session=abc' } }),
    )
    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
      msg: 'request', method: 'GET', path: '/achizitii', status: 200, ms: 5, ua: 'ExampleBot/1.0',
    })
  })

  it('logs without the header when only the log switch is on', async () => {
    const response = await guardedFetch(crawlGuardOf({ REQUEST_UA_LOG: 'true' }), app, vi.fn())(request('/robots.txt'))
    expect(await response.text()).toBe('app /robots.txt')
    expect(response.headers.has('x-robots-tag')).toBe(false)
  })
})

describe('loggablePathOf', () => {
  it('redacts what a path authorises or names privately', () => {
    expect(loggablePathOf('/unsubscribe/eyJhbGciOiJIUzI1NiJ9.abc123')).toBe('/unsubscribe/:redacted')
    expect(loggablePathOf('/UNSUBSCRIBE/abc')).toBe('/unsubscribe/:redacted')
    expect(loggablePathOf('/share/Ab3dE')).toBe('/share/:redacted')
    expect(loggablePathOf('/x/9f8e7d6c5b4a39281706f5e4d3c2b1a0/y')).toBe('/x/:redacted/y')
    // As the router reads it: an encoded alias of a secret route, and a hyphenated token.
    expect(loggablePathOf('/%75nsubscribe/abc-def')).toBe('/unsubscribe/:redacted')
    expect(loggablePathOf('/%2Fshare/abc')).toBe('/share/:redacted')
    expect(loggablePathOf('/x/0b9c7a1e-3f2d-4c5b-8a69-7d1e2f3a4b5c')).toBe('/x/:redacted')
  })

  it('keeps ids and slugs, which name what was crawled', () => {
    for (const path of ['/achizitii/contracte/10120196', '/entities/4267117', '/primaria-municipiului-bucuresti', '/achizitii/directe/DA123456789']) {
      expect(loggablePathOf(path)).toBe(path)
    }
  })
})

describe('noindexNodeResponses', () => {
  const serve = async (handle: (res: ServerResponse) => void) => {
    const server = createServer((_req, res) => handle(res))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    return { server, port: (server.address() as AddressInfo).port }
  }
  const get = (port: number, headers: Record<string, string> = {}) =>
    new Promise<{ status: number; headers: IncomingHttpHeaders; raw: string[] }>((resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port, path: '/', headers }, (res) => {
        res.resume()
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, raw: res.rawHeaders }))
      })
      req.on('error', reject)
      req.end()
    })
  const tags = (raw: string[]) => raw.filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'x-robots-tag').length

  it('tags every response Node writes, its own and the adapter\'s, once', async () => {
    const uninstall = noindexNodeResponses(ServerResponse.prototype as never)
    try {
      const cases: ((res: ServerResponse) => void)[] = [
        (res) => { res.statusCode = 500; res.end() },
        (res) => { res.writeHead(200, 'OK', ['Content-Type', 'text/plain']); res.end('x') },
        (res) => { res.writeHead(200, [['Content-Type', 'text/plain']] as never); res.end('x') },
        (res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('x') },
        (res) => { res.writeHead(200, ['X-Robots-Tag', 'noindex, nofollow']); res.end('x') },
        // Frozen headers, which the wrapper must not write into.
        (res) => { res.writeHead(200, Object.freeze({ 'Content-Type': 'text/plain' })); res.end('x') },
        (res) => { res.writeHead(200, 'OK', Object.freeze(['Content-Type', 'text/plain']) as never); res.end('x') },
      ]
      for (const handle of cases) {
        const { server, port } = await serve(handle)
        const answer = await get(port)
        server.close()
        expect(answer.headers['x-robots-tag']).toBe('noindex, nofollow')
        expect(tags(answer.raw)).toBe(1)
      }
      // Node's own answer to an Expect it cannot meet.
      const { server, port } = await serve((res) => res.end('x'))
      const expectation = await get(port, { Expect: 'something-else' })
      server.close()
      expect(expectation.status).toBe(417)
      expect(expectation.headers['x-robots-tag']).toBe('noindex, nofollow')
    } finally {
      uninstall()
    }
    const { server, port } = await serve((res) => res.end('x'))
    const after = await get(port)
    server.close()
    expect(after.headers['x-robots-tag']).toBeUndefined()
  })
})

describe('uaLogLineOf', () => {
  it('logs the path without the query, and nothing about the caller but the UA', () => {
    const line = uaLogLineOf({
      method: 'GET',
      url: 'https://dev-chronos.transparenta.eu/achizitii/contracte/1?q=secret&token=abc',
      status: 200,
      durationMs: 12.6,
      userAgent: 'ExampleBot/1.0',
    })
    expect(JSON.parse(line)).toEqual({
      msg: 'request', method: 'GET', path: '/achizitii/contracte/1', status: 200, ms: 13, ua: 'ExampleBot/1.0',
    })
    expect(line).not.toContain('secret')
    expect(line).not.toContain('token')
  })

  it('logs an empty UA when none was sent', () => {
    const line = uaLogLineOf({ method: 'HEAD', url: '/robots.txt', status: 200, durationMs: 0, userAgent: null })
    expect(JSON.parse(line)).toMatchObject({ path: '/robots.txt', ua: '' })
  })
})
