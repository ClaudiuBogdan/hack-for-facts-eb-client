import { t } from '@lingui/core/macro'
import { formatNumber, getUserLocale } from '@/lib/utils'
import type {
  JusticeConfidence,
  JusticeCourtLevel,
  JusticeDataStatus,
  JusticeLegalReferenceResolutionStatus,
  JusticeProvenance,
  JusticePublishablePartyKind,
} from '@/schemas/justice'

// ---------------------------------------------------------------------------
// Number / date formatting (locale-aware)
// ---------------------------------------------------------------------------

export function formatJusticeCount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return t`nedeterminat`
  }
  return formatNumber(value)
}

export function formatJusticeCountCompact(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return t`nedeterminat`
  }
  return formatNumber(value, 'compact')
}

/**
 * Formats an ISO date string as a localized date. Returns an em-dash when the
 * value is missing or unparseable so counts/dates never render "Invalid Date".
 */
export function formatJusticeDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  if (!value) {
    return '—'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }
  const locale = getUserLocale()
  return parsed.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', options)
}

export function formatJusticeYear(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  return String(value)
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return `${formatNumber(value, 'standard')}%`.replace(
    /\.0%/,
    `.${'0'.repeat(fractionDigits).slice(0, fractionDigits)}%`,
  )
}

// ---------------------------------------------------------------------------
// Label helpers (Lingui-marked)
// ---------------------------------------------------------------------------

export function getJusticeCourtLevelLabel(level: JusticeCourtLevel): string {
  switch (level) {
    case 'judecatorie':
      return t`Judecătorie`
    case 'tribunal':
      return t`Tribunal`
    case 'tribunal_militar':
      return t`Tribunal militar`
    case 'curte_de_apel':
      return t`Curte de apel`
    case 'curte_militara_apel':
      return t`Curte militară de apel`
    default: {
      const exhaustive: never = level
      return exhaustive
    }
  }
}

export function getJusticeDataStatusLabel(status: JusticeDataStatus): string {
  switch (status) {
    case 'live':
      return t`Date live`
    case 'mock':
      return t`Date demonstrative`
    case 'partial':
      return t`Date parțiale`
    case 'stale':
      return t`Date învechite`
    case 'gated':
      return t`În pregătire`
    case 'unverified':
      return t`Neverificat`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

export function getJusticePartyKindLabel(
  kind: JusticePublishablePartyKind,
): string {
  switch (kind) {
    case 'company':
      return t`Companie`
    case 'public_entity':
      return t`Instituție publică`
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

export function getJusticeConfidenceTierLabel(
  tier: JusticeConfidence['tier'],
): string {
  switch (tier) {
    case 'A':
      return t`Încredere ridicată`
    case 'B':
      return t`Încredere medie`
    case 'C':
      return t`Încredere scăzută`
    case 'D':
      return t`Încredere redusă`
    default: {
      const exhaustive: never = tier
      return exhaustive
    }
  }
}

export function getJusticeConfidenceStatusLabel(
  status: JusticeConfidence['validationStatus'],
): string {
  switch (status) {
    case 'candidate':
      return t`candidat`
    case 'needs_review':
      return t`necesită verificare`
    case 'rejected':
      return t`respins`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

export function getJusticeSourceLabel(
  source: JusticeProvenance['source'],
): string {
  switch (source) {
    case 'portal_just':
      return t`Portal Just (portal.just.ro)`
    case 'iccj':
      return t`ICCJ`
    case 'ccr':
      return t`Curtea Constituțională`
    case 'hudoc':
      return t`HUDOC (CEDO)`
    case 'just_ro':
      return t`Ministerul Justiției`
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function getJusticeLegalReferenceResolutionLabel(
  status: JusticeLegalReferenceResolutionStatus,
): string {
  switch (status) {
    case 'unique':
      return t`rezolvare unică`
    case 'ambiguous':
      return t`rezolvare ambiguă`
    case 'unresolved':
      return t`nerezolvat`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

// ---------------------------------------------------------------------------
// Case-number classifier (privacy: free text is never persisted)
// ---------------------------------------------------------------------------

/**
 * Recognizes Romanian case-number shapes like `NNNN/CC/YYYY` (with optional
 * extra segments) used by Portal Just. Non-matching input is left as free
 * text and MUST NOT be persisted to the URL by callers.
 */
const CASE_NUMBER_PATTERN = /^\d{1,6}(\/\d{1,6}){1,3}\/(19|20)\d{2}$/

export function looksLikeCaseNumber(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && CASE_NUMBER_PATTERN.test(trimmed)
}

// ---------------------------------------------------------------------------
// Provenance helpers
// ---------------------------------------------------------------------------

export function buildJusticeCoverageChips(
  _provenance: JusticeProvenance,
): readonly { readonly key: string; readonly label: string }[] {
  return [
    {
      key: 'dense-since',
      label: t`date dense din 2021`,
    },
    {
      key: 'no-iccj',
      label: t`fără ICCJ`,
    },
    {
      key: 'metadata-only',
      label: t`doar metadata`,
    },
    {
      key: 'no-documents',
      label: t`fără documente de dosar`,
    },
    {
      key: 'persons-named',
      label: t`fără nume de persoane`,
    },
  ]
}
