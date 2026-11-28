import { createFileRoute, redirect } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { changesSearchOfOld } from '@/features/legal/lib/legal-changes-address'
import { legalChangesSearchSchema } from '@/schemas/legal-search'

/**
 * Modificări (owner, 28 November 2026): for watching what is changing — the changes to existing acts with what comes
 * into force soon on top, one block per act that makes the change; new laws and the undated changes on their own
 * tabs. The tab, kinds and period are in the address (`fila`, `fel`, `de`, `pana`), so a view is a shareable link;
 * paging stays cursor-only and in memory. Links in the page's earlier keys forward, for good, to these.
 */
export const Route = createFileRoute('/legislation/changes')({
  validateSearch: legalChangesSearchSchema,
  beforeLoad: ({ search }) => {
    const forwarded = changesSearchOfOld(search as Record<string, unknown>)
    if (forwarded !== null) throw redirect({ to: '/legislation/changes', search: forwarded as never, replace: true, statusCode: 301 })
  },
  // Never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001): the page renders in the
  // reader's language from their cookie, and the CDN does not key on `Vary: Cookie`.
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  head: () => ({
    meta: [
      { title: `${t`Modificări legislative`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Fluxul modificărilor legislative: ce act s-a schimbat, prin ce act, felul schimbării și data intrării în vigoare — inclusiv modificările anunțate pentru viitor și cele fără dată înregistrată.`,
      },
    ],
  }),
})
