import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import type {
  ProcurementHubState,
  ProcurementValueBasis,
} from '@/schemas/procurement-hub'
import {
  droppedFilterLabels,
  valueBasisCaveat,
  valueBasisLabel,
  valueBasisQuestion,
} from '../lib/value-basis-meta'

type Props = {
  readonly vbasis: ProcurementValueBasis
  /** Hub filters the active population cannot honor (already scrubbed). */
  readonly droppedFilters?: readonly (keyof ProcurementHubState)[]
  /** Counts-only populations show the no-money framing instead of a value one. */
  readonly countsOnly?: boolean
  /**
   * True when value bounds are active but the server applies them to the
   * population's ANCHOR money (awarded), not the selected value logic.
   */
  readonly valueBoundsOnAnchor?: boolean
}

/**
 * Inline honesty notice — always visible while a non-default value logic (or
 * the counts-only modifications population) is active. States what the figure
 * IS, what it must never be read as, and which filters were not applied.
 */
export function ProcurementValueBasisNotice({
  vbasis,
  droppedFilters = [],
  countsOnly = false,
  valueBoundsOnAnchor = false,
}: Props) {
  const caveat = valueBasisCaveat(vbasis)
  const dropped = droppedFilterLabels(droppedFilters)
  if (!caveat && !countsOnly && dropped.length === 0 && !valueBoundsOnAnchor) {
    return null
  }

  return (
    <aside
      className="space-y-2 border-l-4 border-amber-500 bg-amber-500/5 py-3 pl-4 pr-3 text-sm leading-6"
      aria-label={valueBasisLabel(vbasis)}
    >
      <p className="font-bold text-[var(--pnrr-fg)]">
        <Info className="mr-1.5 inline-block h-4 w-4 align-[-2px]" aria-hidden="true" />
        {countsOnly ? (
          <Trans>Contract modifications — counts only</Trans>
        ) : (
          <Trans>Value logic: {valueBasisLabel(vbasis)}</Trans>
        )}
      </p>
      {countsOnly ? (
        <p className="text-[var(--pnrr-muted)]">
          <Trans>
            Amendment records are analyzed as counts. Their raw money fields are
            quality-checked in the data layer and are not reliable enough to sum
            here; verified amendment effects are served through the
            modification-adjusted contract value instead.
          </Trans>
        </p>
      ) : (
        <p className="text-[var(--pnrr-muted)]">{valueBasisQuestion(vbasis)}</p>
      )}
      {caveat ? <p className="text-[var(--pnrr-muted)]">{caveat}</p> : null}
      {dropped.length > 0 ? (
        <p className="text-[var(--pnrr-muted)]">
          <Trans>Filters not applicable to this population:</Trans>{' '}
          <span className="font-semibold">{dropped.join(' · ')}</span>
        </p>
      ) : null}
      {valueBoundsOnAnchor ? (
        <p className="text-[var(--pnrr-muted)]">
          <Trans>
            The value bounds filter selects records by their awarded value (the
            population's anchor money), not by the value logic chosen here.
          </Trans>
        </p>
      ) : null}
      <p>
        <Link
          to="/achizitii/metodologie"
          className="font-bold underline underline-offset-2"
        >
          <Trans>How these values work — full methodology</Trans>
        </Link>
      </p>
    </aside>
  )
}
