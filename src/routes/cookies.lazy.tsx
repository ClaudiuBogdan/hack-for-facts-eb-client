import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { CookieSettingsPage } from '@/features/privacy/components/cookie-settings-page'

export const Route = createLazyFileRoute('/cookies')({
  component: CookiesRoute,
})

function CookiesRoute() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <CookieSettingsPage
      redirect={redirect}
      onReturn={() => {
        // `redirect` is a same-origin path the route has already validated.
        if (redirect) void navigate({ href: redirect })
      }}
    />
  )
}
