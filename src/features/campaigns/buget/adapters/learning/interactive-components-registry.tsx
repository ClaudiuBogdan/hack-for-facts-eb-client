import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'

type LazyWrapperProps = Record<string, unknown>

type SourcesProps = {
  readonly children: ReactNode
}

type QuickLinkItem = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly url: string
  readonly icon: 'ministry' | 'parliament' | 'audit' | 'data' | 'transparency'
}

type QuickLinksProps = {
  readonly links: readonly QuickLinkItem[]
}

function createLazyInteractiveComponent<Props = LazyWrapperProps>(
  loader: () => Promise<{ default: ComponentType<any> }>,
): ComponentType<Props> {
  const LazyComponent = lazy(loader)

  return function LazyInteractiveComponent(props: Props) {
    const fallback = (
      <LoadingSpinner size="sm" text="Se încarcă elementul interactiv..." className="my-6" />
    )

    return (
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as LazyWrapperProps)} />
        </Suspense>
      </ClientOnly>
    )
  }
}

const CampaignSources = createLazyInteractiveComponent<SourcesProps>(() =>
  import('@/features/learning/components/interactive/Sources').then((module) => ({
    default: module.Sources,
  })),
)

const CampaignQuickLinks = createLazyInteractiveComponent<QuickLinksProps>(() =>
  import('@/features/learning/components/interactive/QuickLinks').then((module) => ({
    default: module.QuickLinks,
  })),
)

export const campaignInteractiveComponents = {
  Sources: CampaignSources,
  QuickLinks: CampaignQuickLinks,
}
