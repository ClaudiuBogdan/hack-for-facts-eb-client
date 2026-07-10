import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import { useComparisons } from '../hooks/use-comparisons'
import { MAX_COMPARISON_TERRITORIES, upsertClassificationPin } from '../lib/comparison-series'
import { ComparisonBarChart } from '../components/comparison-bar-chart'
import { comparisonSeriesColor } from '../components/comparison-palette'
import type { ComparisonSeriesDescriptor } from '../lib/comparison-format'
import { ComparisonDatasetPicker } from '../components/comparison-dataset-picker'
import { ComparisonLineChart } from '../components/comparison-line-chart'
import { ComparisonPeriodSelect, ComparisonPins } from '../components/comparison-pins'
import {
  ComparisonErrorState,
  ComparisonGuidedEmptyState,
  ComparisonNoData,
  ComparisonPartialNotice,
  ComparisonSkeleton,
} from '../components/comparison-states'
import { ComparisonTable } from '../components/comparison-table'
import { ComparisonTerritoryPicker } from '../components/comparison-territory-picker'

/**
 * Local comparisons: one INS indicator across two to six territories.
 *
 * Every control writes to the URL and reads back from it, so the page is fully
 * deep-linkable. Exactly one `insObservations` request backs the whole view —
 * see `use-comparisons.ts` for how the period stays out of the query key.
 */
export function StatisticsComparisonsPage() {
  const search = useSearch({ from: '/statistici/comparatii/' })
  const navigate = useNavigate({ from: '/statistici/comparatii/' })

  const patchSearch = useCallback(
    (patch: Partial<StatisticsComparisonsSearch>) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace: true,
      })
    },
    [navigate],
  )

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
    sirutaCodes,
    hasDataset,
    hasEnoughTerritories,
  } = useComparisons(search)

  // Colour follows the entity: the slot is the territory's position in the
  // URL's `teritorii`, so removing a chip never repaints the others.
  const series: readonly ComparisonSeriesDescriptor[] = useMemo(() => {
    const nameBySiruta = new Map(
      (matrix?.rows ?? []).map((row) => [row.siruta, row.name] as const),
    )

    return sirutaCodes.slice(0, MAX_COMPARISON_TERRITORIES).map((siruta, index) => ({
      siruta,
      label: nameBySiruta.get(siruta) ?? siruta,
      color: comparisonSeriesColor(index),
    }))
  }, [matrix, sirutaCodes])

  const labelBySiruta = useMemo(
    () => new Map(series.map((entry) => [entry.siruta, entry.label])),
    [series],
  )

  const handleSelectDataset = (code: string) => {
    // Pins belong to the previous dataset's dimensions; carrying them over
    // would filter the new dataset by codes it does not have.
    patchSearch({ cod: code, clasificari: undefined, unitate: undefined, perioada: undefined })
  }

  const handleAddTerritory = (siruta: string) => {
    if (sirutaCodes.includes(siruta) || sirutaCodes.length >= MAX_COMPARISON_TERRITORIES) return
    patchSearch({ teritorii: [...sirutaCodes, siruta] })
  }

  const handleRemoveTerritory = (siruta: string) => {
    const next = sirutaCodes.filter((code) => code !== siruta)
    patchSearch({ teritorii: next.length > 0 ? next : undefined })
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            <Trans>Comparații locale</Trans>
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <Trans>
              Compară un indicator INS Tempo între două și șase localități. Perioadele fără date
              raportate rămân goale — nu sunt completate cu valori din alți ani.
            </Trans>
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-6">
            <ComparisonDatasetPicker
              selectedCode={search.cod}
              selectedLabel={datasetMeta?.nameRo ?? null}
              onSelect={handleSelectDataset}
            />

            <ComparisonTerritoryPicker
              selected={sirutaCodes}
              labelBySiruta={labelBySiruta}
              onAdd={handleAddTerritory}
              onRemove={handleRemoveTerritory}
              onClear={() => patchSearch({ teritorii: undefined })}
            />

            {datasetMeta ? (
              <ComparisonPins
                datasetMeta={datasetMeta}
                effectivePins={effectivePins}
                unitCode={search.unitate}
                onPinClassification={handlePinClassification}
                onPinUnit={(unitCode) => patchSearch({ unitate: unitCode, perioada: undefined })}
              />
            ) : null}

            {datasetError ? (
              <p className="text-sm text-destructive">
                <Trans>Nu am putut încărca detaliile indicatorului.</Trans>
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4">{results}</div>
        </div>
      </div>
    </main>
  )

  function renderResults() {
    if (!hasDataset || !hasEnoughTerritories) {
      return (
        <ComparisonGuidedEmptyState
          hasDataset={hasDataset}
          selectedCount={sirutaCodes.length}
        />
      )
    }

    if (observationsError) {
      return (
        <ComparisonErrorState onRetry={refetchObservations} isRetrying={observationsFetching} />
      )
    }

    if (datasetLoading || observationsLoading || !matrix) {
      return <ComparisonSkeleton />
    }

    if (matrix.periods.length === 0) {
      return <ComparisonNoData />
    }

    return (
      <>
        {partial ? <ComparisonPartialNotice /> : null}

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
