import { describe, expect, it } from 'vitest'
import type { LegalRecentChange } from '@/schemas/legal'
import { CHANGE_KINDS, NEW_LAW_KINDS, groupChanges, joinVerbs, kindVerb, narrowKinds, sourcelessHead } from './legal-changes-blocks'

let next = 0
function row({
  eventId,
  source,
  date,
  act,
  kind = 'modificare',
}: {
  readonly eventId?: string
  readonly source: string | null
  readonly date: string | null
  readonly act: string
  readonly kind?: string
}): LegalRecentChange {
  return {
    eventId: eventId ?? String(++next),
    eventKind: kind,
    effectiveDate: date,
    eventSource: 'portal',
    actId: act,
    displayCitation: `Actul ${act}`,
    status: 'modificat',
    sourceAct: source === null ? null : { actId: source, displayCitation: `Actul ${source}`, description: `Despre ${source}` },
  }
}

describe('groupChanges', () => {
  it('groups by changing act and date, one line per changed act, kinds joined', () => {
    const blocks = groupChanges([
      row({ eventId: '1', source: 'L33', date: '2026-06-25', act: 'L236', kind: 'modificare' }),
      row({ eventId: '2', source: 'L33', date: '2026-06-25', act: 'L236', kind: 'completare' }),
    ])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].source).toEqual({ actId: 'L33', displayCitation: 'Actul L33', description: 'Despre L33' })
    expect(blocks[0].date).toBe('2026-06-25')
    expect(blocks[0].lines).toEqual([expect.objectContaining({ actId: 'L236', kinds: ['modificare', 'completare'] })])
    expect(joinVerbs(blocks[0].lines[0].kinds)).toBe('modifică și completează')
  })

  it('merges a group split by another group and by a page', () => {
    const firstPage = [row({ source: 'A', date: 'd', act: 'x' }), row({ source: 'B', date: 'd', act: 'y' })]
    const secondPage = [row({ source: 'A', date: 'd', act: 'z' })]
    const blocks = groupChanges([...firstPage, ...secondPage])
    expect(blocks.map((b) => b.source?.actId)).toEqual(['A', 'B'])
    expect(blocks[0].lines.map((l) => l.actId)).toEqual(['x', 'z'])
  })

  it('groups events with no changing act by kind and date', () => {
    const blocks = groupChanges([
      row({ source: null, date: '2026-07-29', act: 'i', kind: 'republicare' }),
      row({ source: null, date: '2026-07-29', act: 'o', kind: 'republicare' }),
      row({ source: null, date: '2026-07-29', act: 'h', kind: 'rectificare' }),
    ])
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ source: null, kind: 'republicare', date: '2026-07-29' })
    expect(blocks[0].lines.map((l) => l.actId)).toEqual(['i', 'o'])
    expect(sourcelessHead('republicare')).toBe('Republicări')
    expect(sourcelessHead('rectificare')).toBe('Rectificări')
    expect(sourcelessHead('abrogare-totala')).toBe('Abrogare totală')
  })

  it('keeps the same changing act on two dates as two blocks', () => {
    const blocks = groupChanges([row({ source: 'A', date: '2026-07-01', act: 'x' }), row({ source: 'A', date: '2026-06-01', act: 'y' })])
    expect(blocks.map((b) => b.date)).toEqual(['2026-07-01', '2026-06-01'])
  })

  it('keeps undated events of one changing act together', () => {
    const blocks = groupChanges([row({ source: 'A', date: null, act: 'x' }), row({ source: 'A', date: null, act: 'y' })])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].date).toBeNull()
  })
})

describe('verbs', () => {
  it('says every change kind as a verb', () => {
    expect(CHANGE_KINDS.map(kindVerb)).toEqual([
      'abrogă',
      'abrogă parțial',
      'modifică',
      'completează',
      'suspendă',
      'încetează suspendarea',
      'republică',
      'rectifică',
      'scoate din vigoare',
    ])
  })

  it('joins two or more verbs the Romanian way', () => {
    expect(joinVerbs(['modificare'])).toBe('modifică')
    expect(joinVerbs(['modificare', 'completare', 'abrogare-totala'])).toBe('modifică, completează și abrogă')
  })
})

describe('narrowKinds', () => {
  it('never sends an empty kinds list', () => {
    expect(narrowKinds(CHANGE_KINDS, [])).toEqual(CHANGE_KINDS)
    expect(narrowKinds(CHANGE_KINDS, ['promulgare'])).toEqual(CHANGE_KINDS)
    expect(narrowKinds(NEW_LAW_KINDS, ['modificare', 'promulgare'])).toEqual(['promulgare'])
  })
})
