import { useLayoutEffect, useState } from 'react'
import { useQuizInteraction } from '@/features/learning/hooks/use-learning-interactions'
import { useRegisterLessonChallenge } from '@/features/learning/components/player/lesson-challenges-context'
import { ChallengeSectionedQuiz } from './sectioned-step-interactives'
import { useSectionDynamicInteractiveBridge } from './section-dynamic-interactive-context'

type DynamicQuizOption = {
  readonly id: string
  readonly text: string
  readonly isCorrect: boolean
}

type ChallengeDynamicQuizProps = {
  readonly contentId: string
  readonly quizId: string
  readonly question: string
  readonly options: readonly DynamicQuizOption[]
  readonly explanation: string
  readonly scopePolicy?: 'global' | 'entity'
  readonly entityCui?: string
}

export function ChallengeDynamicQuiz({
  contentId,
  quizId,
  question,
  options,
  explanation,
  scopePolicy = 'global',
  entityCui,
}: ChallengeDynamicQuizProps) {
  const [isPending, setIsPending] = useState(false)
  const bridge = useSectionDynamicInteractiveBridge()
  const setInteractiveState = bridge?.setInteractiveState
  const sectionId = bridge?.activeSectionId ?? quizId
  const quizState = useQuizInteraction({
    contentId,
    quizId,
    options,
    contentVersion: 'v1',
    scopePolicy,
    entityCui,
    trackContentProgress: false,
  })

  useRegisterLessonChallenge({
    id: `quiz:${quizId}`,
    isCompleted: quizState.isCorrect,
  })

  useLayoutEffect(() => {
    if (!setInteractiveState) {
      return
    }

    setInteractiveState({
      sectionId,
      interactive: {
        kind: 'quiz',
        id: quizId,
        question,
        options,
        explanation,
      },
      isAnswered: quizState.isAnswered,
      isCorrect: quizState.isCorrect,
      isPending,
      reset: quizState.reset,
    })

    return () => {
      setInteractiveState(null)
    }
  }, [
    explanation,
    isPending,
    options,
    question,
    quizId,
    quizState.isAnswered,
    quizState.isCorrect,
    quizState.reset,
    sectionId,
    setInteractiveState,
  ])

  return (
    <ChallengeSectionedQuiz
      id={quizId}
      question={question}
      options={options}
      explanation={explanation}
      selectedOptionId={quizState.selectedOptionId}
      onSelect={(optionId) => {
        void (async () => {
          if (quizState.isAnswered || isPending) {
            return
          }

          setIsPending(true)
          try {
            await quizState.answer(optionId)
          } finally {
            setIsPending(false)
          }
        })()
      }}
      isAnswered={quizState.isAnswered}
      isPending={isPending}
      isAccessGranted={true}
      accessReplacement={null}
    />
  )
}
