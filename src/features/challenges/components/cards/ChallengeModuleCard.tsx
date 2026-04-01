import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowRight, Play, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getTranslatedText } from '../../utils/modules'
import { buildCampaignProvocariModulePath } from '../../constants'
import type { ChallengeLocale, ChallengeModuleDefinition } from '../../types'

export type ChallengeModuleCardStats = {
  readonly completedCount: number
  readonly totalCount: number
  readonly percentage: number
  readonly remainingMinutes: number
  readonly totalMinutes: number
}

export type ChallengeModuleCardVariant = 'active' | 'other'

export type ChallengeModuleCardProps = {
  readonly entityCui: string
  readonly module: ChallengeModuleDefinition
  readonly stats: ChallengeModuleCardStats
  readonly locale: ChallengeLocale
  readonly variant: ChallengeModuleCardVariant
  readonly nextStepUrl?: string
  readonly onNavigateAndSwitch?: () => void
}

export function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return t`Done`
  if (minutes < 60) return t`${minutes}m remaining`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return t`${hours}h remaining`
  return t`${hours}h ${mins}m remaining`
}

export function formatTotalTime(minutes: number): string {
  if (minutes <= 0) return t`Done`
  if (minutes < 60) return t`${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return t`${hours}h`
  return t`${hours}h ${mins}m`
}

function getCardStyles(isActive: boolean): string {
  return isActive
    ? 'shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/[0.03] group hover:shadow-xl hover:shadow-primary/8'
    : 'shadow-md shadow-primary/3 bg-gradient-to-br from-background via-background to-muted/30 hover:shadow-lg hover:shadow-primary/5'
}

function getVariantStyles(isActive: boolean) {
  return {
    padding: isActive ? 'p-6 md:p-10' : 'p-6 md:p-8',
    title: isActive ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl',
    description: isActive ? 'text-lg' : 'text-base',
    buttonMinWidth: isActive ? 'min-w-[240px]' : 'min-w-[200px]',
    buttonHeight: isActive ? 'h-16' : 'h-14',
    buttonTextSize: isActive ? 'text-lg' : 'text-base',
    spacing: isActive ? 'space-y-10' : 'space-y-8',
    detailsButtonHeight: isActive ? 'h-14' : 'h-12',
  }
}

type ActionButtonProps = {
  readonly isCompleted: boolean
  readonly isActive: boolean
  readonly nextStepUrl?: string
  readonly onNavigateAndSwitch?: () => void
  readonly actionButtonLabel: string
  readonly styles: ReturnType<typeof getVariantStyles>
}

function ActionButton({
  isCompleted,
  isActive,
  nextStepUrl,
  onNavigateAndSwitch,
  actionButtonLabel,
  styles,
}: ActionButtonProps) {
  if (isCompleted) {
    return (
      <Button
        variant="outline"
        size="lg"
        className={`rounded-[22px] px-8 ${styles.buttonHeight} ${styles.buttonTextSize} font-black border-2 border-green-500/20 bg-green-500/[0.05] text-green-600 hover:bg-green-500/10 transition-all`}
      >
        <Trophy className="mr-2 lg:mr-3 h-5 w-5" aria-hidden="true" />
        {t`Completed`}
      </Button>
    )
  }

  if (isActive && nextStepUrl) {
    return (
      <Button
        asChild
        size="lg"
        className={`rounded-[22px] px-8 lg:px-10 ${styles.buttonHeight} ${styles.buttonTextSize} font-black shadow-lg shadow-primary/15 transition-all hover:scale-[1.03] active:scale-95 bg-primary text-primary-foreground border-none`}
      >
        <Link to={nextStepUrl as '/'}>
          <Play className="mr-2 lg:mr-3 h-5 w-5 fill-current" aria-hidden="true" />
          {actionButtonLabel}
        </Link>
      </Button>
    )
  }

  if (nextStepUrl) {
    return (
      <Button
        asChild
        size="lg"
        className={`rounded-[22px] px-8 ${styles.buttonHeight} ${styles.buttonTextSize} font-black shadow-md shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95 bg-primary text-primary-foreground border-none`}
        onClick={onNavigateAndSwitch}
      >
        <Link to={nextStepUrl as '/'}>
          <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" />
          {actionButtonLabel}
        </Link>
      </Button>
    )
  }

  return null
}

export function ChallengeModuleCard({
  entityCui,
  module,
  stats,
  locale,
  variant,
  nextStepUrl,
  onNavigateAndSwitch,
}: ChallengeModuleCardProps) {
  const hasProgress = stats.percentage > 0
  const isCompleted = stats.percentage === 100
  const isActive = variant === 'active'
  const styles = getVariantStyles(isActive)
  const actionButtonLabel = hasProgress ? t`Continue` : t`Start`

  return (
    <Card
      className={`relative overflow-hidden rounded-[28px] transition-all ${isActive ? 'border-none' : 'border border-border'} ${getCardStyles(isActive)}`}
    >
      {/* Background trophy decoration */}
      <div
        className={`absolute top-0 right-0 opacity-[0.03] pointer-events-none ${isActive ? 'p-10 group-hover:scale-110 transition-transform duration-1000' : 'p-8'}`}
      >
        <Trophy className={isActive ? 'h-64 w-64 rotate-12' : 'h-48 w-48 rotate-12'} aria-hidden="true" />
      </div>

      <CardContent className={`${styles.padding} ${styles.spacing}`}>
        {/* Header: Title, Description, Actions */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 lg:gap-8">
          <div className="space-y-3 lg:space-y-4 flex-1">
            <h3
              className={`${styles.title} font-black tracking-tighter leading-[1.1] text-foreground`}
            >
              {getTranslatedText(module.title, locale)}
            </h3>
            <p
              className={`text-muted-foreground ${styles.description} font-medium leading-relaxed max-w-xl opacity-70`}
            >
              {getTranslatedText(module.description, locale)}
            </p>
            {module.audienceHint ? (
              <p className="max-w-xl text-sm font-semibold leading-relaxed text-foreground/75">
                {getTranslatedText(module.audienceHint, locale)}
              </p>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className={`flex flex-col gap-3 lg:gap-4 ${styles.buttonMinWidth}`}>
            <ActionButton
              isCompleted={isCompleted}
              isActive={isActive}
              nextStepUrl={nextStepUrl}
              onNavigateAndSwitch={onNavigateAndSwitch}
              actionButtonLabel={actionButtonLabel}
              styles={styles}
            />

            <Button
              asChild
              variant="ghost"
              className={`rounded-2xl ${styles.detailsButtonHeight} text-sm font-black text-muted-foreground hover:bg-transparent hover:text-foreground group/link`}
            >
              <Link to={buildCampaignProvocariModulePath(entityCui, module.slug) as '/'}>
                {t`View Details`}
                <ArrowRight className="ml-2 h-4 w-4 group-hover/link:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress bar - only show for active variant */}
        {isActive && (
          <div className="space-y-4 lg:space-y-5 pt-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">
              <span className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                {t`Progress`}
              </span>
              <span className="text-primary tabular-nums">
                {stats.percentage}%
              </span>
            </div>
            <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden shadow-inner p-0.5" role="progressbar" aria-valuenow={stats.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={t`Module progress`}>
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
