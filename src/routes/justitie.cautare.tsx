import { useEffect, useId, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CaseResultsTable } from '@/features/justice/components/case-results-table'
import {
  CoverageRibbon,
  JusticeUnavailablePanel,
  PrivacyBoundaryNotice,
  SourceProvenanceDisclosure,
} from '@/features/justice/components/data-trust'
import {
  getJusticeQueryOutcome,
  useCaseSearch,
} from '@/features/justice/hooks/use-justice-data'
import { looksLikeCaseNumber } from '@/features/justice/lib/justice-format'
import {
  parseCaseSearch,
  type CaseSearchResult,
  type CaseSearchState,
} from '@/schemas/justice'

export const Route = createFileRoute('/justitie/cautare')({
  validateSearch: parseCaseSearch,
  component: JusticeSearchRoute,
  head: () => ({
    meta: [{ title: `${t`Caută cauze`} — ${t`Justiție`}` }],
  }),
})

const COURT_OPTIONS = [
  { value: 'TB-BUCURESTI', label: () => t`Tribunalul București` },
  { value: 'TB-CLUJ', label: () => t`Tribunalul Cluj` },
  { value: 'TB-TIMIS', label: () => t`Tribunalul Timiș` },
  { value: 'NO-COVERAGE', label: () => t`Instanță fără acoperire mock` },
] as const

const CATEGORY_OPTIONS = [
  { value: 'civil', label: () => t`Litigii civile` },
  { value: 'comercial', label: () => t`Litigii comerciale` },
  { value: 'penal', label: () => t`Cauze penale` },
  { value: 'administrativ', label: () => t`Litigii administrativ-fiscale` },
  { value: 'muncii', label: () => t`Litigii de muncă` },
  { value: 'familie', label: () => t`Cauze de familie` },
  { value: 'contraventional', label: () => t`Contravenții` },
  { value: 'disciplinar', label: () => t`Cauze disciplinare` },
] as const

const STAGE_OPTIONS = [
  { value: 'in_curs', label: () => t`În curs` },
  { value: 'solutionat', label: () => t`Soluționat` },
  { value: 'suspendat', label: () => t`Suspendat` },
  { value: 'revizuit', label: () => t`Revizuit` },
  { value: 'arhivat', label: () => t`Arhivat` },
] as const

const PARTY_KEY_OPTIONS = [
  { value: 'sc-exemplu-comercial-sa', label: () => t`S.C. EXEMPLU COMERCIAL SA` },
  {
    value: 'primaria-municipiului-cluj-napoca',
    label: () => t`Primăria Municipiului Cluj-Napoca`,
  },
  {
    value: 'regia-autonoma-exemplu-bucuresti',
    label: () => t`Regia Autonomă Exemplu București`,
  },
] as const

function JusticeSearchRoute() {
  const search = Route.useSearch()
  const query = useCaseSearch(search)
  const outcome = getJusticeQueryOutcome<CaseSearchResult>(query.data)

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal">
          <Trans>Caută cauze</Trans>
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <Trans>
            Filtrează metadata publică după instanță, categorie, stadiu și chei
            publicabile. Nu există căutare full-text sau după persoane.
          </Trans>
        </p>
      </header>

      <JusticeSearchFilters search={search} isFetching={query.isFetching} />

      {query.isLoading && !outcome ? <SearchResultsSkeleton /> : null}

      {query.isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          title={t`Nu am putut încărca rezultatele`}
          description={t`Verifică filtrele sau încearcă din nou mai târziu.`}
        />
      ) : null}

      {outcome?.kind === 'unavailable' ? (
        <JusticeUnavailablePanel message={outcome.unavailable.message} />
      ) : null}

      {outcome?.kind === 'notFound' ? (
        <EmptyState
          title={t`Nu există rezultate pentru acest set de filtre`}
          description={t`Acesta este un rezultat de acoperire, nu o confirmare de inexistență.`}
        />
      ) : null}

      {outcome?.kind === 'populated' ? (
        <JusticeSearchResults result={outcome.data} search={search} />
      ) : null}
    </main>
  )
}

