import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/public-enterprises/authorities` has no page of its own (yet): the hub's
 * band of who controls the enterprises leads to each authority's. Without
 * this route the address would read as an enterprise with the CUI
 * „authorities". Temporary, so a list page can take the address later.
 */
export const Route = createFileRoute('/public-enterprises/authorities/')({
  beforeLoad: () => {
    // The address's own search (`?lang=`) goes along.
    throw redirect({ to: '/public-enterprises', search: true, hash: 'control', statusCode: 302 })
  },
})
