import { useMemo, useState, useCallback, useEffect, memo } from 'react'
import { Trans } from '@lingui/react/macro'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
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

function SortIcon({ active, order }: { readonly active: boolean; readonly order: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-[var(--pnrr-muted)]" />
  return order === 'asc' ? (
    <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-[var(--pnrr-fg)]" />
  ) : (
    <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-[var(--pnrr-fg)]" />
  )
}

function getProgressValue(progress: PnrrProject['techProgress'] | PnrrProject['finProgress']): number | null {
  if (typeof progress === 'number') return progress
  if (progress === 'in-implementation') return 15
  return null
}

type ProjectRowProps = {
  readonly project: PnrrProject
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onSelect: (project: PnrrProject) => void
}

const ProjectRow = memo(function ProjectRow({ project, currency, onSelect }: ProjectRowProps) {
  const comp = PNRR_COMPONENTS[project.componentCode]
  const techVal = getProgressValue(project.techProgress) ?? 0
  const finVal = getProgressValue(project.finProgress) ?? 0

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
          {project.anomalies.length === 0 && project.dataQualitySignals.length > 0 && (
            <FileWarning className="h-4 w-4 shrink-0 text-[var(--pnrr-blue)]" />
          )}
          <span className="truncate text-sm text-[var(--pnrr-fg)]" title={project.title}>
            {project.title}
          </span>
        </div>
      </TableCell>
      <TableCell className="max-w-[280px] py-3">
        <div className="flex flex-col">
          <span className="truncate text-sm font-medium uppercase leading-tight text-[var(--pnrr-fg)]" title={project.beneficiary}>
            {project.beneficiary}
          </span>
          {project.cui && (
            <span className="text-xs text-[var(--pnrr-muted)]">{project.cui}</span>
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
          </span>
        )}
      </TableCell>
      <TableCell className="py-3 text-sm text-[var(--pnrr-fg)]">{project.county}</TableCell>
      <TableCell className="py-3 text-right text-sm tabular-nums text-[var(--pnrr-fg)]">
        {formatPnrrCurrency(project.valueEur, currency)}
      </TableCell>
      <TableCell className="py-3">
        <div className="flex w-32 items-center gap-2">
          <div
            className="h-2 flex-1 rounded-full"
            style={{ backgroundColor: comp ? `${comp.color}26` : '#c7d3e8' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(techVal, 100)}%`,
                backgroundColor: comp?.color ?? 'var(--pnrr-blue)',
              }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
            {project.techProgress === 'in-implementation' ? '<30%' : `${techVal}%`}
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
                style={{ backgroundColor: comp ? `${comp.color}26` : '#c7d3e8' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(finVal, 100)}%`,
                    backgroundColor: comp?.color ?? 'var(--pnrr-blue)',
                  }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
                {project.finProgress === 'in-implementation' ? '<30%' : `${finVal}%`}
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
  projects,
  filterState,
}: {
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const [selectedProject, setSelectedProject] = useState<PnrrProject | null>(null)
  const currency = usePnrrCurrency()

  const sorted = useMemo(() => {
    const arr = [...projects]
    const sortBy = filterState.search.sortBy ?? 'value'
    const sortOrder = filterState.search.sortOrder ?? 'desc'

    arr.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'value':
          cmp = a.valueEur - b.valueEur
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'techProgress': {
          const av = getProgressValue(a.techProgress) ?? -1
          const bv = getProgressValue(b.techProgress) ?? -1
          cmp = av - bv
          break
        }
        case 'finProgress': {
          const av = getProgressValue(a.finProgress) ?? -1
          const bv = getProgressValue(b.finProgress) ?? -1
          cmp = av - bv
          break
        }
        case 'county':
          cmp = a.county.localeCompare(b.county)
          break
        case 'beneficiary':
          cmp = a.beneficiary.localeCompare(b.beneficiary)
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return arr
  }, [projects, filterState.search.sortBy, filterState.search.sortOrder])

  const { setSorting, setPagination } = filterState
  const requestedPage = filterState.search.page ?? 1
  const pageSize = filterState.search.pageSize ?? 25
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const start = (page - 1) * pageSize
  const paginated = sorted.slice(start, start + pageSize)

  useEffect(() => {
    if (requestedPage !== page) {
      setPagination(page, pageSize)
    }
  }, [page, pageSize, requestedPage, setPagination])

  const currentSortBy = filterState.search.sortBy
  const currentSortOrder = filterState.search.sortOrder

  const toggleSort = useCallback((column: PnrrSearchState['sortBy']) => {
    if (currentSortBy === column) {
      setSorting(column, currentSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSorting(column, 'desc')
    }
  }, [currentSortBy, currentSortOrder, setSorting])

  const goToPage = useCallback((p: number) => setPagination(p), [setPagination])

  if (projects.length === 0) {
    return (
      <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-8" style={{ borderRadius: '6px' }}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
            <AlertTriangle className="h-8 w-8 text-[var(--pnrr-muted)]" />
          </div>
          <p className="mt-4 text-lg font-black text-[var(--pnrr-fg)]">
            <Trans>Niciun proiect găsit</Trans>
          </p>
          <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
            <Trans>Încearcă să modifici filtrele sau să cauți altceva.</Trans>
          </p>
          <button
            onClick={filterState.clearFilters}
            className="mt-4 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <Trans>Șterge toate filtrele</Trans>
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
              <TableHead className="w-[360px] cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]" onClick={() => toggleSort('title')}>
                <span className="flex items-center">
                  <Trans>Titlu Proiect</Trans>
                  <SortIcon active={filterState.search.sortBy === 'title'} order={filterState.search.sortOrder ?? 'desc'} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]" onClick={() => toggleSort('beneficiary')}>
                <span className="flex items-center">
                  <Trans>Beneficiar</Trans>
                  <SortIcon active={filterState.search.sortBy === 'beneficiary'} order={filterState.search.sortOrder ?? 'desc'} />
                </span>
              </TableHead>
              <TableHead className="text-sm font-black uppercase text-[var(--pnrr-fg)]">
                <Trans>Comp.</Trans>
              </TableHead>
              <TableHead className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]" onClick={() => toggleSort('county')}>
                <span className="flex items-center">
                  <Trans>Județ</Trans>
                  <SortIcon active={filterState.search.sortBy === 'county'} order={filterState.search.sortOrder ?? 'desc'} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer text-right text-sm font-black uppercase text-[var(--pnrr-fg)]" onClick={() => toggleSort('value')}>
                <span className="flex items-center justify-end">
                  <Trans>Valoare</Trans>
                  <SortIcon active={filterState.search.sortBy === 'value'} order={filterState.search.sortOrder ?? 'desc'} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]" onClick={() => toggleSort('techProgress')}>
                <span className="flex items-center">
                  <Trans>Tehnic</Trans>
                  <SortIcon active={filterState.search.sortBy === 'techProgress'} order={filterState.search.sortOrder ?? 'desc'} />
                </span>
              </TableHead>
              <TableHead className="cursor-pointer text-sm font-black uppercase text-[var(--pnrr-fg)]" onClick={() => toggleSort('finProgress')}>
                <span className="flex items-center">
                  <Trans>Financiar</Trans>
                  <SortIcon active={filterState.search.sortBy === 'finProgress'} order={filterState.search.sortOrder ?? 'desc'} />
                </span>
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                currency={currency}
                onSelect={setSelectedProject}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {paginated.map((project) => (
          <PnrrProjectCard
            key={project.id}
            project={project}
            onClick={() => setSelectedProject(project)}
            currency={currency}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--pnrr-muted)]">
          <span>
            <Trans>{sorted.length.toLocaleString('ro-RO')} proiecte</Trans>
          </span>
          <span>·</span>
          <span>
            <Trans>pagina {page} din {totalPages}</Trans>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          {/* Mobile compact pagination */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              disabled={page <= 1}
              onClick={() => filterState.setPagination(page - 1)}
              className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs tabular-nums text-[var(--pnrr-muted)]">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => filterState.setPagination(page + 1)}
              className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Desktop pagination */}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              disabled={page <= 1}
              onClick={() => filterState.setPagination(page - 1)}
              className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <ChevronLeft className="h-4 w-4" />
              <Trans>Anterior</Trans>
            </button>
            <div className="flex items-center gap-1">
              {getPaginationRange(page, totalPages).map((item, idx) => {
                if (item === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${idx}`} className="shrink-0 px-1.5 text-xs text-[var(--pnrr-muted)]">
                      …
                    </span>
                  )
                }
                const isActive = item === page
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
              disabled={page >= totalPages}
              onClick={() => filterState.setPagination(page + 1)}
              className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <Trans>Următor</Trans>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <PnrrProjectDrawer
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  )
}

function PnrrProjectCard({
  project,
  onClick,
  currency,
}: {
  readonly project: PnrrProject
  readonly onClick: () => void
  readonly currency: 'RON' | 'EUR' | 'USD'
}) {
  const comp = PNRR_COMPONENTS[project.componentCode]
  const techVal = getProgressValue(project.techProgress) ?? 0
  const finVal = getProgressValue(project.finProgress) ?? 0

  return (
    <div
      className="cursor-pointer border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-bg)]"
      style={{ borderRadius: '6px' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      {/* Title + anomaly */}
      <div className="flex items-start gap-2">
        {project.anomalies.length > 0 && (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-orange)]" />
        )}
        {project.anomalies.length === 0 && project.dataQualitySignals.length > 0 && (
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-blue)]" />
        )}
        <p className="text-sm font-bold leading-snug line-clamp-2 text-[var(--pnrr-fg)]">{project.title}</p>
      </div>

      {/* Meta row: component, county, value */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {comp && (
          <span
            className="inline-flex h-7 min-w-[2.5rem] items-center justify-center border-2 px-1.5 text-[10px] font-black"
            style={{ borderColor: comp.color, color: comp.color }}
          >
            {project.componentCode}
          </span>
        )}
        <span className="text-xs text-[var(--pnrr-muted)]">{project.county}</span>
        <span className="ml-auto text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
          {formatPnrrCurrency(project.valueEur, currency)}
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
            <Trans>Tehnic</Trans>
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-2 border border-[var(--pnrr-border)] bg-transparent">
              <div
                className="h-full"
                style={{ width: `${Math.min(techVal, 100)}%`, backgroundColor: comp?.color ?? 'var(--pnrr-fg)' }}
              />
            </div>
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
            {project.techProgress === 'in-implementation' ? '<30%' : `${techVal}%`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-bold text-[var(--pnrr-fg)]">
            <Trans>Financiar</Trans>
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
                    style={{ width: `${Math.min(finVal, 100)}%`, backgroundColor: comp?.color ?? 'var(--pnrr-fg)' }}
                  />
                </div>
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
                {project.finProgress === 'in-implementation' ? '<30%' : `${finVal}%`}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getPaginationRange(current: number, total: number): Array<number | 'ellipsis'> {
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
