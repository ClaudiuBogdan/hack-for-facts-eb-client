import type { ComponentType } from 'react'
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
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { LegalStatus } from '@/schemas/legal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type StatusMeta = {
  readonly icon: ComponentType<{ className?: string }>
  // Explicit Tailwind classes per status; border radii <= 8px (rounded-md).
  readonly className: string
}

const STATUS_META: Readonly<Record<LegalStatus, StatusMeta>> = {
  'in-vigoare': {
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  },
  modificat: {
    icon: PencilLine,
    className:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
  },
  abrogat: {
    icon: Ban,
    className:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  },
  'abrogat-partial': {
    icon: CircleSlash,
    className:
      'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200',
  },
  suspendat: {
    icon: PauseCircle,
    className:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  },
  'iesit-din-vigoare': {
    icon: Archive,
    className:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  },
  necunoscut: {
    icon: HelpCircle,
    className:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
  },
}

function getLegalStatusLabel(status: LegalStatus): string {
  switch (status) {
    case 'in-vigoare':
      return t`În vigoare`
    case 'modificat':
      return t`Modificat`
    case 'abrogat':
      return t`Abrogat`
    case 'abrogat-partial':
      return t`Abrogat parțial`
    case 'suspendat':
      return t`Suspendat`
    case 'iesit-din-vigoare':
      return t`Ieșit din vigoare`
    case 'necunoscut':
      return t`Necunoscut`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

function getLegalStatusTooltip(status: LegalStatus): string {
  switch (status) {
    case 'in-vigoare':
      return t`Actul este în vigoare.`
    case 'modificat':
      return t`Actul a fost modificat de alte acte.`
    case 'abrogat':
      return t`Actul este abrogat integral.`
    case 'abrogat-partial':
      return t`Actul este abrogat parțial.`
    case 'suspendat':
      return t`Aplicarea actului este suspendată.`
    case 'iesit-din-vigoare':
      return t`Actul a ieșit din vigoare (nu prin abrogare explicită).`
    case 'necunoscut':
      return t`Statusul nu a putut fi derivat din sursele disponibile.`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

function getModificationCountLabel(count: number): string {
  return count === 1 ? t`${count} act` : t`${count} acte`
}

type Props = {
  readonly status: LegalStatus
  readonly modificationCount?: number
  readonly showModificationSuffix?: boolean
  readonly className?: string
}

/**
 * `LegalStatusBadge` — the single 7-value status vocabulary (design.md §6).
 * Renders text + icon + color, never color-only. Optionally appends a
 * "modificat de N acte" suffix when `modificationCount > 0`.
 */
export function LegalStatusBadge({
  status,
  modificationCount = 0,
  showModificationSuffix = false,
  className,
}: Props) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const label = getLegalStatusLabel(status)
  const tooltip = getLegalStatusTooltip(status)
  const showSuffix =
    showModificationSuffix && modificationCount > 0 && status !== 'abrogat'
  const modificationCountLabel = showSuffix
    ? getModificationCountLabel(modificationCount)
    : ''

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
        meta.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
      {showSuffix && (
        <span className="font-normal text-current/80">
          {' · '}
          <Trans>modificat de</Trans> {modificationCountLabel}
        </span>
      )}
    </span>
  )

  const ariaLabel = showSuffix
    ? `${label} · ${t`modificat de`} ${modificationCountLabel}`
    : label

  // The unknown status gets a tooltip explaining the status could not be derived.
  if (status === 'necunoscut') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span aria-label={ariaLabel}>{badge}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <span aria-label={ariaLabel} title={tooltip}>
      {badge}
    </span>
  )
}
