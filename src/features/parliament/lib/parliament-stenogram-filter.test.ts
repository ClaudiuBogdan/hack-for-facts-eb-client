import { describe, expect, it } from 'vitest'
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import {
  buildStenogramSessionsFilter,
  cameraToChamberToken,
  countActiveStenogramSessionFilters,
  getStenogrameView,
  projectSearchForView,
} from './parliament-stenogram-filter'

describe('getStenogrameView', () => {
  it('defaults to sittings, so the bare URL renders the default view', () => {
    expect(getStenogrameView({})).toBe('sedinte')
    expect(getStenogrameView({ view: 'sedinte' })).toBe('sedinte')
  })

  it('honours an explicit interventions view', () => {
    expect(getStenogrameView({ view: 'interventii' })).toBe('interventii')
  })
})

describe('buildStenogramSessionsFilter', () => {
  it('is undefined for an empty search — the sittings list needs no bound', () => {
    expect(buildStenogramSessionsFilter({})).toBeUndefined()
  })

  it('maps the camera facet onto the GraphQL chamber token', () => {
    expect(buildStenogramSessionsFilter({ camera: 'camera' })).toEqual({
      chamber: { eq: 'camera_deputatilor' },
    })
    expect(buildStenogramSessionsFilter({ camera: 'senat' })).toEqual({
      chamber: { eq: 'senat' },
    })
    expect(buildStenogramSessionsFilter({ camera: 'comun' })).toEqual({
      chamber: { eq: 'comun' },
    })
    expect(cameraToChamberToken('camera')).toBe('camera_deputatilor')
  })

  it('sends the year as the indexed `year` facet when no range is set', () => {
    expect(buildStenogramSessionsFilter({ an: 2025 })).toEqual({
      year: { eq: 2025 },
    })
  })

  it('an explicit range WINS over the year and the year is not also sent', () => {
    // Sending both would ask for the intersection and silently return nothing
    // whenever the range sits outside the selected year.
    expect(
      buildStenogramSessionsFilter({
        an: 2024,
        from: '2026-01-01',
        to: '2026-03-31',
      }),
    ).toEqual({ sessionDate: { gte: '2026-01-01', lte: '2026-03-31' } })
  })

  it('accepts a half-open range — sittings ride the date index either way', () => {
    expect(buildStenogramSessionsFilter({ from: '2026-01-01' })).toEqual({
      sessionDate: { gte: '2026-01-01' },
    })
    expect(buildStenogramSessionsFilter({ to: '2026-01-01' })).toEqual({
      sessionDate: { lte: '2026-01-01' },
    })
  })

  it('carries the speaker and availability facets', () => {
    expect(
      buildStenogramSessionsFilter({
        vorbitor: '2:2020:12',
        disponibilitate: 'SOURCE_ONLY',
      }),
    ).toEqual({
      mandateKey: { eq: '2:2020:12' },
      availability: { eq: 'SOURCE_ONLY' },
    })
  })
})

describe('countActiveStenogramSessionFilters', () => {
  it('counts the year as a real facet on sittings', () => {
    expect(countActiveStenogramSessionFilters({ an: 2026 })).toBe(1)
  })

  it('does not double-count the year when a range replaced it', () => {
    expect(
      countActiveStenogramSessionFilters({
        an: 2026,
        from: '2026-01-01',
        to: '2026-02-01',
      }),
    ).toBe(1)
  })

  it('never counts `q` — it lives in the toolbar, not the sheet', () => {
    expect(countActiveStenogramSessionFilters({ q: 'buget' })).toBe(0)
  })

  it('sums the independent facets', () => {
    expect(
      countActiveStenogramSessionFilters({
        camera: 'senat',
        vorbitor: 'm1',
        disponibilitate: 'COMPLETE',
        from: '2026-01-01',
      }),
    ).toBe(4)
  })
})

describe('projectSearchForView', () => {
  const search: ParliamentSpeechesSearch = {
    view: 'sedinte',
    camera: 'senat',
    vorbitor: 'm1',
    q: 'buget',
    from: '2026-01-01',
    to: '2026-02-01',
    an: 2026,
    disponibilitate: 'PARTIAL',
  }

  it('carries the shared facets across a view switch', () => {
    const next = projectSearchForView(search, 'interventii')
    expect(next).toMatchObject({
      view: 'interventii',
      camera: 'senat',
      vorbitor: 'm1',
      q: 'buget',
      from: '2026-01-01',
      to: '2026-02-01',
      an: 2026,
    })
  })

  it('DROPS availability on interventions — a turn has no capture state', () => {
    expect(projectSearchForView(search, 'interventii').disponibilitate)
      .toBeUndefined()
  })

  it('omits the default view from the URL', () => {
    expect(projectSearchForView(search, 'sedinte').view).toBeUndefined()
  })

  it('keeps availability when staying on sittings', () => {
    expect(projectSearchForView(search, 'sedinte').disponibilitate).toBe(
      'PARTIAL',
    )
  })
})
