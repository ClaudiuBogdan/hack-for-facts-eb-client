import { QueryClient } from "@tanstack/react-query";
import { isDeterministicGraphQLFailure } from "@/lib/graphql/graphql-client";

/**
 * Retry a failed query once, unless the failure is one the server repeats
 * for the same request (a GraphQL document it no longer accepts, a refused
 * input): that retry would only add a call and delay the error state.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && !isDeterministicGraphQLFailure(error);
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 1 minute - reduces refetching on navigation
        staleTime: 1000 * 60,
        // Keep unused data in cache for 5 minutes before garbage collection
        gcTime: 1000 * 60 * 5,
        // Retry failed queries once, except a deterministic GraphQL failure
        retry: shouldRetryQuery,
        // Don't refetch on window focus by default (reduces flash on tab switch)
        refetchOnWindowFocus: false,
      },
    },
  });
}
