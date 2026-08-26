import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import {
  useComparisonPeers,
  useComparisons,
} from '../hooks/use-comparisons'
import {
  MAX_COMPARISON_TERRITORIES,
  upsertClassificationPin,
} from '../lib/comparison-series'
import {
  COMPARISON_EXAMPLE_PRESET,
  COMPARISON_PRESETS,
} from '../lib/comparison-presets'
import { ComparisonBarChart } from '../components/comparison-bar-chart'
import { comparisonSeriesColor } from '../components/comparison-palette'
import type { ComparisonSeriesDescriptor } from '../lib/comparison-format'
import { ComparisonDatasetPicker } from '../components/comparison-dataset-picker'
import { ComparisonLineChart } from '../components/comparison-line-chart'
import { ComparisonPeriodSelect, ComparisonPins } from '../components/comparison-pins'
import {
  ComparisonErrorState,
  ComparisonNoData,
  ComparisonPartialNotice,
  ComparisonSkeleton,
} from '../components/comparison-states'
import { ComparisonTable } from '../components/comparison-table'
import { ComparisonTerritoryPicker } from '../components/comparison-territory-picker'

/**
 * Territory-first comparisons: one INS indicator across two to six
 * territories of ANY level — localități (siruta: tokens), județe (cod:
 * tokens) and România (cod:RO) — resolved to territory codes and fetched by
 * exactly ONE `insObservations` request (see `use-comparisons.ts`).
 *
 * Below two territories the page renders a LIVE worked example (marked
 * exemplu) instead of an empty shell; one click adopts it.
 */
