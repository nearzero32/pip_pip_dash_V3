import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { Zone } from '../../zones/zones.models';

@Component({
  selector: 'app-store-zone-picker',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-zone-picker.html',
  styleUrl: './store-zone-picker.css',
})
export class StoreZonePickerComponent {
  readonly assignableZones = input<Zone[]>([]);
  readonly selectedIds = input<string[]>([]);
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
}
