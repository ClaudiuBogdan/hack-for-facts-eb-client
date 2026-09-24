import { Trans } from '@lingui/react/macro'
import { LitigationSliceSection } from '@/features/justice/components/litigation-slice-section'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { ProfileBand } from './company-profile-band'

const TITLE_ID = 'company-litigation-title'

/**
 * „În instanță": the court cases the justice read links to the company, paged
 * in the URL (`litPage`). The page shows the band only when that read answers
 * (`useCompanyLitigationShown`); the justice case page links back to it.
 */
export function CompanyLitigationBand({
  cui,
  index,
  page,
  onPage,
}: {
  readonly cui: string
  readonly index: string
  readonly page: number
  readonly onPage: (page: number) => void
}) {
  return (
    <ProfileBand id="litigii" titleId={TITLE_ID}>
      <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>În instanță</Trans>} />
      <div className="mt-8">
        <LitigationSliceSection cui={cui} page={page} onPageChange={onPage} showTitle={false} />
      </div>
    </ProfileBand>
  )
}
