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
  getApiErrorDetails,
  isApiErrorCode,
} from '../../../core/http/api-error';
import { StoresService } from '../stores/stores.service';
import { Store } from '../stores/stores.models';
import { OrdersService } from './orders.service';
import { OrderDetailsComponent } from './order-details/order-details';
import { OrderCancelDialogComponent } from './order-cancel-dialog/order-cancel-dialog';
import { OrderItemEditorComponent } from './order-item-editor/order-item-editor';
import { OrderItemQuantityDialogComponent } from './order-item-quantity-dialog/order-item-quantity-dialog';
import { OrderItemRemoveDialogComponent } from './order-item-remove-dialog/order-item-remove-dialog';
import { OrderLifecycleOverrideDialogComponent } from './order-lifecycle-override-dialog/order-lifecycle-override-dialog';
import { OrderDriverAssignmentDialogComponent } from './order-driver-assignment-dialog/order-driver-assignment-dialog';
import { OrderRemoveDriverDialogComponent } from './order-remove-driver-dialog/order-remove-driver-dialog';
import { OrderHandoffDialogComponent } from './order-handoff-dialog/order-handoff-dialog';
import { OrderReturnDialogComponent } from './order-return-dialog/order-return-dialog';
import { OrderReopenDialogComponent } from './order-reopen-dialog/order-reopen-dialog';
import {
  CustodyStatus,
  ORDER_STATUSES,
  OrderAddItemBody,
  OrderAssignDriverBody,
  OrderHandoffCompleteBody,
  OrderHandoffStartBody,
  OrderOpsSnapshot,
  OrderReasonNoteBody,
  OrderRemoveDriverBody,
  OrderReopenBody,
  OrderCommandAction,
  OrderCommandPayload,
  OrderDetail,
  OrderItemSnapshot,
  OrderLifecycleAction,
  OrderListQuery,
  OrderReplaceItemBody,
  OrderRow,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
  PaymentStatus,
  PendingOrderCommand,
  createOrderCommandKey,
} from './orders.models';

