#!/usr/bin/env node
// Timed page loads for the 2026-10-27 main-page audit. One invocation = one URL x one target x one
// profile: N cold loads (fresh browser context, empty cache), each followed by a repeat view in the
// same context, plus one extra traced cold load that is kept out of the medians.
//
// Always run it under the shared lock so timed runs never overlap:
//   flock /tmp/perf-audit-2026-10-27.lock node perf-run.mjs --url <url> --profile mobile --out <dir> [...]
//
// Options:
//   --url <url>            page to load (required)
//   --profile <p>          desktop | mobile (required)
//   --out <dir>            evidence folder for this url/target/profile (required)
//   --runs <n>             cold+warm pairs for the medians (default 3)
//   --no-trace             skip the extra traced cold load
//   --people               page shows people: no screenshots, no saved HTML, no LCP text, trace without screenshots
//   --proxy-log <file>     api-proxy.mjs log (local target): adds the server-side (SSR) API calls of each load
//   --api-host <host,...>  hosts counted as API (default dev-chronos-api.transparenta.eu,127.0.0.1:3014)
//
// Profiles: desktop = 1350x940 @1x, no throttling. mobile = 412x823 @1.75x, touch, Android UA,
// DevTools "Slow 4G" (562.5 ms latency, 1474.56 kbit/s down, 675 kbit/s up) and 4x CPU slowdown.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// Playwright comes from the client repo's node_modules (this file sits four levels below the repo root).
const require = createRequire(new URL('../../../../package.json', import.meta.url))
const { chromium } = require('playwright')

const args = parseArgs(process.argv.slice(2))
const URL_ = args.url
const PROFILE = args.profile
const OUT = args.out
const RUNS = Number(args.runs ?? 3)
const TRACE = !args['no-trace']
const PEOPLE = Boolean(args.people)
const PROXY_LOG = args['proxy-log'] ?? null
const API_HOSTS = (args['api-host'] ?? 'dev-chronos-api.transparenta.eu,127.0.0.1:3014').split(',')
if (!URL_ || !['desktop', 'mobile'].includes(PROFILE) || !OUT) {
  console.error('usage: perf-run.mjs --url <url> --profile desktop|mobile --out <dir> [--runs 3] [--no-trace] [--people] [--proxy-log f]')
  process.exit(2)
}
fs.mkdirSync(OUT, { recursive: true })

const PROFILES = {
  // A real desktop Chrome UA: headless Chrome's default UA contains "HeadlessChrome", which isbot() flags,
  // and TanStack's renderRouterToStream then holds the response until every Suspense query resolves.
  desktop: {
    context: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36' },
    network: null,
    cpu: 1,
    capMs: 45000,
  },
  mobile: {
    context: {
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36',
    },
    // DevTools "Slow 4G" as Lighthouse applies it: 150 ms RTT x 3.75, 1.6 Mbit/s x 0.9 down, 750 kbit/s x 0.9 up.
    network: { offline: false, latency: 562.5, downloadThroughput: (1474.56 * 1024) / 8, uploadThroughput: (675 * 1024) / 8, connectionType: 'cellular4g' },
    cpu: 4,
    capMs: 120000,
  },
}
const P = PROFILES[PROFILE]

