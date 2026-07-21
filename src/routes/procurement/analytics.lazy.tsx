import { createLazyFileRoute } from '@tanstack/react-router'

/**
 * Legacy analytics route body — redirect in `analytics.tsx` beforeLoad always
 * runs first; this component should never render.
 */
export const Route = createLazyFileRoute('/procurement/analytics')({
  component: () => null,
})
