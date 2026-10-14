import { createFileRoute, redirect } from '@tanstack/react-router'
import { companyDirectoryRedirect } from '@/features/private-companies/lib/company-directory-redirect'

/**
 * The company directory was retired in October 2026: its filters are the
 * companies analysis's, its name lookup the front door's search box. An old
 * address is sent on, for good, to where its question is answered now
 * (`companyDirectoryRedirect`).
 */
export const Route = createFileRoute('/companies/search')({
  beforeLoad: ({ location }) => {
    const target = companyDirectoryRedirect(location.search as Record<string, unknown>)
    if (target.to === '/companies/$cui') {
      throw redirect({ to: target.to, params: target.params, search: target.search as never, replace: true, statusCode: 301 })
    }
    throw redirect({ to: target.to, search: target.search as never, replace: true, statusCode: 301 })
  },
})
