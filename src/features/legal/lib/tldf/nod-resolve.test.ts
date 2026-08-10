import { describe, expect, it } from 'vitest'
import type { LegalOutlineEntry } from '@/schemas/legal'
import type { TldfChunkIndexEntry } from './types'
import { domAnchorForPath, findChunkGroupIndex, findOutlineAnchor, resolveNod } from './nod-resolve'

const entry = (
  path: string,
  depth: number,
  charStart: number | null = 0,
): LegalOutlineEntry => ({
  documentId: '100019',
  path,
  nodeKind: depth === 7 ? 'articol' : 'capitol',
  label: `Nod ${path}`,
  numberKey: null,
  numberStatus: null,
  depth,
  orderIndex: 0,
  charStart,
  charEnd: charStart === null ? null : charStart + 10,
})

const outline: LegalOutlineEntry[] = [
  entry('0.1', 4, 100),
  entry('0.1.2', 7, 500),
  entry('0.1.10', 7, 90_000),
  entry('unmarked:4', 7, 1_000),
]

describe('findOutlineAnchor', () => {
  it('prefers the exact path', () => {
    expect(findOutlineAnchor('0.1.2', outline)?.path).toBe('0.1.2')
  })

  it('falls back to the deepest dotted ancestor for sub-heading grains', () => {
    // An alineat under article 0.1.2 is not an outline heading.
    expect(findOutlineAnchor('0.1.2.3.1', outline)?.path).toBe('0.1.2')
  })

  it('never prefix-matches a sibling that merely shares a string prefix', () => {
    // 0.1.10 starts with the characters of 0.1.1 but is NOT its ancestor.
    expect(findOutlineAnchor('0.1.1', outline)?.path).toBe('0.1')
  })

  it('resolves unmarked keys by exact match only', () => {
    expect(findOutlineAnchor('unmarked:4', outline)?.path).toBe('unmarked:4')
    // No hierarchy on the second key form: a miss is a miss.
    expect(findOutlineAnchor('unmarked:9', outline)).toBeNull()
  })
})

describe('findChunkGroupIndex', () => {
  const chunks: TldfChunkIndexEntry[] = [
    { chunk_index: 1, block_id: '0.0', block_count: 10, span: [0, 50_000] },
    { chunk_index: 2, block_id: '0.5', block_count: 10, span: [50_000, 120_000] },
  ]

  it('picks the group whose span contains the heading start', () => {
    expect(findChunkGroupIndex(entry('0.1.10', 7, 90_000), chunks)).toBe(1)
    expect(findChunkGroupIndex(entry('0.1.2', 7, 500), chunks)).toBe(0)
  })

  it('answers null for a heading without offsets', () => {
    expect(findChunkGroupIndex(entry('0.1', 4, null), chunks)).toBeNull()
  })
})

describe('resolveNod', () => {
  it('composes anchor + chunk pick', () => {
    const resolution = resolveNod('0.1.10.2', outline, [
      { chunk_index: 1, block_id: '0.0', block_count: 10, span: [0, 50_000] },
      { chunk_index: 2, block_id: '0.5', block_count: 10, span: [50_000, 120_000] },
    ])
    expect(resolution?.entry.path).toBe('0.1.10')
    expect(resolution?.chunkGroupIndex).toBe(1)
    expect(domAnchorForPath(resolution?.nod ?? '')).toBe('tldf-0.1.10.2')
  })

  it('is an honest null for an unresolvable nod', () => {
    expect(resolveNod('9.9.9', outline)).toBeNull()
  })
})
