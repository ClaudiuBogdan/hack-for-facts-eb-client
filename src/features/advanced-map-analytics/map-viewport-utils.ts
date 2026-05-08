export interface MapViewport {
  readonly mapZoom?: number;
  readonly mapCenter?: [number, number];
}

export function areMapCentersEqual(
  firstMapCenter: [number, number] | undefined,
  secondMapCenter: [number, number] | undefined,
): boolean {
  if (firstMapCenter === undefined && secondMapCenter === undefined) {
    return true;
  }

  if (firstMapCenter === undefined || secondMapCenter === undefined) {
    return false;
  }

  return firstMapCenter[0] === secondMapCenter[0] && firstMapCenter[1] === secondMapCenter[1];
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundMapViewport(center: [number, number], zoom: number): Required<MapViewport> {
  return {
    mapCenter: [roundTo(center[0], 5), roundTo(center[1], 5)],
    mapZoom: roundTo(zoom, 1),
  };
}

export function normalizeMapViewport(viewport: MapViewport): MapViewport {
  return {
    ...(viewport.mapCenter ? { mapCenter: [roundTo(viewport.mapCenter[0], 5), roundTo(viewport.mapCenter[1], 5)] as [number, number] } : {}),
    ...(viewport.mapZoom !== undefined ? { mapZoom: roundTo(viewport.mapZoom, 1) } : {}),
  };
}

export function areMapViewportsEqual(
  firstViewport: MapViewport | undefined,
  secondViewport: MapViewport | undefined,
): boolean {
  if (firstViewport === undefined && secondViewport === undefined) {
    return true;
  }

  if (firstViewport === undefined || secondViewport === undefined) {
    return false;
  }

  return (
    firstViewport.mapZoom === secondViewport.mapZoom &&
    areMapCentersEqual(firstViewport.mapCenter, secondViewport.mapCenter)
  );
}
