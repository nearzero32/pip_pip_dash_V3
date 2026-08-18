import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ZonesService } from '../zones.service';
import {
  GeoJsonPolygon,
  IRAQ_MAP_FALLBACK,
  MapCenter,
  Zone,
  boundsOfZones,
  toApiPolygon,
  zoneToFeature,
} from '../zones.models';
import {
  getApiErrorMessage,
  isApiErrorCode,
} from '../../../../core/http/api-error';
import { mapStyleUrl } from '../map-config';
import { ZoneMapSearchResult, ZoneMapSearchService } from './zone-map-search.service';

type EditorTool = 'idle' | 'drawing' | 'editing';

const REF_SOURCE = 'pip-zone-refs';
const REF_FILL = 'pip-zone-refs-fill';
const REF_LINE = 'pip-zone-refs-line';
const REF_LABEL = 'pip-zone-refs-labels';

@Component({
  selector: 'app-zone-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-editor.html',
  styleUrl: './zone-editor.css',
})
export class ZoneEditorComponent implements AfterViewInit, OnDestroy {
  private language = inject(LanguageService);
  private notify = inject(NotificationService);
  private zonesApi = inject(ZonesService);
  private mapSearch = inject(ZoneMapSearchService);

  readonly zone = input<Zone | null>(null);
  readonly references = input<Zone[]>([]);
  readonly fallbackCenter = input<MapCenter>(IRAQ_MAP_FALLBACK);

  readonly closed = output<void>();
  readonly saved = output<Zone>();

  readonly name = signal('');
  readonly tool = signal<EditorTool>('idle');
  readonly saving = signal(false);
  readonly fieldError = signal<string | null>(null);
  readonly nameInvalid = signal(false);
  readonly mapReady = signal(false);
  readonly mapFailed = signal(false);
  readonly searchQuery = signal('');
  readonly searchResults = signal<ZoneMapSearchResult[]>([]);
  readonly searchLoading = signal(false);
  readonly searchError = signal(false);

  private readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('editorMap');
  private map: MapLibreMap | null = null;
  private draw: TerraDraw | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private originalBoundary: GeoJsonPolygon | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchAbort: AbortController | null = null;
  private searchRequest = 0;
  private searchMarker: maplibregl.Marker | null = null;

  ngAfterViewInit() {
    const existing = this.zone();
    this.name.set(existing?.name ?? '');
    this.originalBoundary = existing?.boundary ?? null;

    const style = mapStyleUrl();
    if (!style) {
      this.mapFailed.set(true);
      return;
    }
    const host = this.mapHost().nativeElement;
    const center = this.fallbackCenter();
    this.map = new maplibregl.Map({
      container: host,
      style,
      center: [center.longitude, center.latitude],
      zoom: center.zoom,
      attributionControl: {},
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('load', () => {
      this.mapReady.set(true);
      this.addReferenceLayers();
      this.startDraw();
      this.fitContext();
    });
    this.map.on('error', () => this.mapFailed.set(true));
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(host);
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchAbort?.abort();
    this.searchMarker?.remove();
    this.resizeObserver?.disconnect();
    this.draw?.stop();
    this.draw = null;
    this.map?.remove();
    this.map = null;
  }

  startDrawPolygon() {
    if (!this.draw) return;
    this.draw.clear();
    this.draw.setMode('polygon');
    this.tool.set('drawing');
    this.fieldError.set(null);
  }

  startEditVertices() {
    if (!this.draw) return;
    const snapshot = this.draw.getSnapshot().filter((f) => f.geometry.type === 'Polygon');
    if (snapshot.length === 0) {
      this.fieldError.set(this.language.t('zones.needBoundary'));
      return;
    }
    this.draw.setMode('select');
    const id = snapshot[0].id;
    if (id !== undefined) this.draw.selectFeature(id);
    this.tool.set('editing');
  }

  resetBoundary() {
    if (!this.draw) return;
    this.draw.clear();
    const original = this.originalBoundary;
    if (original) {
      this.addEditablePolygon(original);
      this.draw.setMode('select');
      this.tool.set('editing');
    } else {
      this.tool.set('idle');
    }
    this.fieldError.set(null);
  }

  cancel() {
    this.closed.emit();
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchError.set(false);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const query = value.trim();
    if (query.length < 3) {
      this.searchAbort?.abort();
      this.searchResults.set([]);
      this.searchLoading.set(false);
      return;
    }
    this.searchTimer = setTimeout(() => void this.runSearch(query), 350);
  }

  selectSearchResult(result: ZoneMapSearchResult) {
    this.searchResults.set([]);
    this.searchQuery.set(result.name);
    if (!this.map) return;
    this.searchMarker?.remove();
    this.searchMarker = new maplibregl.Marker({ color: '#FE5104' })
      .setLngLat([result.longitude, result.latitude])
      .addTo(this.map);
    if (result.bbox) this.map.fitBounds([[result.bbox[0], result.bbox[1]], [result.bbox[2], result.bbox[3]]], { padding: 72, maxZoom: 16, duration: 600 });
    else this.map.flyTo({ center: [result.longitude, result.latitude], zoom: 15, essential: true });
  }

  fitToZone() {
    const zone = this.zone();
    const bounds = zone ? boundsOfZones([zone]) : null;
    if (bounds && this.map) this.map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 400 });
  }

