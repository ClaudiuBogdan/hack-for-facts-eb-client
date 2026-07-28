import { describe, expect, it } from 'vitest'
import type { ParliamentBillTimelineStep } from '@/schemas/parliament'
import {
  BILL_STAGES_VIEW_HINTS,
  BILL_STAGES_VIEW_LABELS,
  BILL_STAGES_VIEWS,
  buildChronology,
  chronologySpanDays,
  DEFAULT_BILL_STAGES_VIEW,
  parseBillStagesSearch,
  romanianNeedsDe,
  shouldNameRecord,
  sourceRecordShortLabel,
} from './bill-stages-view'

const step = (
  over: Partial<ParliamentBillTimelineStep> & { position: number },
): ParliamentBillTimelineStep => ({
  stepId: `s-${over.sourceBillKey ?? 'x'}-${String(over.position)}`,
  description: 'Etapă',
  isMilestone: false,
  docUrls: [],
  links: [],
  ...over,
})

describe('parseBillStagesSearch', () => {
  it('reads a known view', () => {
    expect(parseBillStagesSearch({ vedere: 'cronologic' })).toEqual({
      vedere: 'cronologic',
    })
  })

  it('drops a hand-edited value instead of throwing the page away', () => {
    expect(parseBillStagesSearch({ vedere: 'nope' })).toEqual({})
    expect(parseBillStagesSearch({ vedere: 7 })).toEqual({})
    expect(parseBillStagesSearch({})).toEqual({})
  })

  it('defaults to the rail, which is also the first option offered', () => {
    expect(DEFAULT_BILL_STAGES_VIEW).toBe('cronologic')
    expect(BILL_STAGES_VIEWS[0]).toBe('cronologic')
  })

  it('labels every view', () => {
    for (const view of BILL_STAGES_VIEWS) {
      expect(BILL_STAGES_VIEW_LABELS[view]).toBeTruthy()
    }
  })

  it('explains only the views whose layout cannot explain itself', () => {
    // The rail shows dates descending with a chamber against every step, so a
    // sentence saying so is just the screen read back. The column views make a
    // claim the layout cannot — above all that `camere` prints the same moment
    // twice.
    expect(BILL_STAGES_VIEW_HINTS.cronologic).toBeUndefined()
    expect(BILL_STAGES_VIEW_HINTS.camere).toBeTruthy()
    expect(BILL_STAGES_VIEW_HINTS.fise).toBeTruthy()
  })
})

describe('buildChronology — interleaving the two records', () => {
  it('orders by date across records, not by record then position', () => {
    // This is the whole point of the view: a column is a place, not a moment.
    const entries = buildChronology(
      [
        step({ position: 5, sourceBillKey: 'cd', date: '2026-03-23', description: 'CD 23 martie' }),
        step({ position: 18, sourceBillKey: 'cd', date: '2026-06-29', description: 'CD 29 iunie' }),
        step({ position: 0, sourceBillKey: 'se', date: '2026-03-24', description: 'SE 24 martie' }),
        step({ position: 16, sourceBillKey: 'se', date: '2026-06-17', description: 'SE 17 iunie' }),
      ],
      ['cd', 'se'],
    )
    expect(entries.map((entry) => entry.steps[0]?.description)).toEqual([
      'CD 23 martie',
      'SE 24 martie',
      'SE 17 iunie',
      'CD 29 iunie',
    ])
  })

  it('collects both records into ONE block when they land on the same day', () => {
    // Bill 23135: both chambers record the Senate's rejection on 24 June. Read
    // side by side that is the same fact twice; on one line it is one day.
    const entries = buildChronology(
      [
        step({ position: 13, sourceBillKey: 'cd', date: '2026-06-24', description: 'respinsa de catre Senat' }),
        step({ position: 18, sourceBillKey: 'se', date: '2026-06-24', description: 'respins de Senat' }),
      ],
      ['cd', 'se'],
    )
    expect(entries).toHaveLength(1)
    expect(entries[0]?.steps).toHaveLength(2)
  })
})

describe('buildChronology — steps the source never dated', () => {
  it('keeps an undated step on the rail, bounded by the dates around it', () => {
    // 85,497 of 903,931 steps carry no date and HALF of all bills have at least
    // one, so dropping them would delete a quarter of the Chamber's procedure
    // from a view that claims to show everything.
    const entries = buildChronology(
      [
        step({ position: 1, sourceBillKey: 'cd', date: '2026-05-04' }),
        step({ position: 2, sourceBillKey: 'cd', description: 'Fără dată' }),
        step({ position: 3, sourceBillKey: 'cd', date: '2026-06-10' }),
      ],
      ['cd'],
    )
    const undated = entries.find((entry) => entry.kind === 'undated')
    expect(undated?.steps[0]?.description).toBe('Fără dată')
    expect(undated).toMatchObject({ after: '2026-05-04', before: '2026-06-10' })
  })

  it('sorts an undated step AFTER the day it is known to follow', () => {
    const entries = buildChronology(
      [
        step({ position: 1, sourceBillKey: 'cd', date: '2026-05-04', description: 'Datată' }),
        step({ position: 2, sourceBillKey: 'cd', description: 'Nedatată' }),
      ],
      ['cd'],
    )
    expect(entries.map((entry) => entry.kind)).toEqual(['day', 'undated'])
    const trailing = entries[1]
    expect(trailing).toMatchObject({ after: '2026-05-04' })
    // Nothing dated follows it, so there is no upper bound to claim.
    expect(trailing?.kind === 'undated' ? trailing.before : 'set').toBeUndefined()
  })

  it('places a step with no earlier dated row at the very start', () => {
    // Only 7 rows corpus-wide, but they must not vanish.
    const entries = buildChronology(
      [
        step({ position: 1, sourceBillKey: 'cd', description: 'Nedatată de la început' }),
        step({ position: 2, sourceBillKey: 'cd', date: '2026-05-04' }),
      ],
      ['cd'],
    )
    const leading = entries[0]
    expect(leading).toMatchObject({ kind: 'undated', before: '2026-05-04' })
    expect(leading?.kind === 'undated' ? leading.after : 'set').toBeUndefined()
  })

  it('groups a RUN of undated steps sharing the same bounds into one block', () => {
    const entries = buildChronology(
      [
        step({ position: 1, sourceBillKey: 'cd', date: '2026-06-29' }),
        step({ position: 2, sourceBillKey: 'cd', description: 'Una' }),
        step({ position: 3, sourceBillKey: 'cd', description: 'Două' }),
      ],
      ['cd'],
    )
    expect(entries).toHaveLength(2)
    expect(entries[1]?.steps.map((s) => s.description)).toEqual(['Una', 'Două'])
  })
})

