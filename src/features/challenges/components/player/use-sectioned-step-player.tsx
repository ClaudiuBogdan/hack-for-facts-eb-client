import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useLessonCompletion,
  useQuizInteraction,
} from '@/features/learning/hooks/use-learning-interactions'
import { useLessonChallenges } from '@/features/learning/components/player/lesson-challenges-context'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import { deriveInteractiveLifecycleState } from '@/features/learning/utils/interactive-state'
import { getCampaignInteractiveDefinitionByInteractionId } from '@/features/campaigns/buget/civic-interaction-definitions'
import { logger } from '@/lib/logger'
import type { ChallengeLocale, ChallengeStepDefinition } from '../../types'
import type { ChallengeAccessCardVariant } from '../../hooks/use-challenge-access'
import {
  resolveChallengeStepTrackedInteractions,
  resolveChallengeStepLessonChallengeIds,
  type ChallengeStepSection,
} from '../../utils/sectioned-step-markdown'
import { buildCampaignProvocariPath } from '../../constants'
import { ChallengeInteractionAccessReplacement, useSectionedStepMdxComponents } from './challenge-step-mdx-wrappers'
import type { RegisteredDynamicSectionInteractiveState } from './section-dynamic-interactive-context'
import type {
  ChallengeStepViewMode,
  MdxContentProps,
  SectionFooterState,
  SectionNavigationTarget,
} from './challenge-step-player.shared'
import {
  EMPTY_QUIZ_OPTIONS,
  applySectionedStepProgressGate,
  buildAdjacentStepHref,
  clearChallengeStepSearch,
  mergeCurrentSectionIntoStepProgress,
  resolveSectionedBackTarget,
  resolveSectionedStepCompletionState,
  resolveSectionFooterState,
  type SectionLessonChallengeProgress,
} from './challenge-step-player.utils'

const EMPTY_LESSON_CHALLENGE_IDS: readonly string[] = []

type UseSectionedStepPlayerParams = {
  readonly entityCui: string
  readonly entityName?: string
  readonly locale: ChallengeLocale
  readonly moduleSlug: string
  readonly currentSearchSectionId?: string
  readonly currentViewMode: ChallengeStepViewMode
  readonly onSectionChange?: (
    sectionId: string,
    options?: { readonly replace?: boolean },
  ) => void
  readonly stepId: string
  readonly stepTitle: string
  readonly prev: ChallengeStepDefinition | null
  readonly sections: readonly ChallengeStepSection[]
  readonly next: ChallengeStepDefinition | null
  readonly findChallengeSlugForAdjacentStep: (stepId: string) => string
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isAccessGranted: boolean
  readonly isSubmitting: boolean
  readonly onRegister: () => Promise<void>
}

type UseSectionedStepPlayerResult = {
  readonly currentSection: ChallengeStepSection | null
  readonly currentSectionId: string | null
  readonly currentSectionComponent: ComponentType<MdxContentProps> | null
  readonly currentSectionIndex: number
  readonly headerTitle: string | null
  readonly hasPreviousSection: boolean
  readonly hasNextSection: boolean
  readonly backTarget: SectionNavigationTarget
  readonly footerState: SectionFooterState
  readonly sectionedMdxComponents: MdxContentProps['components']
  readonly scrollAreaRef: RefObject<HTMLDivElement | null>
  readonly handleProgressSectionSelect: (sectionId: string) => void
  readonly handleGoToPreviousSection: () => void
  readonly handleGoToNextSection: () => void
  readonly handleSkip: () => void
  readonly handlePrimaryAction: () => void
  readonly setDynamicInteractiveState: (
    state: RegisteredDynamicSectionInteractiveState | null,
  ) => void
}

