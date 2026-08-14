import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface MenuItem {
  labelKey: string;
  route?: string;
  svgPath: string;
  children?: MenuItem[];
  isOpen?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, TranslatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  public layoutService = inject(LayoutService);
  private sanitizer = inject(DomSanitizer);

  menuItems: MenuItem[] = [
    {
      labelKey: 'nav.home',
      route: '/home',
      svgPath:
        '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    },
    {
      labelKey: 'nav.orders',
      svgPath:
        '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
      isOpen: true,
      children: [
        {
          labelKey: 'nav.ordersList',
          route: '/orders',
          svgPath:
            '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
        },
        {
          labelKey: 'nav.ordersStats',
          route: '/orders-stats',
          svgPath:
            '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
        },
      ],
    },
    {
      labelKey: 'nav.delegates',
      svgPath:
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
      children: [
        {
          labelKey: 'nav.delegatesActive',
          route: '/delegates',
          svgPath:
            '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>',
        },
      ],
    },
    {
      labelKey: 'nav.products',
      svgPath:
        '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
      children: [
        {
          labelKey: 'nav.productsList',
          route: '/products',
          svgPath:
            '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
        },
      ],
    },
    {
      labelKey: 'nav.mobile',
      svgPath:
        '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
      children: [
        {
          labelKey: 'nav.mobileOverview',
          route: '/mobile-overview',
          svgPath:
            '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
        },
        {
          labelKey: 'nav.mobileBuilder',
          route: '/mobile-builder',
          svgPath:
            '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
        },
      ],
    },
    {
      labelKey: 'nav.drivers',
      svgPath:
        '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>',
      children: [
        { labelKey: 'nav.driversActive', route: '/drivers', svgPath: '<circle cx="12" cy="12" r="10"></circle>' },
        { labelKey: 'nav.driversCredit', route: '/drivers-credit', svgPath: '<rect x="2" y="6" width="20" height="12" rx="2"></rect>' },
        { labelKey: 'nav.driversCreditHistory', route: '/drivers-credit-history', svgPath: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' },
        { labelKey: 'nav.driversOutside', route: '/drivers-outside-orders', svgPath: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>' },
        { labelKey: 'nav.driversRequests', route: '/drivers-requests', svgPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' },
        { labelKey: 'nav.driversJoin', route: '/drivers-join-requests', svgPath: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>' },
      ],
    },
    {
      labelKey: 'nav.merchants',
      svgPath:
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
      children: [
        { labelKey: 'nav.merchantsList', route: '/merchants', svgPath: '<circle cx="12" cy="7" r="4"></circle>' },
      ],
    },
    {
      labelKey: 'nav.customers',
      svgPath:
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>',
      children: [
        { labelKey: 'nav.customersActive', route: '/customers', svgPath: '<circle cx="9" cy="7" r="4"></circle>' },
        { labelKey: 'nav.customersDeleted', route: '/customers-deleted', svgPath: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' },
        { labelKey: 'nav.customersOtp', route: '/customers-otp', svgPath: '<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' },
        { labelKey: 'nav.customersForget', route: '/customers-forget', svgPath: '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><line x1="12" y1="16" x2="12.01" y2="16"></line>' },
      ],
    },
    {
      labelKey: 'nav.stores',
      svgPath:
        '<path d="M3 9l2-5h14l2 5"></path><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"></path><path d="M10 21V12h4v9"></path>',
      children: [
        { labelKey: 'nav.storesActive', route: '/stores', svgPath: '<path d="M3 9l2-5h14l2 5"></path>' },
        { labelKey: 'nav.storesPercentage', route: '/stores-percentage', svgPath: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>' },
      ],
    },
    {
      labelKey: 'nav.notifications',
      svgPath:
        '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
      children: [
        { labelKey: 'nav.notificationsAll', route: '/notifications', svgPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>' },
      ],
    },
    {
      labelKey: 'nav.categories',
      svgPath:
        '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
      children: [
        { labelKey: 'nav.categoriesMain', route: '/categories', svgPath: '<rect x="3" y="3" width="7" height="7"></rect>' },
        { labelKey: 'nav.categoriesSub', route: '/categories-sub', svgPath: '<rect x="14" y="14" width="7" height="7"></rect>' },
      ],
    },
    {
      labelKey: 'nav.brands',
      svgPath:
        '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>',
      children: [
        { labelKey: 'nav.brandsList', route: '/brands', svgPath: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>' },
      ],
    },
    {
      labelKey: 'nav.ads',
      svgPath:
        '<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 3l-4 4-4-4"></path>',
      children: [
        { labelKey: 'nav.adsList', route: '/ads', svgPath: '<rect x="2" y="7" width="20" height="14" rx="2"></rect>' },
      ],
    },
    {
      labelKey: 'nav.settings',
      svgPath:
        '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
      children: [
        { labelKey: 'nav.settingsList', route: '/settings', svgPath: '<circle cx="12" cy="12" r="3"></circle>' },
        { labelKey: 'nav.appVersion', route: '/app-version', svgPath: '<rect x="5" y="2" width="14" height="20" rx="2"></rect>' },
      ],
    },
    {
      labelKey: 'nav.pages',
      svgPath:
        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
      children: [
        { labelKey: 'nav.pagesList', route: '/pages', svgPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' },
      ],
    },
    {
      labelKey: 'nav.users',
      svgPath:
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>',
      children: [
        { labelKey: 'nav.usersList', route: '/users', svgPath: '<circle cx="9" cy="7" r="4"></circle>' },
      ],
    },
    {
      labelKey: 'nav.wallets',
      svgPath:
        '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
      children: [
        { labelKey: 'nav.walletsOverview', route: '/wallets-overview', svgPath: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>' },
        { labelKey: 'nav.walletsList', route: '/wallets', svgPath: '<rect x="1" y="4" width="22" height="16" rx="2"></rect>' },
        { labelKey: 'nav.walletsTransactions', route: '/wallets-transactions', svgPath: '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>' },
        { labelKey: 'nav.walletsSettlements', route: '/wallets-settlements', svgPath: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' },
        { labelKey: 'nav.walletsHandovers', route: '/wallets-handovers', svgPath: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>' },
        { labelKey: 'nav.walletsCompensations', route: '/wallets-compensations', svgPath: '<polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>' },
        { labelKey: 'nav.walletsInternal', route: '/wallets-internal', svgPath: '<rect x="3" y="10" width="18" height="11" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path>' },
      ],
    },
  ];

  getIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  toggle() {
    this.layoutService.togglePin();
  }

  onMouseEnter() {
    this.layoutService.setHover(true);
  }

  onMouseLeave() {
    this.layoutService.setHover(false);
  }

  toggleDropdown(item: MenuItem) {
    item.isOpen = !item.isOpen;
  }
}
