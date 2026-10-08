import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { companyProfile, financialYear } from '@/features/private-companies/lib/company-profile.fixture'
import { buyerProfile } from '@/features/procurement/lib/buyer.fixture'
import { READER_CATEGORIES } from '@/features/procurement/lib/home-categories'
import { recentPeriod } from '@/features/procurement/lib/profile-period.fixture'
import { TURSIB_PROFILE, enterpriseReadFixture } from '../../lib/test/enterprise-fixture'
import { PublicEnterprisePage } from './public-enterprise-page'

vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, hash, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Readonly<Record<string, string>>; readonly hash?: string; readonly preload?: string }) => (
    <a href={`${params?.cui ? to.replace('$cui', params.cui) : to}${hash ? `#${hash}` : ''}`} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@lingui/react/macro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lingui/react/macro')>()
  return {
    ...actual,
    useLingui: () => ({
      i18n: { locale: 'ro', _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) },
    }),
  }
})

const COMPANY = companyProfile({ cui: '789401', legalName: 'TURSIB SA' })
/** Seven categories and seven firms, largest first: the band shows the first five of each. */
const SEVEN = [7, 6, 5, 4, 3, 2, 1] as const
const BUYER = buyerProfile({
  identity: { ...buyerProfile().identity, cui: '789401', name: 'Tursib SA' },
  period: recentPeriod('2026-05'),
  categories: { direct: SEVEN.map((rank, index) => ({ category: READER_CATEGORIES[index]!, value: rank * 100_000, count: rank, share: rank / 28 })), contract: [] },
  directSuppliers: { rankedBy: 'value', rows: SEVEN.map((rank) => ({ cui: `100${rank}`, count: rank, value: rank * 10_000, share: rank / 28 })) },
  names: new Map(SEVEN.map((rank) => [`100${rank}`, `Firma ${rank} SRL`])),
})
const ready = <T,>(value: T) => ({ status: 'ready', value }) as const

const band = (id: string) => document.getElementById(id) as HTMLElement

function renderPage(overrides: Partial<Parameters<typeof PublicEnterprisePage>[0]> = {}) {
  return render(<PublicEnterprisePage read={enterpriseReadFixture()} company={ready(COMPANY)} buyer={ready(BUYER)} {...overrides} />)
}

