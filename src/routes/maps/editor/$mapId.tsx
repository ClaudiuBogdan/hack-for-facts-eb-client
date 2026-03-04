import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/maps/editor/$mapId')({
  ssr: false,
});
