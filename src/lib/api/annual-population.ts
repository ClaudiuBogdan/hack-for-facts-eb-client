import { z } from 'zod';

/** Published denominator for one applied year; never a census fallback. */
export const AnnualPopulationSchema = z.object({
  territoryId: z.number().int().positive(),
  year: z.number().int(),
  population: z.string().regex(/^\d+$/).transform(Number).refine(Number.isSafeInteger).nullable(),
  metadata: z.object({
    sourceYearMin: z.number().int(),
    sourceYearMax: z.number().int(),
    maxCarryAge: z.number().int().nonnegative(),
    carriedCount: z.number().int().nonnegative(),
    provisionalCount: z.number().int().nonnegative(),
    sourceUrl: z.string().url().refine((url) => /^https?:\/\//.test(url)).nullable(),
  }).nullable(),
});

export type AnnualPopulation = z.infer<typeof AnnualPopulationSchema>;
