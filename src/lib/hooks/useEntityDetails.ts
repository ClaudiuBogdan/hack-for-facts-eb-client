import { useQuery } from '@tanstack/react-query';
import { getEntityDetails, EntityDetailsData } from '@/lib/api/entities';

export const ENTITY_DETAILS_QUERY_KEY = 'entityDetails';

export function useEntityDetails(cui: string | undefined, year?: number, startYear?: number, endYear?: number) {
  return useQuery<
    EntityDetailsData | null,
    Error,
    EntityDetailsData | null,
    [string, string | undefined, number | undefined, number | undefined, number | undefined]
  >({
    queryKey: [ENTITY_DETAILS_QUERY_KEY, cui, year, startYear, endYear],
    queryFn: async () => {
      if (!cui) {
        return null;
      }
      return getEntityDetails(cui, year, startYear, endYear);
    },
    enabled: !!cui, // Only run the query if CUI is available
    staleTime: 1000 * 60 * 5, // 5 minutes
    // You can add more React Query options here if needed, e.g., refetchOnWindowFocus, retry, etc.
  });
} 