export function StatisticsComparisonsPage() {
  const search = useSearch({ from: '/statistici/comparatii/' })
  const navigate = useNavigate({ from: '/statistici/comparatii/' })
  const { i18n } = useLingui()

  const patchSearch = useCallback(
    (patch: Partial<StatisticsComparisonsSearch>) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace: true,
      })
    },
    [navigate],
  )

  // Below two territories the RESULTS run on the example preset, live and
  // labeled — never an empty chart shell.
  const urlTokenCount = (search.teritorii ?? []).length
  const exampleMode = urlTokenCount < 2
  const effectiveSearch = exampleMode ? COMPARISON_EXAMPLE_PRESET.search : search

  const {
    datasetMeta,
    datasetLoading,
    datasetError,
    matrix,
    observationsLoading,
    observationsError,
    observationsFetching,
    partial,
    refetchObservations,
    effectivePins,
    selectedPeriod,
    tokens,
    hasDataset,
  } = useComparisons(effectiveSearch)

  // The picker reflects the USER's URL selection, not the example's.
  const { tokens: userTokens } = useComparisons(
    exampleMode ? { ...search, teritorii: search.teritorii } : search,
  )
  const peers = useComparisonPeers(userTokens)

  const series: readonly ComparisonSeriesDescriptor[] = useMemo(() => {
    const nameByCode = new Map(
      (matrix?.rows ?? []).map((row) => [row.code, row.name] as const),
    )

    return tokens.slice(0, MAX_COMPARISON_TERRITORIES).map((entry, index) => ({
      code: entry.code,
      label: nameByCode.get(entry.code) ?? entry.code,
      color: comparisonSeriesColor(index),
    }))
  }, [matrix, tokens])

  const labelByCode = useMemo(
    () => new Map(series.map((entry) => [entry.code, entry.label])),
    [series],
  )

  /** Preset honesty: name every territory that answered with zero rows. */
  const emptyTerritoryNames = useMemo(
    () =>
      (matrix?.rows ?? [])
        .filter((row) => Object.keys(row.cells).length === 0)
        .map((row) => row.name ?? row.code),
    [matrix],
  )

  const pinsSummary = useMemo(() => {
    const parts: string[] = []
    for (const pin of effectivePins) {
      const dimension = datasetMeta?.classifications.find(
        (entry) => entry.typeCode === pin.typeCode,
      )
      const option = dimension?.options.find((entry) => entry.code === pin.valueCode)
      parts.push(
        `${(dimension?.label ?? pin.typeCode).toLocaleLowerCase()}: ${option?.label ?? pin.valueCode}`,
      )
    }
    const unit = datasetMeta?.units.find((entry) => entry.code === search.unitate)
    if (unit) parts.push(`${i18n._('unitate')}: ${unit.label}`)
    return parts.join(' · ')
  }, [effectivePins, datasetMeta, search.unitate, i18n])

  const handleSelectDataset = (code: string) => {
    // Pins belong to the previous dataset's dimensions; carrying them over
    // would filter the new dataset by codes it does not have.
    patchSearch({ cod: code, clasificari: undefined, unitate: undefined, perioada: undefined })
  }

  const handleAddTerritory = (token: string) => {
    const current = search.teritorii ?? []
    if (current.includes(token) || current.length >= MAX_COMPARISON_TERRITORIES) return
    const next: [string, ...string[]] = [current[0] ?? token, ...current.slice(1), ...(current.length > 0 ? [token] : [])]
    patchSearch({ teritorii: next })
  }

  const handleRemoveTerritory = (token: string) => {
    const next = (search.teritorii ?? []).filter((entry) => entry !== token)
    patchSearch({ teritorii: next.length > 0 ? (next as [string, ...string[]]) : undefined })
  }

  const handlePinClassification = (typeCode: string, valueCode: string) => {
    patchSearch({
      clasificari: asOptionalPins(
        upsertClassificationPin(search.clasificari ?? [], { typeCode, valueCode }),
      ),
      // A new pin can change which periods exist; let the data decide again.
      perioada: undefined,
    })
  }

  const results = renderResults()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            <Trans>Comparații locale</Trans>
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <Trans>
              Compară un indicator INS Tempo între localități, județe și România. Perioadele fără
              date raportate rămân goale — nu sunt completate cu valori din alți ani.
            </Trans>
          </p>
        </header>

        <nav aria-label="Comparații predefinite" className="flex flex-wrap gap-1.5">
          {COMPARISON_PRESETS.map((preset) => (
            <Link
              key={preset.id}
              to="/statistici/comparatii"
              search={preset.search}
              className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {i18n._(preset.title)}
            </Link>
          ))}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-6">
            <ComparisonTerritoryPicker
              selected={userTokens}
              labelByCode={labelByCode}
              peers={peers}
              onAdd={handleAddTerritory}
              onRemove={handleRemoveTerritory}
              onClear={() => patchSearch({ teritorii: undefined })}
            />

            <ComparisonDatasetPicker
              selectedCode={search.cod}
              selectedLabel={exampleMode ? null : (datasetMeta?.nameRo ?? null)}
              onSelect={handleSelectDataset}
            />

            {datasetMeta && !exampleMode ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 truncate">
                      {pinsSummary || <Trans>Clasificări și unitate</Trans>}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <ComparisonPins
                    datasetMeta={datasetMeta}
                    effectivePins={effectivePins}
                    unitCode={search.unitate}
                    onPinClassification={handlePinClassification}
                    onPinUnit={(unitCode) => patchSearch({ unitate: unitCode, perioada: undefined })}
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : null}

            {datasetError && !exampleMode ? (
              <p className="text-sm text-destructive">
                <Trans>Nu am putut încărca detaliile indicatorului.</Trans>
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4">
            {exampleMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  <Trans>exemplu live</Trans>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {i18n._(COMPARISON_EXAMPLE_PRESET.title)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => patchSearch(COMPARISON_EXAMPLE_PRESET.search)}
                >
                  <Trans>Folosește acest exemplu</Trans>
                </Button>
              </div>
            ) : null}
            {results}
          </div>
        </div>
      </div>
    </div>
  )

  function renderResults() {
    if (observationsError) {
      return (
        <ComparisonErrorState onRetry={refetchObservations} isRetrying={observationsFetching} />
      )
    }

    if (!hasDataset || datasetLoading || observationsLoading || !matrix) {
      return <ComparisonSkeleton />
    }

    if (matrix.periods.length === 0) {
      return <ComparisonNoData />
    }

    return (
      <>
        {partial ? <ComparisonPartialNotice /> : null}

        {emptyTerritoryNames.length > 0 ? (
          <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
            <Trans>
              Fără date raportate pentru: {emptyTerritoryNames.join(', ')}. Teritoriile rămân în
              comparație ca absențe, nu sunt eliminate pe tăcute.
            </Trans>
          </p>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <ComparisonPeriodSelect
            periods={matrix.periods}
            selectedPeriod={selectedPeriod}
            onSelect={(isoPeriod) => patchSearch({ perioada: isoPeriod })}
          />
        </div>

        <ComparisonTable matrix={matrix} series={series} selectedPeriod={selectedPeriod} />

        <div className="grid gap-4 xl:grid-cols-2">
          <ComparisonBarChart
            matrix={matrix}
            series={series}
            selectedPeriod={selectedPeriod}
          />
          <ComparisonLineChart matrix={matrix} series={series} />
        </div>
      </>
    )
  }
}

/**
 * `clasificari` is `.nonempty().optional()`: an empty array would fail route
 * validation, so "no pins" must be `undefined`.
 */
function asOptionalPins(pins: readonly string[]): string[] | undefined {
  return pins.length > 0 ? [...pins] : undefined
}
