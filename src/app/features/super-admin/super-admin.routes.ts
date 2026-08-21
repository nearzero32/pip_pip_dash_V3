import { Routes } from '@angular/router';
import { superAdminGuard } from '../../core/auth/auth.guard';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: 'zones',
    loadComponent: () => import('../admin/zones/zones').then((m) => m.ZonesComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.zones' },
  },
  {
    path: 'governorates',
    loadComponent: () =>
      import('./geography/governorates/governorates').then((m) => m.GovernoratesComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.governorates' },
  },
  {
    path: 'cities',
    loadComponent: () =>
      import('./geography/cities/cities').then((m) => m.CitiesComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.cities' },
  },
  {
    path: 'city-admins',
    loadComponent: () =>
      import('./city-admins/city-admins').then((m) => m.CityAdminsComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.cityAdmins' },
  },
  {
    path: 'delivery-pricing',
    loadComponent: () =>
      import('./pricing/delivery-pricing/delivery-pricing').then((m) => m.DeliveryPricingComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.deliveryPricing' },
  },
  {
    path: 'driver-pricing',
    loadComponent: () =>
      import('./pricing/driver-pricing/driver-pricing').then((m) => m.DriverPricingComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.driverPricing' },
  },
];
