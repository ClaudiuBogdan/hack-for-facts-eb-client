# Unified Progress Records Specification

Status: Draft
Last Updated: 2026-03-20
Author: Codex

## 1. Summary

The client-side progress system is built around generic interactive records and client-owned projections.

- The transport layer syncs only `interactive.updated` and `progress.reset`.
- The server returns a generic remote snapshot shaped as `{ version, recordsByKey, lastUpdated }`.
- `LearningGuestProgress` is a projected client view, not the wire snapshot.
- Reserved records under stable `system:*` keys carry onboarding, active path, streak, lesson summary, and campaign-specific state without introducing server-specific event types or tables.
- Local persistence stores a projected snapshot cache, a pending outbound event queue, and sync metadata.

This file is the canonical client-side specification for unified progress sync and projection.

## 2. Core Model

### 2.1 Transport Events

There are only two synced event types:

```ts
type LearningProgressEvent =
  | {
      eventId: string
      occurredAt: string
      clientId: string
      type: 'interactive.updated'
      payload: {
        record: InteractiveStateRecord
        auditEvents?: readonly InteractiveAuditEvent[]
      }
    }
  | {
      eventId: string
      occurredAt: string
      clientId: string
      type: 'progress.reset'
    }
```

Rules:

- `interactive.updated` is the single transport for both user-facing interactions and reserved/system state.
- `progress.reset` clears the entire learning-progress domain and pending event queue.
- The client no longer syncs `content.progressed`, `onboarding.completed`, `onboarding.reset`, or `activePath.set`.
- Meaning is encoded by `record.key`, `record.interactionId`, `record.value`, and projection logic, not by adding more transport event types.

### 2.2 Interactive Records

`InteractiveStateRecord` is the shared storage envelope:

```ts
type InteractiveStateRecord = {
  key: string
  interactionId: string
  lessonId: string
  kind: 'quiz' | 'url' | 'text-input' | 'custom'
  scope: { type: 'global' } | { type: 'entity'; entityCui: string }
  completionRule:
    | { type: 'outcome'; outcome: 'correct' | 'incorrect' }
    | { type: 'resolved' }
    | { type: 'score-threshold'; minScore: number }
    | { type: 'component-flag'; flag: string }
  phase: 'idle' | 'draft' | 'pending' | 'resolved' | 'error'
  value: InteractionValue | null
  result: InteractionResult | null
  updatedAt: string
  submittedAt?: string | null
}
```

Rules:

- `InteractiveStateRecord` is the only persistent record envelope shared across learning and challenge progress.
- The client treats `updatedAt` as the record freshness field.
- `kind: 'custom'` with `value.kind: 'json'` is the standard shape for reserved/system records.
- Audit history is stored separately as `InteractiveAuditEvent[]`, keyed by `recordKey`.

### 2.3 Remote Snapshot vs Projected Snapshot

The server snapshot is intentionally generic:

```ts
type LearningProgressRemoteSnapshot = {
  version: 1
  recordsByKey: Record<string, InteractiveStateRecord>
  lastUpdated: string | null
}
```

The client projects that into:

```ts
type LearningGuestProgress = {
  version: 1
  onboarding: LearningOnboardingState
  activePathId: string | null
  content: Record<string, LearningContentProgress>
  interactiveState: UnifiedInteractiveState
  streak: LearningStreakState
  lastUpdated: string
}
```

Rules:

- The remote snapshot is authoritative wire state.
- The projected snapshot is a client convenience model used by UI hooks and screens.
- The client must never assume the server understands the projected fields.

## 3. Reserved Record Keys

Reserved keys are stable client conventions. The server stores them opaquely and does not understand their semantics.

### 3.1 Learning Reserved Keys

- `system:learning-onboarding`
- `system:learning-active-path`
- `system:learning-streak`
- `system:lesson-progress:<contentId>`

Projection targets:

- `system:learning-onboarding` → `progress.onboarding`
- `system:learning-active-path` → `progress.activePathId`
- `system:learning-streak` → `progress.streak`
- `system:lesson-progress:<contentId>` → `progress.content[contentId]`

Payload conventions:

- `system:learning-onboarding`
  - `{ pathId: string | null, relatedPaths: string[], completedAt: string | null }`
- `system:learning-active-path`
  - `{ pathId: string | null }`
- `system:learning-streak`
  - `{ currentStreak: number, longestStreak: number, lastActivityDate: string | null }`
- `system:lesson-progress:<contentId>`
  - `{ status, score, lastAttemptAt, completedAt, contentVersion }`

### 3.2 Campaign Reserved Keys

The unified record model also supports campaign-owned keys. These remain client conventions, not backend semantics:

- `system:campaign:buget:onboarding`
- `system:campaign:buget:accepted-terms`
- `system:campaign:buget:selected-entity`
- `system:campaign:buget:active-module`
- `system:campaign:buget:challenge:<slug>`

These keys are projected by campaign-specific client logic and are not interpreted by the learning-progress backend.

## 4. Projection Rules

### 4.1 Learning Projection

Learning projection is implemented by:

