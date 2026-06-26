import { createFileRoute } from '@tanstack/react-router'
import { fetchNgoDomainCoverage } from '@/features/ngos/api/ngo-api'
import { parseNgoLandingSearch, type DomainCoverage } from '@/schemas/ngos'

export type NgoLandingRouteLoaderData = {
  readonly coverage: DomainCoverage | null
}

export const Route = createFileRoute('/ong-uri/')({
  validateSearch: parseNgoLandingSearch,
  loader: async () => {
    const coverage = await fetchNgoDomainCoverage()
    return { coverage } satisfies NgoLandingRouteLoaderData
  },
  head: () => ({
    meta: [
      {
        title: 'ONG-uri si servicii sociale | Transparenta.eu',
      },
      {
        name: 'description',
        content:
          'Explorare mock-first pentru ONG-uri, servicii sociale, surse oficiale si dovezi de provenienta.',
      },
    ],
  }),
})
