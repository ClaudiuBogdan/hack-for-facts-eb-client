import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NgoSnapshotPage } from '@/features/ngos/components/ngo-snapshot-page'
import type { NgoSnapshotRouteLoaderData } from './ong-uri.sursa.$snapshotId'

export const Route = createLazyFileRoute('/ong-uri/sursa/$snapshotId')({
  component: NgoSnapshotRoutePage,
  notFoundComponent: NgoSnapshotNotFound,
})

function NgoSnapshotRoutePage() {
  const { from } = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | NgoSnapshotRouteLoaderData
    | undefined

  if (!loaderData?.provenance) {
    return <NgoSnapshotNotFound />
  }

  return <NgoSnapshotPage provenance={loaderData.provenance} fromLabel={from} />
}

function NgoSnapshotNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-8">
      <Card className="w-full rounded-lg border-dashed shadow-none">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            <Trans>Sursa ONG negăsită</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Nu am găsit instantaneul de proveniență cerut pentru această sursă
              ONG.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/ong-uri" search={{}}>
              <Trans>Înapoi la ONG-uri</Trans>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
