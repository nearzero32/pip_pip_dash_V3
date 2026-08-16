import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import maplibregl, { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { environment } from '../../../../core/config/environment';
import { IRAQ_MAP_FALLBACK, MapCenter, Zone, boundsOfZones, zoneToFeature } from '../zones.models';

const SOURCE_ID = 'pip-zones';
const FILL_ID = 'pip-zones-fill';
const LINE_ID = 'pip-zones-line';
const SELECTED_ID = 'pip-zones-selected';

@Component({
  selector: 'app-zone-map',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-map.html',
  styleUrl: './zone-map.css',
})
export class ZoneMapComponent implements AfterViewInit, OnDestroy {
  readonly zones = input<Zone[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly previewZone = input<Zone | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly fallbackCenter = input<MapCenter>(IRAQ_MAP_FALLBACK);
  readonly selectZone = output<string>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: MapLibreMap | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private styleFailed = false;

  constructor() {
    effect(() => {
      this.zones();
      this.selectedId();
      this.previewZone();
      this.syncSource();
    });
    effect(() => {
      this.selectedId();
      this.previewZone();
      this.focusSelection();
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
      this.focusAll();
    });
    this.map.on('error', () => {
      this.styleFailed = true;
    });
    this.map.on('click', FILL_ID, (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.['zoneId'];
      if (typeof id === 'string') this.selectZone.emit(id);
    });
    this.map.on('mouseenter', FILL_ID, () => {
      this.map!.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', FILL_ID, () => {
      this.map!.getCanvas().style.cursor = '';
    });
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(host);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
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
          'match',
          ['get', 'status'],
          'ACTIVE',
          'rgba(5, 150, 105, 0.28)',
          'INACTIVE',
          'rgba(107, 114, 128, 0.22)',
          'rgba(220, 38, 38, 0.16)',
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
        'line-width': 2,
      },
    });
    this.map.addLayer({
      id: SELECTED_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['get', 'zoneId'], ''],
      paint: {
        'line-color': '#FE5104',
        'line-width': 3,
      },
    });
  }

  private visibleZones(): Zone[] {
    const preview = this.previewZone();
    const list = this.zones();
    if (preview && preview.status === 'ARCHIVED' && !list.some((z) => z.id === preview.id)) {
      return [...list, preview];
    }
    return list;
  }

  private syncSource() {
    const map = this.map;
    if (!map?.getSource(SOURCE_ID)) return;
    const features = this.visibleZones().map(zoneToFeature);
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    });
    const selected = this.selectedId() ?? '';
    if (map.getLayer(SELECTED_ID)) {
      map.setFilter(SELECTED_ID, ['==', ['get', 'zoneId'], selected]);
    }
  }

  private focusAll() {
    const bounds = boundsOfZones(this.visibleZones());
    if (!bounds || !this.map) return;
    this.map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 400 });
  }

  private focusSelection() {
    const id = this.selectedId();
    if (!id || !this.map) return;
    const zone = this.visibleZones().find((item) => item.id === id);
    if (!zone) return;
    const bounds = boundsOfZones([zone]);
    if (!bounds) return;
    this.map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 350 });
  }
}
