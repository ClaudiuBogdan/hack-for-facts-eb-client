import { Trans } from '@lingui/react/macro'
import { Filter } from 'lucide-react'

type Props = {
  readonly missingClassificationLabels: readonly string[]
}

/**
 * What the user sees instead of the series while the scope is unresolved:
 * a classification dimension has neither a server default nor a URL pin.
 *
 * Source rows may remain inspectable while the chart needs a complete selection.
 * The scope controls and table row action provide explicit ways to choose it.
 */
export function DetailScopePrompt({ missingClassificationLabels }: Props) {
  return (
    <div
      // No border of its own: this renders inside the series band, and a
      // dashed box inside a bordered card is a card in a card (DESIGN.md
      // §Do's and Don'ts). The band is the frame; this is its content.
      className="flex flex-col items-center gap-3 px-2 py-10 text-center"
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
        {missingClassificationLabels.map((label) => (
          <li key={label}>
            <Trans>Alege o valoare pentru: {label}</Trans>
          </li>
        ))}
      </ul>
    </div>
  )
}
