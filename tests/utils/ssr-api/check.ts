/**
 * A test's check (TEST-001), apart from Playwright so it can be tested on its own
 * (`tests/integration/ssr-api-check.spec.ts`).
 */

export type Read = { readonly seq: number; readonly source: string; readonly key: string; readonly from: string; readonly nationalBudget: boolean }

const served = (read: Read) => read.source === 'fixture' || read.source === 'recorded'

/** The reads a check fails on: a browser read, or a national budget read on either side, not answered from a fixture. */
export function unservedOf(reads: readonly Read[]): readonly Read[] {
  return reads.filter((read) => (read.from === 'browser' || read.nationalBudget) && !served(read))
}

/**
 * One test's check, from the server's judged mark: the reads after it, what among them fails the test, and the
 * mark moved past them. A read that lands after a check (a page still closing) is the next check's, in this worker
 * or, after a restart, in the next; it is judged once, by the first check that sees it. With `serverAfter` (one
 * worker: the newest read when the test began), every server read after it is the test's own and must have been
 * served too.
 */
export function judge(reads: readonly Read[], mark: number, serverAfter: number | null = null): { readonly unserved: readonly Read[]; readonly mark: number } {
  const window = reads.filter((read) => read.seq > mark)
  const own = serverAfter === null ? [] : window.filter((read) => read.from === 'server' && !read.nationalBudget && read.seq > serverAfter && !served(read))
  return { unserved: [...unservedOf(window), ...own].sort((a, b) => a.seq - b.seq), mark: window[window.length - 1]?.seq ?? mark }
}
