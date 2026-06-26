import { Link } from '@tanstack/react-router'
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
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  CoverageRibbonFromGate,
  DataStatusBadge,
  MockDataStatusBadge,
} from '@/components/shared/procurement-data'
import { MetricCard, MetricCardSkeleton } from './metric-card'
import { PartyRankingChart } from './party-ranking-chart'
import { CategoryBreakdown } from './category-breakdown'
import { ValueWithCurrency } from './value-with-currency'
import { formatFlowCount } from '../lib/formatting'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import type { ProcurementLanding } from '@/schemas/procurement'

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

function ProcurementLandingContent({ data }: { readonly data: ProcurementLanding }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MockDataStatusBadge />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          <Trans>Urmărim banii din achiziții publice</Trans>
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          <Trans>
            Cine cumpără, ce cumpără (CPV), de la cine și pentru cât — cu
            acoperire și prospețime dezvăluite lângă fiecare număr și tipare
            afișate ca semnale de verificare, nu concluzii.
          </Trans>
        </p>
      </section>

      <CoverageRibbonFromGate gate={data.gate} status="mock" />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label={t`Volum total`}
          value={<ValueWithCurrency value={data.headline.totalVolume} notation="compact" />}
          hint={t`RON; înregistrările non-RON sunt afișate separat`}
          status="mock"
        />
        <MetricCard
          label={t`Cumpărători`}
          value={formatFlowCount(data.headline.buyersCount)}
          status="mock"
        />
        <MetricCard
          label={t`Furnizori`}
          value={formatFlowCount(data.headline.suppliersCount)}
          status="mock"
        />
        <MetricCard
          label={t`Înregistrări`}
          value={formatFlowCount(data.headline.recordsCount)}
          status="mock"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EntryCard
          icon={Building2}
          title={t`Explorează o instituție`}
          description={t`Vezi ce cumpără o autoritate și de la cine.`}
          to="/achizitii/cautare"
          search={{ grain: 'contracts' }}
        />
        <EntryCard
          icon={Landmark}
          title={t`Explorează un furnizor`}
          description={t`Vezi cine primește bani publici.`}
          to="/achizitii/cautare"
          search={{ grain: 'contracts' }}
        />
        <EntryCard
          icon={Boxes}
          title={t`Categorii de achiziții (CPV)`}
          description={t`Răsfoiește pe categorii CPV.`}
          to="/achizitii/cpv/$code"
          params={{ code: '45' }}
        />
        <EntryCard
          icon={Search}
          title={t`Caută în achiziții`}
          description={t`Caută proceduri, contracte, achiziții directe.`}
          to="/achizitii/cautare"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              <Trans>Autorități principale</Trans>
            </h2>
            <DataStatusBadge status="partial" tooltip={t`Clasament pe număr (valoarea este sub prag).`} />
          </div>
          <PartyRankingChart rows={data.topAuthorities} partyKind="authority" metric="count" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold">
            <Trans>Categorii principale</Trans>
          </h2>
          <CategoryBreakdown rows={data.topCategories} />
        </div>
      </section>

      <ExplainerAccordion />
    </div>
  )
}

function EntryCard({
  icon: Icon,
  title,
  description,
  to,
  params,
  search,
}: {
  readonly icon: typeof Building2
  readonly title: string
  readonly description: string
  readonly to: string
  readonly params?: Record<string, string>
  readonly search?: Record<string, unknown>
}) {
  return (
    <Link
      to={to as '/achizitii/cautare'}
      params={params as never}
      search={search as never}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Link>
  )
}

function ExplainerAccordion() {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <CircleHelp className="h-4 w-4" aria-hidden />
          <Trans>Ce înseamnă termenii?</Trans>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="mt-2 space-y-2 text-sm text-muted-foreground">
          <Term term={t`Achiziție directă`} definition={t`Achiziție sub prag, fără procedură competitivă.`} />
          <Term term={t`Procedură`} definition={t`Anunț de licitație sau negociere.`} />
          <Term term={t`Contract`} definition={t`Contract atribuit în urma unei proceduri.`} />
          <Term term={t`CPV`} definition={t`Vocabularul comun privind achizițiile — cod de categorie.`} />
          <Term term={t`Semnal de verificare`} definition={t`Tipar determinist care merită o a doua privire, nu o concluzie.`} />
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Term({ term, definition }: { readonly term: string; readonly definition: string }) {
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
        <div className="h-8 w-2/3 animate-pulse rounded bg-primary/10" aria-hidden />
        <div className="h-4 w-1/2 animate-pulse rounded bg-primary/10" aria-hidden />
      </div>
      <div className="h-16 w-full animate-pulse rounded-lg bg-primary/10" aria-hidden />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
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
        <Link to="/achizitii">
          <Trans>Reîncearcă</Trans>
        </Link>
      </Button>
    </div>
  )
}
