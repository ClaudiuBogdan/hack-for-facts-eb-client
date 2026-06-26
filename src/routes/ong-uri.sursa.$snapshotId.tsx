import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchSnapshotProvenance } from '@/features/ngos/api/ngo-api'
import {
  parseNgoSnapshotSearch,
  type SnapshotProvenance,
} from '@/schemas/ngos'

export type NgoSnapshotRouteLoaderData = {
  readonly provenance: SnapshotProvenance
}

export const Route = createFileRoute('/ong-uri/sursa/$snapshotId')({
  validateSearch: parseNgoSnapshotSearch,
  loader: async ({ params }) => {
    const provenance = await fetchSnapshotProvenance(params.snapshotId)
    if (!provenance) throw notFound()

    return { provenance } satisfies NgoSnapshotRouteLoaderData
  },
  head: ({ loaderData }) => {
    const data = loaderData as NgoSnapshotRouteLoaderData | undefined
    const label = data?.provenance.authorityLabel ?? 'Sursa ONG'

    return {
      meta: [
        {
          title: `${label} | Provenienta ONG | Transparenta.eu`,
        },
      ],
    }
  },
})
