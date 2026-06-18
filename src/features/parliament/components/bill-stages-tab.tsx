import type { ParliamentBillDetail } from '@/schemas/parliament'
import { BillPassageTracker } from './bill-passage-tracker'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** Etape tab — 3-column passage tracker (chamber columns from real chamberCode). */
export function BillStagesTab({ bill }: Props) {
  return <BillPassageTracker bill={bill} />
}
