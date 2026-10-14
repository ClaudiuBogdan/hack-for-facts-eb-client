import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { releaseFixture } from '../../api/company-analytics.fixture'
import { DEFAULT_STATE, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { SourceLine } from './analytics-source'
import { YearsBand } from './analytics-years'

/**
 * Where the figures come from and how far the year band reaches. The
 * freshness lines say what each export field holds (FRONTIER_SQL): ONRC's
 * own publication date, a financial year's extraction rule and derivation
 * time, the fiscal loader's retrieval span; an unknown kind is never given a
 * date meaning. The year band's counts are the whole edition's, also in each
 * bar's accessible name.
 */

/** The live release 7 frontiers, verbatim in shape. */
const AS_OF: CompanyAnalysisRelease['asOf'] = [
  { kind: 'onrc_edition', id: '1', published: '2026-09-02', retrieved: null, rows: '3909574' },
  { kind: 'financials_year', id: '2008:mfp', published: 'anaf-bilant-metric-v1', retrieved: '2026-10-11T13:09:35.949459Z', rows: '664251' },
  { kind: 'financials_year', id: '2024:anaf', published: 'anaf-bilant-metric-v1', retrieved: '2026-10-11T13:09:35.949459Z', rows: '965213' },
  { kind: 'fiscal_retrieved', id: null, published: null, retrieved: '2026-05-19T08:28:19.157000Z/2026-09-28T08:56:36.432000Z', rows: '3939000' },
]

function openMethod(asOf: CompanyAnalysisRelease['asOf']): string[] {
  render(<SourceLine release={releaseFixture({ asOf })} />)
  fireEvent.click(screen.getByText('Cum am calculat'))
  const heading = screen.getByText('Cât de recente sunt datele')
  const list = heading.parentElement?.querySelector('ul')
  if (!list) throw new Error('no freshness list')
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '')
}

// The test runtime's locale is `en`: dates and grouped numbers read in English, the messages stay their Romanian ids.
describe('the freshness lines', () => {
  it('names each live input by what its fields hold', () => {
    expect(openMethod(AS_OF)).toEqual([
      'registrul ONRC, ediția 1 · publicată de ONRC pe 2 September 2026 · 3,909,574 rânduri',
      'situațiile financiare 2008 (Ministerul Finanțelor) · regula de extragere anaf-bilant-metric-v1 · valori derivate pe 11 October 2026 · 664,251 rânduri',
      'situațiile financiare 2024 (ANAF) · regula de extragere anaf-bilant-metric-v1 · valori derivate pe 11 October 2026 · 965,213 rânduri',
      'starea fiscală ANAF · preluată de platformă între 19 May 2026 și 28 September 2026 · 3,939,000 rânduri',
    ])
  })

  it('never calls a rule version published or a derivation time retrieved', () => {
    const text = openMethod(AS_OF).join('\n')
    expect(text).not.toMatch(/publicat anaf|preluat 11/u)
    expect(text).not.toContain('financials_year')
  })

  it('keeps a span it cannot read as the source wrote it, and an unknown kind without date words', () => {
    const lines = openMethod([
      { kind: 'fiscal_retrieved', id: null, published: null, retrieved: '2026-05-19T08:28:19Z', rows: null },
      { kind: 'other_input', id: 'x1', published: 'v9', retrieved: '2026-10-01', rows: '5' },
    ])
    expect(lines).toEqual(['starea fiscală ANAF · 2026-05-19T08:28:19Z', 'other_input · x1 · v9 · 2026-10-01 · 5 rânduri'])
  })

  it('says a mean counts the companies that reported zero', () => {
    render(<SourceLine release={releaseFixture({ asOf: AS_OF })} />)
    fireEvent.click(screen.getByText('Cum am calculat'))
    expect(screen.getByText(/o medie împarte la firmele care au raportat o valoare, inclusiv 0, nu la toate/u)).toBeInTheDocument()
  })
})

describe('the year band', () => {
  const question = { metric: 'TURNOVER', year: 2024 } as unknown as ResolvedQuestion
  const band = (state: CompanyAnalyticsState) => render(<YearsBand state={state} release={releaseFixture()} question={question} onChange={vi.fn()} />)

  it('says its counts are the whole edition in the heading and in every bar', () => {
    band(DEFAULT_STATE)
    expect(screen.getByRole('region', { name: 'Situații financiare pe ani fiscali, în toată ediția' })).toBeInTheDocument()
    const bar = screen.getByRole('button', { name: /^2024: 965,213 situații în toată ediția/u })
    expect(bar).toHaveAttribute('title', expect.stringContaining('în toată ediția'))
    expect(screen.queryByText('Numerele sunt ale întregii ediții, nu ale firmelor filtrate.')).toBeNull()
  })

  it('warns a filtered question that the band ignores its filters', () => {
    band({ ...DEFAULT_STATE, scope: { county: { in: ['DJ'] } } })
    expect(screen.getByText('Numerele sunt ale întregii ediții, nu ale firmelor filtrate.')).toBeInTheDocument()
  })
})