type JusticeSearchFiltersProps = {
  readonly search: CaseSearchState
  readonly isFetching: boolean
}

function JusticeSearchFilters({ search, isFetching }: JusticeSearchFiltersProps) {
  const navigate = useNavigate({ from: '/justitie/cautare' })
  const [lookup, setLookup] = useState(search.caseNumber ?? '')
  const [yearInput, setYearInput] = useState(
    search.year === undefined ? '' : String(search.year),
  )
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const courtOptions = COURT_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label(),
  }))
  const categoryOptions = CATEGORY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label(),
  }))
  const stageOptions = STAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label(),
  }))

  useEffect(() => {
    setLookup(search.caseNumber ?? '')
  }, [search.caseNumber])

  useEffect(() => {
    setYearInput(search.year === undefined ? '' : String(search.year))
  }, [search.year])

  const update = (patch: Partial<CaseSearchState>, resetPage = true) => {
    void navigate({
      search: (previous) =>
        cleanCaseSearch({
          ...previous,
          ...patch,
          ...(resetPage ? { page: 1 } : {}),
        }),
    })
  }

  const submitLookup = () => {
    const trimmed = lookup.trim()
    if (!trimmed) {
      update({ caseNumber: undefined })
      return
    }
    if (!looksLikeCaseNumber(trimmed)) {
      setLookupMessage(
        t`Căutarea liberă nu este păstrată. Alege o cheie publicabilă sau introdu un număr exact de dosar.`,
      )
      return
    }
    setLookupMessage(null)
    update({ caseNumber: trimmed })
  }

  const commitYear = () => {
    const trimmed = yearInput.trim()
    update({ year: trimmed ? Number(trimmed) : undefined })
  }

  return (
    <section className="space-y-4 border border-border p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" aria-hidden />
        <Trans>Filtre</Trans>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">
            <Trans>actualizare…</Trans>
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <label htmlFor="justice-case-number" className="text-sm font-medium">
            <Trans>Număr dosar</Trans>
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              id="justice-case-number"
              value={lookup}
              onChange={(event) => {
                setLookup(event.target.value)
                setLookupMessage(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitLookup()
              }}
              placeholder={t`1234/3/2024`}
            />
            <Button type="button" onClick={submitLookup}>
              <Search className="h-4 w-4" aria-hidden />
              <span className="sr-only">
                <Trans>Caută dosar</Trans>
              </span>
            </Button>
          </div>
          {lookupMessage ? (
            <p className="mt-2 text-xs text-amber-700">{lookupMessage}</p>
          ) : null}
        </div>

        <FilterSelect
          label={t`Instanță`}
          value={search.court}
          options={courtOptions}
          onChange={(value) => update({ court: value })}
        />
        <FilterSelect
          label={t`Cheie publicabilă`}
          value={search.partyKey}
          options={PARTY_KEY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label(),
          }))}
          onChange={(value) => update({ partyKey: value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label={t`Categorie`}
          value={search.category}
          options={categoryOptions}
          onChange={(value) => update({ category: value })}
        />
        <FilterSelect
          label={t`Stadiu`}
          value={search.stage}
          options={stageOptions}
          onChange={(value) => update({ stage: value })}
        />
        <FilterSelect
          label={t`Tip parte`}
          value={search.partyKind}
          options={[
            { value: 'company', label: t`Companie` },
            { value: 'public_entity', label: t`Instituție publică` },
          ]}
          onChange={(value) =>
            update({ partyKind: value as CaseSearchState['partyKind'] })
          }
        />
        <FilterSelect
          label={t`Apel`}
          value={search.hasAppeal}
          options={[
            { value: 'true', label: t`Cu apel` },
            { value: 'false', label: t`Fără apel` },
          ]}
          onChange={(value) =>
            update({ hasAppeal: value as CaseSearchState['hasAppeal'] })
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label={t`Nivel instanță`}
          value={search.tier}
          options={[
            { value: 'judecatorie', label: t`Judecătorie` },
            { value: 'tribunal', label: t`Tribunal` },
            { value: 'tribunal_militar', label: t`Tribunal militar` },
            { value: 'curte_de_apel', label: t`Curte de apel` },
            { value: 'curte_militara_apel', label: t`Curte militară de apel` },
          ]}
          onChange={(value) => update({ tier: value as CaseSearchState['tier'] })}
        />
        <FilterSelect
          label={t`Rol`}
          value={search.role}
          options={[
            { value: 'Reclamant', label: t`Reclamant` },
            { value: 'Pârât', label: t`Pârât` },
          ]}
          onChange={(value) => update({ role: value })}
        />
        <div>
          <label htmlFor="justice-year" className="text-sm font-medium">
            <Trans>An</Trans>
          </label>
          <Input
            id="justice-year"
            type="number"
            min={2000}
            max={2100}
            value={yearInput}
            onChange={(event) => {
              setYearInput(event.target.value)
            }}
            onBlur={commitYear}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitYear()
            }}
            className="mt-2"
          />
        </div>
        <FilterSelect
          label={t`Sortare`}
          value={search.sort}
          options={[
            { value: 'recent', label: t`Cele mai recente` },
            { value: 'oldest', label: t`Cele mai vechi` },
            { value: 'court', label: t`Instanță` },
            { value: 'category', label: t`Categorie` },
          ]}
          onChange={(value) =>
            update({ sort: value as CaseSearchState['sort'] }, false)
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLookup('')
            setYearInput('')
            update({
              caseNumber: undefined,
              court: undefined,
              tier: undefined,
              category: undefined,
              stage: undefined,
              year: undefined,
              partyKind: undefined,
              role: undefined,
              hasAppeal: undefined,
              partyKey: undefined,
              sort: undefined,
              page: undefined,
            })
          }}
        >
          <Trans>Șterge filtrele</Trans>
        </Button>
      </div>
    </section>
  )
}

