# Learning Interactions Module

This module provides hooks for managing interactive learning components with persistent state that syncs to the API.

## Architecture

```
interactions/
├── README.md                             # This file
├── index.ts                              # Public exports
├── use-quiz-interaction.ts               # Quiz UI hook
├── use-prediction-interaction.ts         # Prediction UI hook
├── use-lesson-completion.ts              # Lesson completion UI hook
├── use-salary-calculator-interaction.ts  # Salary calculator UI hook
├── use-budget-cycle-interaction.ts       # Budget cycle UI hook
├── use-uat-finder-interaction.ts         # UAT finder UI hook
├── use-custom-interaction.ts             # Generic JSON-value interaction hook
```

## Usage

### Quiz Interaction

```tsx
import { useQuizInteraction } from '@/features/learning/hooks/interactions'

function Quiz({ contentId, quizId, options }: Props) {
  const { selectedOptionId, isAnswered, isCorrect, answer, reset } = useQuizInteraction({
    contentId,
    quizId,
    options,
  })

  return (
    <div>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => answer(option.id)}
          disabled={isAnswered}
        >
          {option.text}
        </button>
      ))}
      {isAnswered && !isCorrect && (
        <button onClick={reset}>Try Again</button>
      )}
    </div>
  )
}
```

### Custom Interaction (Generic)

`useCustomInteraction` provides a generic hook for any JSON-value interaction. Use it when no specialized hook exists.

```tsx
import { useCustomInteraction } from '@/features/learning/hooks/interactions'

type SnapshotValue = { selectedItems: string[]; notes: string }

function SnapshotWidget({ lessonId, interactionId }: Props) {
  const { savedValue, isCompleted, saveDraft, submit, complete } =
    useCustomInteraction<SnapshotValue>({
      lessonId,
      interactionId,
      completionRule: { type: 'component-flag', flag: 'isFinished' },
    })

  // saveDraft(value) persists without marking resolved
  // submit(value) persists and marks pending
  // complete(value) persists and marks resolved
}
```

## Adding a New Interaction Type

For simple interactions that store JSON state, use `useCustomInteraction` directly. For interactions with specialized behavior, create a new hook:

### 1. Define Types (`types.ts`)

Add action types to the `LearningInteractionAction` union if the interaction uses `dispatchInteractionAction`. Interactions using the primitive API directly do not need action types.

### 2. Create UI Hook (`interactions/use-my-interaction.ts`)

```ts
import { useCallback, useMemo } from 'react'
import { useLearningProgress } from '../use-learning-progress'
import type { InteractiveDefinition } from '../../types'
import { getJsonValue } from '../../utils/interactive-state'

export function useMyInteraction(params: { lessonId: string; interactionId: string }) {
  const { getInteractiveRecord, saveInteractiveDraft, resolveInteractive, resetInteractive } =
    useLearningProgress()

  const definition = useMemo<InteractiveDefinition>(() => ({
    id: params.interactionId,
    lessonId: params.lessonId,
    kind: 'custom',
    scopePolicy: 'global',
    completionRule: { type: 'resolved' },
  }), [params.interactionId, params.lessonId])

  const record = getInteractiveRecord(definition)
  const value = getJsonValue(record)

  const save = useCallback(async (data: Record<string, unknown>) => {
    await resolveInteractive({
      definition,
      value: { kind: 'json', json: { value: data } },
      outcome: null,
    })
  }, [definition, resolveInteractive])

  return { value, save }
}
```

### 3. Export from Index (`interactions/index.ts`)

```ts
export { useMyInteraction } from './use-my-interaction'
```

## How It Works

### Primitive API

The progress hook (`useLearningProgress`) exposes these primitives:

- `getInteractiveRecord(definition, entityCui?)` - read current record state
- `saveInteractiveDraft({ definition, value, entityCui? })` - save without resolving
- `submitInteractive({ definition, value, entityCui? })` - save and mark pending
- `resolveInteractive({ definition, value, outcome, entityCui? })` - save and mark resolved
- `resetInteractive({ definition, entityCui? })` - reset to idle
- `applyInteractiveEvaluation({ definition, result, entityCui? })` - apply evaluation result

Each primitive creates an `interactive.updated` event that is stored locally and synced to the API.

### Event Flow

1. **User action** (e.g., clicks "Reveal") -> UI hook calls a primitive (e.g., `resolveInteractive`)
2. **Record created** -> `InteractiveStateRecord` built from definition + scope + value
3. **Event emitted** -> `interactive.updated` event with the record payload
4. **Local update** -> Event stored in localStorage, snapshot re-projected
5. **Sync queued** -> Background debounced sync sends events to API (if authenticated)

### State Persistence

- **Guests**: `localStorage` key with pending events queue
- **Authenticated**: Synced to API, cached locally with cursor tracking
- **Cross-tab**: `storage` event listener keeps tabs in sync
- **Offline**: Events queued locally, synced when back online

### Record Identity

Record identity is `interactionId + scope`, not `lessonId`. The `lessonId` is payload metadata only. Entity-scoped interactions with the same base ID but different `entityCui` produce separate records.

## Best Practices

1. **Prefer `useCustomInteraction`** for new interaction types unless specialized behavior is needed
2. **Validate in hooks** - UI hooks should validate inputs before calling primitives
3. **Use readonly types** - All state should be immutable
4. **Handle missing state** - Always provide defaults for undefined state
5. **Unique interaction IDs** - Runtime IDs must be globally unique before scope is applied
