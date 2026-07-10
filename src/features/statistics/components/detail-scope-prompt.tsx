import { Trans } from '@lingui/react/macro'
import { Filter } from 'lucide-react'

type Props = {
  readonly needsTerritory: boolean
  readonly missingClassificationLabels: readonly string[]
}

/**
 * What the user sees instead of a table while the observations query is
 * blocked by `isObservationsQueryEnabled`.
 *
 * Deliberately not a spinner: nothing is loading, and nothing will load until
 * the selection narrows. `insObservations` scans 23.6M rows, so an unscoped
 * query would end in a 30-second timeout rather than in data. Naming the exact
 * missing pins turns a dead end into the next click.
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
          Setul are prea multe observații pentru a fi afișat nefiltrat. Restrânge
          selecția ca să încărcăm datele.
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
      {needsTerritory && missingClassificationLabels.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <Trans>
            E suficient un teritoriu, sau toate clasificările de mai sus.
          </Trans>
        </p>
      ) : null}
    </div>
  )
}