  fitToAllZones() {
    const bounds = boundsOfZones(this.references());
    if (bounds && this.map) this.map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 400 });
  }

  private async runSearch(query: string) {
    const request = ++this.searchRequest;
    this.searchAbort?.abort();
    const controller = new AbortController();
    this.searchAbort = controller;
    this.searchLoading.set(true);
    try {
      const results = await this.mapSearch.search(query, controller.signal);
      if (request !== this.searchRequest) return;
      this.searchResults.set(results);
    } catch (err) {
      if (controller.signal.aborted || request !== this.searchRequest) return;
      this.searchResults.set([]);
      this.searchError.set(true);
    } finally {
      if (request === this.searchRequest) this.searchLoading.set(false);
    }
  }

  async save() {
    const name = this.name().trim();
    this.nameInvalid.set(!name);
    const polygon = this.readPolygon();
    if (!name) {
      this.fieldError.set(this.language.t('zones.nameRequired'));
      return;
    }
    if (!polygon) {
      this.fieldError.set(this.language.t('zones.needBoundary'));
      return;
    }
    this.saving.set(true);
    this.fieldError.set(null);
    try {
      const existing = this.zone();
      const result = existing
        ? await this.zonesApi.update(existing.id, { name, boundary: polygon })
        : await this.zonesApi.create({ name, boundary: polygon });
      this.notify.success(
        this.language.t(existing ? 'zones.updated' : 'zones.created')
      );
      this.saved.emit(result);
    } catch (err) {
      if (isApiErrorCode(err, 'ZONE_BOUNDARY_OVERLAP')) {
        this.fieldError.set(this.language.t('zones.overlapError'));
      } else if (isApiErrorCode(err, 'ZONE_NAME_CONFLICT')) {
        this.fieldError.set(this.language.t('zones.nameConflict'));
        this.nameInvalid.set(true);
      } else if (isApiErrorCode(err, 'INVALID_ZONE_BOUNDARY')) {
        this.fieldError.set(this.language.t('zones.invalidBoundary'));
      } else if (isApiErrorCode(err, 'ZONE_ARCHIVED')) {
        this.fieldError.set(this.language.t('zones.archivedError'));
        this.notify.error(this.language.t('zones.archivedError'));
      } else {
        this.notify.error(
          getApiErrorMessage(err, this.language.t('common.unexpectedError'))
        );
      }
    } finally {
      this.saving.set(false);
    }
  }

  private startDraw() {
    if (!this.map || this.draw) return;
    this.draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: this.map }),
      modes: [
        new TerraDrawPolygonMode(),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: false,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
          },
        }),
      ],
    });
    this.draw.start();
    this.draw.on('finish', () => {
      this.keepSinglePolygon();
      this.draw?.setMode('select');
      this.tool.set('editing');
    });
    const existing = this.zone();
    if (existing) {
      this.addEditablePolygon(existing.boundary);
      this.draw.setMode('select');
      this.tool.set('editing');
    }
  }

  private addEditablePolygon(boundary: GeoJsonPolygon) {
    if (!this.draw) return;
    const id = this.draw.getFeatureId();
    this.draw.addFeatures([
      {
        id,
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: boundary.coordinates },
        properties: { mode: 'polygon' },
      },
    ]);
    this.draw.selectFeature(id);
  }

  private keepSinglePolygon() {
    if (!this.draw) return;
    const polygons = this.draw.getSnapshot().filter((f) => f.geometry.type === 'Polygon');
    if (polygons.length <= 1) return;
    const extras = polygons.slice(1).map((f) => f.id).filter((id): id is string | number => id != null);
    if (extras.length) this.draw.removeFeatures(extras);
  }

  private readPolygon(): GeoJsonPolygon | null {
    if (!this.draw) return null;
    const feature = this.draw.getSnapshot().find((item) => item.geometry.type === 'Polygon');
    if (!feature || feature.geometry.type !== 'Polygon') return null;
    return toApiPolygon(feature.geometry.coordinates);
  }

  private addReferenceLayers() {
    if (!this.map || this.map.getSource(REF_SOURCE)) return;
    const editingId = this.zone()?.id;
    const refs = this.references().filter((z) => z.id !== editingId);
    this.map.addSource(REF_SOURCE, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: refs.map(zoneToFeature),
      },
    });
    this.map.addLayer({
      id: REF_FILL,
      type: 'fill',
      source: REF_SOURCE,
      paint: { 'fill-color': ['match', ['get', 'status'], 'ACTIVE', 'rgba(5, 150, 105, 0.16)', 'INACTIVE', 'rgba(107, 114, 128, 0.12)', 'rgba(51, 33, 95, 0.1)'] },
    });
    this.map.addLayer({
      id: REF_LINE,
      type: 'line',
      source: REF_SOURCE,
      paint: { 'line-color': ['match', ['get', 'status'], 'ACTIVE', '#059669', 'INACTIVE', '#6B7280', '#33215F'], 'line-width': 1.5, 'line-dasharray': [2, 2] },
    });
    this.map.addLayer({ id: REF_LABEL, type: 'symbol', source: REF_SOURCE, layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Open Sans SemiBold'], 'text-allow-overlap': false }, paint: { 'text-color': '#33215F', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 } });
  }

  private fitContext() {
    const editing = this.zone();
    const refs = this.references();
    const bounds = boundsOfZones(editing ? [editing, ...refs] : refs);
    if (bounds && this.map) {
      this.map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    }
  }
}
