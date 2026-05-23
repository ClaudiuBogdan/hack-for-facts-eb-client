import type { ReactNode } from 'react'
import {
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'

type Props = {
  readonly title: string
  readonly intro: string
  readonly children: ReactNode
}

/** Shared section header for member profile tabs */
export function MemberProfileSectionHeader({ title, intro, children }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className={memberDetailSectionTitleClassName}>{title}</h2>
        <p className={memberDetailSectionIntroClassName}>{intro}</p>
      </div>
      {children}
    </div>
  )
}
