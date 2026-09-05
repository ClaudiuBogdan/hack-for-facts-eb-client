import { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import type { CompareViewProps, HarnessModule } from './-development.types'

/**
 * `v` and `layout` are reserved; every other search param belongs to the
 * prototype and is read with `useSearch({ strict: false })`.
 *
 * The router JSON-parses each search value (`src/router.tsx`), so `v=true`
 * arrives as a boolean. Coercing to string turns it into the unknown variant key
 * `"true"` — which the harness reports — instead of a validation error page.
 * Both fields must stay `.optional()`: a `.catch()` default would make the param
 * required on every `<Link>` to this route.
 */
const searchSchema = z
  .object({
    v: z.coerce.string().optional().catch(undefined),
    layout: z.enum(['side', 'stack']).optional().catch(undefined),
  })
  .passthrough()

const harness = import.meta.env.DEV
  ? import.meta.glob<HarnessModule>('/src/development/harness/entry.tsx')
  : {}
const loadHarness = Object.values(harness)[0]

// `lazy()` infers its component type from the first branch, so the fallback must
// carry the real prop type.
const Empty: ComponentType<CompareViewProps> = () => null
const CompareView = lazy<ComponentType<CompareViewProps>>(async () => {
  if (!loadHarness) return { default: Empty }
  const module = await loadHarness()
  return { default: module.CompareView }
})

export const Route = createFileRoute('/development/$')({
  validateSearch: searchSchema,
  component: DevelopmentPrototypeRoute,
})

function DevelopmentPrototypeRoute() {
  const { _splat } = Route.useParams()
  const { v, layout } = Route.useSearch()

  return (
    <Suspense fallback={null}>
      <CompareView id={_splat ?? ''} v={v} layout={layout ?? 'side'} />
    </Suspense>
  )
}
