import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const NewDatasetSearchSchema = z.object({
  cloneRef: z.string().optional(),
  draftId: z.string().optional(),
});

export const Route = createFileRoute('/maps/datasets/new')({
  ssr: false,
  validateSearch: NewDatasetSearchSchema,
});
