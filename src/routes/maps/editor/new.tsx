import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { parseSearchParamJson } from '@/lib/router-search';

const NewMapSearchSchema = z.object({
  state: z.preprocess(parseSearchParamJson, AdvancedMapAnalyticsUrlStateSchema).optional(),
});

export const Route = createFileRoute('/maps/editor/new')({
  ssr: false,
  validateSearch: NewMapSearchSchema,
});
