import { Trans } from '@lingui/react/macro'
import { Label } from '@/components/ui/label'
import {
  procurementSortSchema,
  type ProcurementSort,
} from '@/schemas/procurement-search'
import { sortLabel } from '../lib/enum-labels'

type Props = {
  readonly sort: ProcurementSort
  readonly onSortChange: (sort: ProcurementSort) => void
  /**
   * Offer "Best match"? BM25 needs a query to rank against and a
   * search-engine-served record type, so the option is hidden rather than
   * offered and then rejected.
   */
  readonly allowRelevance?: boolean
}

const SELECT_CLASS =
  'h-10 rounded-none border-2 border-[#b1b4b6] bg-white px-2 text-sm font-semibold text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

export function ProcurementSortSelect({
  sort,
  onSortChange,
  allowRelevance = false,
}: Props) {
  const options = procurementSortSchema.options.filter(
    (option) => option !== 'relevance' || allowRelevance,
  )
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="procurement-sort"
        className="text-sm font-semibold text-[var(--pnrr-muted)]"
      >
        <Trans>Sort</Trans>
      </Label>
      <select
        id="procurement-sort"
        className={SELECT_CLASS}
        value={sort}
        onChange={(event) => {
          const parsed = procurementSortSchema.safeParse(event.target.value)
          if (parsed.success) onSortChange(parsed.data)
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {sortLabel(option)}
          </option>
        ))}
      </select>
    </div>
  )
}
