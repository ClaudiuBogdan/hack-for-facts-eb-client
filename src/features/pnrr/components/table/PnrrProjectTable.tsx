import { useCallback, useEffect, memo, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency, formatPnrrPercentage } from '../../lib/formatting'
import type {
  PnrrProject,
  PnrrReportedProgress,
  PnrrSearchState,
} from '@/schemas/pnrr'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  FileWarning,
  MoreHorizontal,
} from 'lucide-react'
import { PnrrProjectDrawer } from './PnrrProjectDrawer'
import { usePnrrProjectDetail } from '../../hooks/usePnrrData'
import type {
  PnrrWorkerProjectPage,
  PnrrWorkerProjectRow,
} from '../../workers/pnrr-worker-types'
import { hasPnrrComponentMeasureConflict } from '../../lib/data-transform'

function SortIcon({
  active,
  order,
}: {
  readonly active: boolean
  readonly order: 'asc' | 'desc'
}) {
  if (!active)
    return (
      <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-[var(--pnrr-muted)]" />
    )
  return order === 'asc' ? (
    <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-[var(--pnrr-fg)]" />
  ) : (
    <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-[var(--pnrr-fg)]" />
  )
}

function SortableTableHead({
  column,
  label,
  currentSortBy,
  currentSortOrder,
  onSort,
  align = 'left',
  className = '',
}: {
  readonly column: PnrrSearchState['sortBy']
  readonly label: ReactNode
  readonly currentSortBy: PnrrSearchState['sortBy']
  readonly currentSortOrder: 'asc' | 'desc'
  readonly onSort: (column: PnrrSearchState['sortBy']) => void
  readonly align?: 'left' | 'right'
  readonly className?: string
}) {
  const isActive = currentSortBy === column
  return (
    <TableHead
      className={`text-sm font-black uppercase text-[var(--pnrr-fg)] ${className}`}
      aria-sort={
        isActive
          ? currentSortOrder === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`flex w-full items-center py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] ${
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
        }`}
      >
        {label}
        <SortIcon active={isActive} order={currentSortOrder} />
      </button>
    </TableHead>
  )
}

function getProgressValue(
  progress: PnrrProject['techProgress'] | PnrrProject['finProgress'],
): number | null {
  return typeof progress === 'number' ? progress : null
}

function getProgressLabel(progress: PnrrReportedProgress): string {
  if (progress === null) return t`N/A`
  if (progress === 'under-30-reported') return t`Under 30% (reported category)`
  if (progress === 'in-implementation') {
    return t`In implementation (percentage not published)`
  }
  return formatPnrrPercentage(progress)
}

