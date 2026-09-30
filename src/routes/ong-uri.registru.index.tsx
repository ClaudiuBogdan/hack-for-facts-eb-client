import { createFileRoute, redirect } from '@tanstack/react-router'
import { parseRegistrySearch } from '@/features/ngos/registry/api'

/**
 * The registry at its first release's Romanian path: one 301 to
 * `/ngos/registry`, the search already in the registry's own shape so the
 * target has nothing left to rewrite (and the site's own keys, `lang`, kept).
 */
export const Route = createFileRoute('/ong-uri/registru/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/ngos/registry',
      search: { ...search, ...parseRegistrySearch(search) },
      replace: true,
      statusCode: 301,
    })
  },
})
