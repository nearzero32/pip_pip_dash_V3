import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableComponent } from '../../../shared/components/table/table';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog';
import { TableColumn } from '../../../shared/models/table-column.interface';
import { PaginationConfig } from '../../../shared/models/pagination.interface';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { downloadBlob } from '../../../core/utils/download';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiErrorCode,
} from '../../../core/http/api-error';
import { StoresService } from '../stores/stores.service';
import { Store } from '../stores/stores.models';
import { OrdersService } from './orders.service';
import { OrderDetailsComponent } from './order-details/order-details';
import { OrderCancelDialogComponent } from './order-cancel-dialog/order-cancel-dialog';
import {
  CustodyStatus,
  ORDER_STATUSES,
  OrderDetail,
  OrderListQuery,
  OrderRow,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
  PaymentStatus,
  PendingOrderCommand,
  createOrderCommandKey,
} from './orders.models';

type SortPreset = 'newest' | 'oldest' | 'totalHigh' | 'totalLow' | 'number';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    FormsModule,
    TableComponent,
    ExportButtonComponent,
    ConfirmationDialogComponent,
    TranslatePipe,
    OrderDetailsComponent,
    OrderCancelDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class OrdersComponent implements OnInit, OnDestroy {
  private api = inject(OrdersService);
  private storesApi = inject(StoresService);
  private language = inject(LanguageService);
  private notify = inject(NotificationService);

  readonly rows = signal<OrderRow[]>([]);
  readonly pagination = signal<PaginationConfig | null>(null);
  readonly isLoading = signal(true);
  readonly exporting = signal(false);
  readonly blocked = signal(false);
  readonly blockedMessage = signal('');
  readonly stores = signal<Store[]>([]);
  readonly selected = signal<OrderDetail | null>(null);
  readonly mutating = signal(false);
  readonly confirmApprove = signal(false);
  readonly cancelOpen = signal(false);

  readonly search = signal('');
  readonly statusFilter = signal<'' | OrderStatus>('');
  readonly storeFilter = signal('');
  readonly custodyFilter = signal<'' | CustodyStatus>('');
  readonly payMethodFilter = signal<'' | PaymentMethod>('');
  readonly payStatusFilter = signal<'' | PaymentStatus>('');
  readonly createdFrom = signal('');
  readonly createdTo = signal('');
  readonly hasHandoff = signal(false);
  readonly hasReturn = signal(false);
  readonly sortPreset = signal<SortPreset>('newest');
  readonly page = signal(1);
  readonly statuses = ORDER_STATUSES;

  columns: TableColumn[] = [];
  private listSeq = 0;
  private detailSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: PendingOrderCommand | null = null;

  ngOnInit() {
    this.columns = [
      { key: 'orderNumber', label: this.language.t('orders.number') },
      {
        key: 'status',
        label: this.language.t('geo.status'),
        type: 'badge',
        valueMap: Object.fromEntries(
          ORDER_STATUSES.map((status) => [status, this.language.t(`orders.status.${status}`)])
        ),
        badgeClassMap: {
          DELIVERED: 'badge-success',
          CANCELLED: 'badge-danger',
          PENDING_STORE_APPROVAL: 'badge-warning',
        },
      },
      { key: 'storeLabel', label: this.language.t('orders.store') },
      { key: 'totalLabel', label: this.language.t('orders.total') },
      { key: 'paymentLabel', label: this.language.t('orders.payment') },
      {
        key: 'custodyStatus',
        label: this.language.t('orders.custody'),
        type: 'badge',
        valueMap: {
          WITH_STORE: this.language.t('orders.custody.WITH_STORE'),
          WITH_DRIVER: this.language.t('orders.custody.WITH_DRIVER'),
          WITH_CUSTOMER: this.language.t('orders.custody.WITH_CUSTOMER'),
        },
      },
      { key: 'createdAt', label: this.language.t('geo.createdAt'), type: 'date' },
    ];
    void this.loadStores();
    void this.loadList(1);
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearchInput(value: string) {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadList(1), 350);
  }

  onFilterChange() {
    void this.loadList(1);
  }

  onSortChange(value: string) {
    if (
      value === 'newest' ||
      value === 'oldest' ||
      value === 'totalHigh' ||
      value === 'totalLow' ||
      value === 'number'
    ) {
      this.sortPreset.set(value);
      void this.loadList(1);
    }
  }

  onPageChange(page: number) {
    void this.loadList(page);
  }

  refresh() {
    void this.loadList(this.page());
    const selected = this.selected();
    if (selected) void this.openDetail(selected.id);
  }

  async onView(row: OrderRow) {
    await this.openDetail(row.id);
  }

  closeDetails() {
    this.selected.set(null);
    this.confirmApprove.set(false);
    this.cancelOpen.set(false);
  }

  requestApprove() {
    const order = this.selected();
    if (!order) return;
    this.ensurePending('approve', order.id);
    this.confirmApprove.set(true);
  }

  requestCancel() {
    const order = this.selected();
    if (!order) return;
    this.ensurePending('cancel', order.id);
    this.cancelOpen.set(true);
  }

  async runApprove() {
    const order = this.selected();
    const command = this.pending;
    if (!order || !command || command.action !== 'approve' || command.orderId !== order.id) return;
    this.mutating.set(true);
    try {
      await this.api.approve(order.id, command.idempotencyKey);
      this.pending = null;
      this.confirmApprove.set(false);
      this.notify.success(this.language.t('orders.approved'));
      await this.openDetail(order.id);
      await this.loadList(this.page());
    } catch (err) {
      this.handleCommandError(err, 'approve');
    } finally {
      this.mutating.set(false);
    }
  }

  async runCancel(body: { reason: string; note?: string }) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('cancel', order.id, body);
    this.mutating.set(true);
    try {
      await this.api.cancel(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.cancelOpen.set(false);
      this.notify.success(this.language.t('orders.cancelled'));
      await this.openDetail(order.id);
      await this.loadList(this.page());
    } catch (err) {
      this.handleCommandError(err, 'cancel');
    } finally {
      this.mutating.set(false);
    }
  }

  async exportList() {
    this.exporting.set(true);
    try {
      const blob = await this.api.exportExcel(this.currentQuery());
      downloadBlob(blob, 'orders.xlsx');
    } catch (err) {
      this.notify.error(this.mapExportError(err));
    } finally {
      this.exporting.set(false);
    }
  }

  storeLabelFor(order: OrderDetail): string {
    return this.storeName(order.storeId);
  }

  private async loadStores() {
    try {
      const collected: Store[] = [];
      let page = 1;
      for (;;) {
        const result = await this.storesApi.list({ page, limit: 100 });
        collected.push(...result.data);
        if (result.data.length < 100 || collected.length >= result.total) break;
        page += 1;
        if (page > 50) break;
      }
      this.stores.set(collected);
      this.rows.set(this.rows().map((row) => ({ ...row, storeLabel: this.storeName(row.storeId) })));
    } catch {
      this.stores.set([]);
    }
  }

  private async loadList(page: number) {
    const seq = ++this.listSeq;
    this.isLoading.set(true);
    this.page.set(page);
    try {
      const result = await this.api.list({ ...this.currentQuery(), page, limit: 20 });
      if (seq !== this.listSeq) return;
      this.blocked.set(false);
      this.rows.set(result.data.map((item) => this.toRow(item)));
      const pages = Math.max(1, Math.ceil(result.total / result.limit) || 1);
      this.pagination.set({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages,
        hasNext: result.page < pages,
        hasPrev: result.page > 1,
      });
    } catch (err) {
      if (seq !== this.listSeq) return;
      if (getApiErrorStatus(err) === 403) {
        this.blocked.set(true);
        this.blockedMessage.set(getApiErrorMessage(err, this.language.t('orders.blocked')));
        this.rows.set([]);
        this.pagination.set(null);
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    } finally {
      if (seq === this.listSeq) this.isLoading.set(false);
    }
  }

  private async openDetail(orderId: string) {
    const seq = ++this.detailSeq;
    try {
      const detail = await this.api.get(orderId);
      if (seq !== this.detailSeq) return;
      this.selected.set(detail);
    } catch (err) {
      if (seq !== this.detailSeq) return;
      if (isApiErrorCode(err, 'ORDER_NOT_FOUND') || getApiErrorStatus(err) === 404) {
        this.selected.set(null);
        this.notify.error(this.language.t('orders.notFound'));
        void this.loadList(this.page());
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
  }

  private currentQuery(): OrderListQuery {
    const sort = this.sortOf(this.sortPreset());
    return {
      search: this.search().trim() || undefined,
      status: this.statusFilter() || undefined,
      storeId: this.storeFilter() || undefined,
      custodyStatus: this.custodyFilter() || undefined,
      paymentMethod: this.payMethodFilter() || undefined,
      paymentStatus: this.payStatusFilter() || undefined,
      createdFrom: this.createdFrom() || undefined,
      createdTo: this.createdTo() || undefined,
      hasActiveHandoff: this.hasHandoff() || undefined,
      hasActiveReturn: this.hasReturn() || undefined,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
    };
  }

  private sortOf(preset: SortPreset): Pick<OrderListQuery, 'sortBy' | 'sortOrder'> {
    switch (preset) {
      case 'oldest':
        return { sortBy: 'createdAt', sortOrder: 'asc' };
      case 'totalHigh':
        return { sortBy: 'total', sortOrder: 'desc' };
      case 'totalLow':
        return { sortBy: 'total', sortOrder: 'asc' };
      case 'number':
        return { sortBy: 'orderNumber', sortOrder: 'asc' };
      default:
        return { sortBy: 'createdAt', sortOrder: 'desc' };
    }
  }

  private toRow(order: OrderSummary): OrderRow {
    const pay = `${this.language.t(`orders.payMethod.${order.paymentMethod}`)} · ${this.language.t(`orders.payStatus.${order.paymentStatus}`)}`;
    return {
      ...order,
      storeLabel: this.storeName(order.storeId),
      totalLabel: this.formatIqd(order.total),
      paymentLabel: pay,
    };
  }

  private storeName(storeId: string): string {
    const match = this.stores().find((store) => store.id === storeId);
    return match?.name ?? this.language.t('orders.storeUnavailable');
  }

  private formatIqd(amount: number): string {
    const formatted = amount.toLocaleString(this.language.lang() === 'ar' ? 'ar-IQ' : 'en-US');
    return this.language.lang() === 'ar' ? `${formatted} د.ع` : `${formatted} IQD`;
  }

  private ensurePending(
    action: PendingOrderCommand['action'],
    orderId: string,
    payload?: { reason: string; note?: string }
  ): PendingOrderCommand {
    const current = this.pending;
    const samePayload =
      !payload ||
      (current?.payload?.reason === payload.reason && current?.payload?.note === payload.note);
    if (current && current.action === action && current.orderId === orderId && samePayload) {
      return current;
    }
    const next: PendingOrderCommand = {
      action,
      orderId,
      idempotencyKey: createOrderCommandKey(),
      payload,
    };
    this.pending = next;
    return next;
  }

  private handleCommandError(err: unknown, action: 'approve' | 'cancel') {
    const status = getApiErrorStatus(err);
    const keepPending =
      status === undefined || status >= 500 || isApiErrorCode(err, 'IDEMPOTENCY_IN_PROGRESS');
    if (!keepPending && !isApiErrorCode(err, 'IDEMPOTENCY_KEY_REUSED')) {
      this.pending = null;
    }
    if (isApiErrorCode(err, 'ORDER_NOT_FOUND')) {
      this.selected.set(null);
      this.notify.error(this.language.t('orders.notFound'));
      void this.loadList(this.page());
      return;
    }
    if (isApiErrorCode(err, 'ORDER_INVALID_TRANSITION')) {
      this.notify.error(this.language.t('orders.approveStale'));
      const id = this.selected()?.id;
      if (id) void this.openDetail(id);
      this.confirmApprove.set(false);
      return;
    }
    if (
      isApiErrorCode(err, 'ORDER_CANCELLATION_NOT_ALLOWED') ||
      isApiErrorCode(err, 'ORDER_ALREADY_CANCELLED')
    ) {
      this.notify.error(this.language.t('orders.cancelStale'));
      const id = this.selected()?.id;
      if (id) void this.openDetail(id);
      return;
    }
    if (isApiErrorCode(err, 'ORDER_ONLINE_PAYMENT_NOT_CONFIRMED')) {
      this.notify.error(this.language.t('orders.onlineUnconfirmed'));
      return;
    }
    if (isApiErrorCode(err, 'DRIVER_ASSIGNMENT_REQUIRED')) {
      this.notify.error(this.language.t('orders.driverRequired'));
      const id = this.selected()?.id;
      if (id) void this.openDetail(id);
      return;
    }
    if (isApiErrorCode(err, 'DRIVER_HANDOFF_ALREADY_ACTIVE')) {
      this.notify.error(this.language.t('orders.handoffActive'));
      return;
    }
    if (isApiErrorCode(err, 'RETURN_WORKFLOW_ALREADY_ACTIVE')) {
      this.notify.error(this.language.t('orders.returnActive'));
      const id = this.selected()?.id;
      if (id) void this.openDetail(id);
      return;
    }
    if (isApiErrorCode(err, 'IDEMPOTENCY_KEY_REUSED')) {
      this.notify.error(this.language.t('orders.idempotencyReused'));
      this.pending = null;
      return;
    }
    if (isApiErrorCode(err, 'IDEMPOTENCY_IN_PROGRESS')) {
      this.notify.error(this.language.t('orders.idempotencyBusy'));
      return;
    }
    if (getApiErrorStatus(err) === 403) {
      this.notify.error(
        getApiErrorMessage(
          err,
          this.language.t(action === 'approve' ? 'orders.approveDenied' : 'orders.cancelDenied')
        )
      );
      return;
    }
    if (isApiErrorCode(err, 'VALIDATION_FAILED')) {
      this.notify.error(getApiErrorMessage(err, this.language.t('orders.invalid')));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private mapExportError(err: unknown): string {
    if (getApiErrorStatus(err) === 403) return this.language.t('orders.exportDenied');
    return getApiErrorMessage(err, this.language.t('common.unexpectedError'));
  }
}
