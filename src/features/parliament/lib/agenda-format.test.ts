import { describe, expect, it } from 'vitest'

import {
  agendaChamberLabel,
  agendaItemKindLabel,
  agendaResolutionLabel,
  agendaSpan,
  cleanAgendaSourceText,
  agendaYearOptions,
  formatAgendaDay,
  formatAgendaDayRange,
  getActiveAgendaFilterCount,
  isJointSittingTitle,
  parseAgendaSearch,
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

describe('formatAgendaDay', () => {
  it('prints a calendar day and NEVER a time', () => {
    // The page ran these date-only values through a date+time formatter and
    // printed "27 iulie 2026 la 03:00" — a sitting time the source never
    // published, invented out of a timezone offset.
    expect(formatAgendaDay('2026-07-27')).toBe('27 iulie 2026')
    expect(formatAgendaDay('2026-07-27')).not.toMatch(/\d\d:\d\d/)
  })

  it('does not shift the day for a reader west of Bucharest', () => {
    // Read as calendar parts, so there is no local-time round trip to shift it.
    expect(formatAgendaDay('2026-01-01')).toBe('1 ianuarie 2026')
  })

  it('returns the raw value rather than inventing one it cannot read', () => {
    expect(formatAgendaDay('nu-e-o-data')).toBe('nu-e-o-data')
  })
})

describe('formatAgendaDayRange', () => {
  it('says a single day once', () => {
    expect(formatAgendaDayRange('2026-06-24', '2026-06-24')).toBe('24 iunie 2026')
  })

  it('collapses the repeated month and year across a sitting week', () => {
    expect(formatAgendaDayRange('2026-07-27', '2026-07-31')).toBe('27 – 31 iulie 2026')
  })

  it('keeps both months when the week straddles one', () => {
    expect(formatAgendaDayRange('2026-03-30', '2026-04-01')).toBe(
      '30 martie – 1 aprilie 2026',
    )
  })

  it('keeps both years when the week straddles one', () => {
    expect(formatAgendaDayRange('2025-12-30', '2026-01-02')).toBe(
      '30 decembrie 2025 – 2 ianuarie 2026',
    )
  })

  it('is undefined when there is no dated day to print', () => {
    expect(formatAgendaDayRange(undefined, undefined)).toBeUndefined()
  })
})

describe('agendaSpan', () => {
  it('spans the dated days and counts the undated ones apart', () => {
    const span = agendaSpan([
      { date: '2026-07-31' },
      { date: '2026-07-27' },
      {},
      { date: '2026-07-29' },
    ])
    expect(span).toEqual({
      from: '2026-07-27',
      to: '2026-07-31',
      datedDays: 3,
      undatedDays: 1,
    })
  })

  it('reports no range when the source dated nothing', () => {
    expect(agendaSpan([{}, {}])).toEqual({ datedDays: 0, undatedDays: 2 })
  })
})

describe('isJointSittingTitle', () => {
  it('recognises the source own words for a joint sitting', () => {
    // 220 of 1,297 agendas are joint sittings, yet `chamber` reads
    // camera_deputatilor on every row — so labelling those "Camera Deputaților"
    // is wrong, and the standing Senate caveat does not apply to them.
    expect(
      isJointSittingTitle(
        'Ordinea de zi pentru sedinţa comună a Camerei Deputaţilor şi Senatului din 22 decembrie 2011',
      ),
    ).toBe(true)
    expect(isJointSittingTitle('Ordinea de zi pentru sedinţe comune din 5 mai 2004')).toBe(
      true,
    )
  })

  it('leaves a single-chamber sitting alone', () => {
    expect(
      isJointSittingTitle(
        'Ordinea de zi pentru sedinţa Camerei Deputaţilor din 27 - 31 iulie 2026',
      ),
    ).toBe(false)
    expect(isJointSittingTitle('Ordinea de zi din 15 decembrie 2011')).toBe(false)
    expect(isJointSittingTitle(undefined)).toBe(false)
  })

  it('does not fire on "raport comun", which lives in item text', () => {
    // Matched only right after "ședinț", so a joint committee report cannot
    // turn a Chamber sitting into a joint one.
    expect(
      isJointSittingTitle(
        'Ordinea de zi pentru sedinţa Camerei Deputaţilor — raport comun al comisiilor',
      ),
    ).toBe(false)
  })
})

describe('agendaYearOptions', () => {
  it('runs from the current year back to the first year the source publishes', () => {
    const years = agendaYearOptions(new Date('2026-07-28T00:00:00Z'))
    expect(years[0]).toBe(2026)
    expect(years[years.length - 1]).toBe(2001)
    expect(years).toHaveLength(26)
  })
})

describe('parseAgendaSearch', () => {
  it('reads the filters a shared link carries', () => {
    expect(parseAgendaSearch({ pagina: 3, an: 2019, q: ' buget ' })).toEqual({
      pagina: 3,
      an: 2019,
      q: 'buget',
    })
  })

  it('drops page 1, so the canonical URL stays bare', () => {
    expect(parseAgendaSearch({ pagina: 1 })).toEqual({})
  })

  it('drops a year the archive cannot hold instead of querying for it', () => {
    expect(parseAgendaSearch({ an: 1990 })).toEqual({})
    expect(parseAgendaSearch({ an: 'anul-trecut' })).toEqual({})
  })

  it('survives a hand-edited param', () => {
    expect(parseAgendaSearch({ pagina: 'x', q: 42 })).toEqual({})
  })
})

describe('getActiveAgendaFilterCount', () => {
  it('counts each facet that is narrowing the list', () => {
    expect(getActiveAgendaFilterCount({})).toBe(0)
    expect(getActiveAgendaFilterCount({ an: 2019 })).toBe(1)
    expect(getActiveAgendaFilterCount({ an: 2019, q: 'buget' })).toBe(2)
  })

  it('does not count the page number, which narrows nothing', () => {
    expect(getActiveAgendaFilterCount({ pagina: 4 })).toBe(0)
  })
})

describe('cleanAgendaSourceText', () => {
  it('recovers the committee welded to the flags that followed it', () => {
    // The extraction joined the source's block-separated parts with nothing
    // between them. 3.5% of rapporteur strings arrive like this.
    expect(
      cleanAgendaSourceText(
        'Comisia pentru administraţie publicăProcedură de urgenţăCameră decizionalăSe dezbate sub rezerva depunerii raportului',
      ),
    ).toBe('Comisia pentru administraţie publică')
  })

  it('cuts at the FIRST flag, not the last', () => {
    expect(
      cleanAgendaSourceText(
        'Comisia pentru sănătate şi Comisia juridicăCameră decizionalăSe dezbate sub rezerva depunerii raportului comun',
      ),
    ).toBe('Comisia pentru sănătate şi Comisia juridică')
  })

  it('drops a date the extractor severed at the full stop', () => {
    // "Adoptat de Senat -2.06.2026" arrives as "Adoptat de Senat -2"; 24,733 of
    // 80,186 dispositions end this way. A partial date is worse than none.
    expect(cleanAgendaSourceText('Adoptat de Senat -2')).toBe('Adoptat de Senat')
  })

  it('leaves a clean value untouched', () => {
    expect(cleanAgendaSourceText('Comisia juridică')).toBe('Comisia juridică')
    expect(cleanAgendaSourceText('Adoptat de Senat')).toBe('Adoptat de Senat')
  })

  it('returns nothing when the field held only a flag', () => {
    expect(cleanAgendaSourceText('Procedură de urgenţă')).toBeUndefined()
    expect(cleanAgendaSourceText(undefined)).toBeUndefined()
    expect(cleanAgendaSourceText('')).toBeUndefined()
  })
})
