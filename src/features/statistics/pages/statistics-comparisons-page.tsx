import { ComparisonDatasetError } from '../lib/comparison-dataset-error'
import { editSourcePin } from '../lib/source-selection'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { buildInsComparisonChartLink } from '@/lib/chart-links'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { InsDatasetDetails } from '@/schemas/ins'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import {
  useComparisonCountyLayer,
  useComparisonPeers,
  useComparisons,
  useComparisonTerritoryNames,
} from '../hooks/use-comparisons'
import {
  sourceMemberLabelKey,
  useSourceMemberLabels,
  type SourceMemberLookup,
} from '../hooks/use-dataset-detail'
import { MAX_COMPARISON_TERRITORIES } from '../lib/comparison-series'
import { parseComparisonToken } from '../lib/dataset-selection'
import type { NativeComparisonMatrix } from '../lib/native-comparison'
import {
  COMPARISON_EXAMPLE_PRESET,
  COMPARISON_PRESETS,
  COMPARISON_QUICK_INDICATORS,
} from '../lib/comparison-presets'
import { comparisonPlaceName } from '../lib/comparison-format'
import {
  changeLine,
  chartableRun,
  defaultComparisonView,
  defaultComparisonWindow,
  lineValues,
  rankStandings,
  resolveComparisonView,
  resolveComparisonWindow,
  type ComparisonView,
  type ComparisonWindow,
} from '../lib/comparison-view'
import { HUB_EXAMPLE_PLACES } from '../lib/landing-constants'
import {
  formatHubChange,
  formatHubPeriod,
  formatHubValue,
  hubChange,
  hubUnitOf,
  hubUnitWord,
  isAdditiveUnit,
  sharedDecimals,
} from '../lib/hub-format'
import { periodicityLabel } from '../lib/periodicity-labels'
import { statisticsTheme } from '../lib/statistics-theme'
import { COMPARISON_PALETTE_CLASS, comparisonSeriesColor, comparisonSeriesHex } from '../components/comparison-palette'
import { ComparisonLinesChart } from '../components/comparison-lines-chart'
import { ComparisonMapBand } from '../components/comparison-map-band'
import { ComparisonPins } from '../components/comparison-pins'
import type { ComparisonPlaceSuggestion } from '../components/comparison-pickers'
import { ComparisonRail } from '../components/comparison-rail'
import {
  ComparisonErrorState,
  ComparisonGuide,
  ComparisonNoData,
  ComparisonSkeleton,
} from '../components/comparison-states'
import { ComparisonStandings, type ComparisonStandingRow } from '../components/comparison-standings'
import { ComparisonTable } from '../components/comparison-table'
import { DetailSourceLine } from '../components/detail-source-line'
import { StatisticsBackLink } from '../components/statistics-back-link'
import { HubIndicatorToggle } from '../components/hub/hub-county-rank'

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
 * window, view and period are local projections of it. The county map is one
 * more read of the same cell at the window's end. With nothing in the URL the
 * page runs a live worked example, marked as one; any edit adopts it.
 */
