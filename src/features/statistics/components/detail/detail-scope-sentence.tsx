import { editSourcePin } from '../../lib/source-selection'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  CalendarClock,
  CalendarRange,
  Globe,
  MapPin,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
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
  classificationPinMap,
  classificationTypeCode,
  dimensionsOfType,
  type DetailSearchPatch,
  type EffectiveScope,
  type YearSpan,
} from '../../lib/dataset-selection'
import { fetchDimensionValuesPage } from '../../api/dataset-detail-api'
import { STATISTICS_STALE_TIME, statisticsKeys } from '../../hooks/query-config'
import { periodicityLabel } from '../../lib/periodicity-labels'
import {
  childAxisAfterPick,
  childSourceAxis,
  pickSourceMember,
  rootMemberCode,
} from '../../lib/source-hierarchy'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'
import { DetailCadenceControl } from './detail-cadence-control'
import { DetailDimensionPanel } from './detail-dimension-panel'
import { DetailYearWindowControl } from './detail-year-window-control'

/** What a segment's control is handed by the section it opens in. */
interface ScopeControlOptions {
  /** Close the section, once a value has been chosen. */
  readonly onPicked: () => void
}

interface ScopeSegment {
  readonly id: string
  /** The visible text for this segment. */
  readonly text: string
  /** True when the value was chosen automatically — by the server or by this page — not by the reader. */
  readonly defaulted: boolean
  /** True when the dimension has NO effective value yet. */
  readonly unresolved?: boolean
  /** The control the segment's section opens onto. Null = display-only. */
  readonly control: ((options: ScopeControlOptions) => ReactNode) | null
  /** What kind of axis this is, at a glance: a place, a class, a unit, time. */
  readonly icon: LucideIcon
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
  /** True when the window on screen is the reader's, not the whole span. */
  readonly yearWindowPinned?: boolean
  readonly onChange: (patch: DetailSearchPatch) => void
}

/**
 * Tier 1 — the selection IS the control surface: one panel of sections, one
 * per axis, each naming its axis and the value on screen, and opening onto
 * that axis's options in place. The same panel is the standing rail beside
 * the figure on a wide screen — so changing an axis never moves the chart —
 * and the contents of one bottom sheet on a phone.
 *
 * It is the shape the app's other filter panels have (the entity analytics
 * filter, the chart builder's INS series): an accordion of sections with
 * the search and the list inside. The rail used to open a floating popover
 * per row, and the phone sheet stacked fields that each opened another
 * popover over the sheet; both are gone. Values chosen automatically are
 * marked and are NOT written into the URL until the reader changes one.
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
  yearWindowPinned = false,
  onChange,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  // The open section, one per surface: the rail's and the sheet's are two
  // accordions, and opening one should not open the other when the viewport
  // crosses `lg`. Lifted here so the reset can close them — the values the
  // open list was scrolled to are gone.
  const [railSection, setRailSection] = useState('')
  const [sheetSection, setSheetSection] = useState('')
  // The selection a pick was made against. A pick that has to read a root
  // before it can write (`ClassificationControl`) checks this is still the
  // one it started from; any other write in the meantime supersedes it, and
  // its stale snapshot is dropped rather than written over the newer
  // selection. Every write from this panel moves it synchronously — the
  // router keeps the old search until the new route has loaded, so waiting
  // for the prop would let a second write slip under the check — and the
  // effect covers writes from elsewhere, such as the back button, another
  // dataset, and leaving the page. A pick that starts waiting mints its own
  // token, so of two waiting picks the newer is the one that lands. Held
  // here, not in the control: the control lives in a section that unmounts
  // the moment it closes.
  const selectionKey = JSON.stringify(search)
  const selectionToken = useRef<object>({})
  useEffect(() => {
    selectionToken.current = {}
    return () => {
      selectionToken.current = {}
    }
  }, [selectionKey, dataset.code])
  const write = (patch: DetailSearchPatch) => {
    selectionToken.current = {}
    onChange(patch)
  }

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
    yearWindowPinned,
    onChange: write,
    selectionToken,
  })

  if (segments.length === 0) return null

  const hasDefaults = segments.some((segment) => segment.defaulted)
  const pinCount = countPins(search)
  // The reset removes its own button, which held the focus; it goes to the
  // first section instead, which the reset leaves in place.
  const reset = (from: HTMLElement) => {
    from
      .closest('[data-scope-panel]')
      ?.querySelector<HTMLButtonElement>('button[aria-expanded]')
      ?.focus()
    setRailSection('')
    setSheetSection('')
    write({
      clasificari: undefined,
      unitate: undefined,
      frecventa: undefined,
      din: undefined,
      pana: undefined,
    })
  }

  const defaultsNote = hasDefaults ? (
    <p className="px-1 text-xs leading-relaxed text-muted-foreground">
      <Trans>
        Valorile marcate „implicit" au fost alese automat. Apasă pe ele ca să
        le schimbi.
      </Trans>
    </p>
  ) : null

  return (
    <div className="text-sm text-muted-foreground">
      {/* A wide screen: the panel is the rail. */}
      <div className="hidden space-y-3 lg:block">
        <div
          className={cn(statisticsTheme.band, 'overflow-hidden')}
          data-scope-panel
        >
          <div className={statisticsTheme.scopePanelHeader}>
            <h2 className="text-sm font-semibold text-foreground">
              <Trans>Selecție</Trans>
            </h2>
            <ResetButton count={pinCount} onReset={reset} />
          </div>
          <ScopeSections
            segments={segments}
            open={railSection}
            onOpenChange={setRailSection}
          />
        </div>
        {defaultsNote}
      </div>

      {/* Anything narrower: the same panel in ONE bottom sheet. */}
      <div className="lg:hidden">
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
          <SheetContent
            side="bottom"
            className="flex max-h-[85vh] flex-col gap-0 p-0"
            data-scope-panel
          >
            {/* The sheet is the frame: its sections run edge to edge, as the
                entity filter's do in its dialog, and the reset sits in its
                header — a card inside the sheet was a second frame and a
                second title for the same panel. The close button is the
                sheet's own, top right, so the reset stops short of it. */}
            <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b border-border/70 py-3 pl-4 pr-12 text-left">
              <SheetTitle className="text-base">
                <Trans>Alege ce arată seria</Trans>
              </SheetTitle>
              <ResetButton count={pinCount} onReset={reset} />
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ScopeSections
                segments={segments}
                open={sheetSection}
                onOpenChange={setSheetSection}
              />
              {defaultsNote ? <div className="px-4 py-3">{defaultsNote}</div> : null}
            </div>
            <div className="border-t border-border/70 p-4">
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

