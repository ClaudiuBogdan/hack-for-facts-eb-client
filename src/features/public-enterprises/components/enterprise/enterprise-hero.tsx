import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { CompanyBalanceTrend } from '@/features/private-companies/components/profile/company-balance-trend'
import { CopyCui } from '@/features/private-companies/components/profile/company-profile-head'
import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { companySentence, nameLength } from '@/features/private-companies/lib/company-profile-text'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import type { ControlRow, IndicatorTables } from '../../lib/enterprise-model'
import { controlSentence, pageCaveats, sourceLine } from '../../lib/enterprise-text'
import { statementsSource } from '../../lib/hub-text'
import { CaveatsMarker } from '../hub/hub-parts'
import type { ReadState } from './enterprise-bands'
import { Kicker, OutLink, StatusChips } from './enterprise-parts'

/** The heading's scale by the name's length, as the company page sets it. */
const HEADING: Readonly<Record<ReturnType<typeof nameLength>, string>> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

/** The company page's five-year chart, or why there is none. */
function Beside({ company }: { readonly company: ReadState<CompanyProfileModel | null> }) {
  if (company.status === 'pending') return <HubPending rows={5} />
  if (company.status === 'failed') return <HubLoadError onRetry={company.retry} />
  const model = company.value
  const trend = model !== null && model.latest !== null && [...model.recent.turnover, ...model.recent.netResult, ...model.recent.employees].some((value) => value !== null)
  if (trend) return <CompanyBalanceTrend model={model} />
  return <p className="text-sm text-muted-foreground">{model ? t`Nicio situație financiară cu cifre admise.` : t`Fără fișă de firmă: nicio situație financiară.`}</p>
}

/**
 * The page's head, in the company page's rhythm: the way back, the name, a
 * sentence (what the company is, then who controls it, by source), a chip
 * per source's status, the CUI, the company page, one source line; beside
 * them, the company page's last five years on one chart. What a reader must
 * know before trusting a figure sits behind one marker.
 */
export function EnterpriseHero({
  cui,
  name,
  named,
  read,
  rows,
  tables,
  company,
  locale,
}: {
  readonly cui: string
  readonly name: string
  /** False: no source names it, and `name` says its CUI. */
  readonly named: boolean
  readonly read: PublicEnterpriseRead
  readonly rows: readonly ControlRow[]
  readonly tables: IndicatorTables | null
  readonly company: ReadState<CompanyProfileModel | null>
  readonly locale: string
}) {
  const model = company.status === 'ready' ? company.value : null
  const sentence = [model ? companySentence(model) : null, controlSentence(read, rows)].filter((part): part is string => part !== null).join(' ')
  // The statements by their publisher, as the hub's source line names them.
  const statements = model && model.statementSources.length > 0 ? statementsSource(model.statementSources.flatMap((source) => (source.publisher ? [source.publisher] : []))) : null
  const state = company.status === 'ready' ? (company.value ? 'ready' : 'none') : 'unread'
  let identifiers: ReactNode = <CopyCui cui={cui} />
  if (model) {
    identifiers = (
      <>
        <CopyCui cui={cui} />
        <OutLink page="company" cui={cui}>
          {t`Pagina firmei`}
        </OutLink>
      </>
    )
  }
  return (
    <section className="relative border-b" aria-labelledby="enterprise-title">
      <TwoLayerLattice idPrefix="public-enterprise" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex min-h-11 items-center justify-between gap-4 sm:min-h-0">
              <Kicker place={model?.place.county ?? null} />
              <CaveatsMarker notes={pageCaveats(read, rows, tables)} />
            </div>
            <h1
              id="enterprise-title"
              className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter [overflow-wrap:anywhere]', named ? 'text-foreground' : 'text-muted-foreground', HEADING[nameLength(name)])}
            >
              {name}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{sentence}</p>
            <div className="mt-5">
              <StatusChips read={read} model={model} company={state} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">{identifiers}</div>
            <MonoLabel className="mt-6 block max-w-[70ch] normal-case leading-relaxed tracking-normal text-muted-foreground/80">{sourceLine(read, locale, statements)}</MonoLabel>
          </div>
          <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">
            <Beside company={company} />
          </div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}
