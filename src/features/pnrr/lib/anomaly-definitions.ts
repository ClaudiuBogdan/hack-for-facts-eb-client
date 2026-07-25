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
    label: t`Reported financial progress over 100%`,
    shortDescription: t`Financial percentage above usual threshold`,
    explanation: t`This filter shows projects where reported financial progress exceeds 100%. It is a data anomaly that may come from adjustments, changes in reference value, delayed updates, or errors.`,
    investigationTip: t`Check the updated project value, additional acts, and recent reports before drawing conclusions about payments.`,
    detectionRule: t`Reported financial progress > 100%`,
    icon: TrendingUp,
    severity: 'critical',
  },
  {
    type: 'payment-ahead-delivery',
    label: t`Financial-technical gap`,
    shortDescription: t`Financial progress well above technical progress`,
    explanation: t`This filter shows projects where reported financial progress is well above reported technical progress. It may have legitimate explanations, including advances or delayed technical reporting.`,
    investigationTip: t`Check if there are contractual advances, partial receptions, accepted deliverables, or delayed technical updates.`,
    detectionRule: t`Reported financial progress > 0% and <= 100%, and either technical progress = 0% or the financial-technical difference is > 50 pp with technical progress under 90%`,
    icon: Banknote,
    severity: 'critical',
  },
  {
    type: 'large-low-progress',
    label: t`Large value and low progress`,
    shortDescription: t`Listed EU funding over 10 mil. EUR and progress under 30%`,
    explanation: t`This filter highlights projects with large listed EU funding and low reported technical progress. It is implementation pressure and requires verification in official documents.`,
    investigationTip: t`Check delayed procurements, authorizations, disputes, beneficiary capacity, and execution blockages.`,
    detectionRule: t`Listed EU funding >= 10,000,000 EUR and reported technical progress under 30%, including the published "under 30%" category`,
    icon: AlertTriangle,
    severity: 'critical',
  },
  {
    type: 'stalled-completion',
    label: t`Technically completed, low financial progress`,
    shortDescription: t`100% technical, but under 80% financial`,
    explanation: t`This filter shows projects reported as technically completed, but with reported financial progress under 80%. It does not claim that reimbursement is blocked or refused.`,
    investigationTip: t`Check final reception, transfer requests, closure documents, and recent financial updates.`,
    detectionRule: t`Reported technical progress = 100% and reported financial progress < 80%`,
    icon: ClipboardX,
    severity: 'warning',
  },
] as const

export const DATA_QUALITY_SIGNAL_CONFIG: readonly DataQualitySignalConfig[] = [
  {
    type: 'duplicate-conflict',
    label: t`Possible duplicates with different data`,
    shortDescription: t`Similar rows with different values or progress`,
    explanation: t`This filter marks rows that appear to describe the same project, but have different information. It is a data interpretation issue, not proof of double funding.`,
    investigationTip: t`Compare variants and identify the current row before calculations about totals, progress, or beneficiary.`,
    detectionRule: t`Identical title, CUI, component, and measure, but different value, progress, locality, funding, beneficiary, or CRI`,
    icon: Copy,
    severity: 'attention',
  },
  {
    type: 'large-missing-financial-progress',
    label: t`Large value without published financial progress`,
    shortDescription: t`Over 10 mil. EUR without usable financial data`,
    explanation: t`This filter shows large projects without published financial progress in the dataset. Missing data does not mean zero payments; it may indicate incomplete reporting or delayed updates.`,
    investigationTip: t`Check the official project source, transfer requests, and other public payment or financial reporting documents.`,
    detectionRule: t`Listed EU funding >= 10,000,000 EUR and financial progress not published in dataset`,
    icon: FileQuestion,
    severity: 'attention',
  },
  {
    type: 'completed-missing-financial-progress',
    label: t`Technically completed without published financial progress`,
    shortDescription: t`100% technical, over 1 mil. EUR, without financial data`,
    explanation: t`This filter shows projects reported as technically completed and without published financial progress in the dataset. It is a data limitation that prevents comparison between delivery and financial execution.`,
    investigationTip: t`Check if financial reporting is missing from the dataset, if the project was technically closed before the financial update, or if there are separate payment documents.`,
    detectionRule: t`Reported technical progress = 100%, listed EU funding >= 1,000,000 EUR and financial progress not published in dataset`,
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
