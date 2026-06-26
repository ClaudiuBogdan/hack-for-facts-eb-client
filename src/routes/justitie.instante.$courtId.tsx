import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  CourtAnalyticsTab,
  CourtCaseloadResult,
} from '@/schemas/justice'
import {
  CoverageRibbon,
  IdentityConfidenceBadge,
  JusticeUnavailablePanel,
  PrivacyBoundaryNotice,
  SourceProvenanceDisclosure,
} from '@/features/justice/components/data-trust'
import {
  getJusticeQueryOutcome,
  useCourtCaseload,
} from '@/features/justice/hooks/use-justice-data'
import {
  formatJusticeCount,
  formatJusticeCountCompact,
  formatPercent,
  getJusticeCourtLevelLabel,
  getJusticePartyKindLabel,
} from '@/features/justice/lib/justice-format'
import { parseCourtAnalyticsSearch } from '@/schemas/justice'

export const Route = createFileRoute('/justitie/instante/$courtId')({
  validateSearch: parseCourtAnalyticsSearch,
  component: JusticeCourtRoute,
  head: ({ params }) => ({
    meta: [{ title: `${params.courtId} — ${t`Justiție`}` }],
  }),
})

function JusticeCourtRoute() {
  const { courtId } = Route.useParams()
  const search = Route.useSearch()
  const query = useCourtCaseload(courtId, search)
  const outcome = getJusticeQueryOutcome<CourtCaseloadResult>(query.data)

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {query.isLoading && !outcome ? <CourtSkeleton /> : null}

      {query.isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          title={t`Nu am putut încărca instanța`}
          description={t`Încearcă din nou mai târziu.`}
        />
      ) : null}

      {outcome?.kind === 'unavailable' ? (
        <JusticeUnavailablePanel message={outcome.unavailable.message} />
      ) : null}

      {outcome?.kind === 'notFound' ? (
        <EmptyState
          title={t`Instanța nu este în acoperirea curentă`}
          description={t`Verifică identificatorul instanței sau pornește din lista de pe pagina Justiție.`}
        />
      ) : null}

      {outcome?.kind === 'populated' ? (
        <CourtContent data={outcome.data} tab={search.tab ?? 'prezentare'} />
      ) : null}
    </main>
  )
}

type CourtContentProps = {
  readonly data: CourtCaseloadResult
  readonly tab: CourtAnalyticsTab
}

function CourtContent({ data, tab }: CourtContentProps) {
  const navigate = useNavigate({ from: '/justitie/instante/$courtId' })
  const court = data.court

  const setTab = (next: CourtAnalyticsTab) => {
    void navigate({ search: (previous) => ({ ...previous, tab: next }) })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link to="/justitie" className="text-sm font-medium hover:underline">
          <Trans>Justiție</Trans>
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              {court.courtName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {getJusticeCourtLevelLabel(court.courtLevel)} ·{' '}
              {court.locality ?? <Trans>localitate necunoscută</Trans>} ·{' '}
              {court.countyName ?? <Trans>județ necunoscut</Trans>}
            </p>
          </div>
          <Badge variant={court.mappingConfidence === 'medium' ? 'warning' : 'outline'}>
            {court.mappingConfidence === 'medium' ? (
              <Trans>mapare medie</Trans>
            ) : (
              <Trans>mapare ridicată</Trans>
            )}
          </Badge>
        </div>
      </header>

      <CoverageRibbon provenance={data.provenance} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={<Trans>Cauze</Trans>} value={formatJusticeCount(data.headline.totalCases)} />
        <Metric label={<Trans>Ședințe</Trans>} value={formatJusticeCount(data.headline.totalHearings)} />
        <Metric label={<Trans>Apeluri</Trans>} value={formatJusticeCount(data.headline.totalAppeals)} />
        <Metric label={<Trans>Rată apel</Trans>} value={formatPercent(data.headline.appealRatePct)} />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as CourtAnalyticsTab)}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="prezentare">
            <Trans>Prezentare</Trans>
          </TabsTrigger>
          <TabsTrigger value="volum">
            <Trans>Volum</Trans>
          </TabsTrigger>
          <TabsTrigger value="categorii">
            <Trans>Categorii</Trans>
          </TabsTrigger>
          <TabsTrigger value="litiganti">
            <Trans>Litiganți</Trans>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="prezentare">
          <div className="grid gap-5 lg:grid-cols-2">
            <VolumePanel data={data} />
            <CategoryPanel data={data} />
          </div>
        </TabsContent>
        <TabsContent value="volum">
          <VolumePanel data={data} expanded />
        </TabsContent>
        <TabsContent value="categorii">
          <CategoryPanel data={data} expanded />
        </TabsContent>
        <TabsContent value="litiganti">
          <TopLitigantsPanel data={data} />
        </TabsContent>
      </Tabs>

      {data.headline.totalCases === 0 ? (
        <EmptyState
          title={t`Nu am găsit cauze în intervalul acoperit pentru această instanță`}
          description={t`Acesta este un rezultat de acoperire, nu o confirmare de inexistență.`}
        />
      ) : null}

      <SourceProvenanceDisclosure provenance={data.provenance} />
    </section>
  )
}