// Runs in the page before any app script, on every navigation.
const INIT_SCRIPT = `(() => {
  const REDACT = ${PEOPLE};
  const S = window.__perf = { lcp: [], ls: [], lt: [], loaf: [], paints: {}, commits: [], hyd: { shell: null, end: null, pendingAtEnd: null }, errors: [] };
  const desc = (el) => {
    if (!el || !el.tagName) return null;
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = el.getAttribute && el.getAttribute('class');
    if (c) s += '.' + c.trim().split(/\\s+/).slice(0, 5).join('.');
    const testId = el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('aria-label'));
    if (testId && !REDACT) s += '[' + String(testId).slice(0, 40) + ']';
    return s.slice(0, 200);
  };
  const obs = (type, fn) => { try { new PerformanceObserver((l) => { for (const e of l.getEntries()) fn(e); }).observe({ type, buffered: true }); } catch (e) {} };
  obs('largest-contentful-paint', (e) => S.lcp.push({ t: e.startTime, renderTime: e.renderTime, loadTime: e.loadTime, size: e.size, url: e.url || null, el: desc(e.element), text: REDACT ? null : ((e.element && e.element.textContent) || '').trim().replace(/\\s+/g, ' ').slice(0, 60) }));
  obs('layout-shift', (e) => S.ls.push({ t: e.startTime, v: e.value, input: e.hadRecentInput, sources: (e.sources || []).slice(0, 3).map((s) => desc(s.node)) }));
  obs('longtask', (e) => S.lt.push({ t: e.startTime, d: e.duration }));
  obs('long-animation-frame', (e) => { if (e.duration >= 50) S.loaf.push({ t: e.startTime, d: e.duration, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, scripts: (e.scripts || []).slice(0, 6).map((s) => ({ src: s.sourceURL, fn: s.sourceFunctionName, invoker: s.invoker, type: s.invokerType, d: Math.round(s.duration), layout: Math.round(s.forcedStyleAndLayoutDuration || 0) })) }); });
  obs('paint', (e) => { S.paints[e.name] = e.startTime; });

  // Hydration probe through the React DevTools hook: React reports every commit here.
  // shell = first commit where the hydrated root is no longer dehydrated;
  // end = first idle check after a commit that finds no dehydrated Suspense/Activity boundary left.
  let idleQueued = false;
  const pendingBoundaries = (root) => {
    let node = root.current, n = 0, pending = 0;
    while (node && n < 200000) {
      n++;
      if ((node.tag === 13 || node.tag === 31) && node.memoizedState && node.memoizedState.dehydrated) pending++;
      if (node.child) { node = node.child; continue; }
      while (node && !node.sibling) { node = node.return; if (node === root.current) { node = null; } }
      if (node) node = node.sibling;
    }
    return pending;
  };
  let lastRoot = null, lastCommitT = null;
  const check = () => {
    idleQueued = false;
    if (!lastRoot || S.hyd.end != null) return;
    const state = lastRoot.current && lastRoot.current.memoizedState;
    if (state && state.isDehydrated) return;
    const pending = pendingBoundaries(lastRoot);
    S.hyd.pendingAtEnd = pending;
    if (pending === 0) S.hyd.end = lastCommitT;
  };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, isDisabled: false, renderers: new Map(),
    inject() { return 1; }, checkDCE() {}, onScheduleFiberRoot() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, setStrictMode() {},
    onCommitFiberRoot(id, root) {
      const t = performance.now();
      S.commits.push(Math.round(t));
      const state = root.current && root.current.memoizedState;
      if (S.hyd.shell == null && state && state.isDehydrated === false && root.current.alternate) S.hyd.shell = t;
      lastRoot = root; lastCommitT = t;
      if (!idleQueued && S.hyd.end == null) { idleQueued = true; (window.requestIdleCallback || setTimeout)(check, { timeout: 1000 }); }
    },
  };
  window.addEventListener('error', (e) => S.errors.push(String(e.message).slice(0, 300)));
  window.addEventListener('unhandledrejection', (e) => S.errors.push('unhandledrejection: ' + String(e.reason && (e.reason.message || e.reason)).slice(0, 300)));
  window.__perfCollect = () => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const resources = performance.getEntriesByType('resource').map((r) => ({ name: r.name, blocking: r.renderBlockingStatus, initiator: r.initiatorType, start: r.startTime, end: r.responseEnd, transfer: r.transferSize, decoded: r.decodedBodySize }));
    return {
      nav: { ttfb: nav.responseStart, responseEnd: nav.responseEnd, domInteractive: nav.domInteractive, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, transfer: nav.transferSize, encoded: nav.encodedBodySize, decoded: nav.decodedBodySize, protocol: nav.nextHopProtocol, serverTiming: (nav.serverTiming || []).map((s) => ({ name: s.name, dur: s.duration, desc: s.description })) },
      perf: S,
      blocking: resources.filter((r) => r.blocking === 'blocking').map((r) => r.name),
      domNodes: document.getElementsByTagName('*').length,
      title: REDACT ? null : document.title,
    };
  };
})();`

const median = (values) => {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}
const round = (x) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x) : x)

function categorize(rec) {
  const u = new URL(rec.url)
  if (API_HOSTS.includes(u.host) || /\/graphql\/?$/.test(u.pathname)) return rec.method === 'OPTIONS' || rec.type === 'Preflight' ? 'preflight' : 'api'
  switch (rec.type) {
    case 'Document': return 'document'
    case 'Script': return 'js'
    case 'Stylesheet': return 'css'
    case 'Font': return 'font'
    case 'Image': return 'image'
    case 'Fetch': case 'XHR': return 'fetch-other'
    case 'Preflight': return 'preflight'
    default: return (rec.type ?? 'other').toLowerCase()
  }
}

