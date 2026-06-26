import { t } from '@lingui/core/macro'
import { Progress } from '@/components/ui/progress'
import { formatPct } from '../lib/display'

type Props = {
  readonly value: number | null
  readonly className?: string
}

export function AbsorptionBar({ value, className }: Props) {
  const clamped = value == null ? 0 : Math.min(100, Math.max(0, value))
  const isOver = value != null && value > 100

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{t`Absorbție`}</span>
        <span className={isOver ? 'font-medium text-amber-700' : 'font-medium'}>
          {formatPct(value)}
        </span>
      </div>
      <Progress
        value={clamped}
        className="h-2 bg-muted"
        indicatorClassName={isOver ? 'bg-amber-500' : 'bg-emerald-600'}
        aria-label={t`Progres absorbție ${formatPct(value)}`}
      />
      {isOver && (
        <p className="mt-1 text-xs text-amber-700">
          {t`Valoarea sursei depășește contractatul; bara este plafonată vizual.`}
        </p>
      )}
    </div>
  )
}
