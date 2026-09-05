import { queryOptions } from "@tanstack/react-query";
import { fetchEntityIdentity } from "@/lib/api/entity-identity";

/** Shared by native entity views and SSR; fiscal controls do not define identity. */
export function entityIdentityQueryOptions(cui: string) {
  return queryOptions({
    queryKey: ["entityIdentity", cui],
    queryFn: ({ signal }) => fetchEntityIdentity(cui, signal),
    enabled: /^[0-9]{1,10}$/.test(cui),
    staleTime: 5 * 60 * 1000,
    placeholderData: () => undefined,
    retry: false,
  });
}