type FilterSelectProps<TValue extends string> = {
  readonly label: string
  readonly value?: TValue
  readonly options: readonly { readonly value: TValue; readonly label: string }[]
  readonly onChange: (value: TValue | undefined) => void
}

function FilterSelect<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<TValue>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        value={value ?? 'all'}
        onValueChange={(next) => onChange(next === 'all' ? undefined : (next as TValue))}
      >
        <SelectTrigger id={id} className="mt-2">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <Trans>Toate</Trans>
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

type JusticeSearchResultsProps = {
  readonly result: CaseSearchResult
  readonly search: CaseSearchState
}

function JusticeSearchResults({ result, search }: JusticeSearchResultsProps) {
  const navigate = useNavigate({ from: '/justitie/cautare' })

  return (
    <section className="space-y-4" aria-live="polite">
      <CoverageRibbon provenance={result.provenance} />
      <PrivacyBoundaryNotice />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            <Trans>{result.pagination.total} rezultate publicabile</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>Persoanele fizice sunt agregate, nu afișate nominal.</Trans>
          </p>
        </div>
      </div>

      {result.rows.length === 0 ? (
        <EmptyState
          title={t`Nu am găsit cauze publicabile pentru aceste filtre`}
          description={t`Lărgește filtrele sau intervalul de ani. Acoperirea este densă din 2021 și nu include ICCJ.`}
        />
      ) : (
        <CaseResultsTable rows={result.rows} from={search.from ?? 'cautare'} />
      )}

      <Pagination
        currentPage={search.page ?? 1}
        pageSize={search.pageSize ?? 25}
        totalCount={result.pagination.total}
        onPageChange={(page) => {
          void navigate({
            search: (previous) => cleanCaseSearch({ ...previous, page }),
          })
        }}
        onPageSizeChange={(pageSize) => {
          void navigate({
            search: (previous) =>
              cleanCaseSearch({ ...previous, pageSize, page: 1 }),
          })
        }}
      />

      <SourceProvenanceDisclosure provenance={result.provenance} />
    </section>
  )
}

function cleanCaseSearch(search: Record<string, unknown>): CaseSearchState {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    cleaned[key] = value
  }
  return parseCaseSearch(cleaned)
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