function operationOf(postData, url) {
  const pick = (p) => {
    if (!p || typeof p !== 'object') return null
    if (p.operationName) return p.operationName
    const m = typeof p.query === 'string' ? p.query.match(/\b(query|mutation|subscription)\s+([A-Za-z0-9_]+)/) : null
    return m ? m[2] : typeof p.query === 'string' ? '(anonymous)' : null
  }
  try {
    if (postData) {
      const parsed = JSON.parse(postData)
      return Array.isArray(parsed) ? parsed.map(pick).join('+') : pick(parsed)
    }
    const s = new URL(url).searchParams
    return s.get('operationName') ?? (s.get('query') ? pick({ query: s.get('query') }) : null)
  } catch {
    return null
  }
}

async function measureLoad(page, cdp, { label, saveHtml }) {
  const reqs = new Map()
  let docId = null
  let inflight = 0
  let lastActivity = Date.now()
  const consoleErrors = []
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)) }
  const onPageError = (err) => consoleErrors.push(`pageerror: ${String(err.message).slice(0, 300)}`)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  const handlers = {
    'Network.requestWillBeSent': (e) => {
      if (e.request.url.startsWith('data:') || e.request.url.startsWith('blob:')) return
      const prev = reqs.get(e.requestId)
      if (prev && e.redirectResponse) prev.redirects = (prev.redirects ?? 0) + 1
      if (!prev) inflight++
      lastActivity = Date.now()
      reqs.set(e.requestId, { ...(prev ?? {}), id: e.requestId, url: e.request.url, method: e.request.method, type: e.type, ts: prev?.ts ?? e.timestamp, wall: prev?.wall ?? e.wallTime, priority: e.request.initialPriority, postData: e.request.postData ?? null, hasPostData: e.request.hasPostData, initiator: e.initiator?.type, initiatorUrl: e.initiator?.stack?.callFrames?.[0]?.url ?? e.initiator?.url ?? null, decoded: 0 })
      if (e.type === 'Document' && !docId) docId = e.requestId
    },
    'Network.requestServedFromCache': (e) => { const r = reqs.get(e.requestId); if (r) r.cache = 'memory/disk' },
    'Network.responseReceived': (e) => {
      const r = reqs.get(e.requestId)
      if (!r) return
      r.type = e.type ?? r.type
      r.status = e.response.status
      r.mime = e.response.mimeType
      r.protocol = e.response.protocol
      r.tsHeaders = e.timestamp
      r.fromCache = e.response.fromDiskCache || e.response.fromPrefetchCache || e.response.fromServiceWorker ? (e.response.fromServiceWorker ? 'sw' : 'disk') : r.cache ?? null
      const h = Object.fromEntries(Object.entries(e.response.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
      r.headers = { 'content-encoding': h['content-encoding'], 'cache-control': h['cache-control'], 'content-type': h['content-type'], 'server-timing': h['server-timing'], age: h.age, 'cf-cache-status': h['cf-cache-status'], 'x-cache': h['x-cache'], server: h.server, vary: h.vary, 'access-control-max-age': h['access-control-max-age'] }
      r.timing = e.response.timing ? { dns: e.response.timing.dnsEnd - e.response.timing.dnsStart, connect: e.response.timing.connectEnd - e.response.timing.connectStart, ssl: e.response.timing.sslEnd - e.response.timing.sslStart, send: e.response.timing.sendStart, wait: e.response.timing.receiveHeadersEnd - e.response.timing.sendEnd } : null
    },
    'Network.dataReceived': (e) => { const r = reqs.get(e.requestId); if (r) r.decoded += e.dataLength; lastActivity = Date.now() },
    'Network.loadingFinished': (e) => { const r = reqs.get(e.requestId); if (r && r.tsEnd == null) { r.tsEnd = e.timestamp; r.encoded = e.encodedDataLength; inflight-- } lastActivity = Date.now() },
    'Network.loadingFailed': (e) => { const r = reqs.get(e.requestId); if (r && r.tsEnd == null) { r.tsEnd = e.timestamp; r.failed = e.errorText; r.canceled = e.canceled; inflight-- } lastActivity = Date.now() },
  }
  for (const [ev, fn] of Object.entries(handlers)) cdp.on(ev, fn)

  const navStartWall = Date.now()
  let navError = null
  try {
    await page.goto(URL_, { waitUntil: 'load', timeout: P.capMs })
  } catch (err) {
    navError = String(err.message).split('\n')[0]
  }
  const loadAt = Date.now()
  // Quiet = nothing in flight for 2 s, at least 3 s after load, capped per profile.
  while (Date.now() - navStartWall < P.capMs) {
    const quietFor = Date.now() - lastActivity
    if (inflight <= 0 && quietFor >= 2000 && Date.now() - loadAt >= 3000) break
    await new Promise((r) => setTimeout(r, 250))
  }
  const hitCap = Date.now() - navStartWall >= P.capMs
  // Give a pending hydration idle check a chance to run.
  await page.evaluate(() => new Promise((r) => (window.requestIdleCallback ?? setTimeout)(() => r(), { timeout: 1500 }))).catch(() => {})
  const collected = await page.evaluate(() => window.__perfCollect()).catch((err) => ({ error: String(err.message) }))
  for (const [ev, fn] of Object.entries(handlers)) cdp.off(ev, fn)
  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const doc = docId ? reqs.get(docId) : null
  const base = doc?.ts ?? Math.min(...[...reqs.values()].map((r) => r.ts))
  const rel = (ts) => (ts == null ? null : Math.round((ts - base) * 1000))
  let html = null
  if (doc && saveHtml) {
    try { html = (await cdp.send('Network.getResponseBody', { requestId: docId })).body } catch { html = null }
  }
  const all = []
  for (const r of reqs.values()) {
    if (r.hasPostData && !r.postData) {
      try { r.postData = (await cdp.send('Network.getRequestPostData', { requestId: r.id })).postData } catch { /* gone */ }
    }
    const cat = categorize(r)
    all.push({
      cat,
      url: r.url,
      method: r.method,
      status: r.status ?? null,
      failed: r.failed ?? null,
      priority: r.priority,
      protocol: r.protocol,
      start: rel(r.ts),
      ttfb: r.tsHeaders != null ? Math.round((r.tsHeaders - r.ts) * 1000) : null,
      end: rel(r.tsEnd),
      dur: r.tsEnd != null ? Math.round((r.tsEnd - r.ts) * 1000) : null,
      encoded: r.encoded ?? 0,
      decoded: r.decoded ?? 0,
      fromCache: r.fromCache ?? null,
      headers: r.headers ?? null,
      timing: r.timing ?? null,
      initiator: r.initiator,
      initiatorUrl: r.initiatorUrl,
      operation: cat === 'api' ? operationOf(r.postData, r.url) : undefined,
      reqBytes: cat === 'api' && r.postData ? Buffer.byteLength(r.postData) : undefined,
    })
  }
  all.sort((a, b) => (a.start ?? 0) - (b.start ?? 0))

  const byCat = {}
  for (const r of all) {
    const c = (byCat[r.cat] ??= { count: 0, encoded: 0, decoded: 0, cached: 0 })
    c.count++
    c.encoded += r.encoded
    c.decoded += r.decoded
    if (r.fromCache) c.cached++
  }

  // API calls and chains: B "follows" A when B starts within 150 ms after A finishes.
  const api = all.filter((r) => r.cat === 'api')
  const preflights = all.filter((r) => r.cat === 'preflight')
  for (const call of api) {
    const pf = preflights.find((p) => p.url === call.url && p.start != null && call.start != null && p.start <= call.start + 5 && p.end != null && p.end >= call.start - 5)
    if (pf) call.preflightMs = pf.dur
    const after = api.filter((a) => a !== call && a.end != null && call.start != null && call.start >= a.end - 5 && call.start - a.end <= 150)
    if (after.length) call.follows = after.map((a) => a.operation ?? a.url)
  }

  // Server-side (SSR) API calls, from the local proxy log, in the document's time window.
  let ssrCalls = null
  if (PROXY_LOG && doc?.wall) {
    const docStartWall = doc.wall * 1000
    const docEndWall = docStartWall + (doc.tsEnd - doc.ts) * 1000
    try {
      ssrCalls = fs
        .readFileSync(PROXY_LOG, 'utf8')
        .trim()
        .split('\n')
        .map((l) => { try { return JSON.parse(l) } catch { return null } })
        .filter((l) => l && l.source === 'server' && l.wallStart >= docStartWall - 50 && l.wallStart <= docEndWall + 50)
        .map((l) => ({ operation: l.operation, method: l.method, path: l.path, start: Math.round(l.wallStart - docStartWall), ttfb: l.ttfbMs, dur: l.durMs, end: Math.round(l.wallStart - docStartWall + l.durMs), respBytes: l.respBytes, encoding: l.encoding, status: l.status }))
    } catch (err) {
      ssrCalls = [{ error: String(err.message) }]
    }
  }

  const perf = collected.perf ?? {}
  const fcp = perf.paints?.['first-contentful-paint'] ?? null
  const lcpEntry = perf.lcp?.at(-1) ?? null
  // CLS: largest session window (gap < 1 s, window < 5 s), excluding shifts after input.
  let cls = 0
  let win = 0
  let winStart = -Infinity
  let prev = -Infinity
  for (const s of perf.ls ?? []) {
    if (s.input) continue
    if (s.t - prev < 1000 && s.t - winStart < 5000) win += s.v
    else { win = s.v; winStart = s.t }
    prev = s.t
    cls = Math.max(cls, win)
  }
  const longTasks = perf.lt ?? []
  const tbt = fcp == null ? null : longTasks.filter((t) => t.t >= fcp).reduce((sum, t) => sum + Math.max(0, t.d - 50), 0)
  const scripts = all.filter((r) => r.cat === 'js')

  return {
    label,
    url: URL_,
    profile: PROFILE,
    navError,
    hitCap,
    metrics: {
      ttfb: round(collected.nav?.ttfb),
      docResponseEnd: round(collected.nav?.responseEnd),
      fcp: round(fcp),
      lcp: round(lcpEntry?.t),
      cls: Math.round(cls * 1000) / 1000,
      tbt: round(tbt),
      longTasks: longTasks.length,
      longestTask: round(Math.max(0, ...longTasks.map((t) => t.d))),
      domInteractive: round(collected.nav?.domInteractive),
      dcl: round(collected.nav?.dcl),
      load: round(collected.nav?.load),
      hydrationShell: round(perf.hyd?.shell),
      hydrationEnd: round(perf.hyd?.end),
      dehydratedBoundariesLeft: perf.hyd?.pendingAtEnd ?? null,
      reactCommits: perf.commits?.length ?? 0,
      lastReactCommit: perf.commits?.at(-1) ?? null,
      requests: all.length,
      transferBytes: all.reduce((s, r) => s + r.encoded, 0),
      jsTransferBytes: byCat.js?.encoded ?? 0,
      jsDecodedBytes: byCat.js?.decoded ?? 0,
      jsChunks: scripts.length,
      apiCalls: api.length,
      apiTransferBytes: byCat.api?.encoded ?? 0,
      preflights: preflights.length,
      docTransferBytes: doc?.encoded ?? null,
      docDecodedBytes: doc?.decoded ?? null,
      domNodes: collected.domNodes,
    },
    lcpEntry,
    lcpCandidates: perf.lcp ?? [],
    layoutShifts: (perf.ls ?? []).filter((s) => s.v >= 0.001),
    longTaskList: longTasks.map((t) => ({ t: round(t.t), d: round(t.d) })),
    longAnimationFrames: perf.loaf ?? [],
    reactCommitTimes: perf.commits ?? [],
    document: doc ? { status: doc.status, protocol: doc.protocol, headers: doc.headers, timing: doc.timing, ttfb: doc.tsHeaders != null ? Math.round((doc.tsHeaders - doc.ts) * 1000) : null, end: rel(doc.tsEnd), encoded: doc.encoded, decoded: doc.decoded } : null,
    serverTiming: collected.nav?.serverTiming ?? [],
    renderBlocking: collected.blocking ?? [],
    byType: byCat,
    apiCalls: api.map(({ cat, ...r }) => r),
    ssrApiCalls: ssrCalls,
    scripts: scripts.map((s) => ({ url: s.url, start: s.start, end: s.end, encoded: s.encoded, decoded: s.decoded, priority: s.priority, fromCache: s.fromCache, initiator: s.initiator })),
    requests: all,
    consoleErrors: [...consoleErrors, ...(perf.errors ?? [])],
    title: collected.title,
    html,
  }
}

async function setupPage(context) {
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  if (P.network) await cdp.send('Network.emulateNetworkConditions', P.network)
  if (P.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.cpu })
  return { page, cdp }
}

