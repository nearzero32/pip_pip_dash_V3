import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import {
  PRODUCT_WEEKDAYS,
  ProductAvailabilityInput,
  ProductWeekday,
} from '../product-catalog.models';

@Component({
  selector: 'app-product-availability-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-availability-editor.html',
  styleUrl: './product-availability-editor.css',
})
export class ProductAvailabilityEditorComponent {
  private language = inject(LanguageService);

  readonly windows = input.required<ProductAvailabilityInput[]>();
  readonly disabled = input(false);
  readonly changed = output<ProductAvailabilityInput[]>();

  readonly weekdays = PRODUCT_WEEKDAYS;
  readonly groups = computed(() =>
    PRODUCT_WEEKDAYS.map((day) => ({
      day,
      items: this.windows()
        .map((window, index) => ({ window, index }))
        .filter((item) => item.window.dayOfWeek === day),
    }))
  );

  weekdayLabel(day: ProductWeekday): string {
    return this.language.t(`stores.weekday.${day}`);
  }

  addWindow(day: ProductWeekday) {
    if (this.disabled()) return;
    this.changed.emit([...this.windows(), { dayOfWeek: day, opensAt: '09:00', closesAt: '17:00' }]);
  }

  removeWindow(index: number) {
    if (this.disabled()) return;
    this.changed.emit(this.windows().filter((_, i) => i !== index));
  }

  setTime(index: number, field: 'opensAt' | 'closesAt', value: string) {
    if (this.disabled()) return;
    this.changed.emit(
      this.windows().map((window, i) => (i === index ? { ...window, [field]: value } : window))
    );
  }
}
