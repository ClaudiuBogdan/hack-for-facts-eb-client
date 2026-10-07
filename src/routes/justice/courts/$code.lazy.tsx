import { createLazyFileRoute } from '@tanstack/react-router'
import { JusticeCourtPage } from '@/features/justice/components/court/justice-court-page'

export const Route = createLazyFileRoute('/justice/courts/$code')({
  component: CourtRoutePage,
})

function CourtRoutePage() {
  // The sheet is absent on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  return <JusticeCourtPage code={data.code} year={data.year} initialData={data} />
}
