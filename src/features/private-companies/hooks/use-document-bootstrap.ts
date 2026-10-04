import { useState, useSyncExternalStore } from 'react'

const subscribe = () => () => undefined

/**
 * The server's own answer for the document being hydrated, or undefined.
 *
 * A company page renders its facts on the server, and the browser must
 * hydrate the same markup before its first registry read can answer. That
 * answer — read directly by the route loader for this very request (the
 * server's query client is never seeded with it) — is the only one a page may
 * show without a pin, and only while its first registry read is pending
 * (`CompanyRegistryScope.firstRead`).
 *
 * The provenance is the render itself: `value` is captured only by an
 * instance created while React renders on the server or hydrates that render
 * (`useSyncExternalStore` answers its server snapshot exactly then), and the
 * value an instance is hydrated with is the one the server rendered into the
 * document. An instance mounted by a client-side navigation, a remount, or
 * any later render captures nothing, so a profile kept by the router or the
 * query cache from an earlier visit can never pass for the document's own.
 */
export function useDocumentBootstrap<T>(value: T | undefined): T | undefined {
  const hydrating = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  )
  const [bootstrap] = useState(() => (hydrating ? value : undefined))
  return bootstrap
}
