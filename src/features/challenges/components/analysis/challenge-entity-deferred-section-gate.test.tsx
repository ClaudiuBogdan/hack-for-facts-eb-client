import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PREFETCH_MARGIN,
  DEFAULT_RENDER_MARGIN,
  DeferredSectionGate,
} from './challenge-entity-deferred-section-gate'

const deferredSectionInViewState = {
  prefetch: false,
  render: false,
}

vi.mock('react-intersection-observer', () => ({
  useInView: ({
    rootMargin,
  }: {
    rootMargin?: string
  } = {}) => ({
    ref: vi.fn(),
    inView:
      rootMargin === DEFAULT_PREFETCH_MARGIN
        ? deferredSectionInViewState.prefetch
        : rootMargin === DEFAULT_RENDER_MARGIN
          ? deferredSectionInViewState.render
          : false,
  }),
}))

function renderGate(onPrefetch = vi.fn()) {
  return render(
    <DeferredSectionGate
      className="min-h-[360px]"
      fallback={<div data-testid="deferred-fallback">Loading…</div>}
      onPrefetch={onPrefetch}
    >
      <div data-testid="deferred-content">Loaded</div>
    </DeferredSectionGate>,
  )
}

describe('DeferredSectionGate', () => {
  beforeEach(() => {
    deferredSectionInViewState.prefetch = false
    deferredSectionInViewState.render = false
  })

  it('prefetches once before rendering and keeps the reserved shell class', async () => {
    const onPrefetch = vi.fn()
    const { rerender } = renderGate(onPrefetch)

    expect(screen.getByTestId('deferred-fallback').parentElement).toHaveClass(
      'min-h-[360px]',
    )
    expect(screen.queryByTestId('deferred-content')).not.toBeInTheDocument()

    deferredSectionInViewState.prefetch = true
    rerender(
      <DeferredSectionGate
        className="min-h-[360px]"
        fallback={<div data-testid="deferred-fallback">Loading…</div>}
        onPrefetch={onPrefetch}
      >
        <div data-testid="deferred-content">Loaded</div>
      </DeferredSectionGate>,
    )

    await waitFor(() => {
      expect(onPrefetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByTestId('deferred-content')).not.toBeInTheDocument()

    rerender(
      <DeferredSectionGate
        className="min-h-[360px]"
        fallback={<div data-testid="deferred-fallback">Loading…</div>}
        onPrefetch={onPrefetch}
      >
        <div data-testid="deferred-content">Loaded</div>
      </DeferredSectionGate>,
    )

    expect(onPrefetch).toHaveBeenCalledTimes(1)

    deferredSectionInViewState.render = true
    rerender(
      <DeferredSectionGate
        className="min-h-[360px]"
        fallback={<div data-testid="deferred-fallback">Loading…</div>}
        onPrefetch={onPrefetch}
      >
        <div data-testid="deferred-content">Loaded</div>
      </DeferredSectionGate>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('deferred-content')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('deferred-fallback')).not.toBeInTheDocument()
  })
})
