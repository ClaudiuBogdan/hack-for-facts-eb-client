import { t } from '@lingui/core/macro'
import type { AnomalyType, DataQualitySignalType } from '@/schemas/pnrr'
import {
  AlertTriangle,
  Banknote,
  ClipboardX,
  Copy,
  FileQuestion,
  FileWarning,
  TrendingUp,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Severity styling maps
// ---------------------------------------------------------------------------

export const SEVERITY_RING: Record<AnomalySeverity, string> = {
  critical: 'ring-red-400/50 dark:ring-red-500/30',
  warning: 'ring-amber-400/50 dark:ring-amber-500/30',
  attention: 'ring-blue-400/50 dark:ring-blue-500/30',
  info: 'ring-sky-400/50 dark:ring-sky-500/30',
}

export const SEVERITY_BORDER: Record<AnomalySeverity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  attention: 'bg-blue-500',
  info: 'bg-sky-500',
}

export const SEVERITY_BG: Record<AnomalySeverity, string> = {
  critical: 'bg-red-50/50 dark:bg-red-950/20',
  warning: 'bg-amber-50/50 dark:bg-amber-950/20',
  attention: 'bg-blue-50/50 dark:bg-blue-950/20',
  info: 'bg-sky-50/50 dark:bg-sky-950/20',
}

export const SEVERITY_ICON_BG: Record<AnomalySeverity, string> = {
  critical: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  warning:
    'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  attention: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  info: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
}

export type AnomalySeverity = 'critical' | 'warning' | 'attention' | 'info'

// ---------------------------------------------------------------------------
// Signal configuration
// ---------------------------------------------------------------------------

export type SignalConfig<TType extends string> = {
  readonly type: TType
  readonly label: string
  readonly shortDescription: string
  readonly explanation: string
  readonly investigationTip: string
  readonly detectionRule: string
  readonly icon: React.ElementType
  readonly severity: AnomalySeverity
}

export type AnomalyConfig = SignalConfig<AnomalyType>
export type DataQualitySignalConfig = SignalConfig<DataQualitySignalType>

export const ANOMALY_CONFIG: readonly AnomalyConfig[] = [
  {
    type: 'financial-overrun',
    label: t`Financial overruns`,
    shortDescription: t`Financial progress over 100%`,
    explanation: t`This filter shows projects where reported financial progress exceeds 100%. In a clean dataset, a project should not exceed its reported value without an explanation: budget change, delayed correction, or reporting error.`,
    investigationTip: t`Check the updated contract value, the existence of addenda, and whether the financial percentage was corrected in recent reports.`,
    detectionRule: t`Financial progress > 100%`,
    icon: TrendingUp,
    severity: 'critical',
  },
  {
    type: 'payment-ahead-delivery',
    label: t`Payments ahead of delivery`,
    shortDescription: t`Money is far ahead of technical progress`,
    explanation: t`This filter shows projects where financial progress is far above technical progress. It may be a legitimate advance payment or a delay in technical reporting, but it matters because the money appears to have moved faster than delivery.`,
    investigationTip: t`Check whether the payment is a contractually agreed advance, whether deliverables were accepted, and whether technical progress is underreported or outdated.`,
    detectionRule: t`Technical progress = 0% and financial progress > 0% OR financial progress - technical progress > 50 pp, with technical progress under 90%`,
    icon: Banknote,
    severity: 'critical',
  },
  {
    type: 'large-low-progress',
    label: t`Large projects with low progress`,
    shortDescription: t`Value over €10M and progress under 30%`,
    explanation: t`This filter surfaces large projects that still have low technical progress. The EUR 10 million threshold keeps the list focused on projects with high budget impact. The “in implementation” status is interpreted as under 30% only for this filter.`,
    investigationTip: t`Check the cause of low progress: delayed procurement, permits, disputes, beneficiary capacity, or execution bottlenecks.`,
    detectionRule: t`Value >= 10,000,000 EUR AND technical progress under 30% or “in implementation”`,
    icon: AlertTriangle,
    severity: 'critical',
  },
  {
    type: 'stalled-completion',
    label: t`Completed works, blocked reimbursement`,
    shortDescription: t`100% technical but under 80% financial`,
    explanation: t`This filter shows projects reported as technically completed but with financial progress below 80%. This is not automatically an irregularity: payments may follow acceptance. Still, a large gap can indicate blocked acceptance, incomplete documents, or disputes.`,
    investigationTip: t`Check final acceptance status, payment requests, closing documents, and any disputes that may block reimbursement.`,
    detectionRule: t`Technical progress = 100% AND financial progress < 80%`,
    icon: ClipboardX,
    severity: 'warning',
  },
] as const

export const DATA_QUALITY_SIGNAL_CONFIG: readonly DataQualitySignalConfig[] = [
  {
    type: 'duplicate-conflict',
    label: t`Duplicates with different data`,
    shortDescription: t`The same project has different values or progress`,
    explanation: t`This filter marks projects that appear multiple times with the same core identity but different information. This is a data interpretation issue: it may be an incomplete update, subcomponent reporting, or an import error.`,
    investigationTip: t`Compare the variants and identify the current row before calculating totals, progress, or conclusions about the beneficiary.`,
    detectionRule: t`Identical title, CUI, Component, and Measure, but different value, progress, locality, funding, beneficiary, or CRI`,
    icon: Copy,
    severity: 'attention',
  },
  {
    type: 'large-missing-financial-progress',
    label: t`Large projects without financial progress`,
    shortDescription: t`Value over €10M with no reported reimbursement`,
    explanation: t`This filter shows large projects with missing financial progress. Missing data does not automatically mean no payments were made; it may mean financial data was not published or was not updated in this snapshot.`,
    investigationTip: t`Check the official project source, payment requests, and whether financial reporting exists in other public documents.`,
    detectionRule: t`Value >= 10,000,000 EUR AND missing financial progress`,
    icon: FileQuestion,
    severity: 'attention',
  },
  {
    type: 'completed-missing-financial-progress',
    label: t`Completed without financial progress`,
    shortDescription: t`100% technical, over €1M, no financial data`,
    explanation: t`This filter shows technically completed projects worth more than one million euros but with no published financial progress. It matters for analysis quality because delivery cannot be compared with reimbursement.`,
    investigationTip: t`Check whether reimbursement is missing from the dataset, whether the project was technically closed before financial reporting, or whether separate payment documents exist.`,
    detectionRule: t`Technical progress = 100%, value >= 1,000,000 EUR AND missing financial progress`,
    icon: FileWarning,
    severity: 'attention',
  },
] as const

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const CONFIG_MAP = new Map(ANOMALY_CONFIG.map((c) => [c.type, c]))
const DATA_QUALITY_CONFIG_MAP = new Map(
  DATA_QUALITY_SIGNAL_CONFIG.map((c) => [c.type, c]),
)

export function getAnomalyConfig(type: AnomalyType): AnomalyConfig | undefined {
  return CONFIG_MAP.get(type)
}

export function getDataQualitySignalConfig(
  type: DataQualitySignalType,
): DataQualitySignalConfig | undefined {
  return DATA_QUALITY_CONFIG_MAP.get(type)
}

export function getAnomalyLabel(type: AnomalyType): string {
  return CONFIG_MAP.get(type)?.label ?? type
}

export function getDataQualitySignalLabel(type: DataQualitySignalType): string {
  return DATA_QUALITY_CONFIG_MAP.get(type)?.label ?? type
}

export function getAnomalyShortDescription(type: AnomalyType): string {
  return CONFIG_MAP.get(type)?.shortDescription ?? ''
}
