import { createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { fetchCompanyStatementFiles } from '../../api/private-company-api'
import { companyProfile, financialYear } from '../../lib/company-profile.fixture'
import { admittedQualification } from '../../mocks/fixtures/qualification'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { CompanyYearsBand } from './company-years-band'

// A Ministry year's files come from their own read (trim step 2a): the transport is mocked, the query is real.
vi.mock('../../api/private-company-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/private-company-api')>()),
  // No files unless a test says otherwise.
  fetchCompanyStatementFiles: vi.fn(async () => []),
}))

/** Ten statements, 2016–2025, each with turnover, net profit and employees. */
function tenYears() {
  const years = Array.from({ length: 10 }, (_, index) => 2025 - index)
  return companyProfile({
    financials: years.map((year) =>
      financialYear(year, { turnover: 1000 + year, netProfit: 10, netLoss: 0, employees: 5, summary: null }),
    ),
  })
}

const table = () => within(screen.getByRole('region', { name: 'Tabelul bilanțurilor' }))
const years = () => table().getAllByRole('button', { name: /^Bilanțul pe \d{4}/u }).map((button) => button.getAttribute('data-statement-year'))

// Owner, 25 November 2026: less at first — the newest six statements and the key lines, each a button from the rest.
describe('CompanyYearsBand', () => {
  it('shows the newest six statements, and every year on asking', () => {
    render(<CompanyYearsBand model={buildCompanyProfileModel(tenYears())} />)
    expect(years()).toEqual(['2025', '2024', '2023', '2022', '2021', '2020'])
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 ani' }))
    expect(years()).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: 'Doar ultimii 6 ani' }))
    expect(years()).toHaveLength(6)
  })

  it('closes a statement opened among the older years when they fold away', () => {
    render(<CompanyYearsBand model={buildCompanyProfileModel(tenYears())} />)
    fireEvent.click(screen.getByRole('button', { name: 'Încă 4 ani' }))
    fireEvent.click(table().getByRole('button', { name: /^Bilanțul pe 2017/u }))
    expect(screen.getByRole('region', { name: 'Bilanțul pe 2017' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Doar ultimii 6 ani' }))
    expect(screen.queryByRole('region', { name: 'Bilanțul pe 2017' })).toBeNull()
  })

  it('says how many statements it holds, with no section number', () => {
    render(<CompanyYearsBand model={buildCompanyProfileModel(tenYears())} />)
    const head = screen.getByRole('heading', { level: 2, name: 'Bilanțurile, an cu an' })
    expect(head.parentElement?.textContent).toMatch(/10 bilanțuri cu valori, cel mai nou primul\./u)
    expect(head.parentElement?.textContent).not.toMatch(/0\d \//u)
  })

  it('keeps every line on asking, and never hides a line with a held value in the years shown', () => {
    const profile = tenYears()
    const [newest, ...rest] = profile.financials
    // The newest statement's computed net result held: a line outside the key ones, marked in a year shown.
    const held = { ...newest!, qualification: admittedQualification(newest!, { net_result: 'held_component' }) }
    render(<CompanyYearsBand model={buildCompanyProfileModel({ ...profile, financials: [held, ...rest] })} />)
    const rows = () => table().getAllByRole('rowheader').map((cell) => cell.textContent)
    expect(rows()).toContain('Rezultat net calculat')
    expect(rows()).toContain('Cifra de afaceri')
  })

  it('keeps the other lines a button away', () => {
    render(<CompanyYearsBand model={buildCompanyProfileModel(tenYears())} />)
    const rows = () => table().getAllByRole('rowheader').map((cell) => cell.textContent)
    expect(rows()).not.toContain('Rezultat net calculat')
    fireEvent.click(screen.getByRole('button', { name: /^Încă (un rând|\d+ (de )?rânduri)$/u }))
    expect(rows()).toContain('Rezultat net calculat')
    fireEvent.click(screen.getByRole('button', { name: 'Doar rândurile principale' }))
    expect(rows()).not.toContain('Rezultat net calculat')
  })
})

describe('a Ministry year’s files (trim step 2a)', () => {
  const ANCHOR = 'https://data.gov.ro/dataset/a/resource/b/download/webblbsslan2009.txt'
  const COMPLEMENT = 'https://data.gov.ro/dataset/a/resource/c/download/web2009.txt'
  const SPLIT = [
    { fiscalYear: 2009, sourceUrl: ANCHOR, lines: [
      { rowNumber: '76930', url: ANCHOR, indicators: [{ code: 'I1', name: 'ACTIVE IMOBILIZATE - TOTAL' }] },
      { rowNumber: '609557', url: COMPLEMENT, indicators: [{ code: 'I3', name: 'STOCURI' }] },
    ] },
  ]
  // ANAF's 2019 statement and the Ministry's 2009 and 2010, each with its link.
  const model = () =>
    buildCompanyProfileModel(
      companyProfile({
        financials: [
          financialYear(2019, { turnover: 3, netProfit: 1, netLoss: 0, employees: 2, source: { url: 'https://anaf.ro/b', urlKind: 'anaf_statement' } }),
          financialYear(2010, { turnover: 2, netProfit: 1, netLoss: 0, employees: 2, source: { url: ANCHOR, urlKind: 'mfp_resource' } }),
          financialYear(2009, { turnover: 1, netProfit: 1, netLoss: 0, employees: 2, source: { url: ANCHOR, urlKind: 'mfp_resource' } }),
        ],
      }),
    )
  // A fresh query client each time, so no answer carries over between the tests.
  const band = () => render(<CompanyYearsBand model={model()} cui="21195169" />, { queryClient: createTestQueryClient() })
  const openYear = (year: number) => fireEvent.click(within(screen.getByRole('region', { name: 'Tabelul bilanțurilor' })).getByRole('button', { name: new RegExp(`^Bilanțul pe ${year}`, 'u') }))

  it('reads them once per company, only when a Ministry year opens, and lists a split statement’s files', async () => {
    const read = vi.mocked(fetchCompanyStatementFiles)
    read.mockReset()
    read.mockResolvedValue(SPLIT)
    band()
    expect(read).not.toHaveBeenCalled()
    // ANAF's statement: no Ministry files to read.
    openYear(2019)
    expect(read).not.toHaveBeenCalled()
    openYear(2009)
    const detail = within(screen.getByRole('region', { name: 'Bilanțul pe 2009' }))
    expect(await detail.findByText(/provin din 2 fișiere MF publicate separat/u)).toBeInTheDocument()
    expect(detail.getByRole('link', { name: 'Fișierul 2 pe data.gov.ro' })).toHaveAttribute('href', COMPLEMENT)
    expect(read).toHaveBeenCalledTimes(1)
    expect(read.mock.calls[0]?.[0]).toBe('21195169')
    // Another Ministry year: the same read answers it; one file, so no list.
    openYear(2010)
    expect(within(screen.getByRole('region', { name: 'Bilanțul pe 2010' })).queryByText(/fișiere MF publicate separat/u)).toBeNull()
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('says a failed read, and reads again on request', async () => {
    const read = vi.mocked(fetchCompanyStatementFiles)
    read.mockReset()
    // The read and its one automatic retry fail; the reader's own retry is answered.
    read.mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down')).mockResolvedValue(SPLIT)
    band()
    openYear(2009)
    const detail = within(screen.getByRole('region', { name: 'Bilanțul pe 2009' }))
    expect(await detail.findByText('Fișierele MF ale acestui an nu s-au încărcat.', {}, { timeout: 5000 })).toBeInTheDocument()
    fireEvent.click(detail.getByRole('button', { name: 'Încearcă din nou' }))
    expect(await detail.findByText(/provin din 2 fișiere MF publicate separat/u)).toBeInTheDocument()
    expect(detail.queryByText('Fișierele MF ale acestui an nu s-au încărcat.')).toBeNull()
    expect(read).toHaveBeenCalledTimes(3)
  })
})

