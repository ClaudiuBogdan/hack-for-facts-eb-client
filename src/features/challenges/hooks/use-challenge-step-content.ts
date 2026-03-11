import { useMemo } from 'react'
import type { ChallengeLocale } from '../types'
import {
  preloadChallengeStepContent,
  resolveChallengeStepContent,
  type ChallengeStepContentDescriptor,
  type ChallengeStepContentResolveResult,
} from '../utils/challenge-step-content-resolver'

export type { ChallengeStepContentDescriptor }
export { preloadChallengeStepContent as prefetchChallengeStepContent }

export function useChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): ChallengeStepContentResolveResult {
  return useMemo(
    () => resolveChallengeStepContent(params),
    [params.contentDir, params.locale],
  )
}
