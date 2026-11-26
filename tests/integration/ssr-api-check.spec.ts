import { test, expect } from '../utils/integration-base'
import { judge, unservedOf, type Read } from '../utils/ssr-api/check'

// The harness's own check (TEST-001): an unserved read fails exactly one test, the first whose check sees it,
// whichever worker runs it. A check starts at the server's judged mark, which outlives a worker.

const read = (seq: number, source: string, from = 'browser', nationalBudget = true): Read => ({ seq, source, key: `BudgetExecutionObservations-${seq}`, from, nationalBudget })

test.describe('the ssr-api check', () => {
  test('fails on a browser or national budget read with no fixture, and on nothing else', () => {
    const reads = [read(1, 'fixture'), read(2, 'missing'), read(3, 'passthrough', 'server', false), read(4, 'recorded')]
    expect(unservedOf(reads).map((each) => each.seq)).toEqual([2])
  })

  test('one unserved read fails exactly one test, across a worker restart', () => {
    const run = [read(1, 'fixture'), read(2, 'missing'), read(3, 'fixture'), read(4, 'fixture')]
    const upTo = (seq: number) => run.filter((each) => each.seq <= seq)

    // The first test sees read 2: it fails, and moves the mark past it.
    const first = judge(upTo(2), 0)
    expect(first.unserved.map((each) => each.seq)).toEqual([2])
    // The failure restarts the worker; the mark is the server's, so the next test, in the new worker, starts after read 2.
    const second = judge(upTo(3), first.mark)
    expect(second.unserved).toEqual([])
    expect(judge(upTo(4), second.mark).unserved).toEqual([])
  })

  test('with one worker, a test’s own server reads must be served too; earlier tests’ are not its own', () => {
    // Read 2 is an earlier spec's passthrough, before this test began (its newest read then: 2); read 4 is this test's.
    const run = [read(1, 'fixture'), read(2, 'passthrough', 'server', false), read(3, 'fixture', 'server', false), read(4, 'passthrough', 'server', false)]
    expect(judge(run, 0, 2).unserved.map((each) => each.seq)).toEqual([4])
    // With more workers (no `serverAfter`), the app server's reads can't be told apart by test: only the first kind counts.
    expect(judge(run, 0).unserved).toEqual([])
  })

  test('a read that lands after a worker’s last check, before it restarts, fails the next test: never none', () => {
    // Read 3 has no fixture and lands after the first test's check (a page still closing); the worker then restarts.
    const run = [read(1, 'fixture'), read(2, 'fixture'), read(3, 'missing'), read(4, 'fixture')]
    const first = judge(run.slice(0, 2), 0)
    expect(first.unserved).toEqual([])
    // The new worker's first test starts at the server's mark (2), not at the newest read (3): read 3 is its to judge.
    const second = judge(run, first.mark)
    expect(second.unserved.map((each) => each.seq)).toEqual([3])
    expect(judge(run, second.mark).unserved).toEqual([])
  })
})
