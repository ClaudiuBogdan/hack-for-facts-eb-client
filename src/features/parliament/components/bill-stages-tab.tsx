import type { ParliamentBillDetail } from '@/schemas/parliament'
import { BillPassageTracker } from './bill-passage-tracker'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** Etape tab — full Romanian passage tracker */
export function BillStagesTab({ bill }: Props) {
  return <BillPassageTracker passage={bill.passage} />
}
