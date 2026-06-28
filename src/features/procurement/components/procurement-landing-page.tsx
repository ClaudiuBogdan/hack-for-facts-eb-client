import { Link, useNavigate } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Boxes,
  Building2,
  CircleHelp,
  Landmark,
  Search,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CoverageRibbonFromGate,
  DataStatusBadge,
  FreshnessBadge,
  MockDataStatusBadge,
} from '@/components/shared/procurement-data'
import { useEntitySearch } from '@/features/entity-search/hooks/use-entity-search'
import { MetricCard, MetricCardSkeleton } from './metric-card'
import { PartyRankingChart } from './party-ranking-chart'
import { CategoryBreakdown } from './category-breakdown'
import { SpendOverTime } from './spend-over-time'
import { ValueWithCurrency } from './value-with-currency'
import { formatFlowCount, ronAmountSlice } from '../lib/formatting'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import type { EntitySearchHit } from '@/schemas/entity-search'
import type { ProcurementLanding } from '@/schemas/procurement'

const PROCUREMENT_SEARCH_DOC_TYPES = [
  'organization',
  'company',
  'procurement_contract',
  'procurement_procedure',
] as const

export function ProcurementLandingPage() {
  const { data, isLoading, error } = useProcurementLanding()

  if (isLoading) {
    return <ProcurementLandingSkeleton />
  }

  if (error || !data) {
    return <ProcurementLandingError />
  }

  return <ProcurementLandingContent data={data} />
}

function ProcurementLandingContent({
  data,
}: {
  readonly data: ProcurementLanding
}) {
  const topCategoryCode = data.topCategories.find(
    (category) => category.cpvDivisionCode,
  )?.cpvDivisionCode ?? '45'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MockDataStatusBadge />
          <FreshnessBadge
            kind="pana_la"
            date={data.gate.dataAsOf}
            cadence={data.gate.cadence}
            stale={data.gate.cadence?.includes('suspendat') === true}
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <Trans>Achiziții publice</Trans>
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <Trans>
              Urmărim banii din achiziții publice până la compania care îi
              primește: cine cumpără, de la cine, ce categorie CPV și cu ce
              acoperire.
            </Trans>
          </p>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        aria-label={t`Indicatori principali`}
      >
        <MetricCard
          label={t`Achiziții directe`}
          value={formatFlowCount(data.headline.directAcquisitionsCount)}
          hint={t`număr de înregistrări canonice`}
          status="mock"
        />
        <MetricCard
          label={t`Contracte`}
          value={formatFlowCount(data.headline.contractsCount)}
          hint={t`contracte și atribuiri servite`}
          status="mock"
        />
        <MetricCard
          label={t`Instituții`}
          value={formatFlowCount(data.headline.buyersCount)}
          hint={t`autorități cumpărătoare`}
          status="mock"
        />
        <MetricCard
          label={t`Firme`}
          value={formatFlowCount(data.headline.suppliersCount)}
          hint={t`furnizori identificați`}
          status="mock"
        />
      </section>

      <section className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Trans>Valoare totală afișată cu prudență</Trans>
            </p>
            <p className="text-sm text-muted-foreground">
              <Trans>
                Sumă RON parțială; valorile din achiziții pot avea outlieri și
                nu reprezintă plăți efective.
              </Trans>
            </p>
          </div>
          <div className="text-lg font-semibold tabular-nums">
            <ValueWithCurrency
              value={ronAmountSlice(data.headline.totalValueRon)}
              notation="compact"
            />
          </div>
        </div>
      </section>

      <ProcurementSearchDock />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              <Trans>Traseul banilor</Trans>
            </h2>
            <p className="text-sm text-muted-foreground">
              <Trans>
                Clasamente pe număr de fluxuri, pentru a evita concluziile
                distorsionate de valori nesigure.
              </Trans>
            </p>
          </div>
          <DataStatusBadge
            status="partial"
            tooltip={t`Clasament pe număr; valoarea este afișată doar ca metadată.`}
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">
              <Trans>Instituții care cumpără cel mai des</Trans>
            </h3>
            <PartyRankingChart
              rows={data.topAuthorities}
              partyKind="authority"
              metric="count"
            />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">
              <Trans>Firme care apar cel mai des ca furnizori</Trans>
            </h3>
            <PartyRankingChart
              rows={data.topSuppliers}
              partyKind="supplier"
              metric="count"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="text-base font-semibold">
            <Trans>Categorii CPV principale</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>Ce se cumpără, grupat pe diviziuni CPV.</Trans>
          </p>
        </div>
        <CategoryBreakdown rows={data.topCategories} />
      </section>

      {data.spendOverTime.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-base font-semibold">
              <Trans>Volum lunar</Trans>
            </h2>
            <p className="text-sm text-muted-foreground">
              <Trans>
                Trend după număr de fluxuri; sumele lunare rămân secundare.
              </Trans>
            </p>
          </div>
          <SpendOverTime points={data.spendOverTime} metric="count" />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          <Trans>Intrări rapide</Trans>
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EntryCard
            icon={Building2}
            title={t`Instituții`}
            description={t`Pornește de la profilurile autorităților publice.`}
            to="/entity-analytics"
          />
          <EntryCard
            icon={Landmark}
            title={t`Firme`}
            description={t`Caută firme și verifică relația lor cu sectorul public.`}
            to="/companies/"
          />
          <EntryCard
            icon={Boxes}
            title={t`Categorii`}
            description={t`Răsfoiește cumpărăturile pe diviziuni CPV.`}
            to="/procurement/categories/$code"
            params={{ code: topCategoryCode }}
          />
          <EntryCard
            icon={Search}
            title={t`Căutare`}
            description={t`Mergi la lista filtrabilă de proceduri, contracte și achiziții directe.`}
            to="/procurement/search"
          />
        </div>
      </section>

      <ProcurementInfoAccordion data={data} />
    </div>
  )
}

