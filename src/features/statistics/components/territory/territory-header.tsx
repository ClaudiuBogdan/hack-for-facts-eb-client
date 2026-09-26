import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { ExternalLink, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'
import { comparisonPlaceName } from '../../lib/comparison-format'
import { insTempoHomeUrl } from '../../lib/ins-tempo'
import { formatHubPeriod } from '../../lib/period'
import { statisticsTheme } from '../../lib/statistics-theme'
import { BUCHAREST_MUNICIPALITY_SIRUTA } from '../../lib/territory'

type TerritoryHeaderProps = {
  readonly identity: StatisticsTerritoryIdentity
  /** How many indicators carry a figure for this place. */
  readonly indicatorCount: number
  /** The most recent period any of them publishes. */
  readonly latestDataPeriod: string | null
}

function levelLabel(level: StatisticsTerritoryIdentity['level']): string {
  switch (level) {
    case 'LAU':
      return t`UAT`
    case 'NUTS3':
      return t`Județ`
    case 'NUTS2':
      return t`Regiune`
    case 'NUTS1':
      return t`Macroregiune`
    case 'NATIONAL':
      return t`Național`
    default:
      return t`Nivel necunoscut`
  }
}

/**
 * Who the page is about: the place, in the spelling a reader uses, with
 * its kind beside it and the county above it.
 *
 * INS sends „MUNICIPIUL CLUJ-NAPOCA"; the comparison page one click away
 * already rendered the same place as „Cluj-Napoca · municipiu" through
 * `comparisonPlaceName`, and one place should not have two spellings on
 * two pages. The line under the title says what the page holds for this
 * place — how many indicators, up to when — rather than a fact about the
 * whole catalog (§6n: a band says what its numbers are).
 *
 * It is also where the source is said, once for the page: every figure below
 * is an INS Tempo matrix, and a „Sursă" button on each of seventy rows said
 * the same thing seventy times. Each figure's own matrix — its code, its
 * update date, the link to it on INS Tempo — is on the series it opens.
 */
export function TerritoryHeader({ identity, indicatorCount, latestDataPeriod }: TerritoryHeaderProps) {
  const { i18n } = useLingui()
  const place = identity.name ? comparisonPlaceName(identity.name) : null
  const name = place?.name ?? `SIRUTA ${identity.siruta}`
  const kind = place?.kind ?? levelLabel(identity.level)
  // Bucharest is its own county cell: „județul București / București" would
  // say the place twice.
  const county = identity.siruta === BUCHAREST_MUNICIPALITY_SIRUTA ? null : identity.countyName

  return (
    <div className="space-y-3">
      <nav aria-label={t`Ierarhie teritorială`} className="text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/ins" className="underline-offset-2 hover:text-foreground hover:underline">
              <Trans>România</Trans>
            </Link>
          </li>
          {county ? (
            <li className="flex items-center gap-1">
              <span aria-hidden>/</span>
              <Trans>județul</Trans> {county}
            </li>
          ) : null}
          <li className="flex items-center gap-1" aria-current="page">
            <span aria-hidden>/</span>
            <span className="text-foreground">{name}</span>
          </li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <Badge variant="secondary">{kind}</Badge>
      </div>
      <p className={statisticsTheme.metaLine}>
        <span className={statisticsTheme.provenanceChip}>SIRUTA {identity.siruta}</span>
        <span>
          {plural(indicatorCount, { one: 'un indicator cu date', few: '# indicatori cu date', other: '# de indicatori cu date' })}
        </span>
        {/* One provenance statement, kept whole when the line wraps. */}
        <span className="tabular-nums">
          <Trans>Sursă:</Trans>{' '}
          <a
            href={insTempoHomeUrl(i18n.locale)}
            target="_blank"
            rel="noreferrer"
            aria-label={t`INS Tempo (se deschide într-un tab nou)`}
            // `-mx-1 px-1 py-1`: the 24px hit area WCAG 2.2 AA asks for (2.5.8).
            className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            INS Tempo
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          {latestDataPeriod ? <Trans>, date până în {formatHubPeriod(latestDataPeriod)}</Trans> : null}
        </span>
        {identity.enrichedFallback ? (
          <span>
            <Trans>Identitate completată parțial din datele disponibile</Trans>
          </span>
        ) : null}
      </p>
    </div>
  )
}
