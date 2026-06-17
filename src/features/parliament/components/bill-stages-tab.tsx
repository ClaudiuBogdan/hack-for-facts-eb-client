import type { ParliamentBillDetail } from '@/schemas/parliament'
import { BillTimeline } from './bill-timeline'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** Etape tab — chronological procedural timeline (position order). */
export function BillStagesTab({ bill }: Props) {
  return <BillTimeline bill={bill} />
}
