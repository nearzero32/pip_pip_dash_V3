import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';
import { PlaceholderComponent } from './pages/placeholder/placeholder';
import { SignInComponent } from './pages/auth/sign-in/sign-in';
import { DriversComponent } from './pages/admin/drivers/drivers';
import { HomeComponent } from './pages/admin/home/home';
import { GovernoratesComponent } from './pages/super-admin/governorates/governorates';
import { CitiesComponent } from './pages/super-admin/cities/cities';
import { CityAdminsComponent } from './pages/super-admin/city-admins/city-admins';
import { DeliveryPricingComponent } from './pages/super-admin/delivery-pricing/delivery-pricing';
import { DriverPricingComponent } from './pages/super-admin/driver-pricing/driver-pricing';
import { authGuard, guestGuard, superAdminGuard } from './core/auth.guard';

const page = (titleKey: string): Routes[number] => ({
  component: PlaceholderComponent,
  data: { titleKey },
});

export const routes: Routes = [
  {
    path: 'auth/sign-in',
    component: SignInComponent,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent, data: { titleKey: 'nav.home' } },
      {
        path: 'governorates',
        component: GovernoratesComponent,
        canActivate: [superAdminGuard],
        data: { titleKey: 'nav.governorates' },
      },
      {
        path: 'cities',
        component: CitiesComponent,
        canActivate: [superAdminGuard],
        data: { titleKey: 'nav.cities' },
      },
      {
        path: 'city-admins',
        component: CityAdminsComponent,
        canActivate: [superAdminGuard],
        data: { titleKey: 'nav.cityAdmins' },
      },
      {
        path: 'delivery-pricing',
        component: DeliveryPricingComponent,
        canActivate: [superAdminGuard],
        data: { titleKey: 'nav.deliveryPricing' },
      },
      {
        path: 'driver-pricing',
        component: DriverPricingComponent,
        canActivate: [superAdminGuard],
        data: { titleKey: 'nav.driverPricing' },
      },
      { path: 'orders', ...page('nav.ordersList') },
      { path: 'orders-stats', ...page('nav.ordersStats') },
      { path: 'delegates', ...page('nav.delegatesActive') },
      { path: 'products', ...page('nav.productsList') },
      { path: 'mobile-overview', ...page('nav.mobileOverview') },
      { path: 'mobile-builder', ...page('nav.mobileBuilder') },
      { path: 'drivers', component: DriversComponent, data: { titleKey: 'nav.driversActive' } },
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
  { path: '**', redirectTo: 'home' },
];
