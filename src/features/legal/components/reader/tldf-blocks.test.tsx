/**
 * The renderer's ONE invariant, proven on the committed real artifacts: the
 * DOM text content equals the fold of the blocks — the exact character
 * sequence whose sha256 the scrapper compiler pinned. Styling may wrap words
 * in links and spans; it may not add, drop, or reorder one character.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fireEvent, render } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { foldTldfBlocks } from '../../lib/tldf/fold'
import { revealFoldedNote } from '../../lib/tldf/folded-note'
import { tldfEnvelopeSchema } from '../../lib/tldf/schemas'
import { TldfBlocksView } from './tldf-blocks'
import type {
  TldfBlock,
  TldfChunkPayload,
  TldfEnvelope,
  TldfGrid,
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

  it('joins an article\'s name to its number, and never its body', () => {
    // Fold: "\nArticolul 3\nDefiniții\nÎn sensul prezentei legi."
    const articol: TldfBlock = {
      id: 'art-3',
      kind: 'articol',
      type: 'ART',
      span: [0, 49],
      content: [
        { role: 'ttl', sep: '\n', text: 'Articolul 3', span: [0, 12] },
        { role: 'den', sep: '\n', text: 'Definiții', span: [12, 22] },
        { role: 'bdy', sep: '\n', text: 'În sensul prezentei legi.', span: [22, 48] },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[articol]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe(foldTldfBlocks([articol]))
    // The leading separator and the one before the name; the body keeps its line.
    expect(container.querySelectorAll('.whitespace-normal')).toHaveLength(2)
    expect(container.querySelector('[data-role="den"] > .whitespace-normal')).not.toBeNull()
    expect(container.querySelector('[data-role="bdy"] > .whitespace-normal')).toBeNull()

    // An article with no name: its body is not pulled up beside the number.
    const unnamed: TldfBlock = {
      ...articol,
      id: 'art-4',
      content: [
        { role: 'ttl', sep: '\n', text: 'Articolul 4', span: [0, 12] },
        { role: 'bdy', sep: '\n', text: 'Text.', span: [12, 18] },
      ],
      span: [0, 18],
    }
    const second = render(
      <TldfBlocksView blocks={[unnamed]} marks={[]} containsNonBmp={false} />,
    )
    expect(second.container.textContent).toBe(foldTldfBlocks([unnamed]))
    expect(second.container.querySelectorAll('.whitespace-normal')).toHaveLength(1)
  })

  it.each(['emitent', 'publicare'])('joins the label of %s to its value', (kind) => {
    const block: TldfBlock = {
      id: `${kind}-1`,
      kind,
      type: 'p',
      span: [0, 17],
      content: [
        { role: 'ttl', sep: '\n', text: 'EMITENT', span: [0, 8] },
        { role: 'bdy', sep: '\n', text: 'GUVERNUL', span: [8, 17] },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[block]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe(foldTldfBlocks([block]))
    expect(container.querySelectorAll('.whitespace-normal')).toHaveLength(2)
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

/* ── v1.1 presentation vocabulary ────────────────────────────────────────────
 *
 * HAND-BUILT fixture. Production serves format 1.0 and the scrapper's golden
 * snapshots hold no 1.1 artifact with presentation blocks yet (checked
 * 2026-08-26), so this envelope is constructed by hand against the compiler
 * contract (scrapper `prod/tldf/format.ts`, spec §3.2, and
 * `PORTAL_TABLE_CAPTURE_DESIGN.md`): `tabel`/`rand` own no runs; a cell's
 * boundary separator leads the cell's own first run (as `sep` DATA — run
 * spans cover the text only, the separator sits in the gap before span[0],
 * matching the committed compiler artifacts); `grid` is emitted iff it
 * differs from (1,1) — ABSENT is the canonical 1×1; the empty cell and the
 * image are retained zero-character blocks with zero-width spans. Replace with
 * a captured artifact once the v6 re-projection lands.
 *
 * The modeled 2-column grid (per-row colspan sum with rowspan carry = 2):
 *   ┌───────────────────────┐
 *   │ Clasificare CPV (c=2) │
 *   ├───────────┬───────────┤
 *   │ Legea nr. │ Cod⏎CPV   │
 *   │ 98/2016   ├───────────┤
 *   │ (r=2)     │ (empty)   │
 *   └───────────┴───────────┘
 */

const V11_TEXT =
  'Anexa exemplu.\nClasificare CPV\nLegea nr. 98/2016\nCod\nCPV\nprimul element\nb) al doilea element'

const V11_BLOCKS: readonly TldfBlock[] = [
  {
    id: 'p1',
    kind: 'paragraf',
    type: 'PAR',
    span: [0, 14],
    content: [{ text: 'Anexa exemplu.', span: [0, 14] }],
  },
  {
    id: 't1',
    kind: 'tabel',
    type: 'TBL',
    span: [15, 56],
    content: [],
    children: [
      {
        id: 't1r1',
        kind: 'rand',
        type: 'ROW',
        span: [15, 30],
        content: [],
        children: [
          {
            id: 't1r1c1',
            kind: 'celula',
            type: 'CEL',
            span: [15, 30],
            grid: { cols: 2, rows: 1 },
            content: [{ sep: '\n', text: 'Clasificare CPV', span: [15, 30] }],
          },
        ],
      },
      {
        id: 't1r2',
        kind: 'rand',
        type: 'ROW',
        span: [31, 56],
        content: [],
        children: [
          {
            id: 't1r2c1',
            kind: 'celula',
            type: 'CEL',
            span: [31, 48],
            grid: { cols: 1, rows: 2 },
            content: [{ sep: '\n', text: 'Legea nr. 98/2016', span: [31, 48] }],
          },
          {
            id: 't1r2c2',
            kind: 'celula',
            type: 'CEL',
            span: [49, 56],
            content: [
              { sep: '\n', text: 'Cod', span: [49, 52] },
              { sep: '\n', text: 'CPV', span: [53, 56] },
            ],
          },
        ],
      },
      {
        id: 't1r3',
        kind: 'rand',
        type: 'ROW',
        span: [56, 56],
        content: [],
        children: [
          // The retained EMPTY cell (§3.2 exemption): zero characters, but its
          // <td> existence carries the geometry of the row.
          { id: 't1r3c1', kind: 'celula', type: 'CEL', span: [56, 56], content: [] },
        ],
      },
    ],
  },
  {
    id: 'img1',
    kind: 'imagine',
    type: 'IMG',
    span: [56, 56],
    content: [],
    asset: { sha256: 'a'.repeat(64), width: 640, height: 480, alt: 'Sigiliul instituției' },
  },
  {
    id: 'l1',
    kind: 'lista',
    type: 'OL',
    span: [57, 92],
    content: [],
    children: [
      {
        id: 'l1e1',
        kind: 'element_lista',
        type: 'LI',
        // Attribute-carried marker (`data-list-text`): NOT in the character
        // stream — the renderer must restore it as CSS content.
        label: 'a)',
        span: [57, 71],
        content: [{ sep: '\n', text: 'primul element', span: [57, 71] }],
      },
      {
        id: 'l1e2',
        kind: 'element_lista',
        type: 'LI',
        // Classless-span marker: ALREADY in the character stream — the
        // renderer must not double it.
        label: 'b)',
        span: [72, 92],
        content: [{ sep: '\n', text: 'b) al doilea element', span: [72, 92] }],
      },
    ],
  },
]

/** An act reference wholly inside cell t1r2c1's text (positions 31..48). */
const V11_MARKS: readonly TldfMark[] = [
  { ordinal: 0, kind: 'reference', span: [31, 48], link: { kind: 'act', target_act_id: 98 } },
]

