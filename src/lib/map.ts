export interface CoordinatePoint {
  lat: number;
  lng: number;
}

export interface CoordinateBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ProjectedCoordinate {
  leftPercent: number;
  topPercent: number;
}

const MIN_COORDINATE_SPAN = 0.06;
const EDGE_PADDING_PERCENT = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ensureSpan(min: number, max: number): { min: number; max: number } {
  const span = max - min;
  if (span >= MIN_COORDINATE_SPAN) {
    return { min, max };
  }

  const midpoint = (min + max) / 2;
  const halfSpan = MIN_COORDINATE_SPAN / 2;
  return {
    min: midpoint - halfSpan,
    max: midpoint + halfSpan,
  };
}

function toPercent(value: number, min: number, max: number): number {
  const span = Math.max(max - min, Number.EPSILON);
  const normalized = (value - min) / span;
  const innerWidth = 100 - EDGE_PADDING_PERCENT * 2;
  return EDGE_PADDING_PERCENT + clamp(normalized, 0, 1) * innerWidth;
}

export function getCoordinateBounds(points: CoordinatePoint[]): CoordinateBounds {
  if (!points.length) {
    return {
      minLat: 0,
      maxLat: 1,
      minLng: 0,
      maxLng: 1,
    };
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const latRange = ensureSpan(minLat, maxLat);
  const lngRange = ensureSpan(minLng, maxLng);

  return {
    minLat: latRange.min,
    maxLat: latRange.max,
    minLng: lngRange.min,
    maxLng: lngRange.max,
  };
}

export function projectCoordinate(point: CoordinatePoint, bounds: CoordinateBounds): ProjectedCoordinate {
  const leftPercent = toPercent(point.lng, bounds.minLng, bounds.maxLng);
  const latitudePercent = toPercent(point.lat, bounds.minLat, bounds.maxLat);
  const topPercent = 100 - latitudePercent;

  return {
    leftPercent: Number(leftPercent.toFixed(2)),
    topPercent: Number(topPercent.toFixed(2)),
  };
}

export function projectCoordinatePoints<T extends CoordinatePoint>(
  points: T[],
): Array<T & ProjectedCoordinate> {
  const bounds = getCoordinateBounds(points);

  return points.map((point) => ({
    ...point,
    ...projectCoordinate(point, bounds),
  }));
}
