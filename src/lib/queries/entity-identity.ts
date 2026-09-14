import { queryOptions } from "@tanstack/react-query";
import { fetchEntityIdentity } from "@/lib/api/entity-identity";

/** Shared by native entity views and SSR; fiscal controls do not define identity. */
export function entityIdentityQueryOptions(cui: string, populationYear?: number) {
  return queryOptions({
    queryKey: ["entityIdentity", cui, populationYear],
    queryFn: ({ signal }) => fetchEntityIdentity(cui, signal, populationYear),
    enabled: /^[0-9]{1,10}$/.test(cui),
    staleTime: 5 * 60 * 1000,
    placeholderData: () => undefined,
    retry: false,
  });
}
