import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import type { ReportPeriodInput, ReportPeriodType, PeriodDate } from '@/schemas/reporting'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { useEffect, useMemo } from 'react'
import { defaultYearRange } from '@/schemas/charts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TMonth, TQuarter } from '@/schemas/reporting'

type PeriodSelectionMode = 'dates' | 'interval'

type Props = {
  value?: ReportPeriodInput
  onChange: (value?: ReportPeriodInput) => void
  allowDeselect?: boolean
  allowedPeriodTypes?: ReportPeriodType[]
  yearRange?: { start: number; end: number }
}

const ALL_PERIOD_TYPES: ReportPeriodType[] = ['YEAR', 'QUARTER', 'MONTH']

function normalizeAllowedPeriodTypes(allowedPeriodTypes?: ReportPeriodType[]): ReportPeriodType[] {
  if (!allowedPeriodTypes || allowedPeriodTypes.length === 0) {
    return ALL_PERIOD_TYPES
  }

  const allowedSet = new Set(allowedPeriodTypes)
  const normalized = ALL_PERIOD_TYPES.filter((type) => allowedSet.has(type))
  return normalized.length > 0 ? normalized : ALL_PERIOD_TYPES
}

function isPeriodDateForType(date: string, type: ReportPeriodType): date is PeriodDate {
  if (type === 'YEAR') return /^\d{4}$/.test(date)
  if (type === 'QUARTER') return /^\d{4}-Q[1-4]$/.test(date)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(date)
}

function arePeriodsEqual(left?: ReportPeriodInput, right?: ReportPeriodInput): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  return JSON.stringify(left) === JSON.stringify(right)
}

