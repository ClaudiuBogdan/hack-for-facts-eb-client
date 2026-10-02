import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { ProcedureSheet } from '../lib/procedure-model'
import { fetchProcedure } from './procurement-procedure-api'

/**
 * A procedure page's server read, for the route loader only.
 *
 * Two requests one after the other; SEAP loads daily at most, so the sheet is
 * kept in the server process for as long as a shared cache may keep the
 * page. The memo is bounded — there are close to a million notices — and the
 * read has its own deadline, not the request's signal: it is shared across
 * requests. A read past its deadline fails as a read; the page reads it again
 * in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000
const MAX_PROCEDURES = 1_000

// A partial read (the names failed) is served once and read again, never kept.
const procedures = createServerMemo<ProcedureSheet | null>(KEEP_MS, { maxEntries: MAX_PROCEDURES, keep: (sheet) => sheet === null || !sheet.partial })

export interface ProcurementProcedureServerRead {
  readonly id: string
  /** `null`: SEAP has no such notice. Absent: the read failed, and the browser reads it again. */
  readonly procedure?: ProcedureSheet | null
}

export async function readProcurementProcedureForSsr(id: string): Promise<ProcurementProcedureServerRead> {
  try {
    const procedure = await procedures(id, () => fetchProcedure(id, withDeadline(undefined, SSR_DEADLINE_MS)))
    return { id, procedure }
  } catch {
    return { id }
  }
}