export function useSectionedStepPlayer({
  entityCui,
  entityName,
  locale,
  moduleSlug,
  currentSearchSectionId,
  currentViewMode,
  onSectionChange,
  stepId,
  stepTitle,
  prev,
  sections,
  next,
  findChallengeSlugForAdjacentStep,
  accessCardVariant,
  isAccessGranted,
  isSubmitting,
  onRegister,
}: UseSectionedStepPlayerParams): UseSectionedStepPlayerResult {
  const navigate = useNavigate()
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const [fallbackSectionId, setFallbackSectionId] = useState<string | undefined>(undefined)
  const [pendingQuizOptionId, setPendingQuizOptionId] = useState<string | null>(null)
  const [isSubmittingQuizAnswer, setIsSubmittingQuizAnswer] = useState(false)
  const [dynamicInteractiveState, setDynamicInteractiveStateState] =
    useState<RegisteredDynamicSectionInteractiveState | null>(null)
  const [visitedSectionIds, setVisitedSectionIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [sectionChallengeProgressById, setSectionChallengeProgressById] =
    useState<Record<string, SectionLessonChallengeProgress>>({})
  const { markComplete } = useLessonCompletion({ contentId: stepId, contentVersion: 'v1' })
  const { challenges: currentLessonChallenges } = useLessonChallenges()
  const { getInteractiveRecord } = useLearningProgress()
  const resolvedSectionId = currentSearchSectionId ?? fallbackSectionId

  const currentSectionIndex = useMemo(() => {
    if (!sections.length) return 0
    const sectionIndex = sections.findIndex((section) => section.id === resolvedSectionId)
    return sectionIndex >= 0 ? sectionIndex : 0
  }, [resolvedSectionId, sections])

  const currentSection = sections[currentSectionIndex] ?? null
  const currentInteractive = currentSection?.interactive ?? null
  const isLastSection = currentSectionIndex === sections.length - 1
  const previousSection = currentSectionIndex > 0 ? sections[currentSectionIndex - 1] : null
  const nextSection = currentSectionIndex < sections.length - 1 ? sections[currentSectionIndex + 1] : null
  const quizInteractive = currentInteractive?.kind === 'quiz' ? currentInteractive : null
  const trackedLessonChallengeIdsBySectionId = useMemo(
    () =>
      sections.reduce<Record<string, readonly string[]>>((trackedIds, section) => {
        const resolvedLessonChallengeIds =
          resolveChallengeStepLessonChallengeIds({
            descriptors: section.lessonChallengeDescriptors,
            stepId,
          })
        const inlineQuizChallengeId =
          section.interactive?.kind === 'quiz'
            ? `quiz:${section.interactive.id}`
            : null
        const isPureInlineQuizSection =
          inlineQuizChallengeId !== null &&
          resolvedLessonChallengeIds.length === 1 &&
          resolvedLessonChallengeIds[0] === inlineQuizChallengeId

        trackedIds[section.id] = isPureInlineQuizSection
          ? EMPTY_LESSON_CHALLENGE_IDS
          : resolvedLessonChallengeIds

        return trackedIds
      }, {}),
    [sections, stepId],
  )
  const currentSectionLessonChallengeIds = currentSection?.id
    ? trackedLessonChallengeIdsBySectionId[currentSection.id] ??
      EMPTY_LESSON_CHALLENGE_IDS
    : EMPTY_LESSON_CHALLENGE_IDS
  const currentSectionHasLessonChallenges =
    currentSectionLessonChallengeIds.length > 0
  const currentSectionAllLessonChallengesCompleted =
    currentSectionLessonChallengeIds.every(
      (challengeId) => currentLessonChallenges[challengeId] === true,
    )
  const requiredVisitedSectionIds = useMemo(
    () =>
      sections
        .filter(
          (section) =>
            (trackedLessonChallengeIdsBySectionId[section.id]?.length ?? 0) > 0,
        )
        .map((section) => section.id),
    [sections, trackedLessonChallengeIdsBySectionId],
  )
  const stepHasTrackedLessonChallenges = useMemo(
    () =>
      Object.values(trackedLessonChallengeIdsBySectionId).some(
        (challengeIds) => challengeIds.length > 0,
      ),
    [trackedLessonChallengeIdsBySectionId],
  )
  const effectiveStepProgress = useMemo(
    () =>
      mergeCurrentSectionIntoStepProgress({
        currentSectionId: currentSection?.id ?? null,
        currentSectionHasLessonChallenges,
        currentSectionAllLessonChallengesCompleted,
        visitedSectionIds,
        sectionChallengeProgressById,
      }),
    [
      currentSection?.id,
      currentSectionAllLessonChallengesCompleted,
      currentSectionHasLessonChallenges,
      sectionChallengeProgressById,
      visitedSectionIds,
    ],
  )
  const sectionedStepCompletionState = useMemo(
    () =>
      resolveSectionedStepCompletionState({
        requiredVisitedSectionIds,
        visitedSectionIds: effectiveStepProgress.visitedSectionIds,
        sectionChallengeProgressById:
          effectiveStepProgress.sectionChallengeProgressById,
      }),
    [
      effectiveStepProgress.sectionChallengeProgressById,
      effectiveStepProgress.visitedSectionIds,
      requiredVisitedSectionIds,
    ],
  )
  const currentSectionCustomInteractionLifecycles = useMemo(() => {
    if (!currentSection) {
      return []
    }

    return resolveChallengeStepTrackedInteractions({
      descriptors: currentSection.lessonChallengeDescriptors,
      stepId,
    })
      .filter((interaction) => interaction.interactionKind === 'custom')
      .map((interaction) => {
        const record = getInteractiveRecord(
          {
            id: interaction.interactionId,
            scopePolicy: interaction.scopePolicy,
          },
          interaction.scopePolicy === 'entity' ? entityCui : undefined,
        )
        const lifecycleMode =
          getCampaignInteractiveDefinitionByInteractionId(
            interaction.interactionId,
          )?.lifecycleMode ?? 'immediate'

        return deriveInteractiveLifecycleState(record, lifecycleMode)
      })
  }, [currentSection, entityCui, getInteractiveRecord, stepId])

  const changeSection = useCallback(
    (sectionId: string, options?: { readonly replace?: boolean }) => {
      if (onSectionChange) {
        onSectionChange(sectionId, options)
        return
      }

      setFallbackSectionId(sectionId)
    },
    [onSectionChange],
  )

  useEffect(() => {
    setFallbackSectionId(undefined)
    setVisitedSectionIds(new Set())
    setSectionChallengeProgressById({})
  }, [stepId])

  useEffect(() => {
    setDynamicInteractiveStateState(null)
  }, [currentSection?.id])

  useEffect(() => {
    if (!currentSection?.id) return

    setVisitedSectionIds((currentIds) => {
      if (currentIds.has(currentSection.id)) {
        return currentIds
      }

      const nextIds = new Set(currentIds)
      nextIds.add(currentSection.id)
      return nextIds
    })
  }, [currentSection?.id])

  useEffect(() => {
    if (!currentSection?.id) return

    setSectionChallengeProgressById((currentProgress) => {
      const nextProgress = {
        hasChallenges: currentSectionHasLessonChallenges,
        allChallengesCompleted:
          !currentSectionHasLessonChallenges ||
          currentSectionAllLessonChallengesCompleted,
      } as const satisfies SectionLessonChallengeProgress
      const previousProgress = currentProgress[currentSection.id]

      if (
        previousProgress &&
        previousProgress.hasChallenges === nextProgress.hasChallenges &&
        previousProgress.allChallengesCompleted ===
          nextProgress.allChallengesCompleted
      ) {
        return currentProgress
      }

      return {
        ...currentProgress,
        [currentSection.id]: nextProgress,
      }
    })
  }, [
    currentSection?.id,
    currentSectionAllLessonChallengesCompleted,
    currentSectionHasLessonChallenges,
  ])

  useEffect(() => {
    if (!currentSection) return
    if (resolvedSectionId === currentSection.id) return
    changeSection(currentSection.id, { replace: true })
  }, [changeSection, currentSection, resolvedSectionId])

  const quizState = useQuizInteraction({
    contentId: stepId,
    quizId: quizInteractive?.id ?? '__inactive-quiz__',
    options: quizInteractive?.options ?? EMPTY_QUIZ_OPTIONS,
    contentVersion: 'v1',
    scopePolicy: quizInteractive?.scopePolicy ?? 'global',
    entityCui: quizInteractive?.scopePolicy === 'entity' ? entityCui : undefined,
    trackContentProgress: false,
  })

  useEffect(() => {
    setPendingQuizOptionId(quizState.selectedOptionId)
  }, [currentSection?.id, quizState.selectedOptionId])

  useEffect(() => {
    setIsSubmittingQuizAnswer(false)
  }, [currentSection?.id])

  useEffect(() => {
    if (!currentSection?.id) return
    if (!scrollAreaRef.current) return
    scrollAreaRef.current.scrollTop = 0
  }, [currentSection?.id, currentViewMode])

  const accessReplacement = useMemo(
    () => (
      <ChallengeInteractionAccessReplacement
        entityName={entityName}
        locale={locale}
        accessCardVariant={accessCardVariant}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    ),
    [accessCardVariant, entityName, isSubmitting, locale, onRegister],
  )

  const quizAnswerRef = useRef(quizState.answer)
  quizAnswerRef.current = quizState.answer
  const quizIsAnsweredRef = useRef(quizState.isAnswered)
  quizIsAnsweredRef.current = quizState.isAnswered

  const handlePendingQuizOptionChange = useCallback((optionId: string) => {
    void (async () => {
      if (!quizInteractive || quizIsAnsweredRef.current || isSubmittingQuizAnswer || !isAccessGranted) {
        return
      }

      setPendingQuizOptionId(optionId)
      setIsSubmittingQuizAnswer(true)

      try {
        await quizAnswerRef.current(optionId)
      } finally {
        setIsSubmittingQuizAnswer(false)
      }
    })()
  }, [isAccessGranted, isSubmittingQuizAnswer, quizInteractive])

  const sectionedMdxComponents = useSectionedStepMdxComponents({
    entityCui,
    stepId,
    locale,
    accessReplacement,
    isAccessGranted,
    pendingQuizOptionId,
    onPendingQuizOptionChange: handlePendingQuizOptionChange,
    isQuizAnswered: quizState.isAnswered,
    isQuizPending: isSubmittingQuizAnswer,
  })

  const effectiveInteractive =
    currentInteractive ??
    (dynamicInteractiveState?.sectionId === currentSection?.id
      ? dynamicInteractiveState.interactive
      : null)
  const effectiveQuizState =
    currentInteractive?.kind === 'quiz'
      ? {
          isAnswered: quizState.isAnswered,
          isCorrect: quizState.isCorrect,
        }
      : dynamicInteractiveState?.sectionId === currentSection?.id
        ? {
            isAnswered: dynamicInteractiveState.isAnswered,
            isCorrect: dynamicInteractiveState.isCorrect,
          }
        : {
            isAnswered: false,
            isCorrect: false,
          }
  const effectiveIsQuizPending =
    currentInteractive?.kind === 'quiz'
      ? isSubmittingQuizAnswer
      : dynamicInteractiveState?.sectionId === currentSection?.id
        ? dynamicInteractiveState.isPending
        : false

  const footerState = useMemo(
    () =>
      applySectionedStepProgressGate({
        baseFooterState: resolveSectionFooterState({
          interactive: effectiveInteractive,
          customInteractionLifecycles:
            currentSectionCustomInteractionLifecycles,
          isLastSection,
          isAccessGranted,
          hasLessonChallenges: currentSectionHasLessonChallenges,
          allLessonChallengesCompleted:
            currentSectionAllLessonChallengesCompleted,
          isQuizPending: effectiveIsQuizPending,
          quizState: effectiveQuizState,
        }),
        isLastSection,
        isAccessGranted,
        requiredVisitedSectionIds,
        visitedSectionIds: effectiveStepProgress.visitedSectionIds,
        sectionChallengeProgressById:
          effectiveStepProgress.sectionChallengeProgressById,
      }),
    [
      currentSectionAllLessonChallengesCompleted,
      currentSectionCustomInteractionLifecycles,
      currentSectionHasLessonChallenges,
      effectiveStepProgress.sectionChallengeProgressById,
      effectiveStepProgress.visitedSectionIds,
      effectiveInteractive,
      effectiveIsQuizPending,
      effectiveQuizState,
      isAccessGranted,
      isLastSection,
      requiredVisitedSectionIds,
    ],
  )

  const handleRetry = useCallback(async () => {
    if (quizInteractive) {
      await quizState.reset()
      setPendingQuizOptionId(null)
      return
    }

    if (dynamicInteractiveState?.sectionId === currentSection?.id) {
      await dynamicInteractiveState.reset()
    }
  }, [currentSection?.id, dynamicInteractiveState, quizInteractive, quizState])

  const handleCheck = useCallback(async () => {
    if (quizInteractive && pendingQuizOptionId) {
      await quizState.answer(pendingQuizOptionId)
    }
  }, [pendingQuizOptionId, quizInteractive, quizState])

  const handleAdvance = useCallback(async () => {
    if (!isLastSection && nextSection) {
      changeSection(nextSection.id)
      return
    }

    if (!isAccessGranted) return

    if (
      sectionedStepCompletionState.canMarkStepComplete &&
      !stepHasTrackedLessonChallenges
    ) {
      await markComplete()
    }

    const destination = next
      ? buildAdjacentStepHref({
          entityCui,
          moduleSlug,
          step: next,
          findChallengeSlugForAdjacentStep,
        })
      : buildCampaignProvocariPath(entityCui)

    await navigate({
      to: destination as '/',
      search: (previousSearch) => clearChallengeStepSearch(previousSearch),
      resetScroll: true,
    })
  }, [
    changeSection,
    entityCui,
    findChallengeSlugForAdjacentStep,
    isAccessGranted,
    isLastSection,
    markComplete,
    moduleSlug,
    navigate,
    next,
    nextSection,
    sectionedStepCompletionState.canMarkStepComplete,
    stepHasTrackedLessonChallenges,
  ])

  const handleSkip = useCallback(async () => {
    if (nextSection) {
      changeSection(nextSection.id)
      return
    }

    const destination = next
      ? buildAdjacentStepHref({
          entityCui,
          moduleSlug,
          step: next,
          findChallengeSlugForAdjacentStep,
        })
      : buildCampaignProvocariPath(entityCui)

    await navigate({
      to: destination as '/',
      search: (previousSearch) => clearChallengeStepSearch(previousSearch),
      resetScroll: true,
    })
  }, [
    changeSection,
    entityCui,
    findChallengeSlugForAdjacentStep,
    moduleSlug,
    navigate,
    next,
    nextSection,
  ])

  const handleProgressSectionSelect = useCallback(
    (sectionId: string) => {
      if (sectionId === currentSection?.id) return
      changeSection(sectionId)
    },
    [changeSection, currentSection?.id],
  )

  const handleGoToPreviousSection = useCallback(() => {
    if (!previousSection) return
    changeSection(previousSection.id)
  }, [changeSection, previousSection])

  const handleGoToNextSection = useCallback(() => {
    if (!nextSection) return
    changeSection(nextSection.id)
  }, [changeSection, nextSection])

  const handlePrimaryAction = useCallback(() => {
    if (footerState.primaryAction === 'retry') {
      handleRetry().catch((error) => {
        logger.error('Failed to retry sectioned step action.', { error })
      })
      return
    }

    if (footerState.primaryAction === 'check') {
      handleCheck().catch((error) => {
        logger.error('Failed to check sectioned step action.', { error })
      })
      return
    }

    handleAdvance().catch((error) => {
      logger.error('Failed to advance sectioned step action.', { error })
    })
  }, [footerState.primaryAction, handleAdvance, handleCheck, handleRetry])

  const backTarget = useMemo(
    () =>
      resolveSectionedBackTarget({
        currentViewMode,
        previousSectionId: previousSection?.id ?? null,
        prev,
        entityCui,
        moduleSlug,
        findChallengeSlugForAdjacentStep,
      }),
    [
      currentViewMode,
      entityCui,
      findChallengeSlugForAdjacentStep,
      moduleSlug,
      prev,
      previousSection?.id,
    ],
  )

  const setDynamicInteractiveState = useCallback(
    (nextState: RegisteredDynamicSectionInteractiveState | null) => {
      setDynamicInteractiveStateState((currentState) => {
        if (currentState === nextState) {
          return currentState
        }

        if (currentState === null || nextState === null) {
          return nextState
        }

        const isSameInteractive =
          currentState.sectionId === nextState.sectionId &&
          currentState.isAnswered === nextState.isAnswered &&
          currentState.isCorrect === nextState.isCorrect &&
          currentState.isPending === nextState.isPending &&
          currentState.reset === nextState.reset &&
          currentState.interactive.id === nextState.interactive.id &&
          currentState.interactive.question === nextState.interactive.question &&
          currentState.interactive.explanation === nextState.interactive.explanation &&
          currentState.interactive.options === nextState.interactive.options

        return isSameInteractive ? currentState : nextState
      })
    },
    [],
  )

  return {
    currentSection,
    currentSectionId: currentSection?.id ?? null,
    currentSectionComponent: currentSection?.Component ?? null,
    currentSectionIndex,
    headerTitle:
      currentSection &&
      !currentSection.hideSectionTitle &&
      !currentSection.interactive &&
      currentSection.title.trim().length > 0 &&
      currentSection.title !== stepTitle
        ? currentSection.title
        : null,
    hasPreviousSection: previousSection !== null,
    hasNextSection: nextSection !== null,
    backTarget,
    footerState,
    sectionedMdxComponents,
    scrollAreaRef,
    handleProgressSectionSelect,
    handleGoToPreviousSection,
    handleGoToNextSection,
    handleSkip,
    handlePrimaryAction,
    setDynamicInteractiveState,
  }
}
