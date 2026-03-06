import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

import { getNormalizationUnit } from '@/lib/utils'
import type { Currency, Normalization } from '@/schemas/charts'

type TreemapValueNode = Readonly<{
  value: number
}>

export type TreemapAmountFilter = Readonly<{
  minValue: number
  maxValue: number
  range: [number, number]
  onChange: (value: [number, number]) => void
}>

type UseTreemapAmountFilterProps = Readonly<{
  data: readonly TreemapValueNode[]
  normalization?: Normalization
  currency?: Currency
}>

export function useTreemapAmountFilter({
  data,
  normalization,
  currency,
}: UseTreemapAmountFilterProps) {
  const deferredData = useDeferredValue(data)

  const { minValue, maxValue } = useMemo(() => {
    if (!deferredData.length) {
      return { minValue: 0, maxValue: 0 }
    }

    let min = Number.POSITIVE_INFINITY
    let max = 0

    for (const item of deferredData) {
      const value = Number.isFinite(item.value) ? item.value : 0
      if (value < min) min = value
      if (value > max) max = value
    }

    if (!Number.isFinite(min)) {
      min = 0
    }

    return { minValue: min, maxValue: max }
  }, [deferredData])

  const [range, setRange] = useState<[number, number]>([minValue, maxValue])

  useEffect(() => {
    setRange([minValue, maxValue])
  }, [minValue, maxValue])

  const handleChange = useCallback((nextRange: [number, number]) => {
    setRange(nextRange)
  }, [])

  const amountFilter = useMemo<TreemapAmountFilter>(
    () => ({
      minValue,
      maxValue,
      range,
      onChange: handleChange,
    }),
    [handleChange, maxValue, minValue, range],
  )

  const unit = useMemo(
    () => getNormalizationUnit({ normalization: normalization ?? 'total', currency }),
    [currency, normalization],
  )

  return {
    amountFilter,
    unit,
  }
}
