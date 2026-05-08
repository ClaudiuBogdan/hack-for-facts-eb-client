import type { Feature, FeatureCollection, Geometry, MultiLineString } from 'geojson';
import type { UatFeature } from '@/components/maps/interfaces';
import type { MapGroup, MapGroupWorkspace } from '@/schemas/advanced-map-analytics';

type GeoJsonCoordinate = readonly [number, number];

type BoundaryEdge = {
  readonly key: string;
  readonly start: GeoJsonCoordinate;
  readonly end: GeoJsonCoordinate;
};

type GeoJsonCoordinateBounds = {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
};

type IndexedBoundaryFeature = {
  readonly sirutaCode: string;
  readonly feature: UatFeature;
  readonly bounds: GeoJsonCoordinateBounds;
  readonly edges: readonly BoundaryEdge[];
};

export type GroupBoundaryGeometryIndex = {
  readonly featuresBySirutaCode: Map<string, IndexedBoundaryFeature>;
  readonly edgeOwnersByKey: Map<string, ReadonlySet<string>>;
};

type BoundaryFeature = Feature<MultiLineString, { id: string; groupId: string }>;
export type GroupBoundaryGeoJsonData = FeatureCollection<MultiLineString, BoundaryFeature['properties']>;

const GROUP_BOUNDARY_COORDINATE_PRECISION = 6;
const GROUP_BOUNDARY_OFFSET_EPSILON = 0.00001;

const EMPTY_FEATURE_COLLECTION: FeatureCollection<Geometry, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [],
};

function isGeoJsonCoordinate(coordinate: unknown): coordinate is GeoJsonCoordinate {
  return (
    Array.isArray(coordinate) &&
    typeof coordinate[0] === 'number' &&
    Number.isFinite(coordinate[0]) &&
    typeof coordinate[1] === 'number' &&
    Number.isFinite(coordinate[1])
  );
}

function getBoundaryCoordinateKey(coordinate: GeoJsonCoordinate): string {
  const longitude = coordinate[0];
  const latitude = coordinate[1];
  return `${longitude.toFixed(GROUP_BOUNDARY_COORDINATE_PRECISION)},${latitude.toFixed(GROUP_BOUNDARY_COORDINATE_PRECISION)}`;
}

