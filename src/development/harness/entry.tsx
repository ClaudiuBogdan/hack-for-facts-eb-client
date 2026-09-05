import { use } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link, notFound } from '@tanstack/react-router'
import { ErrorBoundary } from '@sentry/react'

import { cn } from '@/lib/utils'
import type { CompareLayout, CompareViewProps } from '@/routes/-development.types'

/**
 * The `/development/*` harness. Local only — see `docs/design/prototyping.md`.
 *
 * Nothing outside `src/development/` may import this module by path. The route
 * stubs reach it through a DEV-guarded `import.meta.glob`, which production
 * builds fold away, and `.dockerignore` keeps the whole directory out of images.
 */

/** Literal, never assembled: `yarn build:validate` greps `.output/` for it. */
export const HARNESS_MARKER = 'TRANSPARENTA_DEV_SURFACE_HARNESS_MUST_NOT_SHIP'

export type PrototypeVariant = {
  readonly title: string
  readonly component: ComponentType
  readonly note?: string
}

export type PrototypeDefinition = {
  readonly title: string
  /** Path to the design doc this prototype is deciding, shown in the header. */
  readonly spec?: string
  readonly variants: Readonly<Record<string, PrototypeVariant>>
  /** Variants shown when no `?v=` is given. Defaults to every variant. */
  readonly compare?: readonly string[]
}

type PrototypeModule = { readonly prototype: PrototypeDefinition }

const RESERVED_KEYS = new Set(['true', 'false', 'null'])
const VARIANT_KEY = /^[a-z][a-z0-9-]*$/

const isValidVariantKey = (key: string) =>
  VARIANT_KEY.test(key) && !RESERVED_KEYS.has(key)

const modules = import.meta.glob<PrototypeModule>(
  '/src/development/prototypes/**/*.prototype.tsx',
)

const idOf = (path: string) =>
  path.replace('/src/development/prototypes/', '').replace('.prototype.tsx', '')

const byId = new Map(Object.entries(modules).map(([path, load]) => [idOf(path), load]))

// Module-level cache so `use()` gets a stable promise across renders. Effects
// never run on the server, so a `useEffect` loader would leave every prototype
// blank in the SSR HTML.
const cache = new Map<string, Promise<PrototypeDefinition>>()

function loadPrototype(id: string): Promise<PrototypeDefinition> {
  const cached = cache.get(id)
  if (cached) return cached
  const load = byId.get(id)
  if (!load) throw notFound()
  const promise = load().then((module) => module.prototype)
  cache.set(id, promise)
  return promise
}

let indexPromise: Promise<ReadonlyArray<IndexEntry>> | undefined

type IndexEntry = {
  readonly id: string
  readonly title: string
  readonly variantKeys: readonly string[]
  readonly error?: string
}

function loadIndex(): Promise<ReadonlyArray<IndexEntry>> {
  if (indexPromise) return indexPromise
  const ids = [...byId.keys()].sort()
  indexPromise = Promise.allSettled(ids.map((id) => loadPrototype(id))).then((results) =>
    results.map((result, index) => {
      const id = ids[index]
      if (result.status === 'rejected') {
        return {
          id,
          title: id,
          variantKeys: [],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        }
      }
      return {
        id,
        title: result.value.title,
        variantKeys: Object.keys(result.value.variants),
      }
    }),
  )
  return indexPromise
}

/** Resolve `?v=` against a prototype. Returns the panes plus anything dropped. */
function selectVariants(prototype: PrototypeDefinition, v: string | undefined) {
  const declared = Object.keys(prototype.variants)
  const fallback = prototype.compare?.filter((key) => key in prototype.variants) ?? declared
  const requested = (v ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0)

  if (requested.length === 0) {
    return { keys: fallback.length > 0 ? fallback : declared, unknown: [] as string[] }
  }

  const seen = new Set<string>()
  const keys: string[] = []
  const unknown: string[] = []
  for (const key of requested) {
    if (seen.has(key)) continue
    seen.add(key)
    if (key in prototype.variants) keys.push(key)
    else unknown.push(key)
  }

  if (keys.length === 0) {
    return { keys: fallback.length > 0 ? fallback : declared, unknown }
  }
  return { keys, unknown }
}

