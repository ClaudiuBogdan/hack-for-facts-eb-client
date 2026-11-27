import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { GlobalErrorPage } from './GlobalErrorPage'

vi.mock('@/lib/sentry', () => ({ initSentry: vi.fn(), withSentry: vi.fn() }))
vi.mock('@/lib/chunk-recovery', () => ({ attemptChunkRecovery: () => false }))
// As a production build makes them: Lingui's macro strips `message`, only the id is left (ERR-001).
vi.mock('@/lib/errors-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/errors-utils')>()
  const idOnly = Object.fromEntries(Object.entries(actual.messages).map(([key, descriptor]) => [key, { id: descriptor.id }])) as typeof actual.messages
  return { ...actual, messages: idOnly, classifyError: () => ({ title: idOnly.pageRenderErrorTitle, friendlyMessage: idOnly.genericError }) }
})

describe('GlobalErrorPage with descriptors as production builds them', () => {
  it('never renders a blank title or text', () => {
    render(<GlobalErrorPage error={new Error('boom')} />)

    expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).not.toBe('')
    const paragraphs = [...screen.getByRole('alert').querySelectorAll('p')]
    expect(paragraphs.length).toBeGreaterThan(0)
    for (const paragraph of paragraphs) expect(paragraph.textContent?.trim()).not.toBe('')
  })
})
