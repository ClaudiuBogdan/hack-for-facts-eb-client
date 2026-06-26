import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Filter,
  Info,
  LineChart as LineChartIcon,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type {
  DataStatus,
  IndicatorNumberRow,
  IndicatorValueRow,
  PublicEnterpriseLandingSummary,
  PublicEnterpriseProfile,
  PublicEnterpriseProfileSearch,
  PublicEnterpriseProfileTab,
  PublicEnterpriseSearch,
  PublicEnterpriseSearchHit,
  PublicEnterpriseSearchResult,
  SourceLineage,
} from '@/schemas/public-enterprise'
import {
  usePublicEnterpriseLandingSummary,
  usePublicEnterpriseProfile,
  usePublicEnterpriseSearch,
} from '../hooks/use-public-enterprises'
import {
  formatKpiValue,
  formatPublicEnterpriseNumber,
  groupNumericRowsByUnit,
} from '../lib/formatting'
import { HEADLINE_KPI_CODES } from '../lib/headline-kpis'
import { normalizePublicEnterpriseCui } from '../lib/normalize-public-enterprise-cui'
import {
  getPublicEnterpriseTabConfig,
  getPublicEnterpriseTabs,
  PUBLIC_ENTERPRISE_TAB_IDS,
} from '../lib/tab-config'

const PAGE_SHELL = 'mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8'
const PANEL =
  'rounded-lg border border-border/70 bg-background shadow-xs'

type LandingRouteProps = {
  readonly initialSummary?: PublicEnterpriseLandingSummary
}

type ListingRouteProps = {
  readonly search: PublicEnterpriseSearch
}

type ProfileRouteProps = {
  readonly profile: PublicEnterpriseProfile
  readonly cui: string
  readonly search: PublicEnterpriseProfileSearch
}

export function PublicEnterprisesLandingRoute({
  initialSummary,
}: LandingRouteProps) {
  const summaryQuery = usePublicEnterpriseLandingSummary()
  const summary = summaryQuery.data ?? initialSummary

  return (
    <main className={PAGE_SHELL}>
      <div className="space-y-6">
        <CoverageRibbon
          lineage={summary?.lineage}
          dataStatus={summary?.dataStatus ?? 'sample'}
        />
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <DataStatusBadge status={summary?.dataStatus ?? 'sample'} />
                <Badge variant="outline">
                  <Trans>OUG 109/2011</Trans>
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                <Trans>Întreprinderi publice de stat</Trans>
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                <Trans>
                  Caută companii de stat monitorizate de AMEPIP, vezi indicatorii
                  lor pe ani și verifică fiecare cifră în registrul oficial.
                  Indicatorii AMEPIP sunt rate și KPI, nu valori contabile
                  absolute.
                </Trans>
              </p>
            </div>
            <PublicEnterpriseSearchForm />
          </div>

          <div className={cn(PANEL, 'p-4')}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">
                  <Trans>Proveniență verificabilă</Trans>
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  <Trans>
                    Datele sunt modelate după instantaneul AMEPIP acceptat în
                    scraper. În mock mode, eticheta „exemplu” rămâne vizibilă ca
                    să nu confundăm fixturele cu date live.
                  </Trans>
                </p>
              </div>
            </div>
          </div>
        </section>

        {summaryQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              <Trans>Nu am putut încărca sumarul</Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans>Textul de context rămâne disponibil; încearcă din nou.</Trans>
            </AlertDescription>
          </Alert>
        ) : null}

        {summaryQuery.isLoading && !summary ? (
          <LandingSkeleton />
        ) : summary ? (
          <>
            <LandingStats summary={summary} />
            <FeaturedEnterprises summary={summary} />
            <SourceFooter lineage={summary.lineage} />
          </>
        ) : null}
      </div>
    </main>
  )
}

export function PublicEnterprisesListingRoute({ search }: ListingRouteProps) {
  const resultQuery = usePublicEnterpriseSearch(search)
  const result = resultQuery.data

  return (
    <main className={PAGE_SHELL}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Link
              to="/intreprinderi-publice"
              search={{}}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Trans>Înapoi la introducere</Trans>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              <Trans>Lista întreprinderilor publice</Trans>
            </h1>
            <p className="text-sm text-muted-foreground">
              <Trans>
                Căutarea folosește fixture AMEPIP în mock mode. Filtrele pentru
                sancțiuni, ajutor de stat și autoritate rămân marcate ca gated
                până când lane-urile ajung în API.
              </Trans>
            </p>
          </div>
          <PublicEnterpriseSearchForm initialValue={search.q ?? ''} compact />
        </div>

        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <PublicEnterpriseFacetRail result={result} search={search} />
          <section className="space-y-4">
            <ListingHeader result={result} search={search} />
            {resultQuery.isLoading ? <ListingSkeleton /> : null}
            {resultQuery.isError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  <Trans>Nu am putut încărca lista</Trans>
                </AlertTitle>
                <AlertDescription>
                  <Trans>Filtrele pot fi păstrate în URL și reîncercate.</Trans>
                </AlertDescription>
              </Alert>
            ) : null}
            {result && result.hits.length === 0 ? (
              <EmptyState
                title={t`Nicio întreprindere nu se potrivește filtrelor.`}
                description={t`Elimină câteva filtre sau revino la lista completă.`}
                icon={<Filter className="h-5 w-5" />}
              />
            ) : null}
            {result && result.hits.length > 0 ? (
              <div className={cn(PANEL, 'divide-y divide-border/70')}>
                {result.hits.map((hit) => (
                  <EnterpriseResultRow key={hit.cui} hit={hit} />
                ))}
              </div>
            ) : null}
            {result ? <PaginationControls result={result} search={search} /> : null}
            {result ? <SourceFooter lineage={result.lineage} /> : null}
          </section>
        </div>
      </div>
    </main>
  )
}

