import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import {
  ParliamentSpeechContextSchema,
  type ParliamentSpeechContext,
} from '@/schemas/parliament'

/**
 * The regression key from a real shared link. `/parlament/stenograme/<this>`
 * must keep resolving into the canonical sitting reader forever.
 */
const REGRESSION_LEGACY_KEY = 'cdep:cdep_stenogram:9043:9:718'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    to,
    params,
    search,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
  }) => {
    const path = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to,
    )
    const query = new URLSearchParams(search ?? {}).toString()
    return <a href={query ? `${path}?${query}` : path}>{children}</a>
  },
}))

const useParliamentSpeechContext = vi.fn()
const useParliamentSpeechDetail = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentSpeechContext: (key: string) =>
    useParliamentSpeechContext(key) as unknown,
  useParliamentSpeechDetail: (key: string) =>
    useParliamentSpeechDetail(key) as unknown,
}))

vi.mock('./parliament-shell', () => ({
  ParliamentShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const { ParliamentSpeechDetailPage } = await import(
  './parliament-speech-detail-page'
)

const idle = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

function context(
  overrides: Partial<ParliamentSpeechContext> = {},
): ParliamentSpeechContext {
  return ParliamentSpeechContextSchema.parse({
    speechKey: REGRESSION_LEGACY_KEY,
    session: {
      sessionKey: 'canon:cdep:9043',
      chamber: 'camera_deputatilor',
      sessionDate: '2019-06-18',
      sessionDateSource: 'stenogram_title',
      title: 'Ședința Camerei Deputaților din 18 iunie 2019',
      sourceSystem: 'cdep_stenogram',
      availability: 'COMPLETE',
      sourceUrl: 'https://cdep.ro/steno/9043',
      sourceUrlKind: 'exact',
      segmentCount: 100,
      speechCount: 60,
      speakerCount: 20,
    },
    segment: null,
    previousContribution: null,
    nextContribution: null,
    redirect: null,
    ...overrides,
  })
}

beforeEach(() => {
  navigate.mockClear()
  useParliamentSpeechContext.mockReturnValue(idle)
  useParliamentSpeechDetail.mockReturnValue(idle)
})

describe('legacy speech links resolve into the canonical sitting reader', () => {
  it('an `exact_segment` mapping forwards WITH the highlight', async () => {
    useParliamentSpeechContext.mockReturnValue({
      ...idle,
      data: context({
        redirect: {
          legacySpeechKey: REGRESSION_LEGACY_KEY,
          sessionKey: 'canon:cdep:9043',
          canonicalSpeechKey: 'canon:cdep:9043:718',
          canonicalSegmentKey: 'canon:cdep:9043#718',
          canonicalPosition: 718,
          mappingKind: 'exact_segment',
          matchMethod: 'cdep_sitting_ids',
        },
      }),
    })

    render(<ParliamentSpeechDetailPage speechKey={REGRESSION_LEGACY_KEY} />)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/parlament/stenograme/sedinte/$sessionKey',
          params: { sessionKey: 'canon:cdep:9043' },
          search: { interventie: 'canon:cdep:9043:718' },
          replace: true,
        }),
      ),
    )
  })

  it('a `session_only` mapping forwards with NO guessed highlight', async () => {
    useParliamentSpeechContext.mockReturnValue({
      ...idle,
      data: context({
        // The DOMAIN shape: the mapper has already collapsed the GraphQL nulls,
        // so "no proven block" is an ABSENT pointer, not a null one.
        redirect: {
          legacySpeechKey: REGRESSION_LEGACY_KEY,
          sessionKey: 'canon:cdep:9043',
          mappingKind: 'session_only',
          matchMethod: 'cdep_sitting_ids',
        },
      }),
    })

    render(<ParliamentSpeechDetailPage speechKey={REGRESSION_LEGACY_KEY} />)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ search: {} }),
      ),
    )
    // And the reader is told WHY there is no highlight.
    expect(
      screen.getByText(/nu am putut dovedi care anume este intervenția/),
    ).toBeInTheDocument()
  })

  it('a canonical key forwards straight through', async () => {
    useParliamentSpeechContext.mockReturnValue({
      ...idle,
      data: context({
        speechKey: 'canon:cdep:9043:718',
        segment: {
          segmentKey: 'canon:cdep:9043#718',
          sessionKey: 'canon:cdep:9043',
          position: 718,
          kind: 'SPEECH',
          text: 'Domnul deputat: ...',
          textChars: 19,
          speechKey: 'canon:cdep:9043:718',
          sourceUrl: 'https://cdep.ro/steno/9043#718',
          sourceUrlKind: 'exact',
        },
      }),
    })

    render(<ParliamentSpeechDetailPage speechKey="canon:cdep:9043:718" />)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: { interventie: 'canon:cdep:9043:718' },
        }),
      ),
    )
  })

  it('promises a redirect while a LEGACY key is resolving', () => {
    useParliamentSpeechContext.mockReturnValue({ ...idle, isLoading: true })
    render(<ParliamentSpeechDetailPage speechKey={REGRESSION_LEGACY_KEY} />)
    expect(
      screen.getByText(/Link vechi — căutăm intervenția în stenograma ședinței/),
    ).toBeInTheDocument()
  })
})

