import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/http/api.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TableComponent } from '../../../shared/components/table/table';
import { FormDialogComponent } from '../../../shared/components/form-dialog/form-dialog';
import {
  SelectControlComponent,
  SelectControlOption,
} from '../../../shared/components/select-control/select-control';
import { InputControlComponent } from '../../../shared/components/input-control/input-control';
import { DetailDialogComponent, DetailSection } from '../../../shared/components/detail-dialog/detail-dialog';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button';
import { FormField } from '../../../shared/models/form-field.interface';
import { PageStatsComponent } from '../../../shared/components/page-stats/page-stats';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { GeographyService } from '../geography/geography.service';
import { City } from '../geography/geography.models';
type Merchant = {
  accountId: string;
  phone: string;
  displayName: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  storeId: string;
  storeName: string | null;
  cityId: string;
  createdAt: string;
};
type Page = { data: Merchant[] };
type Store = { id: string; name: string };
@Component({
  selector: 'app-super-merchants',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    TableComponent,
    FormDialogComponent,
    SelectControlComponent,
    InputControlComponent,
    DetailDialogComponent,
    ExportButtonComponent,
    PageStatsComponent,
  ],
  templateUrl: './merchants.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperMerchantsComponent implements OnInit {
  private api = inject(ApiService).client;
  private geo = inject(GeographyService);
  private lang = inject(LanguageService);
  private notify = inject(NotificationService);
  readonly cities = signal<City[]>([]);
  readonly cityId = signal('');
  readonly rows = signal<Merchant[]>([]);
  readonly stores = signal<Store[]>([]);
  readonly loading = signal(false);
  readonly dialog = signal(false);
  readonly editing = signal<Merchant | null>(null);
  readonly saving = signal(false);
  readonly detailMerchant = signal<Merchant | null>(null);
  readonly mode = signal<'create' | 'edit' | 'password' | 'transfer'>('create');
  readonly search = signal('');
  readonly status = signal('ACTIVE');
  readonly columns: TableColumn[] = [
    { key: 'displayName', label: this.lang.t('merchants.name') },
    { key: 'phone', label: this.lang.t('merchants.phone') },
    { key: 'storeName', label: this.lang.t('merchants.store') },
    { key: 'status', label: this.lang.t('merchants.status'), type: 'badge' },
    { key: 'createdAt', label: this.lang.t('merchants.createdAt'), type: 'date' },
  ];
  ngOnInit() {
    void this.loadCities();
  }
  cityOptions(): readonly SelectControlOption[] {
    return this.cities().map((c) => ({ value: c.id, label: `${c.nameEn} / ${c.nameAr}` }));
  }
  statusOptions(): readonly SelectControlOption[] {
    return ['ACTIVE', 'INACTIVE', 'SUSPENDED'].map((value) => ({
      value,
      label: this.lang.t(`status.${value}`),
    }));
  }
  wizardSteps(): string[] {
    return this.mode() === 'create' || this.mode() === 'edit'
      ? [
          this.lang.t('merchants.step.basic'),
          this.lang.t('merchants.step.contact'),
          this.lang.t('merchants.step.payout'),
        ]
      : [];
  }
  fields(): FormField[] {
    if (this.mode() === 'password')
      return [
        {
          name: 'password',
          label: this.lang.t('merchants.newPassword'),
          type: 'password',
          required: true,
        },
      ];
    if (this.mode() === 'transfer')
      return [
        {
          name: 'storeId',
          label: this.lang.t('merchants.transferStore'),
          type: 'select',
          required: true,
          options: this.stores().map((s) => ({ value: s.id, label: s.name })),
        },
      ];
    const base: FormField[] = [
      { name: 'name', label: this.lang.t('merchants.ownerName'), type: 'text', required: this.mode() === 'create', step: 0 },
      { name: 'displayName', label: this.lang.t('merchants.displayName'), type: 'text', step: 0 },
      {
        name: 'status',
        label: this.lang.t('merchants.status'),
        type: 'select' as const,
        required: true,
        options: this.statusOptions(),
        step: 0,
      },
      { name: 'managerName', label: this.lang.t('merchants.managerName'), type: 'text', required: this.mode() === 'create', step: 1 },
      { name: 'managerPhone', label: this.lang.t('merchants.managerPhone'), type: 'text', required: this.mode() === 'create', step: 1 },
      { name: 'ownerPhone', label: this.lang.t('merchants.ownerPhone'), type: 'text', required: this.mode() === 'create', step: 1 },
      { name: 'restaurantSupportName', label: this.lang.t('merchants.supportName'), type: 'text', required: this.mode() === 'create', step: 1 },
      { name: 'restaurantSupportPhone', label: this.lang.t('merchants.supportPhone'), type: 'text', required: this.mode() === 'create', step: 1 },
      { name: 'payoutMethod', label: this.lang.t('merchants.payoutMethod'), type: 'select', required: this.mode() === 'create', step: 2, options: ['CASH', 'MONEY_TRANSFER', 'BANK_ACCOUNT', 'QI_CARD', 'ALQASAH_CARD', 'ZAIN_CASH', 'OTHER_CARD'].map((value) => ({ value, label: this.lang.t(`merchants.payout.${value}`) })) },
      { name: 'cashRecipientName', label: this.lang.t('merchants.cashRecipient'), type: 'text', step: 2, conditionalDisplay: (v) => v.payoutMethod === 'CASH' },
      { name: 'transferCity', label: this.lang.t('merchants.transferCity'), type: 'text', step: 2, conditionalDisplay: (v) => v.payoutMethod === 'MONEY_TRANSFER' },
      { name: 'transferRecipientName', label: this.lang.t('merchants.transferRecipient'), type: 'text', step: 2, conditionalDisplay: (v) => v.payoutMethod === 'MONEY_TRANSFER' },
      { name: 'iban', label: 'IBAN', type: 'text', step: 2, conditionalDisplay: (v) => v.payoutMethod === 'BANK_ACCOUNT' },
      { name: 'cardNumber', label: this.lang.t('merchants.cardNumber'), type: 'text', step: 2, conditionalDisplay: (v) => ['QI_CARD', 'ALQASAH_CARD', 'ZAIN_CASH', 'OTHER_CARD'].includes(v.payoutMethod) },
      { name: 'otherCardName', label: this.lang.t('merchants.otherCardName'), type: 'text', step: 2, conditionalDisplay: (v) => v.payoutMethod === 'OTHER_CARD' },
      { name: 'isAgencyAffiliate', label: this.lang.t('merchants.agencyAffiliate'), type: 'select', step: 2, options: [{ value: true, label: this.lang.t('common.yes') }, { value: false, label: this.lang.t('common.no') }] },
      { name: 'agencyName', label: this.lang.t('merchants.agencyName'), type: 'text', step: 2, conditionalDisplay: (v) => v.isAgencyAffiliate === 'true' || v.isAgencyAffiliate === true },
    ];
    return this.mode() === 'edit'
      ? base
      : [
          {
            name: 'phone',
            label: this.lang.t('merchants.phone'),
            type: 'text' as const,
            required: true,
            step: 0,
          },
          {
            name: 'password',
            label: this.lang.t('merchants.password'),
            type: 'password' as const,
            required: true,
            step: 0,
          },
          {
            name: 'storeId',
            label: this.lang.t('merchants.store'),
            type: 'select' as const,
            required: true,
            options: this.stores().map((s) => ({ value: s.id, label: s.name })),
            step: 0,
          },
          ...base,
        ];
  }
  selectCity(id: string) {
    this.cityId.set(id);
    void this.load();
  }
  setSearch(v: string) {
    this.search.set(v);
    void this.load();
  }
  setStatus(v: string) {
    this.status.set(v);
    void this.load();
  }
  create() {
    this.mode.set('create');
    this.editing.set(null);
    this.dialog.set(true);
  }
  edit(row: Merchant) {
    this.mode.set('edit');
    this.editing.set(row);
    this.dialog.set(true);
  }
  password(row: Merchant) {
    this.mode.set('password');
    this.editing.set(row);
    this.dialog.set(true);
  }
  transfer(row: Merchant) {
    this.mode.set('transfer');
    this.editing.set(row);
    this.dialog.set(true);
  }
  openDetails(row: Merchant) { this.detailMerchant.set(row); }
  detailSections(): DetailSection[] {
    const merchant = this.detailMerchant();
    if (!merchant) return [];
    return [
      { title: this.lang.t('details.merchant'), items: [{ label: this.lang.t('merchants.phone'), value: merchant.phone }, { label: this.lang.t('merchants.displayName'), value: merchant.displayName }, { label: this.lang.t('merchants.status'), value: merchant.status }] },
      { title: this.lang.t('details.store'), items: [{ label: this.lang.t('merchants.store'), value: merchant.storeName }, { label: this.lang.t('common.city'), value: this.cities().find((city) => city.id === merchant.cityId)?.nameAr ?? merchant.cityId }, { label: this.lang.t('merchants.createdAt'), value: merchant.createdAt }] },
    ];
  }
  async save(v: Record<string, unknown>) {
    if (!this.cityId()) return;
    this.saving.set(true);
    try {
      const row = this.editing();
      if (this.mode() === 'create')
        await this.api.post('/api/v1/dashboard/merchants', {
          ...v,
          cityId: this.cityId(),
          phone: String(v['phone']),
          password: String(v['password']),
          storeId: String(v['storeId']),
          displayName: String(v['displayName'] ?? '') || null,
          status: v['status'],
          // Native selects emit strings; the API contract requires a real Boolean.
          isAgencyAffiliate: v['isAgencyAffiliate'] === true || v['isAgencyAffiliate'] === 'true',
        });
      else if (row && this.mode() === 'edit')
        await this.api.patch(`/api/v1/dashboard/merchants/${row.accountId}`, {
          cityId: this.cityId(),
          displayName: String(v['displayName'] ?? '') || null,
          status: v['status'],
        });
      else if (row && this.mode() === 'password')
        await this.api.post(`/api/v1/dashboard/merchants/${row.accountId}/password`, {
          cityId: this.cityId(),
          password: String(v['password']),
        });
      else if (row)
        await this.api.post(`/api/v1/dashboard/merchants/${row.accountId}/store`, {
          cityId: this.cityId(),
          storeId: String(v['storeId']),
        });
      this.dialog.set(false);
      await this.load();
      this.notify.success(this.lang.t('common.success'));
    } catch (e) {
      this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError')));
    } finally {
      this.saving.set(false);
    }
  }
  async restore(row: Merchant) {
    try { await this.api.patch(`/api/v1/dashboard/merchants/${row.accountId}`, { cityId: row.cityId, status: 'ACTIVE' }); await this.load(); this.notify.success(this.lang.t('common.success')); }
    catch (e) { this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError'))); }
  }
  private async loadCities() {
    try {
      const cities = (await this.geo.listCities(1, 100)).data.filter((c) => c.status !== 'ARCHIVED');
      this.cities.set(cities);
      if (cities[0]) this.selectCity(cities[0].id);
    } catch (e) {
      this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError')));
    }
  }
  private async load() {
    if (!this.cityId()) return;
    this.loading.set(true);
    try {
      const [m, s] = await Promise.all([
        this.api.get<Page>('/api/v1/dashboard/merchants', {
          params: {
            cityId: this.cityId(),
            page: 1,
            limit: 100,
            ...(this.search() ? { search: this.search() } : {}),
            ...(this.status() ? { status: this.status() } : {}),
          },
        }),
        this.api.get<{ data: Store[] }>('/api/v1/super-admin/stores', {
          params: { cityId: this.cityId(), page: 1, limit: 100 },
        }),
      ]);
      this.rows.set(m.data.data);
      this.stores.set(s.data.data);
    } catch (e) {
      this.notify.error(apiErrorMessage(e, this.lang.t('common.unexpectedError')));
    } finally {
      this.loading.set(false);
    }
  }
}
