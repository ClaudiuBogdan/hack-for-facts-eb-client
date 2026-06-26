import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CoverageRibbon,
  JusticeUnavailablePanel,
  PrivacyBoundaryNotice,
  SourceProvenanceDisclosure,
} from '@/features/justice/components/data-trust'
import {
  getJusticeQueryOutcome,
  useJudicialCase,
} from '@/features/justice/hooks/use-justice-data'
import {
  formatJusticeDate,
  getJusticeLegalReferenceResolutionLabel,
  getJusticePartyKindLabel,
} from '@/features/justice/lib/justice-format'
import {
  parseCaseDetailSearch,
  type CaseDetailTab,
  type JudicialCaseDetail,
} from '@/schemas/justice'

export const Route = createFileRoute('/justitie/dosare/$caseId')({
  validateSearch: parseCaseDetailSearch,
  component: JusticeCaseDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `${params.caseId} — ${t`Dosar justiție`}` }],
  }),
})

function JusticeCaseDetailRoute() {
  const { caseId } = Route.useParams()
  const search = Route.useSearch()
  const query = useJudicialCase(caseId)
  const outcome = getJusticeQueryOutcome<JudicialCaseDetail>(query.data)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {query.isLoading && !outcome ? <CaseDetailSkeleton /> : null}

      {query.isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          title={t`Nu am putut încărca dosarul`}
          description={t`Încearcă din nou mai târziu.`}
        />
      ) : null}

      {outcome?.kind === 'unavailable' ? (
        <JusticeUnavailablePanel message={outcome.unavailable.message} />
      ) : null}

      {outcome?.kind === 'notFound' ? (
        <EmptyState
          title={t`Dosarul nu este în acoperirea curentă`}
          description={t`Verifică identificatorul dosarului sau pornește din căutarea de cauze.`}
        />
      ) : null}

      {outcome?.kind === 'populated' ? (
        <CaseDetailContent
          detail={outcome.data}
          tab={search.tab ?? 'cronologie'}
          from={search.from}
        />
      ) : null}
    </main>
  )
}

type CaseDetailContentProps = {
  readonly detail: JudicialCaseDetail
  readonly tab: CaseDetailTab
  readonly from?: string
}

function CaseDetailContent({ detail, tab, from }: CaseDetailContentProps) {
  const navigate = useNavigate({ from: '/justitie/dosare/$caseId' })
  const item = detail.case
  const setTab = (next: CaseDetailTab) => {
    void navigate({ search: (previous) => ({ ...previous, tab: next }) })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <CaseBackLink from={from} />
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/justitie/cautare" className="font-medium hover:underline">
            <Trans>Căutare cauze</Trans>
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            to="/justitie/instante/$courtId"
            params={{ courtId: item.courtId }}
            className="font-medium hover:underline"
          >
            {item.courtName ?? item.institutionCode}
          </Link>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-normal">
              {item.caseNumber}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {item.categoryName ?? <Trans>Categorie necunoscută</Trans>} ·{' '}
              {item.stageName ?? <Trans>stadiu necunoscut</Trans>} ·{' '}
              <Trans>deschis</Trans> {formatJusticeDate(item.sourceOpenedAt)}
            </p>
          </div>
          <Badge variant="outline">
            <Trans>doar metadata</Trans>
          </Badge>
        </div>
      </header>

      <CoverageRibbon provenance={detail.provenance} />
      <PrivacyBoundaryNotice />
      <PrivacyBoundaryNotice variant="incidental-text" />

      <Tabs value={tab} onValueChange={(value) => setTab(value as CaseDetailTab)}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="cronologie">
            <Trans>Cronologie</Trans>
          </TabsTrigger>
          <TabsTrigger value="parti">
            <Trans>Părți</Trans>
          </TabsTrigger>
          <TabsTrigger value="acte">
            <Trans>Acte citate</Trans>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cronologie">
          <Timeline detail={detail} />
        </TabsContent>
        <TabsContent value="parti">
          <Parties detail={detail} />
        </TabsContent>
        <TabsContent value="acte">
          <LegalReferences detail={detail} />
        </TabsContent>
      </Tabs>

      <SourceProvenanceDisclosure provenance={detail.provenance} />
    </section>
  )
}

function CaseBackLink({ from }: { readonly from?: string }) {
  if (!from) {
    return null
  }
  if (from === 'cautare') {
    return (
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link to="/justitie/cautare">
          <Trans>Înapoi la căutare</Trans>
        </Link>
      </Button>
    )
  }
  if (from.startsWith('instante:')) {
    const courtId = from.slice('instante:'.length)
    return (
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link to="/justitie/instante/$courtId" params={{ courtId }}>
          <Trans>Înapoi la instanță</Trans>
        </Link>
      </Button>
    )
  }
  if (from.startsWith('companies:')) {
    const cui = from.slice('companies:'.length)
    return (
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link to="/companies/$cui" params={{ cui }} search={{ tab: 'litigii' }}>
          <Trans>Înapoi la profilul companiei</Trans>
        </Link>
      </Button>
    )
  }
  if (from.startsWith('dosar:')) {
    const caseId = from.slice('dosar:'.length)
    return (
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link
          to="/justitie/dosare/$caseId"
          params={{ caseId }}
          search={{ tab: 'parti' }}
        >
          <Trans>Înapoi la părțile dosarului</Trans>
        </Link>
      </Button>
    )
  }
  return null
}

