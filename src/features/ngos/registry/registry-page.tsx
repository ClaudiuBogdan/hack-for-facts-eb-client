import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type {
  RegistryPage,
  RegistryRecord,
  RegistrySearch,
  RegistrySnapshot,
} from "./api";
import { parseRegistrySearch } from "./api";

function RegistryProvenance({
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
          <Link to="/ong-uri/registru" search={parseRegistrySearch({})}>
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
      <Link
        to="/ong-uri/registru"
        search={parseRegistrySearch({})}
        className="text-primary underline"
      >
        <Trans>Search the registry</Trans>
      </Link>
    </main>
  );
}

export function NgoRegistryPage({
  page,
  search,
}: {
  readonly page: RegistryPage;
  readonly search: RegistrySearch;
}) {
  const navigate = useNavigate();
  const { i18n } = useLingui();
  const total = new Intl.NumberFormat(i18n.locale).format(
    page.snapshot.recordCount,
  );
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="space-y-2">
        <Link to="/ong-uri" className="text-sm text-muted-foreground underline">
          <Trans>NGO data</Trans>
        </Link>
        <h1 className="text-2xl font-semibold">
          <Trans>NGO registry</Trans>
        </h1>
        <p className="text-muted-foreground">
          <Trans>
            {total} registry records in this snapshot. Records without a CUI are
            included.
          </Trans>
        </p>
      </header>
      <RegistryProvenance snapshot={page.snapshot} />
      <form
        key={JSON.stringify(search)}
        className="grid items-end gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const values = Object.fromEntries(data.entries());
          for (const key of ["category", "status", "publicUtility"])
            if (values[key] === "all") values[key] = "";
          const next = parseRegistrySearch(values);
          void navigate({ to: "/ong-uri/registru", search: next });
        }}
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ngo-name">
            <Trans>Organization name</Trans>
          </Label>
          <Input
            id="ngo-name"
            name="q"
            defaultValue={search.q}
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ngo-registry">
            <Trans>Registry number</Trans>
          </Label>
          <Input
            id="ngo-registry"
            name="registryNumber"
            defaultValue={search.registryNumber}
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ngo-county">
            <Trans>County</Trans>
          </Label>
          <Input
            id="ngo-county"
            name="county"
            defaultValue={search.county}
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ngo-category">
            <Trans>Category</Trans>
          </Label>
          <Select name="category" defaultValue={search.category || "all"}>
            <SelectTrigger id="ngo-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <Trans>All categories</Trans>
              </SelectItem>
              <SelectItem value="association">
                <Trans>Association</Trans>
              </SelectItem>
              <SelectItem value="foundation">
                <Trans>Foundation</Trans>
              </SelectItem>
              <SelectItem value="federation">
                <Trans>Federation</Trans>
              </SelectItem>
              <SelectItem value="foreign_legal_person">
                <Trans>Foreign legal person</Trans>
              </SelectItem>
              <SelectItem value="religious_association">
                <Trans>Religious association</Trans>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ngo-status">
            <Trans>Status in source</Trans>
          </Label>
          <Select name="status" defaultValue={search.status || "all"}>
            <SelectTrigger id="ngo-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <Trans>All statuses</Trans>
              </SelectItem>
              <SelectItem value="Inregistrat">
                <Trans>Registered</Trans>
              </SelectItem>
              <SelectItem value="In Lichidare">
                <Trans>In liquidation</Trans>
              </SelectItem>
              <SelectItem value="Dizolvata">
                <Trans>Dissolved</Trans>
              </SelectItem>
              <SelectItem value="Radiat">
                <Trans>Removed from register</Trans>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ngo-utility">
            <Trans>Public utility reported</Trans>
          </Label>
          <Select
            name="publicUtility"
            defaultValue={search.publicUtility || "all"}
          >
            <SelectTrigger id="ngo-utility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <Trans>Any</Trans>
              </SelectItem>
              <SelectItem value="yes">
                <Trans>Yes</Trans>
              </SelectItem>
              <SelectItem value="no">
                <Trans>No</Trans>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">
          <Trans>Search registry</Trans>
        </Button>
      </form>
      {page.edges.length === 0 ? (
        <p role="status">
          <Trans>No records match these filters.</Trans>
        </p>
      ) : (
        <ul className="divide-y border-y">
          {page.edges.map(({ node }) => (
            <li key={node.id} className="py-4">
              <Link
                to="/ong-uri/registru/$recordId"
                params={{ recordId: node.id }}
                className="group flex items-start justify-between gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words font-semibold text-primary group-hover:underline">
                    {node.nameWithheld ? <Trans>Name pending verification</Trans> : node.name}
                  </h2>
                  <p className="text-sm">
                    {node.registryNumber} · {node.legalForm} ·{" "}
                    {node.sourceRegistryStatus}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[node.county, node.locality].filter(Boolean).join(" · ")}{" "}
                    {node.sourceCui === null ? (
                      <Trans>CUI not provided or invalid</Trans>
                    ) : (
                      `CUI ${node.sourceCui}`
                    )}
                  </p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <nav
        aria-label={t`Registry pages`}
        className="flex flex-wrap justify-between gap-3"
      >
        {search.after !== "" && (
          <Button asChild variant="outline">
            <Link to="/ong-uri/registru" search={{ ...search, after: "" }}>
              <Trans>First page</Trans>
            </Link>
          </Button>
        )}
        {page.pageInfo.hasNextPage && page.pageInfo.endCursor !== null && (
          <Button asChild>
            <Link
              to="/ong-uri/registru"
              search={{ ...search, after: page.pageInfo.endCursor }}
            >
              <Trans>Next page</Trans>
            </Link>
          </Button>
        )}
      </nav>
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
          to="/ong-uri/registru"
          search={parseRegistrySearch({})}
          className="text-sm text-primary underline"
        >
          <Trans>NGO registry</Trans>
        </Link>
        <h1 className="break-words text-2xl font-semibold">{record.nameWithheld ? <Trans>Name pending verification</Trans> : record.name}</h1>
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
              to="/ong-uri/registru"
              search={parseRegistrySearch({
                registryNumber: record.registryNumber,
              })}
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
              to="/companies/$cui"
              params={{ cui: record.linkedOrganizationCui }}
            >
              <Trans>Explore fiscal and company data for this CUI</Trans>
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
