import { createLazyFileRoute } from '@tanstack/react-router'

/** The category page's old address: the redirect in `$code.tsx` always runs first; this never renders. */
export const Route = createLazyFileRoute('/procurement/categories/$code')({
  component: () => null,
})
