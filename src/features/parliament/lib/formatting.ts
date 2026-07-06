import type {
  ParliamentMember,
  MemberVoteChoice,
  VoteOutcome,
  VoteType,
} from '@/schemas/parliament'

export function formatMemberName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

export function formatMemberMandatePeriod(
  mandateStart?: string,
  mandateEnd?: string,
): string {
  if (!mandateStart) {
    return 'Prezent'
  }

  const start = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(mandateStart))

  if (!mandateEnd) {
    return `${start} – Prezent`
  }

  const end = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(mandateEnd))

  return `${start} – ${end}`
}

export function getChamberLabel(chamber: 'camera' | 'senat'): string {
  switch (chamber) {
    case 'camera':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senat'
  }
}

export function getChamberShortLabel(chamber: 'camera' | 'senat'): string {
  return chamber === 'camera' ? 'Camera' : 'Senat'
}

export function getMemberChamberRoleLabel(chamber: 'camera' | 'senat'): string {
  return chamber === 'camera' ? 'deputat' : 'senator'
}

export function formatMemberSalutation(member: ParliamentMember): string {
  return member.lastName
}

export function getVoteTypeLabel(voteType: VoteType): string {
  return voteType === 'deschis' ? 'Vot deschis' : 'Vot secret'
}

export function getMemberVoteChoiceLabel(choice: MemberVoteChoice): string {
  switch (choice) {
    case 'pentru':
      return 'Pentru'
    case 'impotriva':
      return 'Împotrivă'
    case 'abtinere':
      return 'Abținere'
    case 'nu_a_votat':
      return 'Nu a votat'
  }
}

export function getOutcomeVariant(
  outcome: VoteOutcome,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (outcome) {
    case 'adoptat':
      return 'default'
    case 'respins':
      return 'destructive'
    case 'amânat':
      return 'secondary'
  }
}

export function getOutcomeLabel(outcome: VoteOutcome): string {
  switch (outcome) {
    case 'adoptat':
      return 'Adoptat'
    case 'respins':
      return 'Respins'
    case 'amânat':
      return 'Amânat'
  }
}

/** Accent / border color for vote cards — adoptat vs respins vs amânat */
export function getVoteOutcomeAccentColor(outcome: VoteOutcome): string {
  switch (outcome) {
    case 'adoptat':
      return '#006435'
    case 'respins':
      return '#9C051A'
    case 'amânat':
      return '#505a5f'
  }
}

/** Left accent on member result cards — by individual vote choice */
export function getVoteChoiceAccentColor(choice: MemberVoteChoice): string {
  switch (choice) {
    case 'pentru':
      return '#006435'
    case 'impotriva':
      return '#9C051A'
    case 'abtinere':
      return '#505a5f'
    case 'nu_a_votat':
      return '#b1b4b6'
  }
}

export function formatVoteDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate))
}

/**
 * Format ONLY the calendar date of an ISO value ("20 martie 2026"), pinned to
 * UTC on the date part. Vote `heldAt` values are date-only timestamps stamped
 * `T00:00:00+03:00` — formatting them in browser-local time shifts the day for
 * users west of Bucharest (a UTC browser shows 19 March for a 20 March vote).
 */
export function formatVoteDayLong(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`))
}

export function formatSyncDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(isoDate))
}

/** Share of chamber seats highlighted by the current filters. */
export function formatSeatSharePercent(
  activeCount: number,
  totalSeats: number,
): string {
  if (totalSeats <= 0) {
    return '—'
  }

  const ratio = activeCount / totalSeats
  const percent = ratio * 100
  const maximumFractionDigits = ratio > 0 && ratio < 0.01 ? 1 : 0

  return `${new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(percent)}%`
}

export function formatVoteDivisionMeta(
  vote: { readonly heldAt: string },
  divisionNumber: number,
): string {
  const formatted = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(vote.heldAt))

  return `Divizare ${divisionNumber}: ${formatted}`
}

export function formatBillUpdatedAt(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

export function formatBillDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
