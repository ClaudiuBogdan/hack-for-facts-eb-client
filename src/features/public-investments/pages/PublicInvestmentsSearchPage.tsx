import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Columns2, List, Map, Search } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BlockedDataState,
  DataStatusBadge,
  LoadingRows,
  ObjectiveListRow,
  PublicInvestmentsMapPanel,
  usePublicInvestmentsEvidence,
} from '../components'
import { useObjectiveSearch } from '../hooks/use-public-investments-data'
import {
  PROGRAM_CODE_VALUES,
  STAGE_BUCKET_VALUES,
  cleanSearchState,
  type LayoutView,
  type PublicInvestmentsSearchState,
} from '@/schemas/public-investments'
import { programLabel, stageLabel } from '../lib/display'

type Props = {
  readonly search: Partial<PublicInvestmentsSearchState>
}

export function PublicInvestmentsSearchPage({ search }: Props) {
  const navigate = useNavigate({ from: '/investitii-publice/cautare' })
  const query = useObjectiveSearch(search)
  const { openEvidence } = usePublicInvestmentsEvidence()
  const countyFilter = search.counties?.[0] ?? ''
  const [draftQ, setDraftQ] = useState(search.q ?? '')
  const [draftCounty, setDraftCounty] = useState(countyFilter)
  const currentView = search.view ?? 'split'
  const selectedObjectiveId = search.selected
  const showMap = currentView !== 'list'
  const showList = currentView !== 'map'

  useEffect(() => {
    setDraftQ(search.q ?? '')
    setDraftCounty(countyFilter)
  }, [search.q, countyFilter])

  const updateSearch = (
    patch: Partial<PublicInvestmentsSearchState>,
    options: { readonly resetPage?: boolean } = {},
  ) => {
    void navigate({
      search: (previous) =>
        cleanSearchState({
          ...previous,
          ...patch,
          page: patch.page ?? (options.resetPage === false ? previous.page : 1),
        }),
    })
  }

  const submitSearch = () => {
    const q = draftQ.trim()
    const county = draftCounty.trim()
    updateSearch({
      q: q || undefined,
      counties: county ? [county.toUpperCase()] : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 border-b pb-4">
        <h1 className="text-2xl font-semibold">
          <Trans>Căutare investiții publice</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Filtrează obiectivele mock-first fără a pierde dovada sursei.</Trans>
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-md border p-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              submitSearch()
            }}
          >
            <label className="space-y-1 text-sm font-medium">
              <span>{t`Text`}</span>
              <Input
                name="q"
                value={draftQ}
                onChange={(event) => setDraftQ(event.target.value)}
                placeholder={t`apă, drum, Cluj`}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>{t`Județ`}</span>
              <Input
                name="county"
                value={draftCounty}
                onChange={(event) => setDraftCounty(event.target.value)}
                placeholder="CJ"
              />
            </label>
            <Button type="submit" className="w-full gap-2">
              <Search className="h-4 w-4" aria-hidden="true" />
              <Trans>Aplică</Trans>
            </Button>
          </form>

          <FilterToggleGroup
            label={t`Program`}
            allLabel={t`Toate`}
            values={PROGRAM_CODE_VALUES}
            selectedValues={search.programs ?? []}
            getLabel={programLabel}
            onClear={() => updateSearch({ programs: undefined, selected: undefined })}
            onToggle={(program) =>
              updateSearch({
                programs: toggleFilterValue(search.programs, program),
                selected: undefined,
              })
            }
          />
          <FilterToggleGroup
            label={t`Stadiu`}
            allLabel={t`Toate`}
            values={STAGE_BUCKET_VALUES}
            selectedValues={search.stages ?? []}
            getLabel={stageLabel}
            onClear={() => updateSearch({ stages: undefined, selected: undefined })}
            onToggle={(stage) =>
              updateSearch({
                stages: toggleFilterValue(search.stages, stage),
                selected: undefined,
              })
            }
          />
          <FilterSelect
            label={t`Sortare`}
            value={search.sort ?? 'contracted'}
            onValueChange={(value) =>
              updateSearch({
                sort: value as PublicInvestmentsSearchState['sort'],
              })
            }
            options={[
              { value: 'contracted', label: t`Contractat` },
              { value: 'reimbursed', label: t`Decontat` },
              { value: 'absorption', label: t`Absorbție` },
              { value: 'title', label: t`Titlu` },
              { value: 'county', label: t`Județ` },
            ]}
          />
        </aside>

        <div className="space-y-4">
          {query.isLoading && <LoadingRows />}
          {query.isBlocked && (
            <BlockedDataState
              reason={query.blockedReason}
              messageKey={query.blockedMessageKey}
              messageParams={query.blockedMessageParams}
            />
          )}
          {query.isError && (
            <div className="rounded-md border border-destructive/30 p-4 text-sm text-destructive">
              <Trans>Nu am putut încărca rezultatele.</Trans>
            </div>
          )}
          {query.data && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <DataStatusBadge status={query.data.status} />
                  <p className="text-sm text-muted-foreground">
                    <Trans>{query.data.total} rezultate</Trans>
                    {query.isFetching && <span> · {t`actualizare în fundal`}</span>}
                  </p>
                </div>
                {query.data.excludedSuspectCount > 0 && (
                  <p className="text-sm text-amber-700">
                    <Trans>
                      {query.data.excludedSuspectCount} obiective cu valori în
                      verificare au fost excluse din filtrele pe sumă.
                    </Trans>
                  </p>
                )}
                <ViewToggle
                  value={currentView}
                  onChange={(view) => updateSearch({ view }, { resetPage: false })}
                />
              </div>
              {query.data.rows.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <Trans>Nu există rezultate pentru filtrele selectate.</Trans>
                </div>
              ) : (
                <div
                  className={cn(
                    'gap-4',
                    currentView === 'split'
                      ? 'grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'
                      : 'space-y-4',
                  )}
                >
                  {showMap && (
                    <PublicInvestmentsMapPanel
                      points={query.data.mapPoints}
                      selectedObjectiveId={selectedObjectiveId}
                      onPointSelect={(objectiveId) =>
                        updateSearch({ selected: objectiveId }, { resetPage: false })
                      }
                    />
                  )}
                  {showList && (
                    <div className="space-y-3">
                      {query.data.rows.map((objective) => {
                        const isSelected = selectedObjectiveId === objective.objectiveId

                        return (
                          <div
                            key={objective.objectiveId}
                            id={`investitie-${objective.objectiveId}`}
                            className={cn(
                              'rounded-md',
                              isSelected && 'ring-2 ring-primary ring-offset-2',
                            )}
                            aria-current={isSelected ? 'true' : undefined}
                          >
                            <ObjectiveListRow
                              objective={objective}
                              onEvidenceOpen={openEvidence}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(search.page ?? 1) <= 1}
                  onClick={() => updateSearch({ page: Math.max(1, (search.page ?? 1) - 1) })}
                >
                  <Trans>Înapoi</Trans>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(search.page ?? 1) * (search.pageSize ?? 25) >= query.data.total}
                  onClick={() => updateSearch({ page: (search.page ?? 1) + 1 })}
                >
                  <Trans>Înainte</Trans>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function ViewToggle({
  value,
  onChange,
}: {
  readonly value: LayoutView
  readonly onChange: (value: LayoutView) => void
}) {
  const options: readonly {
    readonly value: LayoutView
    readonly label: string
    readonly icon: React.ReactNode
  }[] = [
    { value: 'list', label: t`Listă`, icon: <List className="h-4 w-4" aria-hidden="true" /> },
    { value: 'map', label: t`Hartă`, icon: <Map className="h-4 w-4" aria-hidden="true" /> },
    { value: 'split', label: t`Split`, icon: <Columns2 className="h-4 w-4" aria-hidden="true" /> },
  ]

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t`Mod afișare`}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'secondary' : 'outline'}
          aria-pressed={value === option.value}
          className="gap-1.5"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </Button>
      ))}
    </div>
  )
}

function FilterToggleGroup<TValue extends string>({
  label,
  allLabel,
  values,
  selectedValues,
  getLabel,
  onClear,
  onToggle,
}: {
  readonly label: string
  readonly allLabel: string
  readonly values: readonly TValue[]
  readonly selectedValues: readonly TValue[]
  readonly getLabel: (value: TValue) => string
  readonly onClear: () => void
  readonly onToggle: (value: TValue) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={selectedValues.length === 0 ? 'secondary' : 'outline'}
          aria-pressed={selectedValues.length === 0}
          onClick={onClear}
        >
          {allLabel}
        </Button>
        {values.map((value) => {
          const selected = selectedValues.includes(value)

          return (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={selected ? 'secondary' : 'outline'}
              aria-pressed={selected}
              onClick={() => onToggle(value)}
            >
              {getLabel(value)}
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}

function toggleFilterValue<TValue extends string>(
  selectedValues: readonly TValue[] | undefined,
  value: TValue,
): TValue[] | undefined {
  const selected = selectedValues ?? []
  if (selected.includes(value)) {
    const next = selected.filter((item) => item !== value)
    return next.length > 0 ? next : undefined
  }
  return [...selected, value]
}

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  readonly label: string
  readonly value: string
  readonly options: readonly { readonly value: string; readonly label: string }[]
  readonly onValueChange: (value: string) => void
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
