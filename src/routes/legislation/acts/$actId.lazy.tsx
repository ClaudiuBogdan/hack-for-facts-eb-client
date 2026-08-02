import { createLazyFileRoute } from '@tanstack/react-router'
import { LegalActPage } from '@/features/legal/components/legal-act-page'
import type { LegalActRouteLoaderData } from './$actId'

export const Route = createLazyFileRoute('/legislation/acts/$actId')({
  component: LegalActRoutePage,
})

function LegalActRoutePage() {
  const { actId } = Route.useParams()
  const loaderData = Route.useLoaderData() as
    | LegalActRouteLoaderData
    | undefined

  // `loaderData.act` is `null` for an act that does not exist — a real answer,
  // not a missing one. Only an absent loader result yields `undefined`.
  return (
    <LegalActPage
      actId={actId}
      initialAct={loaderData === undefined ? undefined : loaderData.act}
    />
  )
}
