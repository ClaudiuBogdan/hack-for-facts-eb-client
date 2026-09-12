import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'

const amount = z.string().regex(/^-?\d+(\.\d{1,2})?$/)
const metrics = [
  'credite_angajament',
  'limita_credit_angajament',
  'credite_bugetare',
  'credite_angajament_initiale',
  'credite_bugetare_initiale',
  'credite_angajament_definitive',
  'credite_bugetare_definitive',
  'credite_angajament_disponibile',
  'credite_bugetare_disponibile',
  'receptii_totale',
  'plati_trezor',
  'plati_non_trezor',
  'receptii_neplatite',
] as const
const periodSchema = z.object({
  reportId: z.string(),
  sectorId: z.number().int(),
  creditorCui: z.string().nullable(),
  sourceUrl: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//.test(value)),
  startMonth: z.number().int().min(1).max(12).nullable(),
  endMonth: z.number().int().min(1).max(12),
  monthsCovered: z.number().int().min(1).max(12).nullable(),
  observation: z.string(),
  continuity: z.string(),
  isQuarterly: z.boolean(),
  isLatestYtd: z.boolean(),
  isYearEnd: z.boolean(),
  amounts: z
    .array(
      z.object({
        metric: z.enum(metrics),
        interval: amount.nullable(),
        ytd: amount.nullable(),
      }),
    )
    .length(metrics.length)
    .refine(
      (values) =>
        new Set(values.map((value) => value.metric)).size === metrics.length,
    ),
})
const pageSchema = z.object({
  metadataAvailable: z.boolean(),
  total: z.number().int().nonnegative(),
  earliestTerminalMonth: z.number().int().min(1).max(12).nullable(),
  latestTerminalMonth: z.number().int().min(1).max(12).nullable(),
  items: z.array(periodSchema),
})
export type CommitmentPeriodPage = z.infer<typeof pageSchema>

export function nativeCommitmentReportType(reportType: string) {
  if (
    [
      'PRINCIPAL_AGGREGATED',
      'COMMITMENT_PRINCIPAL_AGGREGATED',
      'COMMITMENT_AGG_PRINCIPAL',
    ].includes(reportType)
  )
    return 'COMMITMENT_AGG_PRINCIPAL'
  if (
    [
      'SECONDARY_AGGREGATED',
      'COMMITMENT_SECONDARY_AGGREGATED',
      'COMMITMENT_AGG_SECONDARY',
    ].includes(reportType)
  )
    return 'COMMITMENT_AGG_SECONDARY'
  if (['DETAILED', 'COMMITMENT_DETAILED'].includes(reportType))
    return 'COMMITMENT_DETAILED'
  throw new Error('Unsupported commitment report type')
}

export async function fetchCommitmentPeriods(
  input: {
    cui: string
    year: number
    reportType: string
    startMonth: number
    endMonth: number
    page: number
  },
  signal?: AbortSignal,
): Promise<CommitmentPeriodPage> {
  const data = await graphqlQuery<{ budgetCommitmentPeriods: unknown }>(
    `
    query CommitmentPeriods($cui: CUI!, $year: Int!, $reportType: BudgetCommitmentReportType!, $startMonth: Int!, $endMonth: Int!, $page: Int!) {
      budgetCommitmentPeriods(cui:$cui,year:$year,reportType:$reportType,startMonth:$startMonth,endMonth:$endMonth,page:$page,pageSize:25) {
        metadataAvailable total earliestTerminalMonth latestTerminalMonth
        items { reportId sectorId creditorCui sourceUrl startMonth endMonth monthsCovered observation continuity isQuarterly isLatestYtd isYearEnd amounts { metric interval ytd } }
      }
    }`,
    { ...input, reportType: nativeCommitmentReportType(input.reportType) },
    { signal, auth: 'none' },
  )
  return pageSchema.parse(data.budgetCommitmentPeriods)
}

/** Exact text formatting; financial strings never pass through Number. */
export function formatCommitmentAmount(
  value: string | null | undefined,
): string {
  if (value == null) return '—'
  const [integer, fraction = ''] = value.split('.')
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${fraction.padEnd(2, '0')}`
}

export interface CommitmentPeriodSelection {
  commitments_from_month?: number
  commitments_to_month?: number
  commitments_period_page?: number
}