export function PeriodFilter({
  value,
  onChange,
  allowDeselect = true,
  allowedPeriodTypes,
  yearRange,
}: Props) {
  const { i18n } = useLingui()
  const normalizedAllowedPeriodTypes = useMemo(
    () => normalizeAllowedPeriodTypes(allowedPeriodTypes),
    [allowedPeriodTypes]
  )
  const hasCustomYearRange =
    !!yearRange &&
    Number.isFinite(yearRange.start) &&
    Number.isFinite(yearRange.end)
  const normalizedYearRange = useMemo(
    () => ({
      start: hasCustomYearRange
        ? Math.min(yearRange!.start, yearRange!.end)
        : defaultYearRange.start,
      end: hasCustomYearRange
        ? Math.max(yearRange!.start, yearRange!.end)
        : defaultYearRange.end,
    }),
    [hasCustomYearRange, yearRange]
  )

  const periodType = useMemo(() => {
    if (value?.type && normalizedAllowedPeriodTypes.includes(value.type)) {
      return value.type
    }
    return normalizedAllowedPeriodTypes[0] ?? 'YEAR'
  }, [normalizedAllowedPeriodTypes, value?.type])
  const selectionMode: PeriodSelectionMode = value?.selection.interval ? 'interval' : 'dates'

  const availableYears = useMemo(() => {
    return Array.from(
      { length: normalizedYearRange.end - normalizedYearRange.start + 1 },
      (_, idx) => String(normalizedYearRange.end - idx)
    )
  }, [normalizedYearRange.end, normalizedYearRange.start])

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.locale || 'en', { month: 'short' }),
    [i18n.locale]
  )
  const availableMonths: { id: TMonth; label: string }[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const id = String(idx + 1).padStart(2, '0') as TMonth
      let short = monthFormatter.format(new Date(2000, idx, 1))
      if (!short.endsWith('.')) short = `${short}.`
      return { id, label: `${id} ${short}` }
    })
  }, [monthFormatter])

  const availableQuarters: { id: TQuarter; label: string }[] = [
    { id: 'Q1', label: 'Q1' },
    { id: 'Q2', label: 'Q2' },
    { id: 'Q3', label: 'Q3' },
    { id: 'Q4', label: 'Q4' },
  ]

  const isYearSelectable = (year: string): boolean => {
    if (!hasCustomYearRange) return true
    const parsedYear = Number(year)
    return parsedYear >= normalizedYearRange.start && parsedYear <= normalizedYearRange.end
  }

  const getPeriodOptions = (type: ReportPeriodType): PeriodDate[] => {
    switch (type) {
      case 'YEAR':
        return availableYears as PeriodDate[]
      case 'QUARTER':
        return availableYears.flatMap((year) =>
          availableQuarters.map((quarter) => `${year}-${quarter.id}` as PeriodDate)
        )
      case 'MONTH':
        return availableYears.flatMap((year) =>
          availableMonths.map((month) => `${year}-${month.id}` as PeriodDate)
        )
      default:
        return []
    }
  }

  const periodOptions = useMemo(
    () => getPeriodOptions(periodType),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getPeriodOptions is a stable component-scope function
    [availableMonths, availableQuarters, availableYears, periodType]
  )
  const sortedPeriodOptions = useMemo(() => [...periodOptions].sort(), [periodOptions])
  const selectablePeriodOptions = useMemo(() => {
    if (!hasCustomYearRange) return sortedPeriodOptions
    return sortedPeriodOptions.filter((option) => isYearSelectable(option.slice(0, 4)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isYearSelectable is a stable component-scope function
  }, [hasCustomYearRange, sortedPeriodOptions])

  const clampPeriodValue = (current: ReportPeriodInput | undefined): ReportPeriodInput | undefined => {
    if (!current) return current

    const effectiveType = normalizedAllowedPeriodTypes.includes(current.type)
      ? current.type
      : normalizedAllowedPeriodTypes[0]
    if (!effectiveType) return undefined

    const optionsForType = getPeriodOptions(effectiveType).sort()
    const selectableOptionsForType = hasCustomYearRange
      ? optionsForType.filter((option) => isYearSelectable(option.slice(0, 4)))
      : optionsForType
    const selectableSet = new Set(selectableOptionsForType)

    if (current.selection.interval) {
      const interval = current.selection.interval
      let start = interval.start
      let end = interval.end

      if (!isPeriodDateForType(start, effectiveType)) {
        start = selectableOptionsForType[0] ?? optionsForType[0] ?? start
      }
      if (!isPeriodDateForType(end, effectiveType)) {
        end =
          selectableOptionsForType[selectableOptionsForType.length - 1] ??
          optionsForType[optionsForType.length - 1] ??
          end
      }

      if (hasCustomYearRange) {
        if (!selectableSet.has(start)) {
          start = selectableOptionsForType[0] ?? start
        }
        if (!selectableSet.has(end)) {
          end = selectableOptionsForType[selectableOptionsForType.length - 1] ?? end
        }
      }

      if (start > end) {
        end = start
      }

      if (!isPeriodDateForType(start, effectiveType) || !isPeriodDateForType(end, effectiveType)) {
        return undefined
      }

      return {
        type: effectiveType,
        selection: {
          interval: { start, end },
        },
      }
    }

    const nextDates = (current.selection.dates ?? []).filter((date) => {
      if (!isPeriodDateForType(date, effectiveType)) return false
      if (!hasCustomYearRange) return true
      return selectableSet.has(date)
    })

    if (nextDates.length > 0) {
      return {
        type: effectiveType,
        selection: {
          dates: Array.from(new Set(nextDates)),
        },
      }
    }

    const fallbackDate =
      selectableOptionsForType[selectableOptionsForType.length - 1] ??
      optionsForType[optionsForType.length - 1]

    if (!fallbackDate || !isPeriodDateForType(fallbackDate, effectiveType)) {
      return undefined
    }

    return {
      type: effectiveType,
      selection: { dates: [fallbackDate] },
    }
  }

  useEffect(() => {
    if (!value) return
    const clampedValue = clampPeriodValue(value)
    if (!arePeriodsEqual(value, clampedValue)) {
      onChange(clampedValue)
    }
  }, [hasCustomYearRange, normalizedAllowedPeriodTypes, onChange, value]) // eslint-disable-line react-hooks/exhaustive-deps -- clampPeriodValue is a stable component-scope callback

  const handlePeriodTypeChange = (type: ReportPeriodType) => {
    if (!type) return
    if (!normalizedAllowedPeriodTypes.includes(type)) return

    const options = getPeriodOptions(type)
      .sort()
      .filter((option) => !hasCustomYearRange || isYearSelectable(option.slice(0, 4)))
    const fallbackDate = options[options.length - 1]
    if (!fallbackDate) return

    // Reset selection when changing period type
    onChange?.({ type, selection: { dates: [fallbackDate] } })
  }

  const handleSelectionModeChange = (mode: PeriodSelectionMode) => {
    if (!mode) return

    const options = getPeriodOptions(periodType)
      .sort()
      .filter((option) => !hasCustomYearRange || isYearSelectable(option.slice(0, 4)))
    if (options.length === 0) return

    // Reset selection when changing mode
    if (mode === 'dates') {
      const defaultDate = options[options.length - 1] as PeriodDate
      onChange?.({ type: periodType, selection: { dates: [defaultDate] } })
    } else {
      const start = options[0] as PeriodDate
      const end = options[options.length - 1] as PeriodDate
      onChange?.({ type: periodType, selection: { interval: { start, end } } })
    }
  }

  const renderDateSelectionGrid = () => {
    if (periodType === 'YEAR') {
      return (
        <ToggleGroup type="single" value={value?.selection.dates?.[0] ?? ''} onValueChange={(date) => {
          if (!date && !allowDeselect) return;
          if (date && !isYearSelectable(date)) return;
          onChange?.({ type: 'YEAR', selection: { dates: date ? [date as PeriodDate] : [] } })
        }} className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {availableYears.map((year) => (
            <ToggleGroupItem
              key={year}
              value={year}
              variant="default"
              disabled={!isYearSelectable(year)}
            >
              {year}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )
    }
    if (periodType === 'QUARTER') {
      return (
        <div className="flex flex-col gap-2">
          {availableYears.map((year) => (
            <div key={year}>
              <Label className="text-sm font-medium">{year}</Label>
              <ToggleGroup type="multiple" value={value?.selection.dates ?? []} onValueChange={(dates) => onChange?.({ type: periodType, selection: { dates: dates as PeriodDate[] } })} className="grid grid-cols-4 gap-2 mt-1">
                {availableQuarters.map((q) => {
                  const date = `${year}-${q.id}` as PeriodDate
                  return (
                    <ToggleGroupItem
                      key={date}
                      value={date}
                      variant="default"
                      disabled={!isYearSelectable(year)}
                    >
                      {q.label}
                    </ToggleGroupItem>
                  )
                })}
              </ToggleGroup>
            </div>
          ))}
        </div>
      )
    }
    if (periodType === 'MONTH') {
      return (
        <div className="flex flex-col gap-2">
          {availableYears.map((year) => (
            <div key={year}>
              <Label className="text-sm font-medium">{year}</Label>
              <ToggleGroup type="multiple" value={value?.selection.dates ?? []} onValueChange={(dates) => onChange?.({ type: periodType, selection: { dates: dates as PeriodDate[] } })} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-1">
                {availableMonths.map((m) => {
                  const date = `${year}-${m.id}` as PeriodDate
                  return (
                    <ToggleGroupItem
                      key={date}
                      value={date}
                      variant="default"
                      disabled={!isYearSelectable(year)}
                    >
                      {m.label}
                    </ToggleGroupItem>
                  )
                })}
              </ToggleGroup>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const handleIntervalStartChange = (start: PeriodDate) => {
    const end =
      value?.selection.interval?.end ??
      selectablePeriodOptions[selectablePeriodOptions.length - 1] as PeriodDate
    onChange?.({ type: periodType, selection: { interval: { start, end } } })
  }
  const handleIntervalEndChange = (end: PeriodDate) => {
    const start =
      value?.selection.interval?.start ??
      selectablePeriodOptions[0] as PeriodDate
    onChange?.({ type: periodType, selection: { interval: { start, end } } })
  }

  const renderIntervalSelection = () => {
    const startValue = value?.selection.interval?.start
    const endValue = value?.selection.interval?.end

    const startIndex = startValue ? selectablePeriodOptions.indexOf(startValue) : 0
    const endIndex = endValue ? selectablePeriodOptions.indexOf(endValue) : selectablePeriodOptions.length - 1
    const endOptions = selectablePeriodOptions.slice(startIndex)
    const startOptions = selectablePeriodOptions.slice(0, endIndex + 1)

    return (
      <div className="flex items-center gap-2">
        <Select value={startValue} onValueChange={(v) => handleIntervalStartChange(v as PeriodDate)}>
          <SelectTrigger>
            <SelectValue placeholder="Start" />
          </SelectTrigger>
          <SelectContent>
            {[...startOptions].reverse().map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>-</span>
        <Select value={endValue} onValueChange={(v) => handleIntervalEndChange(v as PeriodDate)}>
          <SelectTrigger>
            <SelectValue placeholder="End" />
          </SelectTrigger>
          <SelectContent>
            {[...endOptions].reverse().map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-md">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          <Trans>Period Type</Trans>
        </Label>
        <ToggleGroup type="single" value={periodType} onValueChange={(v: ReportPeriodType) => handlePeriodTypeChange(v)} variant="default" size="sm" className="w-full justify-between gap-2">
          <ToggleGroupItem value="YEAR" variant="default" className="flex-1" disabled={!normalizedAllowedPeriodTypes.includes('YEAR')}>
            <Trans>Yearly</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem value="QUARTER" variant="default" className="flex-1" disabled={!normalizedAllowedPeriodTypes.includes('QUARTER')}>
            <Trans>Quarterly</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem value="MONTH" variant="default" className="flex-1" disabled={!normalizedAllowedPeriodTypes.includes('MONTH')}>
            <Trans>Monthly</Trans>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          <Trans>Selection Mode</Trans>
        </Label>
        <ToggleGroup type="single" value={selectionMode} onValueChange={(v: PeriodSelectionMode) => handleSelectionModeChange(v)} variant="default" size="sm" className="w-full justify-between gap-2">
          <ToggleGroupItem value="dates" variant="default" className="flex-1">
            <Trans>Dates</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem value="interval" variant="default" className="flex-1">
            <Trans>Interval</Trans>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="max-h-60 overflow-y-auto pr-2">{selectionMode === 'dates' ? renderDateSelectionGrid() : renderIntervalSelection()}</div>
    </div>
  )
}