function getBoundaryEdgeKey(start: GeoJsonCoordinate, end: GeoJsonCoordinate): string {
  const startKey = getBoundaryCoordinateKey(start);
  const endKey = getBoundaryCoordinateKey(end);
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

function createEmptyBounds(): GeoJsonCoordinateBounds {
  return {
    minLongitude: Number.POSITIVE_INFINITY,
    maxLongitude: Number.NEGATIVE_INFINITY,
    minLatitude: Number.POSITIVE_INFINITY,
    maxLatitude: Number.NEGATIVE_INFINITY,
  };
}

function extendGeoJsonCoordinateBounds(value: unknown, bounds: GeoJsonCoordinateBounds): void {
  if (!Array.isArray(value)) {
    return;
  }

  if (isGeoJsonCoordinate(value)) {
    const [longitude, latitude] = value;
    bounds.minLongitude = Math.min(bounds.minLongitude, longitude);
    bounds.maxLongitude = Math.max(bounds.maxLongitude, longitude);
    bounds.minLatitude = Math.min(bounds.minLatitude, latitude);
    bounds.maxLatitude = Math.max(bounds.maxLatitude, latitude);
    return;
  }

  for (const entry of value) {
    extendGeoJsonCoordinateBounds(entry, bounds);
  }
}

function isFiniteBounds(bounds: GeoJsonCoordinateBounds): boolean {
  return (
    Number.isFinite(bounds.minLongitude) &&
    Number.isFinite(bounds.maxLongitude) &&
    Number.isFinite(bounds.minLatitude) &&
    Number.isFinite(bounds.maxLatitude)
  );
}

function doesBoundsContainPoint(
  bounds: GeoJsonCoordinateBounds,
  point: GeoJsonCoordinate,
  epsilon = 0,
): boolean {
  return (
    point[0] >= bounds.minLongitude - epsilon &&
    point[0] <= bounds.maxLongitude + epsilon &&
    point[1] >= bounds.minLatitude - epsilon &&
    point[1] <= bounds.maxLatitude + epsilon
  );
}

function isPointInRing(point: GeoJsonCoordinate, ring: readonly GeoJsonCoordinate[]): boolean {
  let isInside = false;
  const [pointX, pointY] = point;

  for (
    let currentIndex = 0, previousIndex = ring.length - 1;
    currentIndex < ring.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const [currentX, currentY] = ring[currentIndex] ?? [0, 0];
    const [previousX, previousY] = ring[previousIndex] ?? [0, 0];
    const crossesYAxis = currentY > pointY !== previousY > pointY;
    if (!crossesYAxis) {
      continue;
    }

    const intersectionX =
      ((previousX - currentX) * (pointY - currentY)) / (previousY - currentY) + currentX;
    if (pointX < intersectionX) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function isPointInPolygonCoordinates(point: GeoJsonCoordinate, polygonCoordinates: unknown): boolean {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return false;
  }

  const rings = polygonCoordinates
    .filter((ring): ring is GeoJsonCoordinate[] =>
      Array.isArray(ring) && ring.length >= 4 && ring.every(isGeoJsonCoordinate)
    );
  const outerRing = rings[0];
  if (!outerRing || !isPointInRing(point, outerRing)) {
    return false;
  }

  return !rings.slice(1).some((holeRing) => isPointInRing(point, holeRing));
}

function isPointInFeatureGeometry(point: GeoJsonCoordinate, feature: UatFeature): boolean {
  const geometry = feature.geometry;
  if (!geometry) {
    return false;
  }

  if (geometry.type === 'Polygon') {
    return isPointInPolygonCoordinates(point, geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygonCoordinates) =>
      isPointInPolygonCoordinates(point, polygonCoordinates)
    );
  }

  return false;
}

function isPointInAnyIndexedFeature(
  point: GeoJsonCoordinate,
  features: readonly IndexedBoundaryFeature[],
): boolean {
  return features.some((feature) =>
    doesBoundsContainPoint(feature.bounds, point, GROUP_BOUNDARY_OFFSET_EPSILON) &&
    isPointInFeatureGeometry(point, feature.feature)
  );
}

function getInteriorProbePoints(edge: BoundaryEdge): readonly [GeoJsonCoordinate, GeoJsonCoordinate] | null {
  const { start, end } = edge;
  const deltaLongitude = end[0] - start[0];
  const deltaLatitude = end[1] - start[1];
  const length = Math.hypot(deltaLongitude, deltaLatitude);
  if (length === 0) {
    return null;
  }

  const midpoint: GeoJsonCoordinate = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
  ];
  const normalLongitude = (-deltaLatitude / length) * GROUP_BOUNDARY_OFFSET_EPSILON;
  const normalLatitude = (deltaLongitude / length) * GROUP_BOUNDARY_OFFSET_EPSILON;

  return [
    [midpoint[0] + normalLongitude, midpoint[1] + normalLatitude],
    [midpoint[0] - normalLongitude, midpoint[1] - normalLatitude],
  ];
}

function isInteriorBoundaryEdgeByGeometry(
  edge: BoundaryEdge,
  features: readonly IndexedBoundaryFeature[],
): boolean {
  if (features.length <= 1) {
    return false;
  }

  const probePoints = getInteriorProbePoints(edge);
  if (!probePoints) {
    return true;
  }

  return (
    isPointInAnyIndexedFeature(probePoints[0], features) &&
    isPointInAnyIndexedFeature(probePoints[1], features)
  );
}

