import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'

type TerritoryHeaderProps = {
  readonly identity: StatisticsTerritoryIdentity
}

function getLevelLabel(level: StatisticsTerritoryIdentity['level']): string {
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

export function TerritoryHeader({ identity }: TerritoryHeaderProps) {
  const name = identity.name || `SIRUTA ${identity.siruta}`

  return (
    <div className="space-y-3">
      <nav aria-label={t`Ierarhie teritorială`} className="text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              to="/statistici"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              România
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
        <Badge variant="secondary">{getLevelLabel(identity.level)}</Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          <Trans>SIRUTA</Trans> {identity.siruta}
        </span>
        {identity.countyName ? <span>{identity.countyName}</span> : null}
        {identity.enrichedFallback ? (
          <span>
            <Trans>Identitate completată parțial din datele disponibile</Trans>
          </span>
        ) : null}
      </div>
    </div>
  )
}