describe('PublicEnterprisePage', () => {
  it('names the enterprise, says who controls it, and gives each source’s status its own chip', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tursib SA')
    expect(screen.getByText(/Consiliul Local Sibiu o controlează, după lista ANAF a întreprinderilor publice\. Anunțurile de selecție AMEPIP numesc altă autoritate/u)).toBeInTheDocument()
    expect(screen.getByText('Lista ANAF: activă')).toBeInTheDocument()
    expect(screen.getByText('Registrul comerțului: în funcțiune')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Pagina firmei/u })[0]).toHaveAttribute('href', '/companies/789401')
  })

  it('shows the company page’s figures, then what it bought directly in twelve months, fourth', () => {
    const financials = [financialYear(2024, { turnover: 70_000_000, netProfit: 800_000, employees: 360 }), financialYear(2025, { turnover: 53_800_000, netProfit: 2_100_000, employees: 390 })]
    renderPage({ company: ready(companyProfile({ cui: '789401', legalName: 'TURSIB SA', financials })) })
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    const text = figures.textContent ?? ''
    const order = ['Cifra de afaceri, 2025', 'Profit net, 2025', 'Salariați, 2025', 'Achiziții directe, ultimele 12 luni'].map((label) => text.indexOf(label))
    expect(order.every((position) => position >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // The fourth is the institution page's twelve months' direct purchases: 36,4 mil. lei in the fixture.
    expect(within(figures).getByText('fără TVA')).toBeInTheDocument()
    expect(figures.textContent).toMatch(/36,4/u)
  })

  it('lays the bands out in the owner’s order, the pinned bar naming them', () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#control', '#bani', '#amepip', '#stare'])
    const ids = [...document.querySelectorAll('section[id]')].map((section) => section.id)
    expect(ids).toEqual(['control', 'bani', 'amepip', 'stare'])
  })

  it('links the authority to its budget page, its other enterprises to theirs and all of them to its portfolio', () => {
    renderPage()
    const control = band('control')
    expect(within(control).getByRole('link', { name: 'Consiliul Local Sibiu' })).toHaveAttribute('href', '/entities/4270740')
    expect(within(control).getByRole('link', { name: 'Urbana SA' })).toHaveAttribute('href', '/public-enterprises/2684932')
    expect(within(control).getByRole('link', { name: /Toate întreprinderile autorității/u })).toHaveAttribute('href', '/public-enterprises/authorities/4270740')
    // The association has no budget record: its name is plain text, its count its own; with one enterprise, no portfolio link.
    expect(within(control).getAllByRole('link', { name: /Toate întreprinderile autorității/u })).toHaveLength(1)
    expect(within(control).queryByRole('link', { name: /Asociatia/u })).toBeNull()
    expect(within(control).getByText(/o întreprindere în liste/iu)).toBeInTheDocument()
  })

  it('says what it bought in twelve months, five categories and five firms, the rest on the procurement page', () => {
    renderPage()
    const money = band('bani')
    expect(within(money).getByText(/a făcut 293 de achiziții directe/u)).toBeInTheDocument()
    const [categories, firms] = within(money).getAllByRole('list').slice(0, 2)
    expect(within(categories!).getAllByRole('listitem')).toHaveLength(5)
    expect(within(firms!).getAllByRole('listitem').map((item) => item.textContent?.match(/Firma \d/u)?.[0])).toEqual(['Firma 7', 'Firma 6', 'Firma 5', 'Firma 4', 'Firma 3'])
    expect(within(money).queryByText(/Firma 2 SRL/u)).toBeNull()
    expect(within(money).getByRole('link', { name: /Toate achizițiile, pe pagina de achiziții/u })).toHaveAttribute('href', '/procurement/institutions/789401')
    expect(within(money).getByText('Nu apare ca furnizor plătit din bani publici.')).toBeInTheDocument()
  })

  it('opens AMEPIP on the newest form’s board answers, every value one click away', () => {
    renderPage()
    const amepip = band('amepip')
    expect(within(amepip).getByText('Număr de angajați cu echivalent normă întreagă')).toBeInTheDocument()
    expect(within(amepip).getByText('362')).toBeInTheDocument()
    expect(within(amepip).queryByRole('table')).toBeNull()
    fireEvent.click(within(amepip).getByRole('button', { name: /Toate valorile AMEPIP, pe ani/u }))
    const tables = within(amepip).getAllByRole('table')
    expect(tables).toHaveLength(2)
    // A checked ratio as a percent; the form's dividend rate as written, in both its scales.
    expect(within(tables[0]!).getByText('1,13')).toBeInTheDocument()
    expect(within(tables[1]!).getByText('0,5')).toBeInTheDocument()
    expect(within(tables[1]!).getByText('50')).toBeInTheDocument()
    // An unchecked „%" says so in words, not by colour alone.
    expect(within(tables[1]!).getAllByText('(scara nu e spusă de sursă)', { exact: false }).length).toBeGreaterThan(0)
  })

  it('gives each source its row in the status band, AMEPIP’s years run together', () => {
    renderPage()
    const status = band('stare')
    expect(within(status).getByText('2019–2024')).toBeInTheDocument()
    expect(within(status).getByText('nu e declarată inactivă')).toBeInTheDocument()
  })

  it('says in its place what is still reading or failed, the rest standing', () => {
    const retry = vi.fn()
    renderPage({ company: { status: 'failed', retry }, buyer: { status: 'pending' }, read: enterpriseReadFixture({ indicators: null, authorities: null, partial: true }) })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tursib SA')
    expect(within(band('amepip')).getByText('Indicatorii AMEPIP nu s-au putut citi acum.')).toBeInTheDocument()
    expect(within(band('control')).getByText(/Fișele autorităților nu s-au putut citi acum/u)).toBeInTheDocument()
    // The live lists failed, but the snapshot holds both authorities' portfolios: each still linked, its size unknown here.
    expect(within(band('control')).getAllByRole('link', { name: /Toate întreprinderile autorității/u }).map((link) => link.getAttribute('href'))).toEqual([
      '/public-enterprises/authorities/4270740',
      '/public-enterprises/authorities/45699112',
    ])
    fireEvent.click(within(band('bani')).getByRole('button', { name: 'Încearcă din nou' }))
    expect(retry).toHaveBeenCalled()
  })

  it('never draws the purchase lists when the purchases were not read', () => {
    renderPage({ buyer: ready({ ...BUYER, direct: { count: null, valued: null, value: null, suppliers: null } }) })
    const money = band('bani')
    expect(within(money).getByText(/achizițiile directe nu s-au putut citi acum/u)).toBeInTheDocument()
    expect(within(money).queryByText(/Nicio achiziție directă/u)).toBeNull()
    expect(within(money).getByRole('link', { name: /Achizițiile, pe pagina de achiziții/u })).toHaveAttribute('href', '/procurement/institutions/789401')
  })

  it('says a register the API reports unavailable is unread, never empty', () => {
    const sources = TURSIB_PROFILE.sources.map((source) => (source.family === 'amepip' ? { ...source, laneStatus: 'unavailable' } : source))
    renderPage({ read: enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, sources, registryObservations: TURSIB_PROFILE.registryObservations.filter((row) => row.sourceFamily === 's1001') }, indicators: [], partial: true }) })
    expect(within(band('amepip')).getByText('Registrul AMEPIP nu e încărcat acum.')).toBeInTheDocument()
    expect(within(band('stare')).getByText('registrul nu e încărcat acum')).toBeInTheDocument()
  })

  it('gives each source its line when one gave no name, the name said once', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: '4270740', authorityName: null, authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: '4270740', authorityName: 'CONSILIUL LOCAL MUNICIPIUL SIBIU', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    renderPage({ read: enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges } }) })
    const control = band('control')
    expect(within(control).getByText('fără nume în această sursă')).toBeInTheDocument()
    expect(within(control).getAllByText('Consiliul Local Municipiul Sibiu')).toHaveLength(1)
    expect(within(control).getByRole('link', { name: 'Consiliul Local Municipiul Sibiu' })).toHaveAttribute('href', '/entities/4270740')
  })

  it('says „no direct purchase" once, in the lede, and never reads an empty breakdown as none', () => {
    const none = { count: 0, valued: 0, value: null, suppliers: 0 }
    renderPage({ buyer: ready({ ...BUYER, direct: none }) })
    expect(within(band('bani')).queryByText(/Nicio achiziție directă/u)).toBeNull()
    expect(within(band('bani')).getByRole('link', { name: /Achizițiile, pe pagina de achiziții/u })).toBeInTheDocument()
    renderPage({ buyer: ready({ ...BUYER, categories: { direct: [], contract: [] }, directSuppliers: { rankedBy: 'value', rows: [] } }) })
    const money = document.querySelectorAll('section#bani')[1] as HTMLElement
    expect(within(money).getByText('Categoriile achizițiilor nu s-au putut citi acum.')).toBeInTheDocument()
    expect(within(money).getByText('Firmele de la care a cumpărat nu s-au putut citi acum.')).toBeInTheDocument()
  })

  it('says why the AMEPIP band has no answers to show', () => {
    const formOnly = TURSIB_PROFILE
    const indicators = enterpriseReadFixture().indicators!.filter((cell) => cell.sourceSheet === 'Indicatori formular' && !['W_TE', 'GC_MEET', 'GC_IND', 'GC_GEI', 'GC_BEN', 'FIN-DP'].includes(cell.kpiCode ?? ''))
    renderPage({ read: enterpriseReadFixture({ profile: formOnly, indicators: [...indicators, ...enterpriseReadFixture().indicators!.filter((cell) => cell.kpiCode === 'FIN-RCC'), { ...indicators[0]!, kpiCode: 'GC_PART', indicatorKey: 'GC_PART-2024', indicatorName: 'Rata de participare', measureUnit: '%', year: 2024, rawValue: '100', numericValue: '100', valueKind: 'number' }] }) })
    expect(within(band('amepip')).getByText('În formularul pe 2024, rândurile despre consiliu, oameni și dividende sunt goale.')).toBeInTheDocument()
  })

  it('names a nameless peer by its CUI only as a CUI, muted', () => {
    const authorities = { ...enterpriseReadFixture().authorities!, '4270740': { ...enterpriseReadFixture().authorities!['4270740']!, peers: { total: 2, items: [{ cui: '789401', organization: null }, { cui: '1558391', organization: { name: '1558391' } }] } } }
    renderPage({ read: enterpriseReadFixture({ authorities }) })
    expect(within(band('control')).getByRole('link', { name: 'Întreprinderea cu CUI 1558391' })).toHaveAttribute('href', '/public-enterprises/1558391')
  })

  it('names an authority neither source names once, by its budget record, credited', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: '4270740', authorityName: null, authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: '4270740', authorityName: null, authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    renderPage({ read: enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges } }) })
    const control = band('control')
    expect(within(control).queryByText('fără nume în această sursă')).toBeNull()
    expect(within(control).getByRole('link', { name: /Municipiul Sibiu/u })).toHaveAttribute('href', '/entities/4270740')
    expect(within(control).getByText('nume din fișa de buget')).toBeInTheDocument()
  })

  it('says a nameless enterprise by its CUI, never names it by it', () => {
    renderPage({ company: ready(null), read: enterpriseReadFixture({ cui: '1558391', profile: { ...TURSIB_PROFILE, cui: '1558391', organization: { name: '1558391' } } }) })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Întreprinderea cu CUI 1558391')
  })

  it('says when there is no company record, and never a status it did not read', () => {
    renderPage({ company: ready(null), read: enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: [] } }) })
    expect(screen.getByText('Fără fișă de firmă')).toBeInTheDocument()
    expect(screen.queryByText(/Registrul comerțului:/u)).toBeNull()
    expect(screen.getByText('Fără fișă de firmă: nicio situație financiară.')).toBeInTheDocument()
    // No source names an authority: the head's sentence says so once, and the control band and its place in the bar go.
    expect(screen.getByText(/E în lista ANAF, dar nicio listă nu-i numește autoritatea\./u)).toBeInTheDocument()
    expect(band('control')).toBeNull()
    const nav = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#bani', '#amepip', '#stare'])
  })
})
