import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type LessonChallengesState = Readonly<Record<string, boolean>>

type LessonChallengesContextValue = {
  readonly challenges: LessonChallengesState
  readonly setChallenge: (id: string, isCompleted: boolean) => void
  readonly removeChallenge: (id: string) => void
}

const LessonChallengesContext = createContext<LessonChallengesContextValue | null>(null)

export function LessonChallengesProvider({ children }: { readonly children: ReactNode }) {
  const [challenges, setChallenges] = useState<LessonChallengesState>({})

  const setChallenge = useCallback((id: string, isCompleted: boolean) => {
    setChallenges((current) => {
      if (current[id] === isCompleted) return current
      return { ...current, [id]: isCompleted }
    })
  }, [])

  const removeChallenge = useCallback((id: string) => {
    setChallenges((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ challenges, setChallenge, removeChallenge }),
    [challenges, setChallenge, removeChallenge]
  )

  return <LessonChallengesContext.Provider value={value}>{children}</LessonChallengesContext.Provider>
}

export function useLessonChallenges() {
  const context = useContext(LessonChallengesContext)

  if (!context) {
    return {
      challenges: {} as LessonChallengesState,
      hasChallenges: false,
      totalChallenges: 0,
      completedChallenges: 0,
      allChallengesCompleted: false,
    }
  }

  const totalChallenges = Object.keys(context.challenges).length
  const completedChallenges = Object.values(context.challenges).filter(Boolean).length
  const hasChallenges = totalChallenges > 0

  return {
    challenges: context.challenges,
    hasChallenges,
    totalChallenges,
    completedChallenges,
    allChallengesCompleted: hasChallenges && completedChallenges === totalChallenges,
  }
}

export function useRegisterLessonChallenge(params: { readonly id: string; readonly isCompleted: boolean }) {
  const context = useContext(LessonChallengesContext)
  const setChallenge = context?.setChallenge
  const removeChallenge = context?.removeChallenge

  useEffect(() => {
    if (!removeChallenge) return
    return () => {
      removeChallenge(params.id)
    }
  }, [removeChallenge, params.id])

  useEffect(() => {
    if (!setChallenge) return
    setChallenge(params.id, params.isCompleted)
  }, [params.id, params.isCompleted, setChallenge])
}
