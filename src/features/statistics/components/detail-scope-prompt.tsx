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
 * Source rows may remain inspectable while the chart needs a complete selection.
 * The scope controls and table row action provide explicit ways to choose it.
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
          Completează selecțiile de mai sus pentru a afișa graficul. Dacă
          tabelul are observații, poți alege seria unui rând cu toate
          coordonatele sale INS.
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
