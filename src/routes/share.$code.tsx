import { createFileRoute, notFound, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { resolveShortLinkCode } from '@/lib/api/shortLinks'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Link2 } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { navigateShareRedirect } from '@/lib/share-redirect'

export const Route = createFileRoute('/share/$code')({
  loader: async ({ params }) => {
    try {
      const urlFromServer = await resolveShortLinkCode(params.code);
      if (urlFromServer) {
        const redirectUrl = remapUrlToClientHost(urlFromServer);
        return { redirectUrl };
      }
    } catch (error) {
      console.error("Failed to resolve short link:", error);
    }

    throw notFound();
  },

  component: ShareRedirector,

  pendingComponent: ShareLoading,
  notFoundComponent: ShareNotFound,
});

function ShareRedirector() {
  const { redirectUrl } = Route.useLoaderData();
  const navigate = useNavigate({ from: '/share/$code' });
  const router = useRouter();

  useEffect(() => {
    if (redirectUrl) {
      void navigateShareRedirect({
        redirectUrl,
        currentOrigin: window.location.origin,
        router,
        navigate,
        replaceLocation: (nextUrl) => window.location.replace(nextUrl),
      });
    }
  }, [redirectUrl, navigate, router]);

  return null;
}


function ShareLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <LoadingSpinner />
            <span>{t`Preparing your share link...`}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t`Hang tight while we resolve and redirect you to the destination.`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ShareNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Link2 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">{t`Invalid or expired link`}</h1>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t`The share link you are trying to access is invalid or no longer available.`}
          </p>
          <Button variant="outline" onClick={() => (window.location.href = '/') }>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t`Go back home`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


/**
 * Re-maps a URL to use the client's current host (origin).
 * Avoids injecting the server's host into the URL.
 */
function remapUrlToClientHost(apiUrl: string) {
  if (typeof window === 'undefined') {
    return apiUrl;
  }
  try {
    const serverUrl = new URL(apiUrl);
    const clientOrigin = window.location.origin;
    return `${clientOrigin}${serverUrl.pathname}${serverUrl.search}${serverUrl.hash}`;
  } catch (error) {
    console.error(`Could not remap invalid URL: "${apiUrl}"`, error);
    return apiUrl;
  }
}
