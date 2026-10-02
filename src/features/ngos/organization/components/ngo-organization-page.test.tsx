import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NgoIndicator } from '../api'
import { ABSOLUT, BLANC, FUNKY, FUNKY_STATEMENTS } from '../test/fixtures'
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
    expect(within(bar).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#scop', '#bani', '#situatie', '#an-cu-an', '#registru'])
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
    expect(screen.getByText('Nu avem situații financiare disponibile pentru acest ONG. Lipsa lor nu înseamnă că organizația nu le-a depus.')).toBeInTheDocument()
    expect(screen.getByText('Nu avem situații financiare disponibile pentru acest ONG.')).toBeInTheDocument()
    expect(screen.queryByText(/Nicio situație/)).not.toBeInTheDocument()
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(bar).toHaveTextContent('01Scopul02Banii03ANAF și registru')
  })

  it('says a failed read failed — once, never „none" — and reads again on request, busy while it does', () => {
    const { rerender } = renderPage({ statementsRead: { status: 'failed' } })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Situațiile financiare nu s-au încărcat.')
    expect(screen.queryByText(/Nicio situație/)).not.toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Încearcă din nou' }))
    expect(onRetry).toHaveBeenCalled()
    rerender(
      <NgoOrganizationPage organization={FUNKY} statementsRead={{ status: 'failed' }} year={undefined} onYear={onYear} onRetry={onRetry} retrying />,
    )
    expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Se încarcă…' })).toBeDisabled()
  })

  it('says a year the address asks for that has no statement, and shows the latest', () => {
    renderPage({ year: 2022 })
    expect(within(band(/rând cu rând/)).getByRole('combobox')).toHaveValue('2024')
    expect(band(/rând cu rând/)).toHaveTextContent('Nicio situație pe platformă pentru 2022; se arată 2024.')
  })

  it('says where the server asks a statement verified — above its rows, on its chart year, in its table column — the values as published', () => {
    const sorted = [...FUNKY_STATEMENTS].sort((a, b) => b.fiscalYear - a.fiscalYear)
    const [latest, older] = sorted
    const flagged = {
      ...older!,
      quality: {
        ruleVersion: 'ngo-revenue-v1',
        assessment: 'assessed',
        suspected: true,
        reasons: [{ code: 'REVENUE_EQUALS_FIXED_ASSETS', detail: 'I38 = I1' }],
      },
    }
    const year = older!.fiscalYear
    const { unmount } = renderPage({ statementsRead: { status: 'ready', statements: [latest!, flagged, ...sorted.slice(2)] }, year })
    const statement = band(/rând cu rând/)
    const note = within(statement).getByRole('note')
    expect(note).toHaveTextContent(/^De verificat: veniturile totale \(I38\), .+ lei, sunt egale cu activele imobilizate \(I1\)\./)
    expect(note).toHaveTextContent('Un semnal de verificare, nu o eroare confirmată; valorile sunt cele publicate.')
    expect(screen.getByRole('button', { name: new RegExp(`^${year}: venituri .*, de verificat$`) })).toBeInTheDocument()
    const column = screen.getByRole('button', { name: `Situația din ${year}, rând cu rând, de verificat` })
    // The mark is seen, not read: the name says it.
    expect(column.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: `Situația din ${latest!.fiscalYear}, rând cu rând` }).querySelector('svg')).toBeNull()
    unmount()
    // The latest statement, which no rule flags, says nothing.
    renderPage({ statementsRead: { status: 'ready', statements: [latest!, flagged, ...sorted.slice(2)] } })
    expect(within(band(/rând cu rând/)).queryByRole('note')).not.toBeInTheDocument()
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

  it('opens the bands on the registry’s purpose, as published and dated, a long one behind „Arată mai multe"', () => {
    const text = `Promovarea transparenței.\n${'Participare civică și educație. '.repeat(25)}`
    renderPage({ organization: { ...FUNKY, purpose: { availability: 'available', text } } })
    const band = screen.getByRole('region', { name: 'Ce își propune' })
    expect(within(band).getByText(/01 \/ Scopul/)).toBeInTheDocument()
    expect(within(band).getByText(/citit la/)).toBeInTheDocument()
    const purpose = band.querySelector('#ngo-profile-purpose')!
    expect(purpose).toHaveTextContent(/^Promovarea transparenței\./)
    expect(purpose).toHaveClass('whitespace-pre-wrap', 'line-clamp-[8]')
    fireEvent.click(within(band).getByRole('button', { name: 'Arată mai multe' }))
    expect(purpose).not.toHaveClass('line-clamp-[8]')
    expect(within(band).getByRole('button', { name: 'Arată mai puține' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows what the registry hid as a badge — never the bare „<PERSON>" — and why on a click', async () => {
    renderPage({ organization: { ...FUNKY, purpose: { availability: 'available', text: 'Ocrotirea <PERSON> din <LOCATION>.' } } })
    const purpose = screen.getByRole('region', { name: 'Ce își propune' }).querySelector('#ngo-profile-purpose')!
    expect(purpose).not.toHaveTextContent('<PERSON>')
    expect(purpose).toHaveTextContent('Ocrotirea persoană din loc.')
    fireEvent.click(within(purpose as HTMLElement).getByRole('button', { name: 'Ascuns în registru: persoană. De ce?' }))
    const dialog = await screen.findByRole('dialog', { name: 'Text ascuns în registru' })
    expect(dialog).toHaveAccessibleDescription(/semnul <PERSON> ține locul unuia sau mai multor cuvinte/)
    expect(within(dialog).getByText('<PERSON>')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Închide' })).toBeInTheDocument()
  })

  it('keeps the badges the clamp hides out of the Tab order, until the text is open', () => {
    const text = `${'Educație civică. '.repeat(40)}Sprijinirea <PERSON>.`
    renderPage({ organization: { ...FUNKY, purpose: { availability: 'available', text } } })
    const band = screen.getByRole('region', { name: 'Ce își propune' })
    const badge = within(band).getByRole('button', { name: 'Ascuns în registru: persoană. De ce?' })
    expect(badge).toHaveAttribute('tabindex', '-1')
    fireEvent.click(within(band).getByRole('button', { name: 'Arată mai multe' }))
    expect(badge).not.toHaveAttribute('tabindex')
  })

  it('numbers the bands from the money where there is no purpose', () => {
    renderPage({ organization: { ...FUNKY, purpose: { availability: 'not_loaded', text: null } } })
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(within(bar).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#bani', '#situatie', '#an-cu-an', '#registru'])
  })

  it('shows nothing for a purpose that is only blank space', () => {
    renderPage({ organization: { ...FUNKY, purpose: { availability: 'available', text: '   ' } } })
    expect(screen.queryByRole('region', { name: 'Ce își propune' })).not.toBeInTheDocument()
  })

  it('shows no purpose where it is not published or blank, and names the disagreement', () => {
    renderPage({ organization: { ...FUNKY, purpose: { availability: 'not_released', text: null }, conflicts: ['purpose'] } })
    // Observations that disagree are named, never shown as one purpose.
    expect(screen.getAllByText(/scopul/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Ce își propune' })).not.toBeInTheDocument()
  })

  describe('without an admitted CUI (read by registry number)', () => {
    const renderUnlinked = () => renderPage({ organization: BLANC, statementsRead: { status: 'ready', statements: [] } })

    it('draws the purpose and the registry, and no band read by CUI', () => {
      renderUnlinked()
      const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
      expect(within(bar).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#scop', '#registru'])
      expect(screen.queryByRole('region', { name: /De unde vin banii/ })).not.toBeInTheDocument()
      const registry = band(/Ce spune registrul/)
      expect(within(registry).queryByText('ANAF')).not.toBeInTheDocument()
      expect(within(registry).getByText('Niciun CUI legat')).toBeInTheDocument()
    })

    it('says once, in the head, why ANAF and the statements are not here', () => {
      renderUnlinked()
      expect(screen.getAllByText(/Datele ANAF și situațiile financiare se citesc după CUI/)).toHaveLength(1)
      expect(screen.getByText('Fără CUI legat')).toBeInTheDocument()
      expect(screen.queryByText(/^CUI$/)).not.toBeInTheDocument()
      // The registry number is the identifier a reader copies, in the head as in the registry's facts.
      expect(screen.getAllByText('3117/A/2026').length).toBeGreaterThan(0)
    })

    it('lists every registry row of its number, and names where they disagree', () => {
      renderUnlinked()
      const registry = band(/Ce spune registrul/)
      expect(within(registry).getAllByText('BLANC')).toHaveLength(2)
      expect(within(registry).getByText('instanța')).toBeInTheDocument()
    })
  })
})
