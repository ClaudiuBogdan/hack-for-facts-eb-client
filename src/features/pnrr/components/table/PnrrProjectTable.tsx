import { useCallback, useEffect, memo } from 'react'
import { Trans } from '@lingui/react/macro'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency, formatPnrrPercentage } from '../../lib/formatting'
import type { PnrrProject, PnrrSearchState } from '@/schemas/pnrr'
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

function getProgressValue(
  progress: PnrrProject['techProgress'] | PnrrProject['finProgress'],
): number | null {
  if (typeof progress === 'number') return progress
  if (progress === 'in-implementation') return 15
  return null
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
  const techVal = getProgressValue(project.techProgress) ?? 0
  const finVal = getProgressValue(project.finProgress) ?? 0
  const projectValue = getProjectValue(project)

  return (
    <TableRow
      className="cursor-pointer border-b border-[var(--pnrr-border)] transition-colors hover:bg-[var(--pnrr-bg)]"
      onClick={() => onSelect(project)}
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
        <div className="flex w-32 items-center gap-2">
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              backgroundColor: comp ? `${comp.color}26` : 'var(--pnrr-track)',
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(techVal, 100)}%`,
                backgroundColor: comp?.color ?? 'var(--pnrr-blue)',
              }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
            {project.techProgress === 'in-implementation'
              ? '<30%'
              : formatPnrrPercentage(techVal)}
            {getVariantCount(project, 'techProgress') > 0 &&
              ` +${getVariantCount(project, 'techProgress')}`}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex w-32 items-center gap-2">
          {project.finProgress == null ? (
            <span className="inline-flex h-7 items-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-2 text-[10px] font-bold text-[var(--pnrr-muted)]">
              <Trans>N/A</Trans>
            </span>
          ) : (
            <>
              <div
                className="h-2 flex-1 rounded-full"
                style={{
                  backgroundColor: comp
                    ? `${comp.color}26`
                    : 'var(--pnrr-track)',
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(finVal, 100)}%`,
                    backgroundColor: comp?.color ?? 'var(--pnrr-blue)',
                  }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
                {project.finProgress === 'in-implementation'
                  ? '<30%'
                  : formatPnrrPercentage(finVal)}
                {getVariantCount(project, 'finProgress') > 0 &&
                  ` +${getVariantCount(project, 'finProgress')}`}
              </span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="w-12 py-3 text-right">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
          aria-label="Detalii proiect"
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
  const { data: selectedProjectResult } = usePnrrProjectDetail(selectedProjectId)
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
            <Trans>No projects found</Trans>
          </p>
          <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
            <Trans>
              Try changing the filters or searching for something else.
            </Trans>
          </p>
          <button
            onClick={filterState.clearFilters}
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
      {/* Desktop table */}
      <div className="hidden overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] hover:bg-[var(--pnrr-card)]">
              <TableHead
                className="w-[360px] cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('title')}
              >
                <span className="flex items-center">
                  <Trans>Project Title</Trans>
                  <SortIcon
                    active={currentSortBy === 'title'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('beneficiary')}
              >
                <span className="flex items-center">
                  <Trans>Beneficiary</Trans>
                  <SortIcon
                    active={currentSortBy === 'beneficiary'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('component')}
              >
                <span className="flex items-center">
                  <Trans>Comp.</Trans>
                  <SortIcon
                    active={currentSortBy === 'component'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('county')}
              >
                <span className="flex items-center">
                  <Trans>County</Trans>
                  <SortIcon
                    active={currentSortBy === 'county'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('value')}
              >
                <span className="flex items-center justify-end">
                  <Trans>Value</Trans>
                  <SortIcon
                    active={currentSortBy === 'value'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('techProgress')}
              >
                <span className="flex items-center">
                  <Trans>Technical reported</Trans>
                  <SortIcon
                    active={currentSortBy === 'techProgress'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('finProgress')}
              >
                <span className="flex items-center">
                  <Trans>Financial reported</Trans>
                  <SortIcon
                    active={currentSortBy === 'finProgress'}
                    order={currentSortOrder}
                  />
                </span>
              </TableHead>
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
          <div className="flex items-center gap-1 sm:hidden">
            <button
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
              disabled={page.page >= page.totalPages}
              onClick={() => filterState.setPagination(page.page + 1, page.pageSize)}
              className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Desktop pagination */}
          <div className="hidden items-center gap-1 sm:flex">
            <button
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
  const techVal = getProgressValue(project.techProgress) ?? 0
  const finVal = getProgressValue(project.finProgress) ?? 0
  const projectValue = getProjectValue(project)

  return (
    <div
      className="cursor-pointer border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-bg)]"
      style={{ borderRadius: '6px' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
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
            <span className="w-14 shrink-0 text-xs font-bold text-[var(--pnrr-fg)]">
              <Trans>Technical reported</Trans>
            </span>
          <div className="min-w-0 flex-1">
            <div className="h-2 border border-[var(--pnrr-border)] bg-transparent">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(techVal, 100)}%`,
                  backgroundColor: comp?.color ?? 'var(--pnrr-fg)',
                }}
              />
            </div>
          </div>
          <span className="w-16 shrink-0 text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
            {project.techProgress === 'in-implementation'
              ? '<30%'
              : formatPnrrPercentage(techVal)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-bold text-[var(--pnrr-fg)]">
            <Trans>Financial reported</Trans>
          </span>
          {project.finProgress == null ? (
            <span className="inline-flex h-7 items-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-2 text-[10px] font-bold text-[var(--pnrr-muted)]">
              <Trans>N/A</Trans>
            </span>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <div className="h-2 border border-[var(--pnrr-border)] bg-transparent">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(finVal, 100)}%`,
                      backgroundColor: comp?.color ?? 'var(--pnrr-fg)',
                    }}
                  />
                </div>
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
                {project.finProgress === 'in-implementation'
                  ? '<30%'
                  : formatPnrrPercentage(finVal)}
              </span>
            </>
          )}
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
