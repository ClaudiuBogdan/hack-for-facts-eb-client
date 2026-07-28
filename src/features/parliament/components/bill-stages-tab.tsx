import type { ParliamentBillDetail } from '@/schemas/parliament'
import { billDetailSectionTitleClassName } from '../lib/bill-detail-theme'
import {
  BILL_STAGES_VIEW_HINTS,
  DEFAULT_BILL_STAGES_VIEW,
  isProceduralStep,
  type BillStagesView,
} from '../lib/bill-stages-view'
import { BillOutcomeSummary } from './bill-outcome-summary'
import {
  BillStagesColumns,
  BillStagesRecordLanes,
} from './bill-passage-tracker'
import { BillStagesTimeline } from './bill-stages-timeline'
import { BillStagesViewSwitcher } from './bill-stages-view-switcher'

type Props = {
  readonly bill: ParliamentBillDetail
  readonly view?: BillStagesView
  readonly onViewChange?: (view: BillStagesView) => void
}

/**
 * Etape tab — the same procedure under three readings.
 *
 * All three draw on the same steps, so switching re-arranges what is on screen
 * and never removes an event. The chosen view lives in the URL (`?vedere=`), the
 * app's shareable-state contract.
 */
export function BillStagesTab({ bill, view, onViewChange }: Props) {
  const active = view ?? DEFAULT_BILL_STAGES_VIEW
  const steps = bill.timeline.filter(isProceduralStep)
  const recordOrder =
    bill.dossierBillIds.length > 0 ? bill.dossierBillIds : [bill.billId]
  const isMergedDossier =
    new Set(steps.map((step) => step.sourceBillKey ?? bill.billId)).size > 1

  return (
    <div className="space-y-6">
      <BillOutcomeSummary bill={bill} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={billDetailSectionTitleClassName}>Parcurs legislativ</h2>
        {onViewChange ? (
          <BillStagesViewSwitcher value={active} onChange={onViewChange} />
        ) : null}
      </div>

      {/* Say what the chosen reading does BEFORE it is read, where the layout
          cannot say it itself — most of all the duplication in `camere`. The
          rail carries no hint: it would only restate what is on screen. */}
      {BILL_STAGES_VIEW_HINTS[active] ? (
        <p className="max-w-4xl text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {BILL_STAGES_VIEW_HINTS[active]}
          {isMergedDossier ? (
            <>
              {' '}
              Nu am eliminat suprapunerile: ambele sunt înregistrări oficiale.
            </>
          ) : null}
        </p>
      ) : null}

      {steps.length === 0 ? (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există etape procedurale înregistrate pentru acest proiect.
        </p>
      ) : active === 'cronologic' ? (
        <BillStagesTimeline
          steps={steps}
          recordOrder={recordOrder}
          showRecordChip={isMergedDossier}
        />
      ) : active === 'camere' ? (
        <BillStagesColumns steps={steps} />
      ) : (
        <BillStagesRecordLanes
          steps={steps}
          recordOrder={recordOrder}
          fallbackKey={bill.billId}
        />
      )}
    </div>
  )
}
