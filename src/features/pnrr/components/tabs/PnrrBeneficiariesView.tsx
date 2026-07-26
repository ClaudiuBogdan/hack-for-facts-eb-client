import {
  useState,
  useEffect,
  useCallback,
  memo,
  type KeyboardEvent,
} from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency, formatPnrrPercentage } from '../../lib/formatting'
import {
  usePnrrBeneficiaryDetail,
} from '../../hooks/usePnrrData'
import type { PnrrBeneficiarySortBy } from '@/schemas/pnrr'
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
import type {
  PnrrWorkerBeneficiaryPage,
  PnrrWorkerBeneficiaryRow,
  PnrrWorkerProjectRow,
} from '../../workers/pnrr-worker-types'

const SEARCH_DEBOUNCE_MS = 300
const TOP_PROJECT_LIMIT = 5

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

type BeneficiaryRowProps = {
  readonly b: PnrrWorkerBeneficiaryRow
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onSelect: (beneficiary: PnrrWorkerBeneficiaryRow) => void
}

const BeneficiaryRow = memo(function BeneficiaryRow({
  b,
  currency,
  onSelect,
}: BeneficiaryRowProps) {
  const techAvg = b.techProgressAvg
  const finAvg = b.finProgressAvg
  const primaryComponentCode = b.primaryComponentCode
  const primaryComponent = PNRR_COMPONENTS[primaryComponentCode]
  const extraComponentCount = b.extraComponentCount

  return (
    <TableRow
      className="cursor-pointer border-b-2 border-[var(--pnrr-border)] transition-colors hover:bg-[var(--pnrr-bg)]"
      onClick={() => onSelect(b)}
      tabIndex={0}
      aria-label={t`Open beneficiary details: ${b.name}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(b)
        }
      }}
    >
      <TableCell className="max-w-[300px]">
        <div className="flex flex-col">
          <span className="truncate text-sm font-bold text-[var(--pnrr-fg)]">
            {b.name}
          </span>
          {b.cui && (
            <span className="text-xs text-[var(--pnrr-muted)]">{b.cui}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
        {b.count.toLocaleString('ro-RO')}
      </TableCell>
      <TableCell className="text-sm font-black tabular-nums text-[var(--pnrr-fg)]">
        <span
          className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded border px-1.5 text-xs font-bold"
          style={{
            borderColor: primaryComponent?.color ?? 'var(--pnrr-border)',
            color: primaryComponent?.color ?? 'var(--pnrr-fg)',
            backgroundColor: primaryComponent
              ? `${primaryComponent.color}14`
              : 'transparent',
          }}
        >
          {primaryComponentCode}
        </span>
        {extraComponentCount > 0 && (
          <span className="ml-2 text-xs text-[var(--pnrr-muted)]">
            +{extraComponentCount}
          </span>
        )}
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

function BeneficiaryCard({
  beneficiary,
  currency,
  onSelect,
}: {
  readonly beneficiary: PnrrWorkerBeneficiaryRow
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onSelect: (beneficiary: PnrrWorkerBeneficiaryRow) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(beneficiary)}
      className="w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <span className="block font-black text-[var(--pnrr-fg)]">
        {beneficiary.name}
      </span>
      {beneficiary.cui && (
        <span className="mt-1 block text-xs text-[var(--pnrr-muted)]">
          CUI {beneficiary.cui}
        </span>
      )}
      <span className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <span>
          <span className="block text-xs font-bold uppercase text-[var(--pnrr-muted)]">
            <Trans>Projects</Trans>
          </span>
          <span className="font-black text-[var(--pnrr-fg)]">
            {beneficiary.count.toLocaleString('ro-RO')}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-xs font-bold uppercase text-[var(--pnrr-muted)]">
            <Trans>Listed EU funding</Trans>
          </span>
          <span className="font-black text-[var(--pnrr-fg)]">
            {formatPnrrCurrency(beneficiary.value, currency)}
          </span>
        </span>
      </span>
      <span className="mt-3 block text-xs font-bold text-[var(--pnrr-muted)]">
        <Trans>Average reported technical progress</Trans>:{' '}
        {beneficiary.techProgressAvg === null
          ? t`No exact percentage`
          : `${formatNumber(beneficiary.techProgressAvg)}%`}
      </span>
    </button>
  )
}

export function PnrrBeneficiariesView({
  page,
  filterState,
}: {
  readonly page: PnrrWorkerBeneficiaryPage
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const [localSelectedBeneficiary, setLocalSelectedBeneficiary] =
    useState<PnrrWorkerBeneficiaryRow | null>(null)
  const currency = usePnrrCurrency()
  const sortKey = filterState.search.beneficiarySortBy ?? 'value'
  const sortOrder = filterState.search.beneficiarySortOrder ?? 'desc'
  const { setBeneficiaryPagination, setBeneficiarySorting } = filterState

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

  const urlSelectedBeneficiary = (() => {
    if (filterState.search.panel !== 'beneficiary') return null

    const selectedCui = filterState.search.panelBeneficiaryCui
    if (!selectedCui) return null

    return (
      page.rows.find(
        (beneficiary) => beneficiary.cui === selectedCui,
      ) ?? makeBeneficiaryPlaceholder(selectedCui)
    )
  })()
  const selectedBeneficiary =
    filterState.search.panel === 'beneficiary'
      ? urlSelectedBeneficiary
      : localSelectedBeneficiary

  const toggleSort = useCallback(
    (key: PnrrBeneficiarySortBy) => {
      if (sortKey === key) {
        setBeneficiarySorting(
          key,
          sortOrder === 'asc' ? 'desc' : 'asc',
        )
      } else {
        setBeneficiarySorting(key, 'desc')
      }
    },
    [setBeneficiarySorting, sortKey, sortOrder],
  )
  const handleSortKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLTableCellElement>,
      key: PnrrBeneficiarySortBy,
    ) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleSort(key)
      }
    },
    [toggleSort],
  )

  const goToPage = useCallback(
    (p: number) => setBeneficiaryPagination(p),
    [setBeneficiaryPagination],
  )
  const handleBeneficiarySelect = useCallback(
    (beneficiary: PnrrWorkerBeneficiaryRow) => {
      if (beneficiary.cui) {
        setLocalSelectedBeneficiary(null)
        filterState.openBeneficiaryPanel(beneficiary)
        return
      }

      filterState.closePanel()
      setLocalSelectedBeneficiary(beneficiary)
    },
    [filterState],
  )

  const handleDrawerClose = useCallback(() => {
    setLocalSelectedBeneficiary(null)
    filterState.closePanel()
  }, [filterState])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="h-10 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Beneficiaries</Trans>
          </h2>
          <span className="hidden text-sm text-[var(--pnrr-muted)] sm:inline">
            {page.totalCount.toLocaleString('ro-RO')}{' '}
            <Trans>beneficiaries</Trans>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)]"
        />
        <input
          type="text"
          autoComplete="off"
          aria-label={t`Beneficiary search`}
          placeholder={t`Search beneficiary...`}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
          }}
          className="h-12 w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-11 py-2 text-base font-bold text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        />

        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('')
              filterState.setBeneficiarySearch(undefined)
            }}
            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            aria-label={t`Clear search`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {page.totalCount === 0 ? (
        <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-8 text-center">
          <p className="font-black text-[var(--pnrr-fg)]">
            <Trans>No beneficiaries found</Trans>
          </p>
          <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
            <Trans>Change the search or active filters and try again.</Trans>
          </p>
        </div>
      ) : (
        <>
      <div
        className="hidden overflow-x-auto border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] md:block"
        style={{ borderRadius: '6px' }}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] hover:bg-[var(--pnrr-bg)]">
              <TableHead
                className="cursor-pointer text-sm font-black text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('beneficiary')}
                tabIndex={0}
                aria-sort={
                  sortKey === 'beneficiary'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                onKeyDown={(event) =>
                  handleSortKeyDown(event, 'beneficiary')
                }
              >
                <span className="inline-flex items-center">
                  <Trans>Beneficiary</Trans>
                  <SortIcon
                    active={sortKey === 'beneficiary'}
                    order={sortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="w-[100px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('count')}
                tabIndex={0}
                aria-sort={
                  sortKey === 'count'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                onKeyDown={(event) => handleSortKeyDown(event, 'count')}
              >
                <span className="inline-flex items-center justify-end">
                  <Trans>Projects</Trans>
                  <SortIcon active={sortKey === 'count'} order={sortOrder} />
                </span>
              </TableHead>
              <TableHead
                className="w-[100px] cursor-pointer text-sm font-black text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('component')}
                tabIndex={0}
                aria-sort={
                  sortKey === 'component'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                onKeyDown={(event) => handleSortKeyDown(event, 'component')}
              >
                <span className="inline-flex items-center">
                  <Trans>Comp.</Trans>
                  <SortIcon
                    active={sortKey === 'component'}
                    order={sortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="w-[140px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('value')}
                tabIndex={0}
                aria-sort={
                  sortKey === 'value'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                onKeyDown={(event) => handleSortKeyDown(event, 'value')}
              >
                <span className="inline-flex items-center justify-end">
                  <Trans>EU funding</Trans>
                  <SortIcon active={sortKey === 'value'} order={sortOrder} />
                </span>
              </TableHead>
              <TableHead
                className="w-[120px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('techProgress')}
                tabIndex={0}
                aria-sort={
                  sortKey === 'techProgress'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                onKeyDown={(event) =>
                  handleSortKeyDown(event, 'techProgress')
                }
              >
                <span className="inline-flex items-center justify-end">
                  <Trans>Reported technical progress</Trans>
                  <SortIcon
                    active={sortKey === 'techProgress'}
                    order={sortOrder}
                  />
                </span>
              </TableHead>
              <TableHead
                className="w-[120px] cursor-pointer text-right text-sm font-black text-[var(--pnrr-fg)]"
                onClick={() => toggleSort('finProgress')}
                tabIndex={0}
                aria-sort={
                  sortKey === 'finProgress'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                onKeyDown={(event) =>
                  handleSortKeyDown(event, 'finProgress')
                }
              >
                <span className="inline-flex items-center justify-end">
                  <Trans>Reported financial progress</Trans>
                  <SortIcon
                    active={sortKey === 'finProgress'}
                    order={sortOrder}
                  />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.rows.map((b) => (
              <BeneficiaryRow
                key={`${b.name}\u0000${b.cui ?? ''}`}
                b={b}
                currency={currency}
                onSelect={handleBeneficiarySelect}
              />
            ))}
          </TableBody>
        </Table>
      </div>
          <div className="space-y-3 md:hidden">
            {page.rows.map((beneficiary) => (
              <BeneficiaryCard
                key={`${beneficiary.name}\u0000${beneficiary.cui ?? ''}`}
                beneficiary={beneficiary}
                currency={currency}
                onSelect={handleBeneficiarySelect}
              />
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--pnrr-muted)]">
          {page.page} / {page.totalPages}
        </div>
        {/* Mobile compact pagination */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            disabled={page.page <= 1}
            onClick={() => goToPage(page.page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs tabular-nums text-[var(--pnrr-muted)]">
            {page.page} / {page.totalPages}
          </span>
          <button
            disabled={page.page >= page.totalPages}
            onClick={() => goToPage(page.page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Desktop pagination */}
        <div className="hidden items-center gap-1 sm:flex">
          <button
            disabled={page.page <= 1}
            onClick={() => goToPage(page.page - 1)}
            className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <ChevronLeft className="h-4 w-4" />
            <Trans>Previous</Trans>
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: page.totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === page.totalPages || Math.abs(p - page.page) <= 2,
              )
              .map((p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) {
                  return (
                    <span
                      key={`ellipsis-${p}`}
                      className="shrink-0 px-1.5 text-xs text-[var(--pnrr-muted)]"
                    >
                      …
                    </span>
                  )
                }
                const isActive = p === page.page
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
            disabled={page.page >= page.totalPages}
            onClick={() => goToPage(page.page + 1)}
            className="inline-flex h-8 items-center gap-1 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold text-[var(--pnrr-fg)] disabled:opacity-40 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <Trans>Next</Trans>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <BeneficiaryDrawer
        beneficiary={selectedBeneficiary}
        search={filterState.search}
        currency={currency}
        onClose={handleDrawerClose}
        onViewProjects={(beneficiary) => {
          filterState.showBeneficiaryProjects({
            name: beneficiary.name,
            cui: beneficiary.cui,
          })
        }}
      />
    </div>
  )
}

function makeBeneficiaryPlaceholder(cui: string): PnrrWorkerBeneficiaryRow {
  return {
    name: cui,
    cui,
    aliases: [],
    count: 0,
    value: 0,
    techProgressAvg: null,
    finProgressAvg: null,
    primaryComponentCode: '',
    extraComponentCount: 0,
  }
}

function BeneficiaryDrawer({
  beneficiary,
  search,
  currency,
  onClose,
  onViewProjects,
}: {
  readonly beneficiary: PnrrWorkerBeneficiaryRow | null
  readonly search: ReturnType<typeof usePnrrFilterState>['search']
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly onClose: () => void
  readonly onViewProjects: (beneficiary: PnrrWorkerBeneficiaryRow) => void
}) {
  const beneficiaryKey = beneficiary
    ? `${beneficiary.name}\u0000${beneficiary.cui ?? ''}`
    : null
  const {
    data: detailResult,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = usePnrrBeneficiaryDetail(
    beneficiaryKey,
    search,
    beneficiary?.cui ?? null,
  )
  if (!beneficiary) return null

  const detail = detailResult?.beneficiary
  const displayBeneficiary = detail ?? beneficiary
  const topProjects = (detail?.projects ?? [])
    .slice()
    .sort((a, b) => b.listedFundingRon - a.listedFundingRon)
    .slice(0, TOP_PROJECT_LIMIT)
  const techAvg = displayBeneficiary.techProgressAvg
  const finAvg = displayBeneficiary.finProgressAvg
  const riskCount = detail?.riskProjectCount ?? 0
  const dataQualityCount = detail?.dataQualityProjectCount ?? 0

  return (
    <Sheet open={!!beneficiary} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl">
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 pr-12 text-left">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-3 text-sm font-black text-[var(--pnrr-bg)]">
              <Building2 className="h-4 w-4" />
              <Trans>Beneficiary</Trans>
            </span>
            {displayBeneficiary.cui && (
              <span className="inline-flex h-9 items-center gap-2 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 text-sm font-black text-[var(--pnrr-fg)]">
                CUI {displayBeneficiary.cui}
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-[var(--pnrr-border)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
                  onClick={() =>
                    navigator.clipboard.writeText(displayBeneficiary.cui!)
                  }
                  aria-label={t`Copy CUI`}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <SheetTitle className="text-left text-2xl font-black leading-tight text-[var(--pnrr-fg)]">
            {displayBeneficiary.name}
          </SheetTitle>
          <SheetDescription className="text-left text-sm font-medium text-[var(--pnrr-muted)]">
            {isDetailLoading ? (
              <Trans>Loading the complete beneficiary workspace…</Trans>
            ) : (
              <>
                {displayBeneficiary.count.toLocaleString('ro-RO')}{' '}
                <Trans>PNRR projects</Trans>
              </>
            )}
            {displayBeneficiary.aliases.length > 0 && (
              <span className="mt-1 block">
                <Trans>Also published as:</Trans>{' '}
                {displayBeneficiary.aliases.join(' · ')}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-5">
          {isDetailError && (
            <div
              className="border-2 border-[var(--pnrr-orange)] bg-[var(--pnrr-card)] p-4 text-sm font-bold text-[var(--pnrr-fg)]"
              role="alert"
            >
              <Trans>
                The beneficiary detail could not be loaded. Summary values
                below may be incomplete.
              </Trans>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BeneficiaryMetric
              label={t`Listed EU funding`}
              value={
                isDetailLoading
                  ? '—'
                  : formatPnrrCurrency(
                      displayBeneficiary.value,
                      currency,
                      'standard',
                    )
              }
            />
            <BeneficiaryMetric
              label={t`Projects`}
              value={
                isDetailLoading
                  ? '—'
                  : displayBeneficiary.count.toLocaleString('ro-RO')
              }
            />
            <BeneficiaryMetric
              label={t`Average reported technical progress`}
              value={techAvg == null ? '—' : `${formatNumber(techAvg)}%`}
            />
            <BeneficiaryMetric
              label={t`Average reported financial progress`}
              value={finAvg == null ? '—' : `${formatNumber(finAvg)}%`}
            />
          </div>

          {(riskCount > 0 || dataQualityCount > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {riskCount > 0 && (
                <div className="flex items-center gap-3 border-2 border-[var(--pnrr-red)] bg-[var(--pnrr-red)]/10 p-3 text-[var(--pnrr-red)]">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-black uppercase tracking-wide">
                    {riskCount.toLocaleString('ro-RO')}{' '}
                    <Trans>with risk signals</Trans>
                  </span>
                </div>
              )}
              {dataQualityCount > 0 && (
                <div className="flex items-center gap-3 border-2 border-[var(--pnrr-blue)] bg-[var(--pnrr-blue)]/10 p-3 text-[var(--pnrr-blue)]">
                  <FileWarning className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-black uppercase tracking-wide">
                    {dataQualityCount.toLocaleString('ro-RO')}{' '}
                    <Trans>with data anomalies</Trans>
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            onClick={() => onViewProjects(displayBeneficiary)}
          >
            <ExternalLink className="h-4 w-4" />
            <Trans>View all filtered projects</Trans>
          </button>

          <PnrrEntityShortcutLinks cui={displayBeneficiary.cui} />

          <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
            <div className="border-b-2 border-[var(--pnrr-border)] p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
                <Trans>Top projects by value</Trans>
              </h3>
              <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                <Trans>Only the largest projects are shown.</Trans>
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

function BeneficiaryDrawerFooterClose({
  onClose,
}: {
  readonly onClose: () => void
}) {
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
  readonly project: PnrrWorkerProjectRow
  readonly currency: 'RON' | 'EUR' | 'USD'
}) {
  const component = PNRR_COMPONENTS[project.componentCode]
  const color = component?.color ?? 'var(--pnrr-blue)'
  const techValue =
    typeof project.techProgress === 'number' ? project.techProgress : null
  const techLabel =
    project.techProgress === 'under-30-reported'
      ? t`Under 30% (reported category)`
      : project.techProgress === 'in-implementation'
        ? t`In implementation (percentage not published)`
        : techValue === null
          ? t`N/A`
          : formatPnrrPercentage(techValue)

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
            {formatPnrrCurrency(project.listedFundingRon, currency)}
          </span>
          {techValue === null ? (
            <span
              className="max-w-48 text-right text-xs font-bold text-[var(--pnrr-muted)]"
              title={techLabel}
            >
              {techLabel}
            </span>
          ) : (
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
                {techLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
