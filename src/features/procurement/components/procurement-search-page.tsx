import { useNavigate } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useEffect, useState } from 'react'
import { Download, Filter, Search, TriangleAlert } from 'lucide-react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  CoverageRibbonFromGate,
  MockDataStatusBadge,
  RequestDatasetAction,
  ShareFilteredView,
} from '@/components/shared/procurement-data'
import { GrainSelector } from './grain-selector'
import { grainLabel } from '../lib/grain-labels'
import { ProcurementRecordCard } from './procurement-record-card'
import {
  buildProcurementSearchCsv,
  buildProcurementSearchFilename,
  downloadProcurementCsv,
} from '../lib/export'
import {
  PROCUREMENT_SEARCH_DEFAULTS,
  type ProcurementSearchState,
  type ProcurementSource,
  type ProcurementSort,
} from '@/schemas/procurement-search'
import { useProcurementSearch } from '../hooks/use-procurement-data'
import { useCapabilityGate } from '@/components/shared/procurement-data'
import type { ProcurementGrain, ProcurementStatus } from '@/schemas/procurement'

type Props = {
  readonly params: ProcurementSearchState
  readonly className?: string
}

const SORT_VALUES: ReadonlyArray<{ readonly value: ProcurementSort; readonly label: string }> = [
  { value: 'date_desc', label: t`Dată (recente)` },
  { value: 'date_asc', label: t`Dată (vechi)` },
  { value: 'value_desc', label: t`Valoare (mare)` },
  { value: 'value_asc', label: t`Valoare (mică)` },
]

const SOURCE_VALUES: ReadonlyArray<{ readonly value: ProcurementSource | 'all'; readonly label: string }> = [
  { value: 'all', label: t`Toate sursele` },
  { value: 'elicitatie', label: t`e-licitatie` },
  { value: 'seap', label: t`SEAP` },
]

const STATUS_VALUES: ReadonlyArray<{ readonly value: ProcurementStatus | 'all'; readonly label: string }> = [
  { value: 'all', label: t`Toate stadiile` },
  { value: 'published', label: t`Publicat` },
  { value: 'in_evaluation', label: t`În evaluare` },
  { value: 'awarded', label: t`Atribuit` },
  { value: 'in_progress', label: t`În derulare` },
  { value: 'closed', label: t`Închis` },
  { value: 'cancelled', label: t`Anulat` },
  { value: 'suspended', label: t`Suspendat` },
  { value: 'finalized', label: t`Finalizat` },
  { value: 'offered', label: t`Ofertat` },
  { value: 'unknown', label: t`Nedeterminat` },
]

type FilterDraft = {
  readonly authority_cui: string
  readonly supplier_cui: string
  readonly cpv: string
  readonly year: string
  readonly valueMin: string
  readonly valueMax: string
  readonly source: ProcurementSource | 'all'
  readonly status: ProcurementStatus | 'all'
}

