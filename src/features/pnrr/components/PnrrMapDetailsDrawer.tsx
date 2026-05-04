import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency, formatPnrrPercentage } from '../lib/formatting'
import type { PnrrWorkerProjectRow } from '../workers/pnrr-worker-types'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, MapPinned, ShieldAlert } from 'lucide-react'
import { PnrrProjectDrawer } from './table/PnrrProjectDrawer'
import { getAnomalyLabel } from '../lib/anomaly-definitions'
import { PnrrEntityShortcutLinks } from './PnrrEntityShortcutLinks'
import { getProjectIdentity } from '../lib/data-transform'
import { usePnrrProjectDetail } from '../hooks/usePnrrData'

type MapBeneficiary = {
  readonly name: string
  readonly cui: string | null
  readonly count: number
  readonly value: number
}

type ComponentStat = {
  readonly code: string
  readonly name: string
  readonly color: string
  readonly count: number
  readonly value: number
}

export function PnrrMapDetailsDrawer({
  open,
  title,
  eyebrow,
  description,
  projects,
  onClose,
  onBeneficiaryClick,
  onViewProjects,
  onViewBeneficiaries,
  selectedProjectId,
  onProjectClick,
  onProjectClose,
  footerEntityShortcut,
}: {
  readonly open: boolean
  readonly title: string
  readonly eyebrow: ReactNode
  readonly description?: string
  readonly projects: readonly PnrrWorkerProjectRow[]
  readonly onClose: () => void
  readonly onBeneficiaryClick?: (beneficiary: {
    readonly name: string
    readonly cui: string | null
  }) => void
  readonly onViewProjects?: () => void
  readonly onViewBeneficiaries?: () => void
  readonly selectedProjectId?: string
  readonly onProjectClick?: (projectId: string) => void
  readonly onProjectClose?: () => void
  readonly footerEntityShortcut?: {
    readonly cui: string | null
    readonly label: string
  }
}) {
  const currency = usePnrrCurrency()

  const stats = useMemo(() => buildMapStats(projects), [projects])
  const totalValue = stats.totalValue
  const { data: selectedProjectResult } = usePnrrProjectDetail(selectedProjectId)
  const selectedProject = selectedProjectResult?.project ?? null

  return (
    <>
      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent className="w-full overflow-y-auto border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl">
          <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 pr-12 text-left">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 items-center gap-2 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-3 text-sm font-black uppercase text-[var(--pnrr-bg)]">
                <MapPinned className="h-4 w-4" />
                {eyebrow}
              </span>
              {stats.anomalyCount > 0 && (
                <span className="inline-flex h-9 items-center gap-2 rounded-sm border-2 border-[var(--pnrr-red)] bg-[var(--pnrr-red)]/10 px-3 text-sm font-black uppercase text-[var(--pnrr-red)]">
                  <ShieldAlert className="h-4 w-4" />
                  {formatNumber(stats.anomalyCount)} <Trans>risks</Trans>
                </span>
              )}
            </div>
            <SheetTitle className="text-left text-3xl font-black leading-tight text-[var(--pnrr-fg)]">
              {title}
            </SheetTitle>
            <SheetDescription className="text-left text-base font-medium text-[var(--pnrr-muted)]">
              {description ? `${description} · ` : ''}
              {formatNumber(stats.projectCount)}{' '}
              {stats.projectCount === 1 ? t`project` : t`projects`} ·{' '}
              {formatPnrrCurrency(totalValue, currency, 'standard')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MapMetric
                label={t`Projects`}
                value={formatNumber(stats.projectCount)}
              />
              <MapMetric
                label={t`Risk signals`}
                value={formatNumber(stats.anomalyCount)}
                tone={stats.anomalyCount > 0 ? 'red' : 'default'}
              />
              <MapMetric
                label={t`Unpublished data`}
                value={formatNumber(stats.dataQualityCount)}
                tone={stats.dataQualityCount > 0 ? 'blue' : 'default'}
              />
            </div>

            {(onViewProjects || onViewBeneficiaries) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {onViewProjects && (
                  <button
                    type="button"
                    onClick={onViewProjects}
                    className="flex h-11 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                  >
                    <Trans>View projects in UAT</Trans>
                  </button>
                )}
                {onViewBeneficiaries && (
                  <button
                    type="button"
                    onClick={onViewBeneficiaries}
                    className="flex h-11 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                  >
                    <Trans>View beneficiaries in UAT</Trans>
                  </button>
                )}
              </div>
            )}

            <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <SectionHeader
                title={t`Top projects`}
                subtitle={t`Only the largest projects are shown.`}
              />

              <div className="divide-y divide-[var(--pnrr-border)]">
                {stats.topProjects.map((project, index) => (
                  <TopProjectRow
                    key={project.id}
                    index={index + 1}
                    project={project}
                    currency={currency}
                    onClick={() => onProjectClick?.(project.id)}
                  />
                ))}
              </div>
            </section>

            {stats.topBeneficiaries.length > 0 && (
              <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
                <SectionHeader
                  title={t`Top beneficiaries`}
                  subtitle={t`Click a beneficiary to filter exactly by CUI.`}
                />

                <div className="divide-y divide-[var(--pnrr-border)]">
                  {stats.topBeneficiaries.map((beneficiary) => (
                    <div
                      key={`${beneficiary.name}|${beneficiary.cui ?? ''}`}
                      className="p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onBeneficiaryClick?.({
                            name: beneficiary.name,
                            cui: beneficiary.cui,
                          })
                        }
                        className="grid w-full grid-cols-[1fr_auto] gap-3 text-left transition-colors hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase text-[var(--pnrr-fg)]">
                            {beneficiary.name}
                          </p>
                          <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                            {formatNumber(beneficiary.count)}{' '}
                            {beneficiary.count === 1 ? t`project` : t`projects`}
                            {beneficiary.cui ? ` · CUI ${beneficiary.cui}` : ''}
                          </p>
                        </div>
                        <span className="text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
                          {formatPnrrCurrency(beneficiary.value, currency)}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {stats.components.length > 0 && (
              <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
                <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                  <Trans>Components</Trans>
                </h3>
                <div className="space-y-4">
                  {stats.components.map((component) => {
                    const pct =
                      totalValue > 0 ? (component.value / totalValue) * 100 : 0
                    return (
                      <div key={component.code}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-sm font-black text-[var(--pnrr-fg)]">
                            {component.code} · {component.name}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-[var(--pnrr-muted)]">
                            {formatPnrrCurrency(component.value, currency)}
                          </span>
                        </div>
                        <div
                          className="h-3 border-2 border-[var(--pnrr-border)]"
                          style={{ backgroundColor: `${component.color}24` }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: component.color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {stats.anomalyTypes.length > 0 && (
              <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--pnrr-red)]">
                  <AlertTriangle className="h-4 w-4" />
                  <Trans>Semnale de risc detectate</Trans>
                </h3>
                <div className="space-y-2">
                  {stats.anomalyTypes.map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between gap-3 border-2 border-[var(--pnrr-red)] bg-[var(--pnrr-red)]/10 px-3 py-2 text-sm font-black uppercase text-[var(--pnrr-red)]"
                    >
                      <span>
                        {getAnomalyLabel(
                          type as Parameters<typeof getAnomalyLabel>[0],
                        )}
                      </span>
                      <span>{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {footerEntityShortcut?.cui && (
              <PnrrEntityShortcutLinks
                cui={footerEntityShortcut.cui}
                entityLabel={footerEntityShortcut.label}
              />
            )}
          </div>
          <MapDrawerFooterClose onClose={onClose} />
        </SheetContent>
      </Sheet>

      <PnrrProjectDrawer
        project={selectedProject}
        onClose={() => onProjectClose?.()}
      />
    </>
  )
}

function MapDrawerFooterClose({ onClose }: { readonly onClose: () => void }) {
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

function buildMapStats(projects: readonly PnrrWorkerProjectRow[]) {
  const totalValue = projects.reduce(
    (sum, project) => sum + project.valueEur,
    0,
  )
  const projectCount = countUniqueMapProjects(projects)
  const anomalyCount = countUniqueMapProjects(
    projects.filter((project) => project.anomalies.length > 0),
  )
  const dataQualityCount = countUniqueMapProjects(
    projects.filter((project) => project.dataQualitySignals.length > 0),
  )

  const beneficiaryMap = new Map<
    string,
    MapBeneficiary & { projectIds: Set<string> }
  >()
  const componentMap = new Map<
    string,
    ComponentStat & { projectIds: Set<string> }
  >()
  const anomalyTypes = new Map<string, number>()

  for (const project of projects) {
    const projectId = getProjectIdentity(project)
    const beneficiaryKey = `${project.beneficiary}|${project.cui ?? ''}`
    const beneficiary = beneficiaryMap.get(beneficiaryKey)
    if (beneficiary) {
      const projectIds = new Set(beneficiary.projectIds)
      projectIds.add(projectId)
      beneficiaryMap.set(beneficiaryKey, {
        ...beneficiary,
        count: projectIds.size,
        projectIds,
        value: beneficiary.value + project.valueEur,
      })
    } else {
      beneficiaryMap.set(beneficiaryKey, {
        name: project.beneficiary,
        cui: project.cui,
        count: 1,
        projectIds: new Set([projectId]),
        value: project.valueEur,
      })
    }

    const component = PNRR_COMPONENTS[project.componentCode]
    const componentStat = componentMap.get(project.componentCode)
    if (componentStat) {
      const projectIds = new Set(componentStat.projectIds)
      projectIds.add(projectId)
      componentMap.set(project.componentCode, {
        ...componentStat,
        count: projectIds.size,
        projectIds,
        value: componentStat.value + project.valueEur,
      })
    } else {
      componentMap.set(project.componentCode, {
        code: project.componentCode,
        name: component?.nameRo ?? project.componentCode,
        color: component?.color ?? '#64748b',
        count: 1,
        projectIds: new Set([projectId]),
        value: project.valueEur,
      })
    }

    for (const anomaly of project.anomalies) {
      anomalyTypes.set(anomaly, (anomalyTypes.get(anomaly) ?? 0) + 1)
    }
  }

  return {
    totalValue,
    projectCount,
    anomalyCount,
    dataQualityCount,
    topProjects: [...projects]
      .sort((a, b) => (b.totalValueEur ?? b.valueEur) - (a.totalValueEur ?? a.valueEur))
      .slice(0, 5),
    topBeneficiaries: Array.from(beneficiaryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    components: Array.from(componentMap.values()).sort(
      (a, b) => b.value - a.value,
    ),
    anomalyTypes: Array.from(anomalyTypes.entries()).sort(
      (a, b) => b[1] - a[1],
    ),
  }
}

function countUniqueMapProjects(
  projects: readonly PnrrWorkerProjectRow[],
): number {
  return new Set(projects.map(getProjectIdentity)).size
}

function MapMetric({
  label,
  value,
  tone = 'default',
}: {
  readonly label: string
  readonly value: string
  readonly tone?: 'default' | 'red' | 'blue'
}) {
  const toneClass =
    tone === 'red'
      ? 'border-[var(--pnrr-red)] text-[var(--pnrr-red)]'
      : tone === 'blue'
        ? 'border-[var(--pnrr-blue)] text-[var(--pnrr-blue)]'
        : 'border-[var(--pnrr-border)] text-[var(--pnrr-fg)]'

  return (
    <div className={`border-2 bg-[var(--pnrr-card)] p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black leading-none tabular-nums">
        {value}
      </p>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  readonly title: string
  readonly subtitle: string
}) {
  return (
    <div className="border-b-2 border-[var(--pnrr-border)] p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--pnrr-muted)]">{subtitle}</p>
    </div>
  )
}

function TopProjectRow({
  index,
  project,
  currency,
  onClick,
}: {
  readonly index: number
  readonly project: PnrrWorkerProjectRow
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onClick: () => void
}) {
  const component = PNRR_COMPONENTS[project.componentCode]
  const color = component?.color ?? 'var(--pnrr-blue)'
  const techValue =
    project.techProgress === 'in-implementation'
      ? 15
      : (project.techProgress ?? 0)
  const projectValue = project.totalValueEur ?? project.valueEur

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[auto_1fr] gap-3 p-4 text-left transition-colors hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <span className="flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] text-xs font-black text-[var(--pnrr-fg)]">
        {index}
      </span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--pnrr-fg)]">
            {project.title}
          </p>
          <span
            className="shrink-0 rounded-sm border px-2 py-1 text-xs font-black"
            style={{ borderColor: color, color, backgroundColor: `${color}14` }}
          >
            {project.componentCode}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-bold uppercase text-[var(--pnrr-muted)]">
          {project.beneficiary}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
            {formatPnrrCurrency(projectValue, currency)}
          </span>
          <div className="flex min-w-[160px] items-center gap-2">
            <div
              className="h-2 flex-1 rounded-full"
              style={{ backgroundColor: `${color}26` }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(techValue, 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="w-14 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
              {project.techProgress === 'in-implementation'
                ? '<30%'
                : formatPnrrPercentage(techValue)}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
