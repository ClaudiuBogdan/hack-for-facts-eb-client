import { z } from 'zod'
import type { LearningProgressEvent } from '../types'
import {
  InteractiveAuditEventSchema,
  InteractiveStateRecordSchema,
} from './interactive-record'

const LearningProgressEventBaseSchema = z.object({
  eventId: z.string().min(1),
  occurredAt: z.string().datetime(),
  clientId: z.string().min(1),
  type: z.enum([
    'interactive.updated',
    'progress.reset',
  ]),
})

const InteractiveUpdatedEventSchema = LearningProgressEventBaseSchema.extend({
  type: z.literal('interactive.updated'),
  payload: z.object({
    record: InteractiveStateRecordSchema,
    auditEvents: z.array(InteractiveAuditEventSchema).optional(),
  }),
})

const ProgressResetEventSchema = LearningProgressEventBaseSchema.extend({
  type: z.literal('progress.reset'),
})

const LearningProgressEventSchema = z.discriminatedUnion('type', [
  InteractiveUpdatedEventSchema,
  ProgressResetEventSchema,
])

export function parseLearningProgressEvents(raw: unknown): LearningProgressEvent[] {
  if (!Array.isArray(raw)) return []
  const events: LearningProgressEvent[] = []
  for (const entry of raw) {
    const parsed = LearningProgressEventSchema.safeParse(entry)
    if (parsed.success) {
      events.push(parsed.data)
    }
  }
  return events
}
