import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { ElementType, ReactNode } from 'react'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency, formatPnrrPercentage } from '../../lib/formatting'
import type {
  PnrrEntityType,
  PnrrProject,
  PnrrProjectRecord,
  PnrrReportedProgress,
} from '@/schemas/pnrr'
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
  CalendarDays,
  Copy,
  Database,
  ExternalLink,
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
import { formatCurrency } from '@/lib/utils'
import { PNRR_FILESET_ID, PNRR_MIPE_SOURCE_URL } from '../../lib/snapshot'

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
    typeof project.techProgress === 'number' ? project.techProgress : null
  const finVal =
    typeof project.finProgress === 'number' ? project.finProgress : null
  const componentColor = comp?.color ?? 'var(--pnrr-blue)'
  const hasSignals =
    project.anomalies.length > 0 || project.dataQualitySignals.length > 0
  const records = project.records ?? [project]
  const projectValue = project.totalValueEur ?? project.valueEur

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
              {(project.variantCounts?.components ?? 0) > 0 &&
                ` +${project.variantCounts?.components ?? 0}`}
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
                {measure.type === 'reform' ? (
                  <Trans>Reform</Trans>
                ) : (
                  <Trans>Investment</Trans>
                )}
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
              label={t`Listed EU funding`}
              value={formatPnrrCurrency(projectValue, currency, 'standard')}
              color={componentColor}
            />

            <MetricBox
              icon={Gauge}
              label={t`Funding`}
              value={getFundingLabel(project.fundingSource)}
              color={componentColor}
            />
          </div>

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
            <ProgressMeter
              label={t`Reported technical progress`}
              value={techVal}
              displayValue={formatProgressForRecord(project.techProgress)}
              isCategorical={typeof project.techProgress === 'string'}
              color={componentColor}
            />

            <div className="my-4 h-px bg-[var(--pnrr-border)]" />
            <ProgressMeter
              label={t`Reported financial progress`}
              value={finVal}
              displayValue={formatProgressForRecord(project.finProgress)}
              isCategorical={typeof project.finProgress === 'string'}
              color={componentColor}
            />
          </div>

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
            <DetailRow icon={Building2} label={t`Beneficiary`}>
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
                    aria-label={t`Copy CUI`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </DetailRow>
            <DetailRow label="id_angajament">
              <span>{project.engagementId ?? '—'}</span>
            </DetailRow>
            <DetailRow label={t`Contract number`}>
              <span>{project.contractNumber ?? '—'}</span>
            </DetailRow>
            <DetailRow label={t`Records`}>
              <span>{records.length.toLocaleString('ro-RO')}</span>
            </DetailRow>
            <DetailRow icon={CalendarDays} label={t`Commitment date`}>
              <span>{formatSourceDate(project.commitmentDate)}</span>
            </DetailRow>
            <DetailRow label={t`Implementation period`}>
              <span>
                {formatSourceDate(project.startDate)} –{' '}
                {formatSourceDate(project.endDate)}
              </span>
            </DetailRow>
            <DetailRow icon={MapPin} label={t`Location`}>
              <span>
                {formatProjectLocation(project.locality, project.county)}
              </span>
            </DetailRow>
            <DetailRow label={t`Beneficiary type`}>
              <span>
                {project.sourceBeneficiaryType ??
                  getEntityTypeLabel(project.entityType)}
              </span>
            </DetailRow>
            <DetailRow label={t`Impact`}>
              <span>{project.impact ?? '—'}</span>
            </DetailRow>
            <DetailRow label={t`CRI`}>
              <span>
                {project.cri}
                {project.criName ? ` · ${project.criName}` : ''}
              </span>
            </DetailRow>
          </div>

          <PnrrEntityShortcutLinks cui={project.cui} />

          {hasSignals && (
            <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                <Trans>Signals</Trans>
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
            <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
              <Trans>Official records</Trans>
            </h3>
            <div className="space-y-3">
              {records.map((record) => (
                <ProjectRecordDetail
                  key={record.id}
                  record={record}
                  currency={currency}
                />
              ))}
            </div>
          </div>

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
              <Trans>Provenance</Trans>
            </h3>
            <p className="text-sm leading-relaxed text-[var(--pnrr-muted)]">
              <Trans>
                MIPE PNRR project file set {PNRR_FILESET_ID}. This identifier
                does not claim a source observation date. The official record
                cards preserve the source unit and the published variants.
              </Trans>
            </p>
            <a
              href={project.sourceUrl ?? PNRR_MIPE_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--pnrr-fg)] underline underline-offset-4"
            >
              <Trans>Open the official MIPE dashboard</Trans>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
              <Trans>Component</Trans>
            </h3>
            <p className="text-sm leading-relaxed text-[var(--pnrr-fg)]">
              {comp?.descriptionRo ??
                t`No description exists for this component.`}
            </p>
          </div>
        </div>
        <DrawerFooterClose onClose={onClose} />
      </SheetContent>
    </Sheet>
  )
}

