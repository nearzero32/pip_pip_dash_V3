import { Routes, Route } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { SUPER_ADMIN_ROUTES } from './features/super-admin/super-admin.routes';
import { ADMIN_ROUTES } from './features/admin/admin.routes';

const page = (titleKey: string): Route => ({
  loadComponent: () =>
    import('./shared/components/placeholder/placeholder').then((m) => m.PlaceholderComponent),
  data: { titleKey },
});

export const routes: Routes = [
  {
    path: 'auth/sign-in',
    loadComponent: () =>
      import('./pages/auth/sign-in/sign-in').then((m) => m.SignInComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home').then((m) => m.HomeComponent),
        data: { titleKey: 'nav.home' },
      },
      ...SUPER_ADMIN_ROUTES,
      ...ADMIN_ROUTES,
      // Ambiguous placeholders retained directly in root routes:
      { path: 'mobile-overview', ...page('nav.mobileOverview') },
      { path: 'mobile-builder', ...page('nav.mobileBuilder') },
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
