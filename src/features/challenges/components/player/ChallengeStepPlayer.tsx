import { Suspense, useEffect, useMemo, type ComponentType } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { prefetchChallengeStepContent, useChallengeStepContent } from '../../hooks/use-challenge-step-content'
import { useChallengeAccess } from '../../hooks/use-challenge-access'
import type { ChallengeLocale, ChallengeStepDefinition } from '../../types'
import { buildCampaignProvocariPath } from '../../constants'
import {
  findChallengeSlugForStep,
  getAdjacentSteps,
  getChallengeModuleBySlug,
  getTranslatedText,
} from '../../utils/modules'
import { ChallengeStepArticleLayout } from './challenge-step-article-layout'
import { useChallengeStepMdxComponents } from './challenge-step-mdx-wrappers'
import type { ChallengeStepViewMode, MdxContentProps } from './challenge-step-player.shared'
import { resolveChallengeStepViewMode } from './challenge-step-player.utils'
import { SectionedStepFooter } from './sectioned-step-footer'
import { SectionedStepHeader } from './sectioned-step-header'
import { SectionedStepViewport } from './sectioned-step-viewport'
import { useSectionedStepPlayer } from './use-sectioned-step-player'
import type { ChallengeStepSection } from '../../utils/sectioned-step-markdown'

type ChallengeStepPlayerProps = {
  readonly entityCui: string
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
  readonly challengeSlug: string
  readonly stepSlug: string
  readonly activeSectionId?: string
  readonly activeViewMode?: ChallengeStepViewMode
  readonly onSectionChange?: (
    sectionId: string,
    options?: { readonly replace?: boolean },
  ) => void
  readonly onViewModeChange?: (
    viewMode: ChallengeStepViewMode,
    options?: { readonly replace?: boolean },
  ) => void
}

type ChallengeSectionedStepRendererProps = {
  readonly entityCui: string
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
  readonly currentSearchSectionId?: string
  readonly currentViewMode: ChallengeStepViewMode
  readonly onSectionChange?: (
    sectionId: string,
    options?: { readonly replace?: boolean },
  ) => void
  readonly onViewModeChange?: (
    viewMode: ChallengeStepViewMode,
    options?: { readonly replace?: boolean },
  ) => void
  readonly stepId: string
  readonly stepTitle: string
  readonly stepCompletionMode: ChallengeStepDefinition['completionMode']
  readonly fullArticleComponent: ComponentType<MdxContentProps>
  readonly articleMdxComponents: ReturnType<typeof useChallengeStepMdxComponents>['sectionedArticleMdxComponents']
  readonly articleExtraContent: ReturnType<typeof useChallengeStepMdxComponents>['syntheticMarkComplete']
  readonly prev: ChallengeStepDefinition | null
  readonly sections: readonly ChallengeStepSection[]
  readonly next: ChallengeStepDefinition | null
  readonly findChallengeSlugForAdjacentStep: (stepId: string) => string
  readonly accessCardVariant: ReturnType<typeof useChallengeAccess>['accessCardVariant']
  readonly isAccessGranted: ReturnType<typeof useChallengeAccess>['isAccessGranted']
  readonly isSubmitting: ReturnType<typeof useChallengeAccess>['isSubmitting']
  readonly onRegister: ReturnType<typeof useChallengeAccess>['register']
}

type ChallengeStepContentRendererProps = {
  readonly entityCui: string
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
  readonly contentDir: string
  readonly stepId: string
  readonly stepTitle: string
  readonly stepCompletionMode: ChallengeStepDefinition['completionMode']
  readonly activeSectionId?: string
  readonly activeViewMode?: ChallengeStepViewMode
  readonly onSectionChange?: (
    sectionId: string,
    options?: { readonly replace?: boolean },
  ) => void
  readonly onViewModeChange?: (
    viewMode: ChallengeStepViewMode,
    options?: { readonly replace?: boolean },
  ) => void
  readonly prev: ChallengeStepDefinition | null
  readonly next: ChallengeStepDefinition | null
  readonly findChallengeSlugForAdjacentStep: (stepId: string) => string
  readonly accessCardVariant: ReturnType<typeof useChallengeAccess>['accessCardVariant']
  readonly isAccessGranted: ReturnType<typeof useChallengeAccess>['isAccessGranted']
  readonly isSubmitting: ReturnType<typeof useChallengeAccess>['isSubmitting']
  readonly onRegister: ReturnType<typeof useChallengeAccess>['register']
}

