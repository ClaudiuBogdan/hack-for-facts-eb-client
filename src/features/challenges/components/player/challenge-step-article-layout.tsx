import type { ComponentType, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { LessonSkeleton } from '@/features/learning/components/loading/LessonSkeleton'
import { LessonChallengesProvider } from '@/features/learning/components/player/lesson-challenges-context'
import type { ChallengeLocale, ChallengeStepDefinition } from '../../types'
import { buildCampaignProvocariModulePath } from '../../constants'
import {
  CHALLENGE_ARTICLE_PROSE_CLASS_NAME,
  clearChallengeStepSearch,
  buildAdjacentStepHref,
  buildModuleFinishHref,
} from './challenge-step-player.utils'
import type { MdxContentProps } from './challenge-step-player.shared'

type ChallengeStepArticleLayoutProps = {
  readonly header?: ReactNode
  readonly entityCui: string
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
  readonly prev: ChallengeStepDefinition | null
  readonly next: ChallengeStepDefinition | null
  readonly findChallengeSlugForAdjacentStep: (stepId: string) => string
  readonly getTranslatedText: (value: ChallengeStepDefinition['title'], locale: ChallengeLocale) => string
  readonly Component: ComponentType<MdxContentProps> | null
  readonly mdxComponents: MdxContentProps['components']
  readonly isLoading: boolean
  readonly error: string | null
  readonly extraContent?: ReactNode
}

export function ChallengeStepArticleLayout({
  header,
  entityCui,
  locale,
  moduleSlug,
  prev,
  next,
  findChallengeSlugForAdjacentStep,
  getTranslatedText,
  Component,
  mdxComponents,
  isLoading,
  error,
  extraContent,
}: ChallengeStepArticleLayoutProps) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      {header}

      <div className={CHALLENGE_ARTICLE_PROSE_CLASS_NAME}>
        {isLoading && <LessonSkeleton />}
        {error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : null}
        {Component ? (
          <LessonChallengesProvider>
            <Component components={mdxComponents} />
            {extraContent}
          </LessonChallengesProvider>
        ) : null}
      </div>

      <nav className="mt-8 flex flex-col-reverse gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
        {prev ? (
          <Link
            to={buildAdjacentStepHref({
              entityCui,
              moduleSlug,
              step: prev,
              findChallengeSlugForAdjacentStep,
            }) as '/'}
            preload="render"
            search={(previousSearch) => clearChallengeStepSearch(previousSearch)}
            resetScroll={true}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/60 p-4 transition-colors hover:border-border hover:bg-muted/30 sm:max-w-[48%]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-muted/80">
              <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex min-w-0 flex-col overflow-hidden">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t`Previous`}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">
                {getTranslatedText(prev.title, locale)}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            to={buildCampaignProvocariModulePath(entityCui, moduleSlug) as '/'}
            search={(previousSearch) => clearChallengeStepSearch(previousSearch)}
            resetScroll={true}
            className="group flex items-center gap-3 rounded-2xl border border-border/60 p-4 transition-colors hover:border-border hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-muted/80">
              <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              {t`Back to overview`}
            </span>
          </Link>
        )}

        {next ? (
          <Link
            to={buildAdjacentStepHref({
              entityCui,
              moduleSlug,
              step: next,
              findChallengeSlugForAdjacentStep,
            }) as '/'}
            preload="render"
            search={(previousSearch) => clearChallengeStepSearch(previousSearch)}
            resetScroll={true}
            className="group flex min-w-0 flex-1 items-center justify-end gap-3 rounded-2xl border border-border/60 bg-foreground p-4 text-background transition-opacity hover:opacity-95 sm:max-w-[48%]"
          >
            <div className="flex min-w-0 flex-col overflow-hidden text-right">
              <span className="text-[10px] font-medium uppercase tracking-wide text-background/70">
                {t`Next`}
              </span>
              <span className="truncate text-sm font-semibold text-background">
                {getTranslatedText(next.title, locale)}
              </span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/10 transition-colors group-hover:bg-background/15">
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-background" />
            </div>
          </Link>
        ) : (
          <Link
            to={buildModuleFinishHref(entityCui) as '/'}
            search={(previousSearch) => clearChallengeStepSearch(previousSearch)}
            resetScroll={true}
            className="group flex items-center gap-3 rounded-2xl bg-primary/10 p-4 text-primary transition-colors hover:bg-primary/15"
          >
            <span className="text-sm font-semibold">🎉 {t`Finish`}</span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            </div>
          </Link>
        )}
      </nav>
    </div>
  )
}
