import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { ElementType, ReactNode } from 'react'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type { PnrrEntityType, PnrrProject } from '@/schemas/pnrr'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
import { PNRR_MEASURES } from '../../data/measure-definitions'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  AlertTriangle,
  Building2,
  Copy,
  Database,
  FileWarning,
  Gauge,
  MapPin,
  Scale,
  Wallet,
  Wrench,
} from 'lucide-react'
import {
  getAnomalyLabel,
  getDataQualitySignalLabel,
} from '../../lib/anomaly-definitions'
import { cn } from '@/lib/utils'
import { PnrrEntityShortcutLinks } from '../PnrrEntityShortcutLinks'

export function PnrrProjectDrawer({
  project,
  onClose,
}: {
  readonly project: PnrrProject | null
  readonly onClose: () => void
}) {
  const currency = usePnrrCurrency()

  if (!project) return null
  const comp = PNRR_COMPONENTS[project.componentCode]
  const measure = PNRR_MEASURES[project.measureFullCode]
  const techVal =
    project.techProgress === 'in-implementation' ? 15 : project.techProgress ?? 0
  const finVal =
    project.finProgress === 'in-implementation' ? 15 : project.finProgress ?? 0
  const componentColor = comp?.color ?? 'var(--pnrr-blue)'
  const hasSignals = project.anomalies.length > 0 || project.dataQualitySignals.length > 0

  return (
    <Sheet open={!!project} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl">
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 pr-12 text-left">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-9 items-center justify-center rounded-sm border-2 px-3 text-sm font-black"
              style={{ borderColor: componentColor, color: componentColor }}
            >
              {project.componentCode}
            </span>
            <span
              className="inline-flex h-9 items-center rounded-sm px-3 text-sm font-black text-white"
              style={{ backgroundColor: componentColor }}
            >
              {comp?.nameRo ?? project.componentCode}
            </span>
            {measure && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 text-sm font-black text-[var(--pnrr-fg)]">
                {measure.type === 'reform' ? (
                  <Scale className="h-4 w-4" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                {measure.type === 'reform' ? <Trans>Reformă</Trans> : <Trans>Investiție</Trans>}
              </span>
            )}
          </div>
          <SheetTitle className="text-left text-xl font-bold leading-snug text-[var(--pnrr-fg)]">
            {project.title}
          </SheetTitle>
          <SheetDescription className="text-left text-sm font-medium text-[var(--pnrr-muted)]">
            {project.measureFullCode}
            {measure ? ` · ${measure.nameRo}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricBox
              icon={Wallet}
              label={t`Valoare`}
              value={formatPnrrCurrency(project.valueEur, currency, 'standard')}
              color={componentColor}
            />
            <MetricBox
              icon={Gauge}
              label={t`Finanțare`}
              value={getFundingLabel(project.fundingSource)}
              color={componentColor}
            />
          </div>

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
            <ProgressMeter
              label={t`Progres tehnic`}
              value={techVal}
              displayValue={
                project.techProgress === 'in-implementation'
                  ? t`În implementare (<30%)`
                  : `${techVal}%`
              }
              color={componentColor}
            />
            <div className="my-4 h-px bg-[var(--pnrr-border)]" />
            <ProgressMeter
              label={t`Progres financiar`}
              value={project.finProgress == null ? null : finVal}
              displayValue={
                project.finProgress == null
                  ? t`Fără date`
                  : project.finProgress === 'in-implementation'
                    ? t`În implementare (<30%)`
                    : `${finVal}%`
              }
              color={componentColor}
            />
          </div>

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
            <DetailRow icon={Building2} label={t`Beneficiar`}>
              <span>{project.beneficiary}</span>
            </DetailRow>
            <DetailRow label={t`CUI`}>
              <span className="inline-flex items-center gap-2">
                {project.cui ?? '—'}
                {project.cui && (
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--pnrr-border)] text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
                    onClick={() => navigator.clipboard.writeText(project.cui!)}
                    aria-label={t`Copiază CUI`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </DetailRow>
            <DetailRow icon={MapPin} label={t`Localizare`}>
              <span>
                {project.locality}, {project.county}
              </span>
            </DetailRow>
            <DetailRow label={t`Tip beneficiar`}>
              <span>{getEntityTypeLabel(project.entityType)}</span>
            </DetailRow>
            <DetailRow label={t`CRI`}>
              <span>{project.cri}</span>
            </DetailRow>
          </div>

          <PnrrEntityShortcutLinks cui={project.cui} />

          {hasSignals && (
            <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                <Trans>Semnale</Trans>
              </h3>
              <div className="space-y-2">
                {project.anomalies.length > 0 &&
                  project.anomalies.map((a) => (
                    <SignalChip
                      key={a}
                      icon={AlertTriangle}
                      label={getAnomalyLabel(a)}
                      tone="red"
                    />
                  ))}
                {project.dataQualitySignals.map((signal) => (
                  <SignalChip
                    key={signal}
                    icon={FileWarning}
                    label={getDataQualitySignalLabel(signal)}
                    tone="blue"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
              <Trans>Componentă</Trans>
            </h3>
            <p className="text-sm leading-relaxed text-[var(--pnrr-fg)]">
              {comp?.descriptionRo ?? t`Nu există descriere pentru această componentă.`}
            </p>
          </div>
        </div>
        <DrawerFooterClose onClose={onClose} />
      </SheetContent>
    </Sheet>
  )
}

function DrawerFooterClose({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="sticky bottom-0 border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-full items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        <Trans>Închide</Trans>
      </button>
    </div>
  )
}

function MetricBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  readonly icon: ElementType
  readonly label: string
  readonly value: string
  readonly color: string
}) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        <Icon className="h-4 w-4" style={{ color }} />
        {label}
      </div>
      <div className="text-2xl font-black leading-tight text-[var(--pnrr-fg)]">
        {value}
      </div>
    </div>
  )
}

function ProgressMeter({
  label,
  value,
  displayValue,
  color,
}: {
  readonly label: string
  readonly value: number | null
  readonly displayValue: string
  readonly color: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
          {label}
        </span>
        <span className="text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
          {displayValue}
        </span>
      </div>
      {value == null ? (
        <div className="flex h-9 items-center border-2 border-dashed border-[var(--pnrr-border)] px-3 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
          <Database className="mr-2 h-4 w-4" />
          <Trans>Lipsă în dataset</Trans>
        </div>
      ) : (
        <div
          className="h-3 border-2 border-[var(--pnrr-border)]"
          style={{ backgroundColor: `${color}24` }}
        >
          <div
            className="h-full"
            style={{
              width: `${Math.min(value, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  readonly icon?: ElementType
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-[var(--pnrr-border)] px-4 py-3 last:border-b-0">
      <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-medium text-[var(--pnrr-fg)]">
        {children}
      </span>
    </div>
  )
}

function SignalChip({
  icon: Icon,
  label,
  tone,
}: {
  readonly icon: ElementType
  readonly label: string
  readonly tone: 'red' | 'blue'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-2 px-3 py-2 text-sm font-black uppercase tracking-wide',
        tone === 'red'
          ? 'border-[var(--pnrr-red)] bg-[var(--pnrr-red)]/10 text-[var(--pnrr-red)]'
          : 'border-[var(--pnrr-blue)] bg-[var(--pnrr-blue)]/10 text-[var(--pnrr-blue)]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

function getFundingLabel(source: PnrrProject['fundingSource']): string {
  if (source === 'grant') return t`Grant`
  if (source === 'loan') return t`Împrumut`
  return t`Grant + împrumut`
}

function getEntityTypeLabel(type: PnrrEntityType): string {
  if (type === 'private') return t`Privat`
  if (type === 'national') return t`Național`
  return t`Public`
}