function Timeline({ detail }: { readonly detail: JudicialCaseDetail }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        <Trans>Ședințe</Trans>
      </h2>
      {detail.hearings.length === 0 ? (
        <EmptyState
          title={t`Nu există ședințe în acoperirea curentă`}
          description={t`Acest lucru poate ține de acoperire sau de stadiul dosarului.`}
        />
      ) : (
        <ol className="space-y-3">
          {detail.hearings.map((hearing) => (
            <li key={hearing.hearingIndex} className="border border-border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium">
                    {formatJusticeDate(hearing.hearingAt)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hearing.solutionSummary ?? <Trans>Fără rezumat publicabil</Trans>}
                  </p>
                </div>
                <Badge variant="outline">
                  <Trans>ședința</Trans> {hearing.hearingIndex}
                </Badge>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">
                    <Trans>Complet</Trans>
                  </dt>
                  <dd>{hearing.panel ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Trans>Pronunțare</Trans>
                  </dt>
                  <dd>{formatJusticeDate(hearing.pronouncementDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Trans>Document</Trans>
                  </dt>
                  <dd>{hearing.documentNumber ?? '—'}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}

      {detail.appeals.length > 0 ? (
        <section className="border border-border p-4">
          <h3 className="text-base font-semibold">
            <Trans>Apeluri</Trans>
          </h3>
          <div className="mt-3 space-y-2">
            {detail.appeals.map((appeal) => (
              <div key={appeal.appealIndex} className="text-sm">
                {formatJusticeDate(appeal.appealDeclaredAt)} ·{' '}
                {appeal.appealType ?? <Trans>tip necunoscut</Trans>}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}

function Parties({ detail }: { readonly detail: JudicialCaseDetail }) {
  return (
    <section className="space-y-4">
      <PrivacyBoundaryNotice />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-border p-4">
          <h2 className="text-lg font-semibold">
            <Trans>Părți publicabile</Trans>
          </h2>
          <div className="mt-3 space-y-3">
            {detail.parties.named.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <Trans>Nu există companii sau instituții publice în fixture.</Trans>
              </p>
            ) : (
              detail.parties.named.map((party) => (
                <div
                  key={party.nameKey}
                  className="flex flex-col gap-2 border-b border-border/70 pb-3 last:border-0"
                >
                  <div className="font-medium">{party.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {party.roleNormalized} · {getJusticePartyKindLabel(party.partyKind)}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-fit">
                    <Link
                      to="/justitie/cautare"
                      search={{ partyKey: party.nameKey, from: `dosar:${detail.case.caseId}` }}
                    >
                      <Trans>Vezi cauze cu această cheie</Trans>
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="border border-border p-4">
          <h2 className="text-lg font-semibold">
            <Trans>Agregate nepublicabile</Trans>
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            {detail.parties.personCountsByRole.map((role) => (
              <div key={`person-${role.role}`} className="flex justify-between gap-3">
                <span>{role.role}</span>
                <span className="text-muted-foreground">
                  <Trans>{role.count} persoane fizice</Trans>
                </span>
              </div>
            ))}
            {detail.parties.unknownCountsByRole.map((role) => (
              <div key={`unknown-${role.role}`} className="flex justify-between gap-3">
                <span>{role.role}</span>
                <span className="text-muted-foreground">
                  <Trans>{role.count} părți neidentificate</Trans>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function LegalReferences({ detail }: { readonly detail: JudicialCaseDetail }) {
  const isLive = detail.laneAvailability.legalReferences === 'live'
  return (
    <section className="space-y-4 border border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            <Trans>Acte citate</Trans>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans>
              Referințele legale sunt o bandă separată și pot fi incomplete.
            </Trans>
          </p>
        </div>
        <Badge variant={isLive ? 'outline' : 'secondary'}>
          {isLive ? <Trans>live mock</Trans> : <Trans>în pregătire</Trans>}
        </Badge>
      </div>
      {detail.legalReferences.length === 0 ? (
        <EmptyState
          title={t`Referințele legale sunt în pregătire`}
          description={t`Dosarul rămâne util prin metadata publică și cronologie.`}
        />
      ) : (
        <div className="space-y-3">
          {detail.legalReferences.map((reference) => (
            <div key={reference.rawCitation} className="border-b border-border/70 pb-3 last:border-0">
              <div className="font-medium">{reference.rawCitation}</div>
              <div className="text-sm text-muted-foreground">
                <Trans>Rezolvare</Trans>:{' '}
                {getJusticeLegalReferenceResolutionLabel(reference.resolutionStatus)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CaseDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  )
}
