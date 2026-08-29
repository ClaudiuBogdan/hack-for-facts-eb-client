import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { buildEffectiveScope, buildSeriesFilter } from './dataset-selection'
import type { StatisticsLatestValue } from '@/schemas/statistics'

it('prints the series filter for the FEMININ pin (scratch)', () => {
  const latest: StatisticsLatestValue = {
    datasetCode: 'POP107D',
    datasetNameRo: null,
    datasetNameEn: null,
    periodicity: ['ANNUAL'],
    matchStrategy: 'PREFERRED_CLASSIFICATION',
    hasData: true,
    value: '21739373',
    valueStatus: null,
    unitCode: 'PERS',
    unitSymbol: 'pers.',
    unitNameRo: null,
    period: '2025',
    resolvedPeriodicity: 'ANNUAL',
    resolvedClassifications: [
      { typeCode: 'SEX', code: 'TOTAL', nameRo: 'Total ' },
      { typeCode: 'AGE_GROUP', code: 'TOTAL', nameRo: 'Total' },
    ],
  }
  const scope = buildEffectiveScope({
    search: { clasificari: ['SEX:FEMININ'] },
    latest,
  })
  const out: string[] = []
  out.push('PINNED-FILTER::' + JSON.stringify(buildSeriesFilter(scope)))
  const defaultScope = buildEffectiveScope({ search: {}, latest })
  out.push('DEFAULT-FILTER::' + JSON.stringify(buildSeriesFilter(defaultScope)))
  writeFileSync('/Users/claudiuconstantinbogdan/.claude/jobs/0922da26/tmp/filter-shapes.txt', out.join(';'))
})
