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
import type { ChallengeLocale, ChallengeStepDefinition } from '../../types'
import type { ChallengeAccessCardVariant } from '../../hooks/use-challenge-access'
import type { ChallengeStepSection } from '../../utils/sectioned-step-markdown'
import { buildCampaignProvocariPath } from '../../constants'
import { ChallengeInteractionAccessReplacement, useSectionedStepMdxComponents } from './challenge-step-mdx-wrappers'
import type {
  ChallengeStepViewMode,
  MdxContentProps,
  SectionFooterState,
  SectionNavigationTarget,
} from './challenge-step-player.shared'
import {
  EMPTY_QUIZ_OPTIONS,
  buildAdjacentStepHref,
  clearChallengeStepSearch,
  resolveSectionedBackTarget,
  resolveSectionFooterState,
} from './challenge-step-player.utils'

type UseSectionedStepPlayerParams = {
  readonly entityCui: string
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
}

export function useSectionedStepPlayer({
  entityCui,
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
  const { markComplete } = useLessonCompletion({ contentId: stepId, contentVersion: 'v1' })
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
  }, [stepId])

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
  })

  useEffect(() => {
    setPendingQuizOptionId(quizState.selectedOptionId)
  }, [currentSection?.id, quizState.selectedOptionId])

  useEffect(() => {
    if (!currentSection?.id) return
    if (!scrollAreaRef.current) return
    scrollAreaRef.current.scrollTop = 0
  }, [currentSection?.id, currentViewMode])

  const accessReplacement = useMemo(
    () => (
      <ChallengeInteractionAccessReplacement
        locale={locale}
        accessCardVariant={accessCardVariant}
        isSubmitting={isSubmitting}
        onRegister={onRegister}
      />
    ),
    [accessCardVariant, isSubmitting, locale, onRegister],
  )

  const sectionedMdxComponents = useSectionedStepMdxComponents({
    accessReplacement,
    isAccessGranted,
    pendingQuizOptionId,
    onPendingQuizOptionChange: setPendingQuizOptionId,
    isQuizAnswered: quizState.isAnswered,
  })

  const canSubmitQuiz =
    quizInteractive !== null && !quizState.isAnswered && pendingQuizOptionId !== null

  const footerState = useMemo(
    () =>
      resolveSectionFooterState({
        interactive: currentInteractive,
        isLastSection,
        isAccessGranted,
        canSubmitQuiz,
        quizState: {
          isAnswered: quizState.isAnswered,
          isCorrect: quizState.isCorrect,
        },
      }),
    [
      canSubmitQuiz,
      currentInteractive,
      isAccessGranted,
      isLastSection,
      quizState.isAnswered,
      quizState.isCorrect,
    ],
  )

  const handleRetry = useCallback(async () => {
    if (quizInteractive) {
      await quizState.reset()
      setPendingQuizOptionId(null)
    }
  }, [quizInteractive, quizState])

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

    await markComplete()

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
  ])

  const handleSkip = useCallback(() => {
    if (!nextSection) return
    changeSection(nextSection.id)
  }, [changeSection, nextSection])

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
      void handleRetry()
      return
    }

    if (footerState.primaryAction === 'check') {
      void handleCheck()
      return
    }

    void handleAdvance()
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

  return {
    currentSection,
    currentSectionComponent: currentSection?.Component ?? null,
    currentSectionIndex,
    headerTitle:
      currentSection && currentSection.title !== stepTitle ? currentSection.title : null,
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
  }
}
