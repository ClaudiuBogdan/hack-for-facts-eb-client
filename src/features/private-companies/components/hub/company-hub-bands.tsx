import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { CompanyHubStats, CompanyRegistryBucket } from '@/schemas/private-company-hub'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE } from '../../lib/company-status-codes'
import { bucketBasisText, caenDivisionText, caenRevisionText, statusCodeText } from '../../lib/company-registry-text'
import { countyName } from '../../lib/hub-counties'
import { formatHubNumber, formatHubShare } from '../../lib/hub-format'

/**
 * The `/companies` hub's bands, each drawn from `companyHubStats` of the
 * pinned edition and saying what its numbers are: the status of every
 * directory company once (consensus or the reason there is none), the
 * counties of the companies with an „în funcțiune" observation, and their
 * authorised activities by CAEN revision — which overlap, so they are counts,
 * never shares. No row claims to equal a directory query: the directory
 * matches observations on one identifier, the hub counts consensus.
 */

function BandFrame({ id, titleId, index, title, lede, children }: {
  readonly id: string
  readonly titleId: string
  readonly index: string
  readonly title: ReactNode
  readonly lede: ReactNode
  readonly children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead titleId={titleId} index={index} title={title} lede={lede} />
          </div>
          <div className="min-w-0 lg:col-span-6 lg:col-start-7" data-reveal>
            {children}
          </div>
        </div>
      </RuledFrame>
    </section>
  )
}

function CountRows({ rows, testId }: { readonly rows: readonly { readonly key: string; readonly label: string; readonly count: number; readonly share?: string }[]; readonly testId: string }) {
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70" data-testid={testId}>
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-x-4 py-2.5 text-sm">
          <span className="truncate pl-1 text-foreground">{row.label}</span>
          <span className="tabular-nums text-muted-foreground">{formatHubNumber(row.count)}</span>
          <span className="pr-1 text-right font-semibold tabular-nums text-foreground">{row.share ?? ''}</span>
        </li>
      ))}
    </ol>
  )
}

function statusRowLabel(bucket: CompanyRegistryBucket): string {
  if (bucket.basis) return bucketBasisText(bucket.basis)
  return statusCodeText(bucket.key)
}

/** Every directory company once: these buckets add up to the directory, so a share is honest here. */
export function HubStatusBand({ stats, index }: { readonly stats: CompanyHubStats; readonly index: string }) {
  const rows = stats.statusMix.map((bucket) => ({
    key: bucket.key,
    label: statusRowLabel(bucket),
    count: bucket.count,
    share: formatHubShare(bucket.count, stats.totalCompanies),
  }))
  return (
    <BandFrame
      id="stari"
      titleId="hub-status-title"
      index={index}
      title={<Trans>Starea firmelor în registru</Trans>}
      lede={
        <Trans>
          Fiecare firmă din director e numărată o dată: după starea comună tuturor înscrierilor ei din ediție, sau într-un grup separat când
          nu au una comună. Denumirile stărilor sunt din nomenclatorul aplicației.
        </Trans>
      }
    >
      <CountRows rows={rows} testId="company-hub-status" />
    </BandFrame>
  )
}

export function HubCountiesBand({ stats, index }: { readonly stats: CompanyHubStats; readonly index: string }) {
  const rows = stats.topCounties
    .filter((bucket) => bucket.basis === null)
    .map((bucket) => ({ key: bucket.key, label: bucket.label ?? countyName(bucket.key), count: bucket.count }))
  return (
    <BandFrame
      id="judete"
      titleId="hub-counties-title"
      index={index}
      title={<Trans>Unde sunt firmele în funcțiune</Trans>}
      lede={
        <Trans>
          Cele mai multe firme cu o înscriere „în funcțiune”, după județul comun al înscrierilor lor. Firmele fără un județ comun nu sunt
          numărate aici.
        </Trans>
      }
    >
      <CountRows rows={rows} testId="company-hub-counties" />
      <Link to="/companies/search" search={{ status: [STATUS_ACTIVE] }} className={`mt-5 inline-block ${HUB_SHORTCUT_LINK_CLASS}`}>
        <Trans>Caută firmele în funcțiune după județ →</Trans>
      </Link>
    </BandFrame>
  )
}

/** `<revision|unknown>:<division>` buckets, grouped by revision; they overlap, so no total and no share. */
export function HubDivisionsBand({ stats, index }: { readonly stats: CompanyHubStats; readonly index: string }) {
  const byRevision = new Map<string | null, { key: string; label: string; count: number }[]>()
  for (const bucket of stats.caenDivisions) {
    const [rawRevision = '', division = ''] = bucket.key.split(':')
    const revision = /^rev[0-3]$/u.test(rawRevision) ? rawRevision : null
    const rows = byRevision.get(revision) ?? []
    rows.push({ key: bucket.key, label: caenDivisionText(revision, division), count: bucket.count })
    byRevision.set(revision, rows)
  }
  const blocks = [...byRevision.entries()].sort(([a], [b]) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : b.localeCompare(a)))
  return (
    <BandFrame
      id="domenii"
      titleId="hub-divisions-title"
      index={index}
      title={<Trans>Ce activități au autorizate</Trans>}
      lede={
        <Trans>
          Firmele cu o înscriere „în funcțiune”, după activitățile autorizate în ediție, pe revizii CAEN. O firmă poate apărea în mai multe
          domenii și revizii, așa că numerele nu se adună.
        </Trans>
      }
    >
      {blocks.map(([revision, rows]) => (
        <div key={revision ?? 'unknown'} className="mt-6 first:mt-0">
          <MonoLabel className="mb-1 block text-muted-foreground">{caenRevisionText(revision)}</MonoLabel>
          <CountRows rows={rows.slice(0, 10)} testId={`company-hub-divisions-${revision ?? 'unknown'}`} />
        </div>
      ))}
    </BandFrame>
  )
}

/** Saved directory queries, with no count: their size is the directory's to say. */
export function HubStartBand({ index }: { readonly index: string }) {
  return (
    <section aria-labelledby="hub-start-title">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead titleId="hub-start-title" index={index} title={<Trans>De aici poți începe</Trans>} />
        <ul className="mt-8 grid gap-px border bg-border/70 sm:grid-cols-4" data-testid="company-hub-start" data-reveal>
          <StartCard to={{ status: INSOLVENCY_STATUSES }} title={<Trans>Firme cu înscrieri de insolvență sau faliment</Trans>} />
          <StartCard to={{ inactive: true, status: [STATUS_ACTIVE] }} title={<Trans>În funcțiune în registru, inactive fiscal la ANAF</Trans>} />
          <StartCard to={{ status: DISSOLUTION_STATUSES }} title={<Trans>Firme cu înscrieri de dizolvare sau lichidare</Trans>} />
          <li>
            <Link to="/companies/analytics" className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
              <span className="block text-base font-semibold tracking-tight text-foreground">
                <Trans>Analiza bilanțurilor</Trans>
              </span>
            </Link>
          </li>
        </ul>
      </RuledFrame>
    </section>
  )
}

function StartCard({ to, title }: { readonly to: Record<string, unknown>; readonly title: ReactNode }) {
  return (
    <li>
      <Link to="/companies/search" search={to} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
        <span className="block text-base font-semibold tracking-tight text-foreground">{title}</span>
      </Link>
    </li>
  )
}
