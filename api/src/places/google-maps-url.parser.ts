export type ParsedGoogleMapsPlace = {
  name?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

function toCoord(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse an already-expanded Google Maps URL (after redirects).
 * Returns null when no usable coordinates or place signal is found.
 */
export function parseGoogleMapsUrl(
  finalUrl: string,
): ParsedGoogleMapsPlace | null {
  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (
    !host.includes('google.') &&
    host !== 'maps.app.goo.gl' &&
    host !== 'goo.gl'
  ) {
    return null;
  }

  const result: ParsedGoogleMapsPlace = {};

  const placeMatch = url.pathname.match(/\/place\/([^/]+)/);
  if (placeMatch?.[1]) {
    result.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  const atMatch = url.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    result.lat = toCoord(atMatch[1]);
    result.lng = toCoord(atMatch[2]);
  }

  const data3d4d = url.pathname.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (data3d4d) {
    result.lat = toCoord(data3d4d[1]) ?? result.lat;
    result.lng = toCoord(data3d4d[2]) ?? result.lng;
  }

  const q = url.searchParams.get('q') ?? url.searchParams.get('query');
  if (q) {
    const qCoords = q.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (qCoords) {
      result.lat = toCoord(qCoords[1]) ?? result.lat;
      result.lng = toCoord(qCoords[2]) ?? result.lng;
    } else if (!result.name) {
      result.name = q;
    }
  }

  const ll = url.searchParams.get('ll');
  if (ll) {
    const parts = ll.split(',');
    result.lat = toCoord(parts[0]) ?? result.lat;
    result.lng = toCoord(parts[1]) ?? result.lng;
  }

  const placeId =
    url.searchParams.get('place_id') ??
    url.searchParams.get('query_place_id') ??
    undefined;
  if (placeId) {
    result.placeId = placeId;
  }

  if (
    result.lat === undefined &&
    result.lng === undefined &&
    !result.name &&
    !result.placeId
  ) {
    return null;
  }

  return result;
}
