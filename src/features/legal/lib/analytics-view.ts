import { t } from '@lingui/core/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { LegalAnalyticsCount, LegalAnalyticsLens } from '@/schemas/legal-analytics'
import { type Ranked } from './analytics-format'
import { FAMILY_LABEL, GROUP_LABEL, KIND_LABEL, TYPE_LABEL, VERSIONS_LABEL, labelOf } from './analytics-labels'
import { readQuestion, searchOfQuestion, type Question } from './analytics-question'

/** The question and the way to change it: every control writes the address. */
export function useQuestion(): readonly [Question, (next: Question) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const question = readQuestion(search)
  const move = (next: Question) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => {
        const out: Record<string, unknown> = { ...previous }
        for (const [k, v] of Object.entries(searchOfQuestion(next))) {
          if (v === undefined) delete out[k]
          else out[k] = v
        }
        return out
      },
      replace: false,
      resetScroll: false,
    })
  return [question, move] as const
}

/** A lens value's label, by the API lens it came from. */
export function labelOfKey(lens: LegalAnalyticsLens, key: string | null): string {
  switch (lens) {
    case 'felul':
      return labelOf(GROUP_LABEL, key, t`neîncadrate`)
    case 'kind':
      return labelOf(KIND_LABEL, key, t`neîncadrate`)
    case 'issuer':
      return key ?? t`fără emitent`
    case 'family':
      return labelOf(FAMILY_LABEL, key, t`fără emitent`)
    case 'type':
      return labelOf(TYPE_LABEL, key, t`tip nerecunoscut`)
    case 'versions':
      return key === null ? '—' : (VERSIONS_LABEL[Number(key)] ?? key)
    case 'year':
      return key ?? t`an necunoscut`
  }
}

/** Ranked rows with each value's share of the selection, computed here from the counts. */
export function rankedOf(lens: LegalAnalyticsLens, rows: readonly LegalAnalyticsCount[], total: number): Ranked[] {
  return rows.map((r) => ({
    key: r.key ?? '',
    label: labelOfKey(lens, r.key),
    n: r.acts,
    share: total ? r.acts / total : 0,
  }))
}
