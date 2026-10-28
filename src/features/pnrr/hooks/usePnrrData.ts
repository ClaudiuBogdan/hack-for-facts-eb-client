import { useQuery } from '@tanstack/react-query'
import { useContext, useEffect, useState } from 'react'
import type { PnrrProject, PnrrSearchState } from '@/schemas/pnrr'
import type { PnrrMapSeriesId } from './usePnrrMapSeries'
import { PnrrRawDataReadyContext } from '../lib/pnrr-raw-data-context'
import {
  buildPnrrOverviewMapSearchKey,
  buildPnrrOverviewRequestPath,
  buildPnrrOverviewSearchKey,
  pnrrOverviewMapPreviewQueryKey,
  pnrrOverviewQueryKey,
} from '../lib/pnrr-overview-request'
import type {
  PnrrServerOverview,
  PnrrServerOverviewMapPreview,
  PnrrWorkerQueryPayload,
  PnrrWorkerQueryResult,
} from '../workers/pnrr-worker-types'

type PnrrWorkerHookOptions = {
  readonly mapSeriesId?: PnrrMapSeriesId
  /** False keeps the raw dataset unloaded: the worker starts only when a view needs it. */
  readonly enabled?: boolean
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
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  })
}

async function fetchPnrrOverviewJson<TResult>(path: string): Promise<TResult> {
  const response = await fetch(path, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Failed to load the PNRR overview: ${response.status}`)
  }
  return (await response.json()) as TResult
}

/**
 * The overview built on the server (`/api/pnrr/overview`), with the worker's
 * code. SSR puts it in the query cache when the server has the data in memory.
 */
export function usePnrrServerOverview(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  const searchKey = buildPnrrOverviewSearchKey(search)

  return useQuery({
    queryKey: pnrrOverviewQueryKey(searchKey),
    queryFn: () =>
      fetchPnrrOverviewJson<PnrrServerOverview>(
        buildPnrrOverviewRequestPath(search),
      ),
    enabled: options.enabled,
    staleTime: Infinity,
  })
}

/** The overview's UAT map preview, fetched apart once the map section is on screen. */
export function usePnrrServerOverviewMapPreview(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  const mapSearchKey = buildPnrrOverviewMapSearchKey(search)

  return useQuery({
    queryKey: pnrrOverviewMapPreviewQueryKey(mapSearchKey),
    queryFn: () =>
      fetchPnrrOverviewJson<PnrrServerOverviewMapPreview>(
        buildPnrrOverviewRequestPath(search, 'map-preview'),
      ),
    enabled: options.enabled,
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  })
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

export function usePnrrProjectDetail(projectId?: string | null) {
  const [data, setData] = useState<{ readonly project: PnrrProject | null }>({
    project: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const rawDataReady = useContext(PnrrRawDataReadyContext)

  useEffect(() => {
    if (!projectId) {
      setData({ project: null })
      setIsLoading(false)
      setError(null)
      return
    }
    if (!rawDataReady) {
      // The dashboard is loading the raw dataset (and offers a retry).
      setData({ project: null })
      setIsLoading(true)
      setError(null)
      return
    }
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setData({ project: null })
      setIsLoading(false)
      setError(new Error('PNRR worker is only available in the browser'))
      return
    }
    let cancelled = false
    setData({ project: null })
    setError(null)
    setIsLoading(true)
    void import('../workers/pnrr-worker-client')
      .then(({ getPnrrWorkerProject }) => getPnrrWorkerProject(projectId))
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setData({ project: null })
          setError(
            reason instanceof Error ? reason : new Error(String(reason)),
          )
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId, rawDataReady])

  return {
    data,
    error,
    isError: error !== null,
    isLoading,
  }
}

export function usePnrrBeneficiaryDetail(
  key: string | null,
  search?: Partial<PnrrSearchState>,
  cui?: string | null,
) {
  const [data, setData] = useState<{
    readonly beneficiary: import('../workers/pnrr-worker-types').PnrrWorkerBeneficiaryDetail | null
  }>({ beneficiary: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!key && !cui) {
      setData({ beneficiary: null })
      setIsLoading(false)
      setError(null)
      return
    }
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setData({ beneficiary: null })
      setIsLoading(false)
      setError(new Error('PNRR worker is only available in the browser'))
      return
    }
    let cancelled = false
    setData({ beneficiary: null })
    setError(null)
    setIsLoading(true)
    void import('../workers/pnrr-worker-client')
      .then(({ getPnrrWorkerBeneficiary }) =>
        getPnrrWorkerBeneficiary({ key, cui, search }),
      )
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setData({ beneficiary: null })
          setError(
            reason instanceof Error ? reason : new Error(String(reason)),
          )
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [key, cui, search])

  return { data, error, isError: error !== null, isLoading }
}

export async function exportPnrrCsvFromWorker(
  search?: Partial<PnrrSearchState>,
): Promise<string> {
  const { exportPnrrWorkerCsv } = await import('../workers/pnrr-worker-client')
  const result = await exportPnrrWorkerCsv({ search })
  return result.csv
}
