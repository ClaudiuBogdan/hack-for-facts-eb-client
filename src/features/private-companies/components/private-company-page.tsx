import { useNavigate } from '@tanstack/react-router'
import type {
  PrivateCompanyProfile,
  PrivateCompanyViewTab,
} from '@/schemas/private-company'
import { PRIVATE_COMPANY_TAB_IDS } from '../lib/tab-config'
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
}

export function PrivateCompanyPage({ profile, tab, cui }: Props) {
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

  return (
    <PrivateCompanyPageShell
      header={<PrivateCompanyHeader profile={profile} />}
      tabNav={<PrivateCompanyTabNav activeTab={tab} onTabChange={setTab} />}
    >
      {PRIVATE_COMPANY_TAB_IDS.map((tabId) => (
        <div
          key={tabId}
          role="tabpanel"
          id={`company-tabpanel-${tabId}`}
          aria-labelledby={`company-tab-${tabId}`}
          hidden={tab !== tabId}
          className={tab === tabId ? 'block' : 'hidden'}
        >
          <PrivateCompanyTabContent
            tab={tabId}
            profile={profile}
            onTabChange={setTab}
          />
        </div>
      ))}
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
