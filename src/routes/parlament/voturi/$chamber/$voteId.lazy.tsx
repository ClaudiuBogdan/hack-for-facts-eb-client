import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getMemberJudetMap,
  getParliamentGroupColorMap,
} from '@/features/parliament/api/parliament-api'
import {
  DEFAULT_VOTE_TAB,
  voteDetailSearchWithTab,
} from '@/features/parliament/lib/vote-detail-search'
import { VoteDetailContent } from '@/features/parliament/components/vote-detail-content'
import { VoteDetailSkeleton } from '@/features/parliament/components/vote-detail-skeleton'
import { ParliamentLoadErrorPage } from '@/features/parliament/components/parliament-load-error-page'
import { ParliamentVoteNotFoundPage } from '@/features/parliament/components/parliament-not-found-page'
import { useParliamentVoteDetail } from '@/features/parliament/hooks/use-parliament-data'

export const Route = createLazyFileRoute('/parlament/voturi/$chamber/$voteId')({
  component: ParliamentVoteDetailRoutePage,
})

// Group colours are a derive-on-access Proxy (safe to read at module scope).
const groupColors = getParliamentGroupColorMap()

function ParliamentVoteDetailRoutePage() {
  const { chamber, voteId } = Route.useParams()
  // The ROUTE owns the tab and hands it down; the section stays a reusable
  // component that works uncontrolled wherever it is embedded without a URL.
  const { alegere } = Route.useSearch()
  const navigate = useNavigate({ from: '/parlament/voturi/$chamber/$voteId' })
  const { data: detail, isLoading, isError, refetch } = useParliamentVoteDetail(
    chamber,
    voteId,
  )

  if (isLoading) {
    return <VoteDetailSkeleton chamber={chamber} />
  }

  // A read failure is not a missing division — the vote-detail page fans out to
  // several ballot pages, so a transient error here is entirely plausible.
  if (isError) {
    return (
      <ParliamentLoadErrorPage
        chamber={chamber}
        breadcrumbLabel="Vot indisponibil"
        title="Votul nu a putut fi încărcat"
        description="Serviciul de date nu a răspuns. Divizarea poate exista — reîncearcă în câteva momente."
        onRetry={() => void refetch()}
      />
    )
  }

  if (!detail) {
    return <ParliamentVoteNotFoundPage chamber={chamber} voteId={voteId} />
  }

  // Read AFTER the vote detail resolves — the member→județ map is primed from
  // this vote's ballots during the fetch, so a module-scope snapshot would be
  // empty. (Group colours are a Proxy and don't need this.)
  const memberJudete = getMemberJudetMap()

  return (
    <VoteDetailContent
      detail={detail}
      groupColors={groupColors}
      memberJudete={memberJudete}
      activeVoteTab={alegere ?? DEFAULT_VOTE_TAB}
      onVoteTabChange={(tab) => {
        void navigate({
          // Functional form: a param this route does not own must survive the
          // click. NOT `replace` — a tab is a place the reader can come back to,
          // so the browser's back button has to undo it.
          search: (previous) => voteDetailSearchWithTab(previous, tab),
        })
      }}
    />
  )
}
