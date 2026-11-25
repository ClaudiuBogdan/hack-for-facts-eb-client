import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { companyProfile, financialYear } from '../../lib/company-profile.fixture'
import { admittedQualification } from '../../mocks/fixtures/qualification'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { CompanyYearsBand } from './company-years-band'

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
