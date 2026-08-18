import { environment } from '../../../core/config/environment';

/** Public, HTTP-referrer-restricted key for the Google Maps JavaScript API. */
export function googleMapsApiKey(): string | null {
  const key = environment.googleMapsApiKey.trim();
  return key || null;
}

/** Temporary compatibility export while Zone components migrate to Google Maps. */
export function mapStyleUrl(): string | null {
  return null;
}

/** Temporary compatibility export while Zone search migrates to Google Places. */
export function mapTilerKey(): string | null {
  return null;
}