function formatProjectLocation(locality: string, county: string): string {
  if (!locality) return county || '—'
  if (!county) return locality
  if (
    normalizeLocationForDisplay(locality) ===
    normalizeLocationForDisplay(county)
  ) {
    return locality
  }

  return `${locality}, ${county}`
}

function normalizeLocationForDisplay(value: string): string {
  return value
    .toLocaleLowerCase('ro-RO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function ProjectRecordDetail({
  record,
  currency,
}: {
  readonly record: PnrrProjectRecord
  readonly currency: 'RON' | 'EUR' | 'USD'
}) {
  return (
    <div className="border border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="border border-[var(--pnrr-border)] px-2 py-1 text-xs font-black text-[var(--pnrr-fg)]">
          {record.componentCode}
        </span>
        <span className="border border-[var(--pnrr-border)] px-2 py-1 text-xs font-black text-[var(--pnrr-fg)]">
          {record.measureFullCode}
        </span>
        <span className="ml-auto text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
          {formatPnrrCurrency(record.valueEur, currency, 'standard')}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--pnrr-muted)]">
        <RecordField label={t`Contract`} value={record.contractNumber ?? '—'} />
        <RecordField
          label={t`Funding`}
          value={getFundingLabel(record.fundingSource)}
        />
        <RecordField label={t`CRI`} value={record.cri || '—'} />
        <RecordField label={t`CRI name`} value={record.criName ?? '—'} />
        <RecordField label={t`County`} value={record.county || '—'} />
        <RecordField label={t`Locality`} value={record.locality || '—'} />
        <RecordField
          label={t`Commitment date`}
          value={formatSourceDate(record.commitmentDate)}
        />
        <RecordField
          label={t`Start date`}
          value={formatSourceDate(record.startDate)}
        />
        <RecordField
          label={t`End date`}
          value={formatSourceDate(record.endDate)}
        />
        <RecordField
          label={t`Source beneficiary type`}
          value={record.sourceBeneficiaryType ?? '—'}
        />
        <RecordField label={t`Impact`} value={record.impact ?? '—'} />
        <RecordField
          label={t`Total value (RON)`}
          value={formatRonValue(record.totalValueRon)}
        />
        <RecordField
          label={t`EU funds (RON)`}
          value={formatRonValue(record.sourceValueRon)}
        />
        <RecordField
          label={t`National contribution (RON)`}
          value={formatRonValue(record.nationalContributionRon)}
        />
        <RecordField
          label={t`VAT (RON)`}
          value={formatRonValue(record.vatValueRon)}
        />
        <RecordField
          label={t`Ineligible value (RON)`}
          value={formatRonValue(record.ineligibleValueRon)}
        />
        <RecordField
          label={t`Technical`}
          value={formatProgressForRecord(record.techProgress)}
        />
        <RecordField
          label={t`Financial`}
          value={formatProgressForRecord(record.finProgress)}
        />
      </dl>
    </div>
  )
}

function formatSourceDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  })
}

function formatRonValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return formatCurrency(value, 'standard', 'RON')
}

function RecordField({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="min-w-0">
      <dt className="font-black uppercase tracking-wide">{label}</dt>
      <dd className="truncate text-[var(--pnrr-fg)]" title={value}>
        {value}
      </dd>
    </div>
  )
}

function formatProgressForRecord(progress: PnrrReportedProgress): string {
  if (progress === null) return t`No data`
  if (progress === 'under-30-reported') {
    return t`Under 30% (reported category)`
  }
  if (progress === 'in-implementation') {
    return t`In implementation (percentage not published)`
  }
  return formatPnrrPercentage(progress)
}

function DrawerFooterClose({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="sticky bottom-0 border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
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
  isCategorical = false,
  color,
}: {
  readonly label: string
  readonly value: number | null
  readonly displayValue: string
  readonly isCategorical?: boolean
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
      {isCategorical ? (
        <div className="flex min-h-9 items-center border-2 border-dashed border-[var(--pnrr-border)] px-3 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
          <Database className="mr-2 h-4 w-4 shrink-0" />
          <Trans>Reported category; exact percentage not published</Trans>
        </div>
      ) : value == null ? (
        <div className="flex h-9 items-center border-2 border-dashed border-[var(--pnrr-border)] px-3 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
          <Database className="mr-2 h-4 w-4" />
          <Trans>Missing from dataset</Trans>
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
          : 'border-[var(--pnrr-blue)] bg-[var(--pnrr-blue)]/10 text-[var(--pnrr-blue)]',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

function getFundingLabel(source: PnrrProject['fundingSource']): string {
  if (source === 'grant') return t`Grant`
  if (source === 'loan') return t`Loan`
  return t`Grant + loan`
}

function getEntityTypeLabel(type: PnrrEntityType): string {
  if (type === 'private') return t`Private / non-public`
  return t`Public`
}
