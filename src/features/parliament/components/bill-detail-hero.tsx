import { Link } from '@tanstack/react-router'
import { Hourglass } from 'lucide-react'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { formatBillUpdatedAt, getChamberLabel } from '../lib/formatting'
import { getBillTypeLabel } from '../lib/bill-profile-data'
import {
  billDetailPageContainerClassName,
  getBillDetailHeroColor,
} from '../lib/bill-detail-theme'

type Props = {
  readonly bill: ParliamentBillDetail
}

type StepProps = {
  readonly label: string
  readonly active: boolean
  readonly completed: boolean
}

function BillProgressStep({ label, active, completed }: StepProps) {
  return (
    <div className="flex min-w-[5.5rem] flex-col items-center gap-2 text-center">
      <span className="max-w-[7rem] text-xs font-semibold leading-tight text-white sm:text-sm">
        {label}
      </span>
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 border-white',
          completed && !active ? 'bg-white' : 'bg-transparent',
        )}
        aria-hidden
      >
        {active ? <Hourglass className="h-5 w-5 text-white" /> : null}
      </div>
    </div>
  )
}

/** Full-width bill summary band — inner content aligned to main panel */
export function BillDetailHero({ bill }: Props) {
  const heroColor = getBillDetailHeroColor(bill.originatingChamber)
  const cameraActive = bill.currentLocation === 'camera'
  const senatActive = bill.currentLocation === 'senat'
  const finalActive = ['mediere', 'presedinte', 'promulgat'].includes(bill.currentLocation)
  const cameraComplete =
    bill.currentLocation !== 'camera' &&
    !['retras'].includes(bill.currentLocation) &&
    bill.originatingChamber === 'camera'
  const senatComplete =
    bill.currentLocation === 'mediere' ||
    bill.currentLocation === 'presedinte' ||
    bill.currentLocation === 'promulgat'

  return (
    <section className="py-8 text-white" style={{ backgroundColor: heroColor }}>
      <div
        className={cn(
          billDetailPageContainerClassName,
          'grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
        )}
      >
        <div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-[2rem]">
            {bill.title}
          </h2>
          <p className="mt-3 text-base font-bold text-white">{getBillTypeLabel(bill.billType)}</p>
          <p className="mt-3 text-base text-white/90">
            Inițiat în {getChamberLabel(bill.originatingChamber)} · {bill.number}
          </p>
          <p className="mt-1 text-sm text-white/80">
            Actualizat: {formatBillUpdatedAt(bill.lastUpdatedAt)}
          </p>
        </div>

        <div className="min-w-[16rem]">
          <div className="flex items-end justify-between gap-1">
            <BillProgressStep
              label="Camera"
              active={cameraActive}
              completed={cameraComplete || senatComplete || finalActive}
            />
            <div className="mb-5 h-0.5 flex-1 bg-white/40" aria-hidden />
            <BillProgressStep
              label="Senat"
              active={senatActive}
              completed={senatComplete || finalActive}
            />
            <div className="mb-5 h-0.5 flex-1 bg-white/40" aria-hidden />
            <BillProgressStep
              label="Etape finale"
              active={finalActive}
              completed={bill.currentLocation === 'promulgat'}
            />
          </div>
          <Link
            to="/parlament/proiecte/$billId/etape"
            params={{ billId: bill.billId }}
            className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-2 hover:text-white/90"
          >
            Vezi parcursul complet
          </Link>
        </div>
      </div>
    </section>
  )
}
