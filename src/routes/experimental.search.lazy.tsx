import { createLazyFileRoute } from '@tanstack/react-router'
import { EntitySearchPage } from '@/features/entity-search/components/entity-search-page'

export const Route = createLazyFileRoute('/experimental/search')({
  component: EntitySearchPage,
})