function collectPolygonBoundaryEdges(polygonCoordinates: unknown, edges: BoundaryEdge[]): void {
  if (!Array.isArray(polygonCoordinates)) {
    return;
  }

  for (const ring of polygonCoordinates) {
    if (!Array.isArray(ring) || ring.length < 2) {
      continue;
    }

    for (let index = 0; index < ring.length - 1; index += 1) {
      const start = ring[index];
      const end = ring[index + 1];
      if (!isGeoJsonCoordinate(start) || !isGeoJsonCoordinate(end)) {
        continue;
      }

      edges.push({
        key: getBoundaryEdgeKey(start, end),
        start,
        end,
      });
    }
  }
}

function collectFeatureBoundaryEdges(feature: UatFeature): readonly BoundaryEdge[] {
  const edges: BoundaryEdge[] = [];
  const geometry = feature.geometry;
  if (!geometry) {
    return edges;
  }

  if (geometry.type === 'Polygon') {
    collectPolygonBoundaryEdges(geometry.coordinates, edges);
  }

  if (geometry.type === 'MultiPolygon') {
    for (const polygonCoordinates of geometry.coordinates) {
      collectPolygonBoundaryEdges(polygonCoordinates, edges);
    }
  }

  return edges;
}

function getFeatureBounds(feature: UatFeature): GeoJsonCoordinateBounds | null {
  const geometry = feature.geometry;
  if (!geometry || !('coordinates' in geometry)) {
    return null;
  }

  const bounds = createEmptyBounds();
  extendGeoJsonCoordinateBounds(geometry.coordinates, bounds);
  return isFiniteBounds(bounds) ? bounds : null;
}

function getFeatureSirutaCode(feature: UatFeature): string {
  return String(feature.properties?.natcode ?? '').trim();
}

function addEdgeOwner(
  edgeOwnersByKey: Map<string, Set<string>>,
  edgeKey: string,
  sirutaCode: string,
): void {
  const owners = edgeOwnersByKey.get(edgeKey);
  if (owners) {
    owners.add(sirutaCode);
    return;
  }

  edgeOwnersByKey.set(edgeKey, new Set([sirutaCode]));
}

export function buildGroupBoundaryGeometryIndex(
  geoJsonFeatures: readonly UatFeature[],
): GroupBoundaryGeometryIndex {
  const featuresBySirutaCode = new Map<string, IndexedBoundaryFeature>();
  const edgeOwnersByKey = new Map<string, Set<string>>();

  for (const feature of geoJsonFeatures) {
    const sirutaCode = getFeatureSirutaCode(feature);
    if (!sirutaCode) {
      continue;
    }

    const bounds = getFeatureBounds(feature);
    if (!bounds) {
      continue;
    }

    const indexedFeature: IndexedBoundaryFeature = {
      sirutaCode,
      feature,
      bounds,
      edges: collectFeatureBoundaryEdges(feature),
    };

    featuresBySirutaCode.set(sirutaCode, indexedFeature);

    for (const edge of indexedFeature.edges) {
      addEdgeOwner(edgeOwnersByKey, edge.key, sirutaCode);
    }
  }

  return {
    featuresBySirutaCode,
    edgeOwnersByKey,
  };
}

function getGroupMemberFeatures(
  group: MapGroup,
  index: GroupBoundaryGeometryIndex,
): readonly IndexedBoundaryFeature[] {
  return group.memberSirutaCodes
    .map((sirutaCode) => index.featuresBySirutaCode.get(sirutaCode))
    .filter((feature): feature is IndexedBoundaryFeature => Boolean(feature));
}

function isEdgeInternalByOwnerSet(
  edge: BoundaryEdge,
  memberSirutaCodes: ReadonlySet<string>,
  index: GroupBoundaryGeometryIndex,
): boolean {
  const owners = index.edgeOwnersByKey.get(edge.key);
  if (!owners || owners.size <= 1) {
    return false;
  }

  for (const owner of owners) {
    if (!memberSirutaCodes.has(owner)) {
      return false;
    }
  }

  return true;
}

