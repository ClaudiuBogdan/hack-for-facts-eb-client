import type {
  AdvancedMapAnalyticsStatsValueFilterRule,
  AdvancedMapAnalyticsThresholdValueFilterRule,
  AdvancedMapAnalyticsValueFilterOperator,
  AdvancedMapAnalyticsValueFilterRule,
  AdvancedMapAnalyticsValueRuleJoin,
  MapGroupWorkspace,
} from '@/schemas/advanced-map-analytics';
import type {
  MapSeriesDomain,
  MapSeriesDomainCache,
  MapSeriesVector,
  MapSeriesVectorCache,
  MapSeriesWarning,
  MapSeriesWarningType,
} from '@/lib/map-series/interfaces';

const EQUALITY_EPSILON = 1e-9;
const ZERO_VARIANCE_EPSILON = 1e-12;
const ROBUST_Z_CONSISTENCY_CONSTANT = 0.67448975;

interface ApplyAdvancedMapAnalyticsValueFiltersInput {
  allValuesBySeriesId: MapSeriesVectorCache;
  displayValuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId?: MapSeriesDomainCache;
  groupWorkspaces?: readonly MapGroupWorkspace[];
  activeGroupWorkspaceId?: string;
  activeSeriesId?: string;
  rules: AdvancedMapAnalyticsValueFilterRule[];
}

export interface ApplyAdvancedMapAnalyticsValueFiltersResult {
  valuesBySeriesId: MapSeriesVectorCache;
  matchedSirutaCodes?: Set<string>;
  matchedDomain?: MapSeriesDomain;
  warnings: MapSeriesWarning[];
}

export function applyAdvancedMapAnalyticsValueFilters(
  input: ApplyAdvancedMapAnalyticsValueFiltersInput
): ApplyAdvancedMapAnalyticsValueFiltersResult {
  const activeGroupWorkspace = resolveActiveGroupWorkspace({
    groupWorkspaces: input.groupWorkspaces,
    activeGroupWorkspaceId: input.activeGroupWorkspaceId,
  });
  const hasEnabledRules = input.rules.some((rule) => rule.enabled);

  if (activeGroupWorkspace && hasEnabledRules) {
    return applyGroupAwareValueFilters(input, activeGroupWorkspace);
  }

  return applyDomainValueFilters(input);
}

