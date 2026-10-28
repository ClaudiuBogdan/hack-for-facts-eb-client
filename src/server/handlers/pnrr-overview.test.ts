import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PnrrSearchState } from '@/schemas/pnrr'
import {
  processPnrrBeneficiaryPayments,
  processPnrrData,
  processPnrrOfficialIndicators,
} from '@/features/pnrr/lib/data-transform'
import { buildPnrrOverviewRequestPath } from '@/features/pnrr/lib/pnrr-overview-request'
import {
  buildPnrrQueryResult,
  buildPnrrWorkerModelFromRawFiles,
  createPnrrFilteredProjectsCache,
} from '@/features/pnrr/workers/pnrr-query-model'
import type {
  PnrrServerOverview,
  PnrrServerOverviewMapPreview,
} from '@/features/pnrr/workers/pnrr-worker-types'
import {
  fetchPnrrBeneficiaryPayments,
  fetchPnrrOfficialIndicators,
  fetchPnrrProjects,
  readCachedPnrrBeneficiaryPaymentsResult,
  readCachedPnrrOfficialIndicatorsResult,
  readCachedPnrrProjectsResult,
} from './pnrr-data-proxy'
import {
  handlePnrrOverviewRequest,
  readPnrrOverviewForSsr,
} from './pnrr-overview'

vi.mock('./pnrr-data-proxy', () => ({
  fetchPnrrBeneficiaryPayments: vi.fn(),
  fetchPnrrOfficialIndicators: vi.fn(),
  fetchPnrrProjects: vi.fn(),
  readCachedPnrrBeneficiaryPaymentsResult: vi.fn(),
  readCachedPnrrOfficialIndicatorsResult: vi.fn(),
  readCachedPnrrProjectsResult: vi.fn(),
}))

function rawProject(
  index: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id_angajament: 1000 + index,
    titlu_contract: `Proiect ${index}`,
    denumire_beneficiar: `Beneficiar ${index}`,
    cui: String(10_000 + index),
    judet_implementare: 'Cluj',
    localitate_implementare: 'Cluj-Napoca',
    sursa_finantare: 'grant',
    valoare_fe: 1_000_000 * index,
    progres_fizic: 0.1 * index,
    progres_financiar: 0.05 * index,
    cod_componenta: 'C10',
    cod_masura: 'I1',
    cri: 'MDLPA',
    ...overrides,
  }
}

const RAW_PROJECTS = [
  rawProject(1),
  rawProject(2, { judet_implementare: 'Alba', localitate_implementare: 'Alba Iulia', cod_componenta: 'C12' }),
  rawProject(3, { sursa_finantare: 'loan', cod_componenta: 'C12', cod_masura: 'I2' }),
  rawProject(4, {
    denumire_beneficiar: 'Municipiul București',
    cui: '4267117',
    judet_implementare: 'București',
    localitate_implementare: 'București',
  }),
  rawProject(5, { judet_implementare: 'Național', localitate_implementare: '' }),
  // A second record of project 1, with another funding source.
  rawProject(1, { sursa_finantare: 'loan', valoare_fe: 250_000 }),
  rawProject(6, { progres_fizic: 1, progres_financiar: 1 }),
]
const RAW_PAYMENTS = [
  { 'full legal name': 'Beneficiar 2', 'tax identification number': '10002', 'received amount in lei': 900_000 },
  { 'full legal name': 'Municipiul București', 'tax identification number': '4267117', 'received amount in lei': 2_000_000 },
]
const RAW_INDICATORS = {
  items: [{ alocat_eur: 21_410_527_592.99, platit_eur: 11_174_329_150.18, nr_beneficiari_plati: 6270 }],
}

const processed = processPnrrData(RAW_PROJECTS)
const payments = processPnrrBeneficiaryPayments(RAW_PAYMENTS)
const indicators = processPnrrOfficialIndicators(RAW_INDICATORS)
const workerModel = buildPnrrWorkerModelFromRawFiles({
  rawProjects: RAW_PROJECTS,
  payments: { status: 'fulfilled', value: RAW_PAYMENTS },
  indicators: { status: 'fulfilled', value: RAW_INDICATORS },
})

const SEARCHES: readonly Partial<PnrrSearchState>[] = [
  {},
  { counties: ['Cluj'] },
  { components: ['C12'], includeNational: false },
  { beneficiaryCui: '4267117' },
  { search: 'Proiect', fundingSources: ['loan'] },
  { onlyAnomalies: true },
]

/** What the worker posts for this search, as JSON would carry it. */
function workerOverview(search: Partial<PnrrSearchState>) {
  const result = buildPnrrQueryResult(
    workerModel,
    { search },
    createPnrrFilteredProjectsCache(),
  )
  return JSON.parse(JSON.stringify(result)) as typeof result
}

async function requestJson<TBody>(path: string): Promise<{
  readonly response: Response
  readonly body: TBody
}> {
  const response = await handlePnrrOverviewRequest(
    new Request(`https://example.test${path}`),
  )
  return { response, body: (await response.json()) as TBody }
}