function CompactProgress({
  progress,
  color,
  variantCount = 0,
}: {
  readonly progress: PnrrReportedProgress
  readonly color: string
  readonly variantCount?: number
}) {
  const numericValue = getProgressValue(progress)
  const label = getProgressLabel(progress)

  if (numericValue === null) {
    return (
      <span
        className="inline-flex min-h-7 max-w-36 items-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-2 text-[10px] font-bold leading-tight text-[var(--pnrr-muted)]"
        title={label}
      >
        {progress === null ? t`N/A` : label}
        {variantCount > 0 && ` +${variantCount}`}
      </span>
    )
  }

  return (
    <div className="flex w-32 items-center gap-2">
      <div
        className="h-2 flex-1 rounded-full"
        style={{ backgroundColor: `${color}26` }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(numericValue, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
        {label}
        {variantCount > 0 && ` +${variantCount}`}
      </span>
    </div>
  )
}

function getProjectValue(project: Pick<PnrrProject, 'totalValueEur' | 'valueEur'>): number {
  return project.totalValueEur ?? project.valueEur
}

function getVariantCount(
  project: PnrrProject,
  key: keyof NonNullable<PnrrProject['variantCounts']>,
): number {
  return project.variantCounts?.[key] ?? 0
}

function ValueWithVariants({
  value,
  variantCount,
}: {
  readonly value: string
  readonly variantCount: number
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{value}</span>
      {variantCount > 0 && (
        <span className="text-xs font-black text-[var(--pnrr-muted)]">
          +{variantCount}
        </span>
      )}
    </span>
  )
}

type ProjectRowProps = {
  readonly project: PnrrWorkerProjectRow
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onSelect: (project: PnrrWorkerProjectRow) => void
}

const ProjectRow = memo(function ProjectRow({
  project,
  currency,
  onSelect,
}: ProjectRowProps) {
  const comp = PNRR_COMPONENTS[project.componentCode]
  const projectValue = getProjectValue(project)
  const progressColor = comp?.color ?? 'var(--pnrr-blue)'

  return (
    <TableRow
      className="cursor-pointer border-b border-[var(--pnrr-border)] transition-colors hover:bg-[var(--pnrr-bg)]"
      onClick={() => onSelect(project)}
      tabIndex={0}
      aria-label={t`Open project details: ${project.title}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(project)
        }
      }}
    >
      <TableCell className="max-w-[360px] py-3">
        <div className="flex items-center gap-2">
          {project.anomalies.length > 0 && (
            <span className="h-3 w-3 shrink-0 rounded-full bg-[var(--pnrr-green)]" />
          )}
          {project.anomalies.length === 0 &&
            project.dataQualitySignals.length > 0 && (
              <FileWarning className="h-4 w-4 shrink-0 text-[var(--pnrr-blue)]" />
            )}
          <span
            className="truncate text-sm text-[var(--pnrr-fg)]"
            title={project.title}
          >
            {project.title}
          </span>
        </div>
      </TableCell>
      <TableCell className="max-w-[280px] py-3">
        <div className="flex flex-col">
          <span
            className="truncate text-sm font-medium uppercase leading-tight text-[var(--pnrr-fg)]"
            title={project.beneficiary}
          >
            {project.beneficiary}
          </span>
          {project.cui && (
            <span className="text-xs text-[var(--pnrr-muted)]">
              {project.cui}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3">
        {comp && (
          <span
            className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded border px-1.5 text-xs font-bold"
            style={{
              borderColor: comp.color,
              color: comp.color,
              backgroundColor: `${comp.color}14`,
            }}
          >
            {project.componentCode}
            {getVariantCount(project, 'components') > 0 && (
              <span className="ml-1 text-[10px] opacity-80">
                +{getVariantCount(project, 'components')}
              </span>
            )}
          </span>
        )}
      </TableCell>
      <TableCell className="py-3 text-sm text-[var(--pnrr-fg)]">
        <ValueWithVariants
          value={project.county}
          variantCount={getVariantCount(project, 'counties')}
        />
      </TableCell>
      <TableCell className="py-3 text-right text-sm tabular-nums text-[var(--pnrr-fg)]">
        {formatPnrrCurrency(projectValue, currency)}
      </TableCell>
      <TableCell className="py-3">
        <CompactProgress
          progress={project.techProgress}
          color={progressColor}
          variantCount={getVariantCount(project, 'techProgress')}
        />
      </TableCell>
      <TableCell className="py-3">
        <CompactProgress
          progress={project.finProgress}
          color={progressColor}
          variantCount={getVariantCount(project, 'finProgress')}
        />
      </TableCell>
      <TableCell className="w-12 py-3 text-right">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
          aria-label={t`Open project details: ${project.title}`}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(project)
          }}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </TableCell>
    </TableRow>
  )
})

export function PnrrProjectTable({
  page,
  filterState,
  isPageStatePending = false,
}: {
  readonly page: PnrrWorkerProjectPage
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly isPageStatePending?: boolean
}) {
  const currency = usePnrrCurrency()
  const selectedProjectId =
    filterState.search.panel === 'project'
      ? filterState.search.panelProjectId
      : null
  const {
    data: selectedProjectResult,
    isLoading: isProjectDetailLoading,
    isError: isProjectDetailError,
  } = usePnrrProjectDetail(selectedProjectId)
  const selectedProject = selectedProjectResult?.project ?? null

  const { setSorting, setPagination } = filterState
  const currentSortBy = page.sortBy
  const currentSortOrder = page.sortOrder
  const requestedPage = filterState.search.page ?? 1

  useEffect(() => {
    if (
      !isPageStatePending &&
      requestedPage > page.totalPages &&
      requestedPage !== page.page
    ) {
      setPagination(page.page, page.pageSize)
    }
  }, [
    isPageStatePending,
    page.page,
    page.pageSize,
    page.totalPages,
    requestedPage,
    setPagination,
  ])

  const toggleSort = useCallback(
    (column: PnrrSearchState['sortBy']) => {
      if (currentSortBy === column) {
        setSorting(column, currentSortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSorting(column, 'desc')
      }
    },
    [currentSortBy, currentSortOrder, setSorting],
  )

  const goToPage = useCallback((p: number) => setPagination(p, page.pageSize), [page.pageSize, setPagination])
  const hasDimensionConflict = hasPnrrComponentMeasureConflict(
    filterState.search,
  )

  if (page.totalCount === 0) {
    return (
      <div
        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-8"
        style={{ borderRadius: '6px' }}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
            <AlertTriangle className="h-8 w-8 text-[var(--pnrr-muted)]" />
          </div>
          <p className="mt-4 text-lg font-black text-[var(--pnrr-fg)]">
            {hasDimensionConflict ? (
              <Trans>Selected component and measure cannot match</Trans>
            ) : (
              <Trans>No projects found</Trans>
            )}
          </p>
          <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
            {hasDimensionConflict ? (
              <Trans>
                The selected measure belongs to another component. Remove one
                of these filters or choose a measure from the selected
                component.
              </Trans>
            ) : (
              <Trans>
                Try changing the filters or searching for something else.
              </Trans>
            )}
          </p>
          <button
            onClick={() => filterState.clearFilters()}
            className="mt-4 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <Trans>Clear all filters</Trans>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {selectedProjectId && isProjectDetailLoading && (
        <div
          className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-3 text-sm font-bold text-[var(--pnrr-muted)]"
          role="status"
        >
          <Trans>Loading the complete MIPE project record…</Trans>
        </div>
      )}
      {selectedProjectId &&
        !isProjectDetailLoading &&
        (isProjectDetailError || !selectedProject) && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--pnrr-orange)] bg-[var(--pnrr-card)] px-4 py-3 text-sm text-[var(--pnrr-fg)]"
            role="alert"
          >
            <span>
              <Trans>
                This project link is stale or the project is unavailable in the
                loaded MIPE snapshot.
              </Trans>
            </span>
            <button
              type="button"
              onClick={filterState.closePanel}
              className="border-2 border-[var(--pnrr-border)] px-3 py-1 font-black uppercase"
            >
              <Trans>Close details</Trans>
            </button>
          </div>
        )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] hover:bg-[var(--pnrr-card)]">
              <SortableTableHead
                column="title"
                label={<Trans>Project Title</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
                className="w-[360px]"
              />
              <SortableTableHead
                column="beneficiary"
                label={<Trans>Beneficiary</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
              />
              <SortableTableHead
                column="component"
                label={<Trans>Comp.</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
              />
              <SortableTableHead
                column="county"
                label={<Trans>County</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
              />
              <SortableTableHead
                column="value"
                label={<Trans>EU funding</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
                align="right"
              />
              <SortableTableHead
                column="techProgress"
                label={<Trans>Technical reported</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
              />
              <SortableTableHead
                column="finProgress"
                label={<Trans>Financial reported</Trans>}
                currentSortBy={currentSortBy}
                currentSortOrder={currentSortOrder}
                onSort={toggleSort}
              />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.rows.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                currency={currency}
                onSelect={(selected) => filterState.openProjectPanel(selected.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {page.rows.map((project) => (
          <PnrrProjectCard
              key={project.id}
            project={project}
            onClick={() => filterState.openProjectPanel(project.id)}
            currency={currency}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--pnrr-muted)]">
          <span>
            <Trans>{page.totalCount.toLocaleString('ro-RO')} projects</Trans>
          </span>
          <span>·</span>
          <span>
            {page.page} / {page.totalPages}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          {/* Mobile compact pagination */}
          <div
            className="flex items-center gap-1 sm:hidden"
            role="navigation"
            aria-label={t`Project pages`}
          >
            <button
              type="button"
              aria-label={t`Previous project page`}
              disabled={page.page <= 1}
              onClick={() => filterState.setPagination(page.page - 1, page.pageSize)}
              className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs tabular-nums text-[var(--pnrr-muted)]">
              {page.page} / {page.totalPages}
            </span>
            <button
              type="button"
              aria-label={t`Next project page`}
              disabled={page.page >= page.totalPages}
              onClick={() => filterState.setPagination(page.page + 1, page.pageSize)}
              className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Desktop pagination */}
          <div
            className="hidden items-center gap-1 sm:flex"
            role="navigation"
            aria-label={t`Project pages`}
          >
            <button
              type="button"
              aria-label={t`Previous project page`}
              disabled={page.page <= 1}
              onClick={() => filterState.setPagination(page.page - 1, page.pageSize)}
              className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronLeft className="h-4 w-4" />
              <Trans>Previous</Trans>
            </button>
            <div className="flex items-center gap-1">
              {getPaginationRange(page.page, page.totalPages).map((item, idx) => {
                if (item === 'ellipsis') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="shrink-0 px-1.5 text-xs text-[var(--pnrr-muted)]"
                    >
                      …
                    </span>
                  )
                }
                const isActive = item === page.page
                return (
                  <button
                    key={item}
                    type="button"
                    aria-label={t`Go to project page ${item}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`h-8 w-8 shrink-0 border-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] ${
                      isActive
                        ? 'border-[var(--pnrr-fg)] bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
                        : 'border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]'
                    }`}
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              aria-label={t`Next project page`}
              disabled={page.page >= page.totalPages}
              onClick={() => filterState.setPagination(page.page + 1, page.pageSize)}
              className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <Trans>Next</Trans>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <PnrrProjectDrawer
        project={selectedProject}
        onClose={filterState.closePanel}
      />
    </div>
  )
}

function PnrrProjectCard({
  project,
  onClick,
  currency,
}: {
  readonly project: PnrrWorkerProjectRow
  readonly onClick: () => void
  readonly currency: 'RON' | 'EUR' | 'USD'
}) {
  const comp = PNRR_COMPONENTS[project.componentCode]
  const projectValue = getProjectValue(project)
  const progressColor = comp?.color ?? 'var(--pnrr-fg)'

  return (
    <div
      className="cursor-pointer border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-bg)]"
      style={{ borderRadius: '6px' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={t`Open project details: ${project.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Title + anomaly */}
      <div className="flex items-start gap-2">
        {project.anomalies.length > 0 && (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-orange)]" />
        )}
        {project.anomalies.length === 0 &&
          project.dataQualitySignals.length > 0 && (
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-blue)]" />
          )}
        <p className="text-sm font-bold leading-snug line-clamp-2 text-[var(--pnrr-fg)]">
          {project.title}
        </p>
      </div>

      {/* Meta row: component, county, value */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {comp && (
          <span
            className="inline-flex h-7 min-w-[2.5rem] items-center justify-center border-2 px-1.5 text-[10px] font-black"
            style={{ borderColor: comp.color, color: comp.color }}
          >
            {project.componentCode}
            {getVariantCount(project, 'components') > 0 && (
              <span className="ml-1 opacity-80">
                +{getVariantCount(project, 'components')}
              </span>
            )}
          </span>
        )}
        <span className="text-xs text-[var(--pnrr-muted)]">
          <ValueWithVariants
            value={project.county}
            variantCount={getVariantCount(project, 'counties')}
          />
        </span>
        <span className="ml-auto text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
          {formatPnrrCurrency(projectValue, currency)}
        </span>
      </div>

      {/* Beneficiary */}
      <p className="mt-2 text-xs text-[var(--pnrr-muted)] line-clamp-1">
        {project.beneficiary}
      </p>

      {/* Progress */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-bold text-[var(--pnrr-fg)]">
            <Trans>Technical reported</Trans>
          </span>
          <CompactProgress
            progress={project.techProgress}
            color={progressColor}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-bold text-[var(--pnrr-fg)]">
            <Trans>Financial reported</Trans>
          </span>
          <CompactProgress
            progress={project.finProgress}
            color={progressColor}
          />
        </div>
      </div>
    </div>
  )
}

function getPaginationRange(
  current: number,
  total: number,
): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]

  if (current <= 4) {
    for (let i = 2; i <= 5; i++) {
      pages.push(i)
    }
    pages.push('ellipsis')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push('ellipsis')
    for (let i = total - 4; i <= total; i++) {
      pages.push(i)
    }
  } else {
    pages.push('ellipsis')
    for (let i = current - 1; i <= current + 1; i++) {
      pages.push(i)
    }
    pages.push('ellipsis')
    pages.push(total)
  }

  return pages
}
