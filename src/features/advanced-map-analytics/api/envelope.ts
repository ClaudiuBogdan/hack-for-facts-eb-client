import { z } from 'zod';

const EnvelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export function parseEnvelope(payload: unknown): z.infer<typeof EnvelopeSchema> {
  return EnvelopeSchema.parse(payload);
}
