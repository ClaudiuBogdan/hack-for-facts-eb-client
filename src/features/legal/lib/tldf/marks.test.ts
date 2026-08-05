import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { actionableMark, buildMarkIndex, sliceRun } from './marks'

import type {
  TldfBlock,
  TldfEnvelope,
  TldfMark,
  TldfRun,
} from './types'

const fixtureDir = join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf')

interface RenderRowFixture {
  readonly chunk_index: number
  readonly tldf: unknown
}

/** Fixture 100023 is a single-row artifact: chunk 0 IS the envelope. */
function loadEnvelope100023(): TldfEnvelope {
  const rows = JSON.parse(
    readFileSync(join(fixtureDir, 'render-rows-100023.json'), 'utf8'),
  ) as readonly RenderRowFixture[]
  const head = rows[0]
  if (head === undefined) throw new Error('fixture missing chunk 0')
  return head.tldf as TldfEnvelope
}

function collectRuns(blocks: readonly TldfBlock[]): TldfRun[] {
  const runs: TldfRun[] = []
  const walk = (block: TldfBlock): void => {
    runs.push(...block.content)
    for (const child of block.children ?? []) walk(child)
  }
  for (const block of blocks) walk(block)
  return runs
}

describe('mark slicing against the real fixture (doc 100023, 11 act marks)', () => {
  const envelope = loadEnvelope100023()
  const index = buildMarkIndex(envelope.marks, envelope.contains_non_bmp)
  const runs = collectRuns(envelope.blocks)

  it('partition property: every run re-concatenates exactly from its segments', () => {
    expect(runs.length).toBeGreaterThan(0)
    for (const run of runs) {
      const sliced = sliceRun(index, run)
      expect(sliced.segments.map((s) => s.text).join('')).toBe(run.text)
      expect(sliced.skippedMarkOrdinals).toHaveLength(0)
    }
  })

  it('every document mark surfaces on at least one segment', () => {
    const seen = new Set<number>()
    for (const run of runs) {
      for (const segment of sliceRun(index, run).segments) {
        for (const mark of segment.marks) seen.add(mark.ordinal)
      }
    }
    for (const mark of envelope.marks) {
      expect(seen.has(mark.ordinal), `mark ${String(mark.ordinal)}`).toBe(true)
    }
  })

  it('marked segment text equals the mark span sliced from the run coordinates', () => {
    const mark = envelope.marks.find(
      (m) => m.kind === 'reference' && m.link?.kind === 'act',
    )
    expect(mark).toBeDefined()
    if (mark === undefined) return
    const owner = runs.find(
      (run) => run.span[0] <= mark.span[0] && run.span[1] >= mark.span[1],
    )
    expect(owner).toBeDefined()
    if (owner === undefined) return
    const sliced = sliceRun(index, owner)
    const markedText = sliced.segments
      .filter((s) => s.marks.some((m) => m.ordinal === mark.ordinal))
      .map((s) => s.text)
      .join('')
    expect(markedText).toBe(
      owner.text.slice(mark.span[0] - owner.span[0], mark.span[1] - owner.span[0]),
    )
    expect(markedText.length).toBe(mark.span[1] - mark.span[0])
  })
})

describe('mark slicing edge cases (synthetic)', () => {
  const run = (text: string, start: number): TldfRun => ({
    text,
    span: [start, start + text.length],
  })
  const mark = (ordinal: number, start: number, end: number): TldfMark => ({
    ordinal,
    kind: 'reference',
    span: [start, end],
    link: { kind: 'act', target_act_id: 1 },
  })

  it('adjacent marks produce adjacent segments without a gap', () => {
    const index = buildMarkIndex([mark(0, 2, 4), mark(1, 4, 6)], false)
    const sliced = sliceRun(index, run('abcdefgh', 0))
    expect(sliced.segments.map((s) => s.text)).toEqual(['ab', 'cd', 'ef', 'gh'])
    expect(sliced.segments[1]?.marks[0]?.ordinal).toBe(0)
    expect(sliced.segments[2]?.marks[0]?.ordinal).toBe(1)
  })

  it('nested marks stack and actionableMark picks the innermost reference', () => {
    const outer: TldfMark = {
      ordinal: 0,
      kind: 'legal_ref',
      span: [0, 8],
    }
    const inner = mark(1, 2, 6)
    const index = buildMarkIndex([outer, inner], false)
    const sliced = sliceRun(index, run('abcdefgh', 0))
    const nested = sliced.segments.find((s) => s.marks.length === 2)
    expect(nested).toBeDefined()
    expect(actionableMark(nested ?? { text: '', marks: [] })?.ordinal).toBe(1)
  })

  it('a mark spanning past the run is clipped to the run window', () => {
    const index = buildMarkIndex([mark(0, 4, 20)], false)
    const sliced = sliceRun(index, run('abcdefgh', 0))
    expect(sliced.segments.map((s) => s.text)).toEqual(['abcd', 'efgh'])
    expect(sliced.segments[1]?.marks).toHaveLength(1)
  })

  it('surrogate guard: a mark boundary inside a pair skips the mark, keeps the text', () => {
    // '𝕏' is U+1D54F — two UTF-16 code units at offsets 2..4.
    const text = `ab𝕏cd`
    const index = buildMarkIndex([mark(0, 1, 3)], true)
    const sliced = sliceRun(index, run(text, 0))
    expect(sliced.skippedMarkOrdinals).toEqual([0])
    expect(sliced.segments.map((s) => s.text).join('')).toBe(text)
    expect(sliced.segments.every((s) => s.marks.length === 0)).toBe(true)
  })

  it('the same boundary is fine when the document declares no non-BMP content', () => {
    const index = buildMarkIndex([mark(0, 1, 3)], false)
    const sliced = sliceRun(index, run('abcde', 0))
    expect(sliced.skippedMarkOrdinals).toHaveLength(0)
    expect(sliced.segments.map((s) => s.text)).toEqual(['a', 'bc', 'de'])
  })
})
