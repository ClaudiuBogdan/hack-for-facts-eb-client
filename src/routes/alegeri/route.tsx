import { createFileRoute } from '@tanstack/react-router'
import { assertFeatureEnabled } from '@/config/feature-flags'

/**
 * The elections pages' layout: no frame of its own, only the gate. While the
 * area is off in a build (`src/config/feature-flags.ts`), every page under
 * `/alegeri` answers 404.
 */
export const Route = createFileRoute('/alegeri')({
  beforeLoad: () => assertFeatureEnabled('elections'),
})
