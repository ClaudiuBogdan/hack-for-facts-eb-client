import { useNavigate } from '@tanstack/react-router'
import type {
  PrivateCompanyProfile,
  PrivateCompanyViewTab,
} from '@/schemas/private-company'
import { PrivateCompanyHeader } from './layout/private-company-header'
import {
  PrivateCompanyPageSkeleton as PrivateCompanyPageSkeletonLayout,
} from './layout/private-company-page-skeleton'
import { PrivateCompanyPageShell } from './layout/private-company-page-shell'
import { PrivateCompanyTabNav } from './layout/private-company-tab-nav'
import { PrivateCompanyNotFoundPanel } from './private-company-not-found-panel'
import { PrivateCompanySourceFooter } from './private-company-source-footer'
import { PrivateCompanyTabContent } from './private-company-tab-content'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly tab: PrivateCompanyViewTab
  readonly cui: string
  readonly litPage: number
}

export function PrivateCompanyPage({ profile, tab, cui, litPage }: Props) {
  const navigate = useNavigate({ from: '/companies/$cui' })

  const setTab = (next: PrivateCompanyViewTab) => {
    void navigate({
      to: '/companies/$cui',
      params: { cui },
      search: (previousSearch) => ({
        ...previousSearch,
        tab: next,
      }),
    })
  }

  const setLitPage = (page: number) => {
    void navigate({
      to: '/companies/$cui',
      params: { cui },
      search: (previousSearch) => ({
        ...previousSearch,
        tab: 'litigii',
        litPage: page,
      }),
    })
  }

  return (
    <PrivateCompanyPageShell
      header={<PrivateCompanyHeader profile={profile} />}
      tabNav={<PrivateCompanyTabNav activeTab={tab} onTabChange={setTab} />}
    >
      <div
        role="tabpanel"
        id={`company-tabpanel-${tab}`}
        aria-labelledby={`company-tab-${tab}`}
      >
        <PrivateCompanyTabContent
          tab={tab}
          profile={profile}
          cui={cui}
          litPage={litPage}
          onLitPageChange={setLitPage}
          onTabChange={setTab}
        />
      </div>
      <PrivateCompanySourceFooter profile={profile} />
    </PrivateCompanyPageShell>
  )
}

export function PrivateCompanyPageSkeleton() {
  return <PrivateCompanyPageSkeletonLayout />
}

export function PrivateCompanyNotFound() {
  return <PrivateCompanyNotFoundPanel />
}
