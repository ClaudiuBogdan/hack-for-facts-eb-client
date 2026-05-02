import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
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
  Search,
  X,
  Building2,
  Copy,
  ExternalLink,
  FileWarning,
  ShieldAlert,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PnrrEntityShortcutLinks } from '../PnrrEntityShortcutLinks'

type SortKey = 'name' | 'count' | 'value' | 'techProgress' | 'finProgress'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
const TOP_PROJECT_LIMIT = 5

type BeneficiarySummary = {
  readonly name: string
  readonly cui: string | null
  count: number
  value: number
  techProgressSum: number
  techProgressCount: number
  finProgressSum: number
  finProgressCount: number
  readonly projects: PnrrProject[]
}

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

function getBeneficiaryKey(project: PnrrProject): string {
  return `${project.beneficiary}\u0000${project.cui ?? ''}`
}

type BeneficiaryRowProps = {
  readonly b: BeneficiarySummary
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onSelect: (beneficiary: BeneficiarySummary) => void
}

const BeneficiaryRow = memo(function BeneficiaryRow({ b, currency, onSelect }: BeneficiaryRowProps) {
  const techAvg = b.techProgressCount > 0 ? b.techProgressSum / b.techProgressCount : null
  const finAvg = b.finProgressCount > 0 ? b.finProgressSum / b.finProgressCount : null

  return (
    <TableRow
      className="cursor-pointer border-b-2 border-[var(--pnrr-border)] transition-colors hover:bg-[var(--pnrr-bg)]"
      onClick={() => onSelect(b)}
    >
      <TableCell className="max-w-[300px]">
        <div className="flex flex-col">
          <span className="truncate text-sm font-bold text-[var(--pnrr-fg)]">{b.name}</span>
          {b.cui && (
            <span className="text-xs text-[var(--pnrr-muted)]">{b.cui}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
        {b.count.toLocaleString('ro-RO')}
      </TableCell>
      <TableCell className="text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
        {formatPnrrCurrency(b.value, currency)}
      </TableCell>
      <TableCell className="text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
        {techAvg !== null ? `${formatNumber(techAvg)}%` : '—'}
      </TableCell>
      <TableCell className="text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
        {finAvg !== null ? `${formatNumber(finAvg)}%` : '—'}
      </TableCell>
    </TableRow>
  )
}) 

export function PnrrBeneficiariesView({
  projects,
  filterState,
}: {
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiarySummary | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const currency = usePnrrCurrency()

  const globalSearch = filterState.search.beneficiarySearch ?? ''
  const [inputValue, setInputValue] = useState(globalSearch)

  // Sync input with global state when changed externally (e.g. clear filters)
  useEffect(() => {
    setInputValue(globalSearch)
  }, [globalSearch])

  // Debounce global state update so typing stays responsive
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue !== globalSearch) {
        filterState.setBeneficiarySearch(inputValue || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [inputValue, globalSearch, filterState])

  const beneficiaries = useMemo(() => {
    const map = new Map<string, BeneficiarySummary>()

    for (const p of projects) {
      const beneficiaryKey = getBeneficiaryKey(p)
      const techProgress = getProgressValue(p.techProgress)
      const finProgress = getProgressValue(p.finProgress)
      const existing = map.get(beneficiaryKey)
      if (existing) {
        existing.count++
        existing.value += p.valueEur
        if (techProgress !== null) {
          existing.techProgressSum += techProgress
          existing.techProgressCount++
        }
        if (finProgress !== null) {
          existing.finProgressSum += finProgress
          existing.finProgressCount++
        }
        existing.projects.push(p)
      } else {
        map.set(beneficiaryKey, {
          name: p.beneficiary,
          cui: p.cui,
          count: 1,
          value: p.valueEur,
          techProgressSum: techProgress ?? 0,
          techProgressCount: techProgress === null ? 0 : 1,
          finProgressSum: finProgress ?? 0,
          finProgressCount: finProgress === null ? 0 : 1,
          projects: [p],
        })
      }
    }

    return Array.from(map.values())
  }, [projects])

  const sorted = useMemo(() => {
    const arr = [...beneficiaries]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'count':
          cmp = a.count - b.count
          break
        case 'value':
          cmp = a.value - b.value
          break
        case 'techProgress': {
          const av = a.techProgressCount > 0 ? a.techProgressSum / a.techProgressCount : -1
          const bv = b.techProgressCount > 0 ? b.techProgressSum / b.techProgressCount : -1
          cmp = av - bv
          break
        }
        case 'finProgress': {
          const av = a.finProgressCount > 0 ? a.finProgressSum / a.finProgressCount : -1
          const bv = b.finProgressCount > 0 ? b.finProgressSum / b.finProgressCount : -1
          cmp = av - bv
          break
        }
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return arr
  }, [beneficiaries, sortKey, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
    setPage(1)
  }, [sortKey])

  const goToPage = useCallback((p: number) => setPage(p), [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="h-10 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Beneficiari</Trans>
          </h2>
          <span className="hidden text-sm text-[var(--pnrr-muted)] sm:inline">
            {beneficiaries.length.toLocaleString('ro-RO')} <Trans>beneficiari</Trans>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
        <input
          type="text"
          placeholder={t`Caută beneficiar...`}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setPage(1)
          }}
          className="h-10 w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-9 py-2 text-sm text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              filterState.setBeneficiarySearch(undefined)
              setPage(1)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)]"
            aria-label={t`Clear search`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]" style={{ borderRadius: '6px' }}>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] hover:bg-[var(--pnrr-bg)]">
              <TableHead className="cursor-pointer text-sm font-black text-[var(--pnrr-fg)]" onClick={() => toggleSort('name')}>
                <span className="inline-flex items-center">
                  <Trans>Beneficiar</Trans>
                  <SortIcon active={sortKey === 'name'} order={sortOrder} />
                </span>
              </TableHead>
              <TableHead className="w-[100px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]" onClick={() => toggleSort('count')}>
                <span className="inline-flex items-center justify-end">
                  <Trans>Proiecte</Trans>
                  <SortIcon active={sortKey === 'count'} order={sortOrder} />
                </span>
              </TableHead>
              <TableHead className="w-[140px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]" onClick={() => toggleSort('value')}>
                <span className="inline-flex items-center justify-end">
                  <Trans>Valoare</Trans>
                  <SortIcon active={sortKey === 'value'} order={sortOrder} />
                </span>
              </TableHead>
              <TableHead className="w-[120px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]" onClick={() => toggleSort('techProgress')}>
                <span className="inline-flex items-center justify-end">
                  <Trans>Progr. Tehnic</Trans>
                  <SortIcon active={sortKey === 'techProgress'} order={sortOrder} />
                </span>
              </TableHead>
              <TableHead className="w-[120px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]" onClick={() => toggleSort('finProgress')}>
                <span className="inline-flex items-center justify-end">
                  <Trans>Progr. Financiar</Trans>
                  <SortIcon active={sortKey === 'finProgress'} order={sortOrder} />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((b) => (
              <BeneficiaryRow
                key={`${b.name}\u0000${b.cui ?? ''}`}
                b={b}
                currency={currency}
                onSelect={setSelectedBeneficiary}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--pnrr-muted)]">
          <Trans>pagina {page} din {totalPages}</Trans>
        </div>
        {/* Mobile compact pagination */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs tabular-nums text-[var(--pnrr-muted)]">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Desktop pagination */}
        <div className="hidden items-center gap-1 sm:flex">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <ChevronLeft className="h-4 w-4" />
            <Trans>Anterior</Trans>
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) {
                  return (
                    <span key={`ellipsis-${p}`} className="shrink-0 px-1.5 text-xs text-[var(--pnrr-muted)]">
                      …
                    </span>
                  )
                }
                const isActive = p === page
                return (
                  <button
                    key={p}
                    className={`h-8 w-8 shrink-0 border-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] ${
                      isActive
                        ? 'border-[var(--pnrr-fg)] bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
                        : 'border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]'
                    }`}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                )
              })}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <Trans>Următor</Trans>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <BeneficiaryDrawer
        beneficiary={selectedBeneficiary}
        currency={currency}
        onClose={() => setSelectedBeneficiary(null)}
        onViewProjects={(beneficiary) => {
          setSelectedBeneficiary(null)
          filterState.showBeneficiaryProjects({ name: beneficiary.name, cui: beneficiary.cui })
        }}
      />
    </div>
  )
}

