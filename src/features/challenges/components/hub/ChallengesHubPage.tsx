import { t } from '@lingui/core/macro'
import { useEffect, useMemo, useState } from 'react'
import { getEntityLabels } from '@/lib/api/labels'
import { useChallengeAccess } from '../../hooks/use-challenge-access'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import {
  getAllSteps,
  getChallengeModules,
  getChallengeModuleStats,
  resolveActiveChallengeModule,
} from '../../utils/modules'
import {
  buildCampaignProvocariStepPath,
} from '../../constants'
import type { ChallengeLocale, ChallengeModuleDefinition } from '../../types'
import { ChallengeModuleCard, type ChallengeModuleCardStats } from '../cards/ChallengeModuleCard'
import { BudgetTimelineStrip } from './BudgetTimelineStrip'
import { ChallengeHubAccessCard } from './challenge-hub-access-card'
import { QuickResourcesPreview } from './QuickResourcesPreview'

type ChallengesHubPageProps = {
  readonly entityCui: string
  readonly locale: ChallengeLocale
}

type ModuleWithStats = {
  readonly module: ChallengeModuleDefinition
  readonly stats: ChallengeModuleCardStats
  readonly nextStepUrl: string | undefined
}

export function ChallengesHubPage({
  entityCui,
  locale,
}: ChallengesHubPageProps) {
  const [entityLabel, setEntityLabel] = useState(entityCui)
  const modules = useMemo(() => getChallengeModules(), [])
  const {
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    register,
  } = useChallengeAccess()
  const { progress: campaignProgress } = useCampaignProgress()
  const { getStepStatus, isStepCompleted } = useChallengeProgress()

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
          ? buildCampaignProvocariStepPath(
              entityCui,
              module.slug,
              moduleStats.nextChallengeSlug,
              moduleStats.nextStep.slug,
            )
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
  }, [entityCui, modules, getStepStatus, isStepCompleted])

  const activeModule = useMemo(
    () =>
      resolveActiveChallengeModule({
        modules,
        storedActiveModuleSlug: campaignProgress.activeChallengeModuleSlug,
        getStepStatus,
      }),
    [campaignProgress.activeChallengeModuleSlug, getStepStatus, modules],
  )

  const activeModuleData =
    modulesWithStats.find((entry) => entry.module.id === activeModule?.id) ??
    null
  const fallbackModuleData = modulesWithStats[0] ?? null
  const otherModulesData = modulesWithStats.filter((m) => m !== activeModuleData)
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

  useEffect(() => {
    let cancelled = false
    setEntityLabel(entityCui)

    getEntityLabels([entityCui]).then((results) => {
      if (cancelled) {
        return
      }

      const matchedEntity = results.find((result) => result.id === entityCui)
      if (matchedEntity?.label) {
        setEntityLabel(matchedEntity.label)
      }
    })

    return () => {
      cancelled = true
    }
  }, [entityCui])

  const mainHero = (() => {
    if (!isAccessGranted) {
      return (
        <ChallengeHubAccessCard
          locale={locale}
          variant={accessCardVariant ?? 'loading'}
          isSubmitting={isSubmitting}
          onRegister={register}
        />
      )
    }

    if (!fallbackModuleData) return null

    if (activeModuleData) {
      return (
        <ChallengeModuleCard
          entityCui={entityCui}
          module={activeModuleData.module}
          stats={activeModuleData.stats}
          locale={locale}
          variant="active"
          nextStepUrl={activeModuleData.nextStepUrl}
        />
      )
    }

    if (!activeModuleData) {
      return null
    }

    return null
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 py-6 px-4">
      {/* Header — compact */}
      <div className="space-y-2 pl-2">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          <span className="block text-lg font-semibold tracking-normal text-muted-foreground md:text-xl">
            {entityLabel}
          </span>
          <span className="block">{greeting}</span>
        </h1>
        <p className="text-muted-foreground font-medium text-base opacity-60">{subtitle}</p>
      </div>

      {/* Active Module Card */}
      {mainHero}

      {/* Budget Timeline */}
      <BudgetTimelineStrip locale={locale} entityCui={entityCui} />

      {/* Quick Resources */}
      <QuickResourcesPreview locale={locale} entityCui={entityCui} />

      {/* Other Modules — flat, no collapsible */}
      {otherModulesData.length > 0 && (
        <div className="space-y-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-2">
            {t`Up Next`}
          </h2>
          <div className="space-y-6">
            {otherModulesData.map(({ module, stats, nextStepUrl }) => (
              <ChallengeModuleCard
                key={module.id}
                entityCui={entityCui}
                module={module}
                stats={stats}
                locale={locale}
                variant="other"
                nextStepUrl={isAccessGranted ? nextStepUrl : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
