import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../shared/components/table/table';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { DriverCandidate } from './driver.models';
import { DriversService } from './drivers.service';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { getApiErrorStatus, getApiErrorMessage } from '../../../core/http/api-error';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, TableComponent, ExportButtonComponent, TranslatePipe],
  templateUrl: './drivers.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './drivers.css',
})
export class DriversComponent implements OnInit {
  private driversApi = inject(DriversService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  data = signal<DriverCandidate[]>([]);
  isLoading = signal(true);
  exporting = signal(false);
  page = signal(1);
  limit = 20;
  pagination = signal<PaginationConfig | null>(null);
  blocked = signal(false);
  blockedMessage = signal('');
  selected = signal<DriverCandidate | null>(null);

  columns: TableColumn[] = [];

  ngOnInit() {
    this.columns = [
      { key: 'driverName', label: this.language.t('drivers.name') },
      {
        key: 'workStatus',
        label: this.language.t('drivers.workStatus'),
        type: 'badge',
        valueMap: {
          AVAILABLE: this.language.t('drivers.available'),
          BUSY: this.language.t('drivers.busy'),
          OFFLINE: this.language.t('drivers.offline'),
        },
        badgeClassMap: {
          AVAILABLE: 'badge-success',
          BUSY: 'badge-warning',
          OFFLINE: 'badge-default',
        },
      },
      {
        key: 'eligibilityStatus',
        label: this.language.t('drivers.eligibility'),
        type: 'badge',
        valueMap: {
          ELIGIBLE: this.language.t('drivers.eligible'),
          INELIGIBLE: this.language.t('drivers.ineligible'),
        },
        badgeClassMap: {
          ELIGIBLE: 'badge-success',
          INELIGIBLE: 'badge-danger',
        },
      },
      { key: 'activeOrderCount', label: this.language.t('drivers.activeOrders') },
      {
        key: 'locationFreshness',
        label: this.language.t('drivers.location'),
        type: 'badge',
        valueMap: {
          FRESH: this.language.t('drivers.fresh'),
          STALE: this.language.t('drivers.stale'),
          MISSING: this.language.t('drivers.missing'),
        },
        badgeClassMap: {
          FRESH: 'badge-success',
          STALE: 'badge-warning',
          MISSING: 'badge-default',
        },
      },
    ];
    this.load();
  }

  async load(page = this.page()) {
    this.isLoading.set(true);
    this.blocked.set(false);
    try {
      const result = await this.driversApi.list(page, this.limit);
      this.data.set(result.data);
      this.page.set(result.page);
      const pages = Math.max(1, Math.ceil(result.total / result.limit));
      this.pagination.set({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      });
    } catch (err: unknown) {
      this.data.set([]);
      this.pagination.set(null);
      if (getApiErrorStatus(err) === 403) {
        this.blocked.set(true);
        this.blockedMessage.set(
          getApiErrorMessage(err, this.language.t('drivers.forbidden'))
        );
      } else {
        this.notify.error(
          getApiErrorMessage(err, this.language.t('common.unexpectedError'))
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  onPageChange(page: number) {
    this.load(page);
  }

  onView(row: DriverCandidate) {
    this.selected.set(row);
  }

  closeDetails() {
    this.selected.set(null);
  }

  async exportList() {
    this.exporting.set(true);
    try {
      const blob = await this.driversApi.exportExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'drivers.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      this.notify.error(
        getApiErrorMessage(err, this.language.t('common.unexpectedError'))
      );
    } finally {
      this.exporting.set(false);
    }
  }

  workStatusLabel(status: DriverCandidate['workStatus']): string {
    const map: Record<DriverCandidate['workStatus'], string> = {
      AVAILABLE: this.language.t('drivers.available'),
      BUSY: this.language.t('drivers.busy'),
      OFFLINE: this.language.t('drivers.offline'),
    };
    return map[status] ?? status;
  }

  eligibilityLabel(status: DriverCandidate['eligibilityStatus']): string {
    const map: Record<DriverCandidate['eligibilityStatus'], string> = {
      ELIGIBLE: this.language.t('drivers.eligible'),
      INELIGIBLE: this.language.t('drivers.ineligible'),
    };
    return map[status] ?? status;
  }
}
