import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  AuthorityProcurementSlice,
  ProcurementAnalysisGrain,
  ProcurementInstitutionOverview,
  ProcurementInstitutionPopulation,
  ProcurementInstitutionSignals as InstitutionSignals,
} from '@/schemas/procurement'
import { buildInstitutionScopes } from '../lib/institution-scopes'
import {
  useProcurementAuthoritySlice,
  useProcurementInstitutionOverview,
} from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementSectionClassName,
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { ProcurementAuthoritySlice } from './procurement-authority-slice'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementInstitutionPopulations } from './procurement-institution-populations'
import { ProcurementInstitutionSignals } from './procurement-institution-signals'
import { ProcurementDetailSkeleton } from './procurement-skeletons'

type Props = {
  readonly cui: string
  readonly initialSlice?: AuthorityProcurementSlice
  readonly initialOverview?: ProcurementInstitutionOverview
  readonly className?: string
}

function hasInstitutionSignals(signals: InstitutionSignals): boolean {
  return (
    signals.concentration !== null ||
    signals.procedureMix.length > 0 ||
    signals.amendment !== null ||
    signals.frameworkExposure !== null
  )
}

/** What this population's headline money means, spelled out. */
function headlineMoneyLabel(grain: ProcurementAnalysisGrain): string | null {
  switch (grain) {
    case 'framework':
      return t`Plafon maxim angajat prin acorduri-cadru`
    case 'calloff':
      return t`Valoare comandată prin contracte subsecvente`
    case 'modification':
      return null
    default:
      return t`Valoare atribuită (nu plăți efectuate)`
  }
}

/** Dedicated buyer profile under `/procurement/institutions/$cui`. */
export function ProcurementInstitutionPage({
  cui,
  initialSlice,
  initialOverview,
  className,
}: Props) {
  const [activeGrain, setActiveGrain] =
    useState<ProcurementAnalysisGrain>('contract')
  const scopes = useMemo(() => buildInstitutionScopes(), [])
  const nameQuery = useProcurementAuthoritySlice(cui, initialSlice)
  const overviewQuery = useProcurementInstitutionOverview(
    cui,
    scopes,
    initialOverview,
  )

  const overview = overviewQuery.data
  const title =
    overview?.authorityName?.trim() ||
    nameQuery.data?.authorityName?.trim() ||
    t`Institution CUI ${cui}`

  const populations = overview?.populations ?? []
  const active: ProcurementInstitutionPopulation | undefined =
    populations.find((entry) => entry.grain === activeGrain) ?? populations[0]
  const contractAwarded =
    populations.find((entry) => entry.grain === 'contract')?.stats
      .valueAwardedSum ?? null
  const moneyLabel = active ? headlineMoneyLabel(active.grain) : null

  // The envelope carries a caveat for EVERY money basis the grain declares,
  // but this block shows exactly one. Rendering the rest told readers that
  // "estimated value abstains" under a figure that was never estimated.
  // Subtract the other measures' own caveats rather than pattern-matching text.
  const headlineMeta = useMemo(() => {
    if (active === undefined) return null
    const foreign = new Set(
      active.stats.moneyVerdicts
        .filter((verdict) => verdict.measure !== active.anchorMeasure)
        .flatMap((verdict) => verdict.caveats),
    )
    return {
      ...active.stats.meta,
      caveats: active.stats.meta.caveats.filter(
        (caveat) => !foreign.has(caveat),
      ),
    }
  }, [active])

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
    >
      <nav
        aria-label={t`Breadcrumb`}
        className="flex flex-wrap items-center gap-1 text-sm text-[var(--pnrr-muted)]"
      >
        <Link
          to="/procurement"
          className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
        >
          <Trans>Achiziții publice</Trans>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link
          to="/procurement"
          search={{ view: 'rankings', rank_dim: 'buyer' }}
          className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
        >
          <Trans>Instituții</Trans>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[var(--pnrr-fg)]">{title}</span>
      </nav>

      <header className="space-y-2">
        <div className={procurementSectionLabelClassName}>
          <Trans>Cumpărător public</Trans>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--pnrr-fg)] sm:text-4xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--pnrr-muted)]">
          <span>
            <Trans>CUI: {cui}</Trans>
          </span>
          <Link
            to="/entities/$cui"
            params={{ cui }}
            className={procurementUnderlineLinkClassName}
          >
            <Trans>Profilul instituției</Trans>
          </Link>
          <Link
            to="/procurement"
            search={{ view: 'list', authority_cui: cui }}
            className={procurementUnderlineLinkClassName}
          >
            <Trans>Toate înregistrările</Trans>
          </Link>
          <Link
            to="/achizitii/metodologie"
            className={procurementUnderlineLinkClassName}
          >
            <Trans>Cum sunt calculate sumele</Trans>
          </Link>
        </div>
      </header>

      {overviewQuery.isPending ? (
        <ProcurementDetailSkeleton />
      ) : overviewQuery.isError ? (
        <ProcurementErrorState
          error={overviewQuery.error}
          onRetry={() => void overviewQuery.refetch()}
          isRetrying={overviewQuery.isRefetching}
        />
      ) : overview === undefined || populations.length === 0 ? (
        <p className="text-sm text-[var(--pnrr-muted)]">
          <Trans>
            This institution does not appear as a buyer in the procurement data.
          </Trans>
        </p>
      ) : (
        <>
          {active ? (
            <section className={cn(procurementSectionClassName, 'p-5')}>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                {moneyLabel ?? t`Modificări contractuale`}
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-[var(--pnrr-fg)]">
                {moneyLabel === null
                  ? formatFlowCount(active.recordCount ?? '0')
                  : formatRon(active.anchorValueRon, 'compact')}
              </p>
              <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                {moneyLabel === null ? (
                  <Trans>
                    Actele adiționale se raportează ca număr — sumele brute din
                    sursă nu sunt suficient de fiabile pentru a fi însumate.
                  </Trans>
                ) : (
                  <Trans>
                    {formatFlowCount(active.recordCount ?? '0')} înregistrări în
                    această populație.
                  </Trans>
                )}
              </p>
              {headlineMeta ? (
                <ProcurementAnswerabilityNotice
                  meta={headlineMeta}
                  className="mt-3"
                />
              ) : null}
            </section>
          ) : null}

          <ProcurementInstitutionPopulations
            populations={populations}
            active={active?.grain ?? 'contract'}
            onSelect={setActiveGrain}
          />

          {hasInstitutionSignals(overview.signals) ? (
            <ProcurementInstitutionSignals
              signals={overview.signals}
              contractAwardedRon={contractAwarded}
            />
          ) : null}
        </>
      )}

      <ProcurementAuthoritySlice
        authorityCui={cui}
        initialSlice={nameQuery.data}
        showSummaryTiles={false}
      />
    </div>
  )
}
