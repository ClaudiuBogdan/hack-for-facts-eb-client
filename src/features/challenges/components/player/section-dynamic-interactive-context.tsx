import { createContext, useContext, useMemo } from 'react'
import type { ChallengeStepSectionInteractive } from '../../utils/sectioned-step-markdown'

export type RegisteredDynamicSectionInteractiveState = {
  readonly sectionId: string
  readonly interactive: ChallengeStepSectionInteractive
  readonly isAnswered: boolean
  readonly isCorrect: boolean
  readonly isPending: boolean
  readonly reset: () => Promise<void>
}

type SectionDynamicInteractiveContextValue = {
  readonly activeSectionId: string | null
  readonly setInteractiveState: (
    state: RegisteredDynamicSectionInteractiveState | null,
  ) => void
}

const SectionDynamicInteractiveContext =
  createContext<SectionDynamicInteractiveContextValue | null>(null)

export function SectionDynamicInteractiveProvider({
  activeSectionId,
  setInteractiveState,
  children,
}: {
  readonly activeSectionId: string | null
  readonly setInteractiveState: (
    state: RegisteredDynamicSectionInteractiveState | null,
  ) => void
  readonly children: React.ReactNode
}) {
  const value = useMemo(
    () => ({ activeSectionId, setInteractiveState }),
    [activeSectionId, setInteractiveState],
  )

  return (
    <SectionDynamicInteractiveContext.Provider
      value={value}
    >
      {children}
    </SectionDynamicInteractiveContext.Provider>
  )
}

export function useSectionDynamicInteractiveBridge() {
  return useContext(SectionDynamicInteractiveContext)
}
