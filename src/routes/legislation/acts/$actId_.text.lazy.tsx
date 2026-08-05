import { createLazyFileRoute } from '@tanstack/react-router'
import { LegalReaderPage } from '@/features/legal/components/reader/legal-reader-page'
import type { LegalReaderRouteLoaderData } from './$actId_.text'

export const Route = createLazyFileRoute('/legislation/acts/$actId_/text')({
  component: LegalReaderRoutePage,
})

function LegalReaderRoutePage() {
  const { actId } = Route.useParams()
  const { doc } = Route.useSearch()
  const loaderData = Route.useLoaderData() as LegalReaderRouteLoaderData | undefined

  // `loaderData.act === null` is a real answer ("no such act"), not a missing
  // one; only an absent loader result yields `undefined`.
  return (
    <LegalReaderPage
      actId={actId}
      initialAct={loaderData === undefined ? undefined : loaderData.act}
      {...(doc !== undefined && { docOverride: doc })}
    />
  )
}
