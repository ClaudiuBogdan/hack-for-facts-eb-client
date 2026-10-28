import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { LegislationFrontDoor } from '@/schemas/legal'
import { fetchLegislationFrontDoor } from './legal-api'

/**
 * The `/legislation` front door's server read, for the route loader only.
 *
 * TanStack Start sends no HTML until the loader resolves. The corpus has been
 * frozen since its last capture, so the read is kept in the server process
 * for as long as a shared cache may keep the page (ten minutes), and past
 * that served while one read refreshes it (`createServerMemo`). It is keyed
 * by year, as the read is. The read has its own deadline, not the request's
 * signal: it is shared across requests. Past the deadline it fails as a read:
 * the render goes out `no-store` and the browser reads it again.
 */

const SSR_DEADLINE_MS = 5_000
const KEEP_MS = 10 * 60 * 1000

const frontDoor = createServerMemo<LegislationFrontDoor>(KEEP_MS)

export function readLegislationFrontDoorForSsr(): Promise<LegislationFrontDoor> {
  return frontDoor(String(new Date().getFullYear()), () => fetchLegislationFrontDoor(withDeadline(undefined, SSR_DEADLINE_MS)))
}
