import { z } from 'zod'

export const InteractionScopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('global'),
  }),
  z.object({
    type: z.literal('entity'),
    entityCui: z.string().min(1),
  }),
])

export const InteractionValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('choice'),
    choice: z.object({
      selectedId: z.string().nullable(),
    }),
  }),
  z.object({
    kind: z.literal('text'),
    text: z.object({
      value: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('url'),
    url: z.object({
      value: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('number'),
    number: z.object({
      value: z.number().nullable(),
    }),
  }),
  z.object({
    kind: z.literal('json'),
    json: z.object({
      value: z.record(z.string(), z.unknown()),
    }),
  }),
])

export const InteractionPhaseSchema = z.enum([
  'idle',
  'draft',
  'pending',
  'resolved',
  'error',
])

export const InteractionResultSchema = z.object({
  outcome: z.enum(['correct', 'incorrect']).nullable(),
  score: z.number().nullable().optional(),
  feedbackText: z.string().nullable().optional(),
  response: z.record(z.string(), z.unknown()).nullable().optional(),
  evaluatedAt: z.string().datetime().nullable().optional(),
})

export const InteractionReviewSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewedAt: z.string().datetime().nullable(),
  feedbackText: z.string().nullable().optional(),
})

export const InteractionCompletionRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('outcome'),
    outcome: z.enum(['correct', 'incorrect']),
  }),
  z.object({
    type: z.literal('resolved'),
  }),
  z.object({
    type: z.literal('score-threshold'),
    minScore: z.number(),
  }),
  z.object({
    type: z.literal('component-flag'),
    flag: z.string().min(1),
  }),
])

export const InteractiveStateRecordSchema = z.object({
  key: z.string().min(1),
  interactionId: z.string().min(1),
  lessonId: z.string().min(1),
  kind: z.enum(['quiz', 'url', 'text-input', 'custom']),
  scope: InteractionScopeSchema,
  completionRule: InteractionCompletionRuleSchema,
  phase: InteractionPhaseSchema,
  value: InteractionValueSchema.nullable(),
  result: InteractionResultSchema.nullable(),
  review: InteractionReviewSchema.nullable().optional(),
  updatedAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable().optional(),
})

export const InteractiveAuditEventSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    recordKey: z.string().min(1),
    lessonId: z.string().min(1),
    interactionId: z.string().min(1),
    type: z.literal('submitted'),
    at: z.string().datetime(),
    actor: z.literal('user'),
    value: InteractionValueSchema,
  }),
  z.object({
    id: z.string().min(1),
    recordKey: z.string().min(1),
    lessonId: z.string().min(1),
    interactionId: z.string().min(1),
    type: z.literal('evaluated'),
    at: z.string().datetime(),
    actor: z.literal('system'),
    phase: z.enum(['resolved', 'error']),
    result: InteractionResultSchema,
  }),
])