function BeneficiaryDrawer({
  beneficiary,
  currency,
  onClose,
  onViewProjects,
}: {
  readonly beneficiary: BeneficiarySummary | null
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onClose: () => void
  readonly onViewProjects: (beneficiary: BeneficiarySummary) => void
}) {
  if (!beneficiary) return null

  const topProjects = [...beneficiary.projects]
    .sort((a, b) => b.valueEur - a.valueEur)
    .slice(0, TOP_PROJECT_LIMIT)
  const techAvg =
    beneficiary.techProgressCount > 0
      ? beneficiary.techProgressSum / beneficiary.techProgressCount
      : null
  const finAvg =
    beneficiary.finProgressCount > 0
      ? beneficiary.finProgressSum / beneficiary.finProgressCount
      : null
  const riskCount = beneficiary.projects.filter((project) => project.anomalies.length > 0).length
  const dataQualityCount = beneficiary.projects.filter(
    (project) => project.dataQualitySignals.length > 0
  ).length

  return (
    <Sheet open={!!beneficiary} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl">
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 pr-12 text-left">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-3 text-sm font-black text-[var(--pnrr-bg)]">
              <Building2 className="h-4 w-4" />
              <Trans>Beneficiar</Trans>
            </span>
            {beneficiary.cui && (
              <span className="inline-flex h-9 items-center gap-2 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 text-sm font-black text-[var(--pnrr-fg)]">
                CUI {beneficiary.cui}
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-[var(--pnrr-border)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
                  onClick={() => navigator.clipboard.writeText(beneficiary.cui!)}
                  aria-label={t`Copiază CUI`}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <SheetTitle className="text-left text-2xl font-black leading-tight text-[var(--pnrr-fg)]">
            {beneficiary.name}
          </SheetTitle>
          <SheetDescription className="text-left text-sm font-medium text-[var(--pnrr-muted)]">
            {beneficiary.count.toLocaleString('ro-RO')} <Trans>proiecte PNRR</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BeneficiaryMetric label={t`Valoare totală`} value={formatPnrrCurrency(beneficiary.value, currency, 'standard')} />
            <BeneficiaryMetric label={t`Proiecte`} value={beneficiary.count.toLocaleString('ro-RO')} />
            <BeneficiaryMetric label={t`Progres tehnic mediu`} value={techAvg == null ? '—' : `${formatNumber(techAvg)}%`} />
            <BeneficiaryMetric label={t`Progres financiar mediu`} value={finAvg == null ? '—' : `${formatNumber(finAvg)}%`} />
          </div>

          {(riskCount > 0 || dataQualityCount > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {riskCount > 0 && (
                <div className="flex items-center gap-3 border-2 border-[var(--pnrr-red)] bg-[var(--pnrr-red)]/10 p-3 text-[var(--pnrr-red)]">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-black uppercase tracking-wide">
                    {riskCount.toLocaleString('ro-RO')} <Trans>cu riscuri</Trans>
                  </span>
                </div>
              )}
              {dataQualityCount > 0 && (
                <div className="flex items-center gap-3 border-2 border-[var(--pnrr-blue)] bg-[var(--pnrr-blue)]/10 p-3 text-[var(--pnrr-blue)]">
                  <FileWarning className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-black uppercase tracking-wide">
                    {dataQualityCount.toLocaleString('ro-RO')} <Trans>cu probleme de date</Trans>
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            onClick={() => onViewProjects(beneficiary)}
          >
            <ExternalLink className="h-4 w-4" />
            <Trans>Vezi toate proiectele filtrate</Trans>
          </button>

          <PnrrEntityShortcutLinks cui={beneficiary.cui} />

          <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
            <div className="border-b-2 border-[var(--pnrr-border)] p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                <Trans>Top proiecte după valoare</Trans>
              </h3>
              <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                <Trans>Sunt afișate doar cele mai mari proiecte.</Trans>
              </p>
            </div>
            <div className="divide-y divide-[var(--pnrr-border)]">
              {topProjects.map((project, index) => (
                <TopProjectItem
                  key={project.id}
                  index={index + 1}
                  project={project}
                  currency={currency}
                />
              ))}
            </div>
          </section>
        </div>
        <BeneficiaryDrawerFooterClose onClose={onClose} />
      </SheetContent>
    </Sheet>
  )
}

function BeneficiaryDrawerFooterClose({ onClose }: { readonly onClose: () => void }) {
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

function BeneficiaryMetric({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
      <div className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </div>
      <div className="break-words text-xl font-black leading-tight text-[var(--pnrr-fg)]">
        {value}
      </div>
    </div>
  )
}

function TopProjectItem({
  index,
  project,
  currency,
}: {
  readonly index: number
  readonly project: PnrrProject
  readonly currency: 'RON' | 'EUR' | 'USD'
}) {
  const component = PNRR_COMPONENTS[project.componentCode]
  const color = component?.color ?? 'var(--pnrr-blue)'
  const techValue =
    project.techProgress === 'in-implementation' ? 15 : project.techProgress ?? 0

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 p-4">
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
            style={{
              borderColor: color,
              color,
              backgroundColor: `${color}14`,
            }}
          >
            {project.componentCode}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
            {formatPnrrCurrency(project.valueEur, currency)}
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
            <span className="w-10 text-right text-xs tabular-nums text-[var(--pnrr-fg)]">
              {project.techProgress === 'in-implementation' ? '<30%' : `${techValue}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
