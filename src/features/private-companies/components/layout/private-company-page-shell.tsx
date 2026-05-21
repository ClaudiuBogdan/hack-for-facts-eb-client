import { PrivateCompanyLayout } from './private-company-layout'
import type { PrivateCompanyPageShellProps } from './types'

export function PrivateCompanyPageShell({
  header,
  tabNav,
  children,
}: PrivateCompanyPageShellProps) {
  return (
    <PrivateCompanyLayout header={header} tabNav={tabNav}>
      {children}
    </PrivateCompanyLayout>
  )
}
