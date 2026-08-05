/**
 * The renderer's ONE invariant, proven on the committed real artifacts: the
 * DOM text content equals the fold of the blocks — the exact character
 * sequence whose sha256 the scrapper compiler pinned. Styling may wrap words
 * in links and spans; it may not add, drop, or reorder one character.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { render } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { foldTldfBlocks } from '../../lib/tldf/fold'
import { TldfBlocksView } from './tldf-blocks'
import type {
  TldfBlock,
  TldfChunkPayload,
  TldfEnvelope,
  TldfMark,
} from '../../lib/tldf/types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to} {...props}>
      {children}
    </a>
  ),
}))

const fixtureDir = join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf')

interface RenderRow {
  readonly chunk_index: number
  readonly tldf: unknown
}

const loadRows = (name: string): RenderRow[] =>
  JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as RenderRow[]

const envelope = loadRows('render-rows-100023.json')[0]?.tldf as TldfEnvelope
const chunkRows = loadRows('render-rows-100019.json')
const chunk1 = chunkRows[1]?.tldf as TldfChunkPayload

describe('TldfBlocksView text fidelity (the fold oracle)', () => {
  it('renders the single-chunk act character-identical to its fold', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={envelope.blocks}
        marks={envelope.marks}
        containsNonBmp={envelope.contains_non_bmp}
      />,
    )
    expect(container.textContent).toBe(foldTldfBlocks(envelope.blocks))
  })

  it('renders one chunk group of the giant act character-identical to its fold', () => {
    const { container } = render(
      <TldfBlocksView blocks={chunk1.blocks} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe(foldTldfBlocks(chunk1.blocks))
  })
})

describe('marks become honest elements', () => {
  it('a resolved act reference renders as an internal link carrying the exact marked words', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={envelope.blocks}
        marks={envelope.marks}
        containsNonBmp={envelope.contains_non_bmp}
      />,
    )
    const documentText = foldTldfBlocks(envelope.blocks)
    const actMark = envelope.marks.find(
      (m): m is TldfMark & { link: { target_act_id: number } } =>
        m.link?.kind === 'act' && typeof m.link.target_act_id === 'number',
    )
    expect(actMark).toBeDefined()
    if (actMark === undefined) return

    const expectedHref = `/legislation/acts/${String(actMark.link.target_act_id)}`
    const links = [...container.querySelectorAll(`a[href="${expectedHref}"]`)]
    expect(links.length).toBeGreaterThan(0)
    const markedText = documentText.slice(actMark.span[0], actMark.span[1])
    expect(links.map((a) => a.textContent).join('')).toContain(markedText)
  })

  it('every act mark of the fixture surfaces as a link, none rewritten', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={envelope.blocks}
        marks={envelope.marks}
        containsNonBmp={envelope.contains_non_bmp}
      />,
    )
    const actMarks = envelope.marks.filter(
      (m) => m.link?.kind === 'act' && typeof m.link.target_act_id === 'number',
    )
    expect(actMarks.length).toBeGreaterThan(0)
    for (const mark of actMarks) {
      const href = `/legislation/acts/${String(mark.link?.target_act_id)}`
      expect(
        container.querySelector(`a[href="${href}"]`),
        `mark ${String(mark.ordinal)} → ${href}`,
      ).not.toBeNull()
    }
  })

  it('an unresolved reference is visibly a reference but NOT a link', () => {
    const blocks: TldfBlock[] = [
      {
        id: 'b1',
        kind: 'paragraf',
        type: 'p',
        span: [0, 20],
        content: [{ text: 'vezi Legea nr. 1/199', span: [0, 20] }],
      },
    ]
    const marks: TldfMark[] = [
      { ordinal: 0, kind: 'reference', span: [5, 20], link: { kind: 'act_missing_id' } },
    ]
    const { container } = render(
      <TldfBlocksView blocks={blocks} marks={marks} containsNonBmp={false} />,
    )
    expect(container.querySelector('a')).toBeNull()
    const marked = container.querySelector('span[title]')
    expect(marked?.textContent).toBe('Legea nr. 1/199')
  })

  it('an unknown block kind falls back to a plain block without losing text', () => {
    const blocks: TldfBlock[] = [
      {
        id: 'x1',
        kind: 'hologramă',
        type: 'p',
        span: [0, 5],
        content: [{ text: 'text.', span: [0, 5] }],
      },
    ]
    const { container } = render(
      <TldfBlocksView blocks={blocks} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe('text.')
    expect(container.querySelector('[data-kind="hologramă"]')).not.toBeNull()
  })
})