describe('buildChronology — what it refuses to show', () => {
  it('drops the source’s attachment rows, as every other view does', () => {
    const entries = buildChronology(
      [
        step({ position: 22, sourceBillKey: 'cd', date: '2026-06-29', description: 'Etapă', rowKind: 'step' }),
        step({
          position: 23,
          sourceBillKey: 'cd',
          date: '2026-06-29',
          description: 'Forma iniţiatorului',
          rowKind: 'attachment',
          parentPosition: 22,
        }),
      ],
      ['cd'],
    )
    expect(entries[0]?.steps.map((s) => s.description)).toEqual(['Etapă'])
  })

  it('keeps a row it cannot classify', () => {
    const entries = buildChronology(
      [step({ position: 1, sourceBillKey: 'cd', date: '2026-05-04', description: 'Neclasificată' })],
      ['cd'],
    )
    expect(entries[0]?.steps[0]?.description).toBe('Neclasificată')
  })

  it('still places steps from a record the dossier list never named', () => {
    const entries = buildChronology(
      [
        step({ position: 1, sourceBillKey: 'cd', date: '2026-05-04', description: 'Listată' }),
        step({ position: 1, sourceBillKey: 'necunoscut', date: '2026-05-04', description: 'Nelistată' }),
      ],
      ['cd'],
    )
    expect(entries[0]?.steps.map((s) => s.description)).toEqual([
      'Listată',
      'Nelistată',
    ])
  })
})

describe('shouldNameRecord', () => {
  const inRecord = (chamberCode: string, sourceBillKey: string) =>
    step({ position: 1, chamberCode, sourceBillKey })

  it('says nothing when the record simply repeats the chamber mark', () => {
    expect(shouldNameRecord(inRecord('CD', '23135'), true)).toBe(false)
    expect(shouldNameRecord(inRecord('SE', 'senat:297-2026'), true)).toBe(false)
  })

  it('names the record when the two DIVERGE', () => {
    // The Chamber's own fișă records "înaintat la Senat" under chamber SE.
    expect(shouldNameRecord(inRecord('SE', '23135'), true)).toBe(true)
    // A promulgation step has no chamber of its own, so the record is the only
    // thing that says where the row came from.
    expect(shouldNameRecord(inRecord('PA', '23135'), true)).toBe(true)
  })

  it('says nothing at all on a single-record bill', () => {
    expect(shouldNameRecord(inRecord('SE', '23135'), false)).toBe(false)
  })
})

describe('sourceRecordShortLabel', () => {
  it('is genitive, so it reads "din fișa Senatului"', () => {
    expect(sourceRecordShortLabel('senat:297-2026')).toBe('Senatului')
    expect(sourceRecordShortLabel('23135')).toBe('Camerei Deputaților')
  })
})

describe('romanianNeedsDe', () => {
  it('takes "de" only when the last two digits fall outside 1–19', () => {
    expect(romanianNeedsDe(1)).toBe(false) // o zi
    expect(romanianNeedsDe(3)).toBe(false) // 3 zile
    expect(romanianNeedsDe(19)).toBe(false) // 19 zile
    expect(romanianNeedsDe(20)).toBe(true) // 20 de zile
    expect(romanianNeedsDe(98)).toBe(true) // 98 de zile
    expect(romanianNeedsDe(100)).toBe(true) // 100 de zile
    expect(romanianNeedsDe(101)).toBe(false) // 101 zile
    expect(romanianNeedsDe(120)).toBe(true) // 120 de zile
  })
})

describe('chronologySpanDays', () => {
  it('measures first to last dated day', () => {
    const entries = buildChronology(
      [
        step({ position: 1, sourceBillKey: 'cd', date: '2026-03-23' }),
        step({ position: 2, sourceBillKey: 'cd', date: '2026-06-29' }),
      ],
      ['cd'],
    )
    expect(chronologySpanDays(entries)).toBe(98)
  })

  it('returns nothing when the rail carries no dated day', () => {
    const entries = buildChronology(
      [step({ position: 1, sourceBillKey: 'cd', description: 'Nedatată' })],
      ['cd'],
    )
    expect(chronologySpanDays(entries)).toBeUndefined()
  })
})
