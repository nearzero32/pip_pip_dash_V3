import { Routes, Route } from '@angular/router';

const page = (titleKey: string): Route => ({
  loadComponent: () =>
    import('../../shared/components/placeholder/placeholder').then((m) => m.PlaceholderComponent),
  data: { titleKey },
});

export const ADMIN_ROUTES: Routes = [
  {
    path: 'zones',
    loadComponent: () => import('./zones/zones').then((m) => m.ZonesComponent),
    data: { titleKey: 'nav.zones' },
  },
  {
    path: 'drivers',
    loadComponent: () => import('./drivers/drivers').then((m) => m.DriversComponent),
    data: { titleKey: 'nav.driversActive' },
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders').then((m) => m.OrdersComponent),
    data: { titleKey: 'nav.ordersList' },
  },
  { path: 'orders-stats', ...page('nav.ordersStats') },
  { path: 'delegates', ...page('nav.delegatesActive') },
  {
    path: 'products',
    loadComponent: () => import('./products/products').then((m) => m.ProductsComponent),
    data: { titleKey: 'nav.productsList' },
  },
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
  {
    path: 'stores',
    loadComponent: () => import('./stores/stores').then((m) => m.StoresComponent),
    data: { titleKey: 'nav.storesActive' },
  },
  { path: 'stores-percentage', ...page('nav.storesPercentage') },
  { path: 'notifications', ...page('nav.notificationsAll') },
  {
    path: 'categories',
    loadComponent: () =>
      import('./catalog/main-categories/main-categories').then((m) => m.MainCategoriesComponent),
    data: { titleKey: 'nav.categoriesMain' },
  },
  {
    path: 'categories-sub',
    loadComponent: () =>
      import('./catalog/subcategories/subcategories').then((m) => m.SubcategoriesComponent),
    data: { titleKey: 'nav.categoriesSub' },
  },
  { path: 'brands', ...page('nav.brandsList') },
  { path: 'ads', ...page('nav.adsList') },
];
