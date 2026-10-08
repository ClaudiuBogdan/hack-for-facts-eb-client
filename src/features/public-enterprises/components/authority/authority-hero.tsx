import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { CopyCui } from '@/features/private-companies/components/profile/company-profile-head'
import { nameLength } from '@/features/private-companies/lib/company-profile-text'
import { cn } from '@/lib/utils'
import type { AuthorityPortfolio } from '@/schemas/public-enterprise-portfolio'
import { amepipYearSpan, downLanes, registryLabels, sourceTallies, type ListTallyKey, type PortfolioRow, type RegistryState } from '../../lib/authority-portfolio-model'
import {
  amepipSegmentLabel,
  amepipTitle,
  fiscalSegmentLabel,
  headSentence,
  kickerText,
  listTallyLabel,
  nameSourceNote,
  portfolioCaveats,
  portfolioSourceLine,
  registryStateLabel,
} from '../../lib/authority-portfolio-text'
import { Kicker, OutLink } from '../enterprise/enterprise-links'
import { CaveatsMarker } from '../hub/hub-parts'
import { StatusPanel, type PanelSource } from './authority-parts'

/** The heading's scale by the name's length, as the company page sets it. */
const HEADING: Readonly<Record<ReturnType<typeof nameLength>, string>> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

/** Each source's word on the page's enterprises, apart: ANAF's list, AMEPIP's newest rows, the trade registry, ANAF's inactive taxpayers. */
function SourcesPanel({ portfolio, rows, locale }: { readonly portfolio: AuthorityPortfolio; readonly rows: readonly PortfolioRow[]; readonly locale: string }) {
  const tallies = sourceTallies(rows, portfolio.authority.cui, downLanes(portfolio))
  const sources: PanelSource[] = [
    { key: 'list', title: t`Lista ANAF a întreprinderilor publice`, segments: tallies.list, label: (key) => listTallyLabel(key as ListTallyKey) },
    { key: 'amepip', title: amepipTitle(amepipYearSpan(rows)), segments: tallies.amepip, label: amepipSegmentLabel },
    { key: 'registry', title: t`Registrul comerțului`, segments: tallies.registry, label: (key) => registryStateLabel(key as RegistryState, registryLabels(rows, key)) },
    { key: 'fiscal', title: t`ANAF, contribuabili inactivi`, segments: tallies.fiscal, label: fiscalSegmentLabel },
  ]
  return <StatusPanel title={t`Ce spune fiecare sursă`} sources={sources} locale={locale} />
}

/**
 * The portfolio's head, in the enterprise page's rhythm: the way back and
 * where the authority is, its name, a sentence of what each source gives it,
 * the CUI and its budget page, one source line; beside them, each source's
 * word on its enterprises. What a reader must know before trusting a figure
 * sits behind one marker.
 */
export function AuthorityHero({ portfolio, name, rows, locale }: { readonly portfolio: AuthorityPortfolio; readonly name: string; readonly rows: readonly PortfolioRow[]; readonly locale: string }) {
  const { authority } = portfolio
  const note = nameSourceNote(authority)
  return (
    <section className="relative border-b" aria-labelledby="authority-title">
      <TwoLayerLattice idPrefix="public-enterprise-authority" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex min-h-11 items-center justify-between gap-4 sm:min-h-0">
              <Kicker place={kickerText(authority)} />
              <CaveatsMarker notes={portfolioCaveats(portfolio)} />
            </div>
            <h1
              id="authority-title"
              className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter [overflow-wrap:anywhere]', authority.name ? 'text-foreground' : 'text-muted-foreground', HEADING[nameLength(name)])}
            >
              {name}
            </h1>
            {note ? <MonoLabel className="mt-2 block normal-case tracking-normal text-muted-foreground">{note}</MonoLabel> : null}
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(portfolio, rows, locale)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <CopyCui cui={authority.cui} />
              {authority.hasBudget ? (
                <OutLink page="entity" cui={authority.cui}>
                  {t`Bugetul autorității`}
                </OutLink>
              ) : (
                <span className="text-sm text-muted-foreground">{t`Fără fișă în buget`}</span>
              )}
            </div>
            <MonoLabel className="mt-6 block max-w-[70ch] normal-case leading-relaxed tracking-normal text-muted-foreground/80">{portfolioSourceLine(portfolio, locale)}</MonoLabel>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <SourcesPanel portfolio={portfolio} rows={rows} locale={locale} />
          </div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}
