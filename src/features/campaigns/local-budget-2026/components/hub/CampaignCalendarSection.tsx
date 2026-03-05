import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { getCampaignText } from '../../hooks/use-campaign-content'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import type { CampaignLocale, CampaignTimelineEntry } from '../../types'

type CampaignCalendarSectionProps = {
  readonly locale: CampaignLocale
  readonly entries: readonly CampaignTimelineEntry[]
  readonly entityCui?: string
}

export function CampaignCalendarSection({ locale, entries, entityCui }: CampaignCalendarSectionProps) {
  const linkSearch: Record<string, string> = {}
  if (locale === 'en') linkSearch.lang = 'en'
  if (entityCui) linkSearch.entityCui = entityCui

  const heading = locale === 'en' ? 'Budget calendar' : 'Calendar bugetar'
  const subtitle =
    locale === 'en'
      ? 'Key milestones in the local budget cycle.'
      : 'Etapele cheie pentru ciclul local de bugetare.'
  const closedLabel = locale === 'en' ? 'Deadline passed' : 'Termen depășit'

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{heading}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>

      <ol className="mt-6 space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{getCampaignText(entry.title, locale)}</h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{entry.computedDate}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{getCampaignText(entry.description, locale)}</p>
            {entry.isClosed ? (
              <span className="mt-2 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {closedLabel}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-4 text-right">
        <Link
          to={`${CAMPAIGN_BASE_PATH}/calendar` as '/'}
          search={linkSearch}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {locale === 'en' ? 'View full calendar' : 'Vezi calendarul complet'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}
