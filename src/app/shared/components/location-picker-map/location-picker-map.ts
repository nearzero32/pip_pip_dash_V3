/// <reference types="google.maps" />
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { GoogleMapsLoaderService } from '../../../core/maps/google-maps-loader.service';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

const IRAQ_CENTER = { lat: 33.0, lng: 44.0 };
const COUNTRY_ZOOM = 5.4;
const POINT_ZOOM = 12;

function parseCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

@Component({
  selector: 'app-location-picker-map',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-picker-map.html',
  styleUrl: './location-picker-map.css',
})
export class LocationPickerMapComponent implements AfterViewInit, OnDestroy {
  private readonly loader = inject(GoogleMapsLoaderService);
  private readonly zone = inject(NgZone);

  readonly latitude = input<number | string | null>(null);
  readonly longitude = input<number | string | null>(null);
  readonly disabled = input(false);
  readonly searchPlaceholderKey = input('geo.mapSearch');
  readonly hintKey = input('geo.mapHint');
  readonly locationChange = output<MapPoint>();

  readonly mapReady = signal(false);
  readonly mapFailed = signal(false);
  readonly notConfigured = signal(false);
  readonly coordsLabel = computed(() => {
    const lat = parseCoord(this.latitude());
    const lng = parseCoord(this.longitude());
    if (lat == null || lng == null) return '';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  });

  private readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private autocomplete: google.maps.places.Autocomplete | null = null;
  private markerLib: google.maps.MarkerLibrary | null = null;
  private listeners: google.maps.MapsEventListener[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      const lat = parseCoord(this.latitude());
      const lng = parseCoord(this.longitude());
      this.syncMarker(lat, lng);
    });
  }

  ngAfterViewInit() {
    void this.initMap();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [];
    this.autocomplete = null;
    this.marker?.setMap(null);
    this.marker = null;
    this.map = null;
    this.markerLib = null;
  }

  preventEnterSubmit(event: Event) {
    event.preventDefault();
  }

  private async initMap() {
    try {
      await this.loader.load();
      if (this.destroyed) return;
      const [maps, places, marker] = await Promise.all([
        importLibrary('maps'),
        importLibrary('places'),
        importLibrary('marker'),
      ]);
      if (this.destroyed) return;
      this.markerLib = marker;

      const lat = parseCoord(this.latitude());
      const lng = parseCoord(this.longitude());
      const hasPoint = lat != null && lng != null;
      const host = this.mapHost().nativeElement;

      this.map = new maps.Map(host, {
        center: hasPoint ? { lat, lng } : IRAQ_CENTER,
        zoom: hasPoint ? POINT_ZOOM : COUNTRY_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });

      this.listeners.push(
        this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (this.disabled() || !event.latLng) return;
          const point = {
            latitude: this.round(event.latLng.lat()),
            longitude: this.round(event.latLng.lng()),
          };
          this.syncMarker(point.latitude, point.longitude);
          this.emitPoint(point);
        })
      );

      const searchEl = this.searchInput()?.nativeElement;
      if (searchEl) {
        this.autocomplete = new places.Autocomplete(searchEl, {
          fields: ['geometry', 'name', 'formatted_address'],
          componentRestrictions: { country: 'iq' },
        });
        this.listeners.push(
          this.autocomplete.addListener('place_changed', () => this.onPlaceChanged())
        );
      }

      this.syncMarker(lat, lng);
      this.zone.run(() => this.mapReady.set(true));
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.map) return;
        const center = this.map.getCenter();
        google.maps.event.trigger(this.map, 'resize');
        if (center) this.map.setCenter(center);
      });
      this.resizeObserver.observe(host);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      this.zone.run(() => {
        this.notConfigured.set(message === 'GOOGLE_MAPS_NOT_CONFIGURED');
        this.mapFailed.set(true);
      });
    }
  }

  private onPlaceChanged() {
    if (this.disabled()) return;
    const place = this.autocomplete?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;
    const point = { latitude: this.round(loc.lat()), longitude: this.round(loc.lng()) };
    this.syncMarker(point.latitude, point.longitude);
    this.map?.panTo({ lat: point.latitude, lng: point.longitude });
    this.map?.setZoom(POINT_ZOOM);
    this.emitPoint(point);
  }

  private syncMarker(lat: number | null, lng: number | null) {
    const map = this.map;
    const markerLib = this.markerLib;
    if (!map || !markerLib) return;

    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.marker?.setMap(null);
      this.marker = null;
      return;
    }

    const position = { lat, lng };
    if (!this.marker) {
      this.marker = new markerLib.Marker({
        map,
        position,
        draggable: !this.disabled(),
        animation: markerLib.Animation.DROP,
      });
      this.listeners.push(
        this.marker.addListener('dragend', () => {
          const pos = this.marker?.getPosition();
          if (!pos) return;
          this.emitPoint({
            latitude: this.round(pos.lat()),
            longitude: this.round(pos.lng()),
          });
        })
      );
      map.panTo(position);
      if ((map.getZoom() ?? 0) < 10) map.setZoom(POINT_ZOOM);
    } else {
      this.marker.setPosition(position);
      this.marker.setDraggable(!this.disabled());
      const bounds = map.getBounds();
      if (!bounds || !bounds.contains(position)) map.panTo(position);
    }
  }

  private emitPoint(point: MapPoint) {
    this.zone.run(() => this.locationChange.emit(point));
  }

  private round(value: number): number {
    return Math.round(value * 1e6) / 1e6;
  }
}
