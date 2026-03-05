import { getCampaignChallengeList, getCampaignResources } from '../../hooks/use-campaign-content'
import { useCampaignTimeline } from '../../hooks/use-campaign-timeline'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import { CampaignCalendarSection } from './CampaignCalendarSection'
import { CampaignResourcesSection } from './CampaignResourcesSection'
import { CampaignChallengeListSection } from './CampaignChallengeListSection'
import { Button } from '@/components/ui/button'
import type { CampaignLocale } from '../../types'

type CampaignHubPageProps = {
  readonly locale: CampaignLocale
  readonly selectedEntityCui?: string
  readonly onChangeEntity: () => void
}

export function CampaignHubPage({
  locale,
  selectedEntityCui,
  onChangeEntity,
}: CampaignHubPageProps) {
  const { entries } = useCampaignTimeline()
  const { getChallengeStatus } = useCampaignProgress()

  const challengeList = getCampaignChallengeList()
  const resources = getCampaignResources()

  const completedChallenges = challengeList.filter((challenge) => getChallengeStatus(challenge.slug) === 'completed').length
  const selectedEntityLabel = locale === 'en' ? 'Selected entity CUI' : 'CUI entitate selectată'
  const pageTitle = locale === 'en' ? 'Campaign Hub' : 'Hub Campanie'
  const pageDescription =
    locale === 'en'
      ? 'Find the timeline, resources, and every challenge for Local Budgets 2026.'
      : 'Aici găsești calendarul, resursele și toate provocările pentru Bugete Locale 2026.'
  const progressLabel = locale === 'en' ? 'Progress' : 'Progres'
  const completedLabel = locale === 'en' ? 'completed' : 'completate'
  const changeEntityLabel = locale === 'en' ? 'Change entity' : 'Schimbă entitatea'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{pageTitle}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">{pageDescription}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
            {selectedEntityLabel}: {selectedEntityCui ?? '—'}
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {progressLabel}: {completedChallenges}/{challengeList.length} {completedLabel}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onChangeEntity}
          >
            {changeEntityLabel}
          </Button>
        </div>
      </section>

      <CampaignCalendarSection locale={locale} entries={entries} entityCui={selectedEntityCui} />
      <CampaignResourcesSection locale={locale} resources={resources} />
      <CampaignChallengeListSection locale={locale} challenges={challengeList} getChallengeStatus={getChallengeStatus} />
    </div>
  )
}
