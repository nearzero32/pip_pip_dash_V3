import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '../../../core/config/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loaded: Promise<void> | null = null;

  load(): Promise<void> {
    if (!environment.googleMapsApiKey.trim()) return Promise.reject(new Error('GOOGLE_MAPS_NOT_CONFIGURED'));
    if (!this.loaded) {
      setOptions({ key: environment.googleMapsApiKey.trim(), v: 'weekly', libraries: ['places'] });
      this.loaded = Promise.all([importLibrary('maps'), importLibrary('places')]).then(() => undefined);
    }
    return this.loaded;
  }
}
