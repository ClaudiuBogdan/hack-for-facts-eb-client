import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NgoIndicator } from '../api'
import { ABSOLUT, FUNKY, FUNKY_STATEMENTS } from '../test/fixtures'
import { NgoOrganizationPage } from './ngo-organization-page'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@lingui/react/macro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lingui/react/macro')>()
  return {
    ...actual,
    useLingui: () => ({
      i18n: { locale: 'ro', _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) },
    }),
  }
})
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search: _search, ...props }: { readonly children: ReactNode; readonly to: string; readonly search?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const onYear = vi.fn()
const onRetry = vi.fn()
const renderPage = (props: Partial<Parameters<typeof NgoOrganizationPage>[0]> = {}) =>
  render(
    <NgoOrganizationPage
      organization={FUNKY}
      statementsRead={{ status: 'ready', statements: FUNKY_STATEMENTS }}
      purpose={null}
      year={undefined}
      onYear={onYear}
      onRetry={onRetry}
      {...props}
    />,
  )
const band = (name: RegExp) => screen.getByRole('region', { name })

describe('NgoOrganizationPage', () => {
  beforeEach(() => {
    onYear.mockReset()
    onRetry.mockReset()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('opens on the name, what it is and where, its chips and identifiers, and a numbered bar', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Funky Citizens')
    expect(screen.getByText(/Asociație din Sectorul 3, București\./)).toBeInTheDocument()
    expect(screen.getByText('30339344')).toBeInTheDocument()
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(within(bar).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#bani', '#situatie', '#an-cu-an', '#registru'])
  })

  it('reads the latest statement row by row, and another year on the reader’s choice', () => {
    renderPage()
    expect(within(band(/rând cu rând/)).getByRole('combobox')).toHaveValue('2024')
    fireEvent.click(within(band(/an cu an/)).getByRole('button', { name: 'Situația din 2021, rând cu rând' }))
    expect(onYear).toHaveBeenCalledWith(2021)
  })

  it('takes the reader’s focus to the statement a year in the matrix opens', () => {
    renderPage()
    fireEvent.click(within(band(/an cu an/)).getByRole('button', { name: 'Situația din 2021, rând cu rând' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Situația financiară, rând cu rând' }))
  })

  it('says the registry’s observations disagree on the name, rather than presenting one as agreed', () => {
    renderPage({
      organization: {
        ...FUNKY,
        name: null,
        conflicts: ['name'],
        registryRecords: [
          { id: 'a', name: 'FUNKY CITIZENS', nameWithheld: false },
          { id: 'b', name: 'ASOCIATIA FUNKY CITIZENS', nameWithheld: false },
        ],
      },
    })
    expect(screen.getByText(/Registrul o trece sub mai multe nume/)).toBeInTheDocument()
  })

  it('reads a filed plan on a phone, where the plan’s column is hidden', () => {
    renderPage()
    expect(within(band(/rând cu rând/)).getAllByText('prevăzut').length).toBeGreaterThan(0)
  })

  it('opens the year the address asks for', () => {
    renderPage({ year: 2021 })
    expect(within(band(/rând cu rând/)).getByRole('combobox')).toHaveValue('2021')
  })

  it('keeps a missing year an empty column, not a zero, and a row its year’s form lacks empty, not „—"', () => {
    renderPage()
    const matrix = band(/an cu an/)
    expect(within(matrix).getByText('2022: nicio situație pe platformă')).toBeInTheDocument()
    expect(within(matrix).queryByRole('button', { name: /2022/ })).not.toBeInTheDocument()
    // The 2021 form has no „Casa și conturi la bănci" row (the rows changed in 2024): said as absent, never as a blank cell.
    const cash = within(matrix).getByRole('rowheader', { name: 'Casa și conturi la bănci' }).closest('tr')!
    expect(within(cash).getAllByText('rândul nu există în formularul anului').length).toBeGreaterThan(0)
  })

  it('says statements that are not loaded are not loaded — in the head too — once, and drops the bands with nothing to show', () => {
    renderPage({ organization: ABSOLUT, statementsRead: { status: 'ready', statements: [] } })
    expect(screen.queryByRole('region', { name: /an cu an/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /rând cu rând/ })).not.toBeInTheDocument()
    expect(screen.getAllByText(/nu sunt încă încărcate pentru acest CUI/)).toHaveLength(1)
    expect(screen.getByText('Situații financiare încă neîncărcate.')).toBeInTheDocument()
    expect(screen.queryByText(/Nicio situație/)).not.toBeInTheDocument()
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(bar).toHaveTextContent('01Banii02ANAF și registru')
  })

  it('says a failed read failed — once, never „none" — and reads again on request, busy while it does', () => {
    const { rerender } = renderPage({ statementsRead: { status: 'failed' } })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Situațiile financiare nu s-au încărcat.')
    expect(screen.queryByText(/Nicio situație/)).not.toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(onRetry).toHaveBeenCalled()
    rerender(
      <NgoOrganizationPage organization={FUNKY} statementsRead={{ status: 'failed' }} purpose={null} year={undefined} onYear={onYear} onRetry={onRetry} retrying />,
    )
    expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Se încarcă…' })).toBeDisabled()
  })

  it('says a year the address asks for that has no statement, and shows the latest', () => {
    renderPage({ year: 2022 })
    expect(within(band(/rând cu rând/)).getByRole('combobox')).toHaveValue('2024')
    expect(band(/rând cu rând/)).toHaveTextContent('Nicio situație pe platformă pentru 2022; se arată 2024.')
  })

  it('leaves out a figure the latest form does not give, never a zero, and calls a zero result neither', () => {
    const [latest, ...rest] = [...FUNKY_STATEMENTS].sort((a, b) => b.fiscalYear - a.fiscalYear)
    const blank = (pattern: RegExp) => (indicator: NgoIndicator) => (pattern.test(indicator.label) ? { ...indicator, value: null } : indicator)
    const zero = (pattern: RegExp) => (indicator: NgoIndicator) => (pattern.test(indicator.label) ? { ...indicator, value: '0' } : indicator)
    const edited = {
      ...latest!,
      indicators: latest!.indicators.map(blank(/^Venituri totale.*31\.12/iu)).map(zero(/Excedent|Deficit/iu)),
    }
    renderPage({ statementsRead: { status: 'ready', statements: [edited, ...rest] } })
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(figures).not.toHaveTextContent('Venituri, 2024')
    expect(figures).toHaveTextContent('Rezultat, 2024')
    expect(figures).not.toHaveTextContent(/Excedent|Deficit/)
  })

  it('shows the registry’s purpose as published, line breaks kept, a long one behind „Arată mai multe"', () => {
    const text = `Promovarea transparenței.\n${'Participare civică și educație. '.repeat(12)}`
    renderPage({ purpose: { availability: 'available', text } })
    const purpose = screen.getByText(/Promovarea transparenței\./)
    expect(purpose).toHaveClass('whitespace-pre-wrap', 'line-clamp-4')
    const more = screen.getByRole('button', { name: 'Arată mai multe' })
    fireEvent.click(more)
    expect(purpose).not.toHaveClass('line-clamp-4')
    expect(screen.getByRole('button', { name: 'Arată mai puține' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows no purpose where it is not published or blank', () => {
    renderPage({ purpose: { availability: 'not_released', text: null } })
    expect(screen.queryByText('Scopul, din registru')).not.toBeInTheDocument()
  })
})
