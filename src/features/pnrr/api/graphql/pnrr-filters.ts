export type PnrrProjectListFilters = {
  readonly componentCode?: string;
  readonly beneficiaryCui?: string;
  readonly contractNumber?: string;
  readonly countySiruta?: string;
  readonly status?: string;
  readonly measureCode?: string;
  readonly from?: string;
  readonly to?: string;
};

export function buildPnrrProjectFilter(
  filters: PnrrProjectListFilters,
): Record<string, unknown> {
  return {
    ...(filters.componentCode
      ? { componentCode: { eq: filters.componentCode } }
      : {}),
    ...(filters.beneficiaryCui
      ? { beneficiaryCui: { eq: filters.beneficiaryCui } }
      : {}),
    ...(filters.contractNumber
      ? { contractNumber: { eq: filters.contractNumber } }
      : {}),
    ...(filters.countySiruta
      ? { countySiruta: { eq: filters.countySiruta } }
      : {}),
    ...(filters.status ? { status: { eq: filters.status } } : {}),
    ...(filters.measureCode
      ? { measureCode: { eq: filters.measureCode } }
      : {}),
    ...(filters.from || filters.to
      ? {
          snapshotDate: {
            between: {
              ...(filters.from ? { from: filters.from } : {}),
              ...(filters.to ? { to: filters.to } : {}),
            },
          },
        }
      : {}),
  };
}
