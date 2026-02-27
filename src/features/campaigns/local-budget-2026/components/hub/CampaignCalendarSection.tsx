import { getCampaignText } from '../../hooks/use-campaign-content'
import type { CampaignLocale, CampaignTimelineEntry } from '../../types'

type CampaignCalendarSectionProps = {
  readonly locale: CampaignLocale
  readonly entries: readonly CampaignTimelineEntry[]
}

export function CampaignCalendarSection({ locale, entries }: CampaignCalendarSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Calendar bugetar</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Etapele cheie pentru ciclul local de bugetare.
      </p>

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
                Termen depășit
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
