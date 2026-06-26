import { createFileRoute } from '@tanstack/react-router'
import { fetchNgoServiceDiscovery } from '@/features/ngos/api/ngo-api'
import {
  parseNgoServicesSearch,
  type ServiceDiscoveryResult,
} from '@/schemas/ngos'

export type NgoServicesRouteLoaderData = {
  readonly result: ServiceDiscoveryResult | null
}

export const Route = createFileRoute('/ong-uri/servicii')({
  validateSearch: parseNgoServicesSearch,
  loader: async () => {
    const result = await fetchNgoServiceDiscovery()
    return { result } satisfies NgoServicesRouteLoaderData
  },
  head: () => ({
    meta: [
      {
        title: 'Servicii sociale ONG | Transparenta.eu',
      },
      {
        name: 'description',
        content:
          'Descoperire mock-first pentru furnizori ONG si servicii sociale licentiate.',
      },
    ],
  }),
})
