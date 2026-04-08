import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Analytics } from '@/lib/analytics'
import { getEntityLabels } from '@/lib/api/labels'
import { CampaignParticipantsMap } from '@/features/campaigns/buget/components/hub/campaign-participants-map'
import { CampaignParticipantsRankedList } from '@/features/campaigns/buget/components/hub/campaign-participants-ranked-list'
import { SubscriptionCounter } from '@/features/campaigns/buget/components/stats/subscription-counter'
import { FUNKY_CAMPAIGN_KEY } from '@/features/notifications/campaign-notification-keys'
import { useSubscriptionStats } from '@/features/campaigns/buget/hooks/use-subscription-stats'
import { useUatCuiMap } from '@/features/campaigns/buget/hooks/use-uat-cui-map'
import { normalizeSirutaCode } from '@/features/campaigns/buget/utils/normalize-siruta-code'
import { useChallengeAccess } from '../../hooks/use-challenge-access'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import {
  CAMPAIGN_TERMS_PATH,
} from '@/features/campaigns/buget/constants'
import {
  getAllSteps,
  getChallengeModules,
  getChallengeModuleStats,
  resolveActiveChallengeModule,
} from '../../utils/modules'
import {
  buildCampaignProvocariStepPath,
  buildCampaignProvocariPath,
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
  const navigate = useNavigate()
  const [entityLabel, setEntityLabel] = useState(entityCui)
  const [isParticipantsMapOpen, setIsParticipantsMapOpen] = useState(false)
  const {
    total: totalSubscriptions,
    perUat,
    isLoading: isSubscriptionStatsLoading,
    isError: isSubscriptionStatsError,
  } = useSubscriptionStats(FUNKY_CAMPAIGN_KEY)
  const { data: uatCuiMap } = useUatCuiMap()
  const modules = useMemo(() => getChallengeModules(), [])
  const {
    accessCardVariant,
    isAccessGranted,
    isSubmitting,
    register,
  } = useChallengeAccess(entityCui)
  const { progress: campaignProgress, setSelectedEntity } = useCampaignProgress()
  const { getStepStatus, isStepCompleted } = useChallengeProgress({
    entityCui,
    locale,
  })

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

  const currentNatcode = useMemo(() => {
    return normalizeSirutaCode(uatCuiMap?.cuiToNatcodeMap.get(entityCui))
  }, [entityCui, uatCuiMap])

  const currentUatParticipants = useMemo(() => {
    if (!currentNatcode) {
      return null
    }

    const currentEntry = perUat.find(
      (entry) => normalizeSirutaCode(entry.sirutaCode) === currentNatcode,
    )
    return currentEntry?.count ?? 0
  }, [currentNatcode, perUat])

  const participantMapSearch = useMemo(
    () => (locale === 'en' ? { lang: 'en' } : undefined),
    [locale],
  )
  const participantMapTitle =
    locale === 'en' ? 'Participant map' : 'Harta participanților'
  const participantMapDescription =
    locale === 'en'
      ? 'Choose another city hall directly from the map.'
      : 'Alege o altă primărie direct de pe hartă.'

  const handleParticipantMapSelect = useCallback(
    async ({ natcode, name }: { natcode: string; name: string }) => {
      const nextEntityCui = uatCuiMap?.natcodeToCuiMap.get(natcode)

      if (!nextEntityCui) {
        toast.warning(
          locale === 'en'
            ? `Could not map ${name || 'this locality'} to an entity yet.`
            : `Nu am găsit încă maparea pentru ${name || 'această localitate'}.`,
        )
        return
      }

      Analytics.capture(Analytics.EVENTS.CampaignEntitySelectedFromMap, {
        source: 'challenge-hub-modal',
        natcode,
        entityCui: nextEntityCui,
      })

      setSelectedEntity({ entityCui: nextEntityCui })
      setIsParticipantsMapOpen(false)

      await navigate({
        to: buildCampaignProvocariPath(nextEntityCui) as '/',
        search: participantMapSearch,
        replace: true,
        resetScroll: false,
      })
    },
    [locale, navigate, participantMapSearch, setSelectedEntity, uatCuiMap],
  )

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
          entityName={entityLabel}
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

    return null
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div className="pl-2">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              <span className="block text-lg font-semibold tracking-normal text-muted-foreground md:text-xl">
                {entityLabel}
              </span>
              <span className="block">{greeting}</span>
            </h1>

            {!isSubscriptionStatsError && !isSubscriptionStatsLoading ? (
              <button
                type="button"
                onClick={() => {
                  setIsParticipantsMapOpen(true)
                }}
                className="group self-start rounded-lg px-1 py-1 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label={
                  locale === 'en'
                    ? 'Open participant map'
                    : 'Deschide harta participanților'
                }
              >
                <CompactParticipantsSummary
                  currentCount={currentUatParticipants}
                  totalCount={totalSubscriptions}
                  locale={locale}
                />
              </button>
            ) : null}
          </div>
          <p className="text-muted-foreground font-medium text-base opacity-60">{subtitle}</p>
        </div>
      </div>

      {/* Active Module Card */}
      {mainHero}

      <Dialog open={isParticipantsMapOpen} onOpenChange={setIsParticipantsMapOpen}>
        <DialogContent
          hideCloseButton={true}
          className="flex h-full max-h-full w-full max-w-full flex-col overflow-hidden p-0 sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:max-w-5xl sm:rounded-3xl"
        >
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight">
                  {participantMapTitle}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {participantMapDescription}
                </DialogDescription>
              </div>

              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 font-semibold">
                  {locale === 'en' ? 'Close' : 'Închide'}
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5">
            {!isSubscriptionStatsLoading && !isSubscriptionStatsError && perUat.length > 0 ? (
              <CampaignParticipantsRankedList
                locale={locale}
                totalParticipants={totalSubscriptions}
                entries={perUat.map((entry) => ({
                  sirutaCode: normalizeSirutaCode(entry.sirutaCode),
                  uatName: entry.uatName,
                  count: entry.count,
                }))}
                currentSirutaCode={currentNatcode}
                onSelectEntry={(entry) => {
                  void handleParticipantMapSelect({
                    natcode: entry.sirutaCode,
                    name: entry.uatName,
                  })
                }}
              />
            ) : null}

            <CampaignParticipantsMap
              locale={locale}
              className="flex-1 min-h-[20rem]"
              mapHeightClassName="h-full"
              onUatSelect={handleParticipantMapSelect}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Budget Timeline */}
      <BudgetTimelineStrip locale={locale} entityCui={entityCui} />

      {/* Quick Resources */}
      <QuickResourcesPreview locale={locale} entityCui={entityCui} />

      {!isSubscriptionStatsLoading && !isSubscriptionStatsError && perUat.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-2">
            {locale === 'en' ? 'Most followed localities' : 'Localități cu cei mai mulți abonați'}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {perUat.slice(0, 6).map((entry, index) => (
              <div
                key={entry.sirutaCode}
                className="rounded-2xl border border-border/50 bg-muted/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {locale === 'en' ? `Top ${index + 1}` : `Top ${index + 1}`}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {entry.uatName}
                    </p>
                  </div>
                  <SubscriptionCounter
                    count={entry.count}
                    label={locale === 'en' ? 'subscribers' : 'abonați'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Other Modules — flat, no collapsible */}
      {otherModulesData.length > 0 && (
        <div className="space-y-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-2">
            {t`Up Next`}
          </h2>
          <div className="space-y-8">
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

      <div className="border-t border-border/50 pt-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {locale === 'en' ? 'Read the campaign ' : 'Consultă '}
          <Link
            to={CAMPAIGN_TERMS_PATH}
            className="font-medium text-foreground underline decoration-[#3565c4] underline-offset-4 transition-colors hover:text-[#3565c4]"
          >
            {locale === 'en' ? 'terms and conditions' : 'termenii și condițiile campaniei'}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

function CompactParticipantsSummary({
  currentCount,
  totalCount,
  locale,
}: {
  readonly currentCount: number | null
  readonly totalCount: number
  readonly locale: ChallengeLocale
}) {
  const formattedCurrentCount =
    currentCount == null
      ? '—'
      : currentCount.toLocaleString(locale === 'en' ? 'en-US' : 'ro-RO')
  const formattedTotalCount = totalCount.toLocaleString(
    locale === 'en' ? 'en-US' : 'ro-RO',
  )

  return (
    <span className="inline-flex flex-col items-start gap-0.5 border-l border-border/70 pl-3 sm:items-end sm:pl-4">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
        {locale === 'en' ? 'Participants here' : 'Participanți în această primărie'}
      </span>
      <span className="tabular-nums text-lg font-black tracking-tight text-foreground sm:text-xl">
        {formattedCurrentCount}
      </span>
      <span className="text-sm font-medium tracking-tight text-muted-foreground">
        {locale === 'en'
          ? `${formattedTotalCount} in campaign`
          : `${formattedTotalCount} în campanie`}
      </span>
    </span>
  )
}
