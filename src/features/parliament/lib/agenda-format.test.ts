import { describe, expect, it } from 'vitest'

import {
  agendaChamberLabel,
  agendaItemKindLabel,
  agendaResolutionLabel,
  partitionByDate,
  sittingDateSourceLabel,
} from './agenda-format'

describe('sittingDateSourceLabel', () => {
  it('says nothing when the date came from the sitting own transcript', () => {
    // stenogram_session is the authority — a caveat here would be noise.
    expect(sittingDateSourceLabel('stenogram_session')).toBeUndefined()
  })

  it('CAVEATS a date that came from the planned week', () => {
    // The weekly programme disagreed with the printed transcript on 4 of the 5
    // sittings it dated (ids=8224 says 21 Dec; cdep.ro prints 29 Dec).
    const label = sittingDateSourceLabel('weekly_agenda')
    expect(label).toBeDefined()
    expect(label).toContain('planificat')
  })

  it('says plainly when the source published no trustworthy date', () => {
    expect(sittingDateSourceLabel('none')).toContain('nu a publicat')
  })

  it('stays silent on a provenance it does not know, instead of inventing one', () => {
    expect(sittingDateSourceLabel('something_new_from_the_server')).toBeUndefined()
  })
})

describe('agendaResolutionLabel', () => {
  it('flags a candidate mapping as probable, never as certain', () => {
    expect(agendaResolutionLabel('candidate')).toBe('Corespondență probabilă')
  })

  it('adds nothing to an exact mapping', () => {
    expect(agendaResolutionLabel('exact')).toBeUndefined()
    expect(agendaResolutionLabel(undefined)).toBeUndefined()
  })
})

describe('agendaItemKindLabel', () => {
  it('labels the kinds the server emits', () => {
    expect(agendaItemKindLabel('debate')).toBe('Dezbatere')
    expect(agendaItemKindLabel('administrative')).toBe('Punct administrativ')
  })

  it('falls back rather than rendering a raw server token', () => {
    expect(agendaItemKindLabel('brand_new_kind')).toBe('Neclasificat')
  })
})

describe('agendaChamberLabel', () => {
  it('names the chamber in full', () => {
    expect(agendaChamberLabel('camera_deputatilor')).toBe('Camera Deputaților')
    expect(agendaChamberLabel('comun')).toBe('Ședință comună')
  })
})

describe('partitionByDate', () => {
  it('separates undated rows into their own bucket rather than sorting them last', () => {
    // An undated sitting is a different statement, not a later one. Folding it
    // into the tail of a chronology reads as "this happened after".
    const { dated, undated } = partitionByDate([
      { date: '2026-06-24' },
      { date: undefined },
      { date: '2026-06-08' },
    ])
    expect(dated.map((r) => r.date)).toEqual(['2026-06-08', '2026-06-24'])
    expect(undated).toHaveLength(1)
  })

  it('handles an all-undated list without inventing an order', () => {
    const { dated, undated } = partitionByDate([{ date: undefined }, { date: undefined }])
    expect(dated).toHaveLength(0)
    expect(undated).toHaveLength(2)
  })

  it('does not mutate its input', () => {
    const rows = [{ date: '2026-06-24' }, { date: '2026-06-08' }]
    partitionByDate(rows)
    expect(rows.map((r) => r.date)).toEqual(['2026-06-24', '2026-06-08'])
  })
})
