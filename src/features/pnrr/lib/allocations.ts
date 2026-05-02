import allocationsData from '../data/allocations.json'

export type PnrrAllocationMeasure = {
  readonly componenta: string
  readonly masura: string
  readonly finantare: 'grant' | 'loan'
  readonly titlul_masurii: string
}

const allocations: {
  readonly components: Array<{
    readonly componenta: string
    readonly masuri: Array<{
      readonly masura: string
      readonly finantare: string
      readonly titlul_masurii: string
    }>
  }>
} = allocationsData

const measureMap = new Map<string, PnrrAllocationMeasure>()

for (const component of allocations.components) {
  for (const m of component.masuri) {
    const key = `${component.componenta}.${m.masura}.${m.finantare}`
    measureMap.set(key, {
      componenta: component.componenta,
      masura: m.masura,
      finantare: m.finantare as 'grant' | 'loan',
      titlul_masurii: m.titlul_masurii,
    })
  }
}

export function getAllocationMeasure(key: string): PnrrAllocationMeasure | undefined {
  return measureMap.get(key)
}

export function getMeasureDisplayLabel(key: string): string {
  const m = measureMap.get(key)
  if (!m) return key
  return `${key} — ${m.titlul_masurii}`
}

export function getMeasureShortLabel(key: string): string {
  const m = measureMap.get(key)
  if (!m) return key
  const shortTitle = m.titlul_masurii.length > 80
    ? m.titlul_masurii.slice(0, 80) + '...'
    : m.titlul_masurii
  return `${key} — ${shortTitle}`
}

export function getAllMeasureOptions(): Array<{
  readonly value: string
  readonly label: string
  readonly componenta: string
  readonly masura: string
  readonly finantare: string
}> {
  return Array.from(measureMap.entries())
    .map(([value, m]) => ({
      value,
      label: getMeasureDisplayLabel(value),
      componenta: m.componenta,
      masura: m.masura,
      finantare: m.finantare,
    }))
    .sort((a, b) => {
      const cmpComponent = a.componenta.localeCompare(b.componenta, 'ro', { numeric: true })
      if (cmpComponent !== 0) return cmpComponent
      const cmpMeasure = a.masura.localeCompare(b.masura, 'ro', { numeric: true })
      if (cmpMeasure !== 0) return cmpMeasure
      return a.finantare.localeCompare(b.finantare)
    })
}

export function buildMeasureFilterPredicate(
  selectedMeasures: readonly string[]
): (project: {
  componentCode: string
  measureCode: string
  fundingSource: string
}) => boolean {
  if (selectedMeasures.length === 0) return () => true

  const parsed = selectedMeasures.map((key) => {
    const [component, measure, financing] = key.split('.')
    return { component, measure, financing }
  })

  return (project) => {
    return parsed.some((sel) => {
      if (sel.component !== project.componentCode) return false
      if (sel.measure !== project.measureCode) return false
      // Mixed projects match either grant or loan filter
      if (project.fundingSource === 'grant/loan') return true
      return sel.financing === project.fundingSource
    })
  }
}
