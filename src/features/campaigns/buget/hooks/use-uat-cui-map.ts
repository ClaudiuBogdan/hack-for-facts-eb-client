import { useQuery } from '@tanstack/react-query'
import Papa from 'papaparse'
import { createLogger } from '@/lib/logger'
import type { UatCuiMapRow } from '../types'
import { normalizeSirutaCode } from '../utils/normalize-siruta-code'

const logger = createLogger('campaign-uat-cui-map')

export type UatCuiMapResult = {
  readonly natcodeToCuiMap: ReadonlyMap<string, string>
  readonly cuiToNatcodeMap: ReadonlyMap<string, string>
  readonly validRows: number
  readonly invalidRows: number
  readonly duplicateNatcodeRows: number
}

function sanitizeCsvValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function parseUatCuiMapCsv(csvRaw: string): UatCuiMapResult {
  const parseResult = Papa.parse<UatCuiMapRow>(csvRaw, {
    header: true,
    delimiter: ',',
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })

  if (parseResult.errors.length > 0) {
    logger.warn('Failed to parse some CSV rows for UAT->CUI map.', {
      errorCount: parseResult.errors.length,
    })
  }

  const natcodeToCuiMap = new Map<string, string>()
  const cuiToNatcodeMap = new Map<string, string>()
  let validRows = 0
  let invalidRows = 0
  let duplicateNatcodeRows = 0

  for (const row of parseResult.data) {
    const cui = sanitizeCsvValue(row.cui)
    const natcode = normalizeSirutaCode(sanitizeCsvValue(row.natcode))

    if (!cui || !natcode) {
      invalidRows += 1
      continue
    }

    const existingCui = natcodeToCuiMap.get(natcode)
    if (existingCui && existingCui !== cui) {
      duplicateNatcodeRows += 1
      continue
    }

    natcodeToCuiMap.set(natcode, cui)
    if (!cuiToNatcodeMap.has(cui)) {
      cuiToNatcodeMap.set(cui, natcode)
    }
    validRows += 1
  }

  return {
    natcodeToCuiMap,
    cuiToNatcodeMap,
    validRows,
    invalidRows,
    duplicateNatcodeRows,
  }
}

export function useUatCuiMap() {
  return useQuery<UatCuiMapResult, Error>({
    queryKey: ['campaign-uat-cui-map'],
    queryFn: async () => {
      const module = await import('@/assets/data/uat-cui-map.csv?raw')
      const csvRaw = String(module.default ?? module)
      return parseUatCuiMapCsv(csvRaw)
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
