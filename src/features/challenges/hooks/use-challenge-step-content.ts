import { useMemo } from 'react'
import type { ChallengeLocale } from '../types'
import {
  createChallengeStepContentIndex,
  resolveChallengeStepContent,
  resolveChallengeStepModule,
  type ChallengeStepContentDescriptor,
  type ChallengeStepContentResolveResult,
  type ChallengeStepMdxModule,
} from '../utils/challenge-step-content-resolver'

export type { ChallengeStepContentDescriptor }

const MDX_MODULES = import.meta.glob<ChallengeStepMdxModule>(
  '/src/content/challenges/steps/**/index.*.mdx',
  { eager: true },
)

const MDX_CONTENT_INDEX = createChallengeStepContentIndex(MDX_MODULES)

export function prefetchChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}) {
  resolveChallengeStepModule({
    contentDir: params.contentDir,
    locale: params.locale,
    contentIndex: MDX_CONTENT_INDEX,
  })
  return Promise.resolve()
}

export function useChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): ChallengeStepContentResolveResult {
  return useMemo(
    () =>
      resolveChallengeStepContent({
        contentDir: params.contentDir,
        locale: params.locale,
        contentIndex: MDX_CONTENT_INDEX,
      }),
    [params.contentDir, params.locale],
  )
}
