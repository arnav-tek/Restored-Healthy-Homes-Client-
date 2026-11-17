/** Group overlapping marker hit areas at the current zoom; at most one results page. */
export function groupMapMarkers<
  T extends { location: { longitude: number; latitude: number } },
>(
  points: readonly T[],
  project: (coordinate: [number, number]) => { x: number; y: number },
): T[][] {
  const groups: T[][] = [];
  for (const point of points) {
    const pixel = project([point.location.longitude, point.location.latitude]);
    const group = groups.find(([first]) => {
      const other = project([
        first.location.longitude,
        first.location.latitude,
      ]);
      return Math.hypot(pixel.x - other.x, pixel.y - other.y) < 44;
    });
    if (group) group.push(point);
    else groups.push([point]);
  }
  return groups;
}
