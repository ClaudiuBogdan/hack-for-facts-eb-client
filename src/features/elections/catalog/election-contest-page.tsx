import { Link } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import type { ElectionContest } from '@/schemas/elections-catalog'
import type { I18n } from '@lingui/core'
import { useElectionContest } from '../hooks/use-elections-catalog'
import {
  ElectionsAvailabilityNote,
  ElectionsBackLink,
  ElectionsFactList,
  ElectionsLoadError,
  ElectionsPageHead,
  ElectionsRecordMissing,
  ElectionsRefreshError,
  type ElectionsFact,
} from './catalog-parts'
import { buildContestDocumentTitle, isIdentityUnverified, scopeTypeLabel } from './elections-catalog-text'

/**
 * `/alegeri/contest/$contestKey` — one source contest's metadata: the office,
 * scope, constituency, chamber and round as the source reports them, and the
 * edition it belongs to. Its scope is the source's reporting scope — it can be
 * a reporting location — and never a verified electoral territory.
 */
export function ElectionContestPage({ contestKey, initialContest }: { readonly contestKey: string; readonly initialContest?: ElectionContest }) {
  const { i18n } = useLingui()
  const query = useElectionContest(contestKey, initialContest)
  const contest = query.data
  useClientDocumentTitle(
    contest ? buildContestDocumentTitle(i18n, { contestKey, place: contest.scopeLabel ?? contest.sourceScopeKey, office: contest.reportedOffice }) : null,
  )

  const refreshError = query.isRefetchError ? <ElectionsRefreshError className="mt-6" onRetry={() => void query.refetch()} /> : null

  if (contest === null) {
    return (
      <ElectionsRecordMissing title={<Trans>Scrutinul nu a fost găsit</Trans>} notice={refreshError}>
        <Trans>Nu există un scrutin public cu cheia {contestKey}.</Trans>
      </ElectionsRecordMissing>
    )
  }

  return (
    <div className="bg-background">
      <ElectionsPageHead
        back={
          contest ? (
            <EditionBackLink electionKey={contest.electionKey} />
          ) : (
            <ElectionsBackLink>
              <Trans>Toate edițiile de sursă</Trans>
            </ElectionsBackLink>
          )
        }
        caption={<Trans>Scrutin din sursă</Trans>}
        // The key names the page while its read is pending or has failed.
        title={contest ? (contest.scopeLabel ?? contest.sourceScopeKey) : contestKey}
      >
        {contest ? (
          <>
            {refreshError}
            <ElectionsFactList className="mt-8" facts={contestFacts(contest, i18n)} />
            <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
              <Trans>Aria din sursă poate fi un loc de raportare, de exemplu o secție de votare, nu un teritoriu electoral verificat.</Trans>
            </p>
          </>
        ) : query.isError ? (
          <ElectionsLoadError onRetry={() => void query.refetch()}>
            <Trans>Datele scrutinului nu s-au încărcat.</Trans>
          </ElectionsLoadError>
        ) : (
          <HubPending rows={4} className="mt-8" />
        )}
        <ElectionsAvailabilityNote className="mt-8" unverified={contest ? isIdentityUnverified(contest.readiness) : false} />
      </ElectionsPageHead>
    </div>
  )
}

function EditionBackLink({ electionKey }: { readonly electionKey: string }) {
  return (
    <ElectionsBackLink electionKey={electionKey}>
      <Trans>Ediția de sursă {electionKey}</Trans>
    </ElectionsBackLink>
  )
}

function contestFacts(contest: ElectionContest, i18n: I18n): readonly ElectionsFact[] {
  return [
    { label: <Trans>Funcție raportată</Trans>, value: contest.reportedOffice },
    { label: <Trans>Tip de arie din sursă</Trans>, value: scopeTypeLabel(i18n, contest.scopeType) },
    { label: <Trans>Cheie de arie din sursă</Trans>, value: contest.sourceScopeKey, code: true },
    { label: <Trans>Etichetă de arie</Trans>, value: contest.scopeLabel, missing: <Trans>Neraportată</Trans> },
    { label: <Trans>Cod de circumscripție</Trans>, value: contest.constituencyCode, code: true },
    { label: <Trans>Nume de circumscripție</Trans>, value: contest.constituencyName },
    { label: <Trans>Cameră</Trans>, value: contest.chamber, missing: <Trans>Neraportată</Trans> },
    { label: <Trans>Tur raportat</Trans>, value: contest.reportedRound },
    { label: <Trans>Cheia scrutinului</Trans>, value: contest.contestKey, code: true },
    {
      label: <Trans>Ediția de sursă</Trans>,
      value: (
        <Link to="/alegeri/$electionKey" params={{ electionKey: contest.electionKey }} className="text-primary underline-offset-4 hover:underline">
          {contest.electionKey}
        </Link>
      ),
      code: true,
    },
  ]
}
