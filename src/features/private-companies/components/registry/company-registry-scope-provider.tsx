import type { ReactNode } from 'react'
import { CompanyRegistryScopeContext, useCompanyRegistryScopeState } from '../../hooks/use-company-registry-scope'

/** One registry pin per page: every company component under it reads the same scope. */
export function CompanyRegistryScopeProvider({ children }: { readonly children: ReactNode }) {
  const scope = useCompanyRegistryScopeState()
  return <CompanyRegistryScopeContext.Provider value={scope}>{children}</CompanyRegistryScopeContext.Provider>
}
