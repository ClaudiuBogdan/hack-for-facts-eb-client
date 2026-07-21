import { createLazyFileRoute } from '@tanstack/react-router'

/**
 * Legacy search route body — redirect in `search.tsx` beforeLoad always runs
 * first; this component should never render.
 */
export const Route = createLazyFileRoute('/procurement/search')({
  component: () => null,
})
