import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import maplibregl, { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
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

const SOURCE_ID = 'pip-store-location-zones';
const FILL_ID = 'pip-store-location-fill';
const LINE_ID = 'pip-store-location-line';

@Component({
  selector: 'app-store-location-map',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-location-map.html',
  styleUrl: './store-location-map.css',
})
export class StoreLocationMapComponent implements AfterViewInit, OnDestroy {
  readonly activeZones = input<Zone[]>([]);
  readonly location = input<StoreLocation | null>(null);
  readonly fallbackCenter = input<MapCenter>(IRAQ_MAP_FALLBACK);
  readonly disabled = input(false);
  readonly locationChange = output<StoreLocation & { insideActive: boolean }>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: MapLibreMap | null = null;
  private marker: Marker | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onClick = (event: MapMouseEvent) => this.handleClick(event);

  constructor() {
    effect(() => {
      this.activeZones();
      this.syncSource();
      this.focusZones();
    });
    effect(() => {
      this.location();
      this.syncMarker();
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
      this.focusZones();
    });
    this.map.on('click', this.onClick);
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(host);
  }

  ngOnDestroy() {
    this.map?.off('click', this.onClick);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.marker?.remove();
    this.marker = null;
    this.map?.remove();
    this.map = null;
  }

  private handleClick(event: MapMouseEvent) {
    if (this.disabled() || !this.map) return;
    const features = this.map.queryRenderedFeatures(event.point, { layers: [FILL_ID] });
    this.locationChange.emit({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
      insideActive: features.length > 0,
    });
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
      paint: { 'fill-color': 'rgba(5, 150, 105, 0.28)' },
    });
    this.map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#059669', 'line-width': 2 },
    });
  }

  private syncSource() {
    const map = this.map;
    if (!map?.getSource(SOURCE_ID)) return;
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: this.activeZones().map(zoneToFeature),
    });
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
      this.marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      this.marker.setLngLat(lngLat);
    }
  }

  private focusZones() {
    const bounds = boundsOfZones(this.activeZones());
    if (!bounds || !this.map) return;
    this.map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 400 });
  }
}
