import type {
  MapGroupedValueSeries,
  MapGrouping,
} from '@/schemas/advanced-map-analytics';
import type {
  MapSeriesDomain,
  MapSeriesVector,
  MapSeriesVectorCache,
} from '@/lib/map-series/interfaces';

export function getSeriesDomainKey(domain: MapSeriesDomain): string {
  return domain.type === 'uat' ? 'uat' : `group:${domain.groupingId}`;
}

export function areSeriesDomainsEqual(
  left: MapSeriesDomain,
  right: MapSeriesDomain
): boolean {
  return getSeriesDomainKey(left) === getSeriesDomainKey(right);
}

export function getUatDomain(): MapSeriesDomain {
  return { type: 'uat' };
}

export function getGroupedSeriesDomain(series: MapGroupedValueSeries): MapSeriesDomain {
  return { type: 'group', groupingId: series.groupingId };
}

export function evaluateGroupedValueSeries(params: {
  series: MapGroupedValueSeries;
  grouping: MapGrouping;
  sourceValues: MapSeriesVector;
}): MapSeriesVector {
  const vector: MapSeriesVector = new Map();

  for (const group of params.grouping.groups) {
    const memberCodes = getOrderedMemberCodes(group.memberSirutaCodes, group.memberOrder);
    if (params.series.aggregation === 'first') {
      const primaryValue = group.primarySirutaCode
        ? params.sourceValues.get(group.primarySirutaCode)
        : undefined;
      if (primaryValue !== undefined) {
        vector.set(group.id, primaryValue);
        continue;
      }

      vector.set(
        group.id,
        memberCodes
          .map((sirutaCode) => params.sourceValues.get(sirutaCode))
          .find((value) => value !== undefined)
      );
      continue;
    }

    let sum = 0;
    let hasFiniteValue = false;
    for (const sirutaCode of memberCodes) {
      const value = params.sourceValues.get(sirutaCode);
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        continue;
      }
      sum += value;
      hasFiniteValue = true;
    }

    vector.set(group.id, hasFiniteValue ? sum : undefined);
  }

  return vector;
}

function getOrderedMemberCodes(
  memberSirutaCodes: string[],
  memberOrder: string[] | undefined
): string[] {
  if (!memberOrder?.length) {
    return memberSirutaCodes;
  }

  const members = new Set(memberSirutaCodes);
  const orderedMembers = memberOrder.filter((sirutaCode) => members.has(sirutaCode));
  const orderedMemberSet = new Set(orderedMembers);
  const remainingMembers = memberSirutaCodes.filter((sirutaCode) => !orderedMemberSet.has(sirutaCode));
  return [...orderedMembers, ...remainingMembers];
}

export function projectGroupedValuesToSiruta(params: {
  valuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: Map<string, MapSeriesDomain>;
  groupings: MapGrouping[];
}): MapSeriesVectorCache {
  const groupingsById = new Map(params.groupings.map((grouping) => [grouping.id, grouping]));
  const projected: MapSeriesVectorCache = new Map();

  for (const [seriesId, vector] of params.valuesBySeriesId.entries()) {
    const domain = params.domainsBySeriesId.get(seriesId);
    if (!domain || domain.type === 'uat') {
      projected.set(seriesId, new Map(vector));
      continue;
    }

    const grouping = groupingsById.get(domain.groupingId);
    if (!grouping) {
      projected.set(seriesId, new Map());
      continue;
    }

    const projectedVector: MapSeriesVector = new Map();
    for (const group of grouping.groups) {
      const value = vector.get(group.id);
      for (const sirutaCode of group.memberSirutaCodes) {
        projectedVector.set(sirutaCode, value);
      }
    }
    projected.set(seriesId, projectedVector);
  }

  return projected;
}

export function buildGroupingValuesBySiruta(params: {
  groupings: MapGrouping[];
}): Map<string, Record<string, string | undefined>> {
  const valuesBySiruta = new Map<string, Record<string, string | undefined>>();

  for (const grouping of params.groupings) {
    for (const group of grouping.groups) {
      for (const sirutaCode of group.memberSirutaCodes) {
        const row = valuesBySiruta.get(sirutaCode) ?? {};
        row[grouping.id] = group.id;
        valuesBySiruta.set(sirutaCode, row);
      }
    }
  }

  return valuesBySiruta;
}

export function buildGroupMetadataById(params: {
  groupings: MapGrouping[];
}): Map<string, { groupingId: string; groupingLabel: string; groupLabel: string; memberSirutaCodes: string[] }> {
  const metadataByGroupId = new Map<string, {
    groupingId: string;
    groupingLabel: string;
    groupLabel: string;
    memberSirutaCodes: string[];
  }>();

  for (const grouping of params.groupings) {
    const groupingLabel = grouping.label || grouping.key || grouping.id;
    for (const group of grouping.groups) {
      metadataByGroupId.set(getGroupMetadataKey(grouping.id, group.id), {
        groupingId: grouping.id,
        groupingLabel,
        groupLabel: group.label || group.id,
        memberSirutaCodes: group.memberSirutaCodes,
      });
    }
  }

  return metadataByGroupId;
}

export function getGroupMetadataKey(groupingId: string, groupId: string): string {
  return `${groupingId}::${groupId}`;
}