export function PublicEnterpriseProfileRoute({
  profile: loaderProfile,
  cui,
  search,
}: ProfileRouteProps) {
  const profileQuery = usePublicEnterpriseProfile(cui)
  const profile = profileQuery.data ?? loaderProfile
  const navigate = useNavigate({ from: '/intreprinderi-publice/$cui' })
  const activeTab = search.tab ?? 'profil'
  const visibleTabs = getVisibleTabs(profile)
  const activeTabIsVisible = visibleTabs.includes(activeTab)
  const selectedTab = activeTabIsVisible ? activeTab : 'profil'

  useEffect(() => {
    if (activeTabIsVisible) {
      return
    }

    void navigate({
      to: '/intreprinderi-publice/$cui',
      params: { cui },
      search: (previous) => ({ ...previous, tab: 'profil' }),
      replace: true,
    })
  }, [activeTabIsVisible, cui, navigate])

  const setTab = (tab: PublicEnterpriseProfileTab) => {
    void navigate({
      to: '/intreprinderi-publice/$cui',
      params: { cui },
      search: (previous) => ({ ...previous, tab }),
    })
  }

  return (
    <main className={PAGE_SHELL}>
      <div className="space-y-5">
        <nav className="text-sm text-muted-foreground" aria-label={t`Breadcrumb`}>
          <Link to="/intreprinderi-publice" search={{}} className="hover:text-foreground">
            <Trans>Întreprinderi publice</Trans>
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">{profile.identity.legalName}</span>
        </nav>

        {profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              <Trans>Datele profilului nu s-au putut reîmprospăta</Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans>Se afișează datele încărcate inițial pentru acest CUI.</Trans>
            </AlertDescription>
          </Alert>
        ) : null}

        <EnterpriseHeader profile={profile} />
        <HeadlineKpiBand profile={profile} onOpenIndicators={() => setTab('indicatori')} />
        <PublicEnterpriseTabNav
          tabs={visibleTabs}
          activeTab={selectedTab}
          onTabChange={setTab}
          profile={profile}
        />

        <section className="space-y-4">
          {PUBLIC_ENTERPRISE_TAB_IDS.map((tabId) => {
            const selected = selectedTab === tabId
            if (!visibleTabs.includes(tabId)) {
              return null
            }
            return (
              <div
                key={tabId}
                id={`public-enterprise-tabpanel-${tabId}`}
                role="tabpanel"
                aria-labelledby={`public-enterprise-tab-${tabId}`}
                hidden={!selected}
                className={selected ? 'block' : 'hidden'}
              >
                <ProfileTabPanel
                  tab={tabId}
                  profile={profile}
                  search={search}
                  onTabChange={setTab}
                />
              </div>
            )
          })}
        </section>
        <SourceFooter lineage={profile.lineage} />
      </div>
    </main>
  )
}

export function PublicEnterprisePageSkeleton() {
  return (
    <main className={PAGE_SHELL}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </main>
  )
}

export function PublicEnterpriseNotFound() {
  return (
    <main className={PAGE_SHELL}>
      <EmptyState
        icon={<Building2 className="h-6 w-6" />}
        title={t`Întreprinderea nu a fost găsită`}
        description={t`Verifică CUI-ul sau revino la lista întreprinderilor publice.`}
      />
      <div className="mt-4">
        <Button asChild variant="outline">
          <Link to="/intreprinderi-publice" search={{}}>
            <Trans>Vezi lista</Trans>
          </Link>
        </Button>
      </div>
    </main>
  )
}

function PublicEnterpriseSearchForm({
  initialValue = '',
  compact = false,
}: {
  readonly initialValue?: string
  readonly compact?: boolean
}) {
  const [value, setValue] = useState(initialValue)
  const navigate = useNavigate()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      void navigate({ to: '/intreprinderi-publice', search: {} })
      return
    }
    const normalizedCui = normalizePublicEnterpriseCui(trimmed)
    if (normalizedCui && /^\d{1,13}$/.test(trimmed)) {
      void navigate({
        to: '/intreprinderi-publice/$cui',
        params: { cui: normalizedCui },
        search: { tab: 'profil' },
      })
      return
    }
    void navigate({
      to: '/intreprinderi-publice',
      search: { q: trimmed },
    })
  }

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <form
      onSubmit={submit}
      className={cn(
        'flex w-full flex-col gap-2 sm:flex-row',
        compact ? 'max-w-xl' : 'max-w-3xl',
      )}
    >
      <label className="sr-only" htmlFor="public-enterprise-search">
        {t`Caută întreprindere publică`}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="public-enterprise-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t`Caută după nume, CUI sau ticker`}
          className="pl-9"
        />
      </div>
      <Button type="submit">
        <Search className="mr-2 h-4 w-4" />
        <Trans>Caută</Trans>
      </Button>
    </form>
  )
}

function LandingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

