import { describe, expect, it } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import { computeAggregates } from '../lib/data-transform'
import { buildAnomalyModel, buildTopBeneficiaries } from './pnrr-data.worker'
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
