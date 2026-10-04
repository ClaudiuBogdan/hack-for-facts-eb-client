import { describe, expect, it } from 'vitest'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'
import { scopeChips, withoutChip } from './company-analytics-scope-text'

/**
 * A scope's filters in words: a consensus field's companies without a common
 * value named by why — never as „unknown" — and the ONRC observations of one
 * identifier said apart from the consensus fields, their exclusions as what
 * they are; each removable on its own.
 */

const SCOPE: CompanyAnalysisScope = {
  county: { in: ['(multiple_values)', 'CJ'], includeUnknown: true },
  observedStatus: { in: ['(partial_observations)'] },
  onrc: { status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: ['rev2:6201'], exclude: { status: ['1070'], caenCode: ['4711'] } },
}

describe('scopeChips', () => {
  it('names a consensus basis key by why, and every company without a value as such', () => {
    const chips = scopeChips(SCOPE, 'ro', { statuses: new Map([['1048', 'funcțiune']]) })
    expect(chips.find((chip) => chip.field === 'county')?.text).toBe('Cluj, Fără județ comun — valori diferite în înscrieri, fără județ comun (orice motiv)')
    expect(chips.find((chip) => chip.field === 'observedStatus')?.text).toBe('stare comună în ediția ONRC: Fără stare comună — observații incomplete')
    expect(chips.map((chip) => chip.text).join(' ')).not.toMatch(/necunoscut|\(multiple_values\)/u)
  })

  it('says the ONRC observations as one entry’s, the broad and the exact CAEN apart, and the exclusions as needing complete evidence', () => {
    const chips = scopeChips(SCOPE, 'ro', { statuses: new Map([['1048', 'funcțiune']]) }).filter((chip) => chip.field === 'onrc')
    expect(chips).toEqual([
      { field: 'onrc', part: 'match', text: 'aceeași înscriere ONRC: starea funcțiune · județul Cluj · CAEN 6201 (orice revizie) · CAEN exact rev2:6201' },
      { field: 'onrc', part: 'exclude', text: 'fără, după dovezi complete ONRC: starea 1070 · CAEN 4711' },
    ])
  })

  it('removes the observations or the exclusions alone, and the filter with the last of them', () => {
    const [match, exclude] = scopeChips(SCOPE, 'ro').filter((chip) => chip.field === 'onrc')
    expect(withoutChip(SCOPE, match!, 'ro').onrc).toEqual({ exclude: { status: ['1070'], caenCode: ['4711'] } })
    expect(withoutChip(SCOPE, exclude!, 'ro').onrc).toEqual({ status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: ['rev2:6201'] })
    expect(withoutChip({ onrc: { status: ['1048'] } }, match!, 'ro').onrc).toBeUndefined()
  })
})
