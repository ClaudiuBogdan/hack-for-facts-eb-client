import { describe, expect, it } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import { computeAggregates } from '../lib/data-transform'
import {
  buildAnomalyModel,
  buildBeneficiaryPage,
  buildCsv,
  buildMapModel,
  buildTopBeneficiaries,
  findBeneficiaryDetail,
} from './pnrr-data.worker'
import type { PnrrWorkerModel } from './pnrr-worker-types'

function makeProject(
  index: number,
  overrides: Partial<PnrrProject> = {},
): PnrrProject {
  const id = String(index).padStart(2, '0')

  return {
    id: `engagement:${id}`,
    engagementId: id,
    title: `Project ${id}`,
    beneficiary: `Beneficiary ${id}`,
    cui: `100${id}`,
    county: 'București',
    locality: 'București',
    fundingSource: 'grant',
    valueEur: 1_000_000 - index,
    techProgress: 50,
    finProgress: 40,
    status: 'mid-progress',
    componentCode: 'C4',
    measureCode: 'I3',
    measureFullCode: 'C4-I3',
    cri: 'MTI',
    anomalies: [],
    dataQualitySignals: [],
    isReform: false,
    entityType: 'public',
    beneficiaryType: 'uat',
    sirutaCode: null,
    ...overrides,
  }
}

describe('buildAnomalyModel', () => {
  it('returns rows for the requested anomaly page', () => {
    const projects = Array.from({ length: 3 }, (_, index) =>
      makeProject(index + 1, {
        anomalies: ['payment-ahead-delivery'] as const,
        techProgress: 10,
        finProgress: 80,
      }),
    )

    const model = buildAnomalyModel(projects, {
      view: 'anomalies',
      anomalyTypes: ['payment-ahead-delivery'],
      page: 2,
      pageSize: 2,
    })

    expect(model.totalCount).toBe(3)
    expect(model.rows.map((row) => row.id)).toEqual(['engagement:03'])
  })

  it('keeps stable facet counts and ORs risk with data-quality selections', () => {
    const projects = [
      makeProject(1, {
        anomalies: ['financial-overrun'],
      }),
      makeProject(2, {
        dataQualitySignals: ['large-missing-financial-progress'],
      }),
      makeProject(3),
    ]

    const model = buildAnomalyModel(projects, {
      view: 'anomalies',
      anomalyTypes: ['financial-overrun'],
      dataQualitySignalTypes: ['large-missing-financial-progress'],
    })

    expect(model.riskCount).toBe(1)
    expect(model.dataQualityCount).toBe(1)
    expect(model.totalCount).toBe(2)
  })
})

describe('buildTopBeneficiaries', () => {
  it('enriches payment beneficiaries outside the aggregate top 20', () => {
    const projects = Array.from({ length: 25 }, (_, index) =>
      makeProject(index + 1),
    )
    const targetProject = projects[24]
    const model: PnrrWorkerModel = {
      projects,
      records: [],
      beneficiaryPayments: [
        {
          id: 'payment:10025',
          beneficiary: targetProject.beneficiary,
          cui: targetProject.cui,
          valueRon: 5_000_000,
          lastPaymentDate: null,
        },
      ],
      indicators: null,
      projectCount: projects.length,
      projectRecordCount: projects.length,
    }

    const [target] = buildTopBeneficiaries(
      model,
      projects,
      computeAggregates(projects),
    )

    expect(target.count).toBe(1)
    expect(target.secondaryValueEur).toBe(targetProject.valueEur)
  })
})

