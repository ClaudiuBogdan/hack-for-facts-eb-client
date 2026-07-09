import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { CompanyHubStats } from '@/schemas/private-company-search'
import { usePrivateCompanyHub } from '../../hooks/use-private-company-hub'
import { formatInteger } from '../../lib/formatting'
import { CompanySearchAutocomplete } from '../search/company-search-autocomplete'
import {
  HubBlock,
  HubBlockError,
  HubBlockSkeleton,
  HubGroupBars,
} from './company-hub-blocks'

const ACTIVE = '1048'
const STRUCK_OFF = '1084'
const BANKRUPTCY = '1070'
const INSOLVENCY = '1107'

function countFor(stats: CompanyHubStats, code: string): number {
  return stats.statusMix.find((slice) => slice.key === code)?.count ?? 0
}

export function PrivateCompanyHubPage() {
  const navigate = useNavigate()
  const hub = usePrivateCompanyHub()
  const stats = hub.data

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--pnrr-fg)]">
          <Trans>Firme</Trans>
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--pnrr-muted)]">
          <Trans>
            Toate firmele înregistrate la ONRC, cu starea din registru, datele
            fiscale de la ANAF și situațiile financiare anuale. Caută o firmă
            anume sau pornește de la o întrebare.
          </Trans>
        </p>
      </header>

      <section aria-label={t`Cifre generale`}>
        {hub.isPending ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                aria-hidden
                className="h-24 animate-pulse border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)]"
              />
            ))}
          </div>
        ) : hub.isError || !stats ? (
          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
            <HubBlockError onRetry={() => void hub.refetch()} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={<Trans>Total firme</Trans>}
              value={stats.totalCompanies}
              search={{}}
              testId="company-hub-tile-total"
            />
            <StatTile
              label={<Trans>În funcțiune</Trans>}
              value={stats.activeCompanies}
              search={{ status: [ACTIVE] }}
              testId="company-hub-tile-active"
            />
            <StatTile
              label={<Trans>Radiate</Trans>}
              value={countFor(stats, STRUCK_OFF)}
              search={{ status: [STRUCK_OFF] }}
              testId="company-hub-tile-struck-off"
            />
            <StatTile
              label={<Trans>Insolvență și faliment</Trans>}
              value={countFor(stats, INSOLVENCY) + countFor(stats, BANKRUPTCY)}
              search={{ status: [INSOLVENCY, BANKRUPTCY] }}
              testId="company-hub-tile-distress"
            />
          </div>
        )}
      </section>

      <section
        aria-label={t`Caută o firmă`}
        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5"
      >
        <label
          htmlFor="company-hub-search"
          className="mb-2 block text-sm font-bold uppercase tracking-widest text-[var(--pnrr-fg)]"
        >
          <Trans>Caută o firmă</Trans>
        </label>
        <CompanySearchAutocomplete
          value={undefined}
          commitMode="enter"
          onCommit={(q) =>
            void navigate({ to: '/companies/search', search: q ? { q } : {} })
          }
          placeholder={t`ex. Dedeman sau 2816464`}
          inputId="company-hub-search"
          ariaLabel={t`Nume firmă sau CUI`}
        />
        <p className="mt-2 text-xs text-[var(--pnrr-muted)]">
          <Trans>
            Apasă Enter ca să cauți, sau alege o sugestie ca să mergi direct la
            profilul firmei.
          </Trans>
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <HubBlock title={<Trans>Județe cu cele mai multe firme</Trans>}>
          {hub.isPending ? (
            <HubBlockSkeleton rows={6} />
          ) : hub.isError || !stats ? (
            <HubBlockError onRetry={() => void hub.refetch()} />
          ) : (
            <HubGroupBars
              groups={stats.topCounties}
              testId="company-hub-counties"
              buildSearch={(group) => ({ county: [group.key], status: [ACTIVE] })}
            />
          )}
        </HubBlock>

        {/* The CAEN roll-up is the slowest server leg: it fails on its own terms
            and never keeps the rest of the hub from rendering. */}
        <HubBlock title={<Trans>Domenii de activitate (CAEN)</Trans>}>
          {hub.isPending ? (
            <HubBlockSkeleton rows={6} />
          ) : !stats || stats.caenDivisions === null ? (
            <HubBlockError onRetry={() => void hub.refetch()} />
          ) : (
            <HubGroupBars
              groups={stats.caenDivisions}
              testId="company-hub-caen"
              buildSearch={(group) => ({ caen: group.key, status: [ACTIVE] })}
            />
          )}
        </HubBlock>
      </div>

      <section aria-label={t`Investigații rapide`} className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--pnrr-fg)]">
          <Trans>Pornește o investigație</Trans>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <InvestigationCard
            title={<Trans>Firme în insolvență sau faliment</Trans>}
            description={
              <Trans>
                Firmele aflate în procedură, utile pentru a verifica furnizorii
                unei instituții publice.
              </Trans>
            }
            search={{ status: [INSOLVENCY, BANKRUPTCY] }}
          />
          <InvestigationCard
            title={<Trans>Firme declarate inactive fiscal</Trans>}
            description={
              <Trans>
                Companii marcate inactiv de ANAF, dar încă în funcțiune la ONRC.
              </Trans>
            }
            search={{ inactive: true, status: [ACTIVE] }}
          />
          <InvestigationCard
            title={<Trans>Firme înregistrate din 2024</Trans>}
            description={
              <Trans>
                Firme tinere — verifică cine a câștigat contracte la scurt timp
                după înființare.
              </Trans>
            }
            search={{ regFrom: '2024-01-01', status: [ACTIVE] }}
          />
          <InvestigationCard
            title={<Trans>Construcții active</Trans>}
            description={
              <Trans>
                Diviziunea CAEN 41 — construcții de clădiri, domeniul cu cele mai
                multe contracte publice.
              </Trans>
            }
            search={{ caen: '41', status: [ACTIVE] }}
          />
        </div>
      </section>

      <footer className="border-t-2 border-[var(--pnrr-border)] pt-4 text-xs leading-relaxed text-[var(--pnrr-muted)]">
        <p className="font-bold uppercase tracking-widest text-[var(--pnrr-fg)]">
          <Trans>Surse</Trans>
        </p>
        <p className="mt-2">
          <Trans>
            ONRC — Registrul Comerțului (stare, formă juridică, CAEN). ANAF —
            date fiscale (TVA, inactivitate) și situații financiare.
          </Trans>
        </p>
        {stats ? (
          <p className="mt-1">
            <Trans>
              Snapshot ONRC {stats.coverage.onrcAsOf ?? '—'} · snapshot ANAF{' '}
              {stats.coverage.anafAsOf ?? '—'}
            </Trans>
          </p>
        ) : null}
      </footer>
    </main>
  )
}

function StatTile({
  label,
  value,
  search,
  testId,
}: {
  readonly label: ReactNode
  readonly value: number
  readonly search: Record<string, unknown>
  readonly testId: string
}) {
  return (
    <Link
      to="/companies/search"
      search={search}
      data-testid={testId}
      className="block border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tabular-nums text-[var(--pnrr-fg)]">
        {formatInteger(value)}
      </p>
    </Link>
  )
}

function InvestigationCard({
  title,
  description,
  search,
}: {
  readonly title: ReactNode
  readonly description: ReactNode
  readonly search: Record<string, unknown>
}) {
  return (
    <Link
      to="/companies/search"
      search={search}
      className="block border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <p className="text-base font-bold text-[var(--pnrr-fg)]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--pnrr-muted)]">
        {description}
      </p>
    </Link>
  )
}