function filterDraftFromParams(params: ProcurementSearchState): FilterDraft {
  return {
    authority_cui: params.authority_cui ?? '',
    supplier_cui: params.supplier_cui ?? '',
    cpv: params.cpv ?? params.cpv_division ?? '',
    year: params.year?.toString() ?? '',
    valueMin: params.valueMin?.toString() ?? '',
    valueMax: params.valueMax?.toString() ?? '',
    source: params.source ?? 'all',
    status: params.status?.[0] ?? 'all',
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function ProcurementSearchPage({ params, className }: Props) {
  const navigate = useNavigate({ from: '/procurement/search' })
  const { data, isLoading, error, isFetching } = useProcurementSearch(params)
  const [queryDraft, setQueryDraft] = useState(params.q ?? '')

  useEffect(() => {
    setQueryDraft(params.q ?? '')
  }, [params.q])

  const gate = data?.gate
  const capability = useCapabilityGate(
    gate ?? {
      sourceGrain:
        params.grain === 'direct_acquisitions'
          ? 'direct_acquisition'
          : 'procurement_contract',
      rowsCount: '0',
      authorityCuiCoverageRate: '0',
      supplierCuiCoverageRate: '0',
      amountCoverageRate: '0',
      cpvCoverageRate: '0',
      dateCoverageRate: '0',
      filterAnswersAllowed: false,
      spendRankingsAllowed: false,
      supplierRegionFiltersAllowed: false,
      blockers: [],
      dataAsOf: null,
      cadence: null,
    },
  )

  const updateSearch = (patch: Partial<ProcurementSearchState>) => {
    void navigate({
      to: '/procurement/search',
      search: (prev) => ({ ...(prev as ProcurementSearchState), ...patch }),
    })
  }

  const onGrainChange = (grain: ProcurementGrain) => {
    // Grain switch resets grain-invalid filters (status), keeps common ones.
    updateSearch({ grain, status: undefined, page: PROCUREMENT_SEARCH_DEFAULTS.page })
  }

  const onSortChange = (sort: ProcurementSort) => updateSearch({ sort })

  const onQuerySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateSearch({
      q: optionalText(queryDraft),
      page: PROCUREMENT_SEARCH_DEFAULTS.page,
    })
  }

  const onExport = () => {
    if (!data) return
    const csv = buildProcurementSearchCsv(data.records, params)
    downloadProcurementCsv(csv, buildProcurementSearchFilename(params.grain, data.gate.dataAsOf))
  }

  const totalCount = data?.page.total ?? null
  const recordCount = data?.records.length ?? 0

  return (
    <div className={className}>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MockDataStatusBadge />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <Trans>Caută în achiziții publice</Trans>
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <Trans>
              Patru tipuri de înregistrări: proceduri, contracte, achiziții
              directe și modificări. Filtrele deterministe sunt autoritare;
              căutarea după text este doar pentru descoperire.
            </Trans>
          </p>
        </header>

        <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <GrainSelector value={params.grain} onChange={onGrainChange} />
            <form
              className="flex flex-1 items-center gap-2 sm:max-w-md"
              onSubmit={onQuerySubmit}
            >
              <label htmlFor="procurement-search-q" className="sr-only">
                <Trans>Caută după text</Trans>
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="procurement-search-q"
                  value={queryDraft}
                  placeholder={t`Caută după text (descoperire)`}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  className="pl-8"
                  aria-describedby="procurement-search-q-help"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                <Search className="h-4 w-4" aria-hidden />
                <span className="sr-only">
                  <Trans>Aplică textul căutat</Trans>
                </span>
              </Button>
              <span id="procurement-search-q-help" className="sr-only">
                <Trans>
                  Căutare după text pentru descoperire, nu un filtru autoritativ.
                </Trans>
              </span>
            </form>
          </div>
        </div>

        {gate ? (
          <CoverageRibbonFromGate gate={gate} status="mock" />
        ) : null}

        <FilterRail
          capability={capability}
          params={params}
          updateSearch={updateSearch}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-live="polite">
              {isLoading || isFetching ? (
                <Trans>Se încarcă…</Trans>
              ) : totalCount !== null ? (
                <Trans>{recordCount} din {totalCount} rezultate</Trans>
              ) : (
                <Trans>{recordCount} rezultate (total necunoscut)</Trans>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="procurement-sort" className="text-xs text-muted-foreground">
              <Trans>Sortează</Trans>
            </label>
            <Select
              value={params.sort}
              onValueChange={(v) => onSortChange(v as ProcurementSort)}
            >
              <SelectTrigger id="procurement-sort" className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_VALUES.map((opt) => {
                  const valueGated =
                    (opt.value === 'value_desc' || opt.value === 'value_asc') &&
                    !capability.canShowSpendRanked()
                  return (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={valueGated}
                    >
                      {opt.label}
                      {valueGated ? ` · ${t`sub prag`}` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <ShareFilteredView />
            <Button variant="outline" size="sm" onClick={onExport} disabled={!data}>
              <Download className="h-4 w-4" aria-hidden />
              <Trans>Export CSV</Trans>
            </Button>
          </div>
        </div>

        <ResultsBody
          isLoading={isLoading}
          error={error}
          records={data?.records ?? []}
          grain={params.grain}
        />

        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            <Trans>Pagină</Trans> {params.page} · <Trans>pe pagină</Trans> {params.pageSize}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={params.page <= 1 || isLoading}
              onClick={() => updateSearch({ page: params.page - 1 })}
              aria-label={t`Pagina anterioară`}
            >
              <Trans>Anterior</Trans>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || (totalCount !== null && params.page * params.pageSize >= totalCount)}
              onClick={() => updateSearch({ page: params.page + 1 })}
              aria-label={t`Pagina următoare`}
            >
              <Trans>Următor</Trans>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterRail({
  capability,
  params,
  updateSearch,
}: {
  readonly capability: ReturnType<typeof useCapabilityGate>
  readonly params: ProcurementSearchState
  readonly updateSearch: (patch: Partial<ProcurementSearchState>) => void
}) {
  const [draft, setDraft] = useState(() => filterDraftFromParams(params))

  useEffect(() => {
    setDraft({
      authority_cui: params.authority_cui ?? '',
      supplier_cui: params.supplier_cui ?? '',
      cpv: params.cpv ?? params.cpv_division ?? '',
      year: params.year?.toString() ?? '',
      valueMin: params.valueMin?.toString() ?? '',
      valueMax: params.valueMax?.toString() ?? '',
      source: params.source ?? 'all',
      status: params.status?.[0] ?? 'all',
    })
  }, [
    params.authority_cui,
    params.supplier_cui,
    params.cpv,
    params.cpv_division,
    params.year,
    params.valueMin,
    params.valueMax,
    params.source,
    params.status,
  ])

  const setField = <K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cpv = optionalText(draft.cpv)
    updateSearch({
      authority_cui: optionalText(draft.authority_cui),
      supplier_cui: optionalText(draft.supplier_cui),
      cpv: cpv && cpv.length > 2 ? cpv : undefined,
      cpv_division: cpv && cpv.length <= 2 ? cpv : undefined,
      source: draft.source === 'all' ? undefined : draft.source,
      status: draft.status === 'all' ? undefined : [draft.status],
      year: optionalNumber(draft.year),
      valueMin: optionalNumber(draft.valueMin),
      valueMax: optionalNumber(draft.valueMax),
      page: PROCUREMENT_SEARCH_DEFAULTS.page,
    })
  }

  const onReset = () => {
    updateSearch({
      authority_cui: undefined,
      supplier_cui: undefined,
      cpv: undefined,
      cpv_division: undefined,
      source: undefined,
      status: undefined,
      year: undefined,
      valueMin: undefined,
      valueMax: undefined,
      page: PROCUREMENT_SEARCH_DEFAULTS.page,
    })
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-3 text-sm"
      aria-label={t`Filtre`}
    >
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">
          <Trans>Filtre</Trans>
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <Trans>
          CUI autoritate, CUI furnizor, CPV, sursă, stadiu, an și interval de
          valoare RON.
        </Trans>
      </p>
      <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onSubmit}>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>CUI autoritate</Trans>
          </span>
          <Input
            value={draft.authority_cui}
            onChange={(event) => setField('authority_cui', event.target.value)}
            placeholder={t`ex. 2939237`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>CUI furnizor</Trans>
          </span>
          <Input
            value={draft.supplier_cui}
            onChange={(event) => setField('supplier_cui', event.target.value)}
            placeholder={t`ex. 12345678`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>CPV sau diviziune</Trans>
          </span>
          <Input
            value={draft.cpv}
            onChange={(event) => setField('cpv', event.target.value)}
            placeholder={t`45 sau 45233140`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>An</Trans>
          </span>
          <Input
            inputMode="numeric"
            value={draft.year}
            onChange={(event) => setField('year', event.target.value)}
            placeholder={t`2025`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>Sursă</Trans>
          </span>
          <Select
            value={draft.source}
            onValueChange={(value) => setField('source', value as FilterDraft['source'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_VALUES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>Stadiu</Trans>
          </span>
          <Select
            value={draft.status}
            onValueChange={(value) => setField('status', value as FilterDraft['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>Valoare minimă RON</Trans>
          </span>
          <Input
            inputMode="numeric"
            value={draft.valueMin}
            onChange={(event) => setField('valueMin', event.target.value)}
            placeholder={t`0`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>Valoare maximă RON</Trans>
          </span>
          <Input
            inputMode="numeric"
            value={draft.valueMax}
            onChange={(event) => setField('valueMax', event.target.value)}
            placeholder={t`500000`}
          />
        </label>
        <div className="flex items-end gap-2 md:col-span-4">
          <Button type="submit" size="sm">
            <Trans>Aplică filtrele</Trans>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            <Trans>Resetează</Trans>
          </Button>
        </div>
      </form>
      {capability.isSupplierRegionBlocked() ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-amber-800">
          <TriangleAlert className="h-3 w-3" aria-hidden />
          <Trans>Filtrul de regiune furnizor este indisponibil în v1.</Trans>{' '}
          <RequestDatasetAction dataset="public-contracts-seap" />
        </p>
      ) : null}
    </section>
  )
}

function ResultsBody({
  isLoading,
  error,
  records,
  grain,
}: {
  readonly isLoading: boolean
  readonly error: unknown
  readonly records: readonly import('@/schemas/procurement').ProcurementRecordSummary[]
  readonly grain: ProcurementGrain
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-live="polite" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
        <span className="sr-only">
          <Trans>Se încarcă rezultatele pentru {grainLabel(grain)}…</Trans>
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert className="h-6 w-6" />}
        title={t`Nu am putut încărca rezultatele.`}
        description={t`Reîncearcă sau ajustează filtrele.`}
      />
    )
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title={t`Niciun rezultat`}
        description={t`Ajustează filtrele sau schimbă tipul de înregistrări.`}
      />
    )
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id}>
          <ProcurementRecordCard record={record} />
        </li>
      ))}
    </ul>
  )
}
