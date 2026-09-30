import { createFileRoute, notFound } from '@tanstack/react-router'
import { normalizeNgoCui } from '@/features/ngos/lib/normalize-ngo-cui'
import { fetchNgoOrganization, fetchNgoPurpose, fetchNgoStatements, type NgoStatementsRead } from '@/features/ngos/organization/api'
import { buildNgoProfileHead } from '@/features/ngos/organization/head'
import { isAbortError } from '@/lib/graphql/graphql-client'
import { parseNgoProfileSearch } from '@/schemas/ngos'

/**
 * `/ngos/$cui` reads `ngoOrganizationProfile` in three requests at once: the
 * profile (null → not found; a failure → the error page), the statements
 * (a failure keeps the page, which says so and offers to read them again)
 * and the purpose's text (any failure, an API without the field included,
 * leaves it out).
 */
export const Route = createFileRoute('/ngos/$cui')({
  validateSearch: parseNgoProfileSearch,
  loader: async ({ params, abortController }) => {
    const cui = normalizeNgoCui(params.cui)
    if (!cui || !/^[1-9][0-9]{1,9}$/.test(cui)) throw notFound()
    const signal = abortController.signal
    const [organization, statementsRead, purpose] = await Promise.all([
      fetchNgoOrganization(cui, { signal }),
      fetchNgoStatements(cui, { signal }).then(
        (statements): NgoStatementsRead => ({ status: 'ready', statements }),
        (error: unknown): NgoStatementsRead => {
          if (isAbortError(error)) throw error
          return { status: 'failed' }
        },
      ),
      fetchNgoPurpose(cui, { signal }),
    ])
    if (organization === null) throw notFound()
    return { organization, statementsRead, purpose }
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? buildNgoProfileHead(
          {
            organization: loaderData.organization,
            statements: loaderData.statementsRead.status === 'ready' ? loaderData.statementsRead.statements : [],
            purpose: loaderData.purpose,
          },
          match.context.locale,
        )
      : {},
})
