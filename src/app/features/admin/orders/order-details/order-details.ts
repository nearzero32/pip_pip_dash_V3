import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { LanguageService } from '../../../../i18n/language.service';
import {
  OrderAssignment,
  OrderDetail,
  OrderItemSnapshot,
  OrderLifecycleAction,
  canApprove,
  canCancel,
  canMutateOrderItems,
  canMutateOrderItemsPayment,
  isActiveAssignment,
  primaryLifecycleAction,
  secondaryLifecycleActions,
} from '../orders.models';
import { OrderMapComponent } from '../order-map/order-map';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [TranslatePipe, OrderMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.html',
  styleUrl: './order-details.css',
})
export class OrderDetailsComponent {
  private language = inject(LanguageService);

  readonly order = input.required<OrderDetail>();
  readonly storeLabel = input('');
  readonly mutating = input(false);
  readonly itemsMutateDenied = input(false);
  readonly itemsReplaceDenied = input(false);
  readonly lifecycleDenied = input(false);
  readonly catalogDenied = input(false);
  readonly closed = output<void>();
  readonly approve = output<void>();
  readonly cancel = output<void>();
  readonly addItem = output<void>();
  readonly changeQuantity = output<OrderItemSnapshot>();
  readonly removeItem = output<OrderItemSnapshot>();
  readonly replaceItem = output<OrderItemSnapshot>();
  readonly lifecycle = output<OrderLifecycleAction>();

  readonly eventsOpen = signal(false);

  readonly showMap = computed(() => {
    const pricing = this.order().deliveryPricingSnapshot;
    return !!(pricing?.origin || pricing?.destination);
  });

  readonly activeItems = computed(() =>
    this.order().items.filter((item) => item.state === 'ACTIVE')
  );
  readonly historicalItems = computed(() =>
    this.order().items.filter((item) => item.state !== 'ACTIVE')
  );

  readonly currentAssignment = computed(
    () => this.order().assignments.find((row) => isActiveAssignment(row)) ?? null
  );
  readonly pastAssignments = computed(() =>
    this.order().assignments.filter((row) => !isActiveAssignment(row))
  );

  canApproveOrder(): boolean {
    return canApprove(this.order().status);
  }

  canCancelOrder(): boolean {
    return canCancel(this.order().status);
  }

  itemsUnlocked(): boolean {
    return canMutateOrderItems(this.order().status);
  }

  paymentAllowsItems(): boolean {
    return canMutateOrderItemsPayment(this.order());
  }

  canShowItemMutations(): boolean {
    return this.itemsUnlocked() && this.paymentAllowsItems() && !this.itemsMutateDenied();
  }

  canShowReplace(): boolean {
    return this.itemsUnlocked() && this.paymentAllowsItems() && !this.itemsReplaceDenied();
  }

  canShowAdd(): boolean {
    return this.canShowItemMutations() && !this.catalogDenied();
  }

  primaryOp(): OrderLifecycleAction | null {
    return this.lifecycleDenied() ? null : primaryLifecycleAction(this.order());
  }

  secondaryOps(): OrderLifecycleAction[] {
    return this.lifecycleDenied() ? [] : secondaryLifecycleActions(this.order());
  }

  lifecycleLabel(action: OrderLifecycleAction): string {
    return this.language.t(`orders.lifecycle.${action}`);
  }

  statusLabel(status: string | null): string {
    if (!status) return '—';
    const key = `orders.status.${status}`;
    const value = this.language.t(key);
    return value === key ? status : value;
  }

  custodyLabel(status: string | null): string {
    if (!status) return '—';
    return this.language.t(`orders.custody.${status}`);
  }

  paymentMethodLabel(value: string): string {
    return this.language.t(`orders.payMethod.${value}`);
  }

  paymentStatusLabel(value: string): string {
    return this.language.t(`orders.payStatus.${value}`);
  }

  itemStateLabel(state: string): string {
    return this.language.t(`orders.item.${state}`);
  }

  actorLabel(value: string | null): string {
    if (!value) return '—';
    const key = `orders.actor.${value}`;
    const mapped = this.language.t(key);
    return mapped === key ? value : mapped;
  }

  sourceLabel(value: string | null): string {
    if (!value) return '—';
    const key = `orders.source.${value}`;
    const mapped = this.language.t(key);
    return mapped === key ? value : mapped;
  }

  proofLabel(value: string | null): string {
    if (!value) return '—';
    const key = `orders.proof.${value}`;
    const mapped = this.language.t(key);
    return mapped === key ? value : mapped;
  }

  formatIqd(amount: number): string {
    const formatted = amount.toLocaleString(this.language.lang() === 'ar' ? 'ar-IQ' : 'en-US');
    return this.language.lang() === 'ar' ? `${formatted} د.ع` : `${formatted} IQD`;
  }

  extraPrice(amount: number): string {
    if (amount === 0) return this.language.t('orders.noExtra');
    const formatted = amount.toLocaleString(this.language.lang() === 'ar' ? 'ar-IQ' : 'en-US');
    return this.language.lang() === 'ar' ? `+${formatted} د.ع` : `+${formatted} IQD`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.language.lang() === 'ar' ? 'ar' : 'en-GB');
  }

  formatDistance(meters: number | null): string {
    if (meters == null) return '—';
    if (meters >= 1000) {
      const km = Math.round(meters / 100) / 10;
      return this.language.t('orders.km', { n: km });
    }
    return this.language.t('orders.meters', { n: meters });
  }

  formatDuration(seconds: number | null): string {
    if (seconds == null) return '—';
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (mins <= 0) return this.language.t('orders.seconds', { n: rem });
    return this.language.t('orders.minutesSeconds', { m: mins, s: rem });
  }

  statusClass(status: string): string {
    if (status === 'DELIVERED') return 'badge-success';
    if (status === 'CANCELLED') return 'badge-danger';
    if (status === 'PENDING_STORE_APPROVAL') return 'badge-warning';
    return 'badge-default';
  }

  itemLine(item: OrderItemSnapshot): string {
    const size = item.selectedSizeName ? ` · ${item.selectedSizeName}` : '';
    return `${item.productName}${size}`;
  }

  driverId(row: OrderAssignment | null): string {
    return row?.driverId ?? '—';
  }
}
