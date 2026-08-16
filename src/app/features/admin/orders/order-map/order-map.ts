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
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { environment } from '../../../../core/config/environment';
import { GeoPoint } from '../orders.models';

@Component({
  selector: 'app-order-map',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="order-map-shell">
      <div
        class="order-map-host"
        #mapHost
        dir="ltr"
        role="img"
        [attr.aria-label]="'orders.mapLabel' | t"
      ></div>
      <ul class="order-map-legend">
        <li><span class="swatch swatch-origin"></span>{{ 'orders.mapOrigin' | t }}</li>
        <li><span class="swatch swatch-dest"></span>{{ 'orders.mapDestination' | t }}</li>
      </ul>
    </div>
  `,
  styles: `
    .order-map-shell {
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .order-map-host {
      height: 180px;
      width: 100%;
    }
    .order-map-legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      list-style: none;
      margin: 0;
      padding: var(--space-2) var(--space-3);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }
    .swatch {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-inline-end: var(--space-1);
    }
    .swatch-origin { background: #1d4ed8; }
    .swatch-dest { background: #c2410c; }
    :host ::ng-deep .order-map-marker {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.4);
    }
    :host ::ng-deep .order-map-marker--origin { background: #1d4ed8; }
    :host ::ng-deep .order-map-marker--dest { background: #c2410c; }
  `,
})
export class OrderMapComponent implements AfterViewInit, OnDestroy {
  readonly origin = input<GeoPoint | null>(null);
  readonly destination = input<GeoPoint | null>(null);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: MapLibreMap | null = null;
  private markers: Marker[] = [];

  constructor() {
    effect(() => {
      this.origin();
      this.destination();
      this.sync();
    });
  }

  ngAfterViewInit() {
    const host = this.container().nativeElement;
    this.map = new maplibregl.Map({
      container: host,
      style: environment.mapStyleUrl,
      center: [44.3661, 33.3152],
      zoom: 11,
      attributionControl: {},
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('load', () => this.sync());
  }

  ngOnDestroy() {
    this.clearMarkers();
    this.map?.remove();
    this.map = null;
  }

  private sync() {
    if (!this.map) return;
    this.clearMarkers();
    const points: GeoPoint[] = [];
    const origin = this.origin();
    const destination = this.destination();
    if (origin) {
      points.push(origin);
      this.addMarker(origin, 'order-map-marker order-map-marker--origin');
    }
    if (destination) {
      points.push(destination);
      this.addMarker(destination, 'order-map-marker order-map-marker--dest');
    }
    if (points.length === 1) {
      const only = points[0];
      if (only) {
        this.map.setCenter([only.longitude, only.latitude]);
        this.map.setZoom(13);
      }
    } else if (points.length === 2) {
      const bounds = new maplibregl.LngLatBounds();
      for (const point of points) bounds.extend([point.longitude, point.latitude]);
      this.map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    }
  }

  private addMarker(point: GeoPoint, className: string) {
    if (!this.map) return;
    const el = document.createElement('div');
    el.className = className;
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([point.longitude, point.latitude])
      .addTo(this.map);
    this.markers.push(marker);
  }

  private clearMarkers() {
    for (const marker of this.markers) marker.remove();
    this.markers = [];
  }
}
