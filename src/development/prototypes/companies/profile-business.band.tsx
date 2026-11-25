import { Trans } from '@lingui/react/macro'
import { ProfileBand } from '@/features/private-companies/components/profile/company-profile-band'
import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { financialLede, notAssessedNotice } from '@/features/private-companies/lib/company-profile-text'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { CompanyYearsChart } from './profile-business.chart'

const TITLE_ID = 'company-business-title'

/**
 * PROTOTYPE (owner, 25 November 2026: „remove the bilanț from there and focus
 * on a good chart"). „Cum merge afacerea" is its sentence and one chart across
 * the band: no balance-sheet table beside it (every line of every statement is
 * in „Bilanțurile, an cu an", now right under it) and no measure switch — the
 * chart shows money and people at once, each on its own panel and scale.
 */
export function ProtoBusinessBand({ model }: { readonly model: CompanyProfileModel }) {
  const title = <Trans>Cum merge afacerea</Trans>
  if (!model.latest) {
    return (
      <ProfileBand id="afacerea" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} title={title} />
        <p className="mt-5 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          <Trans>Nicio valoare din bilanțuri în datele de aici: cifra de afaceri, rezultatul și numărul de salariați nu sunt disponibile.</Trans>
        </p>
      </ProfileBand>
    )
  }
  const notAssessed = notAssessedNotice(model)
  const gaps = model.missingYears.length > 0 ? yearRanges(model.missingYears) : null
  return (
    <ProfileBand id="afacerea" titleId={TITLE_ID}>
      <HubSectionHead titleId={TITLE_ID} title={title} lede={financialLede(model)} />
      <CompanyYearsChart model={model} className="mt-8" />
      {gaps ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <Trans>Fără valori comparabile pentru {gaps}.</Trans>
        </p>
      ) : null}
      {notAssessed ? <p className="mt-6 max-w-[60ch] border-l-2 border-amber-500 py-0.5 pl-3 text-sm leading-relaxed text-foreground">{notAssessed}</p> : null}
    </ProfileBand>
  )
}
