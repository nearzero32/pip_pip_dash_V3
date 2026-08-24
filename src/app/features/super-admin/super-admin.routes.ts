import { Routes } from '@angular/router';
import { superAdminGuard } from '../../core/auth/auth.guard';

export const SUPER_ADMIN_ROUTES: Routes = [
  { path: 'store-commissions', loadComponent: () => import('./store-commissions/store-commissions').then((m) => m.SuperStoreCommissionsComponent), canActivate: [superAdminGuard], data: { titleKey: 'nav.storesPercentage' } },
  { path: 'merchants', loadComponent: () => import('./merchants/merchants').then((m) => m.SuperMerchantsComponent), canActivate: [superAdminGuard], data: { titleKey: 'nav.merchants' } },
  {
    path: 'stores',
    loadComponent: () => import('./stores/stores').then((m) => m.SuperAdminStoresComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.storesActive' },
  },
  {
    path: 'main-categories',
    loadComponent: () => import('./catalog/main-categories/main-categories').then((m) => m.SuperAdminMainCategoriesComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.categoriesMain' },
  },
  {
    path: 'subcategories',
    loadComponent: () => import('./catalog/subcategories/subcategories').then((m) => m.SuperAdminSubcategoriesComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.categoriesSub' },
  },
  {
    path: 'zones',
    loadComponent: () => import('./zones/zones').then((m) => m.SuperAdminZonesComponent),
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
    path: 'driver-management',
    loadComponent: () =>
      import('./drivers/driver-management').then((m) => m.DriverManagementComponent),
    canActivate: [superAdminGuard],
    data: { titleKey: 'nav.drivers' },
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