function LandingStats({ summary }: { readonly summary: PublicEnterpriseLandingSummary }) {
  const primaryStatus = summary.byStatus[0]
  const stats = [
    {
      label: t`Întreprinderi în fixture`,
      value: formatPublicEnterpriseNumber(summary.totalEnterprises, 'ro'),
      note: t`modelate după AMEPIP`,
    },
    {
      label: t`Listate cu ticker`,
      value: summary.listedCount === null ? t`în curând` : formatPublicEnterpriseNumber(summary.listedCount, 'ro'),
      note: t`sursă AMEPIP, nu BVB live`,
    },
    {
      label: t`Status principal`,
      value: primaryStatus?.status ?? t`necunoscut`,
      note: primaryStatus ? `${primaryStatus.count} ${t`în exemplu`}` : t`fără distribuție`,
    },
    {
      label: t`Lane-uri suplimentare`,
      value: t`în curând`,
      note: t`autoritate, BVB, RegAS, sancțiuni`,
    },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className={cn(PANEL, 'p-4')}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {stat.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
        </div>
      ))}
    </section>
  )
}

function FeaturedEnterprises({
  summary,
}: {
  readonly summary: PublicEnterpriseLandingSummary
}) {
  const result = usePublicEnterpriseSearch({ pageSize: 6 })
  const hits = result.data?.hits ?? []

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            <Trans>Întreprinderi reprezentative</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>Exemple mock-first cu profil complet în această interfață.</Trans>
          </p>
        </div>
        <SourceLineageBadge lineage={summary.lineage} />
      </div>
      <div className={cn(PANEL, 'divide-y divide-border/70')}>
        {hits.map((hit) => (
          <EnterpriseResultRow key={hit.cui} hit={hit} compact />
        ))}
      </div>
    </section>
  )
}