export function IndexView() {
  const entries = use(loadIndex())
  const byDomain = new Map<string, IndexEntry[]>()
  for (const entry of entries) {
    const domain = entry.id.includes('/') ? entry.id.slice(0, entry.id.indexOf('/')) : 'root'
    const list = byDomain.get(domain) ?? []
    list.push(entry)
    byDomain.set(domain, list)
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6" data-dev-marker={HARNESS_MARKER}>
      <h1 className="text-2xl font-semibold tracking-tight">Prototypes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Local only. {entries.length} on disk. See{' '}
        <code className="text-xs">docs/design/prototyping.md</code>.
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          None yet. Copy{' '}
          <code className="text-xs">src/development/prototypes/_example/hello.prototype.tsx</code>.
        </p>
      ) : (
        [...byDomain.entries()].map(([domain, list]) => (
          <section key={domain} className="mt-8">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {domain}
            </h2>
            <ul className="mt-2 divide-y border-t">
              {list.map((entry) => (
                <li key={entry.id} className="py-3">
                  {entry.error ? (
                    <div>
                      <span className="text-sm font-medium text-destructive">{entry.id}</span>
                      <pre className="mt-1 overflow-x-auto text-xs text-destructive">
                        {entry.error}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        to="/development/$"
                        params={{ _splat: entry.id }}
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {entry.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {entry.id} · {entry.variantKeys.join(', ')}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

export function CompareView({ id, v, layout }: CompareViewProps) {
  const prototype = use(loadPrototype(id))
  const { keys, unknown } = selectVariants(prototype, v)
  const invalidKeys = Object.keys(prototype.variants).filter((key) => !isValidVariantKey(key))

  if (invalidKeys.length > 0) {
    return (
      <Notice tone="error">
        Invalid variant {invalidKeys.length === 1 ? 'key' : 'keys'}:{' '}
        <code className="text-xs">{invalidKeys.join(', ')}</code>. Keys must match{' '}
        <code className="text-xs">^[a-z][a-z0-9-]*$</code> and must not be{' '}
        <code className="text-xs">true</code>, <code className="text-xs">false</code> or{' '}
        <code className="text-xs">null</code>.
      </Notice>
    )
  }

  return (
    <div className="flex min-h-screen flex-col" data-dev-marker={HARNESS_MARKER}>
      <header className="border-b bg-background/95 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link to="/development" className="text-xs text-muted-foreground hover:underline">
            ← prototypes
          </Link>
          <h1 className="text-sm font-semibold">{prototype.title}</h1>
          <span className="text-xs text-muted-foreground">{id}</span>
          {prototype.spec ? (
            <code className="text-xs text-muted-foreground">{prototype.spec}</code>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {Object.entries(prototype.variants).map(([key, variant]) => (
            <Chip
              key={key}
              to={id}
              search={{ v: key, layout }}
              active={keys.length === 1 && keys[0] === key}
              title={variant.note}
            >
              {variant.title}
            </Chip>
          ))}
          <Chip to={id} search={{ v: undefined, layout }} active={keys.length > 1}>
            compare all
          </Chip>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <Chip to={id} search={{ v, layout: layout === 'stack' ? undefined : 'stack' }}>
            {layout === 'stack' ? 'side by side' : 'stacked'}
          </Chip>
        </div>

        {unknown.length > 0 ? (
          <p className="mt-2 text-xs text-destructive">
            Unknown variant {unknown.length === 1 ? 'key' : 'keys'} dropped:{' '}
            <code>{unknown.join(', ')}</code>
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          'flex flex-1',
          layout === 'stack' ? 'flex-col divide-y' : 'flex-col divide-y lg:flex-row lg:divide-x lg:divide-y-0',
        )}
      >
        {keys.map((key) => {
          const variant = prototype.variants[key]
          const Component = variant.component
          return (
            <section key={key} className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 border-b bg-muted/40 px-3 py-1.5">
                <span className="text-xs font-medium">{variant.title}</span>
                <code className="text-xs text-muted-foreground">?v={key}</code>
                {variant.note ? (
                  <span className="truncate text-xs text-muted-foreground">{variant.note}</span>
                ) : null}
              </div>
              <ErrorBoundary
                fallback={({ error }) => (
                  <Notice tone="error">
                    <pre className="overflow-x-auto text-xs">{String(error)}</pre>
                  </Notice>
                )}
              >
                <Component />
              </ErrorBoundary>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Chip({
  to,
  search,
  active,
  title,
  children,
}: {
  readonly to: string
  readonly search: { v?: string; layout?: CompareLayout }
  readonly active?: boolean
  readonly title?: string
  readonly children: ReactNode
}) {
  return (
    <Link
      to="/development/$"
      params={{ _splat: to }}
      search={search}
      title={title}
      className={cn(
        'rounded border px-2 py-0.5 text-xs transition-colors',
        active ? 'bg-foreground text-background' : 'hover:bg-muted',
      )}
    >
      {children}
    </Link>
  )
}

function Notice({ tone, children }: { readonly tone: 'error'; readonly children: ReactNode }) {
  return (
    <div
      className={cn('m-4 rounded border p-3 text-sm', tone === 'error' && 'border-destructive/40')}
    >
      {children}
    </div>
  )
}
