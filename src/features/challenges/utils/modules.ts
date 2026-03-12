import type { LearningContentProgress, LearningContentStatus } from '@/features/learning/types'
import { getTranslatedText } from '@/features/learning/utils/paths'
import { ChallengeModuleDefinitionSchema } from '../schemas/challenge-definitions'
import type { ChallengeModuleDefinition, ChallengeStepDefinition } from '../types'

export { getTranslatedText }

type RawModule = { readonly default: unknown }

const moduleFiles: Record<string, RawModule> = import.meta.glob(
  '/src/content/challenges/modules/*.json',
  { eager: true },
)

export function getChallengeModules(): readonly ChallengeModuleDefinition[] {
  return Object.values(moduleFiles)
    .map((m) => ChallengeModuleDefinitionSchema.parse(m.default))
    .sort((leftModule, rightModule) => {
      if (leftModule.order !== rightModule.order) {
        return leftModule.order - rightModule.order
      }

      return leftModule.id.localeCompare(rightModule.id)
    })
}

export function getChallengeModuleBySlug(
  slug: string,
): ChallengeModuleDefinition | null {
  return getChallengeModules().find((m) => m.slug === slug) ?? null
}

export function getAllSteps(
  module: ChallengeModuleDefinition,
): readonly ChallengeStepDefinition[] {
  return module.challenges.flatMap((c) => c.steps)
}

export function getAdjacentSteps(params: {
  readonly module: ChallengeModuleDefinition
  readonly stepId: string
}): {
  readonly prev: ChallengeStepDefinition | null
  readonly next: ChallengeStepDefinition | null
} {
  const allSteps = getAllSteps(params.module)
  const idx = allSteps.findIndex((s) => s.id === params.stepId)
  return {
    prev: idx > 0 ? allSteps[idx - 1] : null,
    next: idx >= 0 && idx < allSteps.length - 1 ? allSteps[idx + 1] : null,
  }
}

export function getChallengeModuleStats(params: {
  readonly module: ChallengeModuleDefinition
  readonly getStepStatus: (stepId: string) => LearningContentStatus | undefined
}): {
  readonly completedCount: number
  readonly totalCount: number
  readonly completionPercentage: number
  readonly nextStep: ChallengeStepDefinition | null
  readonly nextChallengeSlug: string | null
} {
  const allSteps = getAllSteps(params.module)
  const totalCount = allSteps.length

  const completedCount = allSteps.filter((step) => {
    const status = params.getStepStatus(step.id)
    return status === 'completed' || status === 'passed'
  }).length

  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const nextStep =
    allSteps.find((step) => {
      const status = params.getStepStatus(step.id)
      return status !== 'completed' && status !== 'passed'
    }) ?? null

  const nextChallengeSlug = nextStep
    ? (params.module.challenges.find((c) =>
        c.steps.some((s) => s.id === nextStep.id),
      )?.slug ?? null)
    : null

  return {
    completedCount,
    totalCount,
    completionPercentage,
    nextStep,
    nextChallengeSlug,
  }
}

export function resolveActiveChallengeModule(params: {
  readonly modules: readonly ChallengeModuleDefinition[]
  readonly routeModuleSlug?: string | null
  readonly storedActiveModuleSlug?: string | null
  readonly getStepStatus: (stepId: string) => LearningContentStatus | undefined
}): ChallengeModuleDefinition | null {
  const isModuleIncomplete = (module: ChallengeModuleDefinition) => {
    const stats = getChallengeModuleStats({
      module,
      getStepStatus: params.getStepStatus,
    })
    return stats.completionPercentage < 100
  }

  const routeModule = params.routeModuleSlug
    ? params.modules.find((module) => module.slug === params.routeModuleSlug) ?? null
    : null
  if (routeModule) {
    return routeModule
  }

  const storedModuleIndex = params.storedActiveModuleSlug
    ? params.modules.findIndex((module) => module.slug === params.storedActiveModuleSlug)
    : -1

  if (storedModuleIndex >= 0) {
    const storedModule = params.modules[storedModuleIndex]

    if (isModuleIncomplete(storedModule)) {
      return storedModule
    }

    const nextIncompleteModule =
      params.modules.slice(storedModuleIndex + 1).find(isModuleIncomplete) ??
      params.modules.slice(0, storedModuleIndex).find(isModuleIncomplete) ??
      null

    if (nextIncompleteModule) {
      return nextIncompleteModule
    }

    return storedModule
  }

  const firstIncompleteModule =
    params.modules.find(isModuleIncomplete) ?? null

  if (firstIncompleteModule) {
    return firstIncompleteModule
  }

  return params.modules[params.modules.length - 1] ?? null
}

export function findChallengeSlugForStep(
  module: ChallengeModuleDefinition,
  stepId: string,
): string | null {
  for (const challenge of module.challenges) {
    if (challenge.steps.some((s) => s.id === stepId)) {
      return challenge.slug
    }
  }
  return null
}

export function getStepContentProgress(
  content: Readonly<Record<string, LearningContentProgress>>,
  stepId: string,
): LearningContentStatus | undefined {
  return content[stepId]?.status
}
