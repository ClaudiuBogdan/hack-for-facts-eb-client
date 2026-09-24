import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { percent } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { economyLede, economyShares, type EconomyShareKey } from '../../lib/company-profile-text'
import { BAND_GRID_CLASS, ProfileBand } from './company-profile-band'

const TITLE_ID = 'company-economy-title'

function shareLabel(key: EconomyShareKey, model: CompanyProfileModel): ReactNode {
  switch (key) {
    case 'sector-turnover':
      return <Trans>din cifra de afaceri a domeniului „{model.mainActivity?.divisionLabel}"</Trans>
    case 'sector-employees':
      return <Trans>din salariații domeniului</Trans>
    case 'county':
      return <Trans>din cifra de afaceri a firmelor cu sediul în {model.place.county}</Trans>
    case 'national':
      return <Trans>din cifra de afaceri raportată în România</Trans>
  }
}

/**
 * „Cât cântărește în economie": where the company stands in its sector, county
 * and country — context, not the company itself, so it comes near the end of
 * the page, and only when a share reaches 1%. The page leaves the band out of
 * its sections otherwise (`economyShares`).
 */
export function CompanyEconomyBand({ model, index }: { readonly model: CompanyProfileModel; readonly index: string }) {
  const rows = economyShares(model)
  if (rows.length === 0) return null
  return (
    <ProfileBand id="economie" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Cât cântărește în economie</Trans>} lede={economyLede(model)} />
        </div>
        <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="flex items-baseline gap-3">
                  <span className="w-16 shrink-0 text-xl font-semibold tabular-nums tracking-tight text-foreground">{percent(row.share)}</span>
                  <span className="text-sm leading-snug text-muted-foreground">{shareLabel(row.key, model)}</span>
                </div>
                <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
                  <span className="block h-full bg-primary" style={{ width: `${Math.max(row.share * 100, 0.8).toFixed(1)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
            <Link to="/companies" hash="domenii" className={HUB_SHORTCUT_LINK_CLASS}>
              <Trans>Toate domeniile →</Trans>
            </Link>
            <Link to="/companies" search={{ indicator: 'cifra-de-afaceri' }} hash="judete" className={HUB_SHORTCUT_LINK_CLASS}>
              <Trans>Județele pe hartă →</Trans>
            </Link>
          </div>
        </div>
      </div>
    </ProfileBand>
  )
}