// The local target's self-signed certificate is trusted by its SPKI hash (PERF_SPKI), not ignored:
// Chrome does not cache responses from a page with a certificate error, which would break repeat views.
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.PERF_SPKI ? [`--ignore-certificate-errors-spki-list=${process.env.PERF_SPKI}`] : [] })
const version = browser.version()
const results = []
try {
  for (let i = 1; i <= RUNS + (TRACE ? 1 : 0); i++) {
    const traced = TRACE && i === RUNS + 1
    const tag = traced ? 'trace' : `run${i}`
    const context = await browser.newContext({ ...P.context, ...(i === 1 ? { recordHar: { path: path.join(OUT, `${tag}.har`), content: 'omit' } } : {}) })
    await context.addInitScript(INIT_SCRIPT)
    const { page, cdp } = await setupPage(context)
    if (traced) await browser.startTracing(page, { path: path.join(OUT, 'trace-cold.trace.json'), screenshots: !PEOPLE })
    const cold = await measureLoad(page, cdp, { label: `${tag}-cold`, saveHtml: i === 1 && !PEOPLE })
    if (traced) await browser.stopTracing()
    if (i === 1 && !PEOPLE) await page.screenshot({ path: path.join(OUT, `${tag}-cold.png`) }).catch(() => {})
    let warm = null
    if (!traced) {
      await page.goto('about:blank')
      warm = await measureLoad(page, cdp, { label: `${tag}-warm`, saveHtml: false })
    }
    await context.close()
    for (const r of [cold, warm].filter(Boolean)) {
      if (r.html) fs.writeFileSync(path.join(OUT, 'ssr.html'), r.html)
      delete r.html
      fs.writeFileSync(path.join(OUT, `${r.label}.json`), JSON.stringify(r, null, 2))
      if (!traced) results.push(r)
      const m = r.metrics
      console.log(`${r.label}: ttfb ${m.ttfb} fcp ${m.fcp} lcp ${m.lcp} cls ${m.cls} tbt ${m.tbt} hydShell ${m.hydrationShell} hydEnd ${m.hydrationEnd} req ${m.requests} js ${Math.round(m.jsTransferBytes / 1024)}KB api ${m.apiCalls}${r.navError ? ' NAV-ERROR ' + r.navError : ''}${r.hitCap ? ' HIT-CAP' : ''}`)
    }
  }
} finally {
  await browser.close()
}

