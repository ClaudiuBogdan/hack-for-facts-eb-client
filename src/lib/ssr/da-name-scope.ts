import { AsyncLocalStorage } from 'node:async_hooks'
import { installDaSupplierNameSink } from '@/lib/da-supplier-name-mark'

/**
 * Root ruling 2026-11-22 under 22a47bb2: a server render that names a
 * direct-purchase supplier is kept by no cache. The API's keys no longer cover
 * names (a name can be withdrawn without any key moving), so a CDN copy would
 * keep a name past the response that carried it.
 *
 * Each request runs in its own scope. A loader that names a DA supplier marks
 * it (`markDaSupplierNamed`); when the handler's response is ready, a marked
 * request's caching headers are replaced with `no-store`, whatever its route
 * asked for. Pages that name no DA supplier keep their own headers.
 *
 * The response is ready once every loader has run: names are decided in the
 * loaders' reads, and the render only shows what they decided. Only the server
 * entry may import this module.
 */
type Scope = { named: boolean; sealed: boolean }

const scope = new AsyncLocalStorage<Scope>()

let installed = false

function install(): void {
  if (installed) return
  installed = true
  installDaSupplierNameSink(() => {
    const current = scope.getStore()
    if (!current) return
    // Names are decided in loaders, before the response is built. One decided later (a deferred render) is too late for
    // the headers: said loudly, so the path is moved into a loader.
    if (current.sealed) process.stderr.write('da-name-scope: a DA supplier was named after the response was built; its headers could not be made no-store\n')
    current.named = true
  })
}

/** The caching headers a shared cache or the browser could keep a response under. */
const CACHING_HEADERS = ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control', 'Surrogate-Control', 'Expires', 'ETag', 'Last-Modified'] as const

/** The response as no cache keeps it; immutable headers are copied. */
export function asNoStore(response: Response): Response {
  const apply = (headers: Headers) => {
    for (const name of CACHING_HEADERS) headers.delete(name)
    headers.set('Cache-Control', 'no-store')
    headers.set('CDN-Cache-Control', 'no-store')
  }
  try {
    apply(response.headers)
    return response
  } catch {
    const copy = new Response(response.body, response)
    apply(copy.headers)
    return copy
  }
}

/** Runs the request's handler in its own scope; a response whose render named a DA supplier goes out `no-store`. */
export async function withDaNameScope(handle: () => Response | Promise<Response>): Promise<Response> {
  install()
  const state: Scope = { named: false, sealed: false }
  const response = await scope.run(state, handle)
  state.sealed = true
  return state.named ? asNoStore(response) : response
}
