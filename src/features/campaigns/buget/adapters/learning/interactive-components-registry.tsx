import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import type { CampaignInteractiveElementProps } from '../../components/interactive/types'

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

const CampaignBudgetStatusReport = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/BudgetStatusReport').then((module) => ({
    default: module.BudgetStatusReport,
  })),
)

const CampaignDebateRequestForm = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/DebateRequestForm').then((module) => ({
    default: module.DebateRequestForm,
  })),
)

const CampaignParticipationReport = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/ParticipationReport').then((module) => ({
    default: module.ParticipationReport,
  })),
)

const CampaignContestationBuilder = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/ContestationBuilder').then((module) => ({
    default: module.ContestationBuilder,
  })),
)

const CampaignBudgetPublicationDate = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/BudgetPublicationDate').then((module) => ({
    default: module.BudgetPublicationDate,
  })),
)

const CampaignPrimarieWebsiteLink = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/PrimarieWebsiteLink').then((module) => ({
    default: module.PrimarieWebsiteLink,
  })),
)

const CampaignBudgetDocumentLink = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/BudgetDocumentLink').then((module) => ({
    default: module.BudgetDocumentLink,
  })),
)

const CampaignPrimarieContactInfo = createLazyInteractiveComponent<CampaignInteractiveElementProps>(() =>
  import('../../components/interactive/PrimarieContactInfo').then((module) => ({
    default: module.PrimarieContactInfo,
  })),
)

export const campaignInteractiveComponents = {
  Sources: CampaignSources,
  QuickLinks: CampaignQuickLinks,
  BudgetStatusReport: CampaignBudgetStatusReport,
  DebateRequestForm: CampaignDebateRequestForm,
  ParticipationReport: CampaignParticipationReport,
  ContestationBuilder: CampaignContestationBuilder,
  BudgetPublicationDate: CampaignBudgetPublicationDate,
  PrimarieWebsiteLink: CampaignPrimarieWebsiteLink,
  BudgetDocumentLink: CampaignBudgetDocumentLink,
  PrimarieContactInfo: CampaignPrimarieContactInfo,
}