const V11_ENVELOPE: TldfEnvelope = {
  format: 'tldf',
  format_version: '1.1',
  compiler_version: 'hand-built-test',
  document_id: 'test-v11',
  generation: {
    run_id: 1,
    body_sha256: '0'.repeat(64),
    structure_parser_version: 'hand-built',
    content_parser_version: 'hand-built',
  },
  text_sha256: createHash('sha256').update(V11_TEXT, 'utf8').digest('hex'),
  offset_unit: 'utf16_code_unit',
  contains_non_bmp: false,
  privacy_class: 'public',
  source_url: 'https://legislatie.just.ro/Public/DetaliiDocument/0',
  shape: 'standard_articles',
  accounting: { emitted_chars: 86, separator_chars: 6, excluded_by_reason: {} },
  marks: V11_MARKS,
  blocks: V11_BLOCKS,
}

/** Minimal well-formed one-cell table for the degrade/nesting variations. */
const tinyTable = (cell: Partial<TldfBlock> & { readonly span: TldfBlock['span'] }): TldfBlock => ({
  id: 'tt',
  kind: 'tabel',
  type: 'TBL',
  span: cell.span,
  content: [],
  children: [
    {
      id: 'ttr',
      kind: 'rand',
      type: 'ROW',
      span: cell.span,
      content: [],
      children: [{ id: 'ttc', kind: 'celula', type: 'CEL', content: [], ...cell }],
    },
  ],
})

const textNodesOf = (root: Element): Text[] => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode() !== null) nodes.push(walker.currentNode as Text)
  return nodes
}

/** Parse an HTML string through jsdom/parse5 — the same HTML parser that
    foster-parents stray table content. `innerHTML` assignment is the probe;
    React's `render()` never runs this parser. */
const parseHtml = (html: string): HTMLDivElement => {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

/**
 * Structural dump used to compare a client-built React tree against a
 * reparsed SSR string. Inline `style=` is read from CSSOM (`cssText`), not
 * the raw attribute: CSSOM re-serialises `a: b;` while the parser keeps
 * React's compact string, so an un-normalised compare false-fails.
 */
const dumpNode = (node: Node): unknown => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return { nodeType: node.nodeType }
  const el = node as HTMLElement
  const attrs: Record<string, string> = {}
  for (const attr of el.attributes) {
    attrs[attr.name] = attr.name === 'style' ? el.style.cssText : attr.value
  }
  return { tag: el.tagName, attrs, children: [...el.childNodes].map(dumpNode) }
}

const assertSsrReparsesLikeClient = (blocks: readonly TldfBlock[]): void => {
  const view = <TldfBlocksView blocks={blocks} marks={[]} containsNonBmp={false} />
  const { container } = render(view)
  const parsed = parseHtml(renderToStaticMarkup(view))
  expect(dumpNode(parsed)).toEqual(dumpNode(container))
  expect(parsed.textContent).toBe(foldTldfBlocks(blocks))
}