/**
 * How many axes the address pins: what the reset will take off. Counted from
 * the address, not from the sections on screen — a year window pinned while
 * the series is still loading has no section yet, and the reset must still
 * offer to drop it. `din` and `pana` are one axis; a malformed `clasificari`
 * is one pin to drop.
 */
function countPins(search: StatisticsDatasetDetailSearch): number {
  const classifications = Array.isArray(search.clasificari)
    ? search.clasificari.length
    : search.clasificari === undefined
      ? 0
      : 1
  return (
    classifications +
    (search.unitate === undefined ? 0 : 1) +
    (search.frecventa === undefined ? 0 : 1) +
    (search.din === undefined && search.pana === undefined ? 0 : 1)
  )
}

/** Undo every value the reader chose: the axes go back to the implicit ones. */
function ResetButton({
  count,
  onReset,
}: {
  readonly count: number
  readonly onReset: (from: HTMLElement) => void
}) {
  if (count === 0) return null
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto shrink-0 gap-1.5 px-2 py-1 text-xs text-muted-foreground"
      onClick={(event) => onReset(event.currentTarget)}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      <Trans>Resetează ({count})</Trans>
    </Button>
  )
}

/**
 * One section per axis. One open at a time, and controlled, so a pick can
 * close its own section and show the new value in the trigger it came from.
 * The year window's section stays open while its slider moves. An axis with
 * nothing to choose is a row of text, not a section: given a trigger like
 * its neighbours it read as a control that did nothing when pressed.
 */
