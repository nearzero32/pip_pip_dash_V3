import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import { getApiErrorStatus } from '../../../../core/http/api-error';
import { DriversService } from '../../drivers/drivers.service';
import { DriverCandidate } from '../../drivers/driver.models';

@Component({
  selector: 'app-order-driver-picker',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-driver-picker.html',
  styleUrl: './order-driver-picker.css',
})
export class OrderDriverPickerComponent implements OnDestroy {
  private api = inject(DriversService);
  private language = inject(LanguageService);

  readonly excludeDriverId = input<string | null>(null);
  readonly selectedId = input<string | null>(null);
  readonly refreshToken = input(0);
  readonly denied = output<void>();
  readonly picked = output<DriverCandidate>();

  readonly search = signal('');
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly rows = signal<DriverCandidate[]>([]);
  readonly total = signal(0);
  readonly limit = 8;
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.search();
      this.excludeDriverId();
      this.refreshToken();
      this.schedule(1);
    });
  }

  ngOnDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  onSearch(value: string) {
    this.search.set(value);
  }

  nextPage() {
    if (this.page() * this.limit >= this.total()) return;
    void this.load(this.page() + 1);
  }

  prevPage() {
    if (this.page() <= 1) return;
    void this.load(this.page() - 1);
  }

  select(row: DriverCandidate) {
    if (row.eligibilityStatus === 'INELIGIBLE') return;
    this.picked.emit(row);
  }

  eligibility(row: DriverCandidate): string {
    return this.language.t(`orders.ops.eligibility.${row.eligibilityStatus}`);
  }

  work(row: DriverCandidate): string {
    return this.language.t(`orders.ops.work.${row.workStatus}`);
  }

  freshness(row: DriverCandidate): string {
    return this.language.t(`orders.ops.loc.${row.locationFreshness}`);
  }

  refresh() {
    void this.load(this.page());
  }

  private schedule(page: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(page), 350);
  }

  private async load(page: number) {
    const seq = ++this.seq;
    this.loading.set(true);
    this.page.set(page);
    try {
      const result = await this.api.listCandidates({
        search: this.search().trim() || undefined,
        page,
        limit: this.limit,
      });
      if (seq !== this.seq) return;
      const exclude = this.excludeDriverId();
      this.rows.set(
        exclude ? result.data.filter((row) => row.driverId !== exclude) : result.data
      );
      this.total.set(result.total);
    } catch (err) {
      if (seq !== this.seq) return;
      if (getApiErrorStatus(err) === 403) {
        this.denied.emit();
        this.rows.set([]);
        return;
      }
      this.rows.set([]);
    } finally {
      if (seq === this.seq) this.loading.set(false);
    }
  }
}
