/**
 * Notes that a direct-purchase supplier is being named, so a server render
 * that names one is never kept by a shared cache.
 *
 * DA supplier names come from the live registry and can be withdrawn without
 * any publication key moving (API 22a47bb2): no key the client holds covers
 * them. Root ruling 2026-11-22 under 22a47bb2: a server render that carries a
 * DA supplier name goes out `no-store` (`src/lib/ssr/da-name-scope.ts`).
 *
 * Every decision to name a DA supplier goes through the D6 predicates
 * (`withheld-party.ts`, `supplierNameOf`), which call `markDaSupplierNamed`.
 * Only the server entry installs a sink, for the request in flight; in the
 * browser, and outside a request, the mark does nothing.
 */
let sink: (() => void) | null = null

export function markDaSupplierNamed(): void {
  sink?.()
}

/** The server entry's hook; `null` removes it (tests). */
export function installDaSupplierNameSink(next: (() => void) | null): void {
  sink = next
}