function applyDomainValueFilters(
  input: ApplyAdvancedMapAnalyticsValueFiltersInput
): ApplyAdvancedMapAnalyticsValueFiltersResult {
  const warnings: MapSeriesWarning[] = [];
  const enabledRules = input.rules.filter((rule) => rule.enabled);
  if (enabledRules.length === 0) {
    return {
      valuesBySeriesId: cloneVectorCache(input.displayValuesBySeriesId),
      warnings,
    };
  }

  let currentBand: Set<string> | undefined;
  let filterDomain: MapSeriesDomain | undefined;
  let hasValidRule = false;

  for (let index = 0; index < enabledRules.length; index += 1) {
    const rule = enabledRules[index];
    if (!rule) {
      continue;
    }

    const sourceVectorResult = resolveRuleSeriesVector(
      rule,
      input.allValuesBySeriesId,
      input.activeSeriesId
    );

    if (!sourceVectorResult.ok) {
      warnings.push({
        type: sourceVectorResult.warningType,
        message: sourceVectorResult.message,
        seriesId: sourceVectorResult.seriesId,
        details: {
          ruleId: rule.id,
          ruleIndex: index,
        },
      });
      warnings.push({
        type: 'value_filter_invalid_rule',
        message: `Value filter rule ${index + 1} is invalid: ${sourceVectorResult.message}`,
        seriesId: sourceVectorResult.seriesId,
        details: {
          ruleId: rule.id,
          ruleIndex: index,
          reason: sourceVectorResult.warningType,
        },
      });
      continue;
    }

    const sourceDomain = resolveSeriesDomain(sourceVectorResult.seriesId, input.domainsBySeriesId);
    if (filterDomain && !areDomainsEqual(filterDomain, sourceDomain)) {
      const message = 'Value filters cannot combine series from different domains.';
      warnings.push({
        type: 'domain_mismatch',
        message,
        seriesId: sourceVectorResult.seriesId,
        details: {
          ruleId: rule.id,
          ruleIndex: index,
          filterDomain,
          sourceDomain,
        },
      });
      warnings.push({
        type: 'value_filter_invalid_rule',
        message: `Value filter rule ${index + 1} is invalid: ${message}`,
        seriesId: sourceVectorResult.seriesId,
        details: {
          ruleId: rule.id,
          ruleIndex: index,
          reason: 'domain_mismatch',
        },
      });
      return {
        valuesBySeriesId: cloneVectorCache(input.displayValuesBySeriesId),
        warnings,
      };
    }
    filterDomain = sourceDomain;

    const globalUniverse = collectDomainUniverse(
      input.displayValuesBySeriesId,
      input.domainsBySeriesId,
      sourceDomain
    );
    if (globalUniverse.size === 0) {
      return {
        valuesBySeriesId: cloneVectorCache(input.displayValuesBySeriesId),
        warnings,
      };
    }

    const evaluationUniverse =
      !hasValidRule || rule.joinWithPrevious === 'OR'
        ? globalUniverse
        : (currentBand ?? globalUniverse);

    const evaluationResult = evaluateRule(
      rule,
      sourceVectorResult.vector,
      evaluationUniverse
    );

    if (!evaluationResult.ok) {
      const shouldEmitSpecificWarning = evaluationResult.warningType !== 'value_filter_invalid_rule';
      if (shouldEmitSpecificWarning) {
        warnings.push({
          type: evaluationResult.warningType,
          message: `Value filter rule ${index + 1}: ${evaluationResult.message}`,
          seriesId: sourceVectorResult.seriesId,
          details: {
            ruleId: rule.id,
            ruleIndex: index,
            ruleKind: rule.kind,
            ...evaluationResult.details,
          },
        });
      }

      warnings.push({
        type: 'value_filter_invalid_rule',
        message: `Value filter rule ${index + 1} is invalid: ${evaluationResult.message}`,
        seriesId: sourceVectorResult.seriesId,
        details: {
          ruleId: rule.id,
          ruleIndex: index,
          reason: evaluationResult.warningType,
          ruleKind: rule.kind,
          ...evaluationResult.details,
        },
      });
      continue;
    }

    if (!hasValidRule || !currentBand) {
      currentBand = evaluationResult.matches;
      hasValidRule = true;
      continue;
    }

    if (rule.joinWithPrevious === 'OR') {
      currentBand = unionSets(currentBand, evaluationResult.matches);
    } else {
      currentBand = intersectSets(currentBand, evaluationResult.matches);
    }

    hasValidRule = true;
  }

  if (!hasValidRule || !currentBand) {
    return {
      valuesBySeriesId: cloneVectorCache(input.displayValuesBySeriesId),
      warnings,
    };
  }

  if (currentBand.size === 0) {
    warnings.push({
      type: 'value_filter_no_matches',
      message: 'Value filters excluded all UAT rows.',
    });
  }

  return {
    valuesBySeriesId: applyMatchedMask(
      input.displayValuesBySeriesId,
      currentBand,
      input.domainsBySeriesId,
      filterDomain
    ),
    matchedSirutaCodes: currentBand,
    matchedDomain: filterDomain,
    warnings,
  };
}

function applyGroupAwareValueFilters(
  input: ApplyAdvancedMapAnalyticsValueFiltersInput,
  activeGroupWorkspace: MapGroupWorkspace
): ApplyAdvancedMapAnalyticsValueFiltersResult {
  const groupAwareInput = buildGroupAwareValueFilterInput(input, activeGroupWorkspace);
  const groupResult = applyDomainValueFilters(groupAwareInput);
  const valuesBySeriesId = projectGroupAwareFilterResult({
    originalDisplayValuesBySeriesId: input.displayValuesBySeriesId,
    originalDomainsBySeriesId: input.domainsBySeriesId,
    filterDomainsBySeriesId: groupAwareInput.domainsBySeriesId,
    filteredValuesBySeriesId: groupResult.valuesBySeriesId,
    matchedKeys: groupResult.matchedSirutaCodes,
    matchedDomain: groupResult.matchedDomain,
    activeGroupWorkspace,
  });

  return {
    ...groupResult,
    valuesBySeriesId,
    matchedSirutaCodes: expandMatchedGroupKeys({
      matchedKeys: groupResult.matchedSirutaCodes,
      matchedDomain: groupResult.matchedDomain,
      activeGroupWorkspace,
    }),
  };
}

function resolveActiveGroupWorkspace(params: {
  groupWorkspaces?: readonly MapGroupWorkspace[];
  activeGroupWorkspaceId?: string;
}): MapGroupWorkspace | undefined {
  if (!params.activeGroupWorkspaceId) {
    return undefined;
  }

  const workspace = params.groupWorkspaces?.find(
    (entry) => entry.id === params.activeGroupWorkspaceId
  );
  return workspace && workspace.groups.length > 0 ? workspace : undefined;
}

