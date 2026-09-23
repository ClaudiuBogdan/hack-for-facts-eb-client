import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'
import { comparisonPlaceName } from '../../lib/comparison-format'
import { formatHubPeriod } from '../../lib/period'
import { statisticsTheme } from '../../lib/statistics-theme'

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
 */
export function TerritoryHeader({ identity, indicatorCount, latestDataPeriod }: TerritoryHeaderProps) {
  const place = identity.name ? comparisonPlaceName(identity.name) : null
  const name = place?.name ?? `SIRUTA ${identity.siruta}`
  const kind = place?.kind ?? levelLabel(identity.level)

  return (
    <div className="space-y-3">
      <nav aria-label={t`Ierarhie teritorială`} className="text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/ins" className="underline-offset-2 hover:text-foreground hover:underline">
              <Trans>România</Trans>
            </Link>
          </li>
          {identity.countyName ? (
            <li className="flex items-center gap-1">
              <span aria-hidden>/</span>
              <Trans>județul</Trans> {identity.countyName}
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
        {latestDataPeriod ? (
          <span>
            <Trans>date până în {formatHubPeriod(latestDataPeriod)}</Trans>
          </span>
        ) : null}
        {identity.enrichedFallback ? (
          <span>
            <Trans>Identitate completată parțial din datele disponibile</Trans>
          </span>
        ) : null}
      </p>
    </div>
  )
}
