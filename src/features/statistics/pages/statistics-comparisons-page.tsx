import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Button } from '@/components/ui/button'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { COMPARISON_PALETTE_CLASS } from '../components/comparison-palette'
import { ComparisonMapBand } from '../components/comparison-map-band'
import type { ComparisonPlaceSuggestion } from '../components/comparison-pickers'
import { ComparisonPins } from '../components/comparison-pins'
import { ComparisonRail } from '../components/comparison-rail'
import { ComparisonResultBand } from '../components/comparison-result-band'
import {
  ComparisonErrorState,
  ComparisonGuide,
  ComparisonGuideChoices,
  ComparisonNoData,
  ComparisonSkeleton,
} from '../components/comparison-states'
import { StatisticsBackLink } from '../components/statistics-back-link'
import { useComparisonMemberLabels } from '../hooks/use-comparison-member-labels'
import { useComparisonReading } from '../hooks/use-comparison-reading'
import { useComparisonSearch } from '../hooks/use-comparison-search'
import { useComparisonCountyLayer, useComparisonDataset, useComparisonPeers, useComparisons } from '../hooks/use-comparisons'
import { ComparisonDatasetError } from '../lib/comparison-dataset-error'
import { COMPARISON_EXAMPLE_PRESET, COMPARISON_PRESETS, COMPARISON_QUICK_INDICATORS } from '../lib/comparison-presets'
import { editComparisonSearch, type ComparisonSearchEdit } from '../lib/comparison-search-edits'
import { MAX_COMPARISON_TERRITORIES } from '../lib/comparison-territories'
import { HUB_EXAMPLE_PLACES } from '../lib/landing-constants'
import { statisticsTheme } from '../lib/statistics-theme'

/**
 * „Compară teritorii": one INS indicator across up to six places — localities,
 * counties and the country — set up in a few choices and answered on the
 * page: each place at the start and end of a window with the change between
 * them, the history as lines, and every county on a map. The deeper work
 * (more series, annotations, export) happens in the chart page it hands the
 * same series to.
 *
 * The data contract is unchanged: ONE `insObservations` read per selection
 * (`use-comparisons.ts`), every row validated as a single native series;
 * window, view and period are local projections of it (`use-comparison-reading`).
 * The county map is one more read of the same cell at the window's end. With
 * nothing in the URL the page runs a live worked example, marked as one; any
 * edit adopts it (`comparison-search-edits`). This component routes between
 * the states and lays the page out; the answer itself is `ComparisonResultBand`.
 */
