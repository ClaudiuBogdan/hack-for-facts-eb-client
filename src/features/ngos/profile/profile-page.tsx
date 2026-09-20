import { Trans, useLingui } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistryProvenance } from "../registry/registry-page";
import { parseRegistrySearch } from "../registry/api";
import type { NgoProfileOverview } from "./api";

function RegistryLink() {
  return (
    <Link
      to="/ong-uri/registru"
      search={parseRegistrySearch({})}
      className="text-primary underline underline-offset-4"
    >
      <Trans>Browse the NGO registry</Trans>
    </Link>
  );
}
export function NgoLiveProfileNotFound() {
  return (
    <main className="container mx-auto space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">
        <Trans>No current registry link for this CUI</Trans>
      </h1>
      <p>
        <Trans>
          A profile is available only when the current published registry has an
          accepted CUI link. A historical registry record may still be
          available.
        </Trans>
      </p>
      <RegistryLink />
    </main>
  );
}
export function NgoLiveProfileUnavailable() {
  return (
    <main className="container mx-auto space-y-4 px-4 py-10">
      <Alert variant="destructive">
        <AlertTitle>
          <Trans>NGO profile temporarily unavailable</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>The data could not be loaded. Please try again later.</Trans>
        </AlertDescription>
      </Alert>
      <RegistryLink />
    </main>
  );
}
export function NgoLiveProfilePage({
  profile,
}: {
  readonly profile: NgoProfileOverview;
}) {
  const { i18n } = useLingui();
  const first = profile.registryRecords[0];
  const booleanLabel = (value: boolean | null) =>
    value === null ? t`Not provided` : value ? t`Yes` : t`No`;
  const date = (value: string | null) =>
    value === null
      ? t`Not provided`
      : new Intl.DateTimeFormat(i18n.locale, {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(value));
  const fiscal = profile.fiscal.data;
  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <RegistryLink />
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Trans>NGO profile</Trans>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {first.nameWithheld ? t`Name pending verification` : first.name}
        </h1>
        <p className="font-mono">CUI {profile.cui}</p>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Linked by an accepted CUI in the current registry. Each source
            retains its own observations.
          </Trans>
        </p>
      </header>
      <RegistryProvenance snapshot={first.snapshot} />
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Registry observations</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {profile.registryRecords.map((record) => (
              <li key={record.id} className="space-y-1 py-4">
                <Link
                  to="/ong-uri/registru/$recordId"
                  params={{ recordId: record.id }}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {record.nameWithheld
                    ? t`Name pending verification`
                    : record.name}
                </Link>
                <p className="text-sm">
                  <Trans>Registry number</Trans>: {record.registryNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {record.legalForm} · {record.county ?? t`Not provided`} ·{" "}
                  {record.sourceRegistryStatus}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>ANAF fiscal observation</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fiscal === null ? (
            <p className="text-muted-foreground">
              <Trans>
                No public fiscal observation is available for this CUI yet. This
                is not a confirmed negative result.
              </Trans>
            </p>
          ) : (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  [t`VAT payer`, booleanLabel(fiscal.vatPayer)],
                  [
                    t`Declared fiscally inactive`,
                    booleanLabel(fiscal.declaredFiscallyInactive),
                  ],
                  [t`Split VAT`, booleanLabel(fiscal.splitVat)],
                  [t`Main CAEN code`, fiscal.mainCaenCode ?? t`Not provided`],
                  [t`CAEN revision`, fiscal.mainCaenRev ?? t`Not provided`],
                  [t`Query date`, date(fiscal.queryDate)],
                  [t`Captured on`, date(fiscal.capturedAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted-foreground">
                <Trans>
                  Fiscal inactivity is not legal dissolution. These values
                  describe the source's response for the query date.
                </Trans>
              </p>
              <a
                href={fiscal.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                <Trans>ANAF source service</Trans>
              </a>
            </>
          )}
        </CardContent>
      </Card>
      <Alert>
        <AlertTitle>
          <Trans>More sources are being prepared</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            Financial statements, services, accreditations and funding are not
            released on this profile yet. Their absence here does not mean there
            are none.
          </Trans>
        </AlertDescription>
      </Alert>
    </main>
  );
}
