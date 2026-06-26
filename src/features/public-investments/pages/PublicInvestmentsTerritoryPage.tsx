import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, MapPin } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AbsorptionBar,
  AmountWithEvidence,
  BlockedDataState,
  DataStatusBadge,
  LoadingRows,
  ObjectiveListRow,
  PublicInvestmentsMapPanel,
  usePublicInvestmentsEvidence,
} from '../components'
import { useTerritoryData } from '../hooks/use-public-investments-data'
import {
  PROGRAM_CODE_VALUES,
  cleanTerritorySearch,
  type ProgramCode,
  type PublicInvestmentsTerritorySearchState,
} from '@/schemas/public-investments'
import { programLabel } from '../lib/display'

type Props = {
  readonly scope: 'locality' | 'county'
  readonly code: string
  readonly search: Partial<PublicInvestmentsTerritorySearchState>
}

export function PublicInvestmentsTerritoryPage({ scope, code, search }: Props) {
  const navigate = useNavigate()
  const query = useTerritoryData(scope, code, search)
  const { openEvidence } = usePublicInvestmentsEvidence()

  const updateSearch = (patch: Partial<PublicInvestmentsTerritorySearchState>) => {
    const searchUpdater = (previous: Partial<PublicInvestmentsTerritorySearchState>) =>
      cleanTerritorySearch({
        ...previous,
        ...patch,
      })

    if (scope === 'county') {
      void navigate({
        to: '/investitii-publice/judete/$countyCode',
        params: { countyCode: code },
        search: searchUpdater,
      })
      return
    }

    void navigate({
      to: '/investitii-publice/localitati/$siruta',
      params: { siruta: code },
      search: searchUpdater,
    })
  }

  if (query.isLoading) return <LoadingRows rows={3} />
  if (query.isBlocked) {
    return (
      <BlockedDataState
        reason={query.blockedReason}
        messageParams={query.blockedMessageParams}
      />
    )
  }
  if (query.isError) {
    return (
      <div className="rounded-md border border-destructive/30 p-4 text-sm text-destructive">
        <Trans>Nu am putut încărca teritoriul.</Trans>
      </div>
    )
  }
  if (!query.data) return null

  const territory = query.data
  const title =
    territory.scope === 'county'
      ? t`Județul ${territory.countyName}`
      : (territory.localityName ?? t`Localitate ${territory.siruta ?? code}`)

  return (
    <div className="space-y-6">
      <section className="space-y-3 border-b pb-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MapPin className="h-5 w-5" aria-hidden="true" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Obiective, acoperire și absorbție pe teritoriul selectat.</Trans>
        </p>
        <DataStatusBadge status={territory.status} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryBox label={t`Obiective`} value={String(territory.summary.objectiveCount)} />
        <div className="rounded-md border p-4">
          <AmountWithEvidence
            label={t`Contractat`}
            value={territory.summary.contractedTotal}
            evidenceRef={territory.summary.evidenceRef ?? territory.objectives[0]?.evidenceRef}
            onEvidenceOpen={openEvidence}
          />
        </div>
        <div className="rounded-md border p-4">
          <AbsorptionBar value={territory.summary.absorptionPct} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-md border p-4">
          <label className="space-y-1 text-sm font-medium">
            <span>{t`Program`}</span>
            <Select
              value={search.programs?.[0] ?? 'all'}
              onValueChange={(value) =>
                updateSearch({
                  programs: value === 'all' ? undefined : [value as ProgramCode],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t`Toate`}</SelectItem>
                {PROGRAM_CODE_VALUES.map((program) => (
                  <SelectItem key={program} value={program}>
                    {programLabel(program)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">
              <Trans>Programe</Trans>
            </h2>
            {territory.byProgram.map((item) => (
              <div key={item.program} className="rounded-md border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{programLabel(item.program)}</span>
                  <span>{item.count}</span>
                </div>
                <AmountWithEvidence
                  className="mt-1"
                  value={item.contracted}
                  evidenceRef={item.evidenceRef}
                  onEvidenceOpen={openEvidence}
                />
              </div>
            ))}
          </div>
          {territory.childUats && territory.childUats.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">
                <Trans>Localități</Trans>
              </h2>
              {territory.childUats.map((uat) => (
                <Button key={uat.siruta} asChild variant="outline" size="sm" className="w-full justify-between">
                  <Link to="/investitii-publice/localitati/$siruta" params={{ siruta: uat.siruta }}>
                    {uat.name}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </aside>

        <div className="space-y-4">
          <PublicInvestmentsMapPanel points={territory.mapPoints} />
          <div className="space-y-3">
            {territory.objectives.map((objective) => (
              <ObjectiveListRow
                key={objective.objectiveId}
                objective={objective}
                onEvidenceOpen={openEvidence}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function SummaryBox({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