type MetricProps = {
  readonly label: ReactNode
  readonly value: string
}

function Metric({ label, value }: MetricProps) {
  return (
    <dl className="border border-border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold">{value}</dd>
    </dl>
  )
}

function VolumePanel({
  data,
  expanded = false,
}: {
  readonly data: CourtCaseloadResult
  readonly expanded?: boolean
}) {
  const max = Math.max(1, ...data.volumeByYear.map((item) => item.count))
  return (
    <section className="border border-border p-4">
      <h2 className="text-lg font-semibold">
        <Trans>Volum pe ani</Trans>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        <Trans>Grafic textual cu tabel fallback pentru accesibilitate.</Trans>
      </p>
      <div className="mt-4 space-y-2">
        {data.volumeByYear.map((item) => (
          <Link
            key={item.year}
            to="/justitie/cautare"
            search={{
              court: data.court.institutionCode,
              year: item.year,
              from: `instante:${data.court.institutionCode}`,
            }}
            className="grid grid-cols-[4rem_1fr_6rem] items-center gap-3 text-sm hover:underline"
          >
            <span className="text-muted-foreground">{item.year}</span>
            <div className="h-2 bg-muted">
              <div
                className="h-2 bg-sky-600"
                style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }}
              />
            </div>
            <span className="text-right text-muted-foreground">
              {formatJusticeCountCompact(item.count)}
            </span>
          </Link>
        ))}
      </div>
      {expanded ? <PrivacyBoundaryNotice variant="metadata-only" className="mt-4" /> : null}
    </section>
  )
}

function CategoryPanel({
  data,
  expanded = false,
}: {
  readonly data: CourtCaseloadResult
  readonly expanded?: boolean
}) {
  return (
    <section className="border border-border p-4">
      <h2 className="text-lg font-semibold">
        <Trans>Categorii și stadii</Trans>
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <BreakdownList
          title={<Trans>Categorii</Trans>}
          items={data.byCategory.map((item) => ({
            key: item.category,
            label: item.categoryName,
            count: item.count,
            hrefSearch: {
              court: data.court.institutionCode,
              category: item.category,
              from: `instante:${data.court.institutionCode}`,
            },
          }))}
        />
        <BreakdownList
          title={<Trans>Stadii</Trans>}
          items={data.byStage.map((item) => ({
            key: item.stage,
            label: item.stageName,
            count: item.count,
            hrefSearch: {
              court: data.court.institutionCode,
              stage: item.stage,
              from: `instante:${data.court.institutionCode}`,
            },
          }))}
        />
      </div>
      {expanded ? <PrivacyBoundaryNotice variant="metadata-only" className="mt-4" /> : null}
    </section>
  )
}

type BreakdownListProps = {
  readonly title: ReactNode
  readonly items: readonly {
    readonly key: string
    readonly label: string
    readonly count: number
    readonly hrefSearch: Record<string, string>
  }[]
}

function BreakdownList({ title, items }: BreakdownListProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={item.key}
            to="/justitie/cautare"
            search={item.hrefSearch}
            className="flex items-center justify-between gap-3 text-sm hover:underline"
          >
            <span>{item.label}</span>
            <span className="text-muted-foreground">
              {formatJusticeCountCompact(item.count)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function TopLitigantsPanel({ data }: { readonly data: CourtCaseloadResult }) {
  return (
    <section className="space-y-4 border border-border p-4">
      <div>
        <h2 className="text-lg font-semibold">
          <Trans>Litiganți publicabili</Trans>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans>Doar companii și instituții publice, cu etichete de încredere.</Trans>
        </p>
      </div>
      <PrivacyBoundaryNotice variant="candidate-link" />
      {data.topLitigants.length === 0 ? (
        <EmptyState
          title={t`Nu există litiganți publicabili pentru această instanță`}
          description={t`Persoanele și părțile necunoscute nu sunt afișate nominal.`}
        />
      ) : (
        <div className="space-y-3">
          {data.topLitigants.map((item) => (
            <div
              key={item.nameKey}
              className="flex flex-col gap-3 border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="font-medium">{item.displayName}</div>
                <div className="text-sm text-muted-foreground">
                  {getJusticePartyKindLabel(item.partyKind)} ·{' '}
                  {formatJusticeCountCompact(item.mentionCount)} <Trans>mențiuni</Trans>
                </div>
                <IdentityConfidenceBadge confidence={item.confidence} />
              </div>
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/justitie/cautare"
                  search={{
                    court: data.court.institutionCode,
                    partyKey: item.nameKey,
                    from: `instante:${data.court.institutionCode}`,
                  }}
                >
                  <Trans>Vezi cauzele</Trans>
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CourtSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
