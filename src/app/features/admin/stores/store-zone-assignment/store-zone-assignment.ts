import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { IRAQ_MAP_FALLBACK, MapCenter, Zone } from '../../zones/zones.models';
import { StoreMapComponent } from '../store-map/store-map';
import { StoreLocation } from '../stores.models';

@Component({
  selector: 'app-store-zone-assignment',
  standalone: true,
  imports: [FormsModule, TranslatePipe, StoreMapComponent],
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

  readonly query = signal('');

  readonly filteredZones = computed(() => {
    const q = this.query().trim().toLowerCase();
    const zones = this.assignableZones();
    const visible = q
      ? zones.filter((zone) => zone.name.toLowerCase().includes(q))
      : zones;
    return [...visible].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  });

  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly canSave = computed(() => this.selectedIds().length >= 1 && !this.saving());

  isChecked(zoneId: string): boolean {
    return this.selectedIds().includes(zoneId);
  }

  toggle(zoneId: string) {
    const current = this.selectedIds();
    const next = current.includes(zoneId)
      ? current.filter((id) => id !== zoneId)
      : [...current, zoneId];
    this.selectedChange.emit(next);
  }

  onSave() {
    if (this.selectedIds().length < 1) return;
    this.save.emit(this.selectedIds());
  }
}
