import { editSourcePin } from '../lib/source-selection'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type {
  InsDatasetDetails,
  InsDimension,
  InsDimensionValue,
} from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch } from '@/schemas/statistics'
import {
  classificationTypeCode,
  datasetTerritoryLevels,
  dimensionsOfType,
  type DetailSearchPatch,
  type EffectiveScope,
} from '../lib/dataset-selection'
import { periodicityLabel } from '../lib/periodicity-labels'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../lib/statistics-theme'
import { DetailCadenceControl } from './detail-cadence-control'
import { DetailDimensionCombobox } from './detail-dimension-combobox'
import { DetailDimensionPanel } from './detail-dimension-panel'
import { DetailTerritoryControl } from './detail-territory-control'
import { DetailYearWindowControl, type YearSpan } from './detail-year-window-control'

/** How a segment's control is being asked to render itself. */
export interface ScopeControlOptions {
  /**
   * `panel` paints a desktop popover edge to edge — the chip already names
   * the axis, so the control opens straight onto its options. `field` is the
   * labelled, closed form the phone sheet stacks six of.
   */
  readonly variant: 'panel' | 'field'
  /** Close the surface the control is in, once a value has been chosen. */
  readonly onPicked: () => void
}

export interface ScopeSegment {
  readonly id: string
  /** The visible sentence text for this segment. */
  readonly text: string
  /** True when the value is a server-resolved default, not a URL pin. */
  readonly defaulted: boolean
  /** True when the dimension has NO effective value yet. */
  readonly unresolved?: boolean
  /** The control rendered in the popover / sheet. Null = display-only. */
  readonly control: ((options: ScopeControlOptions) => ReactNode) | null
  /** True when the control paints the popover itself and wants no padding. */
  readonly fills?: boolean
  /**
   * How wide the popover opens. `list` is the option panel, wide enough for
   * an INS member name; `form` is a control with a fixed shape, which in a
   * list-sized popover sat in a field of white.
   */
  readonly width?: 'list' | 'form'
  readonly controlLabel: string
}

type Props = {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  readonly canDerive: boolean
  /** Classification dimensions with NO effective value — the way out of an
   *  unresolved state lives here, so their segments always render. */
  readonly unresolvedDimensions: readonly InsDimension[]
  /** Display labels resolved from the fetched rows (never re-queried). */
  readonly territoryLabel: string
  readonly classificationLabels: ReadonlyMap<string, string>
  readonly unitLabel: string | null
  /** The years the series covers, from the rows fetched. Null before any. */
  readonly observedSpan: YearSpan | null
  /** The years on screen: the span narrowed by `?din`/`?pana`, if pinned. */
  readonly yearWindow: YearSpan | null
  readonly onChange: (patch: DetailSearchPatch) => void
  /**
   * How the DESKTOP surface renders. `chips` is the inline sentence; `rail`
   * stacks the same segments in a bordered column beside the figure, so
   * changing one axis never pushes the chart down the page. The rail only
   * has a column of its own from `lg`; between the phone sheet and that it
   * is the same rows laid out as a grid above the figure — stacked
   * full-width, seven rows of rail put the figure 800px down the page.
   *
   * The phone sheet is shared: six axes never become six popovers, whichever
   * shape the desktop takes.
   */
  readonly layout?: 'chips' | 'rail'
}

/**
 * Tier 1 — the scope sentence IS the control surface.
 *
 * Reads „România · total · anual · 2016–2025"; every segment opens its own
 * popover on desktop. On mobile the sentence opens ONE bottom sheet holding
 * every control (never four stacked popovers). Server-resolved defaults are
 * visibly marked and are NOT written into the URL until the user changes one.
 */
