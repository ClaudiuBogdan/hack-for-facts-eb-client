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
import { render } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { foldTldfBlocks } from '../../lib/tldf/fold'
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
    expect(paragraf?.className).toContain('mt-2.5')
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
    // Declared dimensions shape the placeholder.
    expect((figure as HTMLElement).style.aspectRatio).toBe('640 / 480')
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
        '<span data-role="den" class="[font-family:var(--font-family)] font-semibold tracking-wide"> Dispoziții</span>' +
        '<span data-role="bdy"> cuprins.</span>' +
        '<div id="tldf-bloc-1-p" data-kind="paragraf" class="mt-2.5 scroll-mt-24">' +
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
