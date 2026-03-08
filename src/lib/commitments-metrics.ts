import { t } from '@lingui/core/macro'
import {
  isMetricAvailableForPeriod,
  type CommitmentsMetric,
  type PeriodType,
} from '@/schemas/commitments'

export const DEFAULT_COMMITMENTS_METRIC: CommitmentsMetric =
  'CREDITE_ANGAJAMENT'

const ALL_COMMITMENTS_METRICS = [
  'CREDITE_ANGAJAMENT',
  'PLATI_TREZOR',
  'PLATI_NON_TREZOR',
  'RECEPTII_TOTALE',
  'RECEPTII_NEPLATITE_CHANGE',
  'LIMITA_CREDIT_ANGAJAMENT',
  'CREDITE_BUGETARE',
  'CREDITE_ANGAJAMENT_INITIALE',
  'CREDITE_BUGETARE_INITIALE',
  'CREDITE_ANGAJAMENT_DEFINITIVE',
  'CREDITE_BUGETARE_DEFINITIVE',
  'CREDITE_ANGAJAMENT_DISPONIBILE',
  'CREDITE_BUGETARE_DISPONIBILE',
  'RECEPTII_NEPLATITE',
] as const satisfies readonly CommitmentsMetric[]

export function getCommitmentsMetricLabel(metric: CommitmentsMetric): string {
  switch (metric) {
    case 'CREDITE_ANGAJAMENT':
      return t`Legal commitments`
    case 'PLATI_TREZOR':
      return t`Treasury payments`
    case 'PLATI_NON_TREZOR':
      return t`Non-treasury payments`
    case 'RECEPTII_TOTALE':
      return t`Total receipts`
    case 'RECEPTII_NEPLATITE_CHANGE':
      return t`Unpaid receipts change`
    case 'LIMITA_CREDIT_ANGAJAMENT':
      return t`Commitment authority limit`
    case 'CREDITE_BUGETARE':
      return t`Budget credits`
    case 'CREDITE_ANGAJAMENT_INITIALE':
      return t`Initial commitment credits`
    case 'CREDITE_BUGETARE_INITIALE':
      return t`Initial budget credits`
    case 'CREDITE_ANGAJAMENT_DEFINITIVE':
      return t`Final commitment credits`
    case 'CREDITE_BUGETARE_DEFINITIVE':
      return t`Final budget credits`
    case 'CREDITE_ANGAJAMENT_DISPONIBILE':
      return t`Available commitment credits`
    case 'CREDITE_BUGETARE_DISPONIBILE':
      return t`Available budget credits`
    case 'RECEPTII_NEPLATITE':
      return t`Unpaid receipts`
  }
}

export function getCommitmentsMetricOptions(periodType?: PeriodType) {
  return ALL_COMMITMENTS_METRICS
    .filter((metric) =>
      periodType ? isMetricAvailableForPeriod(metric, periodType) : true,
    )
    .map((metric) => ({
      value: metric,
      label: getCommitmentsMetricLabel(metric),
    }))
}

export function normalizeCommitmentsMetric(
  metric: string | undefined,
  periodType?: PeriodType,
): CommitmentsMetric {
  if (
    metric &&
    ALL_COMMITMENTS_METRICS.includes(metric as CommitmentsMetric) &&
    (!periodType || isMetricAvailableForPeriod(metric as CommitmentsMetric, periodType))
  ) {
    return metric as CommitmentsMetric
  }

  if (!periodType || isMetricAvailableForPeriod(DEFAULT_COMMITMENTS_METRIC, periodType)) {
    return DEFAULT_COMMITMENTS_METRIC
  }

  return (
    ALL_COMMITMENTS_METRICS.find((candidate) =>
      isMetricAvailableForPeriod(candidate, periodType),
    ) ?? DEFAULT_COMMITMENTS_METRIC
  )
}