type SortPreset = 'newest' | 'oldest' | 'totalHigh' | 'totalLow' | 'number';
type RecoveryDialog =
  | 'assign'
  | 'remove'
  | 'reoffer'
  | 'handoffStart'
  | 'handoffCancel'
  | 'handoffComplete'
  | 'returnStart'
  | 'returnDriver'
  | 'returnStore'
  | 'reopen';

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
    OrderItemEditorComponent,
    OrderItemQuantityDialogComponent,
    OrderItemRemoveDialogComponent,
    OrderLifecycleOverrideDialogComponent,
    OrderDriverAssignmentDialogComponent,
    OrderRemoveDriverDialogComponent,
    OrderHandoffDialogComponent,
    OrderReturnDialogComponent,
    OrderReopenDialogComponent,
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
  readonly editorOpen = signal<'add' | 'replace' | null>(null);
  readonly editorItem = signal<OrderItemSnapshot | null>(null);
  readonly quantityItem = signal<OrderItemSnapshot | null>(null);
  readonly removeItemTarget = signal<OrderItemSnapshot | null>(null);
  readonly overrideAction = signal<OrderLifecycleAction | null>(null);
  readonly itemsMutateDenied = signal(false);
  readonly itemsReplaceDenied = signal(false);
  readonly lifecycleDenied = signal(false);
  readonly catalogDenied = signal(false);
  readonly ops = signal<OrderOpsSnapshot | null>(null);
  readonly opsLoading = signal(false);
  readonly opsUnavailable = signal(false);
  readonly assignDenied = signal(false);
  readonly reofferDenied = signal(false);
  readonly handoffDenied = signal(false);
  readonly returnDenied = signal(false);
  readonly driverNames = signal<Record<string, string>>({});
  readonly recoveryDialog = signal<RecoveryDialog | null>(null);
  readonly candidateRefresh = signal(0);
  readonly uncertain = signal(false);

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
    this.ops.set(null);
    this.confirmApprove.set(false);
    this.cancelOpen.set(false);
    this.closeMutationDialogs();
  }

  closeMutationDialogs() {
    if (this.mutating()) return;
    this.editorOpen.set(null);
    this.editorItem.set(null);
    this.quantityItem.set(null);
    this.removeItemTarget.set(null);
    this.overrideAction.set(null);
    this.recoveryDialog.set(null);
    this.uncertain.set(false);
  }

  rememberDriver(row: { id: string; name: string }) {
    this.driverNames.update((map) => ({ ...map, [row.id]: row.name }));
  }

  openAssign() {
    this.recoveryDialog.set('assign');
  }
  openRemoveDriver() {
    this.recoveryDialog.set('remove');
  }
  openReoffer() {
    this.recoveryDialog.set('reoffer');
  }
  openHandoffStart() {
    this.recoveryDialog.set('handoffStart');
  }
  openHandoffCancel() {
    this.recoveryDialog.set('handoffCancel');
  }
  openHandoffComplete() {
    this.recoveryDialog.set('handoffComplete');
  }
  openReturnStart() {
    this.recoveryDialog.set('returnStart');
  }
  openReturnDriver() {
    this.recoveryDialog.set('returnDriver');
  }
  openReturnStore() {
    this.recoveryDialog.set('returnStore');
  }
  openReopen() {
    this.recoveryDialog.set('reopen');
  }

  handoffMode(): 'start' | 'cancel' | 'complete' {
    const dialog = this.recoveryDialog();
    if (dialog === 'handoffCancel') return 'cancel';
    if (dialog === 'handoffComplete') return 'complete';
    return 'start';
  }

  returnMode(): 'start' | 'confirmDriver' | 'confirmStore' {
    const dialog = this.recoveryDialog();
    if (dialog === 'returnDriver') return 'confirmDriver';
    if (dialog === 'returnStore') return 'confirmStore';
    return 'start';
  }

  onHandoffConfirmed(body: { driverId?: string; reason: string; note?: string }) {
    const dialog = this.recoveryDialog();
    if (dialog === 'handoffStart') void this.runHandoffStart(body);
    else if (dialog === 'handoffCancel') void this.runHandoffCancel(body);
    else void this.runHandoffComplete(body);
  }

  onReturnConfirmed(body: OrderReasonNoteBody) {
    const dialog = this.recoveryDialog();
    if (dialog === 'returnStart') void this.runReturnStart(body);
    else if (dialog === 'returnDriver') void this.runReturnDriver(body);
    else void this.runReturnStore(body);
  }

  custodyDriverId(): string | null {
    return this.ops()?.custodyDriverId ?? null;
  }

  pendingHandoffId(): string | null {
    const handoff = this.ops()?.handoff;
    return handoff?.status === 'PENDING' ? handoff.id : null;
  }

  async runAssign(body: OrderAssignDriverBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('assignDriver', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.assignDriver(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.assignDone'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'assignDriver');
    } finally {
      this.mutating.set(false);
    }
  }

  async runRemoveDriver(body: OrderRemoveDriverBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('removeDriver', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.removeDriver(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.removeDone'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'removeDriver');
    } finally {
      this.mutating.set(false);
    }
  }

  async runReoffer(body: OrderReasonNoteBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('reofferAfterPickup', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.reofferAfterPickup(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.reofferDone'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'reofferAfterPickup');
    } finally {
      this.mutating.set(false);
    }
  }

  async runHandoffStart(body: { driverId?: string; reason: string; note?: string }) {
    const order = this.selected();
    if (!order || !body.driverId) return;
    const payload: OrderHandoffStartBody = {
      driverId: body.driverId,
      reason: body.reason,
      ...(body.note ? { note: body.note } : {}),
    };
    const command = this.ensurePending('handoffStart', order.id, payload);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.startHandoff(order.id, payload, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.handoffStarted'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'handoffStart');
    } finally {
      this.mutating.set(false);
    }
  }

  async runHandoffCancel(body: OrderReasonNoteBody) {
    const order = this.selected();
    const handoffId = this.pendingHandoffId();
    if (!order || !handoffId) return;
    const command = this.ensurePending('handoffCancel', order.id, body, handoffId);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.cancelHandoff(order.id, handoffId, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.handoffCancelled'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'handoffCancel');
    } finally {
      this.mutating.set(false);
    }
  }

  async runHandoffComplete(body: { reason: string; note?: string }) {
    const order = this.selected();
    const handoffId = this.pendingHandoffId();
    if (!order || !handoffId) return;
    const payload: OrderHandoffCompleteBody = {
      reason: body.reason,
      actedOnBehalfOf: 'DRIVER',
      ...(body.note ? { note: body.note } : {}),
    };
    const command = this.ensurePending('handoffComplete', order.id, payload, handoffId);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.completeHandoff(order.id, handoffId, payload, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.handoffCompleted'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'handoffComplete');
    } finally {
      this.mutating.set(false);
    }
  }

  async runReturnStart(body: OrderReasonNoteBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('returnStart', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.startReturn(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.returnStarted'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'returnStart');
    } finally {
      this.mutating.set(false);
    }
  }

  async runReturnDriver(body: OrderReasonNoteBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('returnConfirmDriver', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.confirmDriverReturn(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.returnDriverDone'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'returnConfirmDriver');
    } finally {
      this.mutating.set(false);
    }
  }

  async runReturnStore(body: OrderReasonNoteBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('returnConfirmStore', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.confirmStoreReturn(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.returnStoreDone'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'returnConfirmStore');
    } finally {
      this.mutating.set(false);
    }
  }

  async runReopen(body: OrderReopenBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('reopen', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.reopen(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.recoveryDialog.set(null);
      this.notify.success(this.language.t('orders.ops.reopenDone'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'reopen');
    } finally {
      this.mutating.set(false);
    }
  }

  openAdd() {
    this.editorItem.set(null);
    this.editorOpen.set('add');
  }

  openReplace(item: OrderItemSnapshot) {
    this.editorItem.set(item);
    this.editorOpen.set('replace');
  }

  openQuantity(item: OrderItemSnapshot) {
    this.quantityItem.set(item);
  }

  openRemove(item: OrderItemSnapshot) {
    this.removeItemTarget.set(item);
  }

  openLifecycle(action: OrderLifecycleAction) {
    this.overrideAction.set(action);
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

  onEditorSubmit(body: OrderAddItemBody | OrderReplaceItemBody) {
    if (this.editorOpen() === 'replace') {
      void this.runReplace(body);
      return;
    }
    void this.runAdd(body);
  }

  async runAdd(body: OrderAddItemBody) {
    const order = this.selected();
    if (!order) return;
    const command = this.ensurePending('itemAdd', order.id, body);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.addItem(order.id, body, command.idempotencyKey);
      this.pending = null;
      this.editorOpen.set(null);
      this.notify.success(this.language.t('orders.itemAdded'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'itemAdd');
    } finally {
      this.mutating.set(false);
    }
  }

  async runReplace(body: OrderAddItemBody | OrderReplaceItemBody) {
    const order = this.selected();
    const item = this.editorItem();
    if (!order || !item) return;
    const payload: OrderReplaceItemBody = { ...body, customerAgreedByPhone: true };
    const command = this.ensurePending('itemReplace', order.id, payload, item.id);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.replaceItem(order.id, item.id, payload, command.idempotencyKey);
      this.pending = null;
      this.editorOpen.set(null);
      this.editorItem.set(null);
      this.notify.success(this.language.t('orders.itemReplaced'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'itemReplace');
    } finally {
      this.mutating.set(false);
    }
  }

  async runQuantity(body: { quantity: number; reason: string }) {
    const order = this.selected();
    const item = this.quantityItem();
    if (!order || !item) return;
    const command = this.ensurePending('itemQuantity', order.id, body, item.id);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.changeQuantity(order.id, item.id, body, command.idempotencyKey);
      this.pending = null;
      this.quantityItem.set(null);
      this.notify.success(this.language.t('orders.quantityChanged'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'itemQuantity');
    } finally {
      this.mutating.set(false);
    }
  }

  async runRemove(body: { reason: string }) {
    const order = this.selected();
    const item = this.removeItemTarget();
    if (!order || !item) return;
    const command = this.ensurePending('itemRemove', order.id, body, item.id);
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      await this.api.removeItem(order.id, item.id, body, command.idempotencyKey);
      this.pending = null;
      this.removeItemTarget.set(null);
      this.notify.success(this.language.t('orders.itemRemoved'));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, 'itemRemove');
    } finally {
      this.mutating.set(false);
    }
  }

  async runLifecycle(body: { reason: string; note?: string; collectedAmount?: number }) {
    const order = this.selected();
    const action = this.overrideAction();
    if (!order || !action) return;
    this.mutating.set(true);
    this.uncertain.set(false);
    try {
      if (action === 'markReady') {
        const payload = {
          reason: body.reason,
          actedOnBehalfOf: 'STORE' as const,
          ...(body.note ? { note: body.note } : {}),
        };
        const command = this.ensurePending(action, order.id, payload);
        await this.api.markReady(order.id, payload, command.idempotencyKey);
      } else if (action === 'arrivalAtStore') {
        const payload = {
          reason: body.reason,
          ...(body.note ? { note: body.note } : {}),
        };
        const command = this.ensurePending(action, order.id, payload);
        await this.api.confirmArrivalAtStore(order.id, payload, command.idempotencyKey);
      } else if (action === 'pickup') {
        const payload = {
          reason: body.reason,
          actedOnBehalfOf: 'DRIVER' as const,
          ...(body.note ? { note: body.note } : {}),
        };
        const command = this.ensurePending(action, order.id, payload);
        await this.api.confirmPickup(order.id, payload, command.idempotencyKey);
      } else if (action === 'arrivalAtCustomer') {
        const payload = {
          reason: body.reason,
          actedOnBehalfOf: 'DRIVER' as const,
          ...(body.note ? { note: body.note } : {}),
        };
        const command = this.ensurePending(action, order.id, payload);
        await this.api.confirmArrivalAtCustomer(order.id, payload, command.idempotencyKey);
      } else {
        const payload = {
          collectedAmount: body.collectedAmount ?? order.expectedCollectionAmount ?? order.total,
          reason: body.reason,
          actedOnBehalfOf: 'DRIVER' as const,
          ...(body.note ? { note: body.note } : {}),
        };
        const command = this.ensurePending(action, order.id, payload);
        await this.api.confirmDelivery(order.id, payload, command.idempotencyKey);
      }
      this.pending = null;
      this.overrideAction.set(null);
      this.notify.success(this.language.t(`orders.lifecycle.${action}.done`));
      await this.refreshAfterMutation(order.id);
    } catch (err) {
      this.handleCommandError(err, action);
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
    this.opsLoading.set(true);
    const detailPromise = this.api.get(orderId);
    const opsPromise = this.api.getOps(orderId);
    try {
      const detail = await detailPromise;
      if (seq !== this.detailSeq) return;
      this.selected.set(detail);
    } catch (err) {
      if (seq !== this.detailSeq) return;
      if (isApiErrorCode(err, 'ORDER_NOT_FOUND') || getApiErrorStatus(err) === 404) {
        this.selected.set(null);
        this.ops.set(null);
        this.notify.error(this.language.t('orders.notFound'));
        void this.loadList(this.page());
        return;
      }
      this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
    }
    try {
      const ops = await opsPromise;
      if (seq !== this.detailSeq) return;
      this.ops.set(ops);
      this.opsUnavailable.set(false);
    } catch {
      if (seq !== this.detailSeq) return;
      this.ops.set(null);
      this.opsUnavailable.set(true);
    } finally {
      if (seq === this.detailSeq) this.opsLoading.set(false);
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

  private async refreshAfterMutation(orderId: string) {
    this.uncertain.set(false);
    await this.openDetail(orderId);
    await this.loadList(this.page());
  }

  private ensurePending(
    action: OrderCommandAction,
    orderId: string,
    payload?: OrderCommandPayload,
    itemId?: string
  ): PendingOrderCommand {
    const current = this.pending;
    const samePayload = JSON.stringify(current?.payload ?? null) === JSON.stringify(payload ?? null);
    if (
      current &&
      current.action === action &&
      current.orderId === orderId &&
      current.itemId === itemId &&
      samePayload
    ) {
      return current;
    }
    const next: PendingOrderCommand = {
      action,
      orderId,
      itemId,
      idempotencyKey: createOrderCommandKey(),
      payload,
    };
    this.pending = next;
    return next;
  }

  private handleCommandError(err: unknown, action: OrderCommandAction) {
    const status = getApiErrorStatus(err);
    const keepPending =
      status === undefined || status >= 500 || isApiErrorCode(err, 'IDEMPOTENCY_IN_PROGRESS');
    const pendingSnapshot = this.pending;
    if (keepPending) this.uncertain.set(true);
    if (!keepPending && !isApiErrorCode(err, 'IDEMPOTENCY_KEY_REUSED')) {
      this.pending = null;
    }
    const id = this.selected()?.id;
    const refresh = () => {
      if (id) void this.refreshAfterMutation(id);
    };
    if (isApiErrorCode(err, 'ORDER_NOT_FOUND')) {
      this.selected.set(null);
      this.notify.error(this.language.t('orders.notFound'));
      void this.loadList(this.page());
      return;
    }
    if (isApiErrorCode(err, 'ORDER_INVALID_TRANSITION') || isApiErrorCode(err, 'ORDER_INVALID_STATE')) {
      this.notify.error(this.language.t(action === 'approve' ? 'orders.approveStale' : 'orders.stateStale'));
      refresh();
      this.confirmApprove.set(false);
      return;
    }
    if (
      isApiErrorCode(err, 'ORDER_CANCELLATION_NOT_ALLOWED') ||
      isApiErrorCode(err, 'ORDER_ALREADY_CANCELLED')
    ) {
      this.notify.error(this.language.t('orders.cancelStale'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_ONLINE_PAYMENT_NOT_CONFIRMED')) {
      this.notify.error(this.language.t('orders.itemsNeedPayment'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_ITEMS_LOCKED') || isApiErrorCode(err, 'ORDER_ITEM_NOT_ACTIVE')) {
      this.notify.error(this.language.t('orders.itemsLocked'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_ITEM_NOT_FOUND') || isApiErrorCode(err, 'ORDER_ITEM_ALREADY_REPLACED')) {
      this.notify.error(this.language.t('orders.itemGone'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_ITEM_UNAVAILABLE')) {
      this.notify.error(this.language.t('orders.itemUnavailable'));
      return;
    }
    if (isApiErrorCode(err, 'INVALID_MODIFIER_SELECTION')) {
      this.notify.error(this.language.t('orders.invalidModifiers'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_SIZE_REQUIRED')) {
      this.notify.error(this.language.t('orders.sizeRequired'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_SIZE_NOT_FOUND')) {
      this.notify.error(this.language.t('orders.sizeNotFound'));
      return;
    }
    if (isApiErrorCode(err, 'PRODUCT_SIZE_NOT_APPLICABLE')) {
      this.notify.error(this.language.t('orders.sizeNotApplicable'));
      return;
    }
    if (isApiErrorCode(err, 'STORE_NOT_FOUND') || isApiErrorCode(err, 'STORE_NOT_ACCEPTING_ORDERS')) {
      this.notify.error(this.language.t('orders.storeNotAccepting'));
      return;
    }
    if (isApiErrorCode(err, 'DRIVER_ASSIGNMENT_REQUIRED')) {
      this.notify.error(this.language.t('orders.driverRequired'));
      refresh();
      return;
    }
    if (
      isApiErrorCode(err, 'ORDER_ALREADY_ASSIGNED') ||
      isApiErrorCode(err, 'OFFER_ROUND_ALREADY_OPEN') ||
      isApiErrorCode(err, 'HANDOFF_ALREADY_PENDING') ||
      isApiErrorCode(err, 'HANDOFF_NOT_FOUND') ||
      isApiErrorCode(err, 'HANDOFF_NOT_PENDING') ||
      isApiErrorCode(err, 'DRIVER_HANDOFF_CUSTODY_MISMATCH') ||
      isApiErrorCode(err, 'RETURN_WORKFLOW_REQUIRED') ||
      isApiErrorCode(err, 'ORDER_CUSTODY_NOT_WITH_DRIVER') ||
      isApiErrorCode(err, 'ORDER_CUSTODY_NOT_WITH_STORE')
    ) {
      this.notify.error(this.mapOpsError(err));
      refresh();
      return;
    }
    if (
      isApiErrorCode(err, 'DRIVER_NOT_ELIGIBLE') ||
      isApiErrorCode(err, 'DRIVER_ACTIVE_ASSIGNMENT_LIMIT_REACHED') ||
      isApiErrorCode(err, 'CITY_MISMATCH') ||
      isApiErrorCode(err, 'CITY_DRIVER_PRICING_NOT_FOUND')
    ) {
      this.notify.error(this.mapOpsError(err));
      this.candidateRefresh.update((n) => n + 1);
      return;
    }
    if (status === 429 || isApiErrorCode(err, 'RATE_LIMITED')) {
      this.notify.error(this.language.t('orders.ops.rateLimited'));
      return;
    }
    if (isApiErrorCode(err, 'DRIVER_HANDOFF_ALREADY_ACTIVE')) {
      this.notify.error(this.language.t('orders.handoffActive'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'RETURN_WORKFLOW_ALREADY_ACTIVE')) {
      this.notify.error(this.language.t('orders.returnActive'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_NOT_READY_FOR_PICKUP')) {
      this.notify.error(this.language.t('orders.notReadyPickup'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'DRIVER_HAS_NOT_ARRIVED_AT_STORE')) {
      this.notify.error(this.language.t('orders.driverNotArrived'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_DELIVERY_REQUIRES_ACTIVE_DRIVER_CUSTODY')) {
      this.notify.error(this.language.t('orders.deliveryNeedsCustody'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'DRIVER_NOT_CUSTODY_HOLDER')) {
      this.notify.error(this.language.t('orders.driverNotCustody'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'COLLECTED_AMOUNT_BELOW_EXPECTED')) {
      this.notify.error(this.collectionError(err));
      return;
    }
    if (
      isApiErrorCode(err, 'COLLECTED_AMOUNT_REQUIRED') ||
      isApiErrorCode(err, 'COLLECTED_AMOUNT_INVALID')
    ) {
      this.notify.error(this.language.t('orders.collectedInvalid'));
      return;
    }
    if (isApiErrorCode(err, 'ORDER_EXPECTED_COLLECTION_UNAVAILABLE')) {
      this.notify.error(this.language.t('orders.expectedUnavailable'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_COLLECTION_ALREADY_RECORDED')) {
      this.notify.error(this.language.t('orders.collectionExists'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'ORDER_COLLECTION_ASSIGNMENT_MISMATCH')) {
      this.notify.error(this.language.t('orders.collectionMismatch'));
      refresh();
      return;
    }
    if (isApiErrorCode(err, 'IDEMPOTENCY_KEY_REUSED')) {
      this.notify.error(this.language.t('orders.idempotencyReused16b'));
      this.pending = null;
      return;
    }
    if (isApiErrorCode(err, 'IDEMPOTENCY_IN_PROGRESS')) {
      this.notify.error(this.language.t('orders.idempotencyBusy'));
      return;
    }
    if (getApiErrorStatus(err) === 403) {
      if (action === 'itemAdd' || action === 'itemQuantity' || action === 'itemRemove') {
        this.itemsMutateDenied.set(true);
        this.notify.error(this.language.t('orders.itemsMutateDenied'));
      } else if (action === 'itemReplace') {
        this.itemsReplaceDenied.set(true);
        this.notify.error(this.language.t('orders.itemsReplaceDenied'));
      } else if (
        action === 'markReady' ||
        action === 'arrivalAtStore' ||
        action === 'pickup' ||
        action === 'arrivalAtCustomer' ||
        action === 'delivery'
      ) {
        this.lifecycleDenied.set(true);
        this.notify.error(this.language.t('orders.lifecycleDenied'));
      } else if (action === 'assignDriver') {
        this.assignDenied.set(true);
        this.notify.error(this.language.t('orders.ops.assignDenied'));
      } else if (action === 'removeDriver') {
        const payload = pendingSnapshot?.payload;
        const next = payload && 'nextAction' in payload ? payload.nextAction : null;
        if (next === 'REOFFER') {
          this.reofferDenied.set(true);
          this.notify.error(this.language.t('orders.ops.reofferDenied'));
        } else {
          this.assignDenied.set(true);
          this.notify.error(this.language.t('orders.ops.assignDenied'));
        }
      } else if (action === 'reopen') {
        const payload = pendingSnapshot?.payload;
        const next = payload && 'nextAction' in payload ? payload.nextAction : null;
        if (next === 'REOFFER') {
          this.reofferDenied.set(true);
          this.notify.error(this.language.t('orders.ops.reofferDenied'));
          return;
        }
        this.assignDenied.set(true);
        this.notify.error(this.language.t('orders.ops.assignDenied'));
      } else if (action === 'reofferAfterPickup') {
        this.reofferDenied.set(true);
        this.notify.error(this.language.t('orders.ops.reofferDenied'));
      } else if (action === 'handoffStart' || action === 'handoffCancel' || action === 'handoffComplete') {
        this.handoffDenied.set(true);
        this.notify.error(this.language.t('orders.ops.handoffDenied'));
      } else if (
        action === 'returnStart' ||
        action === 'returnConfirmDriver' ||
        action === 'returnConfirmStore'
      ) {
        this.returnDenied.set(true);
        this.notify.error(this.language.t('orders.ops.returnDenied'));
      } else {
        this.notify.error(
          getApiErrorMessage(
            err,
            this.language.t(action === 'approve' ? 'orders.approveDenied' : 'orders.cancelDenied')
          )
        );
      }
      return;
    }
    if (isApiErrorCode(err, 'VALIDATION_FAILED')) {
      this.notify.error(getApiErrorMessage(err, this.language.t('orders.invalid')));
      return;
    }
    this.notify.error(getApiErrorMessage(err, this.language.t('common.unexpectedError')));
  }

  private mapOpsError(err: unknown): string {
    if (isApiErrorCode(err, 'ORDER_ALREADY_ASSIGNED')) return this.language.t('orders.ops.alreadyAssigned');
    if (isApiErrorCode(err, 'DRIVER_NOT_ELIGIBLE')) return this.language.t('orders.ops.driverNotEligible');
    if (isApiErrorCode(err, 'DRIVER_ACTIVE_ASSIGNMENT_LIMIT_REACHED')) {
      return this.language.t('orders.ops.driverCapacity');
    }
    if (isApiErrorCode(err, 'CITY_MISMATCH')) return this.language.t('orders.ops.cityMismatch');
    if (isApiErrorCode(err, 'CITY_DRIVER_PRICING_NOT_FOUND')) return this.language.t('orders.ops.pricingMissing');
    if (isApiErrorCode(err, 'HANDOFF_NOT_FOUND') || isApiErrorCode(err, 'HANDOFF_NOT_PENDING')) {
      return this.language.t('orders.ops.handoffStale');
    }
    if (isApiErrorCode(err, 'HANDOFF_ALREADY_PENDING') || isApiErrorCode(err, 'DRIVER_HANDOFF_ALREADY_ACTIVE')) {
      return this.language.t('orders.handoffActive');
    }
    if (isApiErrorCode(err, 'RETURN_WORKFLOW_REQUIRED')) return this.language.t('orders.ops.returnRequired');
    if (isApiErrorCode(err, 'ORDER_CUSTODY_NOT_WITH_DRIVER')) return this.language.t('orders.ops.custodyNotDriver');
    if (isApiErrorCode(err, 'ORDER_CUSTODY_NOT_WITH_STORE')) return this.language.t('orders.ops.custodyNotStore');
    return getApiErrorMessage(err, this.language.t('orders.stateStale'));
  }

  private collectionError(err: unknown): string {
    const details = getApiErrorDetails(err);
    const expected = details?.['expectedCollectionAmount'];
    const collected = details?.['collectedAmount'];
    const shortfall = details?.['shortfallAmount'];
    if (expected != null && collected != null && shortfall != null) {
      return this.language.t('orders.underCollectionMeta', {
        expected: String(expected),
        collected: String(collected),
        shortfall: String(shortfall),
      });
    }
    return this.language.t('orders.underCollection');
  }

  private mapExportError(err: unknown): string {
    if (getApiErrorStatus(err) === 403) return this.language.t('orders.exportDenied');
    return getApiErrorMessage(err, this.language.t('common.unexpectedError'));
  }
}
