import { createLazyFileRoute } from '@tanstack/react-router'
import { JusticeCasePage } from '@/features/justice/components/case/justice-case-page'

export const Route = createLazyFileRoute('/justice/cases/$code/$')({
  component: CaseRoutePage,
})

function CaseRoutePage() {
  // The sheet is absent on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  return <JusticeCasePage code={data.code} number={data.number} initialData={data} />
}