function ChallengeSectionedStepRenderer({
  entityCui,
  locale,
  moduleSlug,
  currentSearchSectionId,
  currentViewMode,
  onSectionChange,
  onViewModeChange,
  stepId,
  stepTitle,
  stepCompletionMode,
  fullArticleComponent,
  articleMdxComponents,
  articleExtraContent,
  prev,
  sections,
  next,
  findChallengeSlugForAdjacentStep,
  accessCardVariant,
  isAccessGranted,
  isSubmitting,
  onRegister,
}: ChallengeSectionedStepRendererProps) {
  const sectionedPlayer = useSectionedStepPlayer({
    entityCui,
    locale,
    moduleSlug,
    currentSearchSectionId,
    currentViewMode,
    onSectionChange,
    stepId,
    stepTitle,
    prev,
    sections,
    next,
    findChallengeSlugForAdjacentStep,
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    onRegister,
  })

  if (!sectionedPlayer.currentSection || !sectionedPlayer.currentSectionComponent) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">{t`This sectioned step has no sections to render.`}</p>
        </CardContent>
      </Card>
    )
  }

  if (currentViewMode === 'article') {
    return (
      <div className="-mx-4 -my-5 bg-background sm:-mx-6 sm:-my-8 lg:-mx-10 lg:-my-10">
        <SectionedStepHeader
          backTarget={sectionedPlayer.backTarget}
          currentViewMode={currentViewMode}
          currentSectionIndex={sectionedPlayer.currentSectionIndex}
          onProgressSectionSelect={sectionedPlayer.handleProgressSectionSelect}
          onViewModeChange={onViewModeChange}
          sections={sections}
          stepTitle={stepTitle}
        />

        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <ChallengeStepArticleLayout
            entityCui={entityCui}
            locale={locale}
            moduleSlug={moduleSlug}
            prev={prev}
            next={next}
            findChallengeSlugForAdjacentStep={findChallengeSlugForAdjacentStep}
            getTranslatedText={getTranslatedText}
            Component={fullArticleComponent}
            mdxComponents={articleMdxComponents}
            isLoading={false}
            error={null}
            extraContent={stepCompletionMode === 'mark_complete' ? articleExtraContent : undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="challenge-sectioned-step-layout"
      className="-mx-4 -my-5 flex min-h-screen min-h-[100svh] supports-[min-height:100dvh]:min-h-[100dvh] flex-col bg-background sm:-mx-6 sm:-my-8 lg:-mx-10 lg:-my-10 lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-[100dvh] lg:overflow-hidden"
    >
      <SectionedStepHeader
        backTarget={sectionedPlayer.backTarget}
        currentViewMode={currentViewMode}
        currentSectionIndex={sectionedPlayer.currentSectionIndex}
        onProgressSectionSelect={sectionedPlayer.handleProgressSectionSelect}
        onViewModeChange={onViewModeChange}
        sections={sections}
        stepTitle={stepTitle}
      />

      <SectionedStepViewport
        stepTitle={stepTitle}
        headerTitle={sectionedPlayer.headerTitle}
        hasPreviousSection={sectionedPlayer.hasPreviousSection}
        hasNextSection={sectionedPlayer.hasNextSection}
        onGoToPreviousSection={sectionedPlayer.handleGoToPreviousSection}
        onGoToNextSection={sectionedPlayer.handleGoToNextSection}
        CurrentSectionComponent={sectionedPlayer.currentSectionComponent}
        mdxComponents={sectionedPlayer.sectionedMdxComponents}
        scrollAreaRef={sectionedPlayer.scrollAreaRef}
      />

      <SectionedStepFooter
        footerState={sectionedPlayer.footerState}
        onSkip={sectionedPlayer.handleSkip}
        onPrimaryAction={sectionedPlayer.handlePrimaryAction}
      />
    </div>
  )
}

function ChallengeStepContentRenderer({
  entityCui,
  locale,
  moduleSlug,
  contentDir,
  stepId,
  stepTitle,
  stepCompletionMode,
  activeSectionId,
  activeViewMode,
  onSectionChange,
  onViewModeChange,
  prev,
  next,
  findChallengeSlugForAdjacentStep,
  accessCardVariant,
  isAccessGranted,
  isSubmitting,
  onRegister,
}: ChallengeStepContentRendererProps) {
  const { content, isLoading, error } = useChallengeStepContent({
    contentDir,
    locale,
  })

  const {
    articleMdxComponents,
    sectionedArticleMdxComponents,
    syntheticMarkComplete,
  } = useChallengeStepMdxComponents({
    stepId,
    locale,
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    onRegister,
  })

  const resolvedSectionedViewMode = resolveChallengeStepViewMode(activeViewMode)

  useEffect(() => {
    if (content?.kind !== 'sectioned') return
    if (activeViewMode === resolvedSectionedViewMode) return
    onViewModeChange?.(resolvedSectionedViewMode, { replace: true })
  }, [activeViewMode, content?.kind, onViewModeChange, resolvedSectionedViewMode])

  if (content?.kind === 'sectioned') {
    return (
      <ChallengeSectionedStepRenderer
        entityCui={entityCui}
        locale={locale}
        moduleSlug={moduleSlug}
        currentSearchSectionId={activeSectionId}
        currentViewMode={resolvedSectionedViewMode}
        onSectionChange={onSectionChange}
        onViewModeChange={onViewModeChange}
        stepId={stepId}
        stepTitle={stepTitle}
        stepCompletionMode={stepCompletionMode}
        fullArticleComponent={content.Component}
        articleMdxComponents={sectionedArticleMdxComponents}
        articleExtraContent={syntheticMarkComplete}
        prev={prev}
        sections={content.sections}
        next={next}
        findChallengeSlugForAdjacentStep={findChallengeSlugForAdjacentStep}
        accessCardVariant={accessCardVariant}
        isAccessGranted={isAccessGranted}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    )
  }

  return (
    <ChallengeStepArticleLayout
      entityCui={entityCui}
      locale={locale}
      moduleSlug={moduleSlug}
      prev={prev}
      next={next}
      findChallengeSlugForAdjacentStep={findChallengeSlugForAdjacentStep}
      getTranslatedText={getTranslatedText}
      Component={content?.Component ?? null}
      mdxComponents={articleMdxComponents}
      isLoading={isLoading}
      error={error}
    />
  )
}

export function ChallengeStepPlayer({
  entityCui,
  locale,
  moduleSlug,
  challengeSlug,
  stepSlug,
  activeSectionId,
  activeViewMode,
  onSectionChange,
  onViewModeChange,
}: ChallengeStepPlayerProps) {
  const module = getChallengeModuleBySlug(moduleSlug)
  const challenge = module?.challenges.find((candidate) => candidate.slug === challengeSlug) ?? null
  const step = challenge?.steps.find((candidate) => candidate.slug === stepSlug) ?? null
  const {
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    register,
  } = useChallengeAccess()

  const { prev, next } = useMemo(
    () =>
      module
        ? getAdjacentSteps({ module, stepId: step?.id ?? '' })
        : { prev: null, next: null },
    [module, step?.id],
  )

  useEffect(() => {
    if (prev?.contentDir) {
      void prefetchChallengeStepContent({ contentDir: prev.contentDir, locale })
    }
    if (next?.contentDir) {
      void prefetchChallengeStepContent({ contentDir: next.contentDir, locale })
    }
  }, [locale, next?.contentDir, prev?.contentDir])

  const findChallengeSlugForAdjacentStep = (adjacentStepId: string) =>
    module ? findChallengeSlugForStep(module, adjacentStepId) ?? challengeSlug : challengeSlug

  if (!module || !challenge || !step) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{t`Step not found`}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t`The step you're looking for doesn't exist or may have been moved.`}
          </p>
          <Button asChild className="mt-4">
            <Link to={buildCampaignProvocariPath(entityCui) as '/'}>
              {t`Back to Challenges`}
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Suspense
      fallback={
        <ChallengeStepArticleLayout
          entityCui={entityCui}
          locale={locale}
          moduleSlug={moduleSlug}
          prev={prev}
          next={next}
          findChallengeSlugForAdjacentStep={findChallengeSlugForAdjacentStep}
          getTranslatedText={getTranslatedText}
          Component={null}
          mdxComponents={undefined}
          isLoading={true}
          error={null}
        />
      }
    >
      <ChallengeStepContentRenderer
        entityCui={entityCui}
        locale={locale}
        moduleSlug={moduleSlug}
        contentDir={step.contentDir}
        stepId={step.id}
        stepTitle={getTranslatedText(step.title, locale)}
        stepCompletionMode={step.completionMode}
        activeSectionId={activeSectionId}
        activeViewMode={activeViewMode}
        onSectionChange={onSectionChange}
        onViewModeChange={onViewModeChange}
        prev={prev}
        next={next}
        findChallengeSlugForAdjacentStep={findChallengeSlugForAdjacentStep}
        accessCardVariant={accessCardVariant}
        isAccessGranted={isAccessGranted}
        isSubmitting={isSubmitting}
        onRegister={register}
      />
    </Suspense>
  )
}
