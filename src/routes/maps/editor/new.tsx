import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { decodersForReader } from '@/features/advanced-map-analytics/api/advanced-map-analytics-api';

const NewMapSearchSchema = z.object({
  cloneRef: z.string().optional(),
  state: z.unknown().optional(),
});

export const Route = createFileRoute('/maps/editor/new')({
  ssr: false,
  validateSearch: NewMapSearchSchema,
  // The page claims an editable copy's one-time handoff as it renders, then
  // creates the map, which needs the response decoder. Loading it first means a
  // failed load (and its fresh-page recovery) comes before the handoff is spent.
  loader: async () => {
    await decodersForReader();
  },
});
