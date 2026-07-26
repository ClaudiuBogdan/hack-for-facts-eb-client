import { describe, expect, it } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import {
  classifyStenogramError,
  classifyStenogramFailure,
  ParliamentStenogramNotFoundError,
} from './parliament-stenogram-error'

function gqlError(
  extensions: Record<string, unknown>,
  message = 'boom',
  status?: number,
) {
  return new GraphQLRequestError('wrapper', {
    graphQLErrors: [{ message, extensions }],
    ...(status !== undefined && { status }),
  })
}

describe('classifyStenogramError — the four states stay distinct', () => {
  it('NOT_FOUND is terminal and never retryable', () => {
    const failure = classifyStenogramError(
      gqlError({ code: 'NOT_FOUND' }, 'no such sitting'),
    )
    expect(failure).toEqual({
      kind: 'not_found',
      message: 'no such sitting',
      retryable: false,
    })
  })

  it('a SOURCE_ONLY capture is permanent — retrying it would be a lie', () => {
    const failure = classifyStenogramError(
      gqlError(
        {
          code: 'TRANSCRIPT_UNAVAILABLE',
          reason: 'source_only',
          sessionKey: 'canon:s:1',
        },
        'blank capture',
        409,
      ),
    )
    expect(failure.kind).toBe('transcript_unavailable')
    expect(failure.reason).toBe('source_only')
    expect(failure.sessionKey).toBe('canon:s:1')
    expect(failure.retryable).toBe(false)
  })

  it('a missing projection is operational, so it IS retryable', () => {
    const failure = classifyStenogramError(
      gqlError(
        { code: 'TRANSCRIPT_UNAVAILABLE', reason: 'projection_unavailable' },
        'not deployed here',
        503,
      ),
    )
    expect(failure.kind).toBe('transcript_unavailable')
    expect(failure.reason).toBe('projection_unavailable')
    expect(failure.retryable).toBe(true)
  })

  it('carries the sitting ref GraphQL attaches, so the state stays actionable', () => {
    const failure = classifyStenogramError(
      gqlError({
        code: 'TRANSCRIPT_UNAVAILABLE',
        reason: 'source_only',
        session: {
          sessionKey: 'canon:senat:5',
          chamber: 'senat',
          sessionDate: null,
          title: 'Ședința Senatului',
          availability: 'SOURCE_ONLY',
          sourceUrl: 'https://senat.ro/lista',
          sourceUrlKind: 'lossy_root',
        },
      }),
    )
    // This ref is what separates "real sitting, no served text" from "no such
    // sitting": the reader names it and links its source without a 2nd request.
    expect(failure.session?.title).toBe('Ședința Senatului')
    expect(failure.session?.sessionDate).toBeUndefined()
    expect(failure.session?.sourceUrlKind).toBe('lossy_root')
  })

  it('no_public_segments is a fact about the record, not a flake', () => {
    const failure = classifyStenogramError(
      gqlError({
        code: 'TRANSCRIPT_UNAVAILABLE',
        reason: 'no_public_segments',
      }),
    )
    expect(failure.reason).toBe('no_public_segments')
    expect(failure.retryable).toBe(false)
  })

  it('an unrecognised reason does not fabricate one', () => {
    const failure = classifyStenogramError(
      gqlError({ code: 'TRANSCRIPT_UNAVAILABLE', reason: 'something_new' }),
    )
    expect(failure.kind).toBe('transcript_unavailable')
    expect(failure.reason).toBeUndefined()
  })

  it('SEARCH_UNAVAILABLE is its own state — never an empty result', () => {
    const failure = classifyStenogramError(
      gqlError({ code: 'SEARCH_UNAVAILABLE', docType: 'stenogram' }),
    )
    expect(failure.kind).toBe('search_unavailable')
    expect(failure.retryable).toBe(true)
  })

  it('an answered-but-refused query is a GraphQL error, not a transport one', () => {
    const failure = classifyStenogramError(
      gqlError({ code: 'INVALID_INPUT' }, 'unbounded window'),
    )
    expect(failure.kind).toBe('graphql')
  })

  it('our own proxy codes are TRANSPORT — the API never answered', () => {
    expect(
      classifyStenogramError(gqlError({ code: 'UPSTREAM_UNAVAILABLE' }, '', 502))
        .kind,
    ).toBe('transport')
    expect(
      classifyStenogramError(
        gqlError({ code: 'PROXY_MISCONFIGURED' }, '', 503),
      ).kind,
    ).toBe('transport')
  })

  it('a bare transport failure (no errors[]) is transport, never not_found', () => {
    const failure = classifyStenogramError(
      new GraphQLRequestError('GraphQL request failed: fetch failed'),
    )
    expect(failure.kind).toBe('transport')
    expect(failure.retryable).toBe(true)
  })

  it('an HTTP failure with no GraphQL body keeps its status', () => {
    const failure = classifyStenogramError(
      new GraphQLRequestError('502 Bad Gateway', { status: 502 }),
    )
    expect(failure).toMatchObject({ kind: 'transport', status: 502 })
  })

  it('a non-GraphQL throw still lands somewhere honest', () => {
    expect(classifyStenogramError(new TypeError('network down')).kind).toBe(
      'transport',
    )
    expect(classifyStenogramError('oops').kind).toBe('transport')
  })

  it('the first RECOGNISED code wins over later noise', () => {
    const error = new GraphQLRequestError('wrapper', {
      graphQLErrors: [
        { message: 'unrelated', extensions: { code: 'SOMETHING_ELSE' } },
        { message: 'gone', extensions: { code: 'NOT_FOUND' } },
      ],
    })
    expect(classifyStenogramError(error).kind).toBe('not_found')
  })
})

describe('classifyStenogramFailure', () => {
  it('maps the thrown not-found sentinel onto the not_found state', () => {
    const failure = classifyStenogramFailure(
      new ParliamentStenogramNotFoundError('resolved null'),
    )
    expect(failure).toEqual({
      kind: 'not_found',
      message: 'resolved null',
      retryable: false,
    })
  })

  it('delegates everything else to the code classifier', () => {
    expect(
      classifyStenogramFailure(gqlError({ code: 'SEARCH_UNAVAILABLE' })).kind,
    ).toBe('search_unavailable')
  })
})
