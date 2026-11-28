import { describe, expect, it } from 'vitest'
import type { ElectionResultTally } from '@/schemas/elections-results'
import { foldLines, leaderOf, lineOfCompetitor, normaliseLabel, total } from './lines'

const tally = (patch: Partial<ElectionResultTally> & { readonly competitor: ElectionResultTally['competitor'] }): ElectionResultTally => ({
  measure: 'mandates',
  allocationPhase: 'final',
  value: '1',
  status: 'UNCHECKED',
  issues: [],
  ...patch,
})
const party = (actorKey: string, value: string, status = 'UNCHECKED') => tally({ value, status, competitor: { kind: 'party', actorKey, label: actorKey.toUpperCase() } })

describe('lineOfCompetitor', () => {
  it('reads a party by its actor key and folds an unknown one into „Alte partide"', () => {
    expect(lineOfCompetitor({ kind: 'party', actorKey: 'partidul-social-democrat', label: 'PARTIDUL SOCIAL DEMOCRAT' })).toBe('psd')
    expect(lineOfCompetitor({ kind: 'party', actorKey: 'partidul-ecologist-roman', label: 'PARTIDUL ECOLOGIST ROMÂN' })).toBe('other')
  })

  it('reads the two alliances by their normalised ballot label, and no other list', () => {
    expect(normaliseLabel('ALIANȚA DREAPTA UNITĂ USR - PMP - FORȚA DREPTEI')).toBe('ALIANTA DREAPTA UNITA USR PMP FORTA DREPTEI')
    expect(lineOfCompetitor({ kind: 'list', actorKey: null, label: 'ALIANȚA DREAPTA UNITĂ USR - PMP - FORȚA DREPTEI' })).toBe('adu')
    expect(lineOfCompetitor({ kind: 'list', actorKey: null, label: 'Alianța Electorală PSD PNL' })).toBe('psdpnl')
    expect(lineOfCompetitor({ kind: 'list', actorKey: null, label: 'ALIANȚA ELECTORALĂ PSD-PUSL' })).toBe('other')
  })

  it('reads every independent as one line, whatever its key or label', () => {
    expect(lineOfCompetitor({ kind: 'independent', actorKey: 'partidul-social-democrat', label: 'A NAME' })).toBe('ind')
    expect(lineOfCompetitor({ kind: 'independents_bucket', actorKey: null, label: 'INDEPENDENT' })).toBe('ind')
  })
})

describe('foldLines', () => {
  it('sums each line, marks a line with a SUSPECT member, and orders by size with the independents and „Alte partide" last', () => {
    const rows = foldLines(
      [
        party('partidul-social-democrat', '10'),
        party('alianta-politica-partidul-social-democrat-partidul-conservator', '5', 'SUSPECT'),
        party('partidul-national-liberal', '12'),
        party('partidul-ecologist-roman', '40'),
        tally({ value: '30', competitor: { kind: 'independents_bucket', actorKey: null, label: 'INDEPENDENT' } }),
      ],
      'mandates',
      'final',
    )
    expect(rows).toEqual([
      { line: 'psd', value: 15, suspect: true },
      { line: 'pnl', value: 12, suspect: false },
      { line: 'ind', value: 30, suspect: false },
      { line: 'other', value: 40, suspect: false },
    ])
    expect(total(rows)).toBe(97)
  })

  it('answers null for a place without such rows (missing, never zero) and drops a line with nothing', () => {
    expect(foldLines([tally({ measure: 'votes', allocationPhase: 'none', competitor: { kind: 'party', actorKey: 'partidul-national-liberal', label: 'PNL' } })], 'mandates', 'final')).toBeNull()
    expect(foldLines([party('partidul-national-liberal', '0'), party('partidul-social-democrat', '2')], 'mandates', 'final')).toEqual([{ line: 'psd', value: 2, suspect: false }])
    expect(total(null)).toBe(0)
  })

  it('never sums two allocation phases', () => {
    const tallies = [tally({ allocationPhase: 'man_1', value: '30', competitor: { kind: 'party', actorKey: 'partidul-national-liberal', label: 'PNL' } }), tally({ allocationPhase: 'man_2', value: '3', competitor: { kind: 'party', actorKey: 'partidul-national-liberal', label: 'PNL' } })]
    expect(foldLines(tallies, 'mandates', 'man_1')).toEqual([{ line: 'pnl', value: 30, suspect: false }])
    expect(foldLines(tallies, 'mandates', 'man_2')).toEqual([{ line: 'pnl', value: 3, suspect: false }])
  })
})

describe('leaderOf', () => {
  it('names the named line with the most, a tie as a tie, and nothing without figures', () => {
    expect(leaderOf([{ line: 'other', value: 50, suspect: false }, { line: 'psd', value: 9, suspect: false }, { line: 'pnl', value: 4, suspect: false }])).toEqual({ line: 'psd', value: 9, suspect: false })
    expect(leaderOf([{ line: 'psd', value: 4, suspect: false }, { line: 'pnl', value: 4, suspect: false }])).toBe('tie')
    expect(leaderOf(null)).toBeNull()
  })
})
