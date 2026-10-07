import { hashKey } from '@tanstack/react-query'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import { questionOf } from '../lib/analysis-model'
import { analysisReads, caseloadKey, type AnalysisSeed, type Caseload, type CaseloadRead } from '../lib/analysis-plans'
import { fetchCaseload } from './judicial-analysis-api'

/**
 * The analysis page's server reads, for the route loader only.
 *
 * Every read the question's answer needs — the levels' counts, the figures,
 * the grouping (and the year before), the years — side by side, each kept in
 * the server process for as long as a shared cache may keep the page, and
 * shared by every question that makes it (the years' read of a matter
 * serves every grouping of it). The capture is frozen, so a kept read does
 * not go stale. Each read has its own deadline, not a request's signal: a
 * read past it fails as a read, the page reads it in the browser and the
 * render goes out `no-store`.
 */

// Short: a slow read is better read in the browser, under the painted page, than held against the whole document.
const SSR_DEADLINE_MS = 4_000
const KEEP_MS = 10 * 60 * 1000

const reads = createServerMemo<Caseload>(KEEP_MS, { maxEntries: 3_000 })

export interface JusticeAnalysisServerRead {
  /** Each read the server made, by the key the page's query has. */
  readonly seed: AnalysisSeed
  /** Every read the question needs was read: the render may be kept by a shared cache. */
  readonly complete: boolean
}

export async function readAnalysisForSsr(search: Readonly<Record<string, unknown>>): Promise<JusticeAnalysisServerRead> {
  const unique = new Map<string, CaseloadRead>()
  // A read that has nothing to read (a court outside the county picked) needs no seed: the page answers zero without it.
  for (const read of analysisReads(questionOf(search))) if (read.filter !== null) unique.set(hashKey(caseloadKey(read)), read)
  const settled = await Promise.allSettled([...unique].map(([hash, read]) => reads(hash, () => fetchCaseload(read, withDeadline(undefined, SSR_DEADLINE_MS))).then((data) => ({ key: caseloadKey(read), data }))))
  const seed = settled.flatMap((read) => (read.status === 'fulfilled' ? [read.value] : []))
  return { seed, complete: seed.length === settled.length }
}
