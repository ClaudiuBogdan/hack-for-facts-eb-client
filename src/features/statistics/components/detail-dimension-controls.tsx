import { useEffect, useRef, useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  InsDatasetDetails,
  InsDimension,
  InsDimensionValue,
  InsPeriodicity,
} from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch } from '@/schemas/statistics'
import { useDimensionValues } from '../hooks/use-dataset-detail'
import {
  classificationTypeCode,
  DIMENSION_PAGE_SIZE,
  encodeTerritoryPin,
  isTotalOption,
  parseTerritoryPin,
  removeClassificationPin,
  resolveYearWindow,
  territoryPinFromValue,
  upsertClassificationPin,
  classificationPinMap,
} from '../lib/dataset-selection'
import { DetailDimensionCombobox } from './detail-dimension-combobox'

export type DetailSearchPatch = Partial<StatisticsDatasetDetailSearch>

type ControlsProps = {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}

/**
 * One control per dataset dimension, in the dimension order the server
 * declares. Each control owns exactly one URL key, so a deep link restores the
 * whole selection without any control needing to know about the others.
 */
export function DetailDimensionControls({
  dataset,
  search,
  onChange,
}: ControlsProps) {
  const dimensions = dataset.dimensions ?? []

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dimensions.map((dimension) => {
        switch (dimension.type) {
          case 'TEMPORAL':
            return (
              <DetailTemporalControl
                key={dimension.index}
                dataset={dataset}
                search={search}
                onChange={onChange}
              />
            )
          case 'TERRITORIAL':
            return (
              <DetailTerritoryControl
                key={dimension.index}
                datasetCode={dataset.code}
                dimension={dimension}
                search={search}
                onChange={onChange}
              />
            )
          case 'CLASSIFICATION':
            return (
              <DetailClassificationControl
                key={dimension.index}
                datasetCode={dataset.code}
                dimension={dimension}
                search={search}
                onChange={onChange}
              />
            )
          case 'UNIT_OF_MEASURE':
            return (
              <DetailUnitControl
                key={dimension.index}
                datasetCode={dataset.code}
                dimension={dimension}
                search={search}
                onChange={onChange}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Temporal
// ---------------------------------------------------------------------------

const PERIODICITY_LABELS: Record<InsPeriodicity, () => string> = {
  ANNUAL: () => t`Anual`,
  QUARTERLY: () => t`Trimestrial`,
  MONTHLY: () => t`Lunar`,
}

function DetailTemporalControl({
  dataset,
  search,
  onChange,
}: {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const window = resolveYearWindow({ search, yearRange: dataset.year_range })
  const bounds = resolveYearWindow({ search: {}, yearRange: dataset.year_range })
  if (!bounds || !window) return null

  const years: number[] = []
  for (let year = bounds.from; year <= bounds.to; year += 1) years.push(year)

  const periodicities = dataset.periodicity ?? []

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`temporal-from-${dataset.code}`}>
        <Trans>Perioadă</Trans>
      </Label>
      <div className="flex items-center gap-2">
        <Select
          value={`${window.from}`}
          onValueChange={(value) => onChange({ din: Number(value) })}
        >
          <SelectTrigger
            id={`temporal-from-${dataset.code}`}
            className="h-10"
            aria-label={t`An de început`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={`${year}`}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground" aria-hidden>
          –
        </span>
        <Select
          value={`${window.to}`}
          onValueChange={(value) => onChange({ pana: Number(value) })}
        >
          <SelectTrigger className="h-10" aria-label={t`An de sfârșit`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={`${year}`}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {periodicities.length > 1 ? (
        <Select
          value={search.frecventa ?? periodicities[0]}
          onValueChange={(value) =>
            onChange({ frecventa: value as InsPeriodicity })
          }
        >
          <SelectTrigger className="h-10" aria-label={t`Frecvență`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodicities.map((periodicity) => (
              <SelectItem key={periodicity} value={periodicity}>
                {PERIODICITY_LABELS[periodicity]()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Territory
// ---------------------------------------------------------------------------

function DetailTerritoryControl({
  datasetCode,
  dimension,
  search,
  onChange,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const pin = parseTerritoryPin(search.teritoriu)

  return (
    <DetailDimensionCombobox
      datasetCode={datasetCode}
      dimensionIndex={dimension.index}
      label={dimension.label_ro ?? t`Teritoriu`}
      placeholder={t`Alege un teritoriu`}
      selectedKey={search.teritoriu ?? null}
      selectedLabel={pin ? pin.value : null}
      optionKey={(value) => {
        const territoryPin = value.territory
          ? territoryPinFromValue(value.territory)
          : null
        return territoryPin ? encodeTerritoryPin(territoryPin) : null
      }}
      onSelect={(value) => {
        const territoryPin = value.territory
          ? territoryPinFromValue(value.territory)
          : null
        if (territoryPin) onChange({ teritoriu: encodeTerritoryPin(territoryPin) })
      }}
      onClear={() => onChange({ teritoriu: undefined })}
    />
  )
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function DetailClassificationControl({
  datasetCode,
  dimension,
  search,
  onChange,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const typeCode = classificationTypeCode(dimension)
  const pinnedValue = classificationPinMap(search.clasificari).get(typeCode) ?? null

  // The first option page also powers the "Total" auto-pin, so it is fetched
  // eagerly rather than on popover open. Same query key as the combobox's first
  // page, so React Query serves both from one request.
  const firstPage = useDimensionValues({
    datasetCode,
    dimensionIndex: dimension.index,
    search: undefined,
    limit: DIMENSION_PAGE_SIZE,
    offset: 0,
    enabled: true,
  })

  // Auto-pin runs at most once per mount: once the user clears the pin, it
  // stays cleared instead of snapping back to Total on the next render.
  const autoPinned = useRef(false)
  useEffect(() => {
    if (autoPinned.current || pinnedValue || !firstPage.data) return

    const total = firstPage.data.nodes.find((node) =>
      isTotalOption(node.classification_value?.name_ro ?? node.label_ro),
    )
    const code = total?.classification_value?.code
    if (!code) return

    autoPinned.current = true
    onChange({
      clasificari: [
        ...upsertClassificationPin(search.clasificari, { type: typeCode, value: code }),
      ] as [string, ...string[]],
    })
  }, [firstPage.data, pinnedValue, onChange, search.clasificari, typeCode])

  const label = dimension.label_ro ?? dimension.classification_type?.name_ro ?? typeCode
  const selectedLabel =
    firstPage.data?.nodes.find(
      (node) => node.classification_value?.code === pinnedValue,
    )?.label_ro ?? pinnedValue

  return (
    <DetailDimensionCombobox
      datasetCode={datasetCode}
      dimensionIndex={dimension.index}
      label={label}
      placeholder={t`Alege o valoare`}
      selectedKey={pinnedValue}
      selectedLabel={selectedLabel}
      optionKey={(value) => value.classification_value?.code ?? null}
      onSelect={(value) => {
        const code = value.classification_value?.code
        if (!code) return
        onChange({
          clasificari: [
            ...upsertClassificationPin(search.clasificari, { type: typeCode, value: code }),
          ] as [string, ...string[]],
        })
      }}
      onClear={() => {
        const next = removeClassificationPin(search.clasificari, typeCode)
        onChange({
          clasificari: next.length > 0 ? ([...next] as [string, ...string[]]) : undefined,
        })
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Unit of measure
// ---------------------------------------------------------------------------

function unitLabel(value: InsDimensionValue): string {
  return value.unit?.name_ro ?? value.unit?.symbol ?? value.label_ro ?? ''
}

function DetailUnitControl({
  datasetCode,
  dimension,
  search,
  onChange,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const unitsQuery = useDimensionValues({
    datasetCode,
    dimensionIndex: dimension.index,
    search: undefined,
    limit: DIMENSION_PAGE_SIZE,
    offset: 0,
    enabled: true,
  })

  const units = useMemo(() => unitsQuery.data?.nodes ?? [], [unitsQuery.data])
  const isSingleUnit = unitsQuery.data?.pageInfo.totalCount === 1

  // A dataset reported in one unit has nothing to choose: pin it so the
  // observations query is scoped, and show the unit as a read-only fact.
  const autoPinned = useRef(false)
  useEffect(() => {
    if (autoPinned.current || search.unitate || !isSingleUnit) return
    const code = units[0]?.unit?.code
    if (!code) return
    autoPinned.current = true
    onChange({ unitate: code })
  }, [isSingleUnit, units, search.unitate, onChange])

  const label = dimension.label_ro ?? t`Unitate de măsură`

  if (isSingleUnit && units[0]) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <p className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm">
          {unitLabel(units[0])}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`unit-${datasetCode}`}>{label}</Label>
      <Select
        value={search.unitate ?? ''}
        onValueChange={(value) => onChange({ unitate: value })}
      >
        <SelectTrigger id={`unit-${datasetCode}`} className="h-10">
          <SelectValue placeholder={t`Alege o unitate`} />
        </SelectTrigger>
        <SelectContent>
          {units.map((unit) =>
            unit.unit?.code ? (
              <SelectItem key={unit.nom_item_id} value={unit.unit.code}>
                {unitLabel(unit)}
              </SelectItem>
            ) : null,
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
