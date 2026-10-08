import { createFileRoute } from '@tanstack/react-router'
import { assertFeatureEnabled } from '@/config/feature-flags'

/**
 * The elections pages' layout: no frame of its own, only the gate. Elections
 * are off in this build (`src/config/feature-flags.ts`), so every page under
 * `/alegeri` answers 404.
 */
export const Route = createFileRoute('/alegeri')({
  beforeLoad: () => assertFeatureEnabled('elections'),
})
