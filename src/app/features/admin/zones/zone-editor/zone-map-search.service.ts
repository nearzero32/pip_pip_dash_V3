import { Injectable } from '@angular/core';
import { mapTilerKey } from '../map-config';

export interface ZoneMapSearchResult {
  readonly id: string;
  readonly name: string;
  readonly context: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly bbox?: readonly [number, number, number, number];
}

@Injectable({ providedIn: 'root' })
export class ZoneMapSearchService {
  async search(query: string, signal: AbortSignal): Promise<ZoneMapSearchResult[]> {
    const key = mapTilerKey();
    if (!key) return [];
    const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`);
    url.searchParams.set('key', key);
    url.searchParams.set('limit', '6');
    url.searchParams.set('language', 'ar,en');
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('MAP_SEARCH_FAILED');
    const body: unknown = await response.json();
    const features = body && typeof body === 'object' && Array.isArray((body as { features?: unknown }).features)
      ? (body as { features: unknown[] }).features : [];
    return features.flatMap((feature): ZoneMapSearchResult[] => {
      if (!feature || typeof feature !== 'object') return [];
      const row = feature as { id?: unknown; place_name?: unknown; text?: unknown; center?: unknown; bbox?: unknown };
      if (!Array.isArray(row.center) || typeof row.center[0] !== 'number' || typeof row.center[1] !== 'number') return [];
      return [{ id: String(row.id ?? `${row.center[0]},${row.center[1]}`), name: typeof row.text === 'string' ? row.text : String(row.place_name ?? ''), context: typeof row.place_name === 'string' ? row.place_name : '', longitude: row.center[0], latitude: row.center[1], bbox: Array.isArray(row.bbox) && row.bbox.length === 4 && row.bbox.every((v) => typeof v === 'number') ? row.bbox as [number, number, number, number] : undefined }];
    });
  }
}
