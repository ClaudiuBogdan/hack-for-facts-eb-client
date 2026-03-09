type TreemapValueNode = Readonly<{
  value: number
}>

export function getTreemapValueBounds<T extends TreemapValueNode>(
  data: readonly T[],
) {
  if (!data.length) {
    return {
      minValue: 0,
      maxValue: 0,
    }
  }

  let minValue = Number.POSITIVE_INFINITY
  let maxValue = Number.NEGATIVE_INFINITY

  for (const item of data) {
    const value = Number.isFinite(item.value) ? item.value : 0
    if (value < minValue) minValue = value
    if (value > maxValue) maxValue = value
  }

  if (!Number.isFinite(minValue)) {
    minValue = 0
  }

  if (!Number.isFinite(maxValue)) {
    maxValue = 0
  }

  return {
    minValue,
    maxValue,
  }
}

export function hasModifiedTreemapAmountRange<T extends TreemapValueNode>(
  data: readonly T[],
  range: readonly [number, number] | undefined,
): boolean {
  if (!range) {
    return false
  }

  const { minValue, maxValue } = getTreemapValueBounds(data)
  return range[0] > minValue || range[1] < maxValue
}

export function filterTreemapNodesByAmountRange<T extends TreemapValueNode>(
  data: readonly T[],
  range: readonly [number, number] | undefined,
): T[] {
  if (!range) {
    return [...data]
  }

  const { minValue, maxValue } = getTreemapValueBounds(data)
  const isResetToFullSpan = range[0] === minValue && range[1] === maxValue

  if (isResetToFullSpan) {
    return [...data]
  }

  return data.filter((item) => {
    const value = Number.isFinite(item.value) ? item.value : 0
    return value >= range[0] && value <= range[1]
  })
}
