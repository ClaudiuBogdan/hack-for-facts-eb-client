export function buildProjectDetailHref(engagementId: string): string {
  const key = `mipe-engagement:${engagementId.trim()}`;
  return `/pnrr/proiecte/${encodeURIComponent(key)}`;
}
