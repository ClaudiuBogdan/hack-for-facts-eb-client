import type { CampaignEntityPublicConfigValues, CampaignEntityPublicDebate } from '../schemas/campaign-entity-public-config'
import type { CampaignTimelineDefinition } from '../types'

export const DEBATE_REQUEST_GLOBAL_DEADLINE_TIMELINE_ENTRY_ID = 'inchidere-contestatii' as const
export const CAMPAIGN_TIME_ZONE = 'Europe/Bucharest' as const

export type DebateRequestAvailabilityStatus =
  | 'open'
  | 'closed_debate_took_place'
  | 'closed_deadline_expired'
  | 'closed_global_period_expired'

export type DebateRequestAvailability = {
  readonly status: DebateRequestAvailabilityStatus
  readonly publicationDate: string | null
  readonly requestDeadlineDate: string | null
  readonly globalDeadlineDate: string
  readonly publicDebate: CampaignEntityPublicDebate | null
}

type ResolveDebateRequestAvailabilityParams = {
  readonly now: Date
  readonly publicConfigValues?: CampaignEntityPublicConfigValues | null
  readonly staticPublicationDate?: string | null
  readonly globalDeadlineDate: string
}

function parseDateOnlyParts(date: string): { year: number; monthIndex: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  }
}

function parseTimeParts(time: string): { hours: number; minutes: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) {
    return null
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  }
}

function toUtcDateOnlyString(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toCampaignDateOnlyString(date: Date): string {
  const parts = getZonedDateParts(date, CAMPAIGN_TIME_ZONE)
  if (!parts) {
    return toUtcDateOnlyString(date)
  }

  const year = parts.year
  const month = String(parts.monthIndex + 1).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addCalendarDays(date: string, days: number): string | null {
  const parts = parseDateOnlyParts(date)
  if (!parts) {
    return null
  }

  const utcDate = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day + days))
  return toUtcDateOnlyString(utcDate)
}

function compareDateOnly(left: string, right: string): number {
  return left.localeCompare(right)
}

function getZonedDateParts(
  date: Date,
  timeZone: string,
): {
    readonly year: number
    readonly monthIndex: number
    readonly day: number
    readonly hours: number
    readonly minutes: number
    readonly seconds: number
  } | null {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const values = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)] as const),
  )
  const year = values.get('year')
  const month = values.get('month')
  const day = values.get('day')
  const hours = values.get('hour')
  const minutes = values.get('minute')
  const seconds = values.get('second')

  if (
    year === undefined
    || month === undefined
    || day === undefined
    || hours === undefined
    || minutes === undefined
    || seconds === undefined
  ) {
    return null
  }

  return {
    year,
    monthIndex: month - 1,
    day,
    hours,
    minutes,
    seconds,
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone)
  if (!parts) {
    return 0
  }

  const zonedTimeAsUtc = Date.UTC(
    parts.year,
    parts.monthIndex,
    parts.day,
    parts.hours,
    parts.minutes,
    parts.seconds,
  )
  return zonedTimeAsUtc - date.getTime()
}

function combineCampaignDateTime(date: string, time: string): Date | null {
  const dateParts = parseDateOnlyParts(date)
  const timeParts = parseTimeParts(time)
  if (!dateParts || !timeParts) {
    return null
  }

  const utcGuess = new Date(Date.UTC(
    dateParts.year,
    dateParts.monthIndex,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
  ))
  const initialOffset = getTimeZoneOffsetMs(utcGuess, CAMPAIGN_TIME_ZONE)
  const initialCandidate = new Date(utcGuess.getTime() - initialOffset)
  const correctedOffset = getTimeZoneOffsetMs(initialCandidate, CAMPAIGN_TIME_ZONE)
  return new Date(utcGuess.getTime() - correctedOffset)
}

export function computeTimelineEntryDefaultDate(
  timeline: CampaignTimelineDefinition,
  entryId: string,
): string | null {
  const resolvedDates = new Map<string, string>()

  for (const entry of timeline.entries) {
    const baseDate =
      entry.relativeTo && entry.relativeDayOffset !== undefined
        ? resolvedDates.get(entry.relativeTo)
        : timeline.anchorDate
    const dayOffset =
      entry.relativeTo && entry.relativeDayOffset !== undefined
        ? entry.relativeDayOffset
        : entry.dayOffset
    const computedDate = baseDate ? addCalendarDays(baseDate, dayOffset) : null

    if (computedDate) {
      resolvedDates.set(entry.id, computedDate)
    }

    if (entry.id === entryId) {
      return computedDate
    }
  }

  return null
}

export function resolveDebateRequestPublicationDate(params: {
  readonly publicConfigValues?: CampaignEntityPublicConfigValues | null
  readonly staticPublicationDate?: string | null
}): string | null {
  return params.publicConfigValues?.budgetPublicationDate
    ?? params.staticPublicationDate
    ?? null
}

export function resolveDebateRequestAvailability({
  now,
  publicConfigValues,
  staticPublicationDate,
  globalDeadlineDate,
}: ResolveDebateRequestAvailabilityParams): DebateRequestAvailability {
  const publicDebate = publicConfigValues?.public_debate ?? null
  const configuredDebateDate = publicDebate
    ? combineCampaignDateTime(publicDebate.date, publicDebate.time)
    : null
  const publicationDate = resolveDebateRequestPublicationDate({
    publicConfigValues,
    staticPublicationDate,
  })
  const requestDeadlineDate = publicationDate
    ? addCalendarDays(publicationDate, 15)
    : null

  if (configuredDebateDate && configuredDebateDate < now) {
    return {
      status: 'closed_debate_took_place',
      publicationDate,
      requestDeadlineDate,
      globalDeadlineDate,
      publicDebate,
    }
  }

  const currentDate = toCampaignDateOnlyString(now)

  if (
    publicationDate
    && requestDeadlineDate
    && compareDateOnly(currentDate, requestDeadlineDate) > 0
  ) {
    return {
      status: 'closed_deadline_expired',
      publicationDate,
      requestDeadlineDate,
      globalDeadlineDate,
      publicDebate,
    }
  }

  if (!publicationDate && compareDateOnly(currentDate, globalDeadlineDate) > 0) {
    return {
      status: 'closed_global_period_expired',
      publicationDate,
      requestDeadlineDate,
      globalDeadlineDate,
      publicDebate,
    }
  }

  return {
    status: 'open',
    publicationDate,
    requestDeadlineDate,
    globalDeadlineDate,
    publicDebate,
  }
}

export function recheckDebateRequestAvailability(
  availability: DebateRequestAvailability,
  now: Date,
): DebateRequestAvailability {
  return resolveDebateRequestAvailability({
    now,
    publicConfigValues: {
      budgetPublicationDate: availability.publicationDate,
      officialBudgetUrl: null,
      public_debate: availability.publicDebate,
    },
    staticPublicationDate: null,
    globalDeadlineDate: availability.globalDeadlineDate,
  })
}
