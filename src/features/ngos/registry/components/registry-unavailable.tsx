import { Link, useRouter } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** The registry page's error: no sample data shown, a read again or a fresh search offered. */
export function RegistryUnavailable() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">
        <Trans>NGO registry unavailable</Trans>
      </h1>
      <Alert>
        <AlertTitle>
          <Trans>The registry could not be loaded</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            The live dataset may not be published yet, or the snapshot may have
            changed. No sample data is shown.
          </Trans>
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            void router.invalidate();
          }}
        >
          <Trans>Retry</Trans>
        </Button>
        <Button asChild variant="outline">
          <Link to="/ngos/registry" search={{}}>
            <Trans>Restart search</Trans>
          </Link>
        </Button>
      </div>
    </main>
  );
}
