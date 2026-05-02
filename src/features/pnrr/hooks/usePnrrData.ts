import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { processPnrrData } from '../lib/data-transform'

export function usePnrrData() {
  return useQuery({
    queryKey: ['pnrr-projects'],
    queryFn: async () => {
      const response = await fetch('/api/pnrr-projects')
      if (!response.ok) {
        throw new Error(`Failed to load PNRR data: ${response.status}`)
      }
      const raw = (await response.json()) as unknown[]
      return processPnrrData(raw)
    },
    staleTime: Infinity,
  })
}

export function usePnrrProjects() {
  const { data } = usePnrrData()
  return useMemo(() => data?.projects ?? [], [data])
}
