import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
 *
 * Same filled-blue control as the group filter on a vote page — the two are the
 * same kind of choice, so they should not look like different mechanisms.
 */
export function BillStagesViewSwitcher({ value, onChange }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* A plain span, not a <label>: the trigger is a button, so `htmlFor`
          would name nothing. The accessible name comes from the trigger. */}
      <span className="text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        Vizualizare
      </span>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as BillStagesView)}
      >
        <SelectTrigger
          aria-label="Vizualizare"
          className="h-11 w-full min-w-[11rem] rounded-none border-0 bg-[#1d70b8] px-4 text-sm font-normal text-white shadow-none focus:ring-2 focus:ring-white/40 sm:w-auto [&>svg]:text-white [&>svg]:opacity-100"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none">
          {BILL_STAGES_VIEWS.map((view) => (
            <SelectItem key={view} value={view}>
              {BILL_STAGES_VIEW_LABELS[view]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
