import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQueryMock = vi.fn()

vi.mock('@/lib/graphql/graphql-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql/graphql-client')>(
    '@/lib/graphql/graphql-client',
  )
  return { ...actual, graphqlQuery: (...args: unknown[]) => graphqlQueryMock(...args) }
})

import { fetchParliamentChamberCompositionLive } from './parliament-api.live'

function rawMember(index: number, constituencyName: string) {
  return {
    mandateKey: `2:2024:${index}`,
    chamber: 'camera_deputatilor',
    legislature: '2024',
    fullName: `Membru Prenume-${index}`,
    groupName: 'PSD',
    constituencyName,
    birthDate: null,
    isCurrent: true,
    mandateEndDate: null,
    mandateEndReason: null,
  }
}

describe('fetchParliamentChamberCompositionLive — complete current roster', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('highlights a county member returned after the API-capped first page', async () => {
    graphqlQueryMock.mockImplementation(
      (
        _query: string,
        variables: { chamber?: string; page?: number },
        options?: { operationName?: string },
      ) => {
        if (options?.operationName === 'parliamentGroups') {
          return Promise.resolve({
            parliamentGroups:
              variables.chamber === 'camera_deputatilor'
                ? [
                    {
                      groupId: 'psd-camera_deputatilor',
                      chamber: 'camera_deputatilor',
                      name: 'PSD',
                      memberCount: 101,
                    },
                  ]
                : [],
          })
        }

        if (options?.operationName === 'parliamentMembersCurrent') {
          const page = variables.page ?? 1
          return Promise.resolve({
            parliamentMembers: {
              total: 101,
              totalEstimated: false,
              members:
                page === 1
                  ? Array.from({ length: 100 }, (_, index) =>
                      rawMember(index + 1, 'CLUJ'),
                    )
                  : [rawMember(101, 'GORJ')],
            },
          })
        }

        throw new Error(`Unexpected operation: ${options?.operationName}`)
      },
    )

    const composition = await fetchParliamentChamberCompositionLive('camera', {
      judet: 'gorj',
    })

    expect(composition.activeSeatCount).toBe(1)
    expect(
      composition.seats.find((seat) => seat.memberId === '2:2024:101')?.isActive,
    ).toBe(true)
    expect(
      graphqlQueryMock.mock.calls
        .filter((call) => call[2]?.operationName === 'parliamentMembersCurrent')
        .map((call) => call[1]),
    ).toEqual([
      {
        filter: { legislature: { eq: '2024' }, current: { eq: true } },
        page: 1,
        pageSize: 100,
      },
      {
        filter: { legislature: { eq: '2024' }, current: { eq: true } },
        page: 2,
        pageSize: 100,
      },
    ])
  })
})
