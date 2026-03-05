import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  FileEdit,
  Clock,
  Send,
  Gavel,
  Check,
  ChevronDown,
  Info,
  ArrowLeft,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { useCampaignTimeline } from '../../hooks/use-campaign-timeline'
import { getCampaignText, getCampaignUatOverrideForCui } from '../../hooks/use-campaign-content'
import { CHALLENGES_BASE_PATH } from '@/features/challenges/constants'
import type { CampaignLocale, CampaignTimelineEntry } from '../../types'

type CampaignCalendarPageProps = {
  readonly locale: CampaignLocale
  readonly entityCui?: string
}

type MilestoneState = 'closed' | 'current' | 'future'

type PageContent = {
  readonly heading: string
  readonly footnotes: readonly string[]
}

type MilestoneExtra = {
  readonly icon: LucideIcon
  readonly footnote: { readonly ro: string; readonly en: string }
}

const PAGE_CONTENT: Record<CampaignLocale, PageContent> = {
  ro: {
    heading: 'Calendar bugete locale 2026',
    footnotes: [
      'Termenul total este de 45 de zile calendaristice de la publicarea bugetului de stat.',
      'Zilele calendaristice includ weekendurile și sărbătorile legale.',
    ],
  },
  en: {
    heading: 'Local budgets calendar 2026',
    footnotes: [
      'The total deadline is 45 calendar days from state budget publication.',
      'Calendar days include weekends and public holidays.',
    ],
  },
}

const EXPLANATION_TEXT = {
  default: {
    ro: 'Termenele de mai jos sunt termenele legale maxime conform Art. 39 din Legea 273/2006. În practică, dacă primăria publică proiectul de buget mai devreme de termenul maxim, toate etapele următoare (contestații, aprobare) se mută corespunzător mai devreme. Datele exacte depind de fiecare primărie în parte.',
    en: 'The deadlines below are the legal maximums per Art. 39 of Law 273/2006. In practice, if the city hall publishes the draft budget before the maximum deadline, all subsequent steps (objections, approval) shift earlier accordingly. Exact dates depend on each city hall.',
  },
  personalized: {
    ro: 'Calendarul de mai jos este personalizat pe baza datelor disponibile pentru primăria selectată. Etapele marcate cu „estimat" sunt calculate pe baza termenelor legale maxime.',
    en: 'The calendar below is personalized based on available data for the selected city hall. Steps marked with "estimated" are calculated based on maximum legal deadlines.',
  },
}

const ESTIMATED_LABEL: Record<CampaignLocale, string> = {
  ro: 'estimat',
  en: 'estimated',
}

const BACK_LABEL: Record<CampaignLocale, string> = {
  ro: 'Înapoi la provocări',
  en: 'Back to challenges',
}

const MILESTONE_EXTRAS: Record<string, MilestoneExtra> = {
  'publicare-buget-de-stat': {
    icon: BookOpen,
    footnote: {
      ro: 'Ziua 0 — momentul de referință pentru toate termenele.',
      en: 'Day 0 — the reference point for all deadlines.',
    },
  },
  'publicare-proiect-buget-local': {
    icon: FileEdit,
    footnote: {
      ro: 'Termen maxim: 15 zile calendaristice de la bugetul de stat. Din această zi curg cele 15 zile de contestații.',
      en: 'Maximum deadline: 15 calendar days from state budget. The 15-day objection period starts from this day.',
    },
  },
  'inchidere-contestatii': {
    icon: Clock,
    footnote: {
      ro: '15 zile calendaristice de la publicarea proiectului de buget.',
      en: '15 calendar days from draft budget publication.',
    },
  },
  'depunere-spre-aprobare': {
    icon: Send,
    footnote: {
      ro: 'Maximum 5 zile de la expirarea termenului de contestații.',
      en: 'Within 5 days after the objection deadline.',
    },
  },
  'vot-aprobare-buget-local': {
    icon: Gavel,
    footnote: {
      ro: 'Termen maxim: 45 de zile calendaristice de la bugetul de stat (Art. 39, Legea 273/2006).',
      en: 'Maximum deadline: 45 calendar days from state budget (Art. 39, Law 273/2006).',
    },
  },
}

const CURRENT_LABEL: Record<CampaignLocale, string> = {
  ro: 'Etapă curentă',
  en: 'Current stage',
}

const DETAILS_LABEL: Record<CampaignLocale, string> = {
  ro: 'Detalii',
  en: 'Details',
}

function getMilestoneState(
  entry: CampaignTimelineEntry,
  index: number,
  entries: readonly CampaignTimelineEntry[],
): MilestoneState {
  if (entry.isClosed) return 'closed'
  if (index === 0 || entries[index - 1].isClosed) return 'current'
  return 'future'
}