function buildGroupAwareValueFilterInput(
  input: ApplyAdvancedMapAnalyticsValueFiltersInput,
  activeGroupWorkspace: MapGroupWorkspace
): ApplyAdvancedMapAnalyticsValueFiltersInput {
  const domainsBySeriesId = buildGroupAwareDomainsBySeriesId({
    allValuesBySeriesId: input.allValuesBySeriesId,
    displayValuesBySeriesId: input.displayValuesBySeriesId,
    domainsBySeriesId: input.domainsBySeriesId,
    activeGroupWorkspaceId: activeGroupWorkspace.id,
  });

  return {
    ...input,
    allValuesBySeriesId: buildGroupAwareVectorCache({
      valuesBySeriesId: input.allValuesBySeriesId,
      domainsBySeriesId: input.domainsBySeriesId,
      activeGroupWorkspace,
    }),
    displayValuesBySeriesId: buildGroupAwareVectorCache({
      valuesBySeriesId: input.displayValuesBySeriesId,
      domainsBySeriesId: input.domainsBySeriesId,
      activeGroupWorkspace,
    }),
    domainsBySeriesId,
    groupWorkspaces: undefined,
    activeGroupWorkspaceId: undefined,
  };
}

function buildGroupAwareDomainsBySeriesId(params: {
  allValuesBySeriesId: MapSeriesVectorCache;
  displayValuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId?: MapSeriesDomainCache;
  activeGroupWorkspaceId: string;
}): MapSeriesDomainCache {
  const domainsBySeriesId = new Map(params.domainsBySeriesId ?? []);
  const seriesIds = new Set([
    ...params.allValuesBySeriesId.keys(),
    ...params.displayValuesBySeriesId.keys(),
  ]);

  for (const seriesId of seriesIds) {
    const domain = resolveSeriesDomain(seriesId, params.domainsBySeriesId);
    domainsBySeriesId.set(
      seriesId,
      domain.type === 'uat'
        ? { type: 'group', groupWorkspaceId: params.activeGroupWorkspaceId }
        : domain
    );
  }

  return domainsBySeriesId;
}

function buildGroupAwareVectorCache(params: {
  valuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId?: MapSeriesDomainCache;
  activeGroupWorkspace: MapGroupWorkspace;
}): MapSeriesVectorCache {
  const groupedValuesBySeriesId: MapSeriesVectorCache = new Map();

  for (const [seriesId, vector] of params.valuesBySeriesId.entries()) {
    const domain = resolveSeriesDomain(seriesId, params.domainsBySeriesId);
    groupedValuesBySeriesId.set(
      seriesId,
      domain.type === 'uat'
        ? buildActiveGroupVector(vector, params.activeGroupWorkspace)
        : new Map(vector)
    );
  }

  return groupedValuesBySeriesId;
}

