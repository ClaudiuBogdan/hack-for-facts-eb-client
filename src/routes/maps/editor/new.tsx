import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const NewMapSearchSchema = z.object({
  state: z.unknown().optional(),
});

export const Route = createFileRoute('/maps/editor/new')({
  ssr: false,
  validateSearch: NewMapSearchSchema,
});
