import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatisticsDatasetSeries } from '@/schemas/statistics'
import type { ResolvedDatasetSeries } from '../lib/detail-series-resolution'
import type { RepresentativeCell } from '../lib/representative-series'
import {
  detailDataset,
  detailLatest,
  detailObservation,
  detailTier0,
} from '../test/detail-fixtures'
import { StatisticsDatasetDetailPage } from './statistics-dataset-detail-page'

const { useDatasetTier0Mock, useDatasetSeriesMock, useRelatedDatasetsMock } = vi.hoisted(() => ({
  useDatasetTier0Mock: vi.fn(),
  useDatasetSeriesMock: vi.fn(),
  useRelatedDatasetsMock: vi.fn(),
}))

vi.mock('../hooks/use-dataset-detail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/use-dataset-detail')>()
  return {
    ...actual,
    useDatasetTier0: (params: unknown) => useDatasetTier0Mock(params),
    useDatasetSeries: (params: unknown) => useDatasetSeriesMock(params),
    useRelatedDatasets: (contextCode: unknown) => useRelatedDatasetsMock(contextCode),
  }
})

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({
    i18n: {
      locale: 'ro',
      _: (message: string | { readonly id: string; readonly message?: string }) =>
        typeof message === 'string' ? message : (message.message ?? message.id),
    },
  }),
}))

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({ children, ...props }: { readonly children: ReactNode }) => <a {...props}>{children}</a>,
}))

const tier0 = detailTier0()

// Deliberately synthetic certified fixture: one source coordinate, three annual cells.
const series: StatisticsDatasetSeries = {
  nativeContract: 'native-v1',
  readMode: 'complete',
  sourceDescriptor: insSourceDescriptorSchema.parse(tier0.dataset),
  observations: [2023, 2024, 2025].map((year) => detailObservation(year)),
  totalCount: 3,
}

const resolved = (
  data: StatisticsDatasetSeries | null = series,
  representative: RepresentativeCell | null = null,
): ResolvedDatasetSeries => ({ nativeContract: 'resolved-v1', series: data, representative, issues: [] })

/** Digits-only matcher so locale grouping and split nodes never break it. */
const byDigits = (expected: string) => (content: string) =>
  content.replace(/\D/g, '') === expected && /\d/.test(content)

const queryStub = (data: unknown) => ({
  data,
  isPending: false,
  isError: false,
  isSuccess: true,
  refetch: vi.fn(),
})

const idleQuery = { data: undefined, isPending: false, isError: false, isSuccess: false, refetch: vi.fn() }

function mount(search: Parameters<typeof StatisticsDatasetDetailPage>[0]['search'] = {}, code = 'POP107D') {
  const onChange = vi.fn()
  render(<StatisticsDatasetDetailPage code={code} search={search} onSearchChange={onChange} />)
  return onChange
}

describe('StatisticsDatasetDetailPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useDatasetTier0Mock.mockReturnValue(queryStub(tier0))
    useDatasetSeriesMock.mockReturnValue(queryStub(resolved()))
    useRelatedDatasetsMock.mockReturnValue({ data: undefined })
  })

  it('never writes the URL on a default render (defaults stay out of it)', () => {
    const onChange = mount()
    expect(screen.getAllByText(byDigits('21002025')).length).toBeGreaterThan(0)
    expect(navigateMock).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(document.title).toContain('Populația după domiciliu (POP107D)')
  })

  it('lists the related matrices of the context without the dataset itself', () => {
    useRelatedDatasetsMock.mockReturnValue({
      data: {
        datasets: [
          { code: 'POP107D', nameRo: 'Populația după domiciliu', nameEn: null, dataStatus: 'available' },
          { code: 'POP105A', nameRo: 'Populația rezidentă', nameEn: null, dataStatus: 'available' },
        ],
        totalCount: 2,
      },
    })
    mount()
    expect(useRelatedDatasetsMock).toHaveBeenCalledWith('1012')
    expect(screen.getByRole('button', { name: /Seturi înrudite \(1\)/ })).toBeInTheDocument()
  })

  it.each([false, true])('keeps the latest null cell and status (all null: %s)', (allNull) => {
    useDatasetSeriesMock.mockReturnValue(
      queryStub(
        resolved({
          ...series,
          observations: series.observations.map((row) => ({
            ...row,
            value: allNull || row.time_period.year === 2025 ? null : row.value,
            value_status: row.time_period.year === 2025 ? 'c' : row.value_status,
          })),
        }),
      ),
    )
    mount()
    expect(screen.getByText('Fără o valoare recentă pentru selecția curentă.')).toBeInTheDocument()
    expect(screen.getByText(/date confidențiale/)).toBeInTheDocument()
    expect(screen.getAllByText(/2025/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Nicio observație')).not.toBeInTheDocument()
    // Scoped to the headline block. The FIGURE must not present 2024's value
    // as the latest when INS's own latest cell is confidential; the chart
    // below may still label the last point it plots, which is a different
    // claim and a true one.
    expect(
      within(screen.getByTestId('series-summary')).queryByText(byDigits('21002024')),
    ).not.toBeInTheDocument()
  })

  it('shows the cell the resolution chose on the rail, and keeps it out of the URL', () => {
    // POST A answers NO_DATA for any matrix without a row at the requested
    // entity; the resolution picks a cell from the rows and says it did.
    useDatasetTier0Mock.mockReturnValue(queryStub({ ...tier0, latest: null }))
    useDatasetSeriesMock.mockReturnValue(
      queryStub(
        resolved(series, {
          classifications: { D0: '931', D1: '105' },
          unitCode: '0',
          periodicity: 'ANNUAL',
        }),
      ),
    )
    const onChange = mount({ clasificari: ['D0:931'], unitate: '0' })
    expect(screen.getByRole('button', { name: 'Descarcă CSV' })).toBeEnabled()
    expect(screen.getAllByText(byDigits('21002025')).length).toBeGreaterThan(0)
    // Named where the reader can change it — on the rail, as its plain
    // value, not with a badge beside the figure…
    expect(screen.getByRole('button', { name: /^Sexe: Total$/ })).toBeInTheDocument()
    expect(screen.queryByText('selecție reprezentativă')).not.toBeInTheDocument()
    expect(screen.queryByText('Alege ce vrei să vezi')).not.toBeInTheDocument()
    // …and, being a default, it stays out of the URL.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the header and the rail while the dataset re-reads for a newly pinned scope', () => {
    // The first pin moves the entity from national to none — a new tier-0
    // key. The dataset the placeholder holds is this one; its resolved cell
    // is the previous entity's and must not seed a read.
    useDatasetTier0Mock.mockReturnValue({ ...queryStub(tier0), isPlaceholderData: true })
    useDatasetSeriesMock.mockReturnValue({ ...idleQuery, isPending: true })
    mount({ clasificari: ['D1:107'] })
    expect(screen.getByRole('heading', { level: 1, name: 'Populația după domiciliu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sexe: 107/ })).toBeInTheDocument()
    expect(screen.getByTestId('series-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Alege ce vrei să vezi')).not.toBeInTheDocument()
    expect(useDatasetSeriesMock).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, latest: null }))
  })

  it('keeps the POST-A hero visible when the series fails, with a retry beside it', () => {
    useDatasetSeriesMock.mockReturnValue({ ...idleQuery, isError: true })
    mount()
    expect(screen.getAllByText(byDigits('21739373')).length).toBeGreaterThan(0)
    expect(screen.getByText('Nu am putut încărca seria de date')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reîncearcă' })).toBeInTheDocument()
  })

  it('draws the series skeleton while the address resolves, with the rail already usable', () => {
    useDatasetSeriesMock.mockReturnValue({ ...idleQuery, isPending: true })
    mount()
    const skeleton = screen.getByTestId('series-skeleton')
    // What the page already knows is shown as it will be: the figure the
    // first read resolved, and the years the chart is about to span.
    expect(within(skeleton).getByTestId('skeleton-known-figure').textContent?.replace(/\D/g, '')).toContain('21739373')
    // The axes are placeholders: the loaded span is whatever the rows cover.
    expect(within(screen.getByTestId('chart-skeleton')).queryByText('1992')).not.toBeInTheDocument()
    expect(within(skeleton).getByRole('status')).toHaveTextContent('Se încarcă seria de date')
    // No rows yet to name the member, so the rail shows the pin itself.
    expect(screen.getByRole('button', { name: /^Sexe: 105$/ })).toBeInTheDocument()
  })

  it.each([
    { label: 'persons', unit: { code: '0', symbol: 'pers.', name_ro: 'Numar persoane' } },
    { label: 'a bare count', unit: { code: '0', symbol: 'count', name_ro: 'Numar' } },
  ])('keeps the figure, its unit and its year in place when the series lands ($label)', ({ unit }) => {
    // One cell told consistently: the first read's latest is the series' last row.
    const consistent = detailTier0({
      latest: detailLatest({ value: '21002025', period: '2025', unitSymbol: unit.symbol, unitNameRo: unit.name_ro }),
    })
    const rows: StatisticsDatasetSeries = {
      ...series,
      observations: [2023, 2024, 2025].map((year) => detailObservation(year, { unit })),
    }
    useDatasetTier0Mock.mockReturnValue(queryStub(consistent))
    useDatasetSeriesMock.mockReturnValue({ ...idleQuery, isPending: true })
    // A fresh element each time: React skips re-rendering an identical one.
    const page = () => <StatisticsDatasetDetailPage code="POP107D" search={{}} onSearchChange={vi.fn()} />
    const { rerender } = render(page())
    const line = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, ' ').trim()
    const loading = line(screen.getByTestId('skeleton-known-figure'))

    useDatasetSeriesMock.mockReturnValue(queryStub(resolved(rows)))
    rerender(page())
    expect(screen.queryByTestId('series-skeleton')).not.toBeInTheDocument()
    const loaded = line(screen.getByTestId('series-latest-value').parentElement)
    expect(loading).toBe(loaded)
    expect(loaded?.replace(/\D/g, '')).toBe('210020252025')
  })

  it('holds back a loading figure the pinned window would replace', () => {
    useDatasetSeriesMock.mockReturnValue({ ...idleQuery, isPending: true })
    mount({ din: 2010, pana: 2012 })
    // The window shows its own last year, not the series' latest.
    expect(screen.getByTestId('series-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('skeleton-known-figure')).not.toBeInTheDocument()
  })

  it('keeps catalog-only datasets in the request state without a fake series', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub(
        detailTier0({
          dataset: detailDataset({ code: 'TUR101C', data_status: 'CATALOG_ONLY', sync_status: 'PENDING' }),
          latest: detailLatest({ datasetCode: 'TUR101C', matchStrategy: 'NO_DATA', hasData: false, value: null }),
        }),
      ),
    )
    mount({}, 'TUR101C')
    expect(screen.getByTestId('catalog-only-body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cere setul / })).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(useDatasetSeriesMock).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('renders the rail with the prompt when a dimension is unresolved', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub(
        detailTier0({
          latest: detailLatest({
            resolvedClassifications: [],
            matchStrategy: 'NO_DATA',
            hasData: false,
            value: null,
          }),
        }),
      ),
    )
    useDatasetSeriesMock.mockReturnValue(idleQuery)
    mount()
    // The way OUT stays on screen: the RAIL renders (a segment button, not
    // just the prompt — the prompt alone would satisfy a /alege/ match),
    // and the prompt names ONLY the unresolved dimension.
    expect(screen.getByRole('button', { name: /^Sexe: alege/ })).toBeInTheDocument()
    expect(screen.getByText(/Alege o valoare pentru: Sexe/)).toBeInTheDocument()
    expect(useDatasetSeriesMock).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('names an empty read for a territory the matrix does not publish, with the way out', () => {
    // A region into a county series: the read succeeds with no row, which
    // used to leave every axis at „alege" and no way to clear the territory.
    useDatasetTier0Mock.mockReturnValue(queryStub({ ...tier0, latest: null }))
    useDatasetSeriesMock.mockReturnValue(
      queryStub(resolved({ ...series, readMode: 'inspection', inspectionTruncated: false, observations: [] })),
    )
    const onChange = mount({ teritoriu: 'cod:RO11' })
    expect(screen.getByText('INS nu publică această serie pentru teritoriul din adresă.')).toBeInTheDocument()
    expect(screen.queryByText('Alege ce vrei să vezi')).not.toBeInTheDocument()
    screen.getByRole('button', { name: 'Șterge filtrul teritorial' }).click()
    expect(onChange).toHaveBeenCalledWith({ teritoriu: undefined })
  })

  it('shows the whole span and says so when the address asks for years past the series', () => {
    const onChange = mount({ din: 2030, pana: 2035 })
    expect(screen.getByRole('figure')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Anii 2030–2035 din adresă sunt în afara seriei/)
    expect(screen.getByRole('button', { name: /^Interval de ani: 2023–2025$/ })).toBeInTheDocument()
    screen.getByRole('button', { name: 'Șterge anii din adresă' }).click()
    expect(onChange).toHaveBeenCalledWith({ din: undefined, pana: undefined })
  })

  it('refuses a malformed explicit selection: no default in its place, and the way to clear it', () => {
    useDatasetSeriesMock.mockReturnValue(queryStub(resolved(null)))
    mount({ clasificari: ['D0:931', 'D0:932'] })
    expect(useDatasetTier0Mock).toHaveBeenCalledWith(expect.objectContaining({ entity: null }))
    expect(screen.getByText('Selecția din adresă nu poate fi aplicată')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Șterge clasificările invalide' })).toBeInTheDocument()
    expect(screen.queryByText(byDigits('21002025'))).not.toBeInTheDocument()
  })

  it('reports a matrix whose published structure cannot be verified, not the address', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub(detailTier0({ dataset: detailDataset({ dimensions: [], dimension_count: 0 }), latest: null })),
    )
    useDatasetSeriesMock.mockReturnValue(queryStub(resolved(null)))
    mount()
    expect(screen.getByText('Structura acestei matrice nu poate fi verificată')).toBeInTheDocument()
    expect(screen.queryByText('Selecția din adresă nu poate fi aplicată')).not.toBeInTheDocument()
  })

  it('allows choosing a complete source row while retaining the canonical filter in parent state', async () => {
    useDatasetTier0Mock.mockReturnValue(queryStub({ ...tier0, latest: null }))
    useDatasetSeriesMock.mockReturnValue(
      queryStub(resolved(series, { classifications: { D0: '931', D1: '105' }, unitCode: '0', periodicity: 'ANNUAL' })),
    )
    const onChange = mount({ teritoriu: 'cod:RO', clasificari: ['D0:931'] })
    // The default series is on screen; picking a row from the table replaces
    // it with an explicit selection.
    expect(screen.getByRole('figure')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Tabelul seriei/ }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Alege această serie' })[0]!)
    expect(onChange).toHaveBeenCalledWith({
      clasificari: ['D0:931', 'D1:105'],
      unitate: '0',
      pagina: undefined,
      teritoriu: undefined,
    })
  })

  it('shows what INS publishes about the matrix: methodology with its report link, sources without markers, continuity', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub(
        detailTier0({
          dataset: detailDataset({
            methodology_ro:
              'Obiectivul cercetarii statistice anuale privind costul fortei de munca.\r\n<a href="https://insse.ro/cms/files/raport.pdf" target="_blank"> Raport de metadate si calitate </a>\r\n',
            data_sources_ro: 'Cercetarea statistica privind costul fortei de munca <<6263>>',
            data_sources: [
              {
                name: 'Cercetarea statistica privind costul fortei de munca <<6263>>',
                type: 'Surse statistice (INS)',
                type_code: 1,
                link_number: 6263,
              },
            ],
            observations_ro: 'Datele sunt disponibile incepand cu anul 2008.',
            continues_from: [
              { dataset_code: 'FOM106A', last_period_ro: 'Anul 2008', last_period_en: 'Year 2008' },
            ],
            source_last_update: '2025-09-04',
          }),
        }),
      ),
    )
    mount()
    expect(screen.getByTestId('dataset-metadata')).toBeInTheDocument()
    // Numbered sections, not chevrons: what INS published is on screen without
    // a click.
    expect(screen.getByText(/Obiectivul cercetarii statistice anuale/)).toBeInTheDocument()
    const report = screen.getByRole('link', { name: 'Raport de metadate si calitate' })
    expect(report).toHaveAttribute('href', 'https://insse.ro/cms/files/raport.pdf')
    expect(report).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Cercetarea statistica privind costul fortei de munca')).toBeInTheDocument()
    expect(screen.queryByText(/<<6263>>/)).not.toBeInTheDocument()
    expect(screen.getByText('FOM106A')).toBeInTheDocument()
    expect(screen.getByText(/Anul 2008/)).toBeInTheDocument()
    // The publication date is a fact about the data, not a section of its own:
    // it reads on the provenance line under the title, next to the matrix code
    // it dates, and the source's own name is the link back to it.
    expect(screen.getByText(/actualizată/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Deschide matricea POP107D/ })).toHaveAttribute(
      'href',
      'http://statistici.insse.ro/tempoins/index.jsp?ind=POP107D&lang=ro&page=tempo3',
    )
  })

  it('renders the definition’s published anchor as a link, never as markup', () => {
    useDatasetTier0Mock.mockReturnValue(
      queryStub(
        detailTier0({
          dataset: detailDataset({
            definition_ro:
              'Conturile de patrimoniu, vezi <a href="https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:02013R0549" target="_blank">Regulamentul 549/2013</a>.',
          }),
        }),
      ),
    )
    mount()
    expect(screen.getByRole('link', { name: 'Regulamentul 549/2013' })).toHaveAttribute(
      'href',
      'https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:02013R0549',
    )
    expect(screen.queryByText(/<a href/)).not.toBeInTheDocument()
  })

  it('puts no staleness badge over the title: the source line and the figure’s year say how current it is', () => {
    useDatasetTier0Mock.mockReturnValue(queryStub({ ...tier0, latest: null }))
    useDatasetSeriesMock.mockReturnValue(
      queryStub(
        resolved(
          {
            ...series,
            observations: series.observations.map((observation, index) => ({
              ...observation,
              time_period: { ...observation.time_period, iso_period: String(1998 + index), year: 1998 + index },
            })),
          },
          { classifications: { D0: '931', D1: '105' }, unitCode: '0', periodicity: 'ANNUAL' },
        ),
      ),
    )
    mount({ clasificari: ['D1:105'] })
    expect(screen.queryByText(/posibil neactualizat/)).not.toBeInTheDocument()
    expect(within(screen.getByTestId('series-summary')).getAllByText(/în 2000/).length).toBeGreaterThan(0)
  })

  it('renders no metadata section when INS published none of it', () => {
    mount()
    expect(screen.queryByTestId('dataset-metadata')).not.toBeInTheDocument()
  })
})
