import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

export type HomeIcon =
  | 'globe'
  | 'city'
  | 'admins'
  | 'delivery'
  | 'pricing'
  | 'drivers'
  | 'orders'
  | 'stores'
  | 'customers'
  | 'products'
  | 'zones';

export interface HomeAction {
  readonly id: string;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly route: string;
  readonly icon: HomeIcon;
  readonly emphasis?: 'primary' | 'normal';
}

export interface HomeActionGroup {
  readonly id: string;
  readonly titleKey: string;
  readonly actions: readonly HomeAction[];
}

const SUPER_ADMIN_GROUPS: readonly HomeActionGroup[] = [
  {
    id: 'structure',
    titleKey: 'home.section.structure',
    actions: [
      {
        id: 'governorates',
        labelKey: 'nav.governorates',
        descriptionKey: 'home.action.governorates',
        route: '/governorates',
        icon: 'globe',
      },
      {
        id: 'cities',
        labelKey: 'nav.cities',
        descriptionKey: 'home.action.cities',
        route: '/cities',
        icon: 'city',
      },
      {
        id: 'city-admins',
        labelKey: 'nav.cityAdmins',
        descriptionKey: 'home.action.admins',
        route: '/city-admins',
        icon: 'admins',
      },
      {
        id: 'driver-management',
        labelKey: 'nav.drivers',
        descriptionKey: 'home.action.driverManagement',
        route: '/driver-management',
        icon: 'drivers',
      },
      {
        id: 'merchants',
        labelKey: 'nav.merchants',
        descriptionKey: 'home.action.merchants',
        route: '/merchants',
        icon: 'stores',
      },
      {
        id: 'store-commissions',
        labelKey: 'nav.storesPercentage',
        descriptionKey: 'home.action.storeCommissions',
        route: '/store-commissions',
        icon: 'pricing',
      },
    ],
  },
  {
    id: 'pricing',
    titleKey: 'home.section.pricing',
    actions: [
      {
        id: 'delivery-pricing',
        labelKey: 'nav.deliveryPricing',
        descriptionKey: 'home.action.delivery',
        route: '/delivery-pricing',
        icon: 'delivery',
      },
      {
        id: 'driver-pricing',
        labelKey: 'nav.driverPricing',
        descriptionKey: 'home.action.driverPricing',
        route: '/driver-pricing',
        icon: 'pricing',
      },
    ],
  },
];

const CITY_GROUPS: readonly HomeActionGroup[] = [
  {
    id: 'operations',
    titleKey: 'home.section.operations',
    actions: [
      {
        id: 'drivers',
        labelKey: 'nav.driversActive',
        descriptionKey: 'home.action.drivers',
        route: '/drivers',
        icon: 'drivers',
        emphasis: 'primary',
      },
      {
        id: 'orders',
        labelKey: 'nav.ordersList',
        descriptionKey: 'home.action.orders',
        route: '/orders',
        icon: 'orders',
      },
      {
        id: 'stores',
        labelKey: 'nav.storesActive',
        descriptionKey: 'home.action.stores',
        route: '/stores',
        icon: 'stores',
      },
      {
        id: 'customers',
        labelKey: 'nav.customersActive',
        descriptionKey: 'home.action.customers',
        route: '/customers',
        icon: 'customers',
      },
      {
        id: 'products',
        labelKey: 'nav.productsList',
        descriptionKey: 'home.action.products',
        route: '/products',
        icon: 'products',
      },
      {
        id: 'zones',
        labelKey: 'nav.zones',
        descriptionKey: 'home.action.zones',
        route: '/zones',
        icon: 'zones',
      },
    ],
  },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly groups = computed(() =>
    this.auth.isSuperAdmin() ? SUPER_ADMIN_GROUPS : CITY_GROUPS
  );
}
