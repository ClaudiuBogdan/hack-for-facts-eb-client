import { t } from '@lingui/core/macro'

import { EntityFinancialSummarySkeleton } from '@/components/entities/EntityFinancialSummarySkeleton'
import { EntityFinancialTrendsSkeleton } from '@/components/entities/EntityFinancialTrendsSkeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CHALLENGE_ENTITY_ANALYSIS_ROOT_CLASS_NAME,
  CHALLENGE_ENTITY_EXPLAINER_CARD_CLASS_NAME,
  CHALLENGE_ENTITY_EXPLAINER_CONTENT_CLASS_NAME,
  CHALLENGE_ENTITY_HERO_CONTENT_CLASS_NAME,
  CHALLENGE_ENTITY_HERO_CONTROLS_CLASS_NAME,
  CHALLENGE_ENTITY_HERO_FRAME_CLASS_NAME,
  CHALLENGE_ENTITY_TREEMAP_CARD_CLASS_NAME,
  CHALLENGE_ENTITY_VIEW_SHORTCUTS_CLASS_NAME,
} from './challenge-entity-analysis-frames'

function ViewShortcutsSkeleton() {
  return (
    <div className={CHALLENGE_ENTITY_VIEW_SHORTCUTS_CLASS_NAME}>
      <Skeleton className="h-9.5 w-40 rounded-full" />
      <Skeleton className="h-9.5 w-44 rounded-full" />
    </div>
  )
}

/**
 * Placeholder for the entity analysis page's default view: the hero header
 * (name, badges, report controls), the explainer card, the three KPI cards,
 * the financial trends chart, the view shortcuts and the treemap card, each
 * in the real component's frame so the content replaces it in place.
 *
 * Two blocks depend on the entity and are not mirrored, because the shell
 * renders before the entity is known: the campaign card that `/entities/$cui`
 * shows under the header of a UAT, and the map block that precedes the
 * treemap for entities with a map preview. The entity name's line count is
 * unknown too; the title placeholder reserves two lines on phones, where
 * nearly every name wraps, and one line from `sm` up. The explainer's copy
 * wraps to six lines on phones and four from `sm`, and its placeholder does
 * the same.
 */
export function ChallengeEntityAnalysisLoadingShell() {
  return (
    <div
      className={CHALLENGE_ENTITY_ANALYSIS_ROOT_CLASS_NAME}
      role="status"
      aria-busy="true"
      aria-label={t`Loading…`}
    >
      <span className="sr-only">{t`Loading…`}</span>

      <section className={CHALLENGE_ENTITY_HERO_FRAME_CLASS_NAME}>
        <div className={CHALLENGE_ENTITY_HERO_CONTENT_CLASS_NAME}>
          <div className="space-y-1 sm:hidden">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-3/5" />
          </div>
          <Skeleton className="hidden h-11 w-2/3 sm:block" />
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-44 rounded-full" />
          </div>
          <div className={CHALLENGE_ENTITY_HERO_CONTROLS_CLASS_NAME}>
            <Skeleton className="col-span-2 h-10 w-full rounded-full sm:col-span-1 sm:w-48" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-9 w-9 justify-self-end rounded-full" />
          </div>
        </div>
      </section>

      <Card className={CHALLENGE_ENTITY_EXPLAINER_CARD_CLASS_NAME}>
        <CardContent className={CHALLENGE_ENTITY_EXPLAINER_CONTENT_CLASS_NAME}>
          <div className="flex items-start gap-3 sm:gap-4">
            <Skeleton className="mt-1 h-4 w-4 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-0">
                <Skeleton className="h-6 w-full sm:h-7" />
                <Skeleton className="h-6 w-11/12 sm:h-7" />
                <Skeleton className="h-6 w-full sm:h-7" />
                <Skeleton className="h-6 w-full sm:hidden" />
                <Skeleton className="h-6 w-11/12 sm:hidden" />
                <Skeleton className="h-6 w-1/3 sm:h-7" />
              </div>
              <div className="flex items-center pt-1">
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EntityFinancialSummarySkeleton density="compact-desktop" />
      <EntityFinancialTrendsSkeleton />

      <ViewShortcutsSkeleton />

      <Card className={CHALLENGE_ENTITY_TREEMAP_CARD_CLASS_NAME}>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-7 w-48 rounded-full" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
          <ViewShortcutsSkeleton />
        </CardContent>
      </Card>
    </div>
  )
}
