import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ParliamentStenogramFailure } from '../lib/parliament-stenogram-error'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'

function renderFailure(
  failure: ParliamentStenogramFailure,
  props: Partial<
    Parameters<typeof ParliamentStenogramFailureNotice>[0]
  > = {},
) {
  return render(
    <ParliamentStenogramFailureNotice failure={failure} {...props} />,
  )
}

describe('ParliamentStenogramFailureNotice — four states, four sentences', () => {
  it('a transport failure keeps the record an OPEN QUESTION', () => {
    renderFailure({ kind: 'transport', message: 'fetch failed', retryable: true })
    // The wording must not assert anything about Parliament's records.
    expect(screen.getByText(/Nu am putut contacta serverul/)).toBeInTheDocument()
    expect(screen.getByText(/Nu știm dacă ședința există/)).toBeInTheDocument()
    expect(screen.queryByText(/Nu am găsit această ședință/)).toBeNull()
  })

  it('a not-found says the address matches nothing we serve', () => {
    renderFailure({ kind: 'not_found', message: 'gone', retryable: false })
    expect(screen.getByText(/Nu am găsit această ședință/)).toBeInTheDocument()
    expect(screen.queryByText(/Nu am putut contacta serverul/)).toBeNull()
  })

  it('a SOURCE_ONLY capture says the sitting EXISTS', () => {
    renderFailure({
      kind: 'transcript_unavailable',
      reason: 'source_only',
      message: 'blank capture',
      retryable: false,
    })
    expect(
      screen.getByText(/Ședința există, dar textul nu este servit aici/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ședința a avut loc/)).toBeInTheDocument()
  })

  it('a missing projection blames us, not the data', () => {
    renderFailure({
      kind: 'transcript_unavailable',
      reason: 'projection_unavailable',
      message: 'not deployed',
      retryable: true,
    })
    expect(
      screen.getByText(/Cititorul de stenograme nu este disponibil momentan/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/o problemă de la noi, nu o lipsă în datele Parlamentului/),
    ).toBeInTheDocument()
  })

  it('a dead search index refuses to look like an empty result', () => {
    renderFailure({
      kind: 'search_unavailable',
      message: 'projection down',
      retryable: true,
    })
    expect(
      screen.getByText(/Căutarea în stenograme nu este disponibilă/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nu restrângem căutarea la titluri fără să vă spunem/),
    ).toBeInTheDocument()
  })

  it('a refused query is reported as a server refusal, not an outage', () => {
    renderFailure({ kind: 'graphql', message: 'invalid', retryable: true })
    expect(
      screen.getByText(/Cererea a fost refuzată de server/),
    ).toBeInTheDocument()
  })
})

describe('retry affordance follows retryability', () => {
  it('offers a retry when one could help', async () => {
    const onRetry = vi.fn()
    renderFailure(
      { kind: 'transport', message: 'x', retryable: true },
      { onRetry },
    )
    await userEvent.click(screen.getByRole('button', { name: /Reîncearcă/ }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('offers NO retry for a permanent fact', () => {
    // Retrying a SOURCE_ONLY capture will never produce a transcript, so the
    // button would be a lie.
    renderFailure(
      {
        kind: 'transcript_unavailable',
        reason: 'source_only',
        message: 'x',
        retryable: false,
      },
      { onRetry: vi.fn() },
    )
    expect(screen.queryByRole('button', { name: /Reîncearcă/ })).toBeNull()
  })

  it('hands over the official source instead', () => {
    renderFailure(
      {
        kind: 'transcript_unavailable',
        reason: 'source_only',
        message: 'x',
        retryable: false,
      },
      { sourceUrl: 'https://senat.ro/x', sourceLabel: 'Deschide la sursă' },
    )
    const link = screen.getByRole('link', { name: /Deschide la sursă/ })
    expect(link).toHaveAttribute('href', 'https://senat.ro/x')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('assistive-tech role', () => {
  it('announces genuine failures as alerts', () => {
    renderFailure({ kind: 'transport', message: 'x', retryable: true })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('a not-found is a status, not an alarm', () => {
    renderFailure({ kind: 'not_found', message: 'x', retryable: false })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