function mockAvailableData() {
  const projects = {
    data: processed.projects,
    source: 'cache' as const,
    stale: false,
    projectCount: processed.meta.projectCount,
    projectRecordCount: processed.meta.projectRecordCount,
  }
  vi.mocked(fetchPnrrProjects).mockResolvedValue(projects)
  vi.mocked(readCachedPnrrProjectsResult).mockReturnValue(projects)
  vi.mocked(fetchPnrrBeneficiaryPayments).mockResolvedValue({
    data: payments,
    source: 'cache',
  })
  vi.mocked(readCachedPnrrBeneficiaryPaymentsResult).mockReturnValue({
    data: payments,
    stale: false,
  })
  vi.mocked(fetchPnrrOfficialIndicators).mockResolvedValue({
    data: indicators,
    source: 'cache',
  })
  vi.mocked(readCachedPnrrOfficialIndicatorsResult).mockReturnValue({
    data: indicators,
    source: 'cache',
    stale: false,
  })
}

describe('the server overview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAvailableData()
  })

  it.each(SEARCHES)(
    'equals the worker overview for %j',
    async (search) => {
      const { response, body } = await requestJson<PnrrServerOverview>(
        buildPnrrOverviewRequestPath(search),
      )
      const { mapPreview: _mapPreview, ...expectedOverview } =
        workerOverview(search).overview
      const expectedMeta = workerOverview(search).meta

      expect(response.status).toBe(200)
      expect(body.overview).toEqual(expectedOverview)
      expect(body.meta).toEqual({
        projectCount: expectedMeta.projectCount,
        projectRecordCount: expectedMeta.projectRecordCount,
        beneficiaryPaymentCount: expectedMeta.beneficiaryPaymentCount,
        officialAllocatedTotalEur: expectedMeta.officialAllocatedTotalEur,
        officialPaidTotalEur: expectedMeta.officialPaidTotalEur,
        paidBeneficiaryCount: expectedMeta.paidBeneficiaryCount,
        paymentCapability: expectedMeta.paymentCapability,
        indicatorCapability: expectedMeta.indicatorCapability,
      })
      expect(response.headers.get('cache-control')).toContain('max-age=60')
    },
  )

  it('sends the worker map preview, with the UAT the reader opened', async () => {
    const search: Partial<PnrrSearchState> = {
      panel: 'map-uat',
      panelUatSiruta: '179132',
    }
    const { body } = await requestJson<PnrrServerOverviewMapPreview>(
      buildPnrrOverviewRequestPath(search, 'map-preview'),
    )
    const expected = workerOverview(search).overview.mapPreview

    expect(expected.uatProjectCount).toBeGreaterThan(0)
    expect(expected.selectedUatProjects.length).toBeGreaterThan(0)
    expect(body.mapPreview).toEqual(expected)
  })

  it('names the active UAT and beneficiary filters as the worker would', async () => {
    const search: Partial<PnrrSearchState> = {
      beneficiaryCui: '4267117',
      uatSiruta: '179132',
    }
    const { body } = await requestJson<PnrrServerOverview>(
      buildPnrrOverviewRequestPath(search),
    )
    const worker = workerOverview(search)

    expect(body.labels.uats).toEqual(
      worker.filterFacets.uats
        .filter((uat) => uat.value === '179132')
        .map((uat) => ({ siruta: uat.value, label: uat.label })),
    )
    expect(body.labels.beneficiaries).toEqual(
      worker.beneficiaryPage.rows
        .filter((row) => row.cui === '4267117')
        .map((row) => ({ cui: row.cui, name: row.name })),
    )
  })

  it('serves a degraded overview uncached when the payments file fails', async () => {
    vi.mocked(fetchPnrrBeneficiaryPayments).mockRejectedValue(
      new Error('upstream'),
    )

    const { response, body } = await requestJson<PnrrServerOverview>(
      buildPnrrOverviewRequestPath({}),
    )

    expect(body.meta.paymentCapability).toBe('degraded')
    expect(body.overview.beneficiaryRankingSource).toBe('listed-project-value')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects a search the page would reject', async () => {
    const { response } = await requestJson<unknown>(
      `/api/pnrr/overview?fundingSources=${encodeURIComponent('["gift"]')}`,
    )

    expect(response.status).toBe(400)
  })

  it('answers 502 when the projects cannot be read', async () => {
    vi.mocked(fetchPnrrProjects).mockRejectedValue(new Error('upstream'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { response } = await requestJson<unknown>(
      buildPnrrOverviewRequestPath({}),
    )

    expect(response.status).toBe(502)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})

describe('readPnrrOverviewForSsr', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAvailableData()
  })

  it('renders the same overview as the API from the data in memory', async () => {
    const search: Partial<PnrrSearchState> = { counties: ['Cluj'] }
    const { body } = await requestJson<PnrrServerOverview>(
      buildPnrrOverviewRequestPath(search),
    )

    expect(
      JSON.parse(JSON.stringify(readPnrrOverviewForSsr(search))),
    ).toEqual(body)
  })

  it('renders nothing and starts loading the data when it is not in memory', () => {
    vi.mocked(readCachedPnrrBeneficiaryPaymentsResult).mockReturnValue(null)

    expect(readPnrrOverviewForSsr({})).toBeNull()
    expect(fetchPnrrBeneficiaryPayments).toHaveBeenCalled()
  })
})