describe('v1.1 tables (hand-built fixture — no production 1.1 artifact exists yet)', () => {
  it('the hand-built envelope is contract-valid and folds to the pinned text', () => {
    expect(foldTldfBlocks(V11_BLOCKS)).toBe(V11_TEXT)
    expect(() => tldfEnvelopeSchema.parse(V11_ENVELOPE)).not.toThrow()
  })

  it('renders a real table — tbody explicit, every character inside a td, fold intact', () => {
    const { container } = render(
      <TldfBlocksView blocks={V11_BLOCKS} marks={V11_MARKS} containsNonBmp={false} />,
    )
    // Fidelity first: the table markup may not move one character.
    expect(container.textContent).toBe(V11_TEXT)

    const table = container.querySelector('table[data-kind="tabel"]')
    expect(table).not.toBeNull()
    if (table === null) return
    // Explicit tbody as the ONLY child — the SSR/hydration gate (a bare
    // `table > tr` reparses differently in the browser).
    expect([...table.children].map((el) => el.tagName)).toEqual(['TBODY'])

    const rows = [...table.querySelectorAll('tr')]
    expect(rows.map((row) => row.id)).toEqual(['tldf-t1r1', 'tldf-t1r2', 'tldf-t1r3'])
    expect(rows.map((row) => row.querySelectorAll('td').length)).toEqual([1, 2, 1])

    // The empty cell survives as a real, empty <td> — dropping it would
    // shift the grid.
    const emptyCell = container.querySelector('td#tldf-t1r3c1')
    expect(emptyCell).not.toBeNull()
    expect(emptyCell?.textContent).toBe('')

    // The foster-parenting proxy: no text node may sit outside a cell, or
    // the browser's parser would relocate it out of the table.
    for (const node of textNodesOf(table)) {
      expect(node.parentElement?.closest('td'), `text ${JSON.stringify(node.data)}`).not.toBeNull()
    }
  })

  it('honours grid spans; absent grid — the canonical 1×1 — emits no attributes', () => {
    const { container } = render(
      <TldfBlocksView blocks={V11_BLOCKS} marks={[]} containsNonBmp={false} />,
    )
    const spanning = container.querySelector('td#tldf-t1r1c1')
    expect(spanning?.getAttribute('colspan')).toBe('2')
    expect(spanning?.hasAttribute('rowspan')).toBe(false)

    const tall = container.querySelector('td#tldf-t1r2c1')
    expect(tall?.getAttribute('rowspan')).toBe('2')
    expect(tall?.hasAttribute('colspan')).toBe(false)

    const plain = container.querySelector('td#tldf-t1r2c2')
    expect(plain?.hasAttribute('colspan')).toBe(false)
    expect(plain?.hasAttribute('rowspan')).toBe(false)
  })

  it('a non-canonical explicit 1×1 grid renders exactly like the canonical absence', () => {
    const block = tinyTable({
      span: [0, 1],
      content: [{ text: 'x', span: [0, 1] }],
      grid: { cols: 1, rows: 1 },
    })
    const { container } = render(
      <TldfBlocksView blocks={[block]} marks={[]} containsNonBmp={false} />,
    )
    const cell = container.querySelector('td')
    expect(cell).not.toBeNull()
    expect(cell?.hasAttribute('colspan')).toBe(false)
    expect(cell?.hasAttribute('rowspan')).toBe(false)
  })

  it('a malformed grid degrades to a plain cell instead of throwing', () => {
    const grids = [
      { cols: 0, rows: Number.NaN },
      { cols: 2.5, rows: -1 },
      'nonsense' as unknown as TldfGrid,
    ]
    for (const grid of grids) {
      const block = tinyTable({ span: [0, 1], content: [{ text: 'x', span: [0, 1] }], grid })
      const { container } = render(
        <TldfBlocksView blocks={[block]} marks={[]} containsNonBmp={false} />,
      )
      const cell = container.querySelector('td')
      expect(cell, JSON.stringify(grid)).not.toBeNull()
      expect(cell?.hasAttribute('colspan')).toBe(false)
      expect(cell?.hasAttribute('rowspan')).toBe(false)
      expect(container.textContent).toBe('x')
    }
  })

  it('an off-contract table shape falls back to plain divs (foster-parenting guard)', () => {
    const offContract: TldfBlock[] = [
      // A tabel owning a run — a real table would foster-parent it out.
      {
        id: 'bad1',
        kind: 'tabel',
        type: 'TBL',
        span: [0, 5],
        content: [{ text: 'stray', span: [0, 5] }],
      },
      // A rand owning a run.
      {
        id: 'bad2',
        kind: 'tabel',
        type: 'TBL',
        span: [5, 9],
        content: [],
        children: [
          {
            id: 'bad2r',
            kind: 'rand',
            type: 'ROW',
            span: [5, 9],
            content: [{ sep: '\n', text: 'row', span: [6, 9] }],
          },
        ],
      },
      // A tabel whose child is not a rand.
      {
        id: 'bad3',
        kind: 'tabel',
        type: 'TBL',
        span: [9, 14],
        content: [],
        children: [
          {
            id: 'bad3p',
            kind: 'paragraf',
            type: 'PAR',
            span: [10, 14],
            content: [{ sep: '\n', text: 'text', span: [10, 14] }],
          },
        ],
      },
    ]
    const { container } = render(
      <TldfBlocksView blocks={offContract} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('table, tbody, tr, td')).toBeNull()
    expect(container.querySelectorAll('div[data-kind="tabel"]')).toHaveLength(3)
    expect(container.textContent).toBe(foldTldfBlocks(offContract))
  })

  it('marks flow through cell text: an act reference in a cell is a link', () => {
    const { container } = render(
      <TldfBlocksView blocks={V11_BLOCKS} marks={V11_MARKS} containsNonBmp={false} />,
    )
    const link = container.querySelector('td a[href="/legislation/acts/98"]')
    expect(link).not.toBeNull()
    expect(link?.textContent).toBe('Legea nr. 98/2016')
  })

  it('a nested table inside a cell renders as a nested table', () => {
    const nested = tinyTable({ span: [0, 1], content: [{ text: 'X', span: [0, 1] }] })
    const outer: TldfBlock = {
      id: 'out',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 1],
      content: [],
      children: [
        {
          id: 'outr',
          kind: 'rand',
          type: 'ROW',
          span: [0, 1],
          content: [],
          children: [
            {
              id: 'outc',
              kind: 'celula',
              type: 'CEL',
              span: [0, 1],
              content: [],
              children: [nested],
            },
          ],
        },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[outer]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('td table td')?.textContent).toBe('X')
    expect(container.textContent).toBe('X')
  })

  it('a rand whose child is not a celula falls back to the flat rendering', () => {
    // Without the `every(cell => cell.kind === 'celula')` clause this would
    // render the paragraf AS a <td>, dropping its data-kind, BLOCK_CLASS,
    // and (for a lista / nested tabel) its whole element.
    const offContract: TldfBlock = {
      id: 'bad-cell',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 5],
      content: [],
      children: [
        {
          id: 'bad-row',
          kind: 'rand',
          type: 'ROW',
          span: [0, 5],
          content: [],
          children: [
            {
              id: 'not-a-cell',
              kind: 'paragraf',
              type: 'PAR',
              span: [0, 5],
              content: [{ text: 'hello', span: [0, 5] }],
            },
          ],
        },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[offContract]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('table, tbody, tr, td')).toBeNull()
    const paragraf = container.querySelector('[data-kind="paragraf"]')
    expect(paragraf?.tagName).toBe('DIV')
    expect(paragraf?.className).toContain('mt-3')
    expect(container.textContent).toBe('hello')
  })

  it('a mixed-validity grid emits only the valid axis', () => {
    const colOnly = tinyTable({
      span: [0, 1],
      content: [{ text: 'x', span: [0, 1] }],
      grid: { cols: 2, rows: 0 },
    })
    const { container: colContainer } = render(
      <TldfBlocksView blocks={[colOnly]} marks={[]} containsNonBmp={false} />,
    )
    const colCell = colContainer.querySelector('td')
    expect(colCell?.getAttribute('colspan')).toBe('2')
    expect(colCell?.hasAttribute('rowspan')).toBe(false)

    const rowOnly = tinyTable({
      span: [0, 1],
      content: [{ text: 'x', span: [0, 1] }],
      grid: { cols: 0, rows: 2 },
    })
    const { container: rowContainer } = render(
      <TldfBlocksView blocks={[rowOnly]} marks={[]} containsNonBmp={false} />,
    )
    const rowCell = rowContainer.querySelector('td')
    expect(rowCell?.getAttribute('rowspan')).toBe('2')
    expect(rowCell?.hasAttribute('colspan')).toBe(false)
  })

  it("a cell's textContent follows fold order, not content-then-children", () => {
    // Naive concatenation of `content` then `children` would emit ACB; the
    // fold interleaves by span start and emits ABC. V11 cells are run-only,
    // so a cell-only rewrite that skipped BlockContent would still pass
    // those tests.
    const block = tinyTable({
      span: [0, 3],
      content: [
        { text: 'A', span: [0, 1] },
        { text: 'C', span: [2, 3] },
      ],
      children: [
        {
          id: 'mid',
          kind: 'paragraf',
          type: 'PAR',
          span: [1, 2],
          content: [{ text: 'B', span: [1, 2] }],
        },
      ],
    })
    expect(foldTldfBlocks([block])).toBe('ABC')
    const { container } = render(
      <TldfBlocksView blocks={[block]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('td')?.textContent).toBe('ABC')
  })
})

describe('table SSR reparse matches the client tree (foster-parenting probe)', () => {
  it('the probe detects a violating <tr>stray<td> string (control)', () => {
    // The hazard this suite is named for: the HTML parser foster-parents
    // non-table content OUT of a <table>, so an SSR string reparses into a
    // different tree and hydrates with characters out of order. A probe that
    // has never gone red proves nothing — this control MUST fail the match.
    const violatingMarkup = '<table><tbody><tr>stray<td>A</td></tr></tbody></table>'
    const parsed = parseHtml(violatingMarkup)
    expect(parsed.textContent).toBe('Astray')
    expect(parsed.querySelector('table')?.textContent).toBe('A')
    expect(parsed.textContent).not.toBe('strayA')

    // Client-side DOM APIs allow the illegal tree the SSR string claimed.
    const client = document.createElement('div')
    const table = client.appendChild(document.createElement('table'))
    const tbody = table.appendChild(document.createElement('tbody'))
    const tr = tbody.appendChild(document.createElement('tr'))
    tr.appendChild(document.createTextNode('stray'))
    const td = tr.appendChild(document.createElement('td'))
    td.appendChild(document.createTextNode('A'))
    expect(client.textContent).toBe('strayA')

    expect(dumpNode(parsed)).not.toEqual(dumpNode(client))
    expect(parsed.textContent).not.toBe(client.textContent)
  })

  it('SSR of a 2×2 table reparses into the client-built tree', () => {
    const table2x2: TldfBlock = {
      id: 'g',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 4],
      content: [],
      children: [
        {
          id: 'g1',
          kind: 'rand',
          type: 'ROW',
          span: [0, 2],
          content: [],
          children: [
            {
              id: 'g1a',
              kind: 'celula',
              type: 'CEL',
              span: [0, 1],
              content: [{ text: 'A', span: [0, 1] }],
            },
            {
              id: 'g1b',
              kind: 'celula',
              type: 'CEL',
              span: [1, 2],
              content: [{ text: 'B', span: [1, 2] }],
            },
          ],
        },
        {
          id: 'g2',
          kind: 'rand',
          type: 'ROW',
          span: [2, 4],
          content: [],
          children: [
            {
              id: 'g2c',
              kind: 'celula',
              type: 'CEL',
              span: [2, 3],
              content: [{ text: 'C', span: [2, 3] }],
            },
            {
              id: 'g2d',
              kind: 'celula',
              type: 'CEL',
              span: [3, 4],
              content: [{ text: 'D', span: [3, 4] }],
            },
          ],
        },
      ],
    }
    assertSsrReparsesLikeClient([table2x2])
  })

  it('SSR of a cell holding a nested table reparses into the client-built tree', () => {
    const nested = tinyTable({ span: [0, 1], content: [{ text: 'X', span: [0, 1] }] })
    const outer: TldfBlock = {
      id: 'out',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 1],
      content: [],
      children: [
        {
          id: 'outr',
          kind: 'rand',
          type: 'ROW',
          span: [0, 1],
          content: [],
          children: [
            {
              id: 'outc',
              kind: 'celula',
              type: 'CEL',
              span: [0, 1],
              content: [],
              children: [nested],
            },
          ],
        },
      ],
    }
    assertSsrReparsesLikeClient([outer])
  })

  it('SSR of a cell holding a lista reparses into the client-built tree', () => {
    const withLista: TldfBlock = {
      id: 'lt',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 4],
      content: [],
      children: [
        {
          id: 'ltr',
          kind: 'rand',
          type: 'ROW',
          span: [0, 4],
          content: [],
          children: [
            {
              id: 'ltc',
              kind: 'celula',
              type: 'CEL',
              span: [0, 4],
              content: [],
              children: [
                {
                  id: 'lst',
                  kind: 'lista',
                  type: 'UL',
                  span: [0, 4],
                  content: [],
                  children: [
                    {
                      id: 'lsti',
                      kind: 'element_lista',
                      type: 'LI',
                      span: [0, 4],
                      content: [{ text: 'item', span: [0, 4] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    assertSsrReparsesLikeClient([withLista])
  })

  it('SSR of a retained empty cell reparses into the client-built tree', () => {
    const withEmpty: TldfBlock = {
      id: 'et',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 1],
      content: [],
      children: [
        {
          id: 'etr1',
          kind: 'rand',
          type: 'ROW',
          span: [0, 1],
          content: [],
          children: [
            {
              id: 'etc1',
              kind: 'celula',
              type: 'CEL',
              span: [0, 1],
              content: [{ text: 'X', span: [0, 1] }],
            },
          ],
        },
        {
          id: 'etr2',
          kind: 'rand',
          type: 'ROW',
          span: [1, 1],
          content: [],
          children: [
            { id: 'etc2', kind: 'celula', type: 'CEL', span: [1, 1], content: [] },
          ],
        },
      ],
    }
    assertSsrReparsesLikeClient([withEmpty])
  })
})

describe('v1.1 imagine (hand-built fixture)', () => {
  it('renders an honest zero-text placeholder with the asset alt, never an <img>', () => {
    const { container } = render(
      <TldfBlocksView blocks={V11_BLOCKS} marks={[]} containsNonBmp={false} />,
    )
    const shell = container.querySelector('[data-kind="imagine"]')
    expect(shell).not.toBeNull()
    const figure = shell?.querySelector('[role="img"]')
    expect(figure).not.toBeNull()
    // The label reaches assistive tech and (as CSS content, via the data
    // attribute) sighted readers — but NEVER the character stream.
    expect(figure?.getAttribute('aria-label')).toContain('Sigiliul instituției')
    expect(figure?.getAttribute('data-figure-label')).toBe(figure?.getAttribute('aria-label'))
    expect(figure?.textContent).toBe('')
    expect(container.querySelector('img')).toBeNull()
    // One line (owner, 2026-11-26): the declared dimensions no longer shape
    // the placeholder into a frame of the figure's size.
    expect((figure as HTMLElement).style.aspectRatio).toBe('')
    expect(figure?.hasAttribute('style')).toBe(false)
  })

  it('draws an unserved figure as one line: an icon and the label as generated content, no text node', () => {
    const { container } = render(
      <TldfBlocksView blocks={V11_BLOCKS} marks={[]} containsNonBmp={false} />,
    )
    const figure = container.querySelector('[data-kind="imagine"] > [role="img"]')
    expect(figure).not.toBeNull()
    if (figure === null) return
    expect(figure.getAttribute('data-figure-label')).toBe('Figură din actul original: Sigiliul instituției')
    // The label is drawn from the attribute (`::before`), never as text.
    expect(figure.className).toContain('before:content-[attr(data-figure-label)]')
    expect(textNodesOf(figure)).toHaveLength(0)
    // The icon is decorative: hidden from assistive tech, which reads the label.
    const icon = figure.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(container.textContent).toBe(V11_TEXT)
  })

  it('adds zero characters to the document text', () => {
    const image = V11_BLOCKS.find((block) => block.kind === 'imagine')
    expect(image).toBeDefined()
    if (image === undefined) return
    const { container } = render(
      <TldfBlocksView blocks={[image]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe('')
  })

  it('treats a missing asset — and the compiler-emittable empty alt / zero dims — as absent', () => {
    const bare: TldfBlock = { id: 'i1', kind: 'imagine', type: 'IMG', span: [0, 0], content: [] }
    const emptyFacts: TldfBlock = {
      id: 'i2',
      kind: 'imagine',
      type: 'IMG',
      span: [0, 0],
      content: [],
      asset: { alt: '', width: 0, height: 0 },
    }
    const { container } = render(
      <TldfBlocksView blocks={[bare, emptyFacts]} marks={[]} containsNonBmp={false} />,
    )
    const figures = [...container.querySelectorAll('[role="img"]')]
    expect(figures).toHaveLength(2)
    const labels = figures.map((el) => el.getAttribute('aria-label'))
    expect(labels[0]).toBeTruthy()
    // alt:'' and 0×0 carry no facts: same generic label, no aspect ratio.
    expect(labels[1]).toBe(labels[0])
    expect((figures[1] as HTMLElement).style.aspectRatio).toBe('')
    expect(container.textContent).toBe('')
  })
})

describe('v1.1 lists (hand-built fixture)', () => {
  it('renders real list structure and restores only attribute-carried markers', () => {
    const { container } = render(
      <TldfBlocksView blocks={V11_BLOCKS} marks={[]} containsNonBmp={false} />,
    )
    const list = container.querySelector('ol[data-kind="lista"]')
    expect(list).not.toBeNull()
    const items = [...(list?.querySelectorAll('li[data-kind="element_lista"]') ?? [])]
    expect(items.map((li) => li.id)).toEqual(['tldf-l1e1', 'tldf-l1e2'])
    // Marker NOT in the character stream → restored as CSS content.
    expect(items[0]?.getAttribute('data-list-marker')).toBe('a)')
    // Marker already in the text ("b) al doilea…") → never doubled.
    expect(items[1]?.hasAttribute('data-list-marker')).toBe(false)
    // Native markers suppressed locally, not via preflight.
    expect(list?.className).toContain('list-none')
    expect(items[0]?.className).toContain('list-none')
    // Fidelity: the list adds no characters (the marker lives in CSS/attr).
    expect(container.textContent).toBe(V11_TEXT)
  })

  it('an unordered lista renders as <ul>', () => {
    const ul: TldfBlock = {
      id: 'u1',
      kind: 'lista',
      type: 'UL',
      span: [0, 4],
      content: [],
      children: [
        {
          id: 'u1e1',
          kind: 'element_lista',
          type: 'LI',
          span: [0, 4],
          content: [{ text: 'unu.', span: [0, 4] }],
        },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[ul]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('ul[data-kind="lista"] > li')?.textContent).toBe('unu.')
  })

  it('does not treat a coincidental numeric prefix as an in-stream marker', () => {
    const coincidental: TldfBlock = {
      id: 'li-pct',
      kind: 'element_lista',
      type: 'LI',
      label: '1.',
      span: [0, 12],
      content: [{ text: '1.5% dobanda', span: [0, 12] }],
    }
    const genuine: TldfBlock = {
      id: 'li-real',
      kind: 'element_lista',
      type: 'LI',
      label: '1.',
      span: [0, 9],
      content: [{ text: '1. Textul', span: [0, 9] }],
    }
    const { container } = render(
      <TldfBlocksView blocks={[coincidental, genuine]} marks={[]} containsNonBmp={false} />,
    )
    // `1.5%…` is not the marker `1.` — synthesise it.
    expect(container.querySelector('#tldf-li-pct')?.getAttribute('data-list-marker')).toBe('1.')
    // `1. Textul` really does open with the marker — do not double it.
    expect(container.querySelector('#tldf-li-real')?.hasAttribute('data-list-marker')).toBe(false)
  })

  it('suppresses the marker when it is materialised into a child paragraf', () => {
    const item: TldfBlock = {
      id: 'li-child',
      kind: 'element_lista',
      type: 'LI',
      label: 'c)',
      span: [0, 11],
      content: [],
      children: [
        {
          id: 'li-child-p',
          kind: 'paragraf',
          type: 'PAR',
          span: [0, 11],
          content: [{ text: 'c) in child', span: [0, 11] }],
        },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[item]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('#tldf-li-child')?.hasAttribute('data-list-marker')).toBe(false)
    expect(container.textContent).toBe('c) in child')
  })
})

describe('format 1.0 is untouched by the v1.1 renderer', () => {
  const PRESENTATION_SELECTOR = 'table, tbody, tr, td, ol, ul, li, [role="img"]'

  it('the 1.0 envelope fixture activates no presentation element', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={envelope.blocks}
        marks={envelope.marks}
        containsNonBmp={envelope.contains_non_bmp}
      />,
    )
    expect(container.querySelector(PRESENTATION_SELECTOR)).toBeNull()
  })

  it('the 1.0 chunk fixture activates no presentation element', () => {
    const { container } = render(
      <TldfBlocksView blocks={chunk1.blocks} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector(PRESENTATION_SELECTOR)).toBeNull()
  })

  it('a synthetic 1.0 bloc renders as an explicit div with its ttl/den/bdy runs and child', () => {
    const bloc: TldfBlock = {
      id: 'bloc-1',
      kind: 'bloc',
      type: 'DIV',
      span: [0, 40],
      content: [
        { role: 'ttl', text: 'Blocul I', span: [0, 8] },
        { role: 'den', sep: ' ', text: 'Dispoziții', span: [9, 19] },
        { role: 'bdy', sep: ' ', text: 'cuprins.', span: [20, 28] },
      ],
      children: [
        {
          id: 'bloc-1-p',
          kind: 'paragraf',
          type: 'PAR',
          span: [29, 40],
          content: [{ sep: ' ', text: 'copilul.', span: [29, 37] }],
        },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[bloc]} marks={[]} containsNonBmp={false} />,
    )
    const el = container.querySelector('[data-kind="bloc"]')
    expect(el).not.toBeNull()
    expect(el?.outerHTML).toBe(
      '<div id="tldf-bloc-1" data-kind="bloc" class="scroll-mt-24">' +
        '<span data-role="ttl" class="font-semibold">Blocul I</span>' +
        '<span data-role="den"> Dispoziții</span>' +
        '<span data-role="bdy"> cuprins.</span>' +
        '<div id="tldf-bloc-1-p" data-kind="paragraf" class="mt-3 scroll-mt-24">' +
        '<span> copilul.</span>' +
        '</div>' +
        '</div>',
    )
    expect(container.textContent).toBe(foldTldfBlocks([bloc]))
  })
})

describe('v1.1 source-state rendering (struck, 2026-08-26)', () => {
  const struckPar: TldfBlock = {
    id: 's1',
    kind: 'paragraf',
    type: 'PAR',
    span: [0, 13],
    struck: 'full',
    struck_repealed: true,
    content: [{ text: 'Text abrogat.', span: [0, 13] }],
  }

  it('draws a full-struck block as visible strikethrough with the abrogat title', () => {
    const { container } = render(
      <TldfBlocksView blocks={[struckPar]} marks={[]} containsNonBmp={false} />,
    )
    const block = container.querySelector('[data-struck="full"]')
    expect(block).not.toBeNull()
    expect(block?.className).toContain('line-through')
    // Only the VALIDATED narrow rule may assert legal state.
    expect(block?.getAttribute('title')).toBe('Text abrogat')
    // Fidelity: the strike changes styling, never one character.
    expect(container.textContent).toBe('Text abrogat.')
  })

  it('a strike without struck_repealed asserts no legal state', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={[{ ...struckPar, struck_repealed: undefined }]}
        marks={[]}
        containsNonBmp={false}
      />,
    )
    const block = container.querySelector('[data-struck="full"]')
    expect(block).not.toBeNull()
    expect(block?.getAttribute('title')).toBeNull()
  })

  it('says the repealed state as a status mark exposed to assistive tech, with no text node', () => {
    const { container } = render(
      <TldfBlocksView blocks={[struckPar]} marks={[]} containsNonBmp={false} />,
    )
    const block = container.querySelector('[data-struck="full"]')
    const mark = block?.querySelector('[role="img"]')
    expect(mark).not.toBeNull()
    if (mark === null || mark === undefined) return
    // The word reaches assistive tech as a name and sighted readers as
    // generated content (`::after` from data-label) — never as a text node.
    expect(mark.getAttribute('aria-label')).toBe('abrogat')
    expect(mark.getAttribute('data-label')).toBe('abrogat')
    expect(mark.className).toContain('after:content-[attr(data-label)]')
    expect(mark.className).toContain('before:border-status-blocked-fg')
    expect(mark.childNodes).toHaveLength(0)
    // The title stays, and the column's text is the fold, unchanged.
    expect(block?.getAttribute('title')).toBe('Text abrogat')
    expect(container.textContent).toBe(foldTldfBlocks([struckPar]))
  })

  it('a strike without struck_repealed carries no repealed mark', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={[
          { ...struckPar, struck_repealed: undefined },
          { ...struckPar, id: 's2', struck: 'partial', struck_repealed: undefined },
        ]}
        marks={[]}
        containsNonBmp={false}
      />,
    )
    expect(container.querySelectorAll('[data-struck]')).toHaveLength(2)
    expect(container.querySelector('[role="img"]')).toBeNull()
    expect(container.querySelector('[data-label]')).toBeNull()
    expect(container.querySelector('[aria-label="abrogat"]')).toBeNull()
  })

  it('draws struck text with a thin, pale line', () => {
    const { container } = render(
      <TldfBlocksView
        blocks={[{ ...struckPar, struck_repealed: undefined }]}
        marks={[]}
        containsNonBmp={false}
      />,
    )
    const block = container.querySelector('[data-struck="full"]')
    expect(block?.className).toContain('decoration-1')
    expect(block?.className).toContain('decoration-foreground/40')
  })

  it('a partial strike keeps the block face upright and draws the exact mark range', () => {
    const blocks: TldfBlock[] = [
      {
        id: 'p1',
        kind: 'paragraf',
        type: 'PAR',
        span: [0, 25],
        struck: 'partial',
        content: [{ text: 'păstrat abrogat păstrat', span: [0, 23] }],
      },
    ]
    const marks: TldfMark[] = [{ ordinal: 0, kind: 'struck', span: [8, 15] }]
    const { container } = render(
      <TldfBlocksView blocks={blocks} marks={marks} containsNonBmp={false} />,
    )
    const block = container.querySelector('[data-struck="partial"]')
    expect(block).not.toBeNull()
    expect(block?.className ?? '').not.toContain('line-through')
    const struckEl = container.querySelector('s')
    expect(struckEl?.textContent).toBe('abrogat')
    expect(container.textContent).toBe('păstrat abrogat păstrat')
  })

  it('a struck role run carries the strikethrough (role rows fold into runs)', () => {
    const blocks: TldfBlock[] = [
      {
        id: 'a1',
        kind: 'articol',
        type: 'ART',
        span: [0, 11],
        number: { key: '5', system: 'arabic' },
        content: [{ text: 'Articolul 5', span: [0, 11], role: 'ttl', struck: 'full' }],
      },
    ]
    const { container } = render(
      <TldfBlocksView blocks={blocks} marks={[]} containsNonBmp={false} />,
    )
    const run = container.querySelector('[data-role="ttl"]')
    expect(run?.getAttribute('data-struck')).toBe('full')
    expect(run?.className).toContain('line-through')
  })

  it('emphasis marks render semantic elements, never the reference face', () => {
    // Regression for the pre-2026-08-26 fallthrough: every non-link mark
    // rendered as a dotted "Referință legislativă" span.
    const blocks: TldfBlock[] = [
      {
        id: 'e1',
        kind: 'paragraf',
        type: 'PAR',
        span: [0, 21],
        content: [{ text: 'unu doi trei patru x', span: [0, 20] }],
      },
    ]
    const marks: TldfMark[] = [
      { ordinal: 0, kind: 'italic', span: [0, 3] },
      { ordinal: 1, kind: 'bold', span: [4, 7] },
      { ordinal: 2, kind: 'underline', span: [8, 12] },
      { ordinal: 3, kind: 'struck', span: [13, 18] },
    ]
    const { container } = render(
      <TldfBlocksView blocks={blocks} marks={marks} containsNonBmp={false} />,
    )
    expect(container.querySelector('em')?.textContent).toBe('unu')
    expect(container.querySelector('strong')?.textContent).toBe('doi')
    expect(container.querySelector('s')?.textContent).toBe('patru')
    // None of the four wears the unresolved-reference face.
    expect(container.querySelectorAll('[title^="Referin"]')).toHaveLength(0)
    expect(container.textContent).toBe('unu doi trei patru x')
  })

  it('a struck cell strikes the cell, not the table', () => {
    const table: TldfBlock = {
      id: 't1',
      kind: 'tabel',
      type: 'TBL',
      span: [0, 8],
      struck: 'full',
      content: [],
      children: [
        {
          id: 't1.r',
          kind: 'rand',
          type: 'ROW',
          span: [0, 8],
          content: [],
          children: [
            {
              id: 't1.r.c1',
              kind: 'celula',
              type: 'CEL',
              span: [0, 4],
              struck: 'full',
              content: [{ text: 'unu ', span: [0, 4] }],
            },
            {
              id: 't1.r.c2',
              kind: 'celula',
              type: 'CEL',
              span: [4, 8],
              content: [{ text: 'doi.', span: [4, 8] }],
            },
          ],
        },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[table]} marks={[]} containsNonBmp={false} />,
    )
    const cells = container.querySelectorAll('td')
    expect(cells).toHaveLength(2)
    expect(cells[0]?.getAttribute('data-struck')).toBe('full')
    expect(cells[0]?.className).toContain('line-through')
    expect(cells[1]?.getAttribute('data-struck')).toBeNull()
    expect(cells[1]?.className).not.toContain('line-through')
  })
})

describe('folded notes of the Portal (foldNotes)', () => {
  // A long note: its heading run and four long lines as notes of their own,
  // the shape a consolidated form carries at its head. Spans are consecutive.
  const sentence =
    'Prevederile prezentei ordonanțe de urgență se aplică procedurilor de atribuire inițiate după data intrării în vigoare, iar procedurile în curs rămân supuse legislației în vigoare la data inițierii lor.'
  const noteLine = (id: string, start: number): TldfBlock => ({
    id,
    kind: 'nota',
    type: 'NTA',
    span: [start, start + 1 + sentence.length],
    content: [{ sep: '\n', text: sentence, span: [start + 1, start + 1 + sentence.length] }],
  })
  const heading = 'Notă'
  const first = noteLine('n1', heading.length)
  const second = noteLine('n2', first.span[1])
  const third = noteLine('n3', second.span[1])
  const fourth = noteLine('n4', third.span[1])
  const longNote: TldfBlock = {
    id: 'n',
    kind: 'nota',
    type: 'NTA',
    span: [0, fourth.span[1]],
    content: [{ role: 'ttl', text: heading, span: [0, heading.length] }],
    children: [first, second, third, fourth],
  }
  const shortNote: TldfBlock = {
    id: 'short',
    kind: 'nota',
    type: 'NTA',
    span: [0, 24],
    content: [{ text: 'O notă scurtă, întreagă.', span: [0, 24] }],
  }

  it('the fixture note is long enough to fold', () => {
    // Six hundred characters: fewer can fit in the folded height on a wide screen, and would fold to nothing hidden.
    expect(longNote.span[1] - longNote.span[0]).toBeGreaterThan(600)
  })

  it('is off by default: a long note renders whole, with no control', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('button')).toBeNull()
    expect(container.textContent).toBe(foldTldfBlocks([longNote]))
  })

  it('folds a long note to its first lines without adding or losing a character', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    // Fidelity: every word of the note is still in the column, in fold order.
    expect(container.textContent).toBe(foldTldfBlocks([longNote]))
    const note = container.querySelector('#tldf-n')
    expect(note?.getAttribute('data-kind')).toBe('nota')
    // One control, for the outer note only — its lines are not folded again.
    const controls = container.querySelectorAll('button')
    expect(controls).toHaveLength(1)
    const control = controls[0]
    expect(control?.parentElement).toBe(note)
    // The control's words are generated content, never a text node.
    expect(control?.getAttribute('data-label')).toBe('Arată toată nota')
    expect(control?.getAttribute('aria-label')).toBe('Arată toată nota')
    expect(control?.getAttribute('aria-expanded')).toBe('false')
    expect(control?.childNodes).toHaveLength(0)
    // The note's content is clamped, not removed.
    const body = note?.firstElementChild
    expect(body?.className).toContain('max-h-[8.25rem]')
    expect(body?.className).toContain('overflow-hidden')
    expect(body?.querySelectorAll('[data-kind="nota"]')).toHaveLength(4)
  })

  it('opens and closes the note, the text unchanged either way', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const control = container.querySelector('button')
    expect(control).not.toBeNull()
    if (control === null) return
    fireEvent.click(control)
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(control.getAttribute('data-label')).toBe('Arată mai puțin')
    expect(control.getAttribute('aria-label')).toBe('Arată mai puțin din notă')
    const body = container.querySelector('#tldf-n')?.firstElementChild
    expect(body?.className ?? '').not.toContain('max-h-[8.25rem]')
    expect(body?.className ?? '').not.toContain('overflow-hidden')
    expect(container.textContent).toBe(foldTldfBlocks([longNote]))
    fireEvent.click(control)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect(control.getAttribute('data-label')).toBe('Arată toată nota')
    expect(container.textContent).toBe(foldTldfBlocks([longNote]))
  })

  it('opens by itself when something inside it is scrolled into view', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const body = container.querySelector('#tldf-n')?.firstElementChild
    const control = container.querySelector('button')
    expect(body).not.toBeNull()
    if (body == null || control === null) return
    // A scroll event with the box still at its start changes nothing.
    fireEvent.scroll(body)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    // A jump to a target inside the clipped part scrolls the box: the note opens,
    // and the page takes over the distance the box had scrolled.
    // The page must scroll AFTER the note is open: checked at the moment of the call.
    const openWhenScrolled: boolean[] = []
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {
      openWhenScrolled.push(!body.className.includes('overflow-hidden'))
    })
    body.scrollTop = 64
    fireEvent.scroll(body)
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(body.className).not.toContain('overflow-hidden')
    expect(scrollBy).toHaveBeenCalledWith(0, 64)
    expect(openWhenScrolled).toEqual([true])
    expect(container.textContent).toBe(foldTldfBlocks([longNote]))
    scrollBy.mockRestore()
  })

  it('brings the note back into view when it is closed', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const note = container.querySelector('#tldf-n')
    const control = container.querySelector('button')
    if (note === null || control === null) throw new Error('the folded note did not render')
    // The note must be brought into view AFTER it has closed: checked at the moment of the call.
    const closedWhenCalled: boolean[] = []
    const intoView = vi.spyOn(note, 'scrollIntoView').mockImplementation(() => {
      closedWhenCalled.push(note.firstElementChild?.className.includes('overflow-hidden') ?? false)
    })
    fireEvent.click(control)
    expect(intoView).not.toHaveBeenCalled()
    fireEvent.click(control)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect(intoView).toHaveBeenCalledWith({ block: 'nearest' })
    expect(closedWhenCalled).toEqual([true])
  })

  it('prints a folded note whole, without its control', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const body = container.querySelector('#tldf-n')?.firstElementChild
    expect(body?.className).toContain('print:max-h-none')
    expect(body?.className).toContain('print:overflow-visible')
    // Without this the last lines would fade on paper.
    expect(body?.className).toContain('print:[mask-image:none]')
    expect(container.querySelector('button')?.className).toContain('print:hidden')
  })

  it('folds from 601 characters, not at 600', () => {
    const sized = (id: string, length: number): TldfBlock => ({
      id,
      kind: 'nota',
      type: 'NTA',
      span: [0, length],
      content: [{ text: 'x'.repeat(length), span: [0, length] }],
    })
    const at = render(<TldfBlocksView blocks={[sized('at', 600)]} marks={[]} containsNonBmp={false} foldNotes />)
    expect(at.container.querySelector('button')).toBeNull()
    const over = render(<TldfBlocksView blocks={[sized('over', 601)]} marks={[]} containsNonBmp={false} foldNotes />)
    expect(over.container.querySelectorAll('button')).toHaveLength(1)
  })

  it('does not fold a long line again inside a folded note', () => {
    // The inner note is itself over the length: without the one-fold rule it would get a control of its own.
    const inner: TldfBlock = { id: 'in', kind: 'nota', type: 'NTA', span: [4, 705], content: [{ sep: '\n', text: 'y'.repeat(700), span: [5, 705] }] }
    const outer: TldfBlock = { id: 'out', kind: 'nota', type: 'NTA', span: [0, 705], content: [{ role: 'ttl', text: 'Notă', span: [0, 4] }], children: [inner] }
    const { container } = render(<TldfBlocksView blocks={[outer]} marks={[]} containsNonBmp={false} foldNotes />)
    expect(inner.span[1] - inner.span[0]).toBeGreaterThan(600)
    expect(container.querySelectorAll('button')).toHaveLength(1)
    expect(container.querySelector('#tldf-in')?.getAttribute('data-note-fold')).toBeNull()
    expect(container.textContent).toBe(foldTldfBlocks([outer]))
  })

  it('a jump opens the note that holds its target before going there', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const note = container.querySelector('#tldf-n')
    const target = container.querySelector('#tldf-n1')
    const control = container.querySelector('button')
    if (note === null || target === null || control === null) throw new Error('the folded note did not render')
    expect(note.getAttribute('data-note-fold')).toBe('closed')
    // The first line of the note: reaching it scrolls nothing inside the box, so nothing else would open the note.
    revealFoldedNote(target)
    expect(note.getAttribute('data-note-fold')).toBe('open')
    expect(control.getAttribute('aria-expanded')).toBe('true')
    // The jump leaves the focus alone, and a second call on an open note changes nothing.
    expect(document.activeElement).not.toBe(note.firstElementChild)
    revealFoldedNote(target)
    expect(control.getAttribute('aria-expanded')).toBe('true')
  })

  it('opens when the focus enters its hidden part', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const body = container.querySelector<HTMLElement>('#tldf-n > div')
    const last = container.querySelector<HTMLElement>('#tldf-n4')
    const first = container.querySelector<HTMLElement>('#tldf-n1')
    const control = container.querySelector('button')
    if (body === null || last === null || first === null || control === null) throw new Error('the folded note did not render')
    // jsdom has no layout: the box ends at 132 px, the first line is inside it, the last one far below.
    body.getBoundingClientRect = () => ({ top: 0, bottom: 132, left: 0, right: 600, width: 600, height: 132, x: 0, y: 0, toJSON: () => ({}) })
    first.getBoundingClientRect = () => ({ top: 30, bottom: 80, left: 0, right: 600, width: 600, height: 50, x: 0, y: 30, toJSON: () => ({}) })
    last.getBoundingClientRect = () => ({ top: 400, bottom: 480, left: 0, right: 600, width: 600, height: 80, x: 0, y: 400, toJSON: () => ({}) })
    fireEvent.focusIn(first)
    expect(control.getAttribute('aria-expanded')).toBe('false')
    fireEvent.focusIn(last)
    expect(control.getAttribute('aria-expanded')).toBe('true')
  })

  it('opened from the keyboard, the focus goes to the note\'s start; a pointer leaves it', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const body = container.querySelector<HTMLElement>('#tldf-n > div')
    const control = container.querySelector<HTMLButtonElement>('button')
    if (body === null || control === null) throw new Error('the folded note did not render')
    control.focus()
    fireEvent.click(control, { detail: 1 })
    expect(document.activeElement).toBe(control)
    fireEvent.click(control, { detail: 1 })
    control.focus()
    fireEvent.click(control, { detail: 0 })
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(body)
  })

  it('a jump\'s opening leaves the keyboard focus on the control it was on', () => {
    const { container } = render(
      <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    const body = container.querySelector<HTMLElement>('#tldf-n > div')
    const target = container.querySelector('#tldf-n1')
    const control = container.querySelector<HTMLButtonElement>('button')
    if (body === null || target === null || control === null) throw new Error('the folded note did not render')
    // The reader's focus is on the control when a jump opens the note: it is not a key press, the focus does not move.
    control.focus()
    revealFoldedNote(target)
    expect(control.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(control)
    // The body shows its focus when a real key press does move it there.
    expect(body.className).toContain('focus-visible:ring-2')
  })

  it('the hidden part is as deep as the fade at the reader\'s font size', () => {
    const rect = (top: number, bottom: number) => () => ({ top, bottom, left: 0, right: 600, width: 600, height: bottom - top, x: 0, y: top, toJSON: () => ({}) })
    const opensOnFocus = (rootFontSize: string) => {
      document.documentElement.style.fontSize = rootFontSize
      try {
        const { container, unmount } = render(
          <TldfBlocksView blocks={[longNote]} marks={[]} containsNonBmp={false} foldNotes />,
        )
        const body = container.querySelector<HTMLElement>('#tldf-n > div')
        const line = container.querySelector<HTMLElement>('#tldf-n2')
        const control = container.querySelector('button')
        if (body === null || line === null || control === null) throw new Error('the folded note did not render')
        body.getBoundingClientRect = rect(0, 132)
        // The line ends 50 px above the box's end: inside a 60 px fade (24 px root), outside a 40 px one (16 px root).
        line.getBoundingClientRect = rect(40, 82)
        fireEvent.focusIn(line)
        const opened = control.getAttribute('aria-expanded') === 'true'
        unmount()
        return opened
      } finally {
        document.documentElement.style.fontSize = ''
      }
    }
    expect(opensOnFocus('16px')).toBe(false)
    expect(opensOnFocus('24px')).toBe(true)
  })

  it('leaves a short note and a struck long note whole', () => {
    const struckLong: TldfBlock = { ...longNote, id: 'struck-n', struck: 'full' }
    const { container } = render(
      <TldfBlocksView blocks={[shortNote, struckLong]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    expect(container.querySelector('button')).toBeNull()
    expect(container.textContent).toBe(foldTldfBlocks([shortNote, struckLong]))
  })

  it('folds a long note wherever it sits, including inside a table cell', () => {
    const inCell = tinyTable({ span: longNote.span, content: [], children: [longNote] })
    const { container } = render(
      <TldfBlocksView blocks={[inCell]} marks={[]} containsNonBmp={false} foldNotes />,
    )
    expect(container.querySelector('td #tldf-n > button')).not.toBeNull()
    expect(container.textContent).toBe(foldTldfBlocks([inCell]))
  })
})


describe('review of the act text\'s look (26 November 2026)', () => {
  const run = (role: 'ttl' | 'den' | 'bdy', text: string, start: number) => ({ role, sep: '\n' as const, text, span: [start, start + 1 + text.length] as [number, number] })

  it('a fully struck item strikes its hung marker too; a partial strike does not', () => {
    const item = (id: string, struck: 'full' | 'partial'): TldfBlock => ({
      id,
      kind: 'litera',
      type: 'LIT',
      span: [0, 15],
      struck,
      content: [run('ttl', 'a)', 0), run('bdy', 'abrogată;', 3)],
    })
    const { container } = render(
      <TldfBlocksView blocks={[item('full', 'full'), item('part', 'partial')]} marks={[]} containsNonBmp={false} />,
    )
    // The rule is keyed on the block's own attribute, so it is the attribute that decides.
    const full = container.querySelector('#tldf-full')
    const part = container.querySelector('#tldf-part')
    expect(full?.className).toContain('[&[data-struck=full]>[data-role=ttl]]:line-through')
    expect(full?.getAttribute('data-struck')).toBe('full')
    expect(part?.getAttribute('data-struck')).toBe('partial')
  })

  it('only a ruled heading drops its rule under its parent\'s heading: a box after a run keeps its frame', () => {
    const anexa: TldfBlock = {
      id: 'anx',
      kind: 'anexa',
      type: 'ANX',
      span: [0, 60],
      content: [run('ttl', 'Anexa nr. 1', 0), run('bdy', '*Font 7*', 12)],
      children: [
        { id: 'pre', kind: 'preformatat', type: 'PRE', span: [21, 40], content: [{ sep: '\n', text: '| Nr. | Denumire |', span: [21, 40] }] },
        { id: 'cap', kind: 'capitol', type: 'CAP', span: [40, 60], content: [run('ttl', 'Capitolul I', 40)] },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[anexa]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.textContent).toBe(foldTldfBlocks([anexa]))
    // The parent no longer strips the border and padding of whatever follows a run.
    expect(container.querySelector('#tldf-anx')?.className).not.toContain('[&>[data-role]+[data-kind]]:border-t-0')
    expect(container.querySelector('#tldf-anx')?.className).not.toContain('[&>[data-role]+[data-kind]]:pt-0')
    // The ruled heading carries the rule itself; the box has none of it.
    expect(container.querySelector('#tldf-cap')?.className).toContain('[[data-role=ttl]+&]:border-t-0')
    expect(container.querySelector('#tldf-pre')?.className).not.toContain('border-t-0')
    expect(container.querySelector('#tldf-pre')?.className).not.toContain('pt-0')
  })

  it('a drawn layout is a named, focusable region whose lines touch and which prints whole', () => {
    const pre: TldfBlock = {
      id: 'pre',
      kind: 'preformatat',
      type: 'PRE',
      span: [0, 40],
      content: [],
      children: [
        { id: 'l1', kind: 'paragraf', type: 'p', span: [0, 20], content: [{ sep: '\n', text: '┌─────┬──────────┐', span: [0, 20] }] },
        { id: 'l2', kind: 'paragraf', type: 'p', span: [20, 40], content: [{ sep: '\n', text: '│ Nr. │ Denumire │', span: [20, 40] }] },
      ],
    }
    const { container } = render(
      <TldfBlocksView blocks={[pre]} marks={[]} containsNonBmp={false} />,
    )
    const box = container.querySelector('#tldf-pre')
    expect(container.textContent).toBe(foldTldfBlocks([pre]))
    expect(box?.getAttribute('role')).toBe('region')
    expect(box?.getAttribute('tabindex')).toBe('0')
    expect(box?.getAttribute('aria-label')).toBe('Text aliniat pe coloane, derulabil orizontal')
    expect(box?.className).toContain('[&_[data-kind=paragraf]]:mt-0')
    expect(box?.className).toContain('print:whitespace-pre-wrap')
  })

  it('says the repealed state in a cell, for a row, for a table and for a figure', () => {
    const cell = (id: string, start: number, more: Partial<TldfBlock> = {}): TldfBlock => ({ id, kind: 'celula', type: 'TD', span: [start, start + 3], content: [{ sep: '\n', text: id.slice(-2), span: [start, start + 3] }], ...more })
    const row = (id: string, start: number, cells: readonly TldfBlock[], more: Partial<TldfBlock> = {}): TldfBlock => ({ id, kind: 'rand', type: 'TR', span: [start, start + 6], content: [], children: [...cells], ...more })
    const repealedState = { struck: 'full', struck_repealed: true } as const
    const table: TldfBlock = {
      id: 'tb',
      kind: 'tabel',
      type: 'TABLE',
      span: [0, 12],
      content: [],
      ...repealedState,
      children: [
        row('r1', 0, [cell('c-a1', 0, repealedState), cell('c-a2', 3)]),
        row('r2', 6, [cell('c-b1', 6), cell('c-b2', 9)], repealedState),
      ],
    }
    const figure: TldfBlock = { id: 'fig', kind: 'imagine', type: 'IMG', span: [12, 12], content: [], ...repealedState }
    const { container } = render(<TldfBlocksView blocks={[table, figure]} marks={[]} containsNonBmp={false} />)
    expect(container.textContent).toBe(foldTldfBlocks([table, figure]))
    const marks = (selector: string) => container.querySelectorAll(`${selector} > [role="img"][aria-label="abrogat"]`).length
    expect(marks('#tldf-c-a1')).toBe(1)
    expect(marks('#tldf-c-a2')).toBe(0)
    // The row says it in its last cell: nothing but cells sits under a `<tr>`.
    expect(marks('#tldf-c-b1')).toBe(0)
    expect(marks('#tldf-c-b2')).toBe(1)
    expect(container.querySelectorAll('tr > span, tbody > span, table > span')).toHaveLength(0)
    // The table says it under its frame, outside the `<table>`.
    expect(container.querySelector('table')?.parentElement?.nextElementSibling?.getAttribute('aria-label')).toBe('abrogat')
    expect(marks('#tldf-fig')).toBe(1)
    // A struck figure dims its own line, not the word that says why (which would fall under the contrast floor).
    expect(container.querySelector('#tldf-fig')?.className).not.toContain('opacity-60')
    expect(container.querySelector('#tldf-fig > [role="img"]:not([aria-label="abrogat"])')?.className).toContain('opacity-60')
    expect(container.querySelector('#tldf-fig > [aria-label="abrogat"]')?.className).not.toContain('opacity-60')
    // The mark names its language: the word is the interface's, the text around it is the law's.
    expect(container.querySelector('[role="img"][aria-label="abrogat"]')?.getAttribute('lang')).toBeTruthy()
  })

  it('a list item never shows a native bullet, and strikes its drawn marker when it is fully struck', () => {
    const item = (id: string, more: Partial<TldfBlock>): TldfBlock => ({ id, kind: 'element_lista', type: 'LI', span: [0, 10], label: 'a)', content: [{ sep: '\n', text: 'un punct;', span: [0, 10] }], ...more })
    const { container } = render(
      <TldfBlocksView blocks={[item('struck', { struck: 'full' }), item('annotated', { annotation_role: 'amendment_note' })]} marks={[]} containsNonBmp={false} />,
    )
    expect(container.querySelector('#tldf-struck')?.className).toContain('[&[data-struck=full]]:before:line-through')
    expect(container.querySelector('#tldf-struck')?.getAttribute('data-list-marker')).toBe('a)')
    // The note of a change replaces the kind's classes: the bullet stays suppressed.
    expect(container.querySelector('#tldf-annotated')?.tagName).toBe('LI')
    expect(container.querySelector('#tldf-annotated')?.className).toContain('list-none')
  })

  it('an item that is its marker alone keeps its line, and a dash row in a drawn layout is not clipped', () => {
    const markerOnly: TldfBlock = { id: 'only', kind: 'litera', type: 'LIT', span: [0, 3], content: [run('ttl', 'a)', 0)] }
    const pre: TldfBlock = {
      id: 'pre',
      kind: 'preformatat',
      type: 'PRE',
      span: [3, 30],
      content: [],
      children: [{ id: 'dash', kind: 'paragraf', type: 'p', span: [3, 30], content: [{ sep: '\n', text: '- - - - - - - - - - - - - ', span: [3, 30] }] }],
    }
    const { container } = render(<TldfBlocksView blocks={[markerOnly, pre]} marks={[]} containsNonBmp={false} />)
    // Only the marker-alone shape contains its float: an item with a body must not (its first line would drop below the marker).
    const itemClasses = container.querySelector('#tldf-only')?.className.split(/\s+/) ?? []
    expect(itemClasses).toContain('[&:not(:has(>:not([data-role=ttl])))]:flow-root')
    expect(itemClasses).not.toContain('flow-root')
    // The row keeps its own clip class (running text needs it); the box overrides it for its lines.
    expect(container.querySelector('#tldf-dash')?.className).toContain('overflow-hidden')
    expect(container.querySelector('#tldf-pre')?.className).toContain('[&_[data-kind=paragraf]]:overflow-visible')
    expect(container.querySelector('#tldf-pre')?.className).toContain('print:[overflow-wrap:anywhere]')
  })

  it('the note of a change is plain small print, even when it opens with a quotation mark', () => {
    const note: TldfBlock = {
      id: 'am',
      kind: 'paragraf',
      type: 'p',
      span: [0, 30],
      annotation_role: 'amendment_note',
      content: [{ sep: '\n', text: '„(la 28-07-2022, modificată)”', span: [0, 30] }],
    }
    const { container } = render(
      <TldfBlocksView blocks={[note]} marks={[]} containsNonBmp={false} />,
    )
    const element = container.querySelector('#tldf-am')
    expect(element?.getAttribute('data-annotation')).toBe('amendment_note')
    expect(element?.className).toContain('text-[0.8125rem]')
    // Not drawn as quoted text, and with no rule of its own.
    expect(element?.className).not.toContain('border-l')
  })
})
