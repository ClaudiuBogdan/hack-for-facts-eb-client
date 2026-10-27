#!/usr/bin/env node
// Start the local production build the way the chronos-dev pod runs it.
//   node start-local.mjs <build-dir>     (run it inside tmux; it stays in the foreground)
//
// The runtime config is copied from the deployed page's public window.__APP_RUNTIME_CONFIG__
// (the same public values the pod injects), with three local overrides:
//   VITE_API_URL      https://127.0.0.1:3014  browser API calls go through api-proxy.mjs (CORS, h2)
//   INTERNAL_API_URL  http://127.0.0.1:3016   server-side calls go through the same proxy, which logs them
//   VITE_SITE_URL     https://127.0.0.1:3013  the page is served by front-proxy.mjs (h2 + zstd)
// Nitro itself listens on 127.0.0.1:3015.
// Nothing is printed except the key names.
import { spawn } from 'node:child_process'
import path from 'node:path'

const buildArg = process.argv[2]
if (!buildArg) {
  console.error('usage: start-local.mjs <build-dir>')
  process.exit(2)
}
// Resolve once: the child runs with cwd = the build dir, so a relative path must not be applied twice.
const buildDir = path.resolve(buildArg)
const html = await (await fetch('https://dev-chronos.transparenta.eu/')).text()
const match = html.match(/window\.__APP_RUNTIME_CONFIG__ = (\{.*?\});/)
if (!match) throw new Error('runtime config not found on the deployed page')
const deployed = JSON.parse(match[1])
const env = {
  ...process.env,
  ...deployed,
  NODE_ENV: 'production',
  VITE_API_URL: 'https://127.0.0.1:3014',
  INTERNAL_API_URL: 'http://127.0.0.1:3016',
  VITE_SITE_URL: 'https://127.0.0.1:3013',
  NITRO_HOST: '127.0.0.1',
  NITRO_PORT: '3015',
}
console.log(`runtime keys: ${Object.keys(deployed).join(', ')} (+ INTERNAL_API_URL, NITRO_HOST, NITRO_PORT)`)
const child = spawn(process.execPath, [path.join(buildDir, '.output/server/index.mjs')], { cwd: buildDir, env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
