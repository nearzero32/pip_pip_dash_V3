import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { IRAQ_MAP_FALLBACK, MapCenter, Zone } from '../../zones/zones.models';
import { StoreMapComponent } from '../store-map/store-map';
import { StoreZonePickerComponent } from '../store-zone-picker/store-zone-picker';
import { StoreLocation } from '../stores.models';

@Component({
  selector: 'app-store-zone-assignment',
  standalone: true,
  imports: [TranslatePipe, StoreMapComponent, StoreZonePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-zone-assignment.html',
  styleUrl: './store-zone-assignment.css',
})
export class StoreZoneAssignmentComponent {
  readonly assignableZones = input<Zone[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly location = input<StoreLocation | null>(null);
  readonly fallbackCenter = input<MapCenter>(IRAQ_MAP_FALLBACK);
  readonly mapZones = input<Zone[]>([]);
  readonly mapError = input(false);
  readonly saving = input(false);
  readonly fieldError = input('');

  readonly closed = output<void>();
  readonly save = output<string[]>();
  readonly selectedChange = output<string[]>();

  readonly canSave = computed(() => this.selectedIds().length >= 1 && !this.saving());

  onSave() {
    if (this.selectedIds().length < 1) return;
    this.save.emit(this.selectedIds());
  }
}
