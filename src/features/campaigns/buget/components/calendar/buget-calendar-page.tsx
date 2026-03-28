import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { BUDGET_PUBLICATION_DATE_INTERACTION } from '../../civic-interaction-definitions'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import { useCampaignTimeline } from '../../hooks/use-campaign-timeline'
import { getCampaignText, getCampaignUatOverrideForCui } from '../../hooks/use-campaign-content'
import { buildCampaignProvocariPath } from '@/features/challenges/constants'
import type { CampaignLocale, CampaignTimelineEntry } from '../../types'
import type { BudgetPublicationDateValue } from '../interactive/types'

type BugetCalendarPageProps = {
  readonly locale: CampaignLocale
  readonly entityCui: string
}

type MilestoneState = 'closed' | 'current' | 'future'

type PageContent = {
  readonly heading: string
  readonly footnotes: readonly string[]
}

const PAGE_CONTENT: Record<CampaignLocale, PageContent> = {
  ro: {
    heading: 'Calendar bugetar',
    footnotes: [
      'Termenul total este de 45 de zile calendaristice de la publicarea bugetului de stat (Art. 39, Legea 273/2006).',
      'Zilele calendaristice includ weekendurile si sarbatorile legale.',
      'Estimat: datele marcate cu „estimat" sunt calculate pe baza termenelor legale maxime. In practica, daca primaria publica proiectul de buget mai devreme de termenul maxim, toate etapele urmatoare se muta corespunzator. Datele exacte depind de fiecare primarie in parte.',
    ],
  },
  en: {
    heading: 'Budget calendar',
    footnotes: [
      'The total deadline is 45 calendar days from state budget publication (Art. 39, Law 273/2006).',
      'Calendar days include weekends and public holidays.',
      'Estimated: dates marked "estimated" are calculated based on the maximum legal deadlines. In practice, if the city hall publishes the draft budget before the maximum deadline, all subsequent steps shift earlier accordingly. Exact dates depend on each city hall.',
    ],
  },
}

const EXPLANATION_TEXT = {
  default: {
    ro: 'Termenele de mai jos sunt termenele legale maxime conform Art. 39 din Legea 273/2006. In practica, daca primaria publica proiectul de buget mai devreme, toate etapele urmatoare se muta corespunzator.',
    en: 'The deadlines below are the legal maximums per Art. 39 of Law 273/2006. In practice, if the city hall publishes the draft budget earlier, all subsequent steps shift accordingly.',
  },
  personalized: {
    ro: 'Calendarul de mai jos este personalizat pe baza datelor disponibile pentru primaria selectata. Etapele marcate cu „estimat" sunt calculate pe baza termenelor legale maxime.',
    en: 'The calendar below is personalized based on available data for the selected city hall. Steps marked with "estimated" are calculated based on maximum legal deadlines.',
  },
}

const ESTIMATED_LABEL: Record<CampaignLocale, string> = {
  ro: 'estimat',
  en: 'estimated',
}

const BACK_LABEL: Record<CampaignLocale, string> = {
  ro: 'Inapoi la provocari',
  en: 'Back to challenges',
}

const MILESTONE_FOOTNOTES: Record<string, { readonly ro: string; readonly en: string }> = {
  'publicare-buget-de-stat': {
    ro: 'Ziua 0 — momentul de referinta pentru toate termenele.',
    en: 'Day 0 — the reference point for all deadlines.',
  },
  'publicare-proiect-buget-local': {
    ro: 'Termen maxim: 15 zile calendaristice de la bugetul de stat. Din aceasta zi curg cele 15 zile de contestatii.',
    en: 'Maximum deadline: 15 calendar days from state budget. The 15-day objection period starts from this day.',
  },
  'inchidere-contestatii': {
    ro: '15 zile calendaristice de la publicarea proiectului de buget.',
    en: '15 calendar days from draft budget publication.',
  },
  'depunere-spre-aprobare': {
    ro: 'Maximum 5 zile de la expirarea termenului de contestatii.',
    en: 'Within 5 days after the objection deadline.',
  },
  'vot-aprobare-buget-local': {
    ro: 'Termen maxim: 45 de zile calendaristice de la bugetul de stat (Art. 39, Legea 273/2006).',
    en: 'Maximum deadline: 45 calendar days from state budget (Art. 39, Law 273/2006).',
  },
}

