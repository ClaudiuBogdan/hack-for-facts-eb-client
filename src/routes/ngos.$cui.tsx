import { createFileRoute, notFound } from '@tanstack/react-router'
import { normalizeNgoCui } from '@/features/ngos/lib/normalize-ngo-cui'
import { fetchNgoOrganization, fetchNgoStatements, type NgoStatementsRead } from '@/features/ngos/organization/api'
import { buildNgoProfileHead } from '@/features/ngos/organization/head'
import { isAbortError } from '@/lib/graphql/graphql-client'
import { parseNgoProfileSearch } from '@/schemas/ngos'

/**
 * `/ngos/$cui` reads `ngoOrganizationProfile` in two requests at once: the
 * profile with the registry's purpose (null → not found; a failure → the
 * error page) and the statements (a failure keeps the page, which says so
 * and offers to read them again).
 */
export const Route = createFileRoute('/ngos/$cui')({
  validateSearch: parseNgoProfileSearch,
  loader: async ({ params, abortController }) => {
    const cui = normalizeNgoCui(params.cui)
    if (!cui || !/^[1-9][0-9]{1,9}$/.test(cui)) throw notFound()
    const signal = abortController.signal
    const [organization, statementsRead] = await Promise.all([
      fetchNgoOrganization(cui, { signal }),
      fetchNgoStatements(cui, { signal }).then(
        (statements): NgoStatementsRead => ({ status: 'ready', statements }),
        (error: unknown): NgoStatementsRead => {
          if (isAbortError(error)) throw error
          return { status: 'failed' }
        },
      ),
    ])
    if (organization === null) throw notFound()
    return { organization, statementsRead }
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? buildNgoProfileHead(
          {
            organization: loaderData.organization,
            statements: loaderData.statementsRead.status === 'ready' ? loaderData.statementsRead.statements : [],
          },
          match.context.locale,
        )
      : {},
})
