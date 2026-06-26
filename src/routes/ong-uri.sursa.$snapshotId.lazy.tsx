import { createLazyFileRoute } from '@tanstack/react-router'
import { NgoSnapshotPage } from '@/features/ngos/components/ngo-snapshot-page'
import type { NgoSnapshotRouteLoaderData } from './ong-uri.sursa.$snapshotId'

export const Route = createLazyFileRoute('/ong-uri/sursa/$snapshotId')({
  component: NgoSnapshotRoutePage,
})

function NgoSnapshotRoutePage() {
  const { from } = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | NgoSnapshotRouteLoaderData
    | undefined

  if (!loaderData?.provenance) {
    return null
  }

  return <NgoSnapshotPage provenance={loaderData.provenance} fromLabel={from} />
}
