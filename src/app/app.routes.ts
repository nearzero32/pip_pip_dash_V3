import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';
import { PlaceholderComponent } from './pages/placeholder/placeholder';

const page = (titleKey: string): Routes[number] => ({
  component: PlaceholderComponent,
  data: { titleKey },
});

export const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', ...page('nav.home') },
      { path: 'orders', ...page('nav.ordersList') },
      { path: 'orders-stats', ...page('nav.ordersStats') },
      { path: 'delegates', ...page('nav.delegatesActive') },
      { path: 'products', ...page('nav.productsList') },
      { path: 'mobile-overview', ...page('nav.mobileOverview') },
      { path: 'mobile-builder', ...page('nav.mobileBuilder') },
      { path: 'drivers', ...page('nav.driversActive') },
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
      { path: 'settings', ...page('nav.settingsList') },
      { path: 'app-version', ...page('nav.appVersion') },
      { path: 'pages', ...page('nav.pagesList') },
      { path: 'users', ...page('nav.usersList') },
      { path: 'wallets-overview', ...page('nav.walletsOverview') },
      { path: 'wallets', ...page('nav.walletsList') },
      { path: 'wallets-transactions', ...page('nav.walletsTransactions') },
      { path: 'wallets-settlements', ...page('nav.walletsSettlements') },
      { path: 'wallets-handovers', ...page('nav.walletsHandovers') },
      { path: 'wallets-compensations', ...page('nav.walletsCompensations') },
      { path: 'wallets-internal', ...page('nav.walletsInternal') },
    ],
  },
];