function ScopeSections({
  segments,
  open,
  onOpenChange,
}: {
  readonly segments: readonly ScopeSegment[]
  /** The open section's id; empty when none is. */
  readonly open: string
  readonly onOpenChange: (id: string) => void
}) {
  // A pick unmounts the section it was made in — and with it the search
  // field that held the focus, which would drop to the page. It goes back to
  // the trigger the section opened from, which now reads the new value.
  // Moved in the pick's own handler, not an effect: the router re-renders
  // the page before an effect would run.
  const triggers = useRef(new Map<string, HTMLButtonElement>())
  const closeAfterPick = (id: string) => {
    onOpenChange('')
    triggers.current.get(id)?.focus()
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={open}
      onValueChange={onOpenChange}
    >
      {segments.map((segment) => {
        const Icon = segment.icon
        const heading = (
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span className={statisticsTheme.scopeRailLabel}>
                {segment.controlLabel.trim()}
              </span>
              <span className="mt-0.5 flex w-full min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className={statisticsTheme.scopePanelValue}>
                  {segment.text}
                </span>
                {/* Only a value that WAS chosen is marked as chosen
                    automatically; an axis still to choose says so in its
                    own text. Beside the value, not the axis name: in the
                    16rem rail a tag up there wrapped the name. */}
                {segment.defaulted && segment.control ? (
                  <span className={statisticsTheme.scopePanelImplicit}>
                    <Trans>implicit</Trans>
                  </span>
                ) : null}
              </span>
            </span>
          </span>
        )
        if (!segment.control)
          return (
            <div key={segment.id} className={statisticsTheme.scopePanelStatic}>
              {heading}
            </div>
          )
        return (
          <AccordionItem
            key={segment.id}
            value={segment.id}
            className="border-b border-border/70 last:border-b-0"
          >
            <AccordionTrigger
              ref={(element) => {
                if (element) triggers.current.set(segment.id, element)
                else triggers.current.delete(segment.id)
              }}
              className={statisticsTheme.scopePanelTrigger}
              aria-label={
                segment.defaulted
                  ? t`${segment.controlLabel}: ${segment.text} (implicit)`
                  : t`${segment.controlLabel}: ${segment.text}`
              }
            >
              {heading}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              {segment.control({ onPicked: () => closeAfterPick(segment.id) })}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
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
  readonly yearWindowPinned: boolean
  readonly onChange: (patch: DetailSearchPatch) => void
  readonly selectionToken: RefObject<object>
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
    yearWindowPinned,
    onChange,
    selectionToken,
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
  const dimensions = dataset.dimensions ?? []
  const geographyTypes = new Set(
    dimensions
      .filter((d) => d.type === 'TERRITORIAL')
      .map(classificationTypeCode),
  )
  const onSourceChange = (patch: DetailSearchPatch) => {
    const next: DetailSearchPatch = canDerive
      ? {
          clasificari: sourceSearch.clasificari,
          unitate: sourceSearch.unitate,
          ...(scope.periodicity && isInsChartPeriodicity(scope.periodicity)
            ? { frecventa: scope.periodicity }
            : {}),
          ...patch,
        }
      : patch
    // Once a geography axis is pinned it names the territory, and the
    // `teritoriu` that seeded it has nothing left to say.
    const pinsGeography =
      Array.isArray(next.clasificari) &&
      next.clasificari.some(
        (pin) => typeof pin === 'string' && geographyTypes.has(pin.split(':')[0]),
      )
    onChange(pinsGeography ? { ...next, teritoriu: undefined } : next)
  }

  const segments: ScopeSegment[] = []

  /**
   * The territory is chosen on the matrix's own geography axes — „Judete",
   * „Localitati", „Macroregiuni, regiuni de dezvoltare si judete" — which list
   * exactly the places the matrix publishes, regions included. A separate
   * „Teritoriu" picker beside them chose the same thing twice: on ACC101B it
   * read Alba while the axis read Arad, and the page filtered on both and drew
   * nothing. A matrix with no geography axis is national, and says so.
   */
  const hasGeographyAxis = dimensions.some((d) => d.type === 'TERRITORIAL')
  if (!hasGeographyAxis) {
    segments.push({
      id: 'teritoriu',
      text: territoryLabel,
      defaulted: scope.territoryDefaulted,
      controlLabel: t`Teritoriu`,
      icon: Globe,
      control: null,
    })
  }

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
      // The row prints its axis name already; „alege Categorii de unitati
      // administrative" inside a row labelled „Categorii de unitati
      // administrative" said it twice.
      text:
        value === undefined
          ? t`alege`
          : (classificationLabels.get(typeCode) ?? value),
      defaulted: scope.defaultedTypes.has(typeCode),
      unresolved: value === undefined,
      controlLabel,
      icon: dimension.type === 'TERRITORIAL' ? MapPin : Tags,
      control: (options) => (
        <ClassificationControl
          datasetCode={dataset.code}
          selectionToken={selectionToken}
          dimensions={dimensions}
          dimension={dimension}
          search={sourceSearch}
          pinnedValue={value ?? null}
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
      unresolved: scope.unitCode === null,
      controlLabel:
        unitLabel && unitAxisLabel && unitAxisLabel.toLowerCase() !== unitLabel.toLowerCase()
          ? unitAxisLabel
          : t`Unitate de măsură`,
      icon: Ruler,
      control: (options) => (
        <UnitControl
          datasetCode={dataset.code}
          dimension={unitDimension}
          selectedCode={scope.unitCode}
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
      // A cadence nothing resolved is unresolved, not „chosen automatically".
      defaulted: scope.periodicity !== null && !search.frecventa && periodicities.length > 1,
      unresolved: scope.periodicity === null,
      controlLabel: t`Frecvență`,
      icon: CalendarClock,
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
      defaulted: !yearWindowPinned,
      controlLabel: t`Interval de ani`,
      icon: CalendarRange,
      // The window moves with every drag of the slider, so its section stays
      // open until the reader closes it.
      control: () => (
        <DetailYearWindowControl
          span={observedSpan}
          window={yearWindow}
          onChange={(patch) => onChange(patch)}
        />
      ),
    })
  }

  return segments
}

/** The root is the first member INS lists; a page this size has always held it. */
const ROOT_PAGE_SIZE = 50

/**
 * The read of a nested axis's root, shared by the prefetch and the pick.
 * It takes no abort signal on purpose: the pick closes its popover, which
 * unmounts the prefetch's observer, and a query that honours the signal is
 * cancelled when its last observer leaves — the pick waiting on it would then
 * fail and unpin the axis. Fifty rows, read once a day; letting it finish
 * costs nothing.
 */
function childRootQuery(datasetCode: string, childIndex: number) {
  return {
    queryKey: statisticsKeys.dimensionRoot(datasetCode, childIndex),
    queryFn: () =>
      fetchDimensionValuesPage({
        datasetCode,
        dimensionIndex: childIndex,
        limit: ROOT_PAGE_SIZE,
        offset: 0,
      }).then((page) => rootMemberCode(page.nodes)),
    staleTime: STATISTICS_STALE_TIME.catalog,
  }
}

function ClassificationControl({
  datasetCode,
  selectionToken,
  dimensions,
  dimension,
  search,
  pinnedValue,
  onChange,
  options,
}: {
  readonly datasetCode: string
  readonly selectionToken: RefObject<object>
  readonly dimensions: readonly InsDimension[]
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly pinnedValue: string | null
  readonly onChange: (patch: DetailSearchPatch) => void
  readonly options: ScopeControlOptions
}) {
  const queryClient = useQueryClient()
  // Opening a parent axis reads its nested axis's root at once, so a pick
  // almost always finds it cached and writes in the same tick as the click.
  const childAxis = childSourceAxis(dimensions, dimension)
  useQuery({
    ...childRootQuery(datasetCode, childAxis?.index ?? -1),
    enabled: childAxis !== null,
  })
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

  /**
   * A pick keeps the cell one INS publishes (`source-hierarchy.ts`): a
   * locality brings its county with it, and a new county sends a pinned
   * locality back to its root. The root is the nested axis's own member,
   * read from the axis — prefetched when this panel opens, kept a day. If a
   * pick still has to wait for it, any other write in the meantime wins and
   * this one is dropped: its snapshot of the selection is stale by then.
   */
  const selectMember = (value: InsDimensionValue) => {
    const code = value.classification_value?.code
    if (!code) return
    const commit = (childReset?: Parameters<typeof pickSourceMember>[0]['childReset']) =>
      onChange({
        clasificari: pickSourceMember({
          pins: search.clasificari,
          dimensions,
          dimension,
          value,
          childReset,
        }),
      })

    const after = childAxisAfterPick({
      dimensions,
      dimension,
      pins: classificationPinMap(search.clasificari),
      memberCode: code,
    })
    if (after.action === 'keep') {
      commit()
      return
    }
    const rootQuery = childRootQuery(datasetCode, after.child.index)
    const cached = queryClient.getQueryData<string | null>(rootQuery.queryKey)
    if (cached !== undefined) {
      commit({ child: after.child, rootCode: cached })
      return
    }
    const startedFrom = {}
    selectionToken.current = startedFrom
    const commitIfCurrent = (rootCode: string | null) => {
      if (selectionToken.current === startedFrom)
        commit({ child: after.child, rootCode })
    }
    queryClient.fetchQuery(rootQuery).then(commitIfCurrent, () => commitIfCurrent(null))
  }
  const clearPin = () =>
    onChange({ clasificari: editSourcePin(search.clasificari, typeCode, null) })

  const shared = {
    datasetCode,
    dimensionIndex: dimension.index,
    label,
    selectedKey: pinnedValue,
    optionKey: (value: InsDimensionValue) =>
      value.classification_value?.code ?? null,
    onSelect: selectMember,
    onClear: clearPin,
  }

  return (
    <DetailDimensionPanel
      {...shared}
      active
      appearance="inline"
      onPicked={options.onPicked}
    />
  )
}

function UnitControl({
  datasetCode,
  dimension,
  selectedCode,
  onChange,
  options,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly selectedCode: string | null
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

  return (
    <DetailDimensionPanel
      {...shared}
      active
      appearance="inline"
      onPicked={options.onPicked}
    />
  )
}
