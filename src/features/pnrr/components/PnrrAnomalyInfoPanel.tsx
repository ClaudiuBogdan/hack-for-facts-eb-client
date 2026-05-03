import { useEffect, useState, type ElementType, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import type {
  AnomalyType,
  DataQualitySignalType,
  PnrrAggregates,
} from '@/schemas/pnrr'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  ANOMALY_CONFIG,
  DATA_QUALITY_SIGNAL_CONFIG,
  type AnomalySeverity,
} from '../lib/anomaly-definitions'
import { BookOpen, ChevronRight } from 'lucide-react'

type SelectedSignal =
  | { readonly kind: 'risk'; readonly type: AnomalyType }
  | { readonly kind: 'data-quality'; readonly type: DataQualitySignalType }

interface PnrrAnomalyInfoPanelProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly aggregates: PnrrAggregates
  readonly selectedSignal?: SelectedSignal
}

type SignalTone = {
  readonly accent: string
  readonly border: string
  readonly bg: string
  readonly text: string
}

const SIGNAL_TONES: Record<AnomalySeverity, SignalTone> = {
  critical: {
    accent: 'bg-[var(--pnrr-red)]',
    border: 'border-[var(--pnrr-red)]',
    bg: 'bg-[var(--pnrr-red)]/10',
    text: 'text-[var(--pnrr-red)]',
  },
  warning: {
    accent: 'bg-[var(--pnrr-orange)]',
    border: 'border-[var(--pnrr-orange)]',
    bg: 'bg-[var(--pnrr-orange)]/10',
    text: 'text-[var(--pnrr-orange)]',
  },
  attention: {
    accent: 'bg-[var(--pnrr-blue)]',
    border: 'border-[var(--pnrr-blue)]',
    bg: 'bg-[var(--pnrr-blue)]/10',
    text: 'text-[var(--pnrr-blue)]',
  },
  info: {
    accent: 'bg-[var(--pnrr-blue)]',
    border: 'border-[var(--pnrr-blue)]',
    bg: 'bg-[var(--pnrr-blue)]/10',
    text: 'text-[var(--pnrr-blue)]',
  },
}

type GuideSignalConfig = {
  readonly type: string
  readonly label: string
  readonly shortDescription: string
  readonly explanation: string
  readonly investigationTip: string
  readonly detectionRule: string
  readonly icon: ElementType
  readonly severity: AnomalySeverity
}

type SignalAggregate = {
  readonly count: number
  readonly value: number
}

