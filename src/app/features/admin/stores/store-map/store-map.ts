import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { environment } from '../../../../core/config/environment';
import {
  IRAQ_MAP_FALLBACK,
  MapCenter,
  Zone,
  boundsOfZones,
  zoneToFeature,
} from '../../zones/zones.models';
import { StoreLocation } from '../stores.models';

const SOURCE_ID = 'pip-store-zones';
const FILL_ID = 'pip-store-zones-fill';
const LINE_ID = 'pip-store-zones-line';
const SERVICE_ID = 'pip-store-zones-service';

@Component({
  selector: 'app-store-map',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-map.html',
  styleUrl: './store-map.css',
})
export class StoreMapComponent implements AfterViewInit, OnDestroy {
  readonly zones = input<Zone[]>([]);
  readonly serviceZoneIds = input<string[]>([]);
  readonly location = input<StoreLocation | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly fallbackCenter = input<MapCenter>(IRAQ_MAP_FALLBACK);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: MapLibreMap | null = null;
  private marker: Marker | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.zones();
      this.serviceZoneIds();
      this.syncSource();
    });
    effect(() => {
      this.location();
      this.zones();
      this.syncMarker();
      this.focus();
    });
  }

  ngAfterViewInit() {
    const host = this.container().nativeElement;
    const center = this.fallbackCenter();
    this.map = new maplibregl.Map({
      container: host,
      style: environment.mapStyleUrl,
      center: [center.longitude, center.latitude],
      zoom: center.zoom,
      attributionControl: {},
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('load', () => {
      this.addLayers();
      this.syncSource();
      this.syncMarker();
      this.focus();
    });
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(host);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.marker?.remove();
    this.marker = null;
    this.map?.remove();
    this.map = null;
  }

  private addLayers() {
    if (!this.map || this.map.getSource(SOURCE_ID)) return;
    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: FILL_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': [
          'case',
          ['in', ['get', 'zoneId'], ['literal', this.serviceZoneIds()]],
          'rgba(254, 81, 4, 0.28)',
          [
            'match',
            ['get', 'status'],
            'ACTIVE',
            'rgba(5, 150, 105, 0.18)',
            'INACTIVE',
            'rgba(107, 114, 128, 0.14)',
            'rgba(220, 38, 38, 0.12)',
          ],
        ],
      },
    });
    this.map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': [
          'match',
          ['get', 'status'],
          'ACTIVE',
          '#059669',
          'INACTIVE',
          '#6B7280',
          '#991B1B',
        ],
        'line-width': 1.5,
      },
    });
    this.map.addLayer({
      id: SERVICE_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['in', ['get', 'zoneId'], ['literal', []]],
      paint: {
        'line-color': '#FE5104',
        'line-width': 3,
      },
    });
  }

  private syncSource() {
    const map = this.map;
    if (!map?.getSource(SOURCE_ID)) return;
    const features = this.zones().map(zoneToFeature);
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    });
    const serviceIds = this.serviceZoneIds();
    if (map.getLayer(SERVICE_ID)) {
      map.setFilter(SERVICE_ID, ['in', ['get', 'zoneId'], ['literal', serviceIds]]);
    }
    if (map.getLayer(FILL_ID)) {
      map.setPaintProperty(FILL_ID, 'fill-color', [
        'case',
        ['in', ['get', 'zoneId'], ['literal', serviceIds]],
        'rgba(254, 81, 4, 0.28)',
        [
          'match',
          ['get', 'status'],
          'ACTIVE',
          'rgba(5, 150, 105, 0.18)',
          'INACTIVE',
          'rgba(107, 114, 128, 0.14)',
          'rgba(220, 38, 38, 0.12)',
        ],
      ]);
    }
  }

  private syncMarker() {
    const map = this.map;
    const location = this.location();
    if (!map) return;
    if (!location) {
      this.marker?.remove();
      this.marker = null;
      return;
    }
    const lngLat: [number, number] = [location.longitude, location.latitude];
    if (!this.marker) {
      const el = document.createElement('div');
      el.className = 'store-map-marker';
      el.setAttribute('aria-hidden', 'true');
      this.marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      this.marker.setLngLat(lngLat);
    }
  }

  private focus() {
    const map = this.map;
    if (!map) return;
    const location = this.location();
    const serviceZones = this.zones().filter((zone) => this.serviceZoneIds().includes(zone.id));
    const bounds = boundsOfZones(serviceZones.length ? serviceZones : this.zones());
    if (location) {
      if (bounds) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 350 });
      } else {
        map.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 14,
          duration: 350,
        });
      }
      return;
    }
    if (bounds) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 350 });
    }
  }
}
