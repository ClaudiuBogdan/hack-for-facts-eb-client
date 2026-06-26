import { Link } from '@tanstack/react-router'
import { ArrowRight, Database, MapPinned, ShieldCheck } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  MAP_VIEW_VALUES,
  PROGRAM_CODE_VALUES,
  cleanLandingSearch,
  type MapView,
  type ProgramCode,
  type PublicInvestmentsLandingSearchState,
} from '@/schemas/public-investments'
import {
  AmountWithEvidence,
  BlockedDataState,
  DataStatusBadge,
  LoadingRows,
  ObjectiveListRow,
  PublicInvestmentsMapPanel,
  usePublicInvestmentsEvidence,
} from '../components'
import { useLandingData } from '../hooks/use-public-investments-data'
import { formatPct, programLabel } from '../lib/display'

type Props = {
  readonly search?: Partial<PublicInvestmentsLandingSearchState>
}

export function PublicInvestmentsLandingPage({ search = {} }: Props) {
  const query = useLandingData()
  const { openEvidence } = usePublicInvestmentsEvidence()

  if (query.isLoading) return <LoadingRows rows={3} />
  if (query.isBlocked) {
    return (
      <BlockedDataState
        reason={query.blockedReason}
        messageKey={query.blockedMessageKey}
        messageParams={query.blockedMessageParams}
      />
    )
  }
  if (query.isError) {
    return (
      <EmptyState
        title={t`Nu am putut încărca investițiile publice`}
        description={t`Verifică serverul local sau încearcă din nou.`}
      />
    )
  }
  if (!query.data) return null

  const { data } = query
  const selectedProgram = search.program
  const mapView = search.view ?? 'program'
  const mapPoints = selectedProgram
    ? data.mapPoints.filter((point) => point.program === selectedProgram)
    : data.mapPoints
  const topStalled = selectedProgram
    ? data.topStalled.filter((objective) => objective.program === selectedProgram)
    : data.topStalled

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <DataStatusBadge status={data.status} />
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal">
              <Trans>Investiții publice locale</Trans>
            </h1>
            <p className="text-muted-foreground">
              <Trans>
                Obiective Anghel Saligny, PNDL, PNCCRS și PNMC modelate
                mock-first cu dovezi, acoperire și limite explicite.
              </Trans>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link
                to="/investitii-publice/cautare"
                search={selectedProgram ? { programs: [selectedProgram] } : {}}
              >
                <Trans>Caută obiective</Trans>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/investitii-publice/judete/$countyCode" params={{ countyCode: 'CJ' }}>
                <Trans>Vezi Cluj</Trans>
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <Trans>Reguli de încredere</Trans>
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Trans>Valorile suspecte ×1000 nu intră în totaluri.</Trans>
            </li>
            <li>
              <Trans>Părțile cu risc personal sunt reținute până la revizuire.</Trans>
            </li>
            <li>
              <Trans>Fiecare sumă critică are dovadă de sursă.</Trans>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiPanel
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label={t`Obiective`}
          value={new Intl.NumberFormat('ro-RO').format(data.kpis.objectiveCount)}
          caption={t`${data.kpis.mappedObjectiveCount} localizate`}
        />
        <div className="rounded-md border p-4">
          <AmountWithEvidence
            label={t`Contractat total verificat`}
            value={data.kpis.contractedTotal}
            evidenceRef={data.kpis.evidenceRef}
            onEvidenceOpen={openEvidence}
          />
        </div>
        <KpiPanel
          icon={<MapPinned className="h-4 w-4" aria-hidden="true" />}
          label={t`Absorbție`}
          value={formatPct(data.kpis.absorptionPct)}
          caption={t`Decontat / contractat verificat`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ProgramFilterLinks search={search} selectedProgram={selectedProgram} />
            <MapModeLinks search={search} mapView={mapView} />
          </div>
          <PublicInvestmentsMapPanel points={mapPoints} colorBy={mapView} />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            <Trans>Acoperire programe</Trans>
          </h2>
          {data.coverage.map((item) => (
            <div key={item.program} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{programLabel(item.program)}</span>
                <Badge variant={item.loaded ? 'success' : 'warning'}>
                  {item.loaded ? t`Încărcat` : t`În lucru`}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Intl.NumberFormat('ro-RO').format(item.objectiveCount)}{' '}
                <Trans>obiective în catalog</Trans>
              </p>
              {item.note && <p className="mt-1 text-xs text-amber-700">{item.note}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          <Trans>Obiective cu absorbție redusă</Trans>
        </h2>
        {topStalled.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <Trans>Nu există obiective cu absorbție redusă pentru programul selectat.</Trans>
          </div>
        ) : (
          <div className="space-y-3">
            {topStalled.map((objective) => (
              <ObjectiveListRow
                key={objective.objectiveId}
                objective={objective}
                onEvidenceOpen={openEvidence}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ProgramFilterLinks({
  search,
  selectedProgram,
}: {
  readonly search: Partial<PublicInvestmentsLandingSearchState>
  readonly selectedProgram?: ProgramCode
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t`Filtru program`}>
      <Button asChild size="sm" variant={selectedProgram ? 'outline' : 'secondary'}>
        <Link
          to="/investitii-publice"
          search={cleanLandingSearch({ ...search, program: undefined })}
        >
          <Trans>Toate</Trans>
        </Link>
      </Button>
      {PROGRAM_CODE_VALUES.map((program) => (
        <Button
          key={program}
          asChild
          size="sm"
          variant={selectedProgram === program ? 'secondary' : 'outline'}
        >
          <Link to="/investitii-publice" search={cleanLandingSearch({ ...search, program })}>
            {programLabel(program)}
          </Link>
        </Button>
      ))}
    </div>
  )
}

function MapModeLinks({
  search,
  mapView,
}: {
  readonly search: Partial<PublicInvestmentsLandingSearchState>
  readonly mapView: MapView
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t`Colorare hartă`}>
      {MAP_VIEW_VALUES.map((view) => (
        <Button
          key={view}
          asChild
          size="sm"
          variant={mapView === view ? 'secondary' : 'outline'}
        >
          <Link to="/investitii-publice" search={cleanLandingSearch({ ...search, view })}>
            {view === 'program' ? t`Program` : t`Stadiu`}
          </Link>
        </Button>
      ))}
    </div>
  )
}

function KpiPanel({
  icon,
  label,
  value,
  caption,
}: {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
  readonly caption: string
}) {
  return (
    <div className="rounded-md border p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{caption}</p>
    </div>
  )
}
