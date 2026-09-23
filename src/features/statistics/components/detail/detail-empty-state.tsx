import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { DetailSearchPatch, YearSpan } from '../../lib/dataset-selection'
import type { DetailEmptyReason } from '../../lib/detail-series-view'

type Props = {
  readonly reason: DetailEmptyReason
  /** The years on screen and the years the rows cover, for the `window` reason. */
  readonly yearWindow: YearSpan | null
  readonly observedSpan: YearSpan | null
  readonly onSearchChange: (patch: DetailSearchPatch) => void
}

/**
 * A read that answered with no row to show, named by what emptied it and
 * undone from here.
 *
 * It used to say „Încearcă alt teritoriu sau altă valoare" for every empty
 * band, blaming the territory for a window past the series and offering
 * the territory's escape only. A link can carry a place this matrix does not
 * publish — a region into a county series — or a cell INS never filled, and
 * the rail has no territory picker to clear the first with.
 */
export function DetailEmptyState({ reason, yearWindow, observedSpan, onSearchChange }: Props) {
  const action = (label: string, patch: DetailSearchPatch) => (
    <div className="flex justify-center">
      <Button variant="outline" size="sm" onClick={() => onSearchChange(patch)}>
        {label}
      </Button>
    </div>
  )

  if (reason === 'window' && yearWindow && observedSpan) {
    return (
      <div className="space-y-3">
        <EmptyState
          // Unframed: the band is already the frame.
          className="border-none px-0 py-8"
          title={t`Nicio observație între ${yearWindow.from} și ${yearWindow.to}`}
          description={t`Seria are observații din ${observedSpan.from} până în ${observedSpan.to}.`}
        />
        {action(t`Arată tot intervalul`, { din: undefined, pana: undefined })}
      </div>
    )
  }
  if (reason === 'cadence') {
    return (
      <EmptyState
        className="border-none px-0 py-8"
        title={t`Nicio observație la această frecvență`}
        description={t`Alege altă frecvență din selecție.`}
      />
    )
  }
  if (reason === 'territory') {
    return (
      <div className="space-y-3">
        <EmptyState
          className="border-none px-0 py-8"
          title={t`Nicio observație`}
          description={t`INS nu publică această serie pentru teritoriul din adresă.`}
        />
        {action(t`Șterge filtrul teritorial`, { teritoriu: undefined })}
      </div>
    )
  }
  if (reason === 'selection') {
    return (
      <div className="space-y-3">
        <EmptyState
          className="border-none px-0 py-8"
          title={t`Nicio observație`}
          description={t`Combinația de valori din adresă nu are observații publicate.`}
        />
        {action(t`Șterge selecția`, { clasificari: undefined, unitate: undefined })}
      </div>
    )
  }
  return (
    <EmptyState
      className="border-none px-0 py-8"
      title={t`Nicio observație`}
      description={t`Selecția curentă nu returnează observații.`}
    />
  )
}
