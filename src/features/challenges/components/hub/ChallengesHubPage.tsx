import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCampaignProgress } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-progress'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import {
  getAllSteps,
  getChallengeModules,
  getChallengeModuleStats,
} from '../../utils/modules'
import { CHALLENGES_BASE_PATH } from '../../constants'
import type { ChallengeLocale, ChallengeModuleDefinition } from '../../types'
import { ChallengeModuleCard, type ChallengeModuleCardStats } from '../cards/ChallengeModuleCard'
import { BudgetTimelineStrip } from './BudgetTimelineStrip'
import { QuickResourcesPreview } from './QuickResourcesPreview'

type ChallengesHubPageProps = {
  readonly locale: ChallengeLocale
}

type ModuleWithStats = {
  readonly module: ChallengeModuleDefinition
  readonly stats: ChallengeModuleCardStats
  readonly nextStepUrl: string | undefined
}

export function ChallengesHubPage({ locale }: ChallengesHubPageProps) {
  const modules = useMemo(() => getChallengeModules(), [])
  const { progress: campaignProgress } = useCampaignProgress()
  const { getStepStatus, isStepCompleted } = useChallengeProgress()
  const selectedEntityCui = campaignProgress.selectedEntityCui ?? undefined

  // Compute stats for all modules
  const modulesWithStats = useMemo<readonly ModuleWithStats[]>(() => {
    return modules.map((module) => {
      const moduleStats = getChallengeModuleStats({
        module,
        getStepStatus: (stepId) => getStepStatus(stepId),
      })

      const allSteps = getAllSteps(module)
      const totalMinutes = allSteps.reduce((sum, s) => sum + s.durationMinutes, 0)
      const remainingMinutes = allSteps
        .filter((s) => !isStepCompleted(s.id))
        .reduce((sum, s) => sum + s.durationMinutes, 0)

      const nextStepUrl =
        moduleStats.nextStep && moduleStats.nextChallengeSlug
          ? `${CHALLENGES_BASE_PATH}/${module.slug}/${moduleStats.nextChallengeSlug}/${moduleStats.nextStep.slug}`
          : undefined

      return {
        module,
        stats: {
          completedCount: moduleStats.completedCount,
          totalCount: moduleStats.totalCount,
          percentage: moduleStats.completionPercentage,
          remainingMinutes,
          totalMinutes,
        },
        nextStepUrl,
      }
    })
  }, [modules, getStepStatus, isStepCompleted])

  // First module is "active", rest are "other"
  const activeModuleData = modulesWithStats[0] ?? null
  const otherModulesData = modulesWithStats.slice(1)

  const greeting =
    (activeModuleData?.stats.completedCount ?? 0) > 0
      ? t`Welcome back.`
      : locale === 'en'
        ? 'Ready for a challenge?'
        : 'Pregătit de provocare?'

  const subtitle =
    (activeModuleData?.stats.completedCount ?? 0) > 0
      ? t`You're doing great. Keep up the momentum.`
      : locale === 'en'
        ? 'Test your skills with hands-on budget exploration challenges.'
        : 'Testează-ți abilitățile cu provocări practice de explorare a bugetelor.'

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 py-6 px-4">
      {/* Header — compact */}
      <div className="space-y-2 pl-2">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground font-medium text-base opacity-60">{subtitle}</p>
      </div>

      {/* Active Module Card */}
      {activeModuleData && activeModuleData.stats.percentage < 100 ? (
        <ChallengeModuleCard
          module={activeModuleData.module}
          stats={activeModuleData.stats}
          locale={locale}
          variant="active"
          nextStepUrl={activeModuleData.nextStepUrl}
        />
      ) : activeModuleData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-[40px] border-2 border-dashed border-muted">
          <Trophy className="h-16 w-16 text-primary/40 mb-6" />
          <h3 className="text-2xl font-black tracking-tight mb-2">{t`Congratulations!`}</h3>
          <p className="text-muted-foreground font-medium mb-8">
            {t`You've completed this module.`}
          </p>
          <Button
            asChild
            variant="outline"
            className="rounded-2xl px-8 h-12 font-bold"
          >
            <Link to={`${CHALLENGES_BASE_PATH}/${activeModuleData.module.slug}` as '/'}>
              {t`Review Module`}
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Budget Timeline */}
      <BudgetTimelineStrip locale={locale} entityCui={selectedEntityCui} />

      {/* Quick Resources */}
      <QuickResourcesPreview locale={locale} />

      {/* Other Modules — flat, no collapsible */}
      {otherModulesData.length > 0 && (
        <div className="space-y-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-2">
            {t`More Modules`}
          </h2>
          <div className="space-y-6">
            {otherModulesData.map(({ module, stats, nextStepUrl }) => (
              <ChallengeModuleCard
                key={module.id}
                module={module}
                stats={stats}
                locale={locale}
                variant="other"
                nextStepUrl={nextStepUrl}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
