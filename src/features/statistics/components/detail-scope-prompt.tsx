import { Trans } from '@lingui/react/macro'
import { Filter } from 'lucide-react'

type Props = {
  readonly needsTerritory: boolean
  readonly missingClassificationLabels: readonly string[]
}

/**
 * What the user sees instead of the series while the scope is unresolved:
 * a classification dimension has neither a server default nor a URL pin.
 *
 * Deliberately not a spinner — nothing loads until the cell is fully
 * resolved (a partial scope would mix sibling cells into "one series"). The
 * scope sentence above stays interactive; this names EXACTLY the unresolved
 * dimensions and nothing else.
 */
export function DetailScopePrompt({
  needsTerritory,
  missingClassificationLabels,
}: Props) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center"
      role="status"
    >
      <Filter aria-hidden className="h-8 w-8 text-muted-foreground" />
      <h3 className="text-base font-semibold">
        <Trans>Alege ce vrei să vezi</Trans>
      </h3>
      <p className="max-w-prose text-sm text-muted-foreground">
        <Trans>
          Pentru acest set nu există o selecție implicită pentru dimensiunile de
          mai jos. Alege o valoare din propoziția de selecție de mai sus ca să
          încărcăm seria.
        </Trans>
      </p>
      <ul className="space-y-1 text-sm">
        {needsTerritory ? (
          <li>
            <Trans>Alege un teritoriu</Trans>
          </li>
        ) : null}
        {missingClassificationLabels.map((label) => (
          <li key={label}>
            <Trans>Alege o valoare pentru: {label}</Trans>
          </li>
        ))}
      </ul>

    </div>
  )
}
