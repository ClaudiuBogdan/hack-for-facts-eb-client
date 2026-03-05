import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import {
  getAllSteps,
  getChallengeModules,
  getChallengeModuleStats,
} from '../../utils/modules'
import { CHALLENGES_BASE_PATH } from '../../constants'
import type { ChallengeLocale, ChallengeModuleDefinition } from '../../types'
import { ChallengeModuleCard, type ChallengeModuleCardStats } from '../cards/ChallengeModuleCard'

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
  const { getStepStatus, isStepCompleted } = useChallengeProgress()
  const [isOtherModulesOpen, setIsOtherModulesOpen] = useState(false)

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

  // Auto-expand when active module is completed
  useEffect(() => {
    if (activeModuleData?.stats.percentage === 100) {
      setIsOtherModulesOpen(true)
    }
  }, [activeModuleData?.stats.percentage])

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-1000 py-6 px-4">
      {/* Header */}
      <div className="space-y-3 pl-9">
        <h1 className="text-5xl font-black tracking-tight text-foreground leading-tight">
          {(activeModuleData?.stats.completedCount ?? 0) > 0
            ? t`Welcome back.`
            : locale === 'en'
              ? 'Ready for a challenge?'
              : 'Pregătit de provocare?'}
        </h1>
        <p className="text-muted-foreground font-medium text-lg opacity-60">
          {(activeModuleData?.stats.completedCount ?? 0) > 0
            ? t`You're doing great. Keep up the momentum.`
            : locale === 'en'
              ? 'Test your skills with hands-on budget exploration challenges.'
              : 'Testează-ți abilitățile cu provocări practice de explorare a bugetelor.'}
        </p>
      </div>

      {/* Active Module Card */}
      <div className="space-y-6">
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
      </div>

      {/* Other Modules - Collapsible */}
      {otherModulesData.length > 0 && (
        <Collapsible open={isOtherModulesOpen} onOpenChange={setIsOtherModulesOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
            >
              <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                {t`Explore more modules`}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all duration-300 ${
                  isOtherModulesOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-6 space-y-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
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
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
