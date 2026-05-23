import { Check, Hourglass, Minus, Slash } from 'lucide-react'
import type {
  BillStageStatus,
  ParliamentBillPassage,
  ParliamentBillPassageStage,
} from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  BILL_DETAIL_FINAL_PURPLE,
  billDetailCardClassName,
  billDetailSectionTitleClassName,
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/bill-detail-theme'
import { ParliamentChamberMark } from './parliament-hub-panel'

type Props = {
  readonly passage: ParliamentBillPassage
}

type ColumnProps = {
  readonly title: string
  readonly color: string
  readonly stages: readonly ParliamentBillPassageStage[]
}

function StageStatusIcon({ status }: { readonly status: BillStageStatus }) {
  switch (status) {
    case 'complete':
      return <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden />
    case 'in_progress':
      return <Hourglass className="h-4 w-4 text-white" aria-hidden />
    case 'not_applicable':
      return <Slash className="h-4 w-4 text-white/80" aria-hidden />
    case 'not_reached':
      return <Minus className="h-4 w-4 text-white/60" aria-hidden />
  }
}

function getStageCircleStyle(status: BillStageStatus, color: string): string {
  switch (status) {
    case 'complete':
    case 'in_progress':
      return color
    case 'not_applicable':
      return '#b1b4b6'
    case 'not_reached':
      return 'transparent'
  }
}

function PassageColumn({ title, color, stages }: ColumnProps) {
  return (
    <div className={cn(billDetailCardClassName, 'flex flex-col')}>
      <div
        className="flex items-center gap-2 border-b border-[#b1b4b6] px-4 py-3 dark:border-[var(--pnrr-border)]"
        style={{ borderTopWidth: 4, borderTopColor: color, borderTopStyle: 'solid' }}
      >
        <ParliamentChamberMark color={color} className="mt-0" />
        <h3 className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {title}
        </h3>
      </div>
      <ol className="divide-y divide-[#b1b4b6] dark:divide-[var(--pnrr-border)]">
        {stages.map((stage, index) => {
          const circleColor = getStageCircleStyle(stage.status, color)
          const isOutline = stage.status === 'not_reached'
          const isInProgress = stage.status === 'in_progress'

          return (
            <li
              key={stage.stageId}
              className={cn(
                'flex items-start gap-3 px-4 py-3',
                isInProgress ? 'bg-[#f3f2f1] dark:bg-[var(--pnrr-subtle)]' : '',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                  isOutline ? 'border-[#b1b4b6]' : 'border-transparent',
                )}
                style={{ backgroundColor: circleColor }}
                aria-hidden
              >
                <StageStatusIcon status={stage.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {index + 1}. {stage.label}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** UK-style three-column bill passage tracker — adapted for Romanian flow */
export function BillPassageTracker({ passage }: Props) {
  return (
    <div className="space-y-6">
      <h2 className={billDetailSectionTitleClassName}>Parcurs legislativ</h2>

      <div className="grid gap-6 xl:grid-cols-3">
        <PassageColumn
          title="Camera Deputaților"
          color={PARLIAMENT_CAMERA_GREEN}
          stages={passage.camera}
        />
        <PassageColumn
          title="Senat"
          color={PARLIAMENT_SENAT_RED}
          stages={passage.senat}
        />
        <PassageColumn
          title="Etape finale"
          color={BILL_DETAIL_FINAL_PURPLE}
          stages={passage.final}
        />
      </div>

      <div className={cn(billDetailCardClassName, 'px-5 py-4')}>
        <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">Legendă</p>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#006435]">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
            Finalizat
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#512178]">
              <Hourglass className="h-3 w-3 text-white" />
            </span>
            În desfășurare
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#b1b4b6]" />
            Neatins
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#b1b4b6]">
              <Slash className="h-3 w-3 text-white" />
            </span>
            Neaplicabil
          </li>
        </ul>
      </div>
    </div>
  )
}
