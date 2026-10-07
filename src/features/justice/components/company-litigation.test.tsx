import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CompanyLitigationCases, CompanyLitigationSummary } from './company-litigation'

const cases = vi.hoisted(() => ({
  current: {
    isPending: false,
    isError: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    data: {
      pages: [
        {
          cases: [
            { caseId: '1', institutionCode: 'TribunalulBUCURESTI', caseNumber: '33517/3/2021/a85', category: 'Faliment', sourceOpenedAt: '2025-02-18' },
            { caseId: '2', institutionCode: 'JudecatoriaSECTORUL4BUCURESTI', caseNumber: '100/4/2024', category: null, sourceOpenedAt: null },
          ],
          endCursor: 'next',
          hasNextPage: true,
        },
      ],
    },
  },
}))
vi.mock('../hooks/use-company-litigation', () => ({ useCompanyLitigationCases: () => cases.current }))

describe('CompanyLitigationSummary', () => {
  it('says the count is a floor, by level, and names no party', () => {
    render(
      <CompanyLitigationSummary
        litigation={{
          cui: '1',
          caseCount: 13,
          courtLevels: [
            { courtLevel: 'judecatorie', count: 9 },
            { courtLevel: 'tribunal', count: 3 },
          ],
          years: [
            { year: 2026, count: 2 },
            { year: 2023, count: 10 },
          ],
          coverage: 1,
          caveats: [],
        }}
      />,
    )
    expect(screen.getByText('Cel puțin 13 dosare')).toBeInTheDocument()
    // One case the years leave out is said, not dropped; nor is the one no level places.
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Din 2023 până în 2026 · 1 fără dată')).toBeInTheDocument()
    expect(screen.getByText('Judecătorie')).toBeInTheDocument()
    expect(screen.getByText('La o instanță necunoscută')).toBeInTheDocument()
    expect(screen.getByText(/Persoanele din dosare nu sunt numite/)).toBeInTheDocument()
  })
})

describe('CompanyLitigationCases', () => {
  it('lists each case by court name, number and matter, and offers the next page', () => {
    render(<CompanyLitigationCases cui="1" />)
    expect(screen.getByText('Tribunalul București')).toBeInTheDocument()
    expect(screen.getByText('33517/3/2021/a85')).toBeInTheDocument()
    expect(screen.getByText('Faliment')).toBeInTheDocument()
    expect(screen.getByText('Judecătoria Sectorului 4 București')).toBeInTheDocument()
    // A placeholder or missing date reads as missing.
    expect(screen.getByText('fără dată')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Mai multe dosare' }).click()
    expect(cases.current.fetchNextPage).toHaveBeenCalled()
  })

  it('says when the next page could not be read, and keeps the cases it has', () => {
    cases.current = { ...cases.current, isFetchNextPageError: true }
    render(<CompanyLitigationCases cui="1" />)
    expect(screen.getByText('Tribunalul București')).toBeInTheDocument()
    expect(screen.getByText('Următoarele dosare nu au putut fi citite.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mai multe dosare' })).toBeNull()
  })
})
