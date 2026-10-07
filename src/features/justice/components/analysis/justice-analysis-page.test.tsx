import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { analysisSeedFixture } from '../../fixtures/judicial-fixtures'
import { AnalysisSeedContext, analysisSeedMap } from '../../hooks/use-justice-analysis'
import { DEFAULT_QUESTION, type Question } from '../../lib/analysis-model'
import { JusticeAnalysis } from './justice-analysis-page'

/**
 * The analysis page as the server sends it: what the loader read (the
 * recorded answers) is in the HTML, in the order a reader meets it, and a
 * question no case can match answers zero without a read.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: Record<string, unknown> }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    const query = search ? `?${new URLSearchParams(Object.entries(search).map(([key, value]) => [key, String(value)])).toString()}` : ''
    return (
      <a href={`${href}${query}`} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => vi.fn(),
  useRouter: () => ({ routesById: {}, state: { matches: [] } }),
}))

// The page's reads never land here: what it shows is what the loader seeded.
vi.mock('../../api/judicial-analysis-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/judicial-analysis-api')>()),
  fetchCaseload: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const seeds = analysisSeedMap(analysisSeedFixture())

const render = (question: Question) =>
  renderToStaticMarkup(
    <QueryClientProvider client={createTestQueryClient()}>
      <AnalysisSeedContext value={seeds}>
        <JusticeAnalysis question={question} onChange={() => undefined} />
      </AnalysisSeedContext>
    </QueryClientProvider>,
  )

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

const inOrder = (page: string, parts: readonly string[]) => {
  let at = -1
  for (const part of parts) {
    const next = page.indexOf(part, at + 1)
    expect(next, part).toBeGreaterThan(at)
    at = next
  }
}

describe('the justice analysis page', () => {
  it('answers the bare question on the server: the levels, the figures, the courts ranked with the year before, the years, the source', () => {
    const html = render(DEFAULT_QUESTION)
    const page = text(html)
    inOrder(page, [
      'Dosarele, pe instanțe',
      'Toate 1.677.596',
      'Judecătorii 1.157.463',
      'Dosare',
      '−3% față de 2024',
      'Instanțe',
      'Top 5 instanțe, din dosare',
      'Civil, din dosare',
      'Dosare 2025',
      '2024',
      'Schimbare',
      'Tribunalul București',
      '86.858',
      '82.720',
      '+5%',
      'Restul',
      'Total',
      '1.677.596',
      'Pe ani',
      'milioane de dosare',
      'Sursa:',
      'portal.just.ro',
    ])
    expect(html).toContain('href="/justice/courts/TribunalulBUCURESTI?an=2025"')
    expect(page).toContain('Primele 100')
  })

  it('splits a matter by stage, with the rest of its total as „Alte etape"', () => {
    const page = text(render({ ...DEFAULT_QUESTION, matters: ['contenciosadministrativsifiscal'], dupa: 'etape' }))
    inOrder(page, ['Dosarele de contencios administrativ și fiscal, pe etape', 'Fond', 'Apel', 'Recurs', 'Total'])
    expect(page).not.toContain('Restul')
  })

  it('answers a question no case can match with zero, without a read, and asks for no query twice', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const page = text(render({ ...DEFAULT_QUESTION, counties: ['CJ'], courts: ['TribunalulTIMIS'], dupa: 'etape' }))
      expect(page).toContain('Niciun dosar pentru această întrebare.')
      expect(page).toContain('Toate 0')
      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Duplicate/u)
    } finally {
      warn.mockRestore()
    }
  })

  it('shows the ÎCCJ’s row among the levels with its count, never a change on the year before', () => {
    const html = render({ ...DEFAULT_QUESTION, dupa: 'niveluri' })
    const row = text(html.slice(html.indexOf('Înalta Curte</span>', html.indexOf('<tbody'))).split('</tr>')[0] ?? '')
    expect(row).toMatch(/3\.641 523 —/u)
  })

  it('keeps the parts it has not read as placeholders, never as zero', () => {
    const page = text(render({ ...DEFAULT_QUESTION, matters: ['faliment'] }))
    expect(page).toContain('Dosarele de faliment, pe instanțe')
    expect(page).not.toMatch(/Toate 0|Niciun dosar/u)
  })

  it('offers the rate per 1,000 residents only for counties, in the residents’ year', () => {
    expect(text(render({ ...DEFAULT_QUESTION, dupa: 'judete' }))).toContain('La 1.000 de locuitori')
    expect(text(render({ ...DEFAULT_QUESTION, dupa: 'judete', year: 2024 }))).not.toContain('La 1.000 de locuitori')
  })
})
