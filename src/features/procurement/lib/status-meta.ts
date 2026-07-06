/**
 * Status metadata for procurement records. The ten per-grain statuses keep
 * their own label/icon/tooltip (migrated from the old status badge), but
 * collapse into five semantic *tones* that drive badge colors and record-card
 * left borders — status colors are reserved for state, always icon + text,
 * never color alone. `unknown` stays first-class (explicit badge + tooltip).
 */
import { t } from '@lingui/core/macro'
import {
  CheckCircle2,
  CircleAlert,
  CircleSlash,
  Clock,
  FileText,
  PauseCircle,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { ProcurementStatus } from '@/schemas/procurement'

export type ProcurementStatusTone =
  | 'positive'
  | 'active'
  | 'pending'
  | 'negative'
  | 'neutral'

const TONE_BADGE_CLASSES: Record<ProcurementStatusTone, string> = {
  positive:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  active:
    'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200',
  pending:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200',
  negative:
    'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200',
  neutral:
    'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
}

/** Record-card left-border accent per tone (5px semantic rail). */
const TONE_ACCENT_CLASSES: Record<ProcurementStatusTone, string> = {
  positive: 'border-l-emerald-500 dark:border-l-emerald-400',
  active: 'border-l-sky-500 dark:border-l-sky-400',
  pending: 'border-l-amber-500 dark:border-l-amber-400',
  negative: 'border-l-rose-500 dark:border-l-rose-400',
  neutral: 'border-l-slate-400 dark:border-l-slate-500',
}

type StatusMeta = {
  readonly tone: ProcurementStatusTone
  readonly icon: LucideIcon
  readonly label: () => string
  readonly tooltip: () => string
}

const STATUS_META: Record<ProcurementStatus, StatusMeta> = {
  published: {
    tone: 'active',
    icon: FileText,
    label: () => t`Published`,
    tooltip: () => t`Procedure published in SEAP.`,
  },
  in_evaluation: {
    tone: 'pending',
    icon: Clock,
    label: () => t`In evaluation`,
    tooltip: () => t`Bids are being evaluated.`,
  },
  awarded: {
    tone: 'positive',
    icon: Trophy,
    label: () => t`Awarded`,
    tooltip: () => t`A winner has been awarded.`,
  },
  in_progress: {
    tone: 'active',
    icon: Clock,
    label: () => t`In progress`,
    tooltip: () => t`Contract in progress.`,
  },
  closed: {
    tone: 'positive',
    icon: CheckCircle2,
    label: () => t`Closed`,
    tooltip: () => t`Contract closed.`,
  },
  cancelled: {
    tone: 'negative',
    icon: CircleSlash,
    label: () => t`Cancelled`,
    tooltip: () => t`Procedure cancelled.`,
  },
  suspended: {
    tone: 'pending',
    icon: PauseCircle,
    label: () => t`Suspended`,
    tooltip: () => t`Procedure suspended.`,
  },
  finalized: {
    tone: 'positive',
    icon: CheckCircle2,
    label: () => t`Finalized`,
    tooltip: () => t`Direct acquisition finalized.`,
  },
  offered: {
    tone: 'active',
    icon: FileText,
    label: () => t`Offered`,
    tooltip: () => t`Offer submitted.`,
  },
  // 'unknown' is first-class — never fold it away.
  unknown: {
    tone: 'neutral',
    icon: CircleAlert,
    label: () => t`Undetermined`,
    tooltip: () => t`Status unknown in the data source.`,
  },
}

export function statusMeta(status: ProcurementStatus): StatusMeta {
  return STATUS_META[status]
}

export function statusLabel(status: ProcurementStatus): string {
  return STATUS_META[status].label()
}

export function statusBadgeClassName(status: ProcurementStatus): string {
  return TONE_BADGE_CLASSES[STATUS_META[status].tone]
}

export function statusAccentBorderClassName(
  status: ProcurementStatus,
): string {
  return TONE_ACCENT_CLASSES[STATUS_META[status].tone]
}