function buildActiveGroupVector(
  sourceVector: MapSeriesVector,
  activeGroupWorkspace: MapGroupWorkspace
): MapSeriesVector {
  const vector: MapSeriesVector = new Map();

  for (const group of activeGroupWorkspace.groups) {
    let sum = 0;
    let hasFiniteValue = false;

    for (const sirutaCode of group.memberSirutaCodes) {
      const value = sourceVector.get(sirutaCode);
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

function projectGroupAwareFilterResult(params: {
  originalDisplayValuesBySeriesId: MapSeriesVectorCache;
  originalDomainsBySeriesId?: MapSeriesDomainCache;
  filterDomainsBySeriesId?: MapSeriesDomainCache;
  filteredValuesBySeriesId: MapSeriesVectorCache;
  matchedKeys?: Set<string>;
  matchedDomain?: MapSeriesDomain;
  activeGroupWorkspace: MapGroupWorkspace;
}): MapSeriesVectorCache {
  if (!params.matchedKeys || !params.matchedDomain) {
    return cloneVectorCache(params.originalDisplayValuesBySeriesId);
  }

  const valuesBySeriesId: MapSeriesVectorCache = new Map();
  for (const [seriesId, originalVector] of params.originalDisplayValuesBySeriesId.entries()) {
    const filterDomain = resolveSeriesDomain(seriesId, params.filterDomainsBySeriesId);
    if (!areDomainsEqual(filterDomain, params.matchedDomain)) {
      valuesBySeriesId.set(seriesId, new Map(originalVector));
      continue;
    }

    const originalDomain = resolveSeriesDomain(seriesId, params.originalDomainsBySeriesId);
    if (
      originalDomain.type === 'uat' &&
      isActiveGroupDomain(filterDomain, params.activeGroupWorkspace.id)
    ) {
      valuesBySeriesId.set(
        seriesId,
        maskUatVectorByMatchedGroups({
          vector: originalVector,
          matchedGroupIds: params.matchedKeys,
          activeGroupWorkspace: params.activeGroupWorkspace,
        })
      );
      continue;
    }

    valuesBySeriesId.set(
      seriesId,
      new Map(params.filteredValuesBySeriesId.get(seriesId) ?? [])
    );
  }

  return valuesBySeriesId;
}

function maskUatVectorByMatchedGroups(params: {
  vector: MapSeriesVector;
  matchedGroupIds: Set<string>;
  activeGroupWorkspace: MapGroupWorkspace;
}): MapSeriesVector {
  const matchedSirutaCodes = expandGroupIdsToSirutaCodes(
    params.matchedGroupIds,
    params.activeGroupWorkspace
  );
  const maskedVector: MapSeriesVector = new Map();

  for (const [sirutaCode, value] of params.vector.entries()) {
    if (matchedSirutaCodes.has(sirutaCode)) {
      maskedVector.set(sirutaCode, value);
    }
  }

  return maskedVector;
}

function expandMatchedGroupKeys(params: {
  matchedKeys?: Set<string>;
  matchedDomain?: MapSeriesDomain;
  activeGroupWorkspace: MapGroupWorkspace;
}): Set<string> | undefined {
  if (!params.matchedKeys) {
    return undefined;
  }

  if (!isActiveGroupDomain(params.matchedDomain, params.activeGroupWorkspace.id)) {
    return params.matchedKeys;
  }

  return expandGroupIdsToSirutaCodes(params.matchedKeys, params.activeGroupWorkspace);
}

function expandGroupIdsToSirutaCodes(
  groupIds: Set<string>,
  activeGroupWorkspace: MapGroupWorkspace
): Set<string> {
  const sirutaCodes = new Set<string>();

  for (const group of activeGroupWorkspace.groups) {
    if (!groupIds.has(group.id)) {
      continue;
    }

    for (const sirutaCode of group.memberSirutaCodes) {
      sirutaCodes.add(sirutaCode);
    }
  }

  return sirutaCodes;
}

function isActiveGroupDomain(
  domain: MapSeriesDomain | undefined,
  activeGroupWorkspaceId: string
): boolean {
  return domain?.type === 'group' && domain.groupWorkspaceId === activeGroupWorkspaceId;
}

function cloneVectorCache(valuesBySeriesId: MapSeriesVectorCache): MapSeriesVectorCache {
  const cloned = new Map<string, MapSeriesVector>();
  for (const [seriesId, vector] of valuesBySeriesId.entries()) {
    cloned.set(seriesId, new Map(vector));
  }
  return cloned;
}

function collectDomainUniverse(
  valuesBySeriesId: MapSeriesVectorCache,
  domainsBySeriesId: MapSeriesDomainCache | undefined,
  domain: MapSeriesDomain
): Set<string> {
  const universe = new Set<string>();
  for (const [seriesId, vector] of valuesBySeriesId.entries()) {
    if (!areDomainsEqual(resolveSeriesDomain(seriesId, domainsBySeriesId), domain)) {
      continue;
    }

    for (const key of vector.keys()) {
      universe.add(key);
    }
  }
  return universe;
}

function applyMatchedMask(
  valuesBySeriesId: MapSeriesVectorCache,
  matchedKeys: Set<string>,
  domainsBySeriesId: MapSeriesDomainCache | undefined,
  filterDomain: MapSeriesDomain | undefined
): MapSeriesVectorCache {
  const masked = new Map<string, MapSeriesVector>();

  for (const [seriesId, vector] of valuesBySeriesId.entries()) {
    if (filterDomain && !areDomainsEqual(resolveSeriesDomain(seriesId, domainsBySeriesId), filterDomain)) {
      masked.set(seriesId, new Map(vector));
      continue;
    }

    const maskedVector = new Map<string, number | undefined>();
    for (const [key, value] of vector.entries()) {
      if (!matchedKeys.has(key)) {
        continue;
      }

      maskedVector.set(key, value);
    }
    masked.set(seriesId, maskedVector);
  }

  return masked;
}

function resolveSeriesDomain(
  seriesId: string | undefined,
  domainsBySeriesId: MapSeriesDomainCache | undefined
): MapSeriesDomain {
  if (seriesId && domainsBySeriesId?.has(seriesId)) {
    return domainsBySeriesId.get(seriesId) ?? { type: 'uat' };
  }

  return { type: 'uat' };
}

function areDomainsEqual(left: MapSeriesDomain, right: MapSeriesDomain): boolean {
  if (left.type !== right.type) {
    return false;
  }

  return left.type === 'uat' || left.groupWorkspaceId === (right as { type: 'group'; groupWorkspaceId: string }).groupWorkspaceId;
}

function intersectSets(left: Set<string>, right: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const entry of left) {
    if (right.has(entry)) {
      result.add(entry);
    }
  }
  return result;
}

function unionSets(left: Set<string>, right: Set<string>): Set<string> {
  const result = new Set<string>(left);
  for (const entry of right) {
    result.add(entry);
  }
  return result;
}

function resolveRuleSeriesVector(
  rule: AdvancedMapAnalyticsValueFilterRule,
  allValuesBySeriesId: MapSeriesVectorCache,
  activeSeriesId: string | undefined
):
  | { ok: true; vector: MapSeriesVector; seriesId?: string }
  | {
    ok: false;
    warningType: 'value_filter_missing_series' | 'value_filter_missing_active_series';
    message: string;
    seriesId?: string;
  } {
  if (rule.seriesRef.mode === 'active') {
    if (!activeSeriesId) {
      return {
        ok: false,
        warningType: 'value_filter_missing_active_series',
        message: 'Active series is not selected for an active-series value filter rule.',
      };
    }

    const activeVector = allValuesBySeriesId.get(activeSeriesId);
    if (!activeVector) {
      return {
        ok: false,
        warningType: 'value_filter_missing_active_series',
        message: `Active series ${activeSeriesId} has no loaded values.`,
        seriesId: activeSeriesId,
      };
    }

    return {
      ok: true,
      vector: activeVector,
      seriesId: activeSeriesId,
    };
  }

  const sourceSeriesId = rule.seriesRef.seriesId;
  const sourceVector = allValuesBySeriesId.get(sourceSeriesId);
  if (!sourceVector) {
    return {
      ok: false,
      warningType: 'value_filter_missing_series',
      message: `Value filter source series ${sourceSeriesId} has no loaded values.`,
      seriesId: sourceSeriesId,
    };
  }

  return {
    ok: true,
    vector: sourceVector,
    seriesId: sourceSeriesId,
  };
}

interface RuleEvaluationSuccess {
  ok: true;
  matches: Set<string>;
}

interface RuleEvaluationFailure {
  ok: false;
  warningType: MapSeriesWarningType;
  message: string;
  details?: Record<string, unknown>;
}

function evaluateRule(
  rule: AdvancedMapAnalyticsValueFilterRule,
  valuesBySiruta: MapSeriesVector,
  evaluationUniverse: Set<string>
): RuleEvaluationSuccess | RuleEvaluationFailure {
  if (rule.kind === 'stats') {
    return evaluateStatsRule(rule, valuesBySiruta, evaluationUniverse);
  }

  return evaluateThresholdRule(rule, valuesBySiruta, evaluationUniverse);
}

function evaluateThresholdRule(
  rule: AdvancedMapAnalyticsThresholdValueFilterRule,
  valuesBySiruta: MapSeriesVector,
  evaluationUniverse: Set<string>
): RuleEvaluationSuccess | RuleEvaluationFailure {
  const predicateBuilder = buildThresholdPredicate(rule, valuesBySiruta);
  if (!predicateBuilder.ok) {
    return {
      ok: false,
      warningType: 'value_filter_invalid_rule',
      message: predicateBuilder.message,
      details: {
        operator: rule.operator,
      },
    };
  }

  const matches = new Set<string>();
  for (const sirutaCode of evaluationUniverse) {
    if (predicateBuilder.predicate(sirutaCode)) {
      matches.add(sirutaCode);
    }
  }

  return {
    ok: true,
    matches,
  };
}

function buildThresholdPredicate(
  rule: AdvancedMapAnalyticsThresholdValueFilterRule,
  valuesBySiruta: MapSeriesVector
):
  | { ok: true; predicate: (sirutaCode: string) => boolean }
  | { ok: false; message: string } {
  if (!operatorHasValidParameters(rule.operator, rule.value, rule.secondValue)) {
    return {
      ok: false,
      message: `Missing numeric thresholds for operator ${rule.operator}.`,
    };
  }

  if (rule.operator === 'is_defined') {
    return {
      ok: true,
      predicate: (sirutaCode) => normalizeVectorValue(valuesBySiruta.get(sirutaCode)) !== undefined,
    };
  }

  if (rule.operator === 'is_undefined') {
    return {
      ok: true,
      predicate: (sirutaCode) => normalizeVectorValue(valuesBySiruta.get(sirutaCode)) === undefined,
    };
  }

  if (rule.operator === 'between' || rule.operator === 'not_between') {
    const firstBound = Number(rule.value);
    const secondBound = Number(rule.secondValue);
    const lowerBound = Math.min(firstBound, secondBound);
    const upperBound = Math.max(firstBound, secondBound);

    return {
      ok: true,
      predicate: (sirutaCode) => {
        const value = normalizeVectorValue(valuesBySiruta.get(sirutaCode));
        if (value === undefined) {
          return false;
        }

        const matchesRange = value >= lowerBound && value <= upperBound;
        return rule.operator === 'between' ? matchesRange : !matchesRange;
      },
    };
  }

  if (!isComparisonOperator(rule.operator)) {
    return {
      ok: false,
      message: `Unsupported operator ${rule.operator}.`,
    };
  }

  const comparisonValue = Number(rule.value);
  const comparisonOperator = rule.operator;

  return {
    ok: true,
    predicate: (sirutaCode) => {
      const value = normalizeVectorValue(valuesBySiruta.get(sirutaCode));
      if (value === undefined) {
        return false;
      }

      return matchesComparisonOperator(value, comparisonValue, comparisonOperator);
    },
  };
}

function evaluateStatsRule(
  rule: AdvancedMapAnalyticsStatsValueFilterRule,
  valuesBySiruta: MapSeriesVector,
  evaluationUniverse: Set<string>
): RuleEvaluationSuccess | RuleEvaluationFailure {
  const sampleEntries = collectDefinedEntries(valuesBySiruta, evaluationUniverse);

  if (sampleEntries.length === 0) {
    return {
      ok: false,
      warningType: 'value_filter_stats_no_defined_values',
      message: 'No defined values are available in the selected UAT scope.',
      details: {
        statsType: rule.statsType,
      },
    };
  }

  if (rule.statsType === 'percentile_band') {
    if (
      !Number.isFinite(rule.minPercentile) ||
      !Number.isFinite(rule.maxPercentile) ||
      rule.minPercentile < 0 ||
      rule.minPercentile > 100 ||
      rule.maxPercentile < 0 ||
      rule.maxPercentile > 100
    ) {
      return {
        ok: false,
        warningType: 'value_filter_stats_invalid_parameters',
        message: 'Percentile bounds must be finite values between 0 and 100.',
        details: {
          statsType: rule.statsType,
          minPercentile: rule.minPercentile,
          maxPercentile: rule.maxPercentile,
        },
      };
    }

    const lowerPercentile = Math.min(rule.minPercentile, rule.maxPercentile);
    const upperPercentile = Math.max(rule.minPercentile, rule.maxPercentile);
    const sortedValues = sortNumbersAscending(sampleEntries.map((entry) => entry.value));
    const lowerBound = computeNearestRankPercentile(sortedValues, lowerPercentile);
    const upperBound = computeNearestRankPercentile(sortedValues, upperPercentile);

    if (lowerBound === undefined || upperBound === undefined) {
      return {
        ok: false,
        warningType: 'value_filter_stats_no_defined_values',
        message: 'Percentile filter could not compute bounds because no defined values are available.',
        details: {
          statsType: rule.statsType,
        },
      };
    }

    const matches = new Set<string>();
    for (const entry of sampleEntries) {
      if (entry.value >= lowerBound && entry.value <= upperBound) {
        matches.add(entry.sirutaCode);
      }
    }

    return {
      ok: true,
      matches,
    };
  }

  if (rule.statsType === 'rank') {
    if (!Number.isInteger(rule.count) || rule.count <= 0) {
      return {
        ok: false,
        warningType: 'value_filter_stats_invalid_parameters',
        message: 'Rank filter count must be a positive integer.',
        details: {
          statsType: rule.statsType,
          count: rule.count,
        },
      };
    }

    const sortedEntries = [...sampleEntries].sort((left, right) => {
      const valueOrder = rule.direction === 'top'
        ? right.value - left.value
        : left.value - right.value;

      if (Math.abs(valueOrder) > EQUALITY_EPSILON) {
        return valueOrder;
      }

      return left.sirutaCode.localeCompare(right.sirutaCode);
    });

    const matches = new Set<string>();
    for (const entry of sortedEntries.slice(0, rule.count)) {
      matches.add(entry.sirutaCode);
    }

    return {
      ok: true,
      matches,
    };
  }

  if (rule.statsType === 'median_compare') {
    const sortedValues = sortNumbersAscending(sampleEntries.map((entry) => entry.value));
    const median = computeMedian(sortedValues);

    if (median === undefined) {
      return {
        ok: false,
        warningType: 'value_filter_stats_no_defined_values',
        message: 'Median could not be computed because no defined values are available.',
        details: {
          statsType: rule.statsType,
        },
      };
    }

    const matches = new Set<string>();
    for (const entry of sampleEntries) {
      if (matchesMedianMode(entry.value, median, rule.mode)) {
        matches.add(entry.sirutaCode);
      }
    }

    return {
      ok: true,
      matches,
    };
  }

  if (rule.statsType === 'zscore') {
    if (!Number.isFinite(rule.threshold)) {
      return {
        ok: false,
        warningType: 'value_filter_stats_invalid_parameters',
        message: 'Z-score threshold must be a finite number.',
        details: {
          statsType: rule.statsType,
          threshold: rule.threshold,
        },
      };
    }

    if (sampleEntries.length < 2) {
      return {
        ok: false,
        warningType: 'value_filter_stats_insufficient_sample',
        message: 'Z-score filter requires at least 2 defined values.',
        details: {
          statsType: rule.statsType,
          sampleSize: sampleEntries.length,
        },
      };
    }

    const mean = sampleEntries.reduce((accumulator, entry) => accumulator + entry.value, 0) / sampleEntries.length;
    const variance = sampleEntries.reduce((accumulator, entry) => {
      const delta = entry.value - mean;
      return accumulator + delta * delta;
    }, 0) / sampleEntries.length;

    const standardDeviation = Math.sqrt(variance);
    if (standardDeviation <= ZERO_VARIANCE_EPSILON) {
      return {
        ok: false,
        warningType: 'value_filter_stats_zero_variance',
        message: 'Z-score filter cannot run because standard deviation is zero.',
        details: {
          statsType: rule.statsType,
          sampleSize: sampleEntries.length,
        },
      };
    }

    const matches = new Set<string>();
    for (const entry of sampleEntries) {
      const zScore = (entry.value - mean) / standardDeviation;
      const isMatch = rule.mode === 'abs_gte'
        ? Math.abs(zScore) >= rule.threshold
        : rule.mode === 'gte'
          ? zScore >= rule.threshold
          : zScore <= rule.threshold;

      if (isMatch) {
        matches.add(entry.sirutaCode);
      }
    }

    return {
      ok: true,
      matches,
    };
  }

  if (rule.statsType === 'iqr_outlier') {
    if (!Number.isFinite(rule.multiplier) || rule.multiplier <= 0) {
      return {
        ok: false,
        warningType: 'value_filter_stats_invalid_parameters',
        message: 'IQR multiplier must be a positive finite number.',
        details: {
          statsType: rule.statsType,
          multiplier: rule.multiplier,
        },
      };
    }

    if (sampleEntries.length < 4) {
      return {
        ok: false,
        warningType: 'value_filter_stats_insufficient_sample',
        message: 'IQR outlier filter requires at least 4 defined values.',
        details: {
          statsType: rule.statsType,
          sampleSize: sampleEntries.length,
        },
      };
    }

    const sortedValues = sortNumbersAscending(sampleEntries.map((entry) => entry.value));
    const q1 = computeNearestRankPercentile(sortedValues, 25);
    const q3 = computeNearestRankPercentile(sortedValues, 75);

    if (q1 === undefined || q3 === undefined) {
      return {
        ok: false,
        warningType: 'value_filter_stats_no_defined_values',
        message: 'IQR outlier filter could not compute quartiles.',
        details: {
          statsType: rule.statsType,
        },
      };
    }

    const iqr = q3 - q1;
    if (Math.abs(iqr) <= ZERO_VARIANCE_EPSILON) {
      return {
        ok: false,
        warningType: 'value_filter_stats_zero_variance',
        message: 'IQR outlier filter cannot run because IQR is zero.',
        details: {
          statsType: rule.statsType,
          sampleSize: sampleEntries.length,
        },
      };
    }

    const lowerFence = q1 - rule.multiplier * iqr;
    const upperFence = q3 + rule.multiplier * iqr;

    const matches = new Set<string>();
    for (const entry of sampleEntries) {
      const lowerMatch = entry.value < lowerFence;
      const upperMatch = entry.value > upperFence;
      const isMatch = rule.side === 'both'
        ? lowerMatch || upperMatch
        : rule.side === 'lower'
          ? lowerMatch
          : upperMatch;

      if (isMatch) {
        matches.add(entry.sirutaCode);
      }
    }

    return {
      ok: true,
      matches,
    };
  }

  if (!Number.isFinite(rule.threshold) || rule.threshold < 0) {
    return {
      ok: false,
      warningType: 'value_filter_stats_invalid_parameters',
      message: 'Robust z-score threshold must be a non-negative finite number.',
      details: {
        statsType: rule.statsType,
        threshold: rule.threshold,
      },
    };
  }

  if (sampleEntries.length < 3) {
    return {
      ok: false,
      warningType: 'value_filter_stats_insufficient_sample',
      message: 'Robust z-score filter requires at least 3 defined values.',
      details: {
        statsType: rule.statsType,
        sampleSize: sampleEntries.length,
      },
    };
  }

  const sortedValues = sortNumbersAscending(sampleEntries.map((entry) => entry.value));
  const median = computeMedian(sortedValues);
  if (median === undefined) {
    return {
      ok: false,
      warningType: 'value_filter_stats_no_defined_values',
      message: 'Robust z-score filter could not compute median.',
      details: {
        statsType: rule.statsType,
      },
    };
  }

  const absoluteDeviations = sampleEntries.map((entry) => Math.abs(entry.value - median));
  const mad = computeMedian(sortNumbersAscending(absoluteDeviations));

  if (mad === undefined || mad <= ZERO_VARIANCE_EPSILON) {
    return {
      ok: false,
      warningType: 'value_filter_stats_zero_variance',
      message: 'Robust z-score filter cannot run because MAD is zero.',
      details: {
        statsType: rule.statsType,
        sampleSize: sampleEntries.length,
      },
    };
  }

  const matches = new Set<string>();
  for (const entry of sampleEntries) {
    const robustZ = ROBUST_Z_CONSISTENCY_CONSTANT * (entry.value - median) / mad;
    if (Math.abs(robustZ) >= rule.threshold) {
      matches.add(entry.sirutaCode);
    }
  }

  return {
    ok: true,
    matches,
  };
}

function collectDefinedEntries(
  valuesBySiruta: MapSeriesVector,
  evaluationUniverse: Set<string>
): Array<{ sirutaCode: string; value: number }> {
  const entries: Array<{ sirutaCode: string; value: number }> = [];

  for (const sirutaCode of evaluationUniverse) {
    const value = normalizeVectorValue(valuesBySiruta.get(sirutaCode));
    if (value === undefined) {
      continue;
    }

    entries.push({
      sirutaCode,
      value,
    });
  }

  return entries;
}

function sortNumbersAscending(values: number[]): number[] {
  return [...values].sort((left, right) => left - right);
}

function computeMedian(sortedValues: number[]): number | undefined {
  if (sortedValues.length === 0) {
    return undefined;
  }

  const middleIndex = Math.floor(sortedValues.length / 2);
  const middleValue = sortedValues[middleIndex];
  if (middleValue === undefined) {
    return undefined;
  }

  if (sortedValues.length % 2 === 0) {
    const previousValue = sortedValues[middleIndex - 1];
    if (previousValue === undefined) {
      return undefined;
    }

    return (previousValue + middleValue) / 2;
  }

  return middleValue;
}

function computeNearestRankPercentile(
  sortedValues: number[],
  percentile: number
): number | undefined {
  if (sortedValues.length === 0) {
    return undefined;
  }

  if (percentile <= 0) {
    return sortedValues[0];
  }

  if (percentile >= 100) {
    return sortedValues[sortedValues.length - 1];
  }

  const rank = Math.ceil((percentile / 100) * sortedValues.length);
  const index = Math.min(sortedValues.length - 1, Math.max(0, rank - 1));
  return sortedValues[index];
}

function matchesMedianMode(
  value: number,
  median: number,
  mode: 'gt' | 'gte' | 'lt' | 'lte'
): boolean {
  if (mode === 'gt') {
    return value > median;
  }

  if (mode === 'gte') {
    return value >= median;
  }

  if (mode === 'lt') {
    return value < median;
  }

  return value <= median;
}

function operatorHasValidParameters(
  operator: AdvancedMapAnalyticsValueFilterOperator,
  value: number | undefined,
  secondValue: number | undefined
): boolean {
  if (operator === 'is_defined' || operator === 'is_undefined') {
    return true;
  }

  if (operator === 'between' || operator === 'not_between') {
    return Number.isFinite(value) && Number.isFinite(secondValue);
  }

  return Number.isFinite(value);
}

function matchesComparisonOperator(
  value: number,
  threshold: number,
  operator: Exclude<AdvancedMapAnalyticsValueFilterOperator, 'between' | 'not_between' | 'is_defined' | 'is_undefined'>
): boolean {
  if (operator === 'gt') {
    return value > threshold;
  }

  if (operator === 'gte') {
    return value >= threshold;
  }

  if (operator === 'lt') {
    return value < threshold;
  }

  if (operator === 'lte') {
    return value <= threshold;
  }

  if (operator === 'eq') {
    return Math.abs(value - threshold) <= EQUALITY_EPSILON;
  }

  return Math.abs(value - threshold) > EQUALITY_EPSILON;
}

function isComparisonOperator(
  operator: AdvancedMapAnalyticsValueFilterOperator
): operator is Exclude<
  AdvancedMapAnalyticsValueFilterOperator,
  'between' | 'not_between' | 'is_defined' | 'is_undefined'
> {
  return (
    operator === 'gt' ||
    operator === 'gte' ||
    operator === 'lt' ||
    operator === 'lte' ||
    operator === 'eq' ||
    operator === 'neq'
  );
}

function normalizeVectorValue(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Number.isFinite(value) ? value : undefined;
}

export function applyBooleanJoin(
  current: boolean,
  next: boolean,
  joinWithPrevious: AdvancedMapAnalyticsValueRuleJoin
): boolean {
  if (joinWithPrevious === 'OR') {
    return current || next;
  }

  return current && next;
}
