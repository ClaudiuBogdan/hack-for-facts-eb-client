import { createContext, useContext } from 'react'
import type { EvidenceRef } from '../lib/types'

type EvidenceContextValue = {
  readonly openEvidence: (evidenceRef: EvidenceRef) => void
}

const PublicInvestmentsEvidenceContext = createContext<EvidenceContextValue | null>(
  null,
)

export const PublicInvestmentsEvidenceProvider =
  PublicInvestmentsEvidenceContext.Provider

export function usePublicInvestmentsEvidence(): EvidenceContextValue {
  const value = useContext(PublicInvestmentsEvidenceContext)
  if (!value) {
    return {
      openEvidence: () => undefined,
    }
  }
  return value
}
