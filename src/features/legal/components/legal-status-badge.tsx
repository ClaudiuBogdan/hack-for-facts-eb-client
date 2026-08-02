import {
  Archive,
  Ban,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  PauseCircle,
  PencilLine,
} from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { LegalActStatus } from '@/schemas/legal'

type Props = {
  readonly status: LegalActStatus
  readonly className?: string
}

const STATUS_CLASS: Record<LegalActStatus, string> = {
  'in-vigoare':
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  modificat: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  abrogat: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  'abrogat-partial':
    'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  suspendat:
    'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  'iesit-din-vigoare':
    'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200',
  necunoscut:
    'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200',
}

const STATUS_ICON: Record<LegalActStatus, typeof CheckCircle2> = {
  'in-vigoare': CheckCircle2,
  modificat: PencilLine,
  abrogat: Ban,
  'abrogat-partial': CircleSlash,
  suspendat: PauseCircle,
  'iesit-din-vigoare': Archive,
  necunoscut: HelpCircle,
}

/**
 * The one way an act's status is shown anywhere in the domain. Always text +
 * icon, never colour alone.
 */
export function LegalStatusBadge({ status, className }: Props) {
  const Icon = STATUS_ICON[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-xs font-semibold',
        STATUS_CLASS[status],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {status === 'in-vigoare' ? (
        <Trans>În vigoare</Trans>
      ) : status === 'modificat' ? (
        <Trans>Modificat</Trans>
      ) : status === 'abrogat' ? (
        <Trans>Abrogat</Trans>
      ) : status === 'abrogat-partial' ? (
        <Trans>Abrogat parțial</Trans>
      ) : status === 'suspendat' ? (
        <Trans>Suspendat</Trans>
      ) : status === 'iesit-din-vigoare' ? (
        <Trans>Ieșit din vigoare</Trans>
      ) : (
        <Trans>Necunoscut</Trans>
      )}
    </span>
  )
}
