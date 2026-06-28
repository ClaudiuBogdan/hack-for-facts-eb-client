import { createLazyFileRoute } from '@tanstack/react-router'
import { CpvCategoryPage } from '@/features/procurement/components/cpv-category-page'

export const Route = createLazyFileRoute('/procurement/categories/$code')({
  component: CpvCategoryRoutePage,
})

function CpvCategoryRoutePage() {
  const { code } = Route.useParams()
  const { page } = Route.useLoaderData()
  return <CpvCategoryPage code={code} initialPage={page} />
}