function ListingHeader({
  result,
  search,
}: {
  readonly result?: PublicEnterpriseSearchResult
  readonly search: PublicEnterpriseSearch
}) {
  return (
    <div className={cn(PANEL, 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between')}>
      <div>
        <p className="text-sm font-medium">
          {result ? (
            <Trans>
              {formatPublicEnterpriseNumber(result.total, 'ro')} rezultate în
              fixture
            </Trans>
          ) : (
            <Trans>Se încarcă rezultatele</Trans>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          <Trans>Sortare:</Trans> {search.sort ?? 'legalName'} · <Trans>pagină</Trans>{' '}
          {search.page ?? 1}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/intreprinderi-publice" search={{}}>
          <Trans>Resetează filtrele</Trans>
        </Link>
      </Button>
    </div>
  )
}

function PublicEnterpriseFacetRail({
  result,
  search,
}: {
  readonly result?: PublicEnterpriseSearchResult
  readonly search: PublicEnterpriseSearch
}) {
  const content = (
    <div className="space-y-4">
      <FacetGroup
        title={t`Status`}
        buckets={result?.facets.status ?? []}
        field="status"
        search={search}
      />
      <FacetGroup
        title={t`CAEN`}
        buckets={result?.facets.caen ?? []}
        field="caen"
        search={search}
      />
      <FacetGroup
        title={t`Județ`}
        buckets={result?.facets.county ?? []}
        field="county"
        search={search}
      />
      <FacetGroup
        title={t`Subordonare`}
        buckets={result?.facets.subordination ?? []}
        field="subordination"
        search={search}
        gated
      />
      <FacetGroup title={t`Lane-uri viitoare`} buckets={[]} gated />
    </div>
  )

  return (
    <>
      <aside className={cn(PANEL, 'hidden h-fit p-4 lg:block')}>{content}</aside>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              <Trans>Filtre</Trans>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Trans>Filtre întreprinderi</Trans>
              </SheetTitle>
              <SheetDescription>
                <Trans>Unele filtre sunt gated până când lane-urile ajung live.</Trans>
              </SheetDescription>
            </SheetHeader>
            <div className="mt-5">{content}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

function FacetGroup({
  title,
  buckets,
  field,
  search,
  gated = false,
}: {
  readonly title: string
  readonly buckets: readonly { value: string; label: string | null; count: number }[]
  readonly field?: FacetField
  readonly search?: PublicEnterpriseSearch
  readonly gated?: boolean
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 text-sm font-medium">
        {title}
        {gated ? <DataStatusBadge status="gated" /> : null}
      </legend>
      {buckets.length > 0 ? (
        <div className="space-y-1">
          {buckets.slice(0, 6).map((bucket) => (
            field && search ? (
              <Link
                key={bucket.value}
                to="/intreprinderi-publice"
                search={toggleFacetSearch(search, field, bucket.value)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
                  isFacetSelected(search, field, bucket.value) &&
                    'bg-muted font-medium text-foreground',
                )}
              >
                <span>{bucket.label ?? bucket.value}</span>
                <span>{formatPublicEnterpriseNumber(bucket.count, 'ro')}</span>
              </Link>
            ) : (
              <div
                key={bucket.value}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>{bucket.label ?? bucket.value}</span>
                <span>{formatPublicEnterpriseNumber(bucket.count, 'ro')}</span>
              </div>
            )
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {gated ? t`Disponibil după deblocarea sursei.` : t`Fără valori.`}
        </p>
      )}
    </fieldset>
  )
}

type FacetField =
  | 'status'
  | 'caen'
  | 'county'
  | 'subordination'
  | 'aptType'
  | 'linkStatus'

function getFacetValues(
  search: PublicEnterpriseSearch,
  field: FacetField,
): readonly string[] {
  const value = search[field]
  return Array.isArray(value) ? value : []
}

function isFacetSelected(
  search: PublicEnterpriseSearch,
  field: FacetField,
  value: string,
): boolean {
  return getFacetValues(search, field).includes(value)
}

function toggleFacetSearch(
  search: PublicEnterpriseSearch,
  field: FacetField,
  value: string,
): PublicEnterpriseSearch {
  const values = getFacetValues(search, field)
  const nextValues = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]

  return {
    ...search,
    [field]: nextValues.length > 0 ? nextValues : undefined,
    page: 1,
  } as PublicEnterpriseSearch
}

function PaginationControls({
  result,
  search,
}: {
  readonly result: PublicEnterpriseSearchResult
  readonly search: PublicEnterpriseSearch
}) {
  const maxPage = Math.max(1, Math.ceil(result.total / result.pageSize))
  const canGoPrevious = result.page > 1
  const canGoNext = result.page < maxPage

  if (!canGoPrevious && !canGoNext) {
    return null
  }

  return (
    <nav
      className="flex items-center justify-between gap-3"
      aria-label={t`Paginare întreprinderi publice`}
    >
      <Button asChild variant="outline" size="sm" disabled={!canGoPrevious}>
        <Link
          to="/intreprinderi-publice"
          search={{ ...search, page: Math.max(1, result.page - 1) }}
        >
          <Trans>Pagina anterioară</Trans>
        </Link>
      </Button>
      <span className="text-xs text-muted-foreground">
        <Trans>Pagina</Trans> {result.page} / {maxPage}
      </span>
      <Button asChild variant="outline" size="sm" disabled={!canGoNext}>
        <Link
          to="/intreprinderi-publice"
          search={{ ...search, page: Math.min(maxPage, result.page + 1) }}
        >
          <Trans>Pagina următoare</Trans>
        </Link>
      </Button>
    </nav>
  )
}

function ListingSkeleton() {
  return (
    <div className={cn(PANEL, 'space-y-3 p-4')}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-16 rounded-lg" />
      ))}
    </div>
  )
}

function EnterpriseResultRow({
  hit,
  compact = false,
}: {
  readonly hit: PublicEnterpriseSearchHit
  readonly compact?: boolean
}) {
  return (
    <Link
      to="/intreprinderi-publice/$cui"
      params={{ cui: hit.cui }}
      search={{ tab: 'profil' }}
      preload="intent"
      className={cn(
        'block transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact ? 'p-3' : 'p-4',
      )}
      aria-label={`${hit.legalName}, CUI ${hit.cui}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {hit.legalName}
            </h3>
            {hit.status ? <AmepipStatusBadge label={hit.status} /> : null}
            {hit.ticker ? <TickerBadge ticker={hit.ticker} /> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            CUI {hit.cui}
            {hit.caen ? ` · CAEN ${hit.caen}` : ''}
            {hit.county ? ` · ${hit.county}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{getLinkStatusLabel(hit.linkStatus)}</Badge>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Link>
  )
}

function EnterpriseHeader({ profile }: { readonly profile: PublicEnterpriseProfile }) {
  return (
    <header className={cn(PANEL, 'p-5')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.identity.legalName}
            </h1>
            {profile.identity.status ? (
              <AmepipStatusBadge label={profile.identity.status.label} />
            ) : null}
            {profile.identity.ticker ? (
              <TickerBadge ticker={profile.identity.ticker} />
            ) : null}
          </div>
          <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <MetaItem term={t`CUI`} detail={profile.identity.cui} />
            <MetaItem term={t`Nr. înreg.`} detail={profile.identity.registration ?? t`necunoscut`} />
            <MetaItem term={t`CAEN`} detail={profile.identity.caen?.code ?? t`necunoscut`} />
            <MetaItem term={t`Legătură ONRC`} detail={profile.identity.onrcLinkStatus} />
          </dl>
          <p className="text-sm text-muted-foreground">
            <Trans>
              Identitatea AMEPIP este afișată ca evidență de sursă. Datele
              ONRC/ANAF rămân legături separate, nu o identitate fuzionată.
            </Trans>
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <LaneStatusPanel
            title={t`Autoritate tutelară`}
            sourceName="S1001 / json_apt"
            compact
          />
          <SourceLineageBadge lineage={profile.lineage} />
        </div>
      </div>
    </header>
  )
}

function MetaItem({ term, detail }: { readonly term: string; readonly detail: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{term}</dt>
      <dd className="font-medium text-foreground">{detail}</dd>
    </div>
  )
}

function HeadlineKpiBand({
  profile,
  onOpenIndicators,
}: {
  readonly profile: PublicEnterpriseProfile
  readonly onOpenIndicators: () => void
}) {
  const cards = getHeadlineRows(profile.indicators.rows)

  if (cards.length === 0) {
    return (
      <div className={cn(PANEL, 'p-4')}>
        <p className="text-sm text-muted-foreground">
          <Trans>Nu există indicatori headline pentru acest profil.</Trans>
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            <Trans>Performanță pe scurt</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>Rate/KPI AMEPIP, afișate fără transformare în valori contabile.</Trans>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onOpenIndicators}>
          <LineChartIcon className="mr-2 h-4 w-4" />
          <Trans>Toți indicatorii</Trans>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((row) => (
          <div key={`${row.indicator}-${row.year}`} className={cn(PANEL, 'p-4')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{row.kpiCode ?? row.indicator}</p>
                <p className="mt-2 text-xl font-semibold">
                  <KpiValueKindRenderer row={row} />
                </p>
              </div>
              <Badge variant="outline">
                <Trans>KPI</Trans>
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {row.indicator}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function getHeadlineRows(rows: readonly IndicatorValueRow[]) {
  return HEADLINE_KPI_CODES.map((code) =>
    rows.find((row) => row.valueKind === 'number' && row.kpiCode === code),
  )
    .filter((row): row is IndicatorNumberRow => row !== undefined)
    .slice(0, 4)
}

function PublicEnterpriseTabNav({
  tabs,
  activeTab,
  onTabChange,
  profile,
}: {
  readonly tabs: readonly PublicEnterpriseProfileTab[]
  readonly activeTab: PublicEnterpriseProfileTab
  readonly onTabChange: (tab: PublicEnterpriseProfileTab) => void
  readonly profile: PublicEnterpriseProfile
}) {
  const moveToTab = (currentTab: PublicEnterpriseProfileTab, direction: 1 | -1) => {
    const currentIndex = tabs.indexOf(currentTab)
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length
    onTabChange(tabs[nextIndex])
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tab: PublicEnterpriseProfileTab,
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveToTab(tab, 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveToTab(tab, -1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      onTabChange(tabs[0])
    } else if (event.key === 'End') {
      event.preventDefault()
      onTabChange(tabs[tabs.length - 1])
    }
  }

  return (
    <nav
      className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      role="tablist"
      aria-label={t`Secțiuni întreprindere publică`}
    >
      <div className="flex min-w-max gap-1 py-2">
        {tabs.map((tab) => {
          const config = getPublicEnterpriseTabConfig(tab)
          const selected = activeTab === tab
          return (
            <button
              key={tab}
              id={`public-enterprise-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`public-enterprise-tabpanel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab)}
              onKeyDown={(event) => handleKeyDown(event, tab)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{config.label}</span>
              {config.gated ? <DataStatusBadge status={getTabStatus(tab, profile)} /> : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function getVisibleTabs(profile: PublicEnterpriseProfile): readonly PublicEnterpriseProfileTab[] {
  return getPublicEnterpriseTabs()
    .filter((tab) => tab.id !== 'bursa' || profile.identity.ticker !== null)
    .map((tab) => tab.id)
}

function getTabStatus(
  tab: PublicEnterpriseProfileTab,
  profile: PublicEnterpriseProfile,
): DataStatus {
  switch (tab) {
    case 'bursa':
      return profile.identity.ticker ? 'gated' : 'empty'
    case 'autoritate':
    case 'guvernanta':
    case 'sanctiuni':
    case 'ajutor-de-stat':
      return 'gated'
    case 'profil':
    case 'indicatori':
    case 'relatii':
      return profile.dataStatus
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}

function ProfileTabPanel({
  tab,
  profile,
  search,
  onTabChange,
}: {
  readonly tab: PublicEnterpriseProfileTab
  readonly profile: PublicEnterpriseProfile
  readonly search: PublicEnterpriseProfileSearch
  readonly onTabChange: (tab: PublicEnterpriseProfileTab) => void
}) {
  switch (tab) {
    case 'profil':
      return <ProfileSummaryTab profile={profile} onTabChange={onTabChange} />
    case 'indicatori':
      return <IndicatorTab profile={profile} search={search} />
    case 'autoritate':
      return <LaneStatusPanel title={t`Autoritate tutelară`} sourceName="S1001 / json_apt" />
    case 'guvernanta':
      return <LaneStatusPanel title={t`Documente de guvernanță`} sourceName="json_apt / media_apt" />
    case 'sanctiuni':
      return <LaneStatusPanel title={t`Sancțiuni AMEPIP`} sourceName="AMEPIP OUG 109" privacy />
    case 'bursa':
      return <LaneStatusPanel title={t`BVB și rapoarte de piață`} sourceName="m.bvb.ro" />
    case 'ajutor-de-stat':
      return <LaneStatusPanel title={t`Ajutor de stat RegAS`} sourceName="RegAS" />
    case 'relatii':
      return <RelatedLinksRail profile={profile} />
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}

function ProfileSummaryTab({
  profile,
  onTabChange,
}: {
  readonly profile: PublicEnterpriseProfile
  readonly onTabChange: (tab: PublicEnterpriseProfileTab) => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className={cn(PANEL, 'p-4')}>
        <h2 className="text-base font-semibold">
          <Trans>Profil AMEPIP</Trans>
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <Trans>
            Acest profil afișează datele AMEPIP ca evidență de sursă. Pentru
            bilanțuri absolute și statut ONRC/ANAF, folosește legătura separată
            către profilul companiei.
          </Trans>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetaItem term={t`Localitate`} detail={profile.identity.locality ?? t`necunoscut`} />
          <MetaItem term={t`Județ`} detail={profile.identity.county ?? t`necunoscut`} />
          <MetaItem term={t`Ticker`} detail={profile.identity.ticker ?? t`nelistată`} />
          <MetaItem term={t`Status legătură`} detail={profile.identity.onrcLinkStatus} />
        </div>
        <Button type="button" className="mt-4" variant="outline" onClick={() => onTabChange('indicatori')}>
          <LineChartIcon className="mr-2 h-4 w-4" />
          <Trans>Vezi indicatorii</Trans>
        </Button>
      </section>
      <RelatedLinksRail profile={profile} compact />
    </div>
  )
}

function IndicatorTab({
  profile,
  search,
}: {
  readonly profile: PublicEnterpriseProfile
  readonly search: PublicEnterpriseProfileSearch
}) {
  const defaultCodes = HEADLINE_KPI_CODES
  const selectedCodes = search.kpis && search.kpis.length > 0 ? search.kpis : defaultCodes
  const navigate = useNavigate({ from: '/intreprinderi-publice/$cui' })
  const sheet = search.sheet ?? 'all'
  const view = search.view ?? 'both'
  const filteredRows = filterIndicatorRows(profile.indicators.rows, search)
  const selectedRows = filteredRows.filter((row) =>
    row.kpiCode ? selectedCodes.includes(row.kpiCode) : selectedCodes.includes(row.indicator),
  )
  const numericGroups = groupNumericRowsByUnit(selectedRows)
  const availableYears = profile.indicators.years

  const updateSearch = (next: Partial<PublicEnterpriseProfileSearch>) => {
    void navigate({
      to: '/intreprinderi-publice/$cui',
      params: { cui: profile.identity.cui },
      search: (previous) => ({ ...previous, tab: 'indicatori', ...next }),
    })
  }

  const toggleKpi = (code: string) => {
    const current =
      search.kpis && search.kpis.length > 0 ? search.kpis : [...defaultCodes]
    const next = current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code]
    updateSearch({ kpis: next.length > 0 ? next : undefined })
  }

  const toggleYear = (year: string) => {
    const numericYear = Number(year)
    const currentYears = Array.isArray(search.years) ? search.years : []
    const next = currentYears.includes(numericYear)
      ? currentYears.filter((item) => item !== numericYear)
      : [...currentYears, numericYear].sort((a, b) => a - b)
    updateSearch({ years: next.length > 0 ? next : undefined })
  }

  return (
    <div className="space-y-4">
      <div className={cn(PANEL, 'p-4')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              <Trans>Indicatori AMEPIP pe ani</Trans>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <Trans>
                Graficul include doar valori numerice. Valorile text, boolean și
                empty rămân în tabel; anii lipsă sunt goluri, nu zero.
              </Trans>
            </p>
          </div>
          <SourceLineageBadge lineage={profile.indicators.lineage} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.indicators.dictionary.slice(0, 6).map((entry) => (
            <button
              key={entry.indicator}
              type="button"
              onClick={() => toggleKpi(entry.kpiCode ?? entry.indicator)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedCodes.includes(entry.kpiCode ?? entry.indicator)
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {entry.kpiCode ?? entry.indicator}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <div className="flex flex-wrap gap-2" aria-label={t`Filtru ani`}>
            <Button
              type="button"
              variant={!search.years ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSearch({ years: undefined })}
            >
              <Trans>Toți anii</Trans>
            </Button>
            {availableYears.map((year) => (
              <Button
                key={year}
                type="button"
                variant={isYearSelected(search.years, year) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>
              <Trans>Foaie sursă</Trans>
            </span>
            <select
              value={sheet}
              onChange={(event) =>
                updateSearch({
                  sheet: event.target.value as PublicEnterpriseProfileSearch['sheet'],
                })
              }
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              <option value="all">{t`Toate`}</option>
              <option value="calculated">{t`Calculate`}</option>
              <option value="form">{t`Formular`}</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>
              <Trans>Vizualizare</Trans>
            </span>
            <select
              value={view}
              onChange={(event) =>
                updateSearch({
                  view: event.target.value as PublicEnterpriseProfileSearch['view'],
                })
              }
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              <option value="both">{t`Grafic și tabel`}</option>
              <option value="chart">{t`Doar grafic`}</option>
              <option value="table">{t`Doar tabel`}</option>
            </select>
          </label>
      </div>
      </div>

      {view !== 'table' && numericGroups.length > 0 ? (
        <div className="grid gap-4">
          {numericGroups.map((group) => (
            <div key={group.measureUnit ?? 'unitless'} className={cn(PANEL, 'p-4')}>
              <h3 className="text-sm font-semibold">
                <Trans>Grafic numeric</Trans>{' '}
                <span className="text-muted-foreground">
                  ({group.measureUnit ?? t`fără unitate`})
                </span>
              </h3>
              <div className="mt-3 h-72">
                <IndicatorChart rows={group.rows} />
              </div>
            </div>
          ))}
        </div>
      ) : view !== 'table' ? (
        <EmptyState
          title={t`Nu există serii numerice selectate`}
          description={t`Indicatorii ne-numerici rămân disponibili în tabel.`}
        />
      ) : null}

      {view !== 'chart' ? <IndicatorMatrixTable rows={selectedRows} /> : null}
      <IndicatorDefinitionList rows={selectedRows} />
    </div>
  )
}

function filterIndicatorRows(
  rows: readonly IndicatorValueRow[],
  search: PublicEnterpriseProfileSearch,
): readonly IndicatorValueRow[] {
  return rows.filter((row) => {
    const sheet = search.sheet ?? 'all'
    if (sheet !== 'all' && row.sourceSheet !== sheet) {
      return false
    }
    return isYearSelected(search.years, row.year)
  })
}

function isYearSelected(
  years: PublicEnterpriseProfileSearch['years'],
  year: string,
): boolean {
  if (!years) {
    return true
  }
  const numericYear = Number(year)
  if (!Number.isFinite(numericYear)) {
    return false
  }
  if (Array.isArray(years)) {
    return years.includes(numericYear)
  }
  const from = years.from ?? Number.NEGATIVE_INFINITY
  const to = years.to ?? Number.POSITIVE_INFINITY
  return numericYear >= from && numericYear <= to
}

function IndicatorChart({ rows }: { readonly rows: readonly IndicatorValueRow[] }) {
  const numericRows = rows.filter(
    (row): row is IndicatorNumberRow => row.valueKind === 'number',
  )
  const years = Array.from(new Set(numericRows.map((row) => row.year))).sort()
  const series = Array.from(new Set(numericRows.map((row) => row.kpiCode ?? row.indicator)))
  const yAxisWidth = numericRows.some((row) => Math.abs(row.numericValue) >= 10_000)
    ? 76
    : 48
  const data = years.map((year) => {
    const point: Record<string, number | string | null> = { year }
    for (const key of series) {
      const row = numericRows.find(
        (candidate) =>
          candidate.year === year &&
          (candidate.kpiCode ?? candidate.indicator) === key,
      )
      point[key] = row?.numericValue ?? null
    }
    return point
  })

  return (
    <SafeResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 8, right: 12, top: 12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis width={yAxisWidth} tickFormatter={formatAxisTick} />
        <RechartsTooltip />
        {series.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            connectNulls={false}
            dot={{ r: 3 }}
            stroke={index % 2 === 0 ? '#2563eb' : '#059669'}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </SafeResponsiveContainer>
  )
}

function formatAxisTick(value: number | string): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return String(value)
  }
  return new Intl.NumberFormat('ro-RO', {
    notation: Math.abs(numeric) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(numeric) < 1 ? 3 : 0,
  }).format(numeric)
}

function IndicatorMatrixTable({
  rows,
}: {
  readonly rows: readonly IndicatorValueRow[]
}) {
  const years = Array.from(new Set(rows.map((row) => row.year))).sort().reverse()
  const indicators = Array.from(new Set(rows.map((row) => row.indicator)))

  return (
    <div className={cn(PANEL, 'p-4')}>
      <h3 className="text-sm font-semibold">
        <Trans>Tabel indicatori</Trans>
      </h3>
      <Table containerClassName="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <Trans>An</Trans>
            </TableHead>
            {indicators.map((indicator) => (
              <TableHead key={indicator} scope="col">
                {indicator}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {years.map((year) => (
            <TableRow key={year}>
              <TableCell className="font-medium">{year}</TableCell>
              {indicators.map((indicator) => {
                const row = rows.find(
                  (candidate) =>
                    candidate.year === year && candidate.indicator === indicator,
                )
                return (
                  <TableCell key={indicator}>
                    {row ? (
                      <KpiValueKindRenderer row={row} />
                    ) : (
                      <span className="text-muted-foreground" aria-label={t`fără date`}>
                        —
                      </span>
                    )}
                    {row?.warnings.length ? (
                      <span className="ml-2 text-xs text-amber-700">
                        <AlertTriangle className="inline h-3 w-3" aria-hidden="true" />{' '}
                        {row.warnings.length}
                      </span>
                    ) : null}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function IndicatorDefinitionList({
  rows,
}: {
  readonly rows: readonly IndicatorValueRow[]
}) {
  const definitions = Array.from(new Map(rows.map((row) => [row.indicator, row])).values())
  return (
    <div className={cn(PANEL, 'p-4')}>
      <h3 className="text-sm font-semibold">
        <Trans>Ce înseamnă indicatorii?</Trans>
      </h3>
      <dl className="mt-3 space-y-3 text-sm">
        {definitions.map((row) => (
          <div key={row.indicator}>
            <dt className="font-medium text-foreground">{row.indicator}</dt>
            <dd className="text-muted-foreground">
              {row.kpiCode ? `${row.kpiCode} · ` : ''}
              {row.measureUnit ? `${row.measureUnit} · ` : ''}
              <Trans>indicator/KPI AMEPIP, nu valoare contabilă absolută</Trans>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function KpiValueKindRenderer({ row }: { readonly row: IndicatorValueRow }) {
  const formatted = formatKpiValue(row, 'ro')
  const kindLabel = getValueKindLabel(row.valueKind)
  if (row.valueKind === 'empty') {
    return (
      <span className="text-muted-foreground" aria-label={t`fără valoare`}>
        {formatted.display}
      </span>
    )
  }
  return (
    <span>
      {formatted.display}
      <span className="ml-1 text-xs text-muted-foreground">({kindLabel})</span>
    </span>
  )
}

function RelatedLinksRail({
  profile,
  compact = false,
}: {
  readonly profile: PublicEnterpriseProfile
  readonly compact?: boolean
}) {
  return (
    <aside className={cn(PANEL, compact ? 'p-4' : 'p-5')}>
      <h2 className="text-sm font-semibold">
        <Trans>Relații și verificări</Trans>
      </h2>
      <div className="mt-3 space-y-2">
        <Button asChild variant="outline" size="sm" className="w-full justify-start">
          <Link
            to="/companies/$cui"
            params={{ cui: profile.identity.cui }}
            search={{}}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <Trans>Profil ONRC/ANAF</Trans>
          </Link>
        </Button>
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <Trans>
            Autoritatea tutelară, achizițiile și ajutorul de stat se vor activa
            după promovarea lane-urilor în API.
          </Trans>
        </div>
      </div>
    </aside>
  )
}

function LaneStatusPanel({
  title,
  sourceName,
  compact = false,
  privacy = false,
}: {
  readonly title: string
  readonly sourceName: string
  readonly compact?: boolean
  readonly privacy?: boolean
}) {
  return (
    <div className={cn(PANEL, compact ? 'p-3' : 'p-5')}>
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 text-sky-700" aria-hidden="true" />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            <DataStatusBadge status="gated" />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            <Trans>
              Această secțiune va folosi sursa {sourceName}, dar nu este încă
              live în API. Nu afișăm date simulate ca rezultate reale.
            </Trans>
          </p>
          {privacy ? (
            <p className="text-xs text-muted-foreground">
              <Trans>
                Câmpul persoană responsabilă rămâne raw-only și nu este expus în
                UI.
              </Trans>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CoverageRibbon({
  lineage,
  dataStatus,
}: {
  readonly lineage?: SourceLineage
  readonly dataStatus: DataStatus
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <DataStatusBadge status={dataStatus} />
        <span className="font-medium">
          <Trans>Sursă: AMEPIP (OUG 109/2011)</Trans>
        </span>
        {lineage?.workbookDate ? (
          <span className="text-muted-foreground">
            <Trans>actualizat la</Trans> {formatDate(lineage.workbookDate)}
          </span>
        ) : null}
      </div>
      {lineage ? <SourceLineageBadge lineage={lineage} compact /> : null}
    </div>
  )
}

function SourceLineageBadge({
  lineage,
  compact = false,
}: {
  readonly lineage: SourceLineage
  readonly compact?: boolean
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'w-fit' : '',
          )}
          aria-label={t`Vezi proveniența datelor`}
        >
          <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {lineage.mode === 'live' ? t`Sursă` : t`Exemplu`}:{' '}
            {lineage.sourceName}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <Trans>Proveniență date</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>Lanțul sursei pentru această informație.</Trans>
          </SheetDescription>
        </SheetHeader>
        <dl className="mt-5 space-y-4 text-sm">
          <ProvenanceItem term={t`Sursă`} detail={lineage.sourceLabel} />
          <ProvenanceItem term={t`Mod`} detail={lineage.mode} />
          <ProvenanceItem term={t`Snapshot`} detail={lineage.snapshotId ?? t`indisponibil`} />
          <ProvenanceItem term={t`SHA-256 workbook`} detail={lineage.workbookSha256 ?? t`indisponibil`} />
          <ProvenanceItem term={t`Data workbook`} detail={formatDate(lineage.workbookDate)} />
          <ProvenanceItem term={t`Acceptat la`} detail={formatDate(lineage.acceptedAt)} />
          <ProvenanceItem term={t`Licență`} detail={lineage.license ?? t`necunoscută`} />
        </dl>
        {lineage.sourceUrl ? (
          <Button asChild className="mt-5 w-full">
            <a href={lineage.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              <Trans>Deschide sursa oficială</Trans>
            </a>
          </Button>
        ) : null}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          <Trans>
            În mock mode, aceste fixture sunt doar exemple modelate după
            contractul AMEPIP; nu sunt prezentate ca răspuns live.
          </Trans>
        </p>
      </SheetContent>
    </Sheet>
  )
}

function ProvenanceItem({
  term,
  detail,
}: {
  readonly term: string
  readonly detail: string
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {term}
      </dt>
      <dd className="mt-1 break-words text-foreground">{detail}</dd>
    </div>
  )
}

function SourceFooter({ lineage }: { readonly lineage: SourceLineage }) {
  return (
    <footer className="border-t pt-4 text-xs leading-5 text-muted-foreground">
      <p>
        <Trans>Sursă afișată:</Trans> {lineage.sourceName} ·{' '}
        {lineage.snapshotId ?? t`snapshot indisponibil`} ·{' '}
        {lineage.license ?? t`licență necunoscută`}
      </p>
      <p>
        <Trans>
          Indicatorii AMEPIP sunt afișați fără scalare în client și nu
          înlocuiesc bilanțurile ONRC/ANAF.
        </Trans>
      </p>
    </footer>
  )
}

function getValueKindLabel(valueKind: IndicatorValueRow['valueKind']): string {
  const labels: Record<IndicatorValueRow['valueKind'], string> = {
    number: t`număr`,
    boolean: t`boolean`,
    text: t`text`,
    empty: t`gol`,
  }
  return labels[valueKind]
}

function getLinkStatusLabel(status: PublicEnterpriseSearchHit['linkStatus']): string {
  const labels: Record<PublicEnterpriseSearchHit['linkStatus'], string> = {
    linked: t`legat`,
    partial: t`parțial`,
    unlinked: t`nelegat`,
    unknown: t`necunoscut`,
  }
  return labels[status]
}

function DataStatusBadge({ status }: { readonly status: DataStatus }) {
  const labels: Record<DataStatus, string> = {
    live: t`live`,
    partial: t`parțial`,
    gated: t`în curând`,
    mock: t`mock`,
    stale: t`vechi`,
    empty: t`gol`,
    sample: t`exemplu`,
  }
  const variant =
    status === 'gated' || status === 'stale'
      ? 'warning'
      : status === 'live'
        ? 'success'
        : status === 'sample' || status === 'mock'
          ? 'outline'
          : 'secondary'

  return (
    <Badge variant={variant} aria-label={`${t`Stare date`}: ${labels[status]}`}>
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {labels[status]}
    </Badge>
  )
}

function AmepipStatusBadge({ label }: { readonly label: string }) {
  return (
    <Badge variant="secondary">
      <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  )
}

function TickerBadge({ ticker }: { readonly ticker: string }) {
  return (
    <Badge variant="outline" aria-label={`${t`Ticker BVB din AMEPIP`}: ${ticker}`}>
      {ticker}
    </Badge>
  )
}

function formatDate(value?: string | null): string {
  if (!value) {
    return t`indisponibil`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
