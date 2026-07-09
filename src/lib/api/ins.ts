/**
 * Re-export shim. The INS GraphQL documents and fetchers now live with the
 * statistics feature that owns them; this module keeps the legacy import path
 * working for the entity INS tab, the chart builder and the map series until
 * those callers are migrated to the feature barrel.
 *
 * @deprecated Import from `@/features/statistics/api/graphql/ins-fetchers`.
 */
export * from '@/features/statistics/api/graphql/ins-fetchers';
