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
