import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/maps/datasets/$datasetId')({
  ssr: false,
});