describe('buildBeneficiaryPage', () => {
  it('uses CUI-first identity and retains published name aliases', () => {
    const page = buildBeneficiaryPage(
      [
        makeProject(1, {
          beneficiary: 'COMPANIA EXEMPLU',
          cui: 'RO 12345678',
          valueEur: 100,
        }),
        makeProject(2, {
          beneficiary: 'COMPANIA EXEMPLU S.A.',
          cui: '12345678',
          valueEur: 200,
        }),
      ],
      {},
    )

    expect(page.rows).toHaveLength(1)
    expect(page.rows[0]).toMatchObject({
      cui: '12345678',
      count: 2,
      value: 300,
    })
    expect([page.rows[0].name, ...page.rows[0].aliases].sort()).toEqual([
      'COMPANIA EXEMPLU',
      'COMPANIA EXEMPLU S.A.',
    ])
  })

  it('computes progress averages once per grouped project', () => {
    const first = makeProject(1, {
      beneficiary: 'BENEFICIAR',
      cui: '123',
      techProgress: 50,
    })
    const firstDuplicateSlice = {
      ...first,
      id: 'first-duplicate-slice',
      valueEur: 25,
    }
    const groupedFirst: PnrrProject = {
      ...first,
      valueEur: first.valueEur + firstDuplicateSlice.valueEur,
      totalValueEur: first.valueEur + firstDuplicateSlice.valueEur,
      recordCount: 2,
      records: [first, firstDuplicateSlice],
    }
    const second = makeProject(2, {
      beneficiary: 'BENEFICIAR',
      cui: '123',
      techProgress: 100,
    })

    const page = buildBeneficiaryPage([groupedFirst, second], {})

    expect(page.rows[0].count).toBe(2)
    expect(page.rows[0].techProgressAvg).toBe(75)
  })

  it('keeps mixed-beneficiary project values scoped in beneficiary details', () => {
    const firstRecord = makeProject(1, {
      beneficiary: 'BENEFICIAR A',
      cui: '111',
      valueEur: 100,
      techProgress: 10,
    })
    const secondRecord = {
      ...makeProject(1, {
        beneficiary: 'BENEFICIAR B',
        cui: '222',
        valueEur: 300,
        techProgress: 90,
      }),
      id: 'engagement:01-second-record',
    }
    const groupedProject: PnrrProject = {
      ...firstRecord,
      valueEur: 400,
      totalValueEur: 400,
      recordCount: 2,
      records: [firstRecord, secondRecord],
    }

    const page = buildBeneficiaryPage([groupedProject], {})
    expect(page.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cui: '111',
          count: 1,
          value: 100,
          techProgressAvg: 10,
        }),
        expect.objectContaining({
          cui: '222',
          count: 1,
          value: 300,
          techProgressAvg: 90,
        }),
      ]),
    )

    const detail = findBeneficiaryDetail([groupedProject], { cui: '111' })
    expect(detail?.projects).toHaveLength(1)
    expect(detail?.projects[0]).toMatchObject({
      beneficiary: 'BENEFICIAR A',
      valueEur: 100,
      recordCount: 1,
    })
  })

  it('keeps beneficiary signal counts complete when project rows are capped', () => {
    const projects = Array.from({ length: 101 }, (_, index) =>
      makeProject(index + 1, {
        beneficiary: 'BENEFICIAR MARE',
        cui: '999',
        anomalies: ['financial-overrun'],
        dataQualitySignals: ['duplicate-conflict'],
      }),
    )

    const detail = findBeneficiaryDetail(projects, { cui: '999' })

    expect(detail?.count).toBe(101)
    expect(detail?.projects).toHaveLength(100)
    expect(detail?.riskProjectCount).toBe(101)
    expect(detail?.dataQualityProjectCount).toBe(101)
  })
})

describe('buildMapModel', () => {
  it('omits per-capita territories when population is unavailable', () => {
    const project = makeProject(1, {
      sirutaCode: '999999999',
      valueEur: 123_000,
    })

    const model = buildMapModel([project], {}, 'per-capita', 'uat')

    expect(model.series.data).toHaveLength(0)
    expect(model.series.coveredUnitCount).toBe(0)
    expect(model.series.totalUnitCount).toBe(1)
    expect(model.series.excludedValue).toBe(123_000)
  })

  it('weights implementation progress once per project within a territory', () => {
    const firstSlice = makeProject(1, {
      sirutaCode: '179132',
      techProgress: 0,
    })
    const secondSlice = {
      ...firstSlice,
      id: 'first-second-slice',
      techProgress: 100,
    }
    const secondProject = makeProject(2, {
      sirutaCode: '179132',
      techProgress: 100,
    })

    const model = buildMapModel(
      [firstSlice, secondSlice, secondProject],
      {},
      'implementation-rate',
      'uat',
    )

    expect(model.series.data).toHaveLength(1)
    expect(model.series.data[0].amount).toBe(75)
  })
})

describe('buildCsv', () => {
  it('neutralizes spreadsheet formulas and includes source provenance', () => {
    const csv = buildCsv(
      [
        makeProject(1, {
          title: '=2+2',
          beneficiary: '\tCMD',
          sourceValueRon: 5_000_000,
          sourceUrl: 'https://mfe.gov.ro/pnrr-dashboard',
        }),
      ],
      { sortBy: 'title', sortOrder: 'asc' },
    )

    expect(csv).toContain('source_fileset_id,source_url,scope_note')
    expect(csv).toContain('https://mfe.gov.ro/pnrr-dashboard')
    expect(csv).toContain("'=2+2")
    expect(csv).toContain("'\tCMD")
    expect(csv).toContain('\r\n')
  })
})
