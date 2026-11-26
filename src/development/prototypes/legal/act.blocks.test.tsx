import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/test/test-utils'
import { foldTldfBlocks } from '@/features/legal/lib/tldf/fold'
import { tldfEnvelopeSchema } from '@/features/legal/lib/tldf/schemas'
import type { TldfBlock, TldfMark } from '@/features/legal/lib/tldf/types'
import { ActBlocks } from './act.blocks'
import { ACT_SPECIMEN } from './act.specimen'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string> }) => <a href={params?.actId ? to.replace('$actId', params.actId) : to}>{children}</a>,
}))

/**
 * The skin may change how the text looks and nothing else: what a reader can select, search and copy is still the
 * fold of the blocks, on the specimen and on the feature's committed real artifacts. If this fails, the design
 * shown in the prototype is one the feature's renderer could not take.
 */
const fixtureDir = join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf')
type Row = { readonly tldf: { readonly blocks?: readonly TldfBlock[]; readonly marks?: readonly TldfMark[]; readonly contains_non_bmp?: boolean } }
const rowsOf = (name: string): readonly Row[] => JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as Row[]

describe('the act text in the prototype skin', () => {
  it('holds a well-formed specimen: the feature schema takes it, spans address its own text', () => {
    const text = foldTldfBlocks(ACT_SPECIMEN.blocks)
    const envelope = tldfEnvelopeSchema.safeParse({
      format: 'tldf',
      format_version: '1.1',
      compiler_version: 'specimen',
      document_id: 'specimen',
      generation: { run_id: 1, body_sha256: 'a'.repeat(64), structure_parser_version: 'specimen', content_parser_version: 'specimen' },
      text_sha256: 'b'.repeat(64),
      offset_unit: 'utf16_code_unit',
      contains_non_bmp: false,
      privacy_class: 'public',
      source_url: 'https://legislatie.just.ro/',
      shape: 'standard_articles',
      accounting: { emitted_chars: text.length, separator_chars: 0, excluded_by_reason: {} },
      marks: ACT_SPECIMEN.marks,
      blocks: ACT_SPECIMEN.blocks,
    })
    expect(envelope.error?.issues ?? []).toEqual([])
    // every run's span is its own text in the fold, and every mark covers words, not a separator
    const check = (block: TldfBlock): void => {
      for (const run of block.content) expect(text.slice(run.span[0], run.span[1])).toBe(run.text)
      for (const child of block.children ?? []) check(child)
    }
    for (const block of ACT_SPECIMEN.blocks) check(block)
    for (const mark of ACT_SPECIMEN.marks) expect(text.slice(mark.span[0], mark.span[1]).trim().length).toBeGreaterThan(0)
  })

  it('shows every kind of element and every state the format carries', () => {
    const kinds = new Set<string>()
    const states = new Set<string>()
    const walk = (block: TldfBlock): void => {
      kinds.add(block.kind)
      if (block.struck !== undefined) states.add(`struck:${block.struck}`)
      if (block.struck_repealed === true) states.add('repealed')
      if (block.annotation_role !== undefined) states.add(block.annotation_role)
      if (block.changed_since_base_form === true) states.add('changed')
      if (block.origin !== undefined) states.add(block.origin)
      for (const child of block.children ?? []) walk(child)
    }
    for (const block of ACT_SPECIMEN.blocks) walk(block)
    // the format's 29 kinds, less `carte` (drawn as `parte`) and `bloc` (a bare container, four in the corpus)
    for (const kind of ['parte', 'titlu', 'titlu_act', 'subtitlu_act', 'capitol', 'subcapitol', 'sectiune', 'articol', 'anexa', 'apendice', 'alineat', 'litera', 'liniuta', 'punct', 'paragraf', 'citat', 'nota', 'emitent', 'publicare', 'semnatura', 'tabel', 'rand', 'celula', 'imagine', 'lista', 'element_lista', 'preformatat']) {
      expect(kinds, kind).toContain(kind)
    }
    expect([...states].sort()).toEqual(['amendment_note', 'changed', 'repealed', 'struck:full', 'struck:partial', 'unmarked'])
    expect(new Set(ACT_SPECIMEN.marks.map((mark) => mark.kind))).toEqual(new Set(['reference', 'legal_ref', 'italic', 'bold', 'underline', 'struck']))
  })

  it.each([true, false])('draws the specimen character for character (changed mark: %s)', (changedMark) => {
    const { container } = render(<ActBlocks blocks={ACT_SPECIMEN.blocks} marks={ACT_SPECIMEN.marks} containsNonBmp={false} changedMark={changedMark} onCopyLink={() => {}} />)
    expect(container.textContent).toBe(foldTldfBlocks(ACT_SPECIMEN.blocks))
  })

  it('folds a long note without adding or losing a character', () => {
    const { container } = render(<ActBlocks blocks={ACT_SPECIMEN.blocks} marks={ACT_SPECIMEN.marks} containsNonBmp={false} foldNotes />)
    expect(container.textContent).toBe(foldTldfBlocks(ACT_SPECIMEN.blocks))
    const control = container.querySelector('[data-kind=nota] > button')
    expect(control).toHaveAttribute('data-label', 'Arată toată nota')
    expect(control?.textContent).toBe('')
  })

  it.each(['render-rows-100023.json', 'render-rows-46408.json', 'render-rows-v2-f900012.json', 'render-rows-100019.json'])('draws the real artifact %s character for character', (name) => {
    for (const row of rowsOf(name)) {
      const blocks = row.tldf.blocks
      if (blocks === undefined) continue
      const { container, unmount } = render(<ActBlocks blocks={blocks} marks={row.tldf.marks ?? []} containsNonBmp={row.tldf.contains_non_bmp ?? false} />)
      expect(container.textContent).toBe(foldTldfBlocks(blocks))
      unmount()
    }
  })

  it('says a repealed provision in words that are not text, and keeps a real table a table', () => {
    const { container } = render(<ActBlocks blocks={ACT_SPECIMEN.blocks} marks={ACT_SPECIMEN.marks} containsNonBmp={false} />)
    const repealed = container.querySelector('[data-state-label]')
    expect(repealed).toHaveAttribute('data-state-label', 'abrogat')
    expect(repealed?.textContent).not.toContain('abrogat')
    expect(container.querySelectorAll('table')).toHaveLength(2)
    expect(container.querySelector('td[rowspan="2"]')).not.toBeNull()
    expect(container.querySelector('td[colspan="3"]')).not.toBeNull()
  })
})
