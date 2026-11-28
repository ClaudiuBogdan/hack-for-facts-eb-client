import type { LineCount } from '../lib/lines'
import type { LocalMandates } from '../lib/mandates'
import { useCountyCouncil, useLocalMandates } from './use-elections-analytics'

export type ScopedMandates = {
  readonly status: 'pending' | 'error' | 'ready'
  readonly retry: () => void
  readonly data: LocalMandates | undefined
  /** `null`: no figures for this place; never read as zero. */
  readonly mayors: readonly LineCount[] | null
  readonly councillors: readonly LineCount[] | null
  readonly first: readonly LineCount[] | null
  readonly second: readonly LineCount[] | null
}

/**
 * The mandates of the place the address names: the country, or one county,
 * whose council is a read of its own (București's General Council is not in
 * the figures, so nothing is read for it).
 */
export function useScopedMandates(judet: string | undefined, initial?: LocalMandates): ScopedMandates {
  const mandates = useLocalMandates(initial)
  const council = useCountyCouncil(judet)
  const data = mandates.data
  if (!judet) {
    return {
      status: mandates.isPending ? 'pending' : mandates.isError ? 'error' : 'ready',
      retry: () => void mandates.refetch(),
      data,
      mayors: data?.mayors ?? null,
      councillors: data?.councillors ?? null,
      first: data?.countyCouncil.first ?? null,
      second: data?.countyCouncil.second ?? null,
    }
  }
  const county = data?.counties.find((row) => row.code === judet)
  const councilPending = judet !== 'B' && council.isPending
  return {
    status: mandates.isPending || councilPending ? 'pending' : mandates.isError || council.isError ? 'error' : 'ready',
    retry: () => {
      if (mandates.isError) void mandates.refetch()
      if (council.isError) void council.refetch()
    },
    data,
    mayors: county?.mayors ?? null,
    councillors: county?.councillors ?? null,
    first: council.data?.first ?? null,
    second: council.data?.second ?? null,
  }
}
