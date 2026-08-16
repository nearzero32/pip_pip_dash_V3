import { Routes, Route } from '@angular/router';

const page = (titleKey: string): Route => ({
  loadComponent: () =>
    import('../../shared/components/placeholder/placeholder').then((m) => m.PlaceholderComponent),
  data: { titleKey },
});

export const ADMIN_ROUTES: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home').then((m) => m.HomeComponent),
    data: { titleKey: 'nav.home' },
  },
  {
    path: 'drivers',
    loadComponent: () =>
      import('./drivers/drivers').then((m) => m.DriversComponent),
    data: { titleKey: 'nav.driversActive' },
  },
  { path: 'orders', ...page('nav.ordersList') },
  { path: 'orders-stats', ...page('nav.ordersStats') },
  { path: 'delegates', ...page('nav.delegatesActive') },
  { path: 'products', ...page('nav.productsList') },
  { path: 'drivers-credit', ...page('nav.driversCredit') },
  { path: 'drivers-credit-history', ...page('nav.driversCreditHistory') },
  { path: 'drivers-outside-orders', ...page('nav.driversOutside') },
  { path: 'drivers-requests', ...page('nav.driversRequests') },
  { path: 'drivers-join-requests', ...page('nav.driversJoin') },
  { path: 'merchants', ...page('nav.merchantsList') },
  { path: 'customers', ...page('nav.customersActive') },
  { path: 'customers-deleted', ...page('nav.customersDeleted') },
  { path: 'customers-otp', ...page('nav.customersOtp') },
  { path: 'customers-forget', ...page('nav.customersForget') },
  { path: 'stores', ...page('nav.storesActive') },
  { path: 'stores-percentage', ...page('nav.storesPercentage') },
  { path: 'notifications', ...page('nav.notificationsAll') },
  { path: 'categories', ...page('nav.categoriesMain') },
  { path: 'categories-sub', ...page('nav.categoriesSub') },
  { path: 'brands', ...page('nav.brandsList') },
  { path: 'ads', ...page('nav.adsList') },
];