export function PnrrAnomalyInfoPanel({
  open,
  onOpenChange,
  aggregates,
  selectedSignal,
}: PnrrAnomalyInfoPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(
    selectedSignal?.type ?? null,
  )

  useEffect(() => {
    if (selectedSignal?.type) {
      setExpanded(selectedSignal.type)
    }
  }, [selectedSignal?.type])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:rounded-none [&>button.absolute]:bg-transparent [&>button.absolute]:opacity-100 [&>button.absolute]:ring-offset-0 [&>button.absolute]:hover:bg-[var(--pnrr-card)] [&>button.absolute]:focus:ring-[var(--pnrr-blue)]">
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-6 pr-14 text-left">
          <div className="mb-3 inline-flex w-fit items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-bg)]">
            <BookOpen className="h-4 w-4" />
            <Trans>Guide</Trans>
          </div>
          <SheetTitle className="text-left text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Signal guide</Trans>
          </SheetTitle>
          <SheetDescription className="pt-2 text-left text-base font-bold leading-relaxed text-[var(--pnrr-muted)]">
            <Trans>
              The filters are calculated automatically from reported data. They
              help with prioritization; they do not prove an irregularity on
              their own.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <h3 className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                <Trans>How to interpret filters</Trans>
              </h3>
              <div className="mt-4 space-y-4 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <p>
                  <Trans>
                    Major risks indicate projects where financial progress,
                    technical progress, or project value suggests a priority
                    check. They are the most suitable filters for in-depth
                    investigations.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Data quality flags rows that can distort the analysis:
                    duplicates with different information or projects with no
                    published financial progress.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    If you select multiple filters, the table shows projects
                    that match at least one of them. Values are calculated in
                    the context of the active page filters.
                  </Trans>
                </p>
              </div>
            </section>

            <GuideSection title={<Trans>Major risks</Trans>}>
              {ANOMALY_CONFIG.map((cfg) => (
                <SignalGuideItem
                  key={cfg.type}
                  cfg={cfg}
                  data={aggregates.anomalyCounts[cfg.type]}
                  expanded={expanded === cfg.type}
                  onToggle={() =>
                    setExpanded(expanded === cfg.type ? null : cfg.type)
                  }
                />
              ))}
            </GuideSection>

            <GuideSection title={<Trans>Data quality</Trans>}>
              {DATA_QUALITY_SIGNAL_CONFIG.map((cfg) => (
                <SignalGuideItem
                  key={cfg.type}
                  cfg={cfg}
                  data={aggregates.dataQualitySignalCounts[cfg.type]}
                  expanded={expanded === cfg.type}
                  onToggle={() =>
                    setExpanded(expanded === cfg.type ? null : cfg.type)
                  }
                />
              ))}
            </GuideSection>

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <h3 className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                <Trans>Data note</Trans>
              </h3>
              <div className="mt-3 space-y-3 text-sm font-medium leading-relaxed text-[var(--pnrr-muted)]">
                <p>
                  <Trans>
                    Risks are separated from data quality issues to avoid false
                    alarms and keep the difference between execution and
                    reporting clear.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    {aggregates.missingFinProgressPercent.toFixed(0)}% of
                    projects have no financial progress data, which may hide
                    risks that depend on comparing technical and financial
                    progress.
                  </Trans>
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DrawerFooterClose onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function GuideSection({
  title,
  children,
}: {
  readonly title: ReactNode
  readonly children: ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
          {title}
        </h3>
        <span className="h-0.5 flex-1 bg-[var(--pnrr-border)]" />
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SignalGuideItem({
  cfg,
  data,
  expanded,
  onToggle,
}: {
  readonly cfg: GuideSignalConfig
  readonly data: SignalAggregate | undefined
  readonly expanded: boolean
  readonly onToggle: () => void
}) {
  const Icon = cfg.icon
  const tone = SIGNAL_TONES[cfg.severity]
  const hasCount = !!data && data.count > 0

  return (
    <button
      type="button"
      className={cn(
        'relative w-full overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
        expanded ? 'bg-[var(--pnrr-bg)]' : 'hover:bg-[var(--pnrr-bg)]',
      )}
      onClick={onToggle}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.accent)} />

      <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 pl-5">
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center border-2',
            tone.border,
            tone.bg,
            tone.text,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black leading-tight text-[var(--pnrr-fg)]">
              {cfg.label}
            </span>
            {hasCount && (
              <span className="inline-flex h-6 items-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-2 text-xs font-black tabular-nums text-[var(--pnrr-fg)]">
                {data.count}
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm font-medium leading-snug text-[var(--pnrr-muted)]">
            {cfg.shortDescription}
          </span>
        </span>
        <ChevronRight
          className={cn(
            'mt-2 h-5 w-5 shrink-0 text-[var(--pnrr-muted)] transition-transform',
            expanded && 'rotate-90 text-[var(--pnrr-fg)]',
          )}
        />
      </div>

      {expanded && (
        <div className="border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 pl-5">
          <div className="space-y-4">
            <SignalDetail label={<Trans>Detection rule</Trans>}>
              <span className="inline-flex items-start gap-2">
                <span
                  className={cn('mt-1.5 h-2.5 w-2.5 shrink-0', tone.accent)}
                />
                <span>{cfg.detectionRule}</span>
              </span>
            </SignalDetail>
            <SignalDetail label={<Trans>What it means</Trans>}>
              {cfg.explanation}
            </SignalDetail>
            <SignalDetail label={<Trans>What to investigate</Trans>}>
              {cfg.investigationTip}
            </SignalDetail>
            {hasCount && (
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--pnrr-border)] pt-4">
                <SignalStat
                  label={<Trans>Projects</Trans>}
                  value={String(data.count)}
                />
                <SignalStat
                  label={<Trans>Total value</Trans>}
                  value={`${(data.value / 1_000_000).toFixed(1)}M EUR`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  )
}

function SignalDetail({
  label,
  children,
}: {
  readonly label: ReactNode
  readonly children: ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--pnrr-fg)]">
        {children}
      </p>
    </div>
  )
}

function SignalStat({
  label,
  value,
}: {
  readonly label: ReactNode
  readonly value: string
}) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tabular-nums text-[var(--pnrr-fg)]">
        {value}
      </p>
    </div>
  )
}

function DrawerFooterClose({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-full items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        <Trans>Close</Trans>
      </button>
    </div>
  )
}
