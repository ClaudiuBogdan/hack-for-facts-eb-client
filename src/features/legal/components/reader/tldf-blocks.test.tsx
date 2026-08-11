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

describe('separator collapse is visual-only and exactly scoped', () => {
  // An enumeration block: marker run, body, then a SECOND body run whose
  // internal line break must survive. Fold: "\n(1)\nScopul legii.\ncontinuă."
  const litera: TldfBlock = {
    id: 'lit-a',
    kind: 'litera',
    type: 'p',
    span: [0, 30],
    content: [
      { role: 'ttl', sep: '\n', text: '(1)', span: [0, 4] },
      { role: 'bdy', sep: '\n', text: 'Scopul legii.', span: [4, 18] },
      { role: 'bdy', sep: '\n', text: 'continuă.', span: [18, 28] },
    ],
  }

  it('keeps the fold intact and collapses only the leading and marker seps', () => {
    const { container } = render(
      <TldfBlocksView blocks={[litera]} marks={[]} containsNonBmp={false} />,
    )
    // Fidelity first: every character still in the DOM, in order.
    expect(container.textContent).toBe(foldTldfBlocks([litera]))
    // Exactly two collapsed separators: the block-leading one and the one
    // joining the marker to its body. The second body's internal newline
    // renders pre-wrap — a real line break.
    const collapsed = container.querySelectorAll('.whitespace-normal')
    expect(collapsed).toHaveLength(2)
    for (const span of collapsed) expect(span.textContent).toBe('\n')
  })

  it('never collapses a space separator', () => {
    const spaceLed: TldfBlock = {
      id: 'p-1',
      kind: 'paragraf',
      type: 'p',
      span: [0, 10],
      content: [{ sep: ' ', text: 'text.', span: [0, 6] }],
    }
    const { container } = render(
      <TldfBlocksView blocks={[spaceLed]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe(foldTldfBlocks([spaceLed]))
    expect(container.querySelectorAll('.whitespace-normal')).toHaveLength(0)
  })
})
