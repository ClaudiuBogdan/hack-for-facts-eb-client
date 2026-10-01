import { createLazyFileRoute } from '@tanstack/react-router'

/** The explorer's old address: the redirect in `search.tsx` always runs first; this never renders. */
export const Route = createLazyFileRoute('/procurement/search')({
  component: () => null,
})
