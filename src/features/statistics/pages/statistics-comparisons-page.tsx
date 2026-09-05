import { ComparisonDatasetError } from '../lib/comparison-dataset-error'
import { resolveComparisonTerritories } from '../lib/comparison-territories'
import { editSourcePin } from '../lib/source-selection'
import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
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
  useComparisonTerritoryNames,
} from '../hooks/use-comparisons'
import { MAX_COMPARISON_TERRITORIES } from '../lib/comparison-series'
import {
  COMPARISON_EXAMPLE_PRESET,
  COMPARISON_PRESETS,
} from '../lib/comparison-presets'
import { ComparisonBarChart } from '../components/comparison-bar-chart'
import { comparisonSeriesColor } from '../components/comparison-palette'
import {
  hasMixedComparisonLevels,
  type ComparisonSeriesDescriptor,
} from '../lib/comparison-format'
import { ComparisonDatasetPicker } from '../components/comparison-dataset-picker'
import { ComparisonLineChart } from '../components/comparison-line-chart'
import {
  ComparisonPeriodSelect,
  ComparisonPins,
} from '../components/comparison-pins'
import {
  ComparisonErrorState,
  ComparisonGuidedEmptyState,
  ComparisonNoData,
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
    (
      patch: Partial<StatisticsComparisonsSearch>,
      options: { readonly replace?: boolean } = {},
    ) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace: options.replace ?? true,
      })
    },
    [navigate],
  )

  // ONE token source for every read — search.teritorii is NEVER read raw
  // (raw values leak past validateSearch with their parsed types).
  const userTokens = useMemo(
    () => resolveComparisonTerritories(search.teritorii).tokens,
    [search.teritorii],
  )

  // Below two territories the RESULTS run on the example preset, live and
  // labeled — never an empty chart shell.
  const exampleMode =
    search.teritorii === undefined &&
    search.cod === undefined &&
    search.clasificari === undefined &&
    search.unitate === undefined &&
    search.frecventa === undefined &&
    search.perioada === undefined
  const effectiveSearch = exampleMode
    ? COMPARISON_EXAMPLE_PRESET.search
    : search

  const {
    datasetMeta,
    datasetLoading,
    datasetError,
    matrix,
    observationsLoading,
    observationsError,
    observationsFetching,
    issues,
    unitCode,
    cadence,
    representative,
    refetchObservations,
    effectivePins,
    unresolvedDimensionLabels,
    selectedPeriod,
    tokens,
    hasDataset,
  } = useComparisons(effectiveSearch)

  const peers = useComparisonPeers(userTokens)
  const resolvedNames = useComparisonTerritoryNames(tokens, matrix)

  const series: readonly ComparisonSeriesDescriptor[] = useMemo(() => {
    const nameByCode = new Map(
      (matrix?.rows ?? []).map((row) => [row.code, row.name] as const),
    )

    return tokens.slice(0, MAX_COMPARISON_TERRITORIES).map((entry, index) => ({
      code: entry.code,
      label:
        nameByCode.get(entry.code) ??
        resolvedNames.get(entry.code) ??
        entry.code,
      color: comparisonSeriesColor(index),
      level: entry.level,
    }))
  }, [matrix, tokens, resolvedNames])

  const labelByCode = useMemo(
    () => new Map(series.map((entry) => [entry.code, entry.label])),
    [series],
  )

  /** Preset honesty: name every territory that answered with zero rows. */
  const emptyTerritoryNames = useMemo(
    () =>
      (matrix?.rows ?? [])
        .filter((row) => row.availability === 'EMPTY')
        .map((row) => row.name ?? row.code),
    [matrix],
  )

  const pinsSummary = effectivePins
    .map((pin) => {
      const dimension = datasetMeta?.dimensions.find(
        (d) => `D${d.index}` === pin.typeCode,
      )
      return `${dimension?.label_ro || pin.typeCode}: ${pin.valueCode}`
    })
    .concat(unitCode ? [`${t`unitate`}: ${unitCode}`] : [])
    .join(' · ')

  // A UI edit materializes the whole resolved selection. Malformed entries on
  // other axes survive until explicitly repaired or reset by the user.
  const materialized = () => ({
    clasificari:
      search.clasificari !== undefined
        ? search.clasificari
        : effectivePins.length
          ? effectivePins.map((p) => `${p.typeCode}:${p.valueCode}`)
          : undefined,
    unitate:
      search.unitate !== undefined ? search.unitate : (unitCode ?? undefined),
    frecventa:
      search.frecventa !== undefined
        ? search.frecventa
        : (cadence ?? undefined),
  })

  const handleSelectDataset = (code: string) => {
    // Pins belong to the previous dataset's dimensions; carrying them over
    // would filter the new dataset by codes it does not have.
    patchSearch({
      cod: code,
      clasificari: undefined,
      unitate: undefined,
      frecventa: undefined,
      perioada: undefined,
    })
  }

  const rawTerritories = () =>
    Array.isArray(search.teritorii)
      ? search.teritorii
      : search.teritorii === undefined
        ? []
        : [search.teritorii]
  const handleAddTerritory = (token: string) => {
    const current = rawTerritories()
    if (current.includes(token) || current.length >= MAX_COMPARISON_TERRITORIES)
      return
    patchSearch({ teritorii: [...current, token] }, { replace: false })
  }
  const handleRemoveTerritory = (token: string) => {
    const next = rawTerritories().filter(
      (raw) => resolveComparisonTerritories([raw]).tokens[0]?.token !== token,
    )
    patchSearch(
      { teritorii: next.length ? next : undefined },
      { replace: false },
    )
  }

  const handlePinClassification = (
    typeCode: string,
    valueCode: string | null,
  ) => {
    const current = materialized()
    patchSearch({
      ...current,
      clasificari: editSourcePin(current.clasificari, typeCode, valueCode),
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
              Compară un indicator INS Tempo între localități, județe și
              România. Perioadele fără date raportate rămân goale — nu sunt
              completate cu valori din alți ani.
            </Trans>
          </p>
        </header>

        <nav
          aria-label={t`Comparații predefinite`}
          className="flex flex-wrap gap-1.5"
        >
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
              selectedCode={
                typeof search.cod === 'string' ? search.cod : undefined
              }
              selectedLabel={
                exampleMode ? null : (datasetMeta?.name_ro ?? null)
              }
              onSelect={handleSelectDataset}
            />

            {datasetMeta && !exampleMode ? (
              <Collapsible
                defaultOpen={
                  unresolvedDimensionLabels.length > 0 || issues.length > 0
                }
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 truncate">
                      {pinsSummary || <Trans>Clasificări și unitate</Trans>}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <ComparisonPins
                    datasetMeta={datasetMeta}
                    effectivePins={effectivePins}
                    unitCode={unitCode}
                    cadence={cadence}
                    onPinClassification={handlePinClassification}
                    onPinUnit={(next) =>
                      patchSearch({
                        ...materialized(),
                        unitate: next ?? undefined,
                      })
                    }
                    onPinCadence={(next) =>
                      patchSearch({ ...materialized(), frecventa: next })
                    }
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
                  onClick={() =>
                    void navigate({
                      search: COMPARISON_EXAMPLE_PRESET.search,
                      replace: false,
                    })
                  }
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
    // Two territories but no dataset: guide, never an infinite skeleton.
    if (issues.length > 0)
      return (
        <div role="alert" className="space-y-3 rounded-md border p-4">
          <p>
            <Trans>
              Selecția INS nu este validă. Corectează teritoriile, dimensiunile,
              unitatea sau frecvența.
            </Trans>
          </p>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(effectiveSearch, null, 2)}
          </pre>
          <Button
            variant="outline"
            onClick={() =>
              patchSearch({
                clasificari: undefined,
                unitate: undefined,
                frecventa: undefined,
                perioada: undefined,
              })
            }
          >
            <Trans>Resetează selecția sursei</Trans>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              patchSearch({
                teritorii: undefined,
                cod: undefined,
                clasificari: undefined,
                unitate: undefined,
                frecventa: undefined,
                perioada: undefined,
              })
            }
          >
            <Trans>Resetează comparația</Trans>
          </Button>
        </div>
      )
    if (!hasDataset || tokens.length === 0) {
      return <ComparisonGuidedEmptyState />
    }

    if (datasetError instanceof ComparisonDatasetError) {
      return (
        <div role="status" className="space-y-2 rounded-md border p-4">
          {datasetError.reason === 'UNKNOWN' ? (
            <Trans>
              Indicatorul nu a fost găsit. Alege un indicator din catalog.
            </Trans>
          ) : (
            <Trans>
              Indicatorul este în catalog, dar observațiile nu au fost încă
              publicate. Alege alt indicator.
            </Trans>
          )}
        </div>
      )
    }

    if (observationsError || datasetError) {
      return (
        <ComparisonErrorState
          onRetry={refetchObservations}
          isRetrying={observationsFetching}
        />
      )
    }

    // Missing shared coordinates, unit or cadence hold the vector fetch until
    // the selection is complete; no unrelated source defaults fill the gaps.
    if (unresolvedDimensionLabels.length > 0) {
      return (
        <div
          role="status"
          className="rounded-md border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground"
        >
          <p>
            <Trans>
              Comparația pornește după ce alegi o valoare în „Dimensiuni fixate"
              pentru:
            </Trans>
          </p>
          <ul className="mt-2 list-inside list-disc">
            {unresolvedDimensionLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )
    }

    if (datasetLoading || observationsLoading || !matrix) {
      return <ComparisonSkeleton />
    }

    if (
      matrix.periods.length === 0 &&
      matrix.rows.every((row) => row.availability === 'EMPTY')
    ) {
      return <ComparisonNoData />
    }

    return (
      <>
        {representative ? (
          <Badge variant="outline">
            <Trans>Selecție reprezentativă</Trans>
          </Badge>
        ) : null}

        {hasMixedComparisonLevels(series) ? (
          <p className="text-xs text-muted-foreground">
            <Trans>
              Valori absolute — nivelurile teritoriale nu sunt normalizate per
              locuitor.
            </Trans>
          </p>
        ) : null}

        {emptyTerritoryNames.length > 0 ? (
          <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
            <Trans>
              Fără date raportate pentru: {emptyTerritoryNames.join(', ')}.
              Teritoriile rămân în comparație ca absențe, nu sunt eliminate pe
              tăcute.
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

        <ComparisonTable
          matrix={matrix}
          series={series}
          selectedPeriod={selectedPeriod}
        />

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