export function StatisticsComparisonsPage() {
  const { i18n } = useLingui()
  const { search, exampleMode, effectiveSearch, apply, reset } = useComparisonSearch()
  const comparisons = useComparisons(effectiveSearch)
  const {
    datasetLoading,
    datasetError,
    matrix,
    observationsLoading,
    observationsError,
    observationsFetching,
    issues,
    unitCode,
    cadence,
    refetchObservations,
    effectivePins,
    unresolvedDimensionLabels,
    requestedWindow,
    prepared,
    refreshing,
    tokens,
    datasetCode,
    hasDataset,
  } = comparisons

  // The dataset on its own, read when the comparison's read cannot name it:
  // with `cod` alone (no territories yet) or after that read failed, the
  // rail still says which indicator this is and whether it has localities.
  const datasetQuery = useComparisonDataset(datasetCode, {
    enabled: comparisons.datasetMeta === null && !datasetLoading,
  })
  const datasetMeta = comparisons.datasetMeta ?? datasetQuery.data ?? null

  const peers = useComparisonPeers(tokens)
  const reading = useComparisonReading({ tokens, matrix, requestedWindow, requestedView: search.vedere })
  const { territories, periods, range, unit, unitLabel, windowTo } = reading
  const county = useComparisonCountyLayer(prepared, windowTo)
  const { memberLabel, detailsSummary } = useComparisonMemberLabels({
    datasetMeta,
    matrix,
    effectivePins,
    unitCode,
    cadence,
    unit,
    unitLabel,
    observationsLoading,
  })

  // Every change of the selection is one edit, written through the router
  // once; while the example shows, the edit adopts it first.
  const edit = (change: ComparisonSearchEdit) =>
    apply(
      editComparisonSearch(
        {
          search,
          example: exampleMode ? COMPARISON_EXAMPLE_PRESET.search : null,
          tokens,
          effectivePins,
          unitCode,
          cadence,
          periods,
        },
        change,
      ),
    )
  const selectDataset = (code: string) => edit({ kind: 'dataset', code })
  const addTerritory = (token: string) => edit({ kind: 'add-territory', token })

  // ---------------------------------------------------------------------------
  // The rail.

  const quick = COMPARISON_QUICK_INDICATORS.find((entry) => entry.code === datasetMeta?.code)
  const localities = datasetMeta?.has_uat_data ?? true
  const indicator = {
    code: datasetCode || undefined,
    name: datasetMeta ? (quick ? i18n._(quick.label) : (datasetMeta.name_ro ?? datasetMeta.code)) : null,
    meta: datasetMeta ? (localities ? datasetMeta.code : `${datasetMeta.code} · ${t`doar județe`}`) : null,
  }

  const suggestions: ComparisonPlaceSuggestion[] = []
  for (const suggestion of [
    ...peers.map((peer) =>
      peer.token === 'cod:RO'
        ? { token: peer.token, label: t`România`, kind: t`țară` }
        : { token: peer.token, label: countyNameRo(peer.token.slice(4)) ?? peer.label, kind: t`județ` },
    ),
    ...(tokens.some((entry) => entry.level === 'NATIONAL') || peers.length > 0 ? [] : [{ token: 'cod:RO', label: t`România`, kind: t`țară` }]),
    ...(localities ? HUB_EXAMPLE_PLACES.map((place) => ({ token: `siruta:${place.siruta}`, label: place.name, kind: t`municipiu` })) : []),
  ]) {
    if (!suggestions.some((entry) => entry.token === suggestion.token)) suggestions.push(suggestion)
  }

  const rail = (
    <ComparisonRail
      example={exampleMode}
      indicator={indicator}
      onSelectIndicator={selectDataset}
      territories={territories}
      suggestions={suggestions}
      localities={localities}
      onAdd={addTerritory}
      onRemove={(token) => edit({ kind: 'remove-territory', token })}
      // The series' coordinates are the comparison's own: only once its read
      // has resolved them. Pinned before the first territory, one axis would
      // be an explicit selection that suppresses every default of the others.
      details={
        comparisons.datasetMeta && !exampleMode
          ? {
              summary: detailsSummary || t`Alege coordonatele seriei`,
              defaulted: search.clasificari === undefined && search.unitate === undefined && search.frecventa === undefined,
              defaultOpen: unresolvedDimensionLabels.length > 0 || issues.length > 0,
              content: (
                <div className="space-y-3">
                  <ComparisonPins
                    datasetMeta={comparisons.datasetMeta}
                    effectivePins={effectivePins}
                    unitCode={unitCode}
                    cadence={cadence}
                    memberLabel={memberLabel}
                    onPinClassification={(typeCode, valueCode) => edit({ kind: 'pin-classification', typeCode, valueCode })}
                    onPinUnit={(next) => edit({ kind: 'pin-unit', unitCode: next })}
                    onPinCadence={(next) => edit({ kind: 'pin-cadence', cadence: next })}
                  />
                </div>
              ),
            }
          : null
      }
    />
  )

  const presets = (
    <nav aria-labelledby="comparison-presets-title" className="px-1">
      <MonoLabel id="comparison-presets-title" className="block text-muted-foreground">
        <Trans>Comparații gata făcute</Trans>
      </MonoLabel>
      <ul className="mt-2 space-y-0.5">
        {COMPARISON_PRESETS.map((preset) => (
          <li key={preset.id}>
            <Link
              to="/ins/comparatii"
              search={preset.search}
              className="inline-flex min-h-9 items-center text-sm text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {i18n._(preset.title)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )

  // ---------------------------------------------------------------------------
  // Which state the results area is in. Each is a different question to the
  // reader, so each has its own answer — never an empty chart shell.

  const quickChoices = COMPARISON_QUICK_INDICATORS.map((entry) => ({ key: entry.code, label: i18n._(entry.label) }))
  const results = () => {
    // An indicator INS publishes for the country alone has nothing to
    // compare between places: a fact about the indicator, not a broken
    // address — known from the dataset alone, before any territory.
    if (
      issues.includes('non-territorial') ||
      (datasetMeta !== null && !datasetMeta.dimensions.some((dimension) => dimension.type === 'TERRITORIAL'))
    )
      return (
        <ComparisonGuide title={<Trans>Indicator fără teritorii</Trans>}>
          <Trans>
            INS publică acest indicator doar la nivel național, deci nu are ce compara între teritorii. Alege un indicator cu
            date pe județe.
          </Trans>
          <ComparisonGuideChoices choices={quickChoices} onChoose={selectDataset} />
        </ComparisonGuide>
      )

    if (issues.length > 0)
      return (
        <div role="alert" className={cn(statisticsTheme.band, 'space-y-3 p-4 text-sm')}>
          <p>
            <Trans>Selecția din adresă nu este validă. Corectează teritoriile, coordonatele, unitatea sau perioada.</Trans>
          </p>
          <pre className="overflow-auto rounded-sm bg-muted/60 p-2 text-xs">{JSON.stringify(effectiveSearch, null, 2)}</pre>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => edit({ kind: 'reset-source' })}>
              <Trans>Resetează selecția sursei</Trans>
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              <Trans>Resetează comparația</Trans>
            </Button>
          </div>
        </div>
      )

    if (!hasDataset)
      return (
        <ComparisonGuide title={<Trans>Alege un indicator</Trans>}>
          <Trans>Ce vrei să compari? Alege unul dintre indicatorii de mai jos sau caută în „Selecție".</Trans>
          <ComparisonGuideChoices choices={quickChoices} onChoose={selectDataset} />
        </ComparisonGuide>
      )

    if (tokens.length === 0)
      return (
        <ComparisonGuide title={<Trans>Adaugă teritorii</Trans>}>
          <Trans>Alege locurile pe care le compari — o localitate, un județ, țara — până la șase.</Trans>
          <ComparisonGuideChoices
            choices={suggestions.map((suggestion) => ({ key: suggestion.token, label: suggestion.label }))}
            onChoose={addTerritory}
          />
        </ComparisonGuide>
      )

    if (datasetError instanceof ComparisonDatasetError)
      return (
        <div role="status" className={cn(statisticsTheme.band, 'p-4 text-sm')}>
          {datasetError.reason === 'UNKNOWN' ? (
            <Trans>Indicatorul nu a fost găsit. Alege un indicator din catalog.</Trans>
          ) : (
            <Trans>Indicatorul este în catalog, dar observațiile nu au fost încă publicate. Alege alt indicator.</Trans>
          )}
        </div>
      )

    if (observationsError || datasetError)
      return <ComparisonErrorState onRetry={refetchObservations} isRetrying={observationsFetching} />

    // Missing shared coordinates, unit or cadence hold the read until the
    // selection is complete; no unrelated source defaults fill the gaps.
    if (unresolvedDimensionLabels.length > 0)
      return (
        <div role="status" className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          <p>
            <Trans>Comparația pornește după ce alegi, în „Detaliile seriei", o valoare pentru:</Trans>
          </p>
          <ul className="mt-2 list-inside list-disc">
            {unresolvedDimensionLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )

    if (datasetLoading || observationsLoading || !matrix || !datasetMeta) return <ComparisonSkeleton />

    if (!range || matrix.rows.every((row) => row.availability === 'EMPTY')) return <ComparisonNoData />

    return (
      <>
        <ComparisonResultBand
          reading={reading}
          range={range}
          matrix={matrix}
          meta={datasetMeta}
          cadence={cadence}
          unitCode={unitCode}
          indicatorName={indicator.name}
          refreshing={refreshing}
          onWindowChange={(window) => edit({ kind: 'window', window })}
          onViewChange={(view) => edit({ kind: 'view', view })}
        />
        {datasetMeta.has_county_data ? (
          <ComparisonMapBand
            layer={county.data}
            label={indicator.name ?? datasetMeta.code}
            selection={{
              colors: new Map(territories.filter((territory) => territory.level === 'NUTS3').map((territory) => [territory.code, territory.color])),
              canAdd: territories.length < MAX_COMPARISON_TERRITORIES,
              onToggle: (code) => edit({ kind: 'toggle-territory', token: `cod:${code}` }),
            }}
            loading={county.isPending}
            stale={county.isPlaceholderData}
            failed={county.isError}
            onRetry={() => void county.refetch()}
          />
        ) : null}
      </>
    )
  }

  return (
    <div className={cn('min-h-screen bg-background', COMPARISON_PALETTE_CLASS)}>
      <div className={statisticsTheme.page}>
        <header className="space-y-3 border-b border-border/70 pb-6">
          <StatisticsBackLink to="/ins">
            <Trans>Înapoi la statistici</Trans>
          </StatisticsBackLink>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Trans>Compară teritorii</Trans>
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            <Trans>
              Un indicator INS pentru până la șase locuri — localități, județe sau toată țara: cum stau
              acum, cum s-au schimbat și unde se află printre județe.
            </Trans>
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          <div className="space-y-8">
            {rail}
            <div className="hidden lg:block">{presets}</div>
          </div>
          <div className="min-w-0 space-y-6">{results()}</div>
        </div>

        <div className="lg:hidden">{presets}</div>
      </div>
    </div>
  )
}
