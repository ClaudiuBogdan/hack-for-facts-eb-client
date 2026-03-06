import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowRight } from 'lucide-react'
import {
  buildCampaignCalendarPath,
  CAMPAIGN_BASE_PATH,
} from '@/features/campaigns/buget/constants'
import { useCampaignTimeline } from '@/features/campaigns/buget/hooks/use-campaign-timeline'
import { getCampaignText } from '@/features/campaigns/buget/hooks/use-campaign-content'
import type { ChallengeLocale } from '../../types'

type BudgetTimelineStripProps = {
  readonly locale: ChallengeLocale
  readonly entityCui?: string
}

export function BudgetTimelineStrip({ locale, entityCui }: BudgetTimelineStripProps) {
  const timeline = useCampaignTimeline()
  const { entries } = timeline

  // Count completed milestones for the progress line
  const closedCount = entries.filter((e) => e.isClosed).length

  const linkSearch: Record<string, string> = {}
  if (locale === 'en') linkSearch.lang = 'en'
  const calendarPath = entityCui
    ? buildCampaignCalendarPath(entityCui)
    : `${CAMPAIGN_BASE_PATH}/cauta`

  return (
    <Link
      to={calendarPath as '/'}
      search={linkSearch}
      className="block rounded-2xl bg-muted/20 p-5 hover:bg-muted/30 border border-border/30 transition-colors group"
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          {t`Budget Calendar`}
        </span>
        <span className="text-xs font-medium text-muted-foreground/60 group-hover:text-primary transition-colors flex items-center gap-1">
          {t`View`}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-[9px] left-0 right-0 h-[2px] bg-muted-foreground/15" />
        {/* Progress fill */}
        {closedCount > 0 && (
          <div
            className="absolute top-[9px] left-0 h-[2px] bg-primary transition-all duration-500"
            style={{
              width:
                closedCount >= entries.length
                  ? '100%'
                  : `${((closedCount - 0.5) / (entries.length - 1)) * 100}%`,
            }}
          />
        )}

        {/* Milestone dots */}
        <div className="relative flex justify-between">
          {entries.map((entry, index) => {
            const isCurrent = !entry.isClosed && (index === 0 || entries[index - 1].isClosed)
            const formattedDate = formatShortDate(entry.computedDate, locale)

            return (
              <div key={entry.id} className="flex flex-col items-center text-center">
                {/* Dot */}
                <div
                  className={`h-[18px] w-[18px] rounded-full border-2 flex-shrink-0 ${
                    entry.isClosed
                      ? 'bg-primary border-primary'
                      : isCurrent
                        ? 'bg-primary border-primary ring-4 ring-primary/20'
                        : 'bg-background border-muted-foreground/30'
                  }`}
                />
                {/* Label */}
                <span className="mt-2 text-[10px] md:text-xs font-semibold text-foreground/80 line-clamp-2 max-w-[80px]">
                  {getCampaignText(entry.title, locale)}
                </span>
                {/* Date */}
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {formattedDate}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

function formatShortDate(dateStr: string, locale: ChallengeLocale): string {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDate()
  const monthNames =
    locale === 'ro'
      ? ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${monthNames[date.getMonth()]}`
}
