import { Trans } from '@lingui/react/macro'
import { CompanyLitigationCases, CompanyLitigationSummary } from '@/features/justice/components/company-litigation'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { JudicialCompanyLitigation } from '@/schemas/judicial'
import { BAND_GRID_CLASS, ProfileBand } from './company-profile-band'

const TITLE_ID = 'company-litigation-title'

/**
 * „În instanță": the court cases the judicial API links to the company
 * through a published name-to-CUI match — a floor, with no party named. The
 * page shows the band only when such links count a case
 * (`useCompanyLitigationShown`).
 */
export function CompanyLitigationBand({
  cui,
  index,
  litigation,
}: {
  readonly cui: string
  readonly index: string
  readonly litigation: JudicialCompanyLitigation
}) {
  return (
    <ProfileBand id="litigii" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>În instanță</Trans>} />
          <CompanyLitigationSummary litigation={litigation} className="mt-8" />
        </div>
        <CompanyLitigationCases cui={cui} className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} />
      </div>
    </ProfileBand>
  )
}
