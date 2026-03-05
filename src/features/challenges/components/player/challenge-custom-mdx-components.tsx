import { lazy, Suspense } from 'react'
import type { MDXComponents } from 'mdx/types'

const UatPicker = lazy(() =>
  import('../interactive/UatPicker').then((m) => ({ default: m.UatPicker })),
)

// Extension point for challenge-only interactive MDX components.
// Accepts stepId so interactive components can mark the step complete.
export function buildChallengeCustomMdxComponents(stepId: string): MDXComponents {
  return {
    UatPicker: () => (
      <Suspense
        fallback={
          <div className="my-6 h-16 animate-pulse rounded-xl bg-muted/50" />
        }
      >
        <UatPicker contentId={stepId} />
      </Suspense>
    ),
  }
}
