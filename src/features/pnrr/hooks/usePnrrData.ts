import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { PnrrProject, PnrrSearchState } from '@/schemas/pnrr'
import type { PnrrMapSeriesId } from './usePnrrMapSeries'
import type {
  PnrrWorkerQueryPayload,
  PnrrWorkerQueryResult,
} from '../workers/pnrr-worker-types'

type PnrrWorkerHookOptions = {
  readonly mapSeriesId?: PnrrMapSeriesId
}

function buildWorkerPayload(
  search?: Partial<PnrrSearchState>,
  options?: PnrrWorkerHookOptions,
): PnrrWorkerQueryPayload {
  return {
    search,
    mapSeriesId: options?.mapSeriesId,
  }
}

export function usePnrrWorkerModel(
  search?: Partial<PnrrSearchState>,
  options?: PnrrWorkerHookOptions,
) {
  const payload = buildWorkerPayload(search, options)

  return useQuery({
    queryKey: ['pnrr-worker-model', payload],
    queryFn: async (): Promise<PnrrWorkerQueryResult> => {
      if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        throw new Error('PNRR worker is only available in the browser')
      }

      const { queryPnrrWorker } = await import(
        '../workers/pnrr-worker-client'
      )
      return queryPnrrWorker(payload)
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  })
}

export function usePnrrWorkerStatus(search?: Partial<PnrrSearchState>) {
  return usePnrrWorkerModel(search)
}

export function usePnrrOverviewModel(search?: Partial<PnrrSearchState>) {
  return usePnrrWorkerModel(search)
}

export function usePnrrProjectRows(search?: Partial<PnrrSearchState>) {
  return usePnrrWorkerModel(search)
}

export function usePnrrBeneficiaryRows(search?: Partial<PnrrSearchState>) {
  return usePnrrWorkerModel(search)
}

export function usePnrrMapModel(
  search?: Partial<PnrrSearchState>,
  mapSeriesId?: PnrrMapSeriesId,
) {
  const [data, setData] = useState<PnrrWorkerQueryResult | undefined>()
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return
    let cancelled = false
    void import('../workers/pnrr-worker-client')
      .then(({ queryPnrrWorker }) =>
        queryPnrrWorker(buildWorkerPayload(search, { mapSeriesId })),
      )
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason : new Error(String(reason)))
        }
      })
    return () => {
      cancelled = true
    }
  }, [mapSeriesId, search])

  return { data, error, isError: error !== null, isLoading: !data && !error }
}

export function usePnrrAnomalyModel(search?: Partial<PnrrSearchState>) {
  return usePnrrWorkerModel(search)
}

export function usePnrrFilterFacets(search?: Partial<PnrrSearchState>) {
  return usePnrrWorkerModel(search)
}

export function usePnrrProjectDetail(projectId?: string | null) {
  const [data, setData] = useState<{ readonly project: PnrrProject | null }>({
    project: null,
  })

  useEffect(() => {
    if (!projectId) {
      setData({ project: null })
      return
    }
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setData({ project: null })
      return
    }
    let cancelled = false
    void import('../workers/pnrr-worker-client')
      .then(({ getPnrrWorkerProject }) => getPnrrWorkerProject(projectId))
      .then((result) => {
        if (!cancelled) setData(result)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  return { data, isLoading: Boolean(projectId) && data.project?.id !== projectId }
}

export function usePnrrBeneficiaryDetail(
  key: string | null,
  search?: Partial<PnrrSearchState>,
  cui?: string | null,
) {
  const [data, setData] = useState<{
    readonly beneficiary: import('../workers/pnrr-worker-types').PnrrWorkerBeneficiaryDetail | null
  }>({ beneficiary: null })

  useEffect(() => {
    if (!key && !cui) {
      setData({ beneficiary: null })
      return
    }
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setData({ beneficiary: null })
      return
    }
    let cancelled = false
    setData({ beneficiary: null })
    void import('../workers/pnrr-worker-client')
      .then(({ getPnrrWorkerBeneficiary }) =>
        getPnrrWorkerBeneficiary({ key, cui, search }),
      )
      .then((result) => {
        if (!cancelled) setData(result)
      })
    return () => {
      cancelled = true
    }
  }, [key, cui, search])

  return { data }
}

export async function exportPnrrCsvFromWorker(
  search?: Partial<PnrrSearchState>,
): Promise<string> {
  const { exportPnrrWorkerCsv } = await import('../workers/pnrr-worker-client')
  const result = await exportPnrrWorkerCsv({ search })
  return result.csv
}
