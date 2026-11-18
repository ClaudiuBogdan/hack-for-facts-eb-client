import { z } from 'zod';
import { lazySchema, type LazyOutput } from '@/lib/route-contract';

// Built on first use: the public map route, which every page evaluates, imports the transport that reads it.
const envelopeSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    data: z.unknown().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
);

export function parseEnvelope(payload: unknown): LazyOutput<typeof envelopeSchema> {
  return envelopeSchema.parse(payload);
}
