/// <reference types="google.maps" />
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { GoogleMapsLoaderService } from '../../../../core/maps/google-maps-loader.service';
import { IRAQ_MAP_FALLBACK, MapCenter, Zone } from '../zones.models';

@Component({selector:'app-zone-map',standalone:true,imports:[TranslatePipe],templateUrl:'./zone-map.html',styleUrl:'./zone-map.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class ZoneMapComponent implements AfterViewInit, OnDestroy {
  private loader=inject(GoogleMapsLoaderService); readonly zones=input<Zone[]>([]); readonly selectedId=input<string|null>(null); readonly previewZone=input<Zone|null>(null); readonly loading=input(false); readonly error=input(false); readonly fallbackCenter=input<MapCenter>(IRAQ_MAP_FALLBACK); readonly selectZone=output<string>(); readonly mapReady=signal(false); readonly mapFailed=signal(false); private host=viewChild.required<ElementRef<HTMLDivElement>>('mapHost'); private map:google.maps.Map|null=null; private polygons=new Map<string,google.maps.Polygon>();
  constructor(){effect(()=>{this.zones();this.previewZone();this.selectedId();this.sync();});effect(()=>{this.selectedId();this.focus();});}
  ngAfterViewInit(){void this.init();}
  ngOnDestroy(){for(const p of this.polygons.values())p.setMap(null);this.polygons.clear();this.map=null;}
  private async init(){try{await this.loader.load();const maps=await importLibrary('maps');const c=this.fallbackCenter();this.map=new maps.Map(this.host().nativeElement,{center:{lat:c.latitude,lng:c.longitude},zoom:c.zoom,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,clickableIcons:false,gestureHandling:'greedy'});this.mapReady.set(true);this.sync();this.fit(this.visible());}catch{this.mapFailed.set(true);}}
  private visible(){const p=this.previewZone(),z=this.zones();return p&&p.status==='ARCHIVED'&&!z.some(x=>x.id===p.id)?[...z,p]:z;}
  private sync(){if(!this.map)return;const zones=this.visible(),ids=new Set(zones.map(z=>z.id));for(const [id,p] of this.polygons){if(!ids.has(id)){p.setMap(null);this.polygons.delete(id);}}for(const z of zones){const paths=z.boundary.coordinates.map(r=>r.map(([lng,lat])=>({lat,lng})));const active=this.selectedId()===z.id;const color=z.status==='ACTIVE'?'#059669':z.status==='INACTIVE'?'#6B7280':'#DC2626';const opts={paths,fillColor:color,fillOpacity:active?.34:.22,strokeColor:active?'#FE5104':color,strokeWeight:active?4:2,clickable:true};const p=this.polygons.get(z.id);if(p){p.setPaths(paths);p.setOptions(opts);}else{const poly=new google.maps.Polygon({...opts,map:this.map});poly.addListener('click',()=>this.selectZone.emit(z.id));this.polygons.set(z.id,poly);}}}
  private focus(){const id=this.selectedId();if(id)this.fit(this.visible().filter(z=>z.id===id));}
  private fit(zones:readonly Zone[]){if(!this.map||!zones.length)return;const b=new google.maps.LatLngBounds();let any=false;for(const z of zones)for(const r of z.boundary.coordinates)for(const [lng,lat] of r){b.extend({lat,lng});any=true;}if(any)this.map.fitBounds(b,48);}
}
