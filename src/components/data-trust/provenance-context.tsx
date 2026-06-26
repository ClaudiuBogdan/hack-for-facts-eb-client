/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { SourcePointer } from '@/schemas/elections'

/**
 * Context shown alongside pointers in the SourceProvenanceDrawer: the human
 * title of the entity, the canonical metric label, the displayed value, etc.
 */
export type ProvenanceContext = {
  readonly entityTitle: string
  readonly metricLabel: string | null
  readonly sourceMetricCode: string | null
  readonly mappingStatus: string | null
  readonly resolverVersion: string | null
  readonly valueDisplay: string | null
  readonly isAggregate: boolean
}

export type ProvenanceRequest = {
  readonly pointers: readonly SourcePointer[]
  readonly context: ProvenanceContext
}

type ProvenanceContextValue = {
  readonly openRequest: ProvenanceRequest | null
  openProvenance: (request: ProvenanceRequest) => void
  closeProvenance: () => void
}

const ProvenanceReactContext = createContext<ProvenanceContextValue | null>(null)

type ProviderProps = {
  readonly children: ReactNode
}

/**
 * Holds the currently-open provenance request. A single drawer instance reads
 * from this provider; EvidenceLink chips call `openProvenance` from anywhere.
 */
export function ProvenanceProvider({ children }: ProviderProps) {
  const [openRequest, setOpenRequest] = useState<ProvenanceRequest | null>(null)

  const value = useMemo<ProvenanceContextValue>(
    () => ({
      openRequest,
      openProvenance: (request) => setOpenRequest(request),
      closeProvenance: () => setOpenRequest(null),
    }),
    [openRequest],
  )

  return (
    <ProvenanceReactContext.Provider value={value}>
      {children}
    </ProvenanceReactContext.Provider>
  )
}

export function useProvenance(): ProvenanceContextValue {
  const value = useContext(ProvenanceReactContext)
  if (value === null) {
    throw new Error('useProvenance must be used within a ProvenanceProvider')
  }
  return value
}