function buildGroupBoundaryFeature(
  group: MapGroup,
  index: GroupBoundaryGeometryIndex,
): BoundaryFeature | null {
  const memberSirutaCodes = new Set(group.memberSirutaCodes);
  const memberFeatures = getGroupMemberFeatures(group, index);
  if (memberFeatures.length === 0) {
    return null;
  }

  const exteriorEdges: BoundaryEdge[] = [];
  const emittedEdgeKeys = new Set<string>();

  for (const feature of memberFeatures) {
    for (const edge of feature.edges) {
      if (emittedEdgeKeys.has(edge.key)) {
        continue;
      }

      if (isEdgeInternalByOwnerSet(edge, memberSirutaCodes, index)) {
        emittedEdgeKeys.add(edge.key);
        continue;
      }

      if (isInteriorBoundaryEdgeByGeometry(edge, memberFeatures)) {
        emittedEdgeKeys.add(edge.key);
        continue;
      }

      exteriorEdges.push(edge);
      emittedEdgeKeys.add(edge.key);
    }
  }

  if (exteriorEdges.length === 0) {
    return null;
  }

  return {
    type: 'Feature',
    properties: {
      id: `group-boundary-${group.id}`,
      groupId: group.id,
    },
    geometry: {
      type: 'MultiLineString',
      coordinates: exteriorEdges.map((edge) => [
        [edge.start[0], edge.start[1]],
        [edge.end[0], edge.end[1]],
      ]),
    },
  };
}

export function buildMapGroupBoundaryGeoJsonDataFromIndex(
  group: MapGroup,
  index: GroupBoundaryGeometryIndex,
): GroupBoundaryGeoJsonData | null {
  const feature = buildGroupBoundaryFeature(group, index);
  if (!feature) {
    return null;
  }

  const boundaryData: GroupBoundaryGeoJsonData = {
    type: 'FeatureCollection',
    features: [feature],
  };
  return boundaryData;
}

export function buildGroupWorkspaceBoundaryGeoJsonDataFromIndex(
  groups: readonly MapGroup[],
  index: GroupBoundaryGeometryIndex,
): GroupBoundaryGeoJsonData | null {
  const boundaryFeatures = groups
    .map((group) => buildGroupBoundaryFeature(group, index))
    .filter((feature): feature is BoundaryFeature => Boolean(feature));

  if (boundaryFeatures.length === 0) {
    return null;
  }

  const boundaryData: GroupBoundaryGeoJsonData = {
    type: 'FeatureCollection',
    features: boundaryFeatures,
  };
  return boundaryData;
}

export function buildMapGroupBoundaryGeoJsonData(
  group: MapGroup,
  geoJsonFeatures: readonly UatFeature[],
): GroupBoundaryGeoJsonData | null {
  return buildMapGroupBoundaryGeoJsonDataFromIndex(
    group,
    buildGroupBoundaryGeometryIndex(geoJsonFeatures),
  );
}

export function buildGroupWorkspaceBoundaryGeoJsonData(
  groups: readonly MapGroupWorkspace['groups'][number][],
  geoJsonFeatures: readonly UatFeature[],
): GroupBoundaryGeoJsonData | null {
  return buildGroupWorkspaceBoundaryGeoJsonDataFromIndex(
    groups,
    buildGroupBoundaryGeometryIndex(geoJsonFeatures),
  );
}

export function buildMapGroupBoundaryKey(group: MapGroup | undefined): string | null {
  if (!group) {
    return null;
  }

  return `${group.id}:${[...new Set(group.memberSirutaCodes)].sort().join(',')}`;
}

export function buildGroupWorkspaceBoundaryKey(
  workspace: Pick<MapGroupWorkspace, 'id' | 'groups'> | undefined,
): string | null {
  if (!workspace) {
    return null;
  }

  return [
    workspace.id,
    ...workspace.groups
      .map((group) => buildMapGroupBoundaryKey(group))
      .filter((key): key is string => Boolean(key))
      .sort(),
  ].join('|');
}

export function emptyGroupBoundaryFeatureCollection(): FeatureCollection<Geometry, Record<string, unknown>> {
  return EMPTY_FEATURE_COLLECTION;
}
