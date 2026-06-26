import { useId } from 'react'
import { Link } from '@tanstack/react-router'
import { MapPinned } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  PROGRAM_CODE_VALUES,
  STAGE_BUCKET_VALUES,
  type MapView,
  type ProgramCode,
  type StageBucket,
} from '@/schemas/public-investments'
import { formatRon, programLabel, stageLabel } from '../lib/display'
import type { ObjectiveMapPoint } from '../lib/types'

type Props = {
  readonly points: readonly ObjectiveMapPoint[]
  readonly colorBy?: MapView
  readonly selectedObjectiveId?: string
  readonly onPointSelect?: (objectiveId: string) => void
  readonly className?: string
}

export function PublicInvestmentsMapPanel({
  points,
  colorBy = 'program',
  selectedObjectiveId,
  onPointSelect,
  className,
}: Props) {
  const descriptionId = useId()
  const mapped = points.filter((point) => point.lat != null && point.lng != null)
  const maxAmount = Math.max(
    1,
    ...mapped.map((point) => point.contracted?.amount ?? 0),
  )

  return (
    <section className={className} aria-describedby={descriptionId}>
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
          const size = 1 + ((point.contracted?.amount ?? 0) / maxAmount) * 1.5
          const x = point.lng == null ? 50 : ((point.lng - 20) / 10) * 100
          const y = point.lat == null ? 50 : 100 - ((point.lat - 43) / 5.5) * 100
          const left = Math.min(92, Math.max(8, x))
          const top = Math.min(88, Math.max(12, y))
          const isSelected = selectedObjectiveId === point.objectiveId
          const label = t`${point.title}, ${programLabel(point.program)}, ${stageLabel(point.stage.bucket)}, ${formatRon(point.contracted?.amount)}`
          const markerClassName = cn(
            'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            pointColorClassName(point, colorBy),
            isSelected && 'ring-2 ring-primary ring-offset-2',
          )
          const markerStyle = {
            width: `${size}rem`,
            height: `${size}rem`,
            left: `${left}%`,
            top: `${top}%`,
          }

          if (onPointSelect) {
            return (
              <button
                key={point.objectiveId}
                type="button"
                className={markerClassName}
                style={markerStyle}
                title={label}
                aria-label={t`Selectează ${label}`}
                aria-pressed={isSelected}
                onClick={() => onPointSelect(point.objectiveId)}
              />
            )
          }

          return (
            <Link
              key={point.objectiveId}
              to="/investitii-publice/obiective/$id"
              params={{ id: point.objectiveId }}
              className={markerClassName}
              style={markerStyle}
              title={label}
              aria-label={t`Deschide obiectivul ${label}`}
            />
          )
        })}
        <div
          id={descriptionId}
          className="absolute bottom-3 left-3 right-3 rounded-md bg-background/90 p-3 text-xs text-muted-foreground shadow-xs"
        >
          <Trans>
            Valorile suspecte ×1000 sunt păstrate ca puncte de acoperire, dar
            nu intră în mărimea punctului sau totaluri.
          </Trans>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label={t`Legendă hartă`}>
        {legendItems(colorBy).map((item) => (
          <li key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className={cn('h-2.5 w-2.5 rounded-full', item.className)}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function pointColorClassName(point: ObjectiveMapPoint, colorBy: MapView): string {
  if (colorBy === 'stage') return stageColorClassName(point.stage.bucket)
  return programColorClassName(point.program)
}

function legendItems(colorBy: MapView): ReadonlyArray<{
  readonly key: string
  readonly label: string
  readonly className: string
}> {
  if (colorBy === 'stage') {
    return STAGE_BUCKET_VALUES.map((stage) => ({
      key: stage,
      label: stageLabel(stage),
      className: stageColorClassName(stage),
    }))
  }

  return PROGRAM_CODE_VALUES.map((program) => ({
    key: program,
    label: programLabel(program),
    className: programColorClassName(program),
  }))
}

function programColorClassName(program: ProgramCode): string {
  switch (program) {
    case 'ANGHEL_SALIGNY':
      return 'bg-emerald-600'
    case 'PNDL':
      return 'bg-sky-600'
    case 'PNCCRS':
      return 'bg-amber-600'
    case 'PNMC':
      return 'bg-fuchsia-600'
    default:
      return 'bg-slate-600'
  }
}

function stageColorClassName(stage: StageBucket): string {
  switch (stage) {
    case 'contractat':
      return 'bg-blue-600'
    case 'in_executie':
      return 'bg-amber-600'
    case 'finalizat':
      return 'bg-emerald-600'
    case 'receptionat':
      return 'bg-violet-600'
    case 'necunoscut':
      return 'bg-slate-500'
    default:
      return 'bg-slate-600'
  }
}
