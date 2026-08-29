/**
 * The progressive stitcher's generation pin: a chunk fetched across a
 * recompile carries another generation's blocks, and the manifest's
 * document-level mark offsets would land on the wrong text. The slot must
 * FAIL honestly (the retry card), never render the foreign blocks. Mirrors
 * the server-side pin in getDocumentRenderChunk and the head comparison
 * reassembleTldf already does on the non-progressive path.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTestQueryClient, render } from '@/test/test-utils'
import { fetchLegalRenderMock } from '../../api/legal-render-api.mock'
import { legalActDetailFixture } from '../../mocks/fixtures/legal-act-detail'
import { ActReadingLayout } from './legal-reader-page'

import type { TldfChunkPayload } from '../../lib/tldf/types'
import type { ReactNode } from 'react'

const navigateMock = vi.fn()
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
  useNavigate: () => navigateMock,
}))

/**
 * Two modes, switched per test:
 * - 'stale-chunk': chunk 1 carries a foreign generation while the manifest
 *   never changes — the refusal path.
 * - 'recovery': every chunk carries generation run_id+1; the FIRST base
 *   fetch returns the old manifest, later base fetches return the
 *   recompiled manifest (run_id+1) — so the mismatch-triggered
 *   invalidation refetches, the generation-keyed remount fires, and the
 *   reload succeeds against the new head.
 */
const control: { mode: 'stale-chunk' | 'recovery'; baseCalls: number } = {
  mode: 'stale-chunk',
  baseCalls: 0,
}

const bumpGeneration = <T extends { generation: { run_id: number } }>(payload: T): T => ({
  ...payload,
  generation: { ...payload.generation, run_id: payload.generation.run_id + 1 },
})

vi.mock('../../api/legal-render-api', () => ({
  fetchLegalRender: vi.fn(
    async (documentId: string, options: { readonly chunkIndex?: number } = {}) => {
      const data = await fetchLegalRenderMock(documentId, options)
      if (control.mode === 'stale-chunk') {
        if (options.chunkIndex === 1 && data.kind === 'chunk') {
          return { ...data, tldf: bumpGeneration(data.tldf as TldfChunkPayload) }
        }
        return data
      }
      // recovery mode
      if (options.chunkIndex === undefined) {
        control.baseCalls += 1
        if (control.baseCalls > 1 && data.kind === 'manifest') {
          return { ...data, tldf: bumpGeneration(data.tldf) }
        }
        return data
      }
      if (data.kind === 'chunk') {
        return { ...data, tldf: bumpGeneration(data.tldf as TldfChunkPayload) }
      }
      return data
    },
  ),
}))

const fixtureDir = join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf')
const rows100019 = JSON.parse(
  readFileSync(join(fixtureDir, 'render-rows-100019.json'), 'utf8'),
) as { tldf: unknown }[]
const chunk1 = rows100019[1]?.tldf as TldfChunkPayload

describe('progressive stitcher generation pin', () => {
  it('fails the slot instead of rendering a chunk from another generation', async () => {
    control.mode = 'stale-chunk'
    const { container } = render(
      <ActReadingLayout act={legalActDetailFixture} docOverride="100019" lead={null} fisa={null} />,
      { queryClient: createTestQueryClient() },
    )
    // The failed slot surfaces the retry card (the slot message is internal
    // state); the load-bearing assertion is that the foreign generation's
    // text is NOT stitched into the reader.
    await waitFor(
      () => {
        expect(container.textContent).toContain('nu s-a încărcat')
      },
      { timeout: 15_000 },
    )
    const firstBlockText = chunk1.blocks[0]?.content?.map((r) => r.text).join('') ?? ''
    if (firstBlockText.length > 0) {
      expect(container.querySelector('#reader-content')?.textContent ?? '').not.toContain(
        firstBlockText.slice(0, 40),
      )
    }
    // The honest message reaches the user (opus C4: it was dead code).
    expect(container.textContent).toContain('recompilat')
  })

  it('RECOVERS: invalidation refetches the manifest and the generation-keyed remount reloads clean', async () => {
    control.mode = 'recovery'
    control.baseCalls = 0
    const { container } = render(
      <ActReadingLayout act={legalActDetailFixture} docOverride="100019" lead={null} fisa={null} />,
      { queryClient: createTestQueryClient() },
    )
    // First manifest is the OLD generation; chunk 0 arrives from the NEW
    // one -> mismatch -> invalidate -> refetch returns the recompiled
    // manifest -> ChunkedReader remounts (documentId:run_id key) -> the
    // same chunk now matches and renders.
    const firstBlockText = chunk1.blocks[0]?.content?.map((r) => r.text).join('') ?? ''
    await waitFor(
      () => {
        expect(container.querySelector('#reader-content')?.textContent ?? '').toContain(
          firstBlockText.slice(0, 40),
        )
      },
      { timeout: 15_000 },
    )
    expect(control.baseCalls).toBeGreaterThan(1)
  })
})
