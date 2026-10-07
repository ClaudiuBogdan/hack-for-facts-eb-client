import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { levelCount, mattersIn, stageMatrix } from '@/features/justice/lib/hub-model'
import type { JusticeHubSnapshot } from '@/features/justice/lib/hub-snapshot-types'
import { countText } from '@/features/justice/lib/judicial-format'
import { caseCategoryLabel, courtLevelLabel, stageLabel } from '@/features/justice/lib/judicial-labels'
import type { StageKey } from '@/features/justice/lib/judicial-model'
import type { JudicialCourtLevel } from '@/schemas/judicial'
import { cn } from '@/lib/utils'

/**
 * The two hero panels the live front door did not take (`drum`, `materii`),
 * kept as the design record over the live model. The `registru` panel and
 * every band are the live components.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** `drum`: where the year's cases are, level by level and stage by stage — the way a case climbs. */
export function PathPanel({ snapshot }: { readonly snapshot: JusticeHubSnapshot }) {
  const matrix = stageMatrix(snapshot)
  const steps: readonly { readonly level: JudicialCourtLevel; readonly stages: readonly StageKey[] }[] = [
    { level: 'judecatorie', stages: ['fond'] },
    { level: 'tribunal', stages: ['fond', 'apel', 'contestatie'] },
    { level: 'curte_de_apel', stages: ['fond', 'apel', 'recurs', 'contestatie'] },
    { level: 'inalta_curte', stages: ['fond', 'recurs'] },
  ]
  const top = Math.max(...steps.map((step) => levelCount(snapshot, step.level)), 1)
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="justice-hub-path-title">
      <MonoLabel id="justice-hub-path-title" className="text-primary">
        <Trans>Drumul unui dosar, {snapshot.year}</Trans>
      </MonoLabel>
      <ol className="mt-4">
        {steps.map((step, index) => {
          const count = levelCount(snapshot, step.level)
          return (
            <li key={step.level} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 pb-4 last:pb-0">
              {index < steps.length - 1 ? <span className="absolute bottom-0 left-[0.6rem] top-6 w-px bg-border" aria-hidden="true" /> : null}
              <MonoLabel className="relative z-10 flex size-5 items-center justify-center border bg-background tabular-nums text-muted-foreground">{index + 1}</MonoLabel>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">{courtLevelLabel(step.level)}</span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{countText(count)}</span>
                </div>
                <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                  <span className="block h-1 bg-primary/70" style={{ width: `${Math.max((count / top) * 100, 0.8).toFixed(1)}%` }} />
                </span>
                <MonoLabel className="mt-1 block text-muted-foreground">
                  {step.stages
                    .filter((stage) => (matrix[step.level]?.[stage] ?? 0) > 0)
                    .map((stage) => `${stageLabel(stage)} ${countText(matrix[step.level]?.[stage] ?? 0)}`)
                    .join(' · ')}
                </MonoLabel>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        <Trans>Dosarele cu data din {snapshot.year}, după instanța unde sunt și etapa în care se află.</Trans>
      </p>
    </section>
  )
}

/** Shares rounded to whole squares by largest remainder, so the hundred squares add up to a hundred. */
function hundred(shares: readonly number[]): readonly number[] {
  const raw = shares.map((share) => share * 100)
  const floors = raw.map(Math.floor)
  let left = 100 - floors.reduce((sum, value) => sum + value, 0)
  const order = raw.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index] = (floors[index] ?? 0) + 1
    left -= 1
  }
  return floors
}

/** `materii`: a hundred of the year's cases, by matter. */
export function HundredPanel({ snapshot }: { readonly snapshot: JusticeHubSnapshot }) {
  const matters = mattersIn(snapshot, 'toate')
  const leading = matters.slice(0, 5)
  const rest = 1 - leading.reduce((sum, matter) => sum + matter.share, 0)
  const cells = hundred([...leading.map((matter) => matter.share), rest])
  const tones = ['bg-primary', 'bg-primary/75', 'bg-primary/55', 'bg-primary/40', 'bg-primary/25', 'bg-muted-foreground/25']
  const labels = [...leading.map((matter) => caseCategoryLabel(matter.key) ?? matter.key), t`Altele`]
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="justice-hub-hundred-title">
      <MonoLabel id="justice-hub-hundred-title" className="text-primary">
        <Trans>Din 100 de dosare din {snapshot.year}</Trans>
      </MonoLabel>
      <div className="mt-4 grid grid-cols-10 gap-1" role="img" aria-label={labels.map((label, index) => `${label}: ${String(cells[index])}`).join(', ')}>
        {cells.flatMap((count, index) => Array.from({ length: count }, (_, cell) => <span key={`${String(index)}-${String(cell)}`} className={cn('aspect-square', tones[index])} />))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {labels.map((label, index) => (
          <li key={label} className="flex items-baseline gap-2">
            <span className={cn('size-2.5 shrink-0 translate-y-px', tones[index])} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="font-semibold tabular-nums">{cells[index]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
