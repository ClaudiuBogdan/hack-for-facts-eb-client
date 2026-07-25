import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Label } from '@/components/ui/label'
import {
  procurementQModeSchema,
  type ProcurementQMode,
} from '@/schemas/procurement-search'

type Props = {
  readonly mode: ProcurementQMode
  readonly onModeChange: (mode: ProcurementQMode) => void
}

const SELECT_CLASS =
  'h-10 rounded-none border-2 border-[#b1b4b6] bg-white px-2 text-sm font-semibold text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

/**
 * How the words in the search box are read. The three readings return wildly
 * different sets — on 1.55M contracts, "reparatii drumuri comunale" matched 14
 * records as all-words, 90,872 as any-word and 1 as a phrase — so the reader
 * gets the control rather than a hidden default they cannot explain.
 *
 * "Any word or similar" is named for what it does: it also tolerates ONE
 * spelling edit, which is why it can return a record whose title does not
 * contain the typed word at all.
 *
 * Only rendered for search-engine-served record types (`modifications` is SQL,
 * with a single substring match and no mode).
 */
function modeLabel(mode: ProcurementQMode): string {
  switch (mode) {
    case 'all':
      return t`All words`
    case 'any':
      return t`Any word or similar`
    case 'phrase':
      return t`Exact phrase`
  }
}

export function ProcurementMatchModeSelect({ mode, onModeChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="procurement-match-mode"
        className="text-sm font-semibold text-[var(--pnrr-muted)]"
      >
        <Trans>Match</Trans>
      </Label>
      <select
        id="procurement-match-mode"
        className={SELECT_CLASS}
        value={mode}
        onChange={(event) => {
          const parsed = procurementQModeSchema.safeParse(event.target.value)
          if (parsed.success) onModeChange(parsed.data)
        }}
      >
        {procurementQModeSchema.options.map((option) => (
          <option key={option} value={option}>
            {modeLabel(option)}
          </option>
        ))}
      </select>
    </div>
  )
}