function formatMilestoneDate(dateStr: string, locale: CampaignLocale): string {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDate()
  const monthNames =
    locale === 'ro'
      ? [
          'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
          'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
        ]
      : [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ]
  return `${day} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

/** Icon size in px — keep in sync with the Tailwind classes below. */
const ICON_SIZE_PX = 30

export function CampaignCalendarPage({ locale, entityCui }: CampaignCalendarPageProps) {
  const uatOverride = entityCui ? getCampaignUatOverrideForCui(entityCui) : undefined
  const isPersonalized = Boolean(uatOverride)
  const timeline = useCampaignTimeline(uatOverride)
  const backLinkSearch: Record<string, string> = {}
  if (locale === 'en') backLinkSearch.lang = 'en'
  const { entries } = timeline
  const content = PAGE_CONTENT[locale]

  const explanationText = isPersonalized
    ? EXPLANATION_TEXT.personalized[locale]
    : EXPLANATION_TEXT.default[locale]

  const states = entries.map((entry, i) => getMilestoneState(entry, i, entries))

  return (
    <section className="mx-auto max-w-3xl animate-in fade-in duration-700 px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {content.heading}
        </h1>

        {/* Explanation */}
        <div className="mt-4 flex gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {explanationText}
          </p>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div>
        {entries.map((entry, index) => {
          const state = states[index]
          const isFirst = index === 0
          const isLast = index === entries.length - 1
          const extra = MILESTONE_EXTRAS[entry.id] ?? {
            icon: BookOpen,
            footnote: { ro: '', en: '' },
          }

          // Top connector: colored if the previous milestone is closed
          const topSegmentFilled = !isFirst && entries[index - 1].isClosed
          // Bottom connector: colored if this milestone is closed
          const bottomSegmentFilled = !isLast && entry.isClosed

          return (
            <div key={entry.id} className="flex gap-4 sm:gap-5">
              {/* ── Left rail: icon pinned to top, connector below ── */}
              <div
                className="relative flex flex-col items-center"
                style={{ width: ICON_SIZE_PX }}
              >
                {/* Top connector: thin segment from top of row to icon center */}
                {!isFirst && (
                  <div
                    className={`absolute left-1/2 top-0 -translate-x-1/2 w-0.5 ${
                      topSegmentFilled ? 'bg-primary' : 'bg-border'
                    }`}
                    /* height = half icon + the pt-1 (4px) offset */
                    style={{ height: ICON_SIZE_PX / 2 + 4 }}
                  />
                )}

                {/* Icon — aligned with title via pt-1 */}
                <div className="relative z-10 shrink-0 pt-1">
                  <MilestoneIcon state={state} icon={extra.icon} />
                </div>

                {/* Bottom connector: from icon center to bottom of row */}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 ${
                      bottomSegmentFilled ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>

              {/* ── Right: content ── */}
              <div
                className={`min-w-0 flex-1 pb-8 ${isLast ? 'pb-0' : ''} ${
                  state === 'closed' ? 'opacity-55' : ''
                }`}
              >
                <MilestoneContent
                  entry={entry}
                  state={state}
                  extra={extra}
                  locale={locale}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* General Footnotes */}
      <div className="mt-10 rounded-2xl border bg-muted/20 p-5">
        <h3 className="text-sm font-semibold text-foreground">
          {locale === 'en' ? 'Notes' : 'Note'}
        </h3>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
          {content.footnotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ol>
      </div>

      {/* Bottom back button */}
      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline" className="rounded-full">
          <Link to={`${CHALLENGES_BASE_PATH}` as '/'} search={backLinkSearch}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {BACK_LABEL[locale]}
          </Link>
        </Button>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────── */

function MilestoneIcon({
  state,
  icon: Icon,
}: {
  readonly state: MilestoneState
  readonly icon: LucideIcon
}) {
  const base = 'flex shrink-0 items-center justify-center rounded-full h-[30px] w-[30px]'

  if (state === 'closed') {
    return (
      <div className={`${base} bg-primary text-primary-foreground`}>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
    )
  }

  if (state === 'current') {
    return (
      <div
        className={`${base} border-2 border-primary bg-background text-primary ring-[3px] ring-primary/15`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
    )
  }

  return (
    <div className={`${base} border-2 border-border bg-background text-muted-foreground/40`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────── */

function MilestoneContent({
  entry,
  state,
  extra,
  locale,
}: {
  readonly entry: CampaignTimelineEntry
  readonly state: MilestoneState
  readonly extra: MilestoneExtra
  readonly locale: CampaignLocale
}) {
  const [open, setOpen] = useState(state === 'current')
  const isClosed = state === 'closed'

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Title row */}
      <div className="flex items-center gap-2 pt-1">
        <h2
          className={`text-base font-bold sm:text-lg ${
            isClosed
              ? 'text-muted-foreground line-through decoration-muted-foreground/30 decoration-1'
              : 'text-foreground'
          }`}
        >
          {getCampaignText(entry.title, locale)}
        </h2>
        {state === 'current' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {CURRENT_LABEL[locale]}
          </span>
        )}
      </div>

      {/* Date + estimated badge */}
      <div className="mt-0.5 flex items-center gap-2">
        {entry.isEstimated && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {ESTIMATED_LABEL[locale]}
          </span>
        )}
        <time
          dateTime={entry.computedDate}
          className="text-sm text-muted-foreground"
        >
          {formatMilestoneDate(entry.computedDate, locale)}
        </time>
      </div>

      {/* Toggle */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary/70 hover:text-primary transition-colors"
        >
          {DETAILS_LABEL[locale]}
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </CollapsibleTrigger>

      {/* Expandable body */}
      <CollapsibleContent className="overflow-hidden">
        <div className="mt-2 space-y-1.5">
          <p className="text-sm leading-relaxed text-muted-foreground/80">
            {getCampaignText(entry.description, locale)}
          </p>
          {extra.footnote.ro && (
            <p className="text-xs italic text-muted-foreground/60">
              {locale === 'en'
                ? (extra.footnote.en ?? extra.footnote.ro)
                : extra.footnote.ro}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
