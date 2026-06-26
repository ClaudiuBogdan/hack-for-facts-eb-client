import { MapPinned } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { Badge } from '@/components/ui/badge'
import { formatRon, programLabel } from '../lib/display'
import type { ObjectiveMapPoint } from '../lib/types'

type Props = {
  readonly points: readonly ObjectiveMapPoint[]
  readonly className?: string
}

export function PublicInvestmentsMapPanel({ points, className }: Props) {
  const mapped = points.filter((point) => point.lat != null && point.lng != null)
  const maxAmount = Math.max(
    1,
    ...mapped.map((point) => point.contracted?.amount ?? 0),
  )

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            <Trans>Hartă investiții</Trans>
          </h2>
          <p className="text-xs text-muted-foreground">
            <Trans>Distribuție mock-first pe obiective localizate.</Trans>
          </p>
        </div>
        <Badge variant="outline">
          <Trans>{mapped.length} localizate</Trans>
        </Badge>
      </div>

      <div className="relative min-h-[280px] overflow-hidden rounded-md border bg-muted/40 p-4">
        <div className="absolute inset-4 rounded-[35%] border border-border bg-background/70" />
        {mapped.map((point) => {
          const size = 0.75 + ((point.contracted?.amount ?? 0) / maxAmount) * 1.5
          const x = point.lng == null ? 50 : ((point.lng - 20) / 10) * 100
          const y = point.lat == null ? 50 : 100 - ((point.lat - 43) / 5.5) * 100
          const left = Math.min(92, Math.max(8, x))
          const top = Math.min(88, Math.max(12, y))
          return (
            <div
              key={point.objectiveId}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-emerald-600 shadow-sm"
              style={{
                width: `${size}rem`,
                height: `${size}rem`,
                left: `${left}%`,
                top: `${top}%`,
              }}
              title={`${point.title} · ${formatRon(point.contracted?.amount)}`}
              aria-label={`${point.title} ${programLabel(point.program)}`}
            />
          )
        })}
        <div className="absolute bottom-3 left-3 right-3 rounded-md bg-background/90 p-3 text-xs text-muted-foreground shadow-xs">
          <Trans>
            Valorile suspecte ×1000 sunt păstrate ca puncte de acoperire, dar
            nu intră în mărimea punctului sau totaluri.
          </Trans>
        </div>
      </div>
    </section>
  )
}