- `src/features/learning/utils/progress-projection.ts`
- `src/features/learning/utils/progress-event-reducer.ts`
- `src/features/learning/utils/progress-merge.ts`

Projection behavior:

- `interactiveState` includes all records and audit logs, including reserved records.
- `progress.onboarding` is reconstructed from `system:learning-onboarding`.
- `progress.activePathId` is reconstructed from `system:learning-active-path`.
- `progress.streak` is reconstructed from `system:learning-streak`.
- `progress.content` is reconstructed only from `system:lesson-progress:<contentId>` records.
- `progress.lastUpdated` is the max of the projected snapshot timestamp and all record `updatedAt` values.

### 4.2 Merge Behavior

Remote and local state merge by record freshness and audit-event identity:

- records merge by `record.updatedAt`
- newer records replace older ones
- older remote records never downgrade newer local records
- audit events merge by audit-event `id`
- projected app state is always rebuilt from the merged `interactiveState`

## 5. Local Storage and Sync

### 5.1 Client Storage

Learning storage keys:

- guest pending events: `learning_progress_events`
- guest snapshot: `learning_progress_snapshot`
- auth pending events: `learning_progress_events:{userId}`
- auth snapshot: `learning_progress_snapshot:{userId}`
- auth sync metadata: `learning_progress_sync:{userId}`

Rules:

- local snapshots are caches of projected state
- local events are only the pending outbound queue
- sync metadata tracks cursor and retry state
- the client does not persist a canonical full local event history anymore

### 5.2 Bootstrap

Cold bootstrap behavior:

1. load local projected snapshot
2. load pending outbound events
3. fetch remote generic snapshot without `since`
4. treat the remote generic snapshot as authoritative
5. replay pending local events on top of the projected remote state
6. persist the merged projected snapshot locally
7. store the returned server cursor even if `events` is empty

If a local snapshot exists and pending events are newer, the client replays those pending events on top of the snapshot instead of rebuilding from the pending queue alone.

### 5.3 Incremental Sync

Incremental sync behavior:

1. send only pending outbound events
2. on success, remove or mark those events as synced in local storage
3. refetch remote deltas with `since=lastSyncedCursor`
4. apply remote `interactive.updated` events directly to the projected snapshot

Rules:

- remote deltas are applied by `record.updatedAt`, not arrival order
- unseen audit events are merged by audit-event `id`
- `updatedAt` controls freshness
- the server cursor remains an opaque ordering token and is not used as a freshness signal on the client

## 6. Validation Rules

### 6.1 Runtime Interaction Identity

Progress storage identity is:

- `interactionId`
- plus `scope`

It is not:

- `lessonId`
- or `lessonId + interactionId`

Implications:

- runtime-generated interaction ids must be globally unique before scope is applied
- challenge runtime ids should be namespaced by `stepId`
- entity-scoped interactions still need unique base ids; `entityCui` only separates records across entities, not across lessons or steps inside the same entity

### 6.2 Server Schema Design for Union Shapes

The learning-progress REST request schemas are validated by Fastify/AJV, which may validate with `removeAdditional` semantics.

Important rule:

- do not rely on `Type.Union([...])` branches that each use `additionalProperties: false` for inner discriminated objects such as:
  - `scope`
  - `value`
  - `completionRule`
  - audit-event variants

Why:

- AJV can evaluate the wrong union branch first
- branch-level strictness can strip valid fields like `entityCui`, `json`, `phase`, or `result`
- the same payload can then fail later branches with misleading errors such as “missing entityCui” or “type must be equal to constant”

Safe pattern:

- keep outer request/record objects strict where useful
- make inner union branches tolerant enough to survive branch evaluation
- prefer discriminators/orderings that do not mutate valid payloads during failed branch checks

This is a server validation concern, not a progress model concern, but it directly affects whether valid `interactive.updated` payloads can be synced.

## 7. Known Limitation

Fresh-device cold bootstrap cannot reconstruct historical audit logs unless the server snapshot includes them.

Current implication:

- interactive record state can be restored from `recordsByKey`
- audit history only survives across devices if it arrives through remote deltas or is embedded in the server snapshot
- this is an accepted limitation of the current transport model

## 8. Operational Guidance

When adding a new unified-progress concern:

1. decide whether it is a normal interaction record or a reserved/system record
2. if it is reserved/system state, define a stable `system:*` key constant
3. define the JSON payload schema in client code
4. add projection logic from `recordsByKey` into the relevant client snapshot
5. add tests for bootstrap, merge precedence, and sync behavior
6. update this spec with the new reserved key and payload meaning
7. if a new wire schema adds nested unions, verify it under the same Fastify/AJV validation behavior used in production

## References

- `src/features/learning/types.ts`
- `src/features/learning/api/progress.ts`
- `src/features/learning/hooks/use-learning-progress.tsx`
- `src/features/learning/utils/progress-projection.ts`
- `src/features/learning/utils/progress-event-reducer.ts`
- `src/features/learning/utils/progress-merge.ts`
- `src/features/campaigns/buget/utils/progress-records.ts`
- `src/features/campaigns/buget/hooks/use-campaign-progress.tsx`
