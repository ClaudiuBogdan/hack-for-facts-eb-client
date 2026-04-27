import { useMemo } from 'react'
import type { AnalyticsFilterType, SeriesConfiguration } from '@/schemas/charts'
import type { TreemapInput } from './budget-transform'
import { getClassificationName } from '@/lib/classifications'
import { getEconomicChapterName, getEconomicSubchapterName } from '@/lib/economic-classifications'

/**
 * Generate a stable ID based on filter content instead of random UUID.
 * This prevents unnecessary re-renders when the actual data hasn't changed.
 */
function generateStableId(prefix: string, filter: AnalyticsFilterType): string {
  const parts = [
    prefix,
    filter.entity_cuis?.join(',') ?? '',
    filter.functional_prefixes?.join(',') ?? '',
    filter.economic_prefixes?.join(',') ?? '',
    filter.account_category ?? '',
  ]
  return parts.filter(Boolean).join('-')
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
  '#A4DE6C', '#D0ED57', '#FF7300', '#FFB300', '#E53935', '#D81B60',
  '#8E24AA', '#5E35B1', '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
  '#00897B', '#43A047', '#7CB342', '#C0CA33', '#FDD835', '#FFB300',
  '#FB8C00', '#F4511E',
]

const getColor = (key: string) => {
  let hash = 0
  if (key.length === 0) return COLORS[0]
  for (let index = 0; index < key.length; index += 1) {
    const char = key.charCodeAt(index)
    hash = ((hash << 5) - hash) + char
    hash &= hash
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

type BreadcrumbEntry = { code: string; label: string; type?: 'fn' | 'ec' }

interface UseTreemapChartLinkOptions {
  data: TreemapInput[]
  path: BreadcrumbEntry[]
  primary: 'fn' | 'ec'
  filterInput?: AnalyticsFilterType
  maxActiveSeries?: number
  maxTotalSeries?: number
}

interface TreemapChartLinkResult {
  hasChartLink: boolean
  seriesConfigs: SeriesConfiguration[]
  chartTitle: string
  parentLabel?: string
}

/**
 * Generates chart series configurations from treemap state.
 * Creates one series per visible group in the treemap, plus optional parent series.
 */
export function useTreemapChartLink({
  data,
  path,
  primary,
  filterInput,
  maxActiveSeries = 5,
  maxTotalSeries = 15,
}: UseTreemapChartLinkOptions): TreemapChartLinkResult {
  return useMemo(() => {
    // No chart link if no filter input provided
    if (!filterInput) {
      return {
        hasChartLink: false,
        seriesConfigs: [],
        chartTitle: '',
      }
    }

    // No chart link if no data
    if (!data || data.length === 0) {
      return {
        hasChartLink: false,
        seriesConfigs: [],
        chartTitle: '',
      }
    }

    // Use stable timestamp for all series in this render
    const timestamp = new Date().toISOString()
    const seriesConfigs: SeriesConfiguration[] = []
    const currentLevel = path.length
    const parentCode = currentLevel > 0 ? path[currentLevel - 1]?.code : null
    const parentType = currentLevel > 0 ? path[currentLevel - 1]?.type ?? primary : null

    // Determine if we need a parent series
    // We create parent series when we've drilled down (path.length > 0)
    const needsParentSeries = currentLevel > 0 && parentCode

    // Create parent series if applicable
    if (needsParentSeries && parentCode && parentType) {
      const parentLabel = path[currentLevel - 1]?.label ?? parentCode
      const parentFilter = { ...filterInput }

      // Apply parent constraint based on type
      if (parentType === 'fn') {
        parentFilter.functional_prefixes = [parentCode]
      } else if (parentType === 'ec') {
        parentFilter.economic_prefixes = [parentCode]
      }

      seriesConfigs.push({
        id: generateStableId(`parent-${parentType}-${parentCode}`, parentFilter),
        type: 'line-items-aggregated-yearly',
        enabled: true,
        label: `Total: ${parentLabel}`,
        unit: '',
        filter: parentFilter,
        config: {
          showDataLabels: false,
          color: getColor(`${parentType}-parent-${parentCode}`),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    // Create series for each visible group (child items)
    const sortedData = [...data].sort((a, b) => b.value - a.value)
    const limitedData = sortedData.slice(0, maxTotalSeries)

    for (let index = 0; index < limitedData.length; index += 1) {
      const item = limitedData[index]!
      const isEnabled = index < maxActiveSeries

      const childFilter = { ...filterInput }

      // When drilled down with different primary, we need both parent and child constraints
      // E.g., parent is functional, child is economic → need both fn and ec filters
      if (parentCode && parentType) {
        if (parentType === 'fn' && primary === 'ec') {
          // Parent is functional, child is economic
          childFilter.functional_prefixes = [parentCode]
          childFilter.economic_prefixes = [item.code]
        } else if (parentType === 'ec' && primary === 'fn') {
          // Parent is economic, child is functional
          childFilter.economic_prefixes = [parentCode]
          childFilter.functional_prefixes = [item.code]
        } else if (parentType === 'fn' && primary === 'fn') {
          // Both functional - just use child (child is more specific)
          childFilter.functional_prefixes = [item.code]
        } else if (parentType === 'ec' && primary === 'ec') {
          // Both economic - just use child (child is more specific)
          childFilter.economic_prefixes = [item.code]
        }
      } else {
        // No parent, just apply child filter
        if (primary === 'fn') {
          childFilter.functional_prefixes = [item.code]
        } else if (primary === 'ec') {
          childFilter.economic_prefixes = [item.code]
        }
      }

      // Get proper label
      let label = item.name
      if (primary === 'fn') {
        const fnName = getClassificationName(item.code)
        if (fnName) label = fnName
      } else if (primary === 'ec') {
        const parts = item.code.split('.')
        if (parts.length === 1) {
          const ecName = getEconomicChapterName(item.code)
          if (ecName) label = ecName
        } else if (parts.length === 2) {
          const ecName = getEconomicSubchapterName(item.code)
          if (ecName) label = ecName
        }
      }

      seriesConfigs.push({
        id: generateStableId(`child-${primary}-${item.code}`, childFilter),
        type: 'line-items-aggregated-yearly',
        enabled: isEnabled,
        label,
        unit: '',
        filter: childFilter,
        config: {
          showDataLabels: false,
          color: getColor(`${primary}-${item.code}`),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    // Generate chart title
    let chartTitle: string
    if (parentCode && path.length > 0) {
      const parentLabel = path[path.length - 1]?.label ?? parentCode
      chartTitle = `${parentLabel} - ${primary === 'fn' ? 'Functional' : 'Economic'} Breakdown`
    } else {
      chartTitle = `${primary === 'fn' ? 'Functional' : 'Economic'} Budget Distribution`
    }

    return {
      hasChartLink: seriesConfigs.length > 0,
      seriesConfigs,
      chartTitle,
      parentLabel: parentCode ? (path[currentLevel - 1]?.label ?? parentCode) : undefined,
    }
  }, [data, path, primary, filterInput, maxActiveSeries, maxTotalSeries])
}
