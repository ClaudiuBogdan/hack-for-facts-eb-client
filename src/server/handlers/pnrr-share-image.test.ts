import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import {
  buildPnrrShareImageResponseHeaders,
  buildPnrrShareImageViewModel,
} from './pnrr-share-image'
import type { PnrrSeoSnapshot } from '@/features/pnrr/seo/pnrr-seo'

function makeSnapshot(): PnrrSeoSnapshot {
  return {
    lastUpdated: '2026-04-30',
    projectCount: 24885,
    deduplicatedProjectCount: 24000,
    totalValueEur: 21_400_000_000,
    deduplicatedTotalValueEur: 21_000_000_000,
    completedCount: 9000,
    completedValueEur: 8_000_000_000,
    inProgressCount: 14000,
    notStartedCount: 1885,
    loanTotalEur: 6_000_000_000,
    loanPercent: 28.04,
    missingFinancialProgressCount: 3000,
    missingFinancialProgressPercent: 12.06,
    anomalyCount: 512,
    dataQualitySignalCount: 120,
    topComponents: [
      {
        id: 'C7',
        label: 'Transformare digitala',
        count: 1200,
        valueEur: 4_000_000_000,
      },
    ],
    topCounties: [
      {
        id: 'Cluj',
        label: 'Cluj',
        count: 900,
        valueEur: 800_000_000,
      },
    ],
    topBeneficiaries: [],
  }
}

function makeSnapshotWithNationalTopCounty(): PnrrSeoSnapshot {
  return {
    ...makeSnapshot(),
    topCounties: [
      {
        id: 'Național',
        label: 'National',
        count: 5000,
        valueEur: 10_000_000_000,
      },
    ],
  }
}

describe('pnrr-share-image', () => {
  afterEach(() => {
    i18n.activate('ro')
  })

  it('builds a compact view model from a PNRR SEO snapshot', () => {
    const viewModel = buildPnrrShareImageViewModel(makeSnapshot())

    expect(viewModel.title).toBe('PNRR Romania')
    expect(viewModel.totalValue).toContain('EUR')
    expect(viewModel.projectCount).toBeTruthy()
    expect(viewModel.topComponent).toBe('Transformare digitala')
    expect(viewModel.topCounty).toBe('Cluj')
    expect(viewModel.updatedLabel).toContain('2026')
  })

  it('formats Romanian currency even when the active app locale is English', () => {
    i18n.activate('en')
    const viewModel = buildPnrrShareImageViewModel(makeSnapshot())

    expect(viewModel.totalValue).toBe('21,4\u00A0mld.\u00A0EUR')
  })

  it('uses Total instead of National for the unfiltered share image scope', () => {
    const viewModel = buildPnrrShareImageViewModel(
      makeSnapshotWithNationalTopCounty(),
      { showTotalScope: true },
    )

    expect(viewModel.topCounty).toBe('Total')
  })

  it('builds cacheable and fallback response headers', () => {
    expect(buildPnrrShareImageResponseHeaders({ cacheable: true })).toMatchObject({
      'content-type': 'image/png',
      'cdn-cache-control': expect.stringContaining('max-age=86400'),
    })
    expect(buildPnrrShareImageResponseHeaders({ cacheable: false })).toEqual({
      'content-type': 'image/png',
      'cache-control': 'no-store',
    })
  })
})
