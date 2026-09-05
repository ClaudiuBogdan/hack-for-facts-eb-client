import { z } from "zod";

/** Preserve all source identity intent through routing, including invalid explicit values. */
export const entityInsSourceSearchSchema = z.object({
  insDataset: z.unknown().optional(),
  insSeries: z.unknown().optional(),
  insUnit: z.unknown().optional(),
  insTemporal: z.unknown().optional(),
  insSourcePins: z.unknown().optional(),
  insSourceUnit: z.unknown().optional(),
  insSourceCadence: z.unknown().optional(),
});
export type EntityInsSelectionInput = z.infer<
  typeof entityInsSourceSearchSchema
>;
export type EntityInsSourceSearch = Pick<
  EntityInsSelectionInput,
  "insSourcePins" | "insSourceUnit" | "insSourceCadence"
>;