describe('the four states stay distinguishable on the legacy route', () => {
  it('a TRANSPORT failure is never rendered as "not found"', () => {
    useParliamentSpeechContext.mockReturnValue({
      ...idle,
      isError: true,
      error: new GraphQLRequestError('GraphQL request failed: fetch failed'),
    })

    render(<ParliamentSpeechDetailPage speechKey={REGRESSION_LEGACY_KEY} />)
    expect(screen.getByText(/Nu am putut contacta serverul/)).toBeInTheDocument()
    expect(screen.queryByText(/Nu am găsit această ședință/)).toBeNull()
    // …and it is retryable.
    expect(screen.getByRole('button', { name: /Reîncearcă/ })).toBeInTheDocument()
  })

  it('a GRAPHQL error is reported as a refusal, and is retryable', () => {
    useParliamentSpeechContext.mockReturnValue({
      ...idle,
      isError: true,
      error: new GraphQLRequestError('refused', {
        graphQLErrors: [
          { message: 'bad input', extensions: { code: 'INVALID_INPUT' } },
        ],
      }),
    })

    render(<ParliamentSpeechDetailPage speechKey={REGRESSION_LEGACY_KEY} />)
    expect(
      screen.getByText(/Cererea a fost refuzată de server/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reîncearcă/ })).toBeInTheDocument()
  })

  it('a genuinely unknown key IS a not-found, with no retry', () => {
    useParliamentSpeechContext.mockReturnValue({ ...idle, data: null })
    useParliamentSpeechDetail.mockReturnValue({ ...idle, data: null })

    render(<ParliamentSpeechDetailPage speechKey="cdep:nope:1" />)
    expect(screen.getByText(/Nu am găsit această ședință/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reîncearcă/ })).toBeNull()
  })

  it('an unmapped-but-real turn renders standalone and says the context is missing', () => {
    useParliamentSpeechContext.mockReturnValue({ ...idle, data: null })
    useParliamentSpeechDetail.mockReturnValue({
      ...idle,
      data: {
        speechKey: 'cdep:orphan:1',
        spokenAt: '2026-05-13',
        title: 'Intervenție privind bugetul',
        summary: 'Rezumat.',
        chamber: 'senat',
        sourceUrl: 'https://senat.ro/lista',
        sourceUrlKind: 'lossy_root',
        fullText: 'Textul complet al intervenției.',
        isCanonical: false,
      },
    })

    render(<ParliamentSpeechDetailPage speechKey="cdep:orphan:1" />)

    expect(screen.getByText('Intervenție privind bugetul')).toBeInTheDocument()
    expect(
      screen.getByText(/nu o putem arăta în contextul dezbaterii/),
    ).toBeInTheDocument()
    // A lossy Senate link is labelled as a sitting root, never an exact anchor.
    expect(
      screen.getByText(/nu poziția exactă a acestei luări de cuvânt/),
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not fetch the standalone turn while the context is still resolving', () => {
    useParliamentSpeechContext.mockReturnValue({ ...idle, isLoading: true })
    render(<ParliamentSpeechDetailPage speechKey={REGRESSION_LEGACY_KEY} />)
    // Disabled by passing an empty key — the sitting is the primary answer.
    expect(useParliamentSpeechDetail).toHaveBeenCalledWith('')
  })
})
