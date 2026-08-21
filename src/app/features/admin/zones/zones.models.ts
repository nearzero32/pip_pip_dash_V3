/** GeoJSON Polygon coordinates are [longitude, latitude] — never [lat, lng]. */

export type LngLatTuple = readonly [longitude: number, latitude: number];

export interface GeoJsonPolygon {
  readonly type: 'Polygon';
  readonly coordinates: number[][][];
}

export type ZoneStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Zone {
  readonly id: string;
  readonly cityId: string;
  readonly name: string;
  readonly boundary: GeoJsonPolygon;
  readonly status: ZoneStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface ZoneListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ZoneStatus;
}

export interface ZoneCreateBody {
  cityId: string;
  name: string;
  boundary: GeoJsonPolygon;
}

export interface ZoneUpdateBody {
  name?: string;
  boundary?: GeoJsonPolygon;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ZoneListPage {
  data: Zone[];
  page: number;
  limit: number;
  total: number;
}

export interface ZoneFeatureProperties {
  readonly zoneId: string;
  readonly status: ZoneStatus;
  readonly name: string;
}

export interface ZoneFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJsonPolygon;
  properties: ZoneFeatureProperties;
}

export interface MapCenter {
  longitude: number;
  latitude: number;
  zoom: number;
}

/** Iraq-wide fallback when the session city center cannot be loaded. Not Baghdad-specific. */
export const IRAQ_MAP_FALLBACK: MapCenter = {
  longitude: 44.0,
  latitude: 33.0,
  zoom: 5.4,
};

export function zoneToFeature(zone: Zone): ZoneFeature {
  return {
    type: 'Feature',
    id: zone.id,
    geometry: {
      type: 'Polygon',
      coordinates: zone.boundary.coordinates,
    },
    properties: {
      zoneId: zone.id,
      status: zone.status,
      name: zone.name,
    },
  };
}

export function closeRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [first[0], first[1]]];
}

export function toApiPolygon(coordinates: number[][][]): GeoJsonPolygon | null {
  if (!coordinates.length) return null;
  const rings = coordinates.map((ring) => closeRing(ring.map((pos) => [pos[0], pos[1]])));
  const outer = rings[0];
  if (!outer || outer.length < 4) return null;
  for (const position of outer) {
    const longitude = position[0];
    const latitude = position[1];
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  }
  return { type: 'Polygon', coordinates: rings };
}

export function boundsOfZones(zones: readonly Zone[]): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let found = false;
  for (const zone of zones) {
    for (const ring of zone.boundary.coordinates) {
      for (const position of ring) {
        const lng = position[0];
        const lat = position[1];
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        found = true;
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }
  if (!found) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
