import {
  lazy,
  Suspense,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ReactNode,
} from 'react'
import { t } from '@lingui/core/macro'
import type { MDXComponents } from 'mdx/types'
import type { QuizOption } from '@/features/learning/components/assessment/Quiz'
import type { CampaignInteractiveElementProps } from '@/features/campaigns/buget/components/interactive/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'

export type ChallengeQuizMdxProps = {
  readonly id: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly explanation: string
  readonly scopePolicy?: 'global' | 'entity'
}

export type ChallengeMarkCompleteMdxProps = {
  readonly label?: string
}

type BuildChallengeMdxComponentsParams = {
  readonly entityCui: string
  readonly QuizComponent: ComponentType<ChallengeQuizMdxProps>
  readonly MarkCompleteComponent: ComponentType<ChallengeMarkCompleteMdxProps>
  readonly campaignInteractiveAccess?: {
    readonly isAccessGranted: boolean
    readonly replacement: ReactNode
  }
  readonly customComponents?: MDXComponents
}

type ChallengeMdxAnchorProps = ComponentPropsWithoutRef<'a'>

function isExternalChallengeHref(href: string | undefined): boolean {
  if (!href) {
    return false
  }

  return href.startsWith('http://') || href.startsWith('https://')
}

function buildExternalLinkRel(rel: string | undefined): string {
  const relTokens = new Set((rel ?? '').split(/\s+/).filter(Boolean))

  relTokens.add('noopener')
  relTokens.add('noreferrer')

  return Array.from(relTokens).join(' ')
}

function ChallengeMdxAnchor({
  href,
  rel,
  target,
  ...props
}: ChallengeMdxAnchorProps) {
  if (!isExternalChallengeHref(href)) {
    return <a {...props} href={href} rel={rel} target={target} />
  }

  return (
    <a
      {...props}
      href={href}
      rel={buildExternalLinkRel(rel)}
      target="_blank"
    />
  )
}

function createLazyComponent<Props = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<any> }>,
) {
  const LazyComponent = lazy(loader)

  return function LazyWrapper(props: Props) {
    const fallback = (
      <LoadingSpinner
        size="sm"
        text={t`Loading interactive content...`}
        className="my-6"
      />
    )

    return (
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as Record<string, unknown>)} />
        </Suspense>
      </ClientOnly>
    )
  }
}

const FlashCard = createLazyComponent(() =>
  import('@/features/learning/components/interactive/FlashCardDeck').then((module) => ({
    default: module.FlashCard,
  })),
)

const FlashCardDeck = createLazyComponent(() =>
  import('@/features/learning/components/interactive/FlashCardDeck').then((module) => ({
    default: module.FlashCardDeck,
  })),
)

const ExpandableHint = createLazyComponent(() =>
  import('@/features/learning/components/interactive/ExpandableHint').then((module) => ({
    default: module.ExpandableHint,
  })),
)

const Sources = createLazyComponent(() =>
  import('@/features/learning/components/interactive/Sources').then((module) => ({
    default: module.Sources,
  })),
)

const QuickLinks = createLazyComponent(() =>
  import('@/features/learning/components/interactive/QuickLinks').then((module) => ({
    default: module.QuickLinks,
  })),
)

const BudgetCodeAnchors = createLazyComponent(() =>
  import('@/features/challenges/components/interactive/BudgetCodeAnchors').then((module) => ({
    default: module.BudgetCodeAnchors,
  })),
)

const BudgetCodeAnatomy = createLazyComponent(() =>
  import('@/features/challenges/components/interactive/BudgetCodeAnatomy').then((module) => ({
    default: module.BudgetCodeAnatomy,
  })),
)

const BudgetChapterHierarchy = createLazyComponent(() =>
  import('@/features/challenges/components/interactive/BudgetChapterHierarchy').then((module) => ({
    default: module.BudgetChapterHierarchy,
  })),
)

const BudgetStatusReport = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/BudgetStatusReport').then((module) => ({
    default: module.BudgetStatusReport,
  })),
)

const DebateRequestForm = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/DebateRequestForm').then((module) => ({
    default: module.DebateRequestForm,
  })),
)

const ParticipationReport = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/ParticipationReport').then((module) => ({
    default: module.ParticipationReport,
  })),
)

const ContestationBuilder = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/ContestationBuilder').then((module) => ({
    default: module.ContestationBuilder,
  })),
)

const BudgetPublicationDate = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/BudgetPublicationDate').then((module) => ({
    default: module.BudgetPublicationDate,
  })),
)

const PrimarieWebsiteLink = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/PrimarieWebsiteLink').then((module) => ({
    default: module.PrimarieWebsiteLink,
  })),
)

const BudgetDocumentLink = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/BudgetDocumentLink').then((module) => ({
    default: module.BudgetDocumentLink,
  })),
)

const PrimarieContactInfo = createLazyComponent<CampaignInteractiveElementProps>(() =>
  import('@/features/campaigns/buget/components/interactive/PrimarieContactInfo').then((module) => ({
    default: module.PrimarieContactInfo,
  })),
)

const CivicModuleShareCta = createLazyComponent<{ readonly entityCui: string, readonly moduleSlug?: string }>(() =>
  import('@/features/challenges/components/interactive/CivicModuleShareCta').then((module) => ({
    default: module.CivicModuleShareCta,
  })),
)

function withRouteEntityCui<TProps extends { readonly entityCui: string }>(
  Component: ComponentType<TProps>,
  entityCui: string,
  campaignInteractiveAccess?: BuildChallengeMdxComponentsParams['campaignInteractiveAccess'],
): ComponentType<Omit<TProps, 'entityCui'>> {
  return function RouteScopedChallengeComponent(props: Omit<TProps, 'entityCui'>) {
    if (campaignInteractiveAccess && !campaignInteractiveAccess.isAccessGranted) {
      return <>{campaignInteractiveAccess.replacement}</>
    }

    return <Component {...(props as TProps)} entityCui={entityCui} />
  }
}

export function buildChallengeMdxComponents(
  params: BuildChallengeMdxComponentsParams,
): MDXComponents {
  return {
    Quiz: params.QuizComponent,
    MarkComplete: params.MarkCompleteComponent,
    a: ChallengeMdxAnchor,
    FlashCard,
    FlashCardDeck,
    ExpandableHint,
    Sources,
    QuickLinks,
    BudgetCodeAnchors,
    BudgetCodeAnatomy,
    BudgetChapterHierarchy,
    BudgetStatusReport: withRouteEntityCui(BudgetStatusReport, params.entityCui, params.campaignInteractiveAccess),
    DebateRequestForm: withRouteEntityCui(DebateRequestForm, params.entityCui, params.campaignInteractiveAccess),
    ParticipationReport: withRouteEntityCui(ParticipationReport, params.entityCui, params.campaignInteractiveAccess),
    ContestationBuilder: withRouteEntityCui(ContestationBuilder, params.entityCui, params.campaignInteractiveAccess),
    BudgetPublicationDate: withRouteEntityCui(BudgetPublicationDate, params.entityCui, params.campaignInteractiveAccess),
    PrimarieWebsiteLink: withRouteEntityCui(PrimarieWebsiteLink, params.entityCui, params.campaignInteractiveAccess),
    BudgetDocumentLink: withRouteEntityCui(BudgetDocumentLink, params.entityCui, params.campaignInteractiveAccess),
    PrimarieContactInfo: withRouteEntityCui(PrimarieContactInfo, params.entityCui, params.campaignInteractiveAccess),
    CivicModuleShareCta: withRouteEntityCui(CivicModuleShareCta, params.entityCui),
    ...(params.customComponents ?? {}),
  }
}
