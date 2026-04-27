import { useMemo } from 'react'
import type { ComponentType } from 'react'
import type { LearningLocale } from '../types'
import {
  getModuleContentErrorMessage,
  preloadModuleContent,
  readModuleContent,
  type LearningMdxContentProps,
} from '../utils/module-content-resource'

type UseModuleContentResult = {
  readonly Component: ComponentType<LearningMdxContentProps> | null
  readonly isLoading: boolean
  readonly error: string | null
}

export { preloadModuleContent }
export { preloadModuleContent as prefetchModuleContent }

export function useModuleContent(params: {
  readonly contentDir: string
  readonly locale: LearningLocale
}): UseModuleContentResult {
  return useMemo(() => {
    const errorMessage = getModuleContentErrorMessage(params)
    if (errorMessage) {
      return {
        Component: null,
        isLoading: false,
        error: errorMessage,
      }
    }

    try {
      const moduleContent = readModuleContent(params)
      return {
        Component: moduleContent.default,
        isLoading: false,
        error: null,
      }
    } catch (error) {
      if (error instanceof Promise) {
        throw error
      }

      return {
        Component: null,
        isLoading: false,
        error:
            error instanceof Error
              ? error.message
              : 'Unable to load module content.',
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.contentDir, params.locale])
}
