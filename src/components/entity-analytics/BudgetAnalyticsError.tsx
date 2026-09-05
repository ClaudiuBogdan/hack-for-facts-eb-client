import { Trans } from "@lingui/react/macro";
import { GraphQLRequestError } from "@/lib/graphql/graphql-client";

/** Missing factors are actionable unavailable data, never nominal values under a real-price label. */
export function BudgetAnalyticsError({ error }: { readonly error: Error }) {
  const unavailable =
    error instanceof GraphQLRequestError &&
    error.graphQLErrors.some(
      (entry) => entry.extensions?.code === "SERVICE_UNAVAILABLE",
    );
  return (
    <div className="text-sm text-muted-foreground space-y-2" role="alert">
      <p>{error.message}</p>
      {unavailable && (
        <p>
          <Trans>
            Select another period or switch to nominal RON. Per-capita
            comparisons require known population coverage.
          </Trans>
        </p>
      )}
    </div>
  );
}
