import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'

import { BandRead } from './analytics-parts'

/** A read that fails for one question and answers the next. */
function Read({ question }: { readonly question: string }) {
  if (question === 'fails') throw new Error('a failed read')
  return <p>{`answer to ${question}`}</p>
}

describe('BandRead', () => {
  it('says its quiet node when a read fails, and reads again when the question changes', () => {
    // React reports the caught error; the test only wants the boundary's behaviour.
    const quietConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(
      <BandRead fallback={<p>reading</p>} quiet={<p>said without</p>} resetKey="fails">
        <Read question="fails" />
      </BandRead>,
    )
    expect(screen.getByText('said without')).toBeInTheDocument()

    rerender(
      <BandRead fallback={<p>reading</p>} quiet={<p>said without</p>} resetKey="next">
        <Read question="next" />
      </BandRead>,
    )
    expect(screen.getByText('answer to next')).toBeInTheDocument()
    quietConsole.mockRestore()
  })

  it('keeps its quiet node while the question stays the same', () => {
    const quietConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(
      <BandRead fallback={<p>reading</p>} quiet={<p>said without</p>} resetKey="fails">
        <Read question="fails" />
      </BandRead>,
    )
    rerender(
      <BandRead fallback={<p>reading</p>} quiet={<p>said without</p>} resetKey="fails">
        <Read question="fails" />
      </BandRead>,
    )
    expect(screen.getByText('said without')).toBeInTheDocument()
    quietConsole.mockRestore()
  })
})
