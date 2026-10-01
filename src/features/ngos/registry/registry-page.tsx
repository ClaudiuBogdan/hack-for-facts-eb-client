import { Link, useRouter } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RegistryRecord, RegistrySnapshot } from "./api";

export function RegistryProvenance({
  snapshot,
}: {
  readonly snapshot: RegistrySnapshot;
}) {
  const { i18n } = useLingui();
  const capturedDate = new Date(snapshot.capturedAt);
  const importedDate = new Date(snapshot.importedAt);
  const sourceDate = snapshot.sourceDeclaredDate;
  const dateFormat = new Intl.DateTimeFormat(i18n.locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const date = Number.isNaN(capturedDate.getTime())
    ? snapshot.capturedAt
    : dateFormat.format(capturedDate);
  const imported = Number.isNaN(importedDate.getTime())
    ? snapshot.importedAt
    : dateFormat.format(importedDate);
  return (
    <section
      aria-label={t`Source and coverage`}
      className="space-y-2 border-y bg-muted/40 px-4 py-4 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        {snapshot.nationalCompleteness !== "verified" && (
          <Badge variant="secondary">
            <Trans>National completeness unverified</Trans>
          </Badge>
        )}
        {snapshot.isCurrent && snapshot.refreshOverdue && (
          <Badge variant="outline">
            <Trans>New export overdue</Trans>
          </Badge>
        )}
        {!snapshot.isCurrent && (
          <Badge variant="outline">
            <Trans>Historical snapshot</Trans>
          </Badge>
        )}
        <span>
          <Trans>File received on {date}</Trans>
        </span>
        <a
          href={snapshot.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
        >
          <Trans>Ministry of Justice source</Trans>
          <ExternalLink className="size-3" />
        </a>
      </div>
      {snapshot.coverageBasis === "provided_artifact" && (
        <p>
          <Trans>This page uses a supplied registry export.</Trans>
        </p>
      )}
      {snapshot.nationalCompleteness !== "verified" && (
        <p>
          <Trans>
            National completeness has not been independently verified.
          </Trans>
        </p>
      )}
      <p className="text-muted-foreground">
        <Trans>Imported on {imported}</Trans>
      </p>
      {sourceDate !== null && (
        <p>
          <Trans>Source-declared snapshot date: {sourceDate}</Trans>
        </p>
      )}
      <p className="text-muted-foreground">
        <Trans>
          Dates, status and public utility are claims in this snapshot. Records
          include duplicates and are not a count of distinct organizations.
        </Trans>
      </p>
    </section>
  );
}

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
export function RegistryLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10" aria-busy="true">
      <p role="status">
        <Trans>Loading registry records…</Trans>
      </p>
    </main>
  );
}
export function RegistryNotFound() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">
        <Trans>Registry record not found</Trans>
      </h1>
      <Link to="/ngos/registry" search={{}} className="text-primary underline">
        <Trans>Search the registry</Trans>
      </Link>
    </main>
  );
}

export function NgoRegistryDetail({
  record,
}: {
  readonly record: RegistryRecord;
}) {
  const { i18n } = useLingui();
  const registrationDate = new Date(record.sourceRegistrationDate ?? "");
  const date =
    record.sourceRegistrationDate === null
      ? t`Not provided`
      : Number.isNaN(registrationDate.getTime())
        ? record.sourceRegistrationDate
        : new Intl.DateTimeFormat(i18n.locale, {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(registrationDate);
  const yesNo = (value: boolean | null) =>
    value === null ? t`Not provided` : value ? t`Yes` : t`No`;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="space-y-3">
        <Link
          to="/ngos/registry"
          search={{}}
          className="text-sm text-primary underline"
        >
          <Trans>NGO registry</Trans>
        </Link>
        <h1 className="break-words text-2xl font-semibold">
          {record.nameWithheld ? (
            <Trans>Name pending verification</Trans>
          ) : (
            record.name
          )}
        </h1>
        <p className="text-muted-foreground">
          {record.registryNumber} · {record.legalForm}
        </p>
      </header>
      <RegistryProvenance snapshot={record.snapshot} />
      {!record.snapshot.isCurrent && (
        <Alert>
          <AlertTitle>
            <Trans>This record belongs to an earlier snapshot</Trans>
          </AlertTitle>
          <AlertDescription>
            <Link
              to="/ngos/registry"
              search={{ registryNumber: record.registryNumber }}
              className="underline"
            >
              <Trans>Find current records with this registry number</Trans>
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {[
          [t`Registry number`, record.registryNumber],
          [t`Special registry number`, record.specialRegistryNumber],
          [t`Registration date in source`, date],
          [t`Status in source`, record.sourceRegistryStatus],
          [t`Court`, record.court],
          [t`County`, record.county],
          [t`Locality`, record.locality],
          [t`CUI reported in source`, record.sourceCui],
          [t`Branch reported`, yesNo(record.isBranch)],
          [
            t`Public utility reported`,
            yesNo(record.sourceReportsPublicUtility),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words font-medium">
              {value ?? t`Not provided`}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        <Trans>
          The source registration date is not necessarily the organization's
          founding date.
        </Trans>
      </p>
      {record.linkedOrganizationCui !== null && (
        <section className="space-y-2 border-t pt-4">
          <h2 className="font-semibold">
            <Trans>Linked CUI</Trans>
          </h2>
          <p>{record.linkedOrganizationCui}</p>
          <Button asChild variant="outline">
            <Link
              to="/ngos/$cui"
              params={{ cui: record.linkedOrganizationCui }}
            >
              <Trans>View NGO profile for this CUI</Trans>
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            <Trans>
              Other sources may have different coverage. This link does not
              change the registry's legal classification.
            </Trans>
          </p>
        </section>
      )}
    </main>
  );
}