function ProcurementSearchDock() {
  const [query, setQuery] = useState('')
  const trimmedQuery = query.trim()
  const navigate = useNavigate({ from: '/procurement/' })
  const search = useEntitySearch({
    q: trimmedQuery,
    docTypes: PROCUREMENT_SEARCH_DOC_TYPES,
    limit: 5,
  })
  const hits = useMemo(
    () => (search.data?.hits ?? []).slice(0, 5),
    [search.data?.hits],
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void navigate({
      to: '/procurement/search',
      search: { q: trimmedQuery || undefined },
    })
  }

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-card p-4"
      aria-label={t`Căutare în achiziții`}
    >
      <div>
        <h2 className="text-base font-semibold">
          <Trans>Caută o instituție, o firmă sau un contract</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Rezultatele sunt limitate la instituții, firme și documente de
            achiziții publice.
          </Trans>
        </p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
        <label htmlFor="procurement-landing-search" className="sr-only">
          <Trans>Caută în achiziții publice</Trans>
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="procurement-landing-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t`Caută o instituție, o firmă sau un contract`}
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" className="gap-2">
          <Search className="h-4 w-4" aria-hidden />
          <Trans>Caută</Trans>
        </Button>
      </form>
      {trimmedQuery.length > 0 ? (
        <SearchPreview
          hits={hits}
          isFetching={search.isFetching}
          isError={search.isError}
        />
      ) : null}
    </section>
  )
}

function SearchPreview({
  hits,
  isFetching,
  isError,
}: {
  readonly hits: readonly EntitySearchHit[]
  readonly isFetching: boolean
  readonly isError: boolean
}) {
  if (isFetching && hits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>Se caută…</Trans>
      </p>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>Căutarea rapidă nu este disponibilă acum.</Trans>
      </p>
    )
  }

  if (hits.length === 0) {
    return null
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {hits.map((hit) => (
        <li key={hit.id}>
          <SearchPreviewLink hit={hit} />
        </li>
      ))}
    </ul>
  )
}

function SearchPreviewLink({ hit }: { readonly hit: EntitySearchHit }) {
  const content = (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium">{hit.title}</span>
      <span className="truncate text-xs text-muted-foreground">
        {hit.subtitle ?? hit.docType}
      </span>
    </span>
  )

  if (hit.isExternal) {
    return (
      <a
        href={hit.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40"
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      to={hit.href as '/'}
      className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40"
    >
      {content}
    </Link>
  )
}

function EntryCard({
  icon: Icon,
  title,
  description,
  to,
  params,
}: {
  readonly icon: typeof Building2
  readonly title: string
  readonly description: string
  readonly to: string
  readonly params?: Record<string, string>
}) {
  return (
    <Link
      to={to as '/'}
      params={params as never}
      className="flex min-h-32 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Link>
  )
}

function ProcurementInfoAccordion({
  data,
}: {
  readonly data: ProcurementLanding
}) {
  return (
    <Accordion type="multiple" className="rounded-lg border border-border">
      <AccordionItem value="coverage" className="px-4">
        <AccordionTrigger className="text-sm">
          <span className="inline-flex items-center gap-2">
            <CircleHelp className="h-4 w-4" aria-hidden />
            <Trans>Despre acoperire</Trans>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <p className="text-sm text-muted-foreground">
            <Trans>
              Folosim numărul de fluxuri ca metrică principală deoarece
              identitatea instituțiilor și firmelor are acoperire mai bună decât
              valoarea. Sumele RON sunt afișate cu prudență și nu sunt plăți.
            </Trans>
          </p>
          <CoverageRibbonFromGate
            gate={data.gate}
            status="mock"
            collapsible={false}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="terms" className="border-b-0 px-4">
        <AccordionTrigger className="text-sm">
          <span className="inline-flex items-center gap-2">
            <CircleHelp className="h-4 w-4" aria-hidden />
            <Trans>Ce înseamnă termenii?</Trans>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <dl className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <Term
              term={t`Achiziție directă`}
              definition={t`Achiziție sub prag, fără procedură competitivă.`}
            />
            <Term
              term={t`Procedură`}
              definition={t`Anunț de licitație sau negociere.`}
            />
            <Term
              term={t`Contract`}
              definition={t`Contract atribuit în urma unei proceduri.`}
            />
            <Term
              term={t`CPV`}
              definition={t`Vocabularul comun privind achizițiile — cod de categorie.`}
            />
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function Term({
  term,
  definition,
}: {
  readonly term: string
  readonly definition: string
}) {
  return (
    <div>
      <dt className="font-medium text-foreground">{term}</dt>
      <dd>{definition}</dd>
    </div>
  )
}

function ProcurementLandingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-primary/10" aria-hidden />
        <div className="h-4 w-2/3 animate-pulse rounded bg-primary/10" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="h-24 w-full animate-pulse rounded-lg bg-primary/10" aria-hidden />
      <span className="sr-only">
        <Trans>Se încarcă achizițiile publice…</Trans>
      </span>
    </div>
  )
}

function ProcurementLandingError() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-sm text-rose-800">
        <TriangleAlert className="h-4 w-4" aria-hidden />
        <Trans>Nu am putut încărca pagina de achiziții.</Trans>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/procurement">
          <Trans>Reîncearcă</Trans>
        </Link>
      </Button>
    </div>
  )
}