const CURRENT_LABEL: Record<CampaignLocale, string> = {
  ro: 'Etapa curenta',
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

function formatDate(dateStr: string, locale: CampaignLocale): string {
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

function formatShortDate(dateStr: string, locale: CampaignLocale): string {
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
  return `${day} ${monthNames[date.getMonth()]}`
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000
  const dateA = new Date(a + 'T00:00:00')
  const dateB = new Date(b + 'T00:00:00')
  return Math.round((dateB.getTime() - dateA.getTime()) / msPerDay)
}

function formatDuration(days: number, locale: CampaignLocale): string {
  if (locale === 'ro') return `${days} zile`
  return `${days} days`
}

export function BugetCalendarPage({ locale, entityCui }: BugetCalendarPageProps) {
  const adminOverride = useMemo(() => getCampaignUatOverrideForCui(entityCui), [entityCui])

  const userPublicationDate = useCustomInteraction<BudgetPublicationDateValue>({
    lessonId: BUDGET_PUBLICATION_DATE_INTERACTION.ownerChallengeSlug,
    interactionId: BUDGET_PUBLICATION_DATE_INTERACTION.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  const mergedOverride = useMemo(() => {
    const base = adminOverride ?? {}
    if (!base['publicare-proiect-buget-local'] && userPublicationDate.savedValue?.publicationDate) {
      return { ...base, 'publicare-proiect-buget-local': userPublicationDate.savedValue.publicationDate }
    }
    return Object.keys(base).length > 0 ? base : undefined
  }, [adminOverride, userPublicationDate.savedValue?.publicationDate])

  const isPersonalized = Boolean(mergedOverride)
  const timeline = useCampaignTimeline(mergedOverride)
  const backLinkSearch: Record<string, string> = {}
  if (locale === 'en') backLinkSearch.lang = 'en'
  const { entries } = timeline
  const content = PAGE_CONTENT[locale]

  const explanationText = isPersonalized
    ? EXPLANATION_TEXT.personalized[locale]
    : EXPLANATION_TEXT.default[locale]

  const states = entries.map((entry, i) => getMilestoneState(entry, i, entries))

  return (
    <section className="mx-auto max-w-2xl animate-in fade-in duration-700 px-4 py-6 sm:px-6 sm:py-10">
      {/* Back */}
      <Link
        to={buildCampaignProvocariPath(entityCui) as '/'}
        search={backLinkSearch}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {BACK_LABEL[locale]}
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {content.heading}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {explanationText}
        </p>
      </div>

      {/* Timeline */}
      <div>
        {entries.map((entry, index) => {
          const state = states[index]
          const isLast = index === entries.length - 1
          const footnote = MILESTONE_FOOTNOTES[entry.id]
          const prevDate = index > 0 ? entries[index - 1].computedDate : null

          return (
            <div key={entry.id} className="flex">
              {/* Left bar */}
              <div className="relative mr-6 flex flex-col items-center w-px">
                <div
                  className={`w-full flex-1 ${
                    state === 'closed'
                      ? 'bg-foreground/25'
                      : state === 'current'
                        ? 'bg-primary'
                        : 'bg-border'
                  }`}
                />
                {isLast && <div className="w-full h-4" />}
              </div>

              {/* Content */}
              <div className={`min-w-0 flex-1 pb-10 ${isLast ? 'pb-0' : ''}`}>
                <MilestoneContent
                  entry={entry}
                  state={state}
                  footnote={footnote}
                  locale={locale}
                  prevDate={prevDate}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footnotes */}
      <div className="mt-12 pt-6 border-t border-border/40">
        <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground/60">
          {content.footnotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────── */

function MilestoneContent({
  entry,
  state,
  footnote,
  locale,
  prevDate,
}: {
  readonly entry: CampaignTimelineEntry
  readonly state: MilestoneState
  readonly footnote?: { readonly ro: string; readonly en: string }
  readonly locale: CampaignLocale
  readonly prevDate: string | null
}) {
  const [open, setOpen] = useState(state === 'current')
  const isClosed = state === 'closed'
  const days = prevDate ? daysBetween(prevDate, entry.computedDate) : 0

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Date row */}
      <div className={`flex items-center gap-1.5 text-sm tabular-nums ${
        isClosed ? 'text-muted-foreground/50' : 'text-foreground/70'
      }`}>
        {prevDate ? (
          <>
            <span>{formatShortDate(prevDate, locale)}</span>
            <span className={isClosed ? 'text-muted-foreground/30' : 'text-muted-foreground/40'}>–</span>
            <time dateTime={entry.computedDate}>
              {formatShortDate(entry.computedDate, locale)}
            </time>
            <span className={isClosed ? 'text-muted-foreground/20' : 'text-muted-foreground/30'}>·</span>
            <span className={`text-xs ${
              isClosed
                ? 'text-muted-foreground/30'
                : state === 'current'
                  ? 'text-primary/70'
                  : 'text-muted-foreground/40'
            }`}>
              {formatDuration(days, locale)}
            </span>
          </>
        ) : (
          <time dateTime={entry.computedDate}>
            {formatDate(entry.computedDate, locale)}
          </time>
        )}
        {entry.isEstimated && (
          <span className={`text-[10px] font-medium uppercase tracking-wider ${
            isClosed ? 'text-muted-foreground/30' : 'text-muted-foreground/50'
          }`}>
            {ESTIMATED_LABEL[locale]}
          </span>
        )}
        {state === 'current' && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
            {CURRENT_LABEL[locale]}
          </span>
        )}
        {isClosed && (
          <Check className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={2.5} />
        )}
      </div>

      {/* Title */}
      <h2
        className={`mt-1 text-base font-bold leading-snug ${
          isClosed
            ? 'text-muted-foreground/50'
            : state === 'future'
              ? 'text-foreground/70'
              : 'text-foreground'
        }`}
      >
        {getCampaignText(entry.title, locale)}
      </h2>

      {/* Details toggle */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`mt-2 inline-flex items-center gap-0.5 text-xs font-medium transition-colors ${
            isClosed
              ? 'text-muted-foreground/30 hover:text-muted-foreground/50'
              : 'text-muted-foreground/50 hover:text-foreground'
          }`}
        >
          {DETAILS_LABEL[locale]}
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </CollapsibleTrigger>

      {/* Body */}
      <CollapsibleContent className="overflow-hidden">
        <div className="mt-3 space-y-2">
          <p className="text-sm leading-relaxed text-foreground/60">
            {getCampaignText(entry.description, locale)}
          </p>
          {footnote?.ro && (
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              {locale === 'en' ? (footnote.en ?? footnote.ro) : footnote.ro}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
