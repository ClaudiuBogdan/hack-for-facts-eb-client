import type { GeoJsonObject } from 'geojson';
import type { UatFeature } from '@/components/maps/interfaces';
import type { MapGroupWorkspace } from '@/schemas/advanced-map-analytics';

type GeoJsonCoordinate = readonly [number, number];
type BoundaryEdge = [GeoJsonCoordinate, GeoJsonCoordinate];

const GROUP_BOUNDARY_COORDINATE_PRECISION = 6;
const GROUP_BOUNDARY_OFFSET_EPSILON = 0.00001;

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

function isPointInAnyFeature(point: GeoJsonCoordinate, features: readonly UatFeature[]): boolean {
  return features.some((feature) => isPointInFeatureGeometry(point, feature));
}

function isInteriorBoundaryEdge(edge: BoundaryEdge, features: readonly UatFeature[]): boolean {
  const [start, end] = edge;
  const deltaLongitude = end[0] - start[0];
  const deltaLatitude = end[1] - start[1];
  const length = Math.hypot(deltaLongitude, deltaLatitude);
  if (length === 0) {
    return true;
  }

  const midpoint: GeoJsonCoordinate = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
  ];
  const normalLongitude = (-deltaLatitude / length) * GROUP_BOUNDARY_OFFSET_EPSILON;
  const normalLatitude = (deltaLongitude / length) * GROUP_BOUNDARY_OFFSET_EPSILON;
  const leftPoint: GeoJsonCoordinate = [
    midpoint[0] + normalLongitude,
    midpoint[1] + normalLatitude,
  ];
  const rightPoint: GeoJsonCoordinate = [
    midpoint[0] - normalLongitude,
    midpoint[1] - normalLatitude,
  ];

  return isPointInAnyFeature(leftPoint, features) && isPointInAnyFeature(rightPoint, features);
}

function collectPolygonBoundaryEdges(
  polygonCoordinates: unknown,
  boundaryEdgesByKey: Map<string, BoundaryEdge>
): void {
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

      const edgeKey = getBoundaryEdgeKey(start, end);
      if (boundaryEdgesByKey.has(edgeKey)) {
        boundaryEdgesByKey.delete(edgeKey);
      } else {
        boundaryEdgesByKey.set(edgeKey, [start, end]);
      }
    }
  }
}

function buildExteriorBoundaryFeatures(
  features: readonly UatFeature[],
  groupId: string
) {
  const boundaryEdgesByKey = new Map<string, BoundaryEdge>();

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) {
      continue;
    }

    if (geometry.type === 'Polygon') {
      collectPolygonBoundaryEdges(geometry.coordinates, boundaryEdgesByKey);
    }

    if (geometry.type === 'MultiPolygon') {
      for (const polygonCoordinates of geometry.coordinates) {
        collectPolygonBoundaryEdges(polygonCoordinates, boundaryEdgesByKey);
      }
    }
  }

  return [...boundaryEdgesByKey.values()]
    .filter((edge) => !isInteriorBoundaryEdge(edge, features))
    .map(([start, end], index) => ({
      type: 'Feature' as const,
      properties: { id: `group-boundary-${groupId}-${index}`, groupId },
      geometry: {
        type: 'LineString' as const,
        coordinates: [start, end],
      },
    }));
}

export function buildGroupWorkspaceBoundaryGeoJsonData(
  groups: readonly MapGroupWorkspace['groups'][number][],
  geoJsonFeatures: readonly UatFeature[]
): GeoJsonObject | null {
  const boundaryFeatures = groups.flatMap((group) => {
    const memberSirutaCodes = new Set(group.memberSirutaCodes);
    const features = geoJsonFeatures.filter((feature) =>
      memberSirutaCodes.has(String(feature.properties?.natcode ?? '').trim())
    );

    if (features.length === 0) {
      return [];
    }

    return buildExteriorBoundaryFeatures(features, group.id);
  });

  if (boundaryFeatures.length === 0) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: boundaryFeatures,
  } as GeoJsonObject;
}