export function StatisticsComparisonsPage() {
  const search = useSearch({ from: '/ins/comparatii/' })
  const navigate = useNavigate({ from: '/ins/comparatii/' })
  const { i18n } = useLingui()
  const [activeCode, setActiveCode] = useState<string>()

  const patchSearch = useCallback(
    (patch: Partial<StatisticsComparisonsSearch>, options: { readonly replace?: boolean } = {}) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace: options.replace ?? true,
      })
    },
    [navigate],
  )

  const exampleMode = Object.values(search).every((value) => value === undefined)
  const effectiveSearch = exampleMode ? COMPARISON_EXAMPLE_PRESET.search : search

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
    refetchObservations,
    effectivePins,
    unresolvedDimensionLabels,
    requestedWindow,
    prepared,
    refreshing,
    tokens,
    hasDataset,
  } = useComparisons(effectiveSearch)

  const peers = useComparisonPeers(tokens)
  const resolvedNames = useComparisonTerritoryNames(tokens, matrix)

  // ---------------------------------------------------------------------------
  // Who is compared: names, kinds and colours, in selection order.

  const territories = useMemo(() => {
    const nameByCode = new Map((matrix?.rows ?? []).map((row) => [row.code, row.name] as const))
    return tokens.slice(0, MAX_COMPARISON_TERRITORIES).map((entry, index) => {
      const raw = nameByCode.get(entry.code) ?? resolvedNames.get(entry.code) ?? entry.code
      const place =
        entry.level === 'NATIONAL'
          ? { name: t`România`, kind: t`țară` }
          : entry.level === 'NUTS3'
            ? { name: countyNameRo(entry.code) ?? comparisonPlaceName(raw).name, kind: t`județ` }
            : (({ name, kind }) => ({ name, kind: kind ?? t`localitate` }))(comparisonPlaceName(raw))
      return { ...entry, ...place, color: comparisonSeriesColor(index), hex: comparisonSeriesHex(index) }
    })
  }, [matrix, tokens, resolvedNames])

  // ---------------------------------------------------------------------------
  // The rows' numbers, the window, the unit and the view.

  const periods = useMemo(() => matrix?.periods.map((period) => period.isoPeriod) ?? [], [matrix])
  const lines = useMemo(
    () =>
      new Map(
        (matrix?.rows ?? []).map((row) => [row.code, row.availability === 'SERIES' ? lineValues(row.cells, periods) : null] as const),
      ),
    [matrix, periods],
  )
  // The compared territories' lines only: while a removal loads, the reading
  // on screen still holds the removed one.
  const seriesLines = useMemo(
    () =>
      territories.flatMap((territory) => {
        const values = lines.get(territory.code)
        return values ? [values] : []
      }),
    [territories, lines],
  )
  const range = useMemo(
    () => resolveComparisonWindow(periods, { from: requestedWindow.from, to: requestedWindow.to }, defaultComparisonWindow(seriesLines)),
    [periods, requestedWindow.from, requestedWindow.to, seriesLines],
  )
  const unitRow = matrix?.observations.find((row) => row.unit.code === matrix.sharedSelection.unitate)?.unit
  const unit = hubUnitOf({ unitSymbol: unitRow?.symbol ?? null, unitCode: unitRow?.code ?? null, unitNameRo: unitRow?.name_ro ?? null })
  const unitLabel = unitRow ? (unitRow.name_ro ?? unitRow.symbol ?? null) : null
  const comparedLevels = territories.filter((territory) => lines.get(territory.code)).map((territory) => territory.level)
  const view = resolveComparisonView(search.vedere, defaultComparisonView(comparedLevels, unit))
  const mixedLevels = new Set(comparedLevels).size > 1
  const windowFrom = range ? (periods[range.from] ?? null) : null
  const windowTo = range ? (periods[range.to] ?? null) : null
  const county = useComparisonCountyLayer(prepared, windowTo)
  // An end the URL names that the axis cannot use is said, not silently swapped.
  const unusedPeriods = [requestedWindow.from, requestedWindow.to].filter(
    (period): period is string => period !== undefined && period !== windowFrom && period !== windowTo,
  )

  // ---------------------------------------------------------------------------
  // Writing the selection back to the URL. While the example shows, an edit
  // edits the example: its dataset and territories become the reader's own.

  const exampleSelection = exampleMode
    ? { cod: COMPARISON_EXAMPLE_PRESET.search.cod, teritorii: COMPARISON_EXAMPLE_PRESET.search.teritorii }
    : {}
  // The URL's own entries, a malformed one included: an edit here is not a
  // repair of another entry, which stays for the reader (or the reset) to fix.
  const rawTerritories = (): readonly unknown[] => {
    const raw = exampleMode ? COMPARISON_EXAMPLE_PRESET.search.teritorii : search.teritorii
    return Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  }
  const materialized = () => ({
    ...exampleSelection,
    clasificari:
      search.clasificari !== undefined
        ? search.clasificari
        : effectivePins.length
          ? effectivePins.map((pin) => `${pin.typeCode}:${pin.valueCode}`)
          : undefined,
    unitate: search.unitate !== undefined ? search.unitate : (unitCode ?? undefined),
    frecventa: search.frecventa !== undefined ? search.frecventa : (cadence ?? undefined),
  })

  const selectDataset = (code: string) => {
    // Coordinates, window and view belong to the previous dataset.
    patchSearch(
      {
        ...exampleSelection,
        cod: code,
        clasificari: undefined,
        unitate: undefined,
        frecventa: undefined,
        perioada: undefined,
        din: undefined,
        vedere: undefined,
      },
      { replace: false },
    )
  }
  const addTerritory = (token: string) => {
    if (tokens.some((entry) => entry.token === token) || tokens.length >= MAX_COMPARISON_TERRITORIES) return
    patchSearch({ ...exampleSelection, teritorii: [...rawTerritories(), token] }, { replace: false })
  }
  const removeTerritory = (token: string) => {
    const next = rawTerritories().filter((raw) => parseComparisonToken(raw)?.token !== token)
    patchSearch({ ...exampleSelection, teritorii: next.length > 0 ? next : undefined }, { replace: false })
  }
  const pinClassification = (typeCode: string, valueCode: string | null) => {
    const current = materialized()
    patchSearch({ ...current, clasificari: editSourcePin(current.clasificari, typeCode, valueCode) })
  }
  const changeWindow = (next: ComparisonWindow) =>
    patchSearch({ ...exampleSelection, din: periods[next.from], perioada: periods[next.to] })
  const changeView = (next: ComparisonView) => patchSearch({ ...exampleSelection, vedere: next })

  // ---------------------------------------------------------------------------
  // The series' own coordinates, by name.

  const unitDimension = datasetMeta?.dimensions.find((dimension) => dimension.type === 'UNIT_OF_MEASURE')
  const rowLabels = useMemo(() => {
    const labels = new Map<string, string>()
    for (const row of matrix?.observations ?? []) {
      for (const member of row.classifications) {
        const name = member.name_ro?.trim()
        const dimension = datasetMeta?.dimensions.find((entry) => `D${entry.index}` === member.type_code)
        if (name && dimension) labels.set(sourceMemberLabelKey({ dimensionIndex: dimension.index, code: member.code, kind: 'classification' }), name)
      }
      const unitName = row.unit.name_ro?.trim() || row.unit.symbol?.trim()
      if (unitName && unitDimension) labels.set(sourceMemberLabelKey({ dimensionIndex: unitDimension.index, code: row.unit.code, kind: 'unit' }), unitName)
    }
    return labels
  }, [matrix, datasetMeta, unitDimension])
  const pinLookups: SourceMemberLookup[] = [
    ...effectivePins.flatMap((pin) => {
      const dimension = datasetMeta?.dimensions.find((entry) => `D${entry.index}` === pin.typeCode)
      return dimension ? [{ dimensionIndex: dimension.index, code: pin.valueCode, kind: 'classification' as const }] : []
    }),
    ...(unitCode && unitDimension ? [{ dimensionIndex: unitDimension.index, code: unitCode, kind: 'unit' as const }] : []),
  ]
  const axisLabels = useSourceMemberLabels({
    datasetCode: datasetMeta?.code ?? '',
    // Held back only while rows are on their way; with the selection still
    // incomplete no rows will come, and the pins would print as codes.
    lookups: observationsLoading ? [] : pinLookups.filter((lookup) => !rowLabels.has(sourceMemberLabelKey(lookup))),
  })
  const memberLabel = (lookup: SourceMemberLookup) =>
    rowLabels.get(sourceMemberLabelKey(lookup)) ?? axisLabels.get(sourceMemberLabelKey(lookup)) ?? lookup.code
  const detailsSummary = [
    ...pinLookups.map((lookup) => {
      // The unit as the rest of the page says it („persoane"), where it has a word for it.
      if (lookup.kind === 'unit') return unit === 'percent' ? t`procente` : unit === 'other' || !hubUnitWord(unit, unitLabel) ? memberLabel(lookup) : hubUnitWord(unit, unitLabel)
      const dimension = datasetMeta?.dimensions.find((entry) => entry.index === lookup.dimensionIndex)
      return `${dimension?.label_ro?.trim() || `D${lookup.dimensionIndex}`}: ${memberLabel(lookup)}`
    }),
    ...(cadence ? [periodicityLabel(cadence)] : []),
  ].join(' · ')

  // ---------------------------------------------------------------------------
  // The rail.

  const quick = COMPARISON_QUICK_INDICATORS.find((entry) => entry.code === datasetMeta?.code)
  const localities = datasetMeta?.has_uat_data ?? true
  const indicator = {
    code: typeof effectiveSearch.cod === 'string' ? effectiveSearch.cod : undefined,
    name: datasetMeta ? (quick ? i18n._(quick.label) : (datasetMeta.name_ro ?? datasetMeta.code)) : null,
    meta: datasetMeta ? (localities ? datasetMeta.code : `${datasetMeta.code} · ${t`doar județe`}`) : null,
  }
  // Built once per selection: the chart document carries timestamps, and a
  // fresh one on every render would give the link a new address each time.
  const indicatorName = indicator.name
  const chart = useMemo(() => {
    if (!matrix || !range || !cadence || !isInsChartPeriodicity(cadence) || !unitCode) return null
    const series = territories.flatMap((territory) => {
      const values = lines.get(territory.code)
      const run = values ? chartableRun(values, range) : null
      const from = run ? periods[run.from] : undefined
      const to = run ? periods[run.to] : undefined
      return from && to ? [{ code: territory.code, level: territory.level, label: territory.name, color: territory.hex, from, to }] : []
    })
    if (series.length === 0) return null
    return buildInsComparisonChartLink({
      datasetCode: matrix.descriptor.code,
      title: indicatorName ?? matrix.descriptor.code,
      cadence,
      unitCode,
      classificationPins: matrix.sharedSelection.clasificari,
      series,
    })
  }, [matrix, range, cadence, unitCode, territories, lines, periods, indicatorName])

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
      onRemove={removeTerritory}
      details={
        datasetMeta && !exampleMode
          ? {
              summary: detailsSummary || t`Alege coordonatele seriei`,
              defaulted: search.clasificari === undefined && search.unitate === undefined && search.frecventa === undefined,
              defaultOpen: unresolvedDimensionLabels.length > 0 || issues.length > 0,
              content: (
                <div className="space-y-3">
                  <ComparisonPins
                    datasetMeta={datasetMeta}
                    effectivePins={effectivePins}
                    unitCode={unitCode}
                    cadence={cadence}
                    memberLabel={memberLabel}
                    onPinClassification={pinClassification}
                    onPinUnit={(next) => patchSearch({ ...materialized(), unitate: next ?? undefined })}
                    // Another frequency is another period axis: the window's ends do not carry over.
                    onPinCadence={(next) => patchSearch({ ...materialized(), frecventa: next, din: undefined, perioada: undefined })}
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
          <div className="min-w-0 space-y-6">{renderResults()}</div>
        </div>

        <div className="lg:hidden">{presets}</div>
      </div>
    </div>
  )

  function renderResults() {
    if (issues.length > 0)
      return (
        <div role="alert" className={cn(statisticsTheme.band, 'space-y-3 p-4 text-sm')}>
          <p>
            <Trans>Selecția din adresă nu este validă. Corectează teritoriile, coordonatele, unitatea sau perioada.</Trans>
          </p>
          <pre className="overflow-auto rounded-sm bg-muted/60 p-2 text-xs">{JSON.stringify(effectiveSearch, null, 2)}</pre>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                patchSearch({ clasificari: undefined, unitate: undefined, frecventa: undefined, perioada: undefined, din: undefined, vedere: undefined })
              }
            >
              <Trans>Resetează selecția sursei</Trans>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void navigate({ search: {}, replace: false })}>
              <Trans>Resetează comparația</Trans>
            </Button>
          </div>
        </div>
      )

    if (!hasDataset)
      return (
        <ComparisonGuide title={<Trans>Alege un indicator</Trans>}>
          <Trans>Ce vrei să compari? Alege unul dintre indicatorii de mai jos sau caută în „Selecție".</Trans>
          <GuideChoices
            choices={COMPARISON_QUICK_INDICATORS.map((entry) => ({ key: entry.code, label: i18n._(entry.label) }))}
            onChoose={selectDataset}
          />
        </ComparisonGuide>
      )

    if (tokens.length === 0)
      return (
        <ComparisonGuide title={<Trans>Adaugă teritorii</Trans>}>
          <Trans>Alege locurile pe care le compari — o localitate, un județ, țara — până la șase.</Trans>
          <GuideChoices
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

    return results(range, matrix, datasetMeta)
  }

  function results(range: ComparisonWindow, loaded: NativeComparisonMatrix, meta: InsDatasetDetails) {
    const from = windowFrom ?? ''
    const to = windowTo ?? ''
    const windowPeriods = periods.slice(range.from, range.to + 1)
    const dataset = meta.code

    const rows: ComparisonStandingRow[] = territories.map((territory) => {
      const row = loaded.rows.find((entry) => entry.code === territory.code)
      const values = lines.get(territory.code) ?? null
      const start = values?.[range.from] ?? null
      const end = values?.[range.to] ?? null
      return {
        code: territory.code,
        token: territory.token,
        level: territory.level,
        name: territory.name,
        kind: territory.kind,
        color: territory.color,
        // A territory just added has no row until its read lands.
        availability: row?.availability ?? (refreshing ? 'PENDING' : 'EMPTY'),
        from: start,
        to: end,
        change: start !== null && end !== null ? hubChange(start, end, unit) : null,
        detailSearch: {
          teritoriu: territory.level === 'LAU' ? `siruta:${territory.code}` : `cod:${territory.code}`,
          ...(row?.sourceSelection ?? loaded.sharedSelection),
          ...(cadence ? { frecventa: cadence } : {}),
          din: Number(from.slice(0, 4)),
          pana: Number(to.slice(0, 4)),
        },
      }
    })

    const chartLines = territories.flatMap((territory) => {
      const values = lines.get(territory.code)
      if (!values) return []
      const shown = view === 'schimbare' ? changeLine(values, values[range.from] ?? null, unit) : values
      return [{ code: territory.code, label: territory.name, color: territory.color, values: shown.slice(range.from, range.to + 1) }]
    })
    const digits = sharedDecimals(seriesLines.flatMap((values) => values.filter((value): value is number => value !== null)))
    const unitWord = hubUnitWord(unit, unitLabel)
    const withoutBase = view === 'schimbare' ? rows.filter((row) => row.availability === 'SERIES' && row.from === null) : []

    const mapSelection = {
      colors: new Map(territories.filter((territory) => territory.level === 'NUTS3').map((territory) => [territory.code, territory.color])),
      canAdd: territories.length < MAX_COMPARISON_TERRITORIES,
      onToggle: (code: string) => {
        const token = `cod:${code}`
        if (tokens.some((entry) => entry.token === token)) removeTerritory(token)
        else addTerritory(token)
      },
    }

    return (
      <>
        <section aria-labelledby="comparison-result-title" aria-busy={refreshing} className={statisticsTheme.band}>
          <div className={statisticsTheme.bandHeader}>
            <h2 id="comparison-result-title" className={statisticsTheme.sectionLabel}>
              <Trans>Rezultat</Trans>
            </h2>
            <MonoLabel className="text-muted-foreground">
              {[unitWord === '%' ? t`procente` : unitWord, cadence ? periodicityLabel(cadence) : null].filter(Boolean).join(' · ')}
            </MonoLabel>
          </div>

          <div className={cn(statisticsTheme.bandBody, 'transition-opacity', refreshing && 'opacity-60')}>
            {unusedPeriods.length > 0 ? (
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                <Trans>
                  Adresa cere {unusedPeriods.map(formatHubPeriod).join(', ')}, fără loc în seria aceasta; comparația arată{' '}
                  {formatHubPeriod(from)}–{formatHubPeriod(to)}.
                </Trans>
              </p>
            ) : null}
            <ComparisonStandings
              datasetCode={dataset}
              rows={rankStandings(rows, view)}
              periods={periods}
              window={range}
              unit={unit}
              unitLabel={unitLabel}
              onWindowChange={changeWindow}
              onActiveChange={setActiveCode}
            />
          </div>

          {chartLines.length > 0 ? (
            <div className={cn('border-t border-border/70 px-4 pb-5 pt-4 transition-opacity md:px-5', refreshing && 'opacity-60')}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                  {view === 'schimbare' ? (
                    <Trans>Cât a crescut sau a scăzut fiecare loc față de {formatHubPeriod(from)}.</Trans>
                  ) : mixedLevels && isAdditiveUnit(unit) ? (
                    <Trans>Locurile au mărimi diferite: schimbarea le compară mai bine decât valorile.</Trans>
                  ) : (
                    <Trans>Valorile publicate, perioadă cu perioadă.</Trans>
                  )}
                </p>
                <HubIndicatorToggle
                  label={t`Ce arată graficul`}
                  value={view}
                  onChange={changeView}
                  options={[
                    { key: 'valori', label: t`Valori` },
                    { key: 'schimbare', label: t`Schimbare` },
                  ]}
                />
              </div>
              <ComparisonLinesChart
                label={
                  view === 'schimbare'
                    ? t`${indicator.name ?? dataset}, schimbarea față de ${formatHubPeriod(from)}`
                    : t`${indicator.name ?? dataset}, ${formatHubPeriod(from)}–${formatHubPeriod(to)}`
                }
                periods={windowPeriods}
                lines={chartLines}
                zero={view === 'schimbare'}
                // Only a territory with a line to bring forward; a row without one would fade them all.
                highlight={chartLines.some((line) => line.code === activeCode) ? activeCode : undefined}
                format={(value) =>
                  view === 'schimbare'
                    ? formatHubChange(value, unit)
                    : (({ value: figure, unit: word }) => (word && word !== '%' ? `${figure} ${word}` : figure))(
                        formatHubValue(value, unit, unitLabel, { digits }),
                      )
                }
                formatTick={(tick) =>
                  view === 'schimbare'
                    ? formatHubChange(tick, unit, sharedDecimals([tick]))
                    : formatHubValue(tick, unit, unitLabel, { compact: true, digits: sharedDecimals([tick]) }).value
                }
              />
              {withoutBase.length > 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  <Trans>
                    Fără valoare în {formatHubPeriod(from)}, deci fără schimbare: {withoutBase.map((row) => row.name).join(', ')}.
                  </Trans>
                </p>
              ) : null}
            </div>
          ) : null}

          <Collapsible className="border-t border-border/70">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5">
              <Trans>Toate valorile, perioadă cu perioadă</Trans>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ComparisonTable
                matrix={loaded}
                series={territories.map((territory) => ({ code: territory.code, label: territory.name, color: territory.color, level: territory.level }))}
                selectedPeriod={to}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-5">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={statisticsTheme.provenanceChip}>{dataset}</span>
              <DetailSourceLine datasetCode={dataset} sourceLastUpdate={meta.source_last_update ?? null} />
            </span>
            {chart ? (
              <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5 self-start sm:self-auto">
                <Link {...chart}>
                  <Trans>Deschide în Grafice</Trans>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        {meta.has_county_data ? (
          <ComparisonMapBand
            layer={county.data}
            label={indicator.name ?? dataset}
            selection={mapSelection}
            loading={county.isPending}
            stale={county.isPlaceholderData}
            failed={county.isError}
            onRetry={() => void county.refetch()}
          />
        ) : null}
      </>
    )
  }
}

/** The one-tap answers a guide offers. */
function GuideChoices({
  choices,
  onChoose,
}: {
  readonly choices: readonly { readonly key: string; readonly label: string }[]
  readonly onChoose: (key: string) => void
}) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {choices.map((choice) => (
        <li key={choice.key}>
          <button
            type="button"
            onClick={() => onChoose(choice.key)}
            className="inline-flex min-h-9 items-center rounded-md border border-border/70 bg-background px-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {choice.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
