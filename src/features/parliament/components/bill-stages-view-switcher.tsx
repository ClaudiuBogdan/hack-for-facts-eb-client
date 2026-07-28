import { useId } from 'react'
import { billDetailControlClassName } from '../lib/bill-detail-theme'
import {
  BILL_STAGES_VIEW_LABELS,
  BILL_STAGES_VIEWS,
  type BillStagesView,
} from '../lib/bill-stages-view'

type Props = {
  readonly value: BillStagesView
  readonly onChange: (view: BillStagesView) => void
}

/**
 * Switch between the three readings of the same procedure.
 *
 * Applied on change rather than behind a confirm, and mirrored into the URL by
 * the caller: it re-arranges what is already on screen, and a reader who found
 * the reading that works for them can share exactly that.
 */
export function BillStagesViewSwitcher({ value, onChange }: Props) {
  const selectId = useId()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <label
        htmlFor={selectId}
        className="text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]"
      >
        Vizualizare
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value as BillStagesView)}
        className={billDetailControlClassName}
      >
        {BILL_STAGES_VIEWS.map((view) => (
          <option key={view} value={view}>
            {BILL_STAGES_VIEW_LABELS[view]}
          </option>
        ))}
      </select>
    </div>
  )
}
