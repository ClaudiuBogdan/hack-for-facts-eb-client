import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { CaseSheet } from '../lib/case-model'
import type { CourtSheet } from '../lib/court-model'
import { fetchCaseSheet } from './judicial-case-api'
import { fetchCourtSheet } from './judicial-court-api'

/**
 * The court and case pages' server reads, for the route loaders only.
 *
 * The court portal's capture is frozen, so a sheet is kept in the server
 * process for as long as a shared cache may keep the page. The memos are
 * bounded (247 courts by year, millions of cases) and each read has its own
 * deadline, not a request's signal: a read is shared across requests. A read
 * past its deadline fails as a read; the page reads it again in the browser
 * and the render goes out `no-store`. A partial sheet is served once, never
 * kept.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000

const courts = createServerMemo<CourtSheet | null>(KEEP_MS, { maxEntries: 600, keep: (sheet) => sheet === null || !sheet.partial })
const cases = createServerMemo<CaseSheet | null>(KEEP_MS, { maxEntries: 1_000, keep: (sheet) => sheet === null || !sheet.partial })

export interface JusticeCourtServerRead {
  readonly code: string
  readonly year: number
  /** `null`: the API has no such court. Absent: the read failed, and the browser reads it again. */
  readonly court?: CourtSheet | null
}

export interface JusticeCaseServerRead {
  readonly code: string
  readonly number: string
  /** `null`: the court has no case of that number. Absent: the read failed, and the browser reads it again. */
  readonly sheet?: CaseSheet | null
}

export async function readCourtForSsr(code: string, year: number): Promise<JusticeCourtServerRead> {
  try {
    const court = await courts(`${code}:${year}`, () => fetchCourtSheet(code, year, withDeadline(undefined, SSR_DEADLINE_MS)))
    return { code, year, court }
  } catch {
    return { code, year }
  }
}

export async function readCaseForSsr(code: string, number: string): Promise<JusticeCaseServerRead> {
  try {
    const sheet = await cases(`${code}|${number}`, () => fetchCaseSheet(code, number, withDeadline(undefined, SSR_DEADLINE_MS)))
    return { code, number, sheet }
  } catch {
    return { code, number }
  }
}