export function DetailScopeSentence({
  dataset,
  search,
  scope,
  canDerive,
  unresolvedDimensions,
  territoryLabel,
  classificationLabels,
  unitLabel,
  observedSpan,
  yearWindow,
  onChange,
  layout = 'chips',
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  // One open chip at a time, and controlled, so picking a value can close it.
  const [openSegment, setOpenSegment] = useState<string | null>(null)

  const segments = buildSegments({
    dataset,
    search,
    scope,
    canDerive,
    unresolvedDimensions,
    territoryLabel,
    classificationLabels,
    unitLabel,
    observedSpan,
    yearWindow,
    onChange,
  })

  if (segments.length === 0) return null

  const hasDefaults = segments.some(
    (segment) => segment.defaulted || segment.unresolved,
  )

  /** The popover every desktop shape opens, whatever its trigger looks like. */
  const controlPopover = (segment: ScopeSegment, trigger: ReactNode) => (
    <Popover
      key={segment.id}
      open={openSegment === segment.id}
      onOpenChange={(open) => setOpenSegment(open ? segment.id : null)}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'max-w-[calc(100vw-2rem)] p-0',
          segment.width === 'form' ? 'w-80' : 'w-[22rem]',
        )}
      >
        {segment.fills ? (
          segment.control?.({
            variant: 'panel',
            onPicked: () => setOpenSegment(null),
          })
        ) : (
          <div className="space-y-1.5 p-3">
            {segment.control?.({
              variant: 'panel',
              onPicked: () => setOpenSegment(null),
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="text-sm text-muted-foreground">
      {/* Desktop, `rail`: one row per axis in a bordered column. An axis with
          nothing to choose renders as text, not as a button — given the same
          affordance as its neighbours it read as a control that did nothing
          when pressed.
          Below `lg` the column has no room beside the figure, so the same
          rows sit above it as a three-column grid: a rule over every cell
          after the header, and a rule before the second and third columns
          (children 3n+3 and 3n+4, the header being child 1). Borders, not
          gaps over a border-coloured band — a short last row would have
          shown the band through its empty cells. One DOM, two layouts: a
          second, chip-shaped copy for that range would be a duplicate of
          every control for a screen reader, not a style. */}
      {layout === 'rail' ? (
        <div className="hidden md:block">
          <div
            className={cn(
              statisticsTheme.band,
              'overflow-hidden md:grid md:grid-cols-3 lg:block',
              '[&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-border/70',
              'md:[&>*:nth-child(3n+3)]:border-l md:[&>*:nth-child(3n+4)]:border-l lg:[&>*]:border-l-0',
            )}
          >
            <div className="px-4 py-2.5 md:col-span-full">
              <h2 className={statisticsTheme.sectionLabel}>
                <Trans>Selecție</Trans>
              </h2>
            </div>
            {segments.map((segment) =>
              segment.control
                ? controlPopover(
                    segment,
                    <button
                      type="button"
                      className={cn(statisticsTheme.scopeRailRow, 'h-full')}
                      aria-label={
                        segment.defaulted
                          ? t`${segment.controlLabel}: ${segment.text} (implicit)`
                          : t`${segment.controlLabel}: ${segment.text}`
                      }
                    >
                      <span className="flex min-w-0 flex-col items-start">
                        <span className={statisticsTheme.scopeRailLabel}>
                          {segment.controlLabel.trim()}
                        </span>
                        <span className={statisticsTheme.scopeRailValue}>
                          {segment.text}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {segment.defaulted || segment.unresolved ? (
                          <span className="text-xs text-muted-foreground">
                            <Trans>implicit</Trans>
                          </span>
                        ) : null}
                        <ChevronDown
                          className="h-3.5 w-3.5 text-muted-foreground"
                          aria-hidden
                        />
                      </span>
                    </button>,
                  )
                : (
                    <div
                      key={segment.id}
                      className={cn(statisticsTheme.scopeRailStatic, 'h-full')}
                    >
                      <span className={statisticsTheme.scopeRailLabel}>
                        {segment.controlLabel.trim()}
                      </span>
                      <span className={statisticsTheme.scopeRailValue}>
                        {segment.text}
                      </span>
                    </div>
                  ),
            )}
          </div>
          {hasDefaults ? (
            <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
              <Trans>
                Valorile marcate „implicit" au fost alese automat. Apasă pe ele
                ca să le schimbi.
              </Trans>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Desktop, `chips`: one chip per axis, the dimension's name before its
          value, so „Total" never stands alone. Each chip opens its own
          popover. A dotted underline marks a server default; solid marks a
          user pin (the legend line below says so once; aria carries the mark
          per chip). */}
      {layout === 'rail' ? null : (
      <div className="hidden flex-wrap items-center gap-1.5 md:flex">
        {segments.map((segment) =>
          segment.control ? (
            controlPopover(
              segment,
              <button
                type="button"
                className={statisticsTheme.scopeChip}
                aria-label={
                  segment.defaulted
                    ? t`${segment.controlLabel}: ${segment.text} (implicit)`
                    : t`${segment.controlLabel}: ${segment.text}`
                }
              >
                <span className={statisticsTheme.scopeChipName}>
                  {segment.controlLabel}
                </span>
                <span
                  className={cn(
                    statisticsTheme.scopeChipValue,
                    'underline',
                    segment.defaulted || segment.unresolved
                      ? statisticsTheme.scopeChipValueDefault
                      : statisticsTheme.scopeChipValuePinned,
                  )}
                >
                  {segment.text}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              </button>,
            )
          ) : (
            <span key={segment.id} className={statisticsTheme.scopeChipStatic}>
              <span className={statisticsTheme.scopeChipName}>
                {segment.controlLabel}
              </span>
              <span className="font-medium text-foreground">{segment.text}</span>
            </span>
          ),
        )}
      </div>
      )}
      {layout !== 'rail' && hasDefaults ? (
        // Desktop only: it explains the dotted underline on the chips, and the
        // phone renders the sheet trigger instead of the chips, so on a phone
        // it was a sentence about something not on screen.
        <p className="mt-1 hidden text-xs text-muted-foreground md:block">
          <Trans>
            Valorile subliniate punctat sunt implicite sau încă nealese — apasă
            pe ele ca să le alegi sau să le schimbi.
          </Trans>
        </p>
      ) : null}

      {/* Mobile: the whole sentence opens ONE bottom sheet. */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={t`Alege ce arată seria`}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="line-clamp-2 min-w-0 text-sm">
                {/* Trimmed: INS ships labels with a trailing space, which
                    rendered as „Localitati : TOTAL". */}
                {segments
                  .map(
                    (segment) =>
                      `${segment.controlLabel.trim()}: ${segment.text.trim()}`,
                  )
                  .join(' · ')}
              </span>
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Trans>Alege ce arată seria</Trans>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 pb-6">
              {segments
                .filter((segment) => segment.control)
                .map((segment) => (
                  <div key={segment.id} className="space-y-1.5">
                    {segment.control?.({
                      variant: 'field',
                      onPicked: () => undefined,
                    })}
                  </div>
                ))}
              <Button className="w-full" onClick={() => setSheetOpen(false)}>
                <Trans>Gata</Trans>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

function buildSegments(params: {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  readonly canDerive: boolean
  readonly unresolvedDimensions: readonly InsDimension[]
  readonly territoryLabel: string
  readonly classificationLabels: ReadonlyMap<string, string>
  readonly unitLabel: string | null
  readonly observedSpan: YearSpan | null
  readonly yearWindow: YearSpan | null
  readonly onChange: (patch: DetailSearchPatch) => void
}): readonly ScopeSegment[] {
  const {
    dataset,
    search,
    scope,
    canDerive,
    unresolvedDimensions,
    territoryLabel,
    classificationLabels,
    unitLabel,
    observedSpan,
    yearWindow,
    onChange,
  } = params

  // Editing a resolved cell materializes its complete selection atomically.
  // Invalid or incomplete input retains the explicit recovery path instead.
  const sourceSearch = canDerive
    ? {
        ...search,
        clasificari: [...scope.classifications].map(
          ([type, code]) => `${type}:${code}`,
        ),
        unitate: scope.unitCode ?? undefined,
      }
    : search
  const onSourceChange = (patch: DetailSearchPatch) =>
    onChange(
      canDerive
        ? {
            clasificari: sourceSearch.clasificari,
            unitate: sourceSearch.unitate,
            ...(scope.periodicity && isInsChartPeriodicity(scope.periodicity)
              ? { frecventa: scope.periodicity }
              : {}),
            ...patch,
          }
        : patch,
    )

  const segments: ScopeSegment[] = []
  const dimensions = dataset.dimensions ?? []

  /**
   * A national-only matrix gets a territory STATEMENT, not a picker.
   *
   * DESIGN.md §11: no surface forces a territory level a dataset lacks. The
   * picker searched every level for every matrix, so JUS101A — „Judecatori",
   * whose only axes are „Ani" and „UM: Numar persoane" — offered all 42
   * counties, and choosing one wrote `?teritoriu=cod:AB`, a filter no row can
   * satisfy. The page went empty with nothing saying why.
   */
  const territoryLevels = datasetTerritoryLevels(dataset)
  const territoryChoosable = territoryLevels.length > 1
  segments.push({
    id: 'teritoriu',
    text:
      scope.territoryMode === 'source-coordinates'
        ? t`Fără filtru teritorial canonic`
        : territoryLabel,
    defaulted: scope.territoryDefaulted,
    controlLabel: t`Teritoriu`,
    fills: true,
    control: territoryChoosable
      ? (options) => (
          <DetailTerritoryControl
            search={search}
            onChange={onChange}
            levels={territoryLevels}
            variant={options.variant}
            onPicked={options.onPicked}
          />
        )
      : null,
  })

  const unresolvedTypeCodes = new Set(
    unresolvedDimensions.map(classificationTypeCode),
  )
  for (const dimension of dimensions.filter(
    (d) => d.type === 'CLASSIFICATION' || d.type === 'TERRITORIAL',
  )) {
    const typeCode = classificationTypeCode(dimension)
    const value = scope.classifications.get(typeCode)
    const controlLabel =
      dimension.label_ro ?? dimension.classification_type?.name_ro ?? typeCode
    if (value === undefined && !unresolvedTypeCodes.has(typeCode)) continue
    segments.push({
      id: `clasificare-${typeCode}`,
      // Labels verbatim — blanket lowercasing would mangle acronyms (CAEN…).
      // The chip prints its axis name already; „alege Categorii de unitati
      // administrative" inside a chip labelled „Categorii de unitati
      // administrative" said it twice.
      text:
        value === undefined
          ? t`alege`
          : (classificationLabels.get(typeCode) ?? value),
      defaulted: scope.defaultedTypes.has(typeCode),
      unresolved: value === undefined,
      controlLabel,
      fills: true,
      control: (options) => (
        <ClassificationControl
          datasetCode={dataset.code}
          dimension={dimension}
          search={sourceSearch}
          pinnedValue={value ?? null}
          selectedLabel={classificationLabels.get(typeCode) ?? value ?? null}
          onChange={onSourceChange}
          options={options}
        />
      ),
    })
  }

  const unitDimension = dimensionsOfType(dimensions, 'UNIT_OF_MEASURE')[0]
  if (unitDimension) {
    // INS names this axis „UM: <unit>"; the value already says which unit.
    const unitAxisLabel = unitDimension.label_ro?.replace(/^UM\s*:\s*/i, '').trim()
    segments.push({
      id: 'unitate',
      text: unitLabel ?? t`Alege o unitate`,
      defaulted: scope.unitDefaulted,
      controlLabel:
        unitLabel && unitAxisLabel && unitAxisLabel.toLowerCase() !== unitLabel.toLowerCase()
          ? unitAxisLabel
          : t`Unitate de măsură`,
      fills: true,
      control: (options) => (
        <UnitControl
          datasetCode={dataset.code}
          dimension={unitDimension}
          selectedCode={scope.unitCode}
          selectedLabel={unitLabel}
          onChange={onSourceChange}
          options={options}
        />
      ),
    })
  }

  if (scope.periodicity || dataset.periodicity.length > 1) {
    const periodicities = dataset.periodicity ?? []
    segments.push({
      id: 'frecventa',
      text: scope.periodicity
        ? periodicityLabel(scope.periodicity)
        : t`Alege frecvența`,
      defaulted: !search.frecventa && periodicities.length > 1,
      controlLabel: t`Frecvență`,
      fills: true,
      width: 'form',
      control:
        periodicities.length > 1
          ? (options) => (
              <DetailCadenceControl
                periodicities={periodicities}
                selected={scope.periodicity}
                onSelect={(periodicity) => {
                  if (isInsChartPeriodicity(periodicity))
                    onChange({ frecventa: periodicity })
                }}
                variant={options.variant}
                onPicked={options.onPicked}
              />
            )
          : null,
    })
  }

  if (observedSpan && yearWindow) {
    segments.push({
      id: 'interval',
      text: `${yearWindow.from}–${yearWindow.to}`,
      defaulted: search.din === undefined && search.pana === undefined,
      controlLabel: t`Interval de ani`,
      fills: true,
      width: 'form',
      control: (options) => (
        <DetailYearWindowControl
          span={observedSpan}
          window={yearWindow}
          onChange={(patch) => onChange(patch)}
          variant={options.variant}
        />
      ),
    })
  }

  return segments
}

function ClassificationControl({
  datasetCode,
  dimension,
  search,
  pinnedValue,
  selectedLabel,
  onChange,
  options,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly pinnedValue: string | null
  readonly selectedLabel: string | null
  readonly onChange: (patch: DetailSearchPatch) => void
  readonly options: ScopeControlOptions
}) {
  if (search.clasificari !== undefined && !Array.isArray(search.clasificari))
    return (
      <p>
        <Trans>
          Șterge clasificările invalide înainte de a alege alte valori.
        </Trans>
      </p>
    )
  const typeCode = classificationTypeCode(dimension)
  const label =
    dimension.label_ro ?? dimension.classification_type?.name_ro ?? typeCode

  const selectPin = (code: string) =>
    onChange({ clasificari: editSourcePin(search.clasificari, typeCode, code) })
  const clearPin = () =>
    onChange({ clasificari: editSourcePin(search.clasificari, typeCode, null) })

  const shared = {
    datasetCode,
    dimensionIndex: dimension.index,
    label,
    selectedKey: pinnedValue,
    optionKey: (value: InsDimensionValue) =>
      value.classification_value?.code ?? null,
    onSelect: (value: InsDimensionValue) => {
      const code = value.classification_value?.code
      if (code) selectPin(code)
    },
    onClear: clearPin,
  }

  return options.variant === 'panel' ? (
    <DetailDimensionPanel
      {...shared}
      active
      onPicked={options.onPicked}
    />
  ) : (
    <DetailDimensionCombobox
      {...shared}
      placeholder={t`Alege o valoare`}
      selectedLabel={selectedLabel}
    />
  )
}

function UnitControl({
  datasetCode,
  dimension,
  selectedCode,
  selectedLabel,
  onChange,
  options,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly selectedCode: string | null
  readonly selectedLabel: string | null
  readonly onChange: (patch: DetailSearchPatch) => void
  readonly options: ScopeControlOptions
}) {
  const shared = {
    datasetCode,
    dimensionIndex: dimension.index,
    label: t`Unitate de măsură`,
    selectedKey: selectedCode,
    optionKey: (value: InsDimensionValue) => value.unit?.code ?? null,
    onSelect: (value: InsDimensionValue) => {
      if (value.unit?.code !== undefined && value.unit.code !== null) {
        onChange({ unitate: value.unit.code })
      }
    },
    onClear: () => onChange({ unitate: undefined }),
  }

  return options.variant === 'panel' ? (
    <DetailDimensionPanel {...shared} active onPicked={options.onPicked} />
  ) : (
    <DetailDimensionCombobox
      {...shared}
      placeholder={t`Alege o unitate`}
      selectedLabel={selectedLabel ?? selectedCode}
    />
  )
}