const keys = ['ttfb', 'docResponseEnd', 'fcp', 'lcp', 'cls', 'tbt', 'longTasks', 'longestTask', 'dcl', 'load', 'hydrationShell', 'hydrationEnd', 'reactCommits', 'requests', 'transferBytes', 'jsTransferBytes', 'jsDecodedBytes', 'jsChunks', 'apiCalls', 'apiTransferBytes', 'preflights', 'docTransferBytes', 'docDecodedBytes', 'domNodes']
const summary = { url: URL_, profile: PROFILE, chrome: version, runs: RUNS, at: new Date().toISOString(), cold: {}, warm: {} }
for (const view of ['cold', 'warm']) {
  const rs = results.filter((r) => r.label.endsWith(view))
  for (const k of keys) summary[view][k] = median(rs.map((r) => r.metrics[k]))
  summary[view].lcpElements = [...new Set(rs.map((r) => r.lcpEntry?.el).filter(Boolean))]
  summary[view].navErrors = rs.map((r) => r.navError).filter(Boolean)
  summary[view].hitCap = rs.filter((r) => r.hitCap).length
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
const kb = (b) => (b == null ? '' : `${Math.round(b / 1024)} KB`)
const lines = [`# ${URL_} — ${PROFILE} (${RUNS} runs, medians, Chrome ${version})`, '', '| metric | cold | warm |', '|---|---|---|']
for (const k of keys) {
  const fmt = /Bytes$/.test(k) ? kb : (x) => (x == null ? '' : String(x))
  lines.push(`| ${k} | ${fmt(summary.cold[k])} | ${fmt(summary.warm[k])} |`)
}
lines.push('', `LCP element (cold): ${summary.cold.lcpElements.join(' / ') || 'n/a'}`, `LCP element (warm): ${summary.warm.lcpElements.join(' / ') || 'n/a'}`)
fs.writeFileSync(path.join(OUT, 'summary.md'), lines.join('\n') + '\n')
console.log(lines.join('\n'))

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else { out[key] = next; i++ }
  }
  return out
}
