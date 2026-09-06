import { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import type { HarnessModule } from './-development.types'

// Guarded so production builds fold this to `{}` and emit no reference to the
// harness. `Object.values(...)[0]` keeps the module path out of the stub.
const harness = import.meta.env.DEV
  ? import.meta.glob<HarnessModule>('/src/development/harness/entry.tsx')
  : {}
const loadHarness = Object.values(harness)[0]

const Empty: ComponentType = () => null
const IndexView = lazy<ComponentType>(async () => {
  if (!loadHarness) return { default: Empty }
  const module = await loadHarness()
  return { default: module.IndexView }
})

export const Route = createFileRoute('/development/')({
  component: DevelopmentIndexRoute,
})

function DevelopmentIndexRoute() {
  return (
    <Suspense fallback={null}>
      <IndexView />
    </Suspense>
  )
}